import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Calendar, Clock, CheckCircle, Mail } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Submission {
  id: string;
  submitted_at: string;
  clocked_in_at: string | null;
  clocked_out_at: string | null;
  total_hours: number;
  summary: string;
  email_sent: boolean;
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

export default function EODHistory() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [tasks, setTasks] = useState<SubmissionTask[]>([]);
  const [images, setImages] = useState<SubmissionImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('eod_submissions')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (e: any) {
      toast({ title: 'Failed to load history', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

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

  const formatDuration = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/eod')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to EOD
            </Button>
            <div>
              <h1 className="text-2xl font-bold">EOD History</h1>
              <p className="text-sm text-muted-foreground">View your past end-of-day reports</p>
            </div>
          </div>
        </div>

        {/* Submissions List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Submitted Reports ({submissions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {submissions.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                <p className="text-muted-foreground">No EOD reports submitted yet</p>
                <Button className="mt-4" onClick={() => navigate('/eod')}>
                  Create Your First Report
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Email Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell className="font-medium">
                        {new Date(submission.submitted_at).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </TableCell>
                      <TableCell>
                        {submission.clocked_in_at
                          ? new Date(submission.clocked_in_at).toLocaleTimeString()
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {submission.clocked_out_at
                          ? new Date(submission.clocked_out_at).toLocaleTimeString()
                          : 'N/A'}
                      </TableCell>
                      <TableCell className="font-semibold text-primary">
                        {submission.total_hours ? `${submission.total_hours}h` : '0h'}
                      </TableCell>
                      <TableCell>
                        {submission.email_sent ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Sent
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <Mail className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => loadSubmissionDetails(submission)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Submission Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              EOD Report Details - {selectedSubmission && new Date(selectedSubmission.submitted_at).toLocaleDateString()}
            </DialogTitle>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-6">
              {/* Work Hours Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Work Hours</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Clocked In</p>
                    <p className="font-medium">
                      {selectedSubmission.clocked_in_at
                        ? new Date(selectedSubmission.clocked_in_at).toLocaleTimeString()
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Clocked Out</p>
                    <p className="font-medium">
                      {selectedSubmission.clocked_out_at
                        ? new Date(selectedSubmission.clocked_out_at).toLocaleTimeString()
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Hours</p>
                    <p className="font-bold text-primary text-lg">
                      {selectedSubmission.total_hours}h
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Tasks */}
              {tasks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Tasks Completed ({tasks.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {tasks.map((task) => (
                      <div key={task.id} className="bg-muted p-4 rounded-lg space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">{task.client_name}</p>
                            <p className="text-sm text-muted-foreground">{task.task_description}</p>
                          </div>
                          <Badge variant="secondary">{formatDuration(task.duration_minutes)}</Badge>
                        </div>
                        {task.comments && (
                          <p className="text-sm text-muted-foreground italic">
                            💬 {task.comments}
                          </p>
                        )}
                        {task.task_link && (
                          <a
                            href={task.task_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
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
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Daily Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{selectedSubmission.summary}</p>
                  </CardContent>
                </Card>
              )}

              {/* Images */}
              {images.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Screenshots ({images.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {images.map((img) => (
                        <img
                          key={img.id}
                          src={img.image_url}
                          alt="Screenshot"
                          className="rounded border shadow-sm w-full h-48 object-cover"
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

