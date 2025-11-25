import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock, Target, AlertCircle } from 'lucide-react';

interface ClockInModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (plannedShiftMinutes: number, dailyTaskGoal: number) => void;
  loading?: boolean;
}

export function ClockInModal({ open, onClose, onSubmit, loading = false }: ClockInModalProps) {
  const [shiftHours, setShiftHours] = useState<string>('');
  const [shiftMinutes, setShiftMinutes] = useState<string>('');
  const [taskGoal, setTaskGoal] = useState<string>('');
  const [errors, setErrors] = useState<{ shift?: string; goal?: string }>({});

  const handleSubmit = () => {
    // Validation
    const newErrors: { shift?: string; goal?: string } = {};
    
    const hours = parseInt(shiftHours) || 0;
    const minutes = parseInt(shiftMinutes) || 0;
    const totalMinutes = (hours * 60) + minutes;
    
    if (totalMinutes <= 0) {
      newErrors.shift = 'Please enter a valid shift duration';
    }
    
    if (totalMinutes > 16 * 60) {
      newErrors.shift = 'Shift cannot exceed 16 hours';
    }
    
    const goal = parseInt(taskGoal);
    if (!goal || goal <= 0) {
      newErrors.goal = 'Please enter a valid task goal';
    }
    
    if (goal > 50) {
      newErrors.goal = 'Task goal seems too high (max 50)';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Submit
    onSubmit(totalMinutes, goal);
  };

  const handleClose = () => {
    if (!loading) {
      setShiftHours('');
      setShiftMinutes('');
      setTaskGoal('');
      setErrors({});
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-[500px]"
        style={{
          background: 'linear-gradient(135deg, #E8D5F2 0%, #D4E4F7 100%)',
          borderRadius: '24px',
          border: '2px solid rgba(255, 255, 255, 0.8)',
          boxShadow: '0 8px 32px rgba(139, 92, 246, 0.15)',
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2" style={{ color: '#7C3AED' }}>
            <Clock className="h-6 w-6" />
            Plan Your Shift
          </DialogTitle>
          <DialogDescription className="text-base" style={{ color: '#6B7280' }}>
            Let's set your goals for today! This helps Smart DAR track your progress accurately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Shift Duration */}
          <div className="space-y-2">
            <Label className="text-base font-semibold flex items-center gap-2" style={{ color: '#4B5563' }}>
              <Clock className="h-4 w-4" />
              How long is your shift today?
              <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-3 items-center">
              <div className="flex-1">
                <Input
                  type="number"
                  min="0"
                  max="16"
                  placeholder="Hours"
                  value={shiftHours}
                  onChange={(e) => {
                    setShiftHours(e.target.value);
                    setErrors({ ...errors, shift: undefined });
                  }}
                  disabled={loading}
                  className="text-center text-lg font-semibold"
                  style={{
                    borderRadius: '12px',
                    border: errors.shift ? '2px solid #EF4444' : '2px solid #E5E7EB',
                    background: 'white',
                  }}
                />
                <p className="text-xs text-center mt-1 text-gray-500">Hours</p>
              </div>
              <span className="text-2xl font-bold text-gray-400">:</span>
              <div className="flex-1">
                <Input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="Minutes"
                  value={shiftMinutes}
                  onChange={(e) => {
                    setShiftMinutes(e.target.value);
                    setErrors({ ...errors, shift: undefined });
                  }}
                  disabled={loading}
                  className="text-center text-lg font-semibold"
                  style={{
                    borderRadius: '12px',
                    border: errors.shift ? '2px solid #EF4444' : '2px solid #E5E7EB',
                    background: 'white',
                  }}
                />
                <p className="text-xs text-center mt-1 text-gray-500">Minutes</p>
              </div>
            </div>
            {errors.shift && (
              <div className="flex items-center gap-2 text-sm text-red-600 mt-2">
                <AlertCircle className="h-4 w-4" />
                {errors.shift}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">
              💡 Example: 8 hours 0 minutes for a full workday
            </p>
          </div>

          {/* Daily Task Goal */}
          <div className="space-y-2">
            <Label className="text-base font-semibold flex items-center gap-2" style={{ color: '#4B5563' }}>
              <Target className="h-4 w-4" />
              How many tasks do you plan to complete today?
              <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              min="1"
              max="50"
              placeholder="e.g., 8"
              value={taskGoal}
              onChange={(e) => {
                setTaskGoal(e.target.value);
                setErrors({ ...errors, goal: undefined });
              }}
              disabled={loading}
              className="text-center text-lg font-semibold"
              style={{
                borderRadius: '12px',
                border: errors.goal ? '2px solid #EF4444' : '2px solid #E5E7EB',
                background: 'white',
              }}
            />
            {errors.goal && (
              <div className="flex items-center gap-2 text-sm text-red-600 mt-2">
                <AlertCircle className="h-4 w-4" />
                {errors.goal}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">
              💡 Be realistic! This helps track your Daily Task Goal completion.
            </p>
          </div>

          {/* Info Box */}
          <div 
            className="p-4 rounded-xl"
            style={{
              background: 'rgba(255, 255, 255, 0.6)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
            }}
          >
            <p className="text-sm text-gray-700">
              <strong>📊 Why we ask:</strong>
              <br />
              These values help Smart DAR calculate:
            </p>
            <ul className="text-xs text-gray-600 mt-2 space-y-1 ml-4">
              <li>• <strong>Utilization</strong> - How well you use your shift time</li>
              <li>• <strong>Momentum</strong> - Task completion pace</li>
              <li>• <strong>Daily Goal Bonus</strong> - Extra points for hitting your goal</li>
              <li>• <strong>Behavior Insights</strong> - Personalized productivity tips</li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="flex-1"
            style={{
              borderRadius: '12px',
              border: '2px solid #E5E7EB',
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 font-semibold"
            style={{
              background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
              color: 'white',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
            }}
          >
            {loading ? 'Clocking In...' : 'Start My Shift 🚀'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

