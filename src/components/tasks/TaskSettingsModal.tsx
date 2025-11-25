import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Zap, Brain, Timer, Target, Pencil, FolderOpen, Search, Handshake, MessageSquare, Users, Folder, BookOpen, Code, Phone, CheckSquare, Shield } from "lucide-react";

interface TaskSettingsModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (settings: TaskSettings) => void;
}

export interface TaskSettings {
  task_type: "Quick" | "Standard" | "Deep Work" | "Long" | "Very Long";
  goal_duration_minutes: number;
  task_intent: string | null;
  task_categories: string[];
}

const TASK_TYPES = [
  { value: "Quick", label: "Quick Task", time: "5–15 min", color: "#A7C7E7", icon: Zap },
  { value: "Standard", label: "Standard Task", time: "20–45 min", color: "#B8EBD0", icon: Clock },
  { value: "Deep Work", label: "Deep Work Task", time: "1–2 hours", color: "#C7B8EA", icon: Brain },
  { value: "Long", label: "Long Task", time: "2–4 hours", color: "#F8D4C7", icon: Timer },
  { value: "Very Long", label: "Very Long Task", time: "4+ hours", color: "#F7C9D4", icon: Target },
] as const;

const PRESET_DURATIONS = [10, 15, 20, 25, 30, 45, 60, 90];

const TASK_INTENTS = [
  "Complete the task",
  "Make progress",
  "Draft / outline",
  "Review / clean up",
  "Finish hardest part",
];

const TASK_CATEGORIES = [
  { value: "Creative", label: "Creative (social media/marketing)", icon: Pencil, color: "#F7C9D4" },
  { value: "Admin", label: "Admin", icon: FolderOpen, color: "#A7C7E7" },
  { value: "Research", label: "Research", icon: Search, color: "#C7B8EA" },
  { value: "Repetitive", label: "Repetitive", icon: Folder, color: "#B8EBD0" },
  { value: "Communication", label: "Communication / Meetings", icon: MessageSquare, color: "#FAE8A4" },
  { value: "Coordination", label: "Coordination", icon: Users, color: "#F8D4C7" },
  { value: "Organizational", label: "Organizational", icon: Folder, color: "#A7C7E7" },
  { value: "Learning", label: "Learning", icon: BookOpen, color: "#C7B8EA" },
  { value: "Technical", label: "Technical", icon: Code, color: "#B8EBD0" },
  { value: "Sales", label: "Sales (Cold Calling or closing)", icon: Phone, color: "#F7C9D4" },
  { value: "Follow-up", label: "Follow-up", icon: CheckSquare, color: "#FAE8A4" },
  { value: "Client Management", label: "Client Management", icon: Handshake, color: "#F8D4C7" },
  { value: "QA", label: "QA / Review", icon: Shield, color: "#A7C7E7" },
];

export function TaskSettingsModal({ open, onClose, onConfirm }: TaskSettingsModalProps) {
  const [taskType, setTaskType] = useState<TaskSettings["task_type"]>("Standard");
  const [goalDuration, setGoalDuration] = useState<number>(30);
  const [customDuration, setCustomDuration] = useState<string>("");
  const [taskIntent, setTaskIntent] = useState<string | null>(null);
  const [taskCategories, setTaskCategories] = useState<string[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleConfirm = () => {
    const finalDuration = showCustomInput && customDuration 
      ? parseInt(customDuration, 10) 
      : goalDuration;

    if (finalDuration <= 0 || isNaN(finalDuration)) {
      return; // Validation
    }

    onConfirm({
      task_type: taskType,
      goal_duration_minutes: finalDuration,
      task_intent: taskIntent,
      task_categories: taskCategories,
    });

    // Reset
    setTaskType("Standard");
    setGoalDuration(30);
    setCustomDuration("");
    setTaskIntent(null);
    setTaskCategories([]);
    setShowCustomInput(false);
  };

  const handleClose = () => {
    // Reset state
    setTaskType("Standard");
    setGoalDuration(30);
    setCustomDuration("");
    setTaskIntent(null);
    setTaskCategories([]);
    setShowCustomInput(false);
    onClose();
  };

  const toggleCategory = (category: string) => {
    setTaskCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" style={{
        backgroundColor: '#FFFCF9',
        borderRadius: '28px',
        border: 'none',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12)'
      }}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold" style={{ color: '#4B4B4B' }}>
            Task Settings
          </DialogTitle>
          <DialogDescription style={{ color: '#6F6F6F', fontSize: '15px' }}>
            Help us understand your task to provide better insights and tracking.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8 py-4">
          {/* Task Type */}
          <div>
            <Label className="text-base font-semibold mb-4 block" style={{ color: '#4B4B4B' }}>
              Task Type <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {TASK_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = taskType === type.value;
                return (
                  <button
                    key={type.value}
                    onClick={() => setTaskType(type.value as TaskSettings["task_type"])}
                    className="p-4 rounded-2xl transition-all duration-200 text-left border-2"
                    style={{
                      backgroundColor: isSelected ? type.color : '#FFFFFF',
                      borderColor: isSelected ? type.color : '#EDEDED',
                      boxShadow: isSelected ? `0 4px 16px ${type.color}40` : '0 2px 8px rgba(0, 0, 0, 0.04)',
                      transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl" style={{ 
                        backgroundColor: isSelected ? '#FFFFFF' : type.color 
                      }}>
                        <Icon className="h-5 w-5" style={{ 
                          color: isSelected ? type.color : '#FFFFFF' 
                        }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm mb-0.5" style={{ 
                          color: isSelected ? '#4B4B4B' : '#4B4B4B' 
                        }}>
                          {type.label}
                        </div>
                        <div className="text-xs" style={{ 
                          color: isSelected ? '#6F6F6F' : '#9CA3AF' 
                        }}>
                          {type.time}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Goal Duration */}
          <div>
            <Label className="text-base font-semibold mb-4 block" style={{ color: '#4B4B4B' }}>
              Goal Duration <span className="text-red-500">*</span>
            </Label>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {PRESET_DURATIONS.map((duration) => (
                  <button
                    key={duration}
                    onClick={() => {
                      setGoalDuration(duration);
                      setShowCustomInput(false);
                    }}
                    className="px-5 py-2.5 rounded-full transition-all duration-200 text-sm font-medium border-2"
                    style={{
                      backgroundColor: !showCustomInput && goalDuration === duration ? '#B8EBD0' : '#FFFFFF',
                      borderColor: !showCustomInput && goalDuration === duration ? '#B8EBD0' : '#EDEDED',
                      color: '#4B4B4B',
                      boxShadow: !showCustomInput && goalDuration === duration ? '0 4px 12px rgba(184, 235, 208, 0.3)' : 'none',
                    }}
                  >
                    {duration} min
                  </button>
                ))}
                <button
                  onClick={() => setShowCustomInput(true)}
                  className="px-5 py-2.5 rounded-full transition-all duration-200 text-sm font-medium border-2"
                  style={{
                    backgroundColor: showCustomInput ? '#C7B8EA' : '#FFFFFF',
                    borderColor: showCustomInput ? '#C7B8EA' : '#EDEDED',
                    color: '#4B4B4B',
                    boxShadow: showCustomInput ? '0 4px 12px rgba(199, 184, 234, 0.3)' : 'none',
                  }}
                >
                  Custom
                </button>
              </div>
              
              {showCustomInput && (
                <div className="mt-3">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Enter minutes"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(e.target.value)}
                    className="max-w-xs rounded-2xl border-2"
                    style={{
                      borderColor: '#C7B8EA',
                      fontSize: '15px'
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Task Categories */}
          <div>
            <Label className="text-base font-semibold mb-4 block" style={{ color: '#4B4B4B' }}>
              Task Categories <span className="text-gray-400 text-sm font-normal">(Optional, Multi-Select)</span>
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
              {TASK_CATEGORIES.map((category) => {
                const Icon = category.icon;
                const isSelected = taskCategories.includes(category.value);
                return (
                  <button
                    key={category.value}
                    onClick={() => toggleCategory(category.value)}
                    className="p-3 rounded-2xl transition-all duration-200 text-left border-2 flex items-center gap-2"
                    style={{
                      backgroundColor: isSelected ? category.color : '#FFFFFF',
                      borderColor: isSelected ? category.color : '#EDEDED',
                      color: '#4B4B4B',
                      boxShadow: isSelected ? `0 4px 12px ${category.color}40` : 'none',
                      transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                    }}
                  >
                    <div className="p-1.5 rounded-lg" style={{
                      backgroundColor: isSelected ? '#FFFFFF' : category.color
                    }}>
                      <Icon className="h-4 w-4" style={{
                        color: isSelected ? category.color : '#FFFFFF'
                      }} />
                    </div>
                    <span className="text-xs font-medium flex-1">{category.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Task Intent */}
          <div>
            <Label className="text-base font-semibold mb-4 block" style={{ color: '#4B4B4B' }}>
              Task Intent <span className="text-gray-400 text-sm font-normal">(Optional)</span>
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TASK_INTENTS.map((intent) => (
                <button
                  key={intent}
                  onClick={() => setTaskIntent(taskIntent === intent ? null : intent)}
                  className="px-4 py-3 rounded-xl transition-all duration-200 text-sm text-left border-2"
                  style={{
                    backgroundColor: taskIntent === intent ? '#FAE8A4' : '#FFFFFF',
                    borderColor: taskIntent === intent ? '#FAE8A4' : '#EDEDED',
                    color: '#4B4B4B',
                    boxShadow: taskIntent === intent ? '0 4px 12px rgba(250, 232, 164, 0.3)' : 'none',
                  }}
                >
                  {intent}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            className="rounded-full px-6 border-2"
            style={{
              borderColor: '#EDEDED',
              color: '#6F6F6F'
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="rounded-full px-8 border-0"
            style={{
              backgroundColor: '#B8EBD0',
              color: '#4B4B4B',
              boxShadow: '0 4px 16px rgba(184, 235, 208, 0.4)',
            }}
          >
            Start Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

