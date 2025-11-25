/**
 * 🌈 EOD History List Component
 * Shared component for displaying EOD submissions with cute pastel UI
 * Used in both:
 * - History tab inside EOD Portal
 * - Standalone EOD History page
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Target, Clock, Activity, TrendingUp, CheckCircle, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  roundHours,
  formatDuration,
  calculateShiftDuration,
  calculateActiveTaskHours,
  generateUtilizationText,
  generateShiftPlanText,
  checkDailyGoalAchieved,
} from "@/utils/eodCalculations";

interface Submission {
  id: string;
  submitted_at: string;
  clocked_in_at: string | null;
  clocked_out_at: string | null;
  total_hours: number;
  summary: string;
  email_sent: boolean;
  planned_shift_minutes?: number | null;
  daily_task_goal?: number | null;
  total_active_seconds?: number | null;
}

interface SubmissionTask {
  id: string;
  client_name: string;
  task_description: string;
  duration_minutes: number;
  comments: string | null;
  task_link: string | null;
}

interface SubmissionImage {
  id: string;
  image_url: string;
}

interface EODHistoryListProps {
  submissions: Submission[];
  onRefresh?: () => void;
}

export function EODHistoryList({ submissions, onRefresh }: EODHistoryListProps) {
  const { toast } = useToast();
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [tasks, setTasks] = useState<SubmissionTask[]>([]);
  const [images, setImages] = useState<SubmissionImage[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const loadSubmissionDetails = async (submission: Submission) => {
    setSelectedSubmission(submission);
    setDetailsOpen(true);

    try {
      // Load tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('eod_submission_tasks')
        .select('*')
        .eq('submission_id', submission.id);

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);

      // Load images
      const { data: imagesData, error: imagesError } = await supabase
        .from('eod_submission_images')
        .select('*')
        .eq('submission_id', submission.id);

      if (imagesError) throw imagesError;
      setImages(imagesData || []);
    } catch (e: any) {
      toast({ title: 'Failed to load details', description: e.message, variant: 'destructive' });
    }
  };

  if (submissions.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
        <p className="text-muted-foreground">No EOD reports submitted yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {submissions.map((submission) => {
          // Calculate shift metrics
          const actualShiftHours = calculateShiftDuration(
            submission.clocked_in_at,
            submission.clocked_out_at
          );
          const roundedShiftHours = roundHours(actualShiftHours);
          
          const activeTaskHours = calculateActiveTaskHours(
            submission.total_active_seconds || 0
          );
          const roundedActiveTaskHours = roundHours(activeTaskHours);
          
          const plannedShiftHours = submission.planned_shift_minutes
            ? Math.round(submission.planned_shift_minutes / 60)
            : null;
          
          const utilizationText = generateUtilizationText(
            activeTaskHours,
            actualShiftHours,
            roundedActiveTaskHours,
            roundedShiftHours
          );

          return (
            <Card
              key={submission.id}
              className="border-2 border-gray-100 hover:border-purple-200 transition-all duration-200"
              style={{
                background: 'linear-gradient(to bottom right, #ffffff, #faf5ff)',
                borderRadius: '24px',
                boxShadow: '0px 4px 12px rgba(0,0,0,0.06)'
              }}
            >
              <CardContent className="p-6">
                {/* Main Row */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-6">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Date</div>
                      <div className="font-semibold text-gray-800">
                        {new Date(submission.submitted_at).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Clock In</div>
                      <div className="font-medium text-gray-700">
                        {submission.clocked_in_at
                          ? new Date(submission.clocked_in_at).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit'
                            })
                          : '—'}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Clock Out</div>
                      <div className="font-medium text-gray-700">
                        {submission.clocked_out_at
                          ? new Date(submission.clocked_out_at).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit'
                            })
                          : '—'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {submission.email_sent ? (
                      <Badge
                        className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200"
                        style={{ borderRadius: '12px', padding: '6px 12px' }}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Sent
                      </Badge>
                    ) : (
                      <Badge
                        className="bg-gradient-to-r from-gray-100 to-slate-100 text-gray-600 border-gray-200"
                        style={{ borderRadius: '12px', padding: '6px 12px' }}
                      >
                        <Mail className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                    
                    <Button
                      size="sm"
                      onClick={() => loadSubmissionDetails(submission)}
                      className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 hover:from-purple-200 hover:to-pink-200 border-purple-200"
                      style={{ borderRadius: '12px' }}
                    >
                      View Details
                    </Button>
                  </div>
                </div>

                {/* 🌈 Cute Pastel Sub-Row with Shift Metrics */}
                <div
                  className="grid grid-cols-3 gap-4 p-4 mt-4"
                  style={{
                    background: 'linear-gradient(135deg, #E8D9FF 0%, #FFDDEA 50%, #D9FFF0 100%)',
                    borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.5)'
                  }}
                >
                  {/* Shift Time */}
                  <div className="flex items-start gap-3">
                    <div
                      className="p-2 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.7)' }}
                    >
                      <Clock className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-xs text-purple-700 font-medium mb-1">
                        Total Clock-In Hours
                      </div>
                      <div className="text-sm font-semibold text-purple-900">
                        {roundedShiftHours}h <span className="text-xs font-normal opacity-75">rounded</span>
                      </div>
                      <div className="text-xs text-purple-600">
                        {actualShiftHours.toFixed(2)}h <span className="font-normal opacity-75">recorded</span>
                      </div>
                    </div>
                  </div>

                  {/* Clock In Time */}
                  <div className="flex items-start gap-3">
                    <div
                      className="p-2 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.7)' }}
                    >
                      <Target className="h-4 w-4 text-pink-600" />
                    </div>
                    <div>
                      <div className="text-xs text-pink-700 font-medium mb-1">
                        Clock In Time
                      </div>
                      <div className="text-sm font-semibold text-pink-900">
                        {submission.clocked_in_at
                          ? new Date(submission.clocked_in_at).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit'
                            })
                          : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Task Time */}
                  <div className="flex items-start gap-3">
                    <div
                      className="p-2 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.7)' }}
                    >
                      <Activity className="h-4 w-4 text-teal-600" />
                    </div>
                    <div>
                      <div className="text-xs text-teal-700 font-medium mb-1">
                        Total Task Hours
                      </div>
                      <div className="text-sm font-semibold text-teal-900">
                        {roundedActiveTaskHours}h <span className="text-xs font-normal opacity-75">rounded</span>
                      </div>
                      <div className="text-xs text-teal-600">
                        {activeTaskHours.toFixed(2)}h <span className="font-normal opacity-75">recorded</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Submission Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle
              className="flex items-center gap-2 text-2xl"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              <Clock className="h-6 w-6" style={{ color: '#667eea' }} />
              EOD Report Details - {selectedSubmission && new Date(selectedSubmission.submitted_at).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </DialogTitle>
          </DialogHeader>

          {selectedSubmission && (() => {
            // Calculate all metrics for the modal
            const actualShiftHours = calculateShiftDuration(
              selectedSubmission.clocked_in_at,
              selectedSubmission.clocked_out_at
            );
            const roundedShiftHours = roundHours(actualShiftHours);
            
            const activeTaskHours = calculateActiveTaskHours(
              selectedSubmission.total_active_seconds || 0
            );
            const roundedActiveTaskHours = roundHours(activeTaskHours);
            
            const plannedShiftMinutes = selectedSubmission.planned_shift_minutes;
            const dailyTaskGoal = selectedSubmission.daily_task_goal;
            
            const utilizationText = generateUtilizationText(
              activeTaskHours,
              actualShiftHours,
              roundedActiveTaskHours,
              roundedShiftHours
            );
            
            const shiftPlanText = generateShiftPlanText(
              plannedShiftMinutes,
              actualShiftHours
            );
            
            const goalResult = checkDailyGoalAchieved(
              dailyTaskGoal,
              tasks.length
            );

            return (
              <div className="space-y-6">
                {/* 🎯 SECTION 1: SHIFT GOALS */}
                <Card
                  style={{
                    background: 'linear-gradient(135deg, #E8D9FF 0%, #FFDDEA 100%)',
                    borderRadius: '24px',
                    border: '1px solid rgba(255,255,255,0.5)',
                    boxShadow: '0px 4px 12px rgba(0,0,0,0.06)'
                  }}
                >
                  <CardHeader>
                    <CardTitle
                      className="flex items-center gap-2 text-lg"
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}
                    >
                      🎯 Today's Shift Goals
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {plannedShiftMinutes || dailyTaskGoal ? (
                      <div
                        className="p-6 space-y-4"
                        style={{
                          background: 'rgba(255,255,255,0.7)',
                          borderRadius: '20px'
                        }}
                      >
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <div className="text-sm text-purple-700 font-medium mb-2">
                              Planned Shift Length
                            </div>
                            <div className="text-2xl font-bold text-purple-900">
                              {plannedShiftMinutes
                                ? formatDuration(plannedShiftMinutes)
                                : '—'}
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-sm text-purple-700 font-medium mb-2">
                              Planned Task Goal
                            </div>
                            <div className="text-2xl font-bold text-purple-900">
                              {dailyTaskGoal ? `${dailyTaskGoal} tasks` : '—'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="pt-4 border-t border-purple-200">
                          <div className="text-sm text-purple-700 font-medium mb-2">
                            Daily Goal Outcome
                          </div>
                          <div
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                              goalResult.achieved
                                ? 'bg-green-100 text-green-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {goalResult.achieved ? '✅' : '⏳'}
                            <span className="font-semibold">{goalResult.text}</span>
                          </div>
                        </div>
                        
                        <div className="pt-4 border-t border-purple-200">
                          <div className="text-sm text-purple-700 font-medium mb-2">
                            Shift Plan Accuracy
                          </div>
                          <div className="text-base text-purple-900">
                            {shiftPlanText}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="p-6 text-center"
                        style={{
                          background: 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)',
                          borderRadius: '20px'
                        }}
                      >
                        <p className="text-red-700 font-medium">
                          ⚠️ Shift goal data missing — please fix clock-in survey storage.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 🕒 SECTION 2: ACTUAL SHIFT SUMMARY */}
                <Card
                  style={{
                    background: 'linear-gradient(135deg, #DDEBFF 0%, #D9FFF0 100%)',
                    borderRadius: '24px',
                    border: '1px solid rgba(255,255,255,0.5)',
                    boxShadow: '0px 4px 12px rgba(0,0,0,0.06)'
                  }}
                >
                  <CardHeader>
                    <CardTitle
                      className="flex items-center gap-2 text-lg"
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}
                    >
                      🕒 Actual Shift Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="p-6 space-y-4"
                      style={{
                        background: 'rgba(255,255,255,0.7)',
                        borderRadius: '20px'
                      }}
                    >
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <div className="text-sm text-blue-700 font-medium mb-2">
                            Clock-in
                          </div>
                          <div className="text-lg font-semibold text-blue-900">
                            {selectedSubmission.clocked_in_at
                              ? new Date(selectedSubmission.clocked_in_at).toLocaleTimeString('en-US')
                              : 'N/A'}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-sm text-blue-700 font-medium mb-2">
                            Clock-out
                          </div>
                          <div className="text-lg font-semibold text-blue-900">
                            {selectedSubmission.clocked_out_at
                              ? new Date(selectedSubmission.clocked_out_at).toLocaleTimeString('en-US')
                              : 'N/A'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-6 pt-4 border-t border-blue-200">
                        <div>
                          <div className="text-sm text-blue-700 font-medium mb-2">
                            Total Shift Hours
                          </div>
                          <div className="text-2xl font-bold text-blue-900">
                            {roundedShiftHours}h
                          </div>
                          <div className="text-sm text-blue-600 opacity-75">
                            Precise: {actualShiftHours.toFixed(2)}h
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-sm text-teal-700 font-medium mb-2">
                            Total Active Task Hours
                          </div>
                          <div className="text-2xl font-bold text-teal-900">
                            {roundedActiveTaskHours}h
                          </div>
                          <div className="text-sm text-teal-600 opacity-75">
                            Precise: {activeTaskHours.toFixed(2)}h
                          </div>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t border-blue-200">
                        <div className="text-sm text-blue-700 font-medium mb-2">
                          Utilization Summary
                        </div>
                        <div className="text-base text-blue-900 font-medium">
                          {utilizationText}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* ✅ SECTION 3: TASK SUMMARY */}
                {tasks.length > 0 && (
                  <Card
                    style={{
                      background: 'linear-gradient(135deg, #FAE8A4 0%, #FFDDEA 100%)',
                      borderRadius: '24px',
                      border: '1px solid rgba(255,255,255,0.5)',
                      boxShadow: '0px 4px 12px rgba(0,0,0,0.06)'
                    }}
                  >
                    <CardHeader>
                      <CardTitle
                        className="flex items-center gap-2 text-lg"
                        style={{
                          background: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent'
                        }}
                      >
                        ✅ Tasks Completed
                        <Badge
                          className="ml-2 bg-white text-amber-700 border-amber-200"
                          style={{ borderRadius: '12px' }}
                        >
                          {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {tasks.map((task, index) => (
                        <div
                          key={task.id}
                          className="p-5 space-y-3"
                          style={{
                            background: 'rgba(255,255,255,0.8)',
                            borderRadius: '20px',
                            border: '2px solid rgba(255,255,255,0.5)',
                            boxShadow: '0px 2px 8px rgba(0,0,0,0.04)'
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                                  style={{
                                    background: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)',
                                    color: 'white'
                                  }}
                                >
                                  {index + 1}
                                </div>
                                <p className="font-bold text-gray-800">{task.client_name}</p>
                              </div>
                              <p className="text-sm text-gray-700 leading-relaxed">
                                {task.task_description}
                              </p>
                            </div>
                            <Badge
                              className="ml-4 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border-amber-200"
                              style={{ borderRadius: '12px', padding: '6px 12px' }}
                            >
                              ⏱ {formatDuration(task.duration_minutes)}
                            </Badge>
                          </div>
                          {task.comments && (
                            <div
                              className="p-3 rounded-xl"
                              style={{
                                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
                              }}
                            >
                              <p className="text-sm text-amber-900 italic">
                                💬 {task.comments}
                              </p>
                            </div>
                          )}
                          {task.task_link && (
                            <a
                              href={task.task_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-2 font-medium"
                            >
                              🔗 {task.task_link}
                            </a>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Summary */}
                {selectedSubmission.summary && (
                  <Card
                    style={{
                      background: 'linear-gradient(135deg, #F8D4C7 0%, #FFDDEA 100%)',
                      borderRadius: '24px',
                      border: '1px solid rgba(255,255,255,0.5)',
                      boxShadow: '0px 4px 12px rgba(0,0,0,0.06)'
                    }}
                  >
                    <CardHeader>
                      <CardTitle
                        className="flex items-center gap-2 text-lg"
                        style={{
                          background: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent'
                        }}
                      >
                        📝 Daily Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div
                        className="p-5 rounded-xl"
                        style={{
                          background: 'rgba(255,255,255,0.7)'
                        }}
                      >
                        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                          {selectedSubmission.summary}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Images */}
                {images.length > 0 && (
                  <Card
                    style={{
                      background: 'linear-gradient(135deg, #C7B8EA 0%, #DDEBFF 100%)',
                      borderRadius: '24px',
                      border: '1px solid rgba(255,255,255,0.5)',
                      boxShadow: '0px 4px 12px rgba(0,0,0,0.06)'
                    }}
                  >
                    <CardHeader>
                      <CardTitle
                        className="flex items-center gap-2 text-lg"
                        style={{
                          background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent'
                        }}
                      >
                        📸 Screenshots ({images.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        {images.map((img) => (
                          <img
                            key={img.id}
                            src={img.image_url}
                            alt="Screenshot"
                            className="w-full h-48 object-cover"
                            style={{
                              borderRadius: '20px',
                              border: '2px solid rgba(255,255,255,0.5)',
                              boxShadow: '0px 2px 8px rgba(0,0,0,0.08)'
                            }}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}

