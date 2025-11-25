import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface TaskTemplate {
  id?: string;
  template_name: string;
  description: string;
  default_client?: string;
  default_task_type?: string;
  default_categories?: string[];
  default_priority?: string;
  auto_queue_enabled: boolean;
}

interface TemplateCreatorFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (template: TaskTemplate) => void;
  editingTemplate?: TaskTemplate | null;
  userClients: string[];
}

const TASK_TYPES = ['Quick', 'Standard', 'Deep Work', 'Long', 'Very Long'];
const TASK_PRIORITIES = ['Immediate Impact Task', 'Daily Task', 'Weekly Task', 'Monthly Task', 'Evergreen Task', 'Trigger Task'];
const TASK_CATEGORIES = ['Creative', 'Admin', 'Research', 'Repetitive', 'Communication', 'Coordination', 'Organizational', 'Learning', 'Technical', 'Sales', 'Follow-up', 'Client Management', 'QA / Review'];

const PASTEL_COLORS = {
  cream: '#FFFCF9',
  pastelMint: '#B8EBD0',
  pastelBlue: '#A7C7E7',
  warmText: '#6F6F6F',
  darkText: '#4B4B4B',
};

export function TemplateCreatorForm({ open, onClose, onSave, editingTemplate, userClients }: TemplateCreatorFormProps) {
  const [templateName, setTemplateName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultClient, setDefaultClient] = useState('');
  const [defaultTaskType, setDefaultTaskType] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [defaultPriority, setDefaultPriority] = useState('');
  const [autoQueueEnabled, setAutoQueueEnabled] = useState(false);

  // Load editing template data
  useEffect(() => {
    if (editingTemplate) {
      setTemplateName(editingTemplate.template_name || '');
      setDescription(editingTemplate.description || '');
      setDefaultClient(editingTemplate.default_client || '');
      setDefaultTaskType(editingTemplate.default_task_type || '');
      setSelectedCategories(editingTemplate.default_categories || []);
      setDefaultPriority(editingTemplate.default_priority || '');
      setAutoQueueEnabled(editingTemplate.auto_queue_enabled || false);
    } else {
      // Reset form
      setTemplateName('');
      setDescription('');
      setDefaultClient('');
      setDefaultTaskType('');
      setSelectedCategories([]);
      setDefaultPriority('');
      setAutoQueueEnabled(false);
    }
  }, [editingTemplate, open]);

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleSave = () => {
    if (!templateName.trim() || !description.trim()) {
      return;
    }

    const template: TaskTemplate = {
      ...(editingTemplate?.id && { id: editingTemplate.id }),
      template_name: templateName.trim(),
      description: description.trim(),
      default_client: defaultClient || undefined,
      default_task_type: defaultTaskType || undefined,
      default_categories: selectedCategories.length > 0 ? selectedCategories : undefined,
      default_priority: defaultPriority || undefined,
      auto_queue_enabled: autoQueueEnabled,
    };

    onSave(template);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto border-0"
        style={{
          backgroundColor: PASTEL_COLORS.cream,
          borderRadius: '24px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: PASTEL_COLORS.darkText }}>
            {editingTemplate ? 'Edit Template' : 'Create New Template'}
          </DialogTitle>
          <DialogDescription style={{ color: PASTEL_COLORS.warmText }}>
            {editingTemplate ? 'Update your task template' : 'Save a task you do frequently for quick access'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Template Name */}
          <div>
            <Label htmlFor="template-name" style={{ color: PASTEL_COLORS.darkText }}>
              Template Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="template-name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g., Daily Check-in, Weekly Report, Client Follow-up"
              className="mt-2"
              style={{ borderRadius: '12px' }}
            />
          </div>

          {/* Task Description */}
          <div>
            <Label htmlFor="description" style={{ color: PASTEL_COLORS.darkText }}>
              Task Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What needs to be done?"
              className="mt-2 min-h-[80px]"
              style={{ borderRadius: '12px' }}
            />
          </div>

          {/* Default Client */}
          <div>
            <Label htmlFor="default-client" style={{ color: PASTEL_COLORS.darkText }}>
              Default Client (Optional)
            </Label>
            <Select value={defaultClient} onValueChange={setDefaultClient}>
              <SelectTrigger className="mt-2" style={{ borderRadius: '12px' }}>
                <SelectValue placeholder="None (optional)" />
              </SelectTrigger>
              <SelectContent>
                {userClients.map((client) => (
                  <SelectItem key={client} value={client}>
                    {client}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Default Task Type */}
          <div>
            <Label htmlFor="default-task-type" style={{ color: PASTEL_COLORS.darkText }}>
              Default Task Type (Optional)
            </Label>
            <Select value={defaultTaskType} onValueChange={setDefaultTaskType}>
              <SelectTrigger className="mt-2" style={{ borderRadius: '12px' }}>
                <SelectValue placeholder="None (optional)" />
              </SelectTrigger>
              <SelectContent>
                {TASK_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Default Categories */}
          <div>
            <Label style={{ color: PASTEL_COLORS.darkText }}>
              Default Categories (Optional)
            </Label>
            <div className="flex flex-wrap gap-2 mt-3">
              {TASK_CATEGORIES.map((category) => (
                <Badge
                  key={category}
                  onClick={() => handleCategoryToggle(category)}
                  className="cursor-pointer text-xs font-medium border-0 transition-all duration-200 hover:brightness-110"
                  style={{
                    backgroundColor: selectedCategories.includes(category)
                      ? PASTEL_COLORS.pastelMint
                      : PASTEL_COLORS.cream,
                    color: PASTEL_COLORS.darkText,
                    border: `2px solid ${selectedCategories.includes(category) ? PASTEL_COLORS.pastelMint : '#E5E9F2'}`,
                  }}
                >
                  {category}
                </Badge>
              ))}
            </div>
          </div>

          {/* Default Priority */}
          <div>
            <Label htmlFor="default-priority" style={{ color: PASTEL_COLORS.darkText }}>
              Default Priority (Optional)
            </Label>
            <Select value={defaultPriority} onValueChange={setDefaultPriority}>
              <SelectTrigger className="mt-2" style={{ borderRadius: '12px' }}>
                <SelectValue placeholder="None (optional)" />
              </SelectTrigger>
              <SelectContent>
                {TASK_PRIORITIES.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {priority}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Auto-Queue Toggle */}
          <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: '#F7F9FC' }}>
            <input
              type="checkbox"
              id="auto-queue"
              checked={autoQueueEnabled}
              onChange={(e) => setAutoQueueEnabled(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <Label htmlFor="auto-queue" className="cursor-pointer" style={{ color: PASTEL_COLORS.darkText }}>
              ⚡ Auto-add this task to my queue every morning
            </Label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            style={{
              borderRadius: '12px',
              color: PASTEL_COLORS.warmText,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!templateName.trim() || !description.trim()}
            className="border-0 font-medium"
            style={{
              backgroundColor: PASTEL_COLORS.pastelMint,
              color: PASTEL_COLORS.darkText,
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(184, 235, 208, 0.3)',
            }}
          >
            {editingTemplate ? 'Update Template' : 'Save Template'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

