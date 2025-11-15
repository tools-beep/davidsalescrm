import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Settings, Trash2, GripVertical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Pipeline {
  id: string;
  name: string;
  description: string | null;
  stages: string[];
  stage_order: Array<{ name: string; color: string }>;
  is_active: boolean;
}

interface PipelineManagerProps {
  onPipelineCreated?: () => void;
}

// Common valid stage names (matching database enum)
const VALID_STAGE_EXAMPLES = [
  "uncontacted",
  "no answer / gatekeeper",
  "dm connected",
  "not qualified",
  "discovery",
  "not interested",
  "not contacted",
  "nurturing",
  "strategy call booked",
  "strategy call attended",
  "proposal sent",
  "negotiation",
  "closed won",
  "closed lost",
  "onboarding",
  "active",
  "at risk",
  "churned",
  "renewed",
];

// Sortable Stage Item Component
function SortableStageItem({ 
  stage, 
  index, 
  onUpdate, 
  onRemove, 
  canRemove 
}: { 
  stage: { name: string; color: string }; 
  index: number; 
  onUpdate: (index: number, field: 'name' | 'color', value: string) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: `stage-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <span className="text-sm font-medium w-6">{index + 1}.</span>
      <Input 
        value={stage.name} 
        onChange={(e) => onUpdate(index, 'name', e.target.value)} 
        placeholder={`Stage ${index + 1}`} 
      />
      <Input 
        type="color" 
        value={stage.color} 
        onChange={(e) => onUpdate(index, 'color', e.target.value)} 
        className="w-12 p-1" 
      />
      <Button 
        size="sm" 
        variant="ghost" 
        onClick={() => onRemove(index)} 
        disabled={!canRemove}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

export function PipelineManager({ onPipelineCreated }: PipelineManagerProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null);
  const [editDraft, setEditDraft] = useState<{ name: string; description: string; stages: Array<{ name: string; color: string }> } | null>(null);
  const [newPipeline, setNewPipeline] = useState({
    name: "",
    description: "",
    stages: ["uncontacted", "discovery", "closed won"],
  });

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id || !editDraft) return;
    
    const oldIndex = parseInt(active.id.toString().replace('stage-', ''));
    const newIndex = parseInt(over.id.toString().replace('stage-', ''));
    
    const reorderedStages = arrayMove(editDraft.stages, oldIndex, newIndex);
    setEditDraft({ ...editDraft, stages: reorderedStages });
  };

  useEffect(() => {
    if (open) {
      loadPipelines();
    }
  }, [open]);

  const loadPipelines = async () => {
    try {
      const { data, error } = await supabase
        .from("pipelines")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPipelines(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading pipelines",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const createPipeline = async () => {
    if (!newPipeline.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a pipeline name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // UUID validation regex
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      // Validate and normalize stages
      const validatedStages = newPipeline.stages
        .filter(stage => {
          const trimmed = stage.trim();
          if (!trimmed) {
            console.warn('⚠️ Skipping empty stage');
            return false;
          }
          if (uuidPattern.test(trimmed)) {
            console.error('⚠️ Attempted to create pipeline with UUID stage:', trimmed);
            toast({
              title: "Invalid stage format",
              description: "Stage names cannot be UUIDs. Please use descriptive names.",
              variant: "destructive",
            });
            return false;
          }
          return true;
        })
        .map(s => s.toLowerCase().trim());
      
      if (validatedStages.length < 2) {
        toast({
          title: "Insufficient stages",
          description: "A pipeline must have at least 2 valid stages",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // CRITICAL: Add stages to enum via Edge Function BEFORE creating pipeline
      console.log('[PipelineManager] Adding stages to enum via Edge Function:', validatedStages);
      
      const { data: enumResult, error: enumError } = await supabase.functions.invoke('add-stages-to-enum', {
        body: { stages: validatedStages }
      });
      
      if (enumError) {
        console.error('[PipelineManager] Edge Function error:', enumError);
        toast({
          title: "Warning",
          description: "Could not auto-add stages. You may need to add them manually.",
          variant: "default",
        });
      } else {
        console.log('[PipelineManager] Edge Function result:', enumResult);
        if (enumResult?.errors && enumResult.errors.length > 0) {
          console.warn('[PipelineManager] Some stages failed to add:', enumResult.errors);
        }
      }
      
      // Wait a moment for enum changes to propagate
      await new Promise(resolve => setTimeout(resolve, 500));

      const stageOrder = validatedStages.map((stage, index) => ({
        name: stage,
        color: index === 0 ? "#9CA3AF" : index === validatedStages.length - 1 ? "#10B981" : "#3B82F6",
      }));

      const { error } = await supabase.from("pipelines").insert([
        {
          name: newPipeline.name,
          description: newPipeline.description,
          stages: validatedStages,
          stage_order: stageOrder,
          is_active: true,
        },
      ]);

      if (error) {
        // If insert fails due to enum, show helpful error
        if (error.message.includes('invalid input value for enum')) {
          const match = error.message.match(/"([^"]+)"/);
          const failedStage = match ? match[1] : 'unknown';
          throw new Error(
            `Stage "${failedStage}" could not be added automatically. ` +
            `Please run this SQL in Supabase: ALTER TYPE public.deal_stage_enum ADD VALUE '${failedStage}';`
          );
        }
        throw error;
      }

      toast({
        title: "Pipeline created",
        description: `${newPipeline.name} has been created successfully`,
      });

      setNewPipeline({ name: "", description: "", stages: ["uncontacted", "discovery", "closed won"] });
      loadPipelines();
      onPipelineCreated?.();
    } catch (error: any) {
      toast({
        title: "Error creating pipeline",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deletePipeline = async (id: string) => {
    if (!confirm("Are you sure you want to delete this pipeline?")) return;

    try {
      const { error } = await supabase.from("pipelines").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Pipeline deleted",
        description: "The pipeline has been removed",
      });

      loadPipelines();
      onPipelineCreated?.();
    } catch (error: any) {
      toast({
        title: "Error deleting pipeline",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addStage = () => {
    setNewPipeline({
      ...newPipeline,
      stages: [...newPipeline.stages, `Stage ${newPipeline.stages.length + 1}`],
    });
  };

  const updateStage = (index: number, value: string) => {
    const updated = [...newPipeline.stages];
    updated[index] = value;
    setNewPipeline({ ...newPipeline, stages: updated });
  };

  const removeStage = (index: number) => {
    if (newPipeline.stages.length <= 2) {
      toast({
        title: "Minimum stages required",
        description: "A pipeline must have at least 2 stages",
        variant: "destructive",
      });
      return;
    }
    const updated = newPipeline.stages.filter((_, i) => i !== index);
    setNewPipeline({ ...newPipeline, stages: updated });
  };

  const beginEdit = (p: Pipeline) => {
    const stages: Array<{ name: string; color: string }> =
      p.stage_order && p.stage_order.length
        ? p.stage_order.map(s => ({ name: s.name, color: s.color }))
        : (p.stages || []).map((s, i) => ({ name: s, color: i === 0 ? "#9CA3AF" : i === (p.stages.length - 1) ? "#10B981" : "#3B82F6" }));
    setEditingPipeline(p);
    setEditDraft({ name: p.name, description: p.description || "", stages });
  };

  const cancelEdit = () => {
    setEditingPipeline(null);
    setEditDraft(null);
  };

  const addEditStage = () => {
    if (!editDraft) return;
    setEditDraft({ ...editDraft, stages: [...editDraft.stages, { name: `Stage ${editDraft.stages.length + 1}`, color: "#3B82F6" }] });
  };

  const updateEditStageName = (idx: number, value: string) => {
    if (!editDraft) return;
    const stages = [...editDraft.stages];
    stages[idx] = { ...stages[idx], name: value };
    setEditDraft({ ...editDraft, stages });
  };

  const updateEditStageColor = (idx: number, value: string) => {
    if (!editDraft) return;
    const stages = [...editDraft.stages];
    stages[idx] = { ...stages[idx], color: value };
    setEditDraft({ ...editDraft, stages });
  };

  const removeEditStage = (idx: number) => {
    if (!editDraft) return;
    if (editDraft.stages.length <= 2) {
      toast({ title: "Minimum stages required", description: "A pipeline must have at least 2 stages", variant: "destructive" });
      return;
    }
    const stages = editDraft.stages.filter((_, i) => i !== idx);
    setEditDraft({ ...editDraft, stages });
  };

  const saveEdit = async () => {
    if (!editingPipeline || !editDraft) return;
    if (!editDraft.name.trim()) {
      toast({ title: "Name required", description: "Please enter a pipeline name", variant: "destructive" });
      return;
    }
    try {
      setLoading(true);
      
      // UUID validation regex
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      // Validate and normalize stages
      const validatedStages = editDraft.stages
        .filter(stage => {
          const trimmed = stage.name.trim();
          if (!trimmed) {
            console.warn('⚠️ Skipping empty stage');
            return false;
          }
          if (uuidPattern.test(trimmed)) {
            console.error('⚠️ Attempted to save pipeline with UUID stage:', trimmed);
            toast({
              title: "Invalid stage format",
              description: "Stage names cannot be UUIDs. Please use descriptive names.",
              variant: "destructive",
            });
            return false;
          }
          return true;
        });
      
      if (validatedStages.length < 2) {
        toast({
          title: "Insufficient stages",
          description: "A pipeline must have at least 2 valid stages",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      const normalizedStages = validatedStages.map(s => s.name.toLowerCase().trim());
      const stageOrder = validatedStages.map(s => ({ name: s.name.toLowerCase().trim(), color: s.color }));
      
      // CRITICAL: Add stages to enum via Edge Function BEFORE updating pipeline
      console.log('[PipelineManager] Adding stages to enum via Edge Function (edit):', normalizedStages);
      
      const { data: enumResult, error: enumError } = await supabase.functions.invoke('add-stages-to-enum', {
        body: { stages: normalizedStages }
      });
      
      if (enumError) {
        console.error('[PipelineManager] Edge Function error (edit):', enumError);
        toast({
          title: "Warning",
          description: "Could not auto-add stages. You may need to add them manually.",
          variant: "default",
        });
      } else {
        console.log('[PipelineManager] Edge Function result (edit):', enumResult);
        if (enumResult?.errors && enumResult.errors.length > 0) {
          console.warn('[PipelineManager] Some stages failed to add:', enumResult.errors);
        }
      }
      
      // Wait a moment for enum changes to propagate
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { error } = await supabase
        .from("pipelines")
        .update({ name: editDraft.name, description: editDraft.description, stages: normalizedStages, stage_order: stageOrder })
        .eq("id", editingPipeline.id);
      
      if (error) {
        // If update fails due to enum, show helpful error
        if (error.message.includes('invalid input value for enum')) {
          const match = error.message.match(/"([^"]+)"/);
          const failedStage = match ? match[1] : 'unknown';
          throw new Error(
            `Stage "${failedStage}" could not be added automatically. ` +
            `Please run this SQL in Supabase: ALTER TYPE public.deal_stage_enum ADD VALUE '${failedStage}';`
          );
        }
        throw error;
      }
      toast({ title: "Pipeline updated", description: `${editDraft.name} has been saved` });
      await loadPipelines();
      cancelEdit();
      onPipelineCreated?.();
    } catch (error: any) {
      toast({ title: "Error updating pipeline", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="mr-2 h-4 w-4" />
          Manage Pipelines
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pipeline Management</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {editingPipeline && editDraft && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Edit Pipeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Pipeline Name</label>
                  <Input value={editDraft.name} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea rows={2} value={editDraft.description} onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Stages (drag to reorder)</label>
                    <Button size="sm" variant="outline" onClick={addEditStage}>
                      <Plus className="mr-1 h-3 w-3" /> Add Stage
                    </Button>
                  </div>
                  <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext 
                      items={editDraft.stages.map((_, i) => `stage-${i}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {editDraft.stages.map((s, i) => (
                          <SortableStageItem
                            key={`stage-${i}`}
                            stage={s}
                            index={i}
                            onUpdate={(idx, field, value) => {
                              if (field === 'name') updateEditStageName(idx, value);
                              else updateEditStageColor(idx, value);
                            }}
                            onRemove={removeEditStage}
                            canRemove={editDraft.stages.length > 2}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={cancelEdit} disabled={loading}>Cancel</Button>
                  <Button onClick={saveEdit} disabled={loading}>Save Changes</Button>
                </div>
              </CardContent>
            </Card>
          )}
          {/* Create New Pipeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Create New Pipeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Pipeline Name</label>
                <Input
                  placeholder="e.g., Sales Pipeline, Customer Success"
                  value={newPipeline.name}
                  onChange={(e) => setNewPipeline({ ...newPipeline, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description (Optional)</label>
                <Textarea
                  placeholder="Describe the purpose of this pipeline"
                  value={newPipeline.description}
                  onChange={(e) => setNewPipeline({ ...newPipeline, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Pipeline Stages</label>
                  <Button size="sm" variant="outline" onClick={addStage}>
                    <Plus className="mr-1 h-3 w-3" />
                    Add Stage
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use lowercase names like: uncontacted, discovery, proposal sent, closed won, etc.
                </p>
                <div className="space-y-2">
                  {newPipeline.stages.map((stage, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium w-6">{index + 1}.</span>
                      <Input
                        value={stage}
                        onChange={(e) => updateStage(index, e.target.value)}
                        placeholder={`Stage ${index + 1}`}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeStage(index)}
                        disabled={newPipeline.stages.length <= 2}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={createPipeline} disabled={loading} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Create Pipeline
              </Button>
            </CardContent>
          </Card>

          {/* Existing Pipelines */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Existing Pipelines</CardTitle>
            </CardHeader>
            <CardContent>
              {pipelines.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No pipelines yet</p>
              ) : (
                <div className="space-y-4">
                  {pipelines.map((pipeline) => (
                    <div
                      key={pipeline.id}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">{pipeline.name}</h4>
                          {pipeline.description && (
                            <p className="text-sm text-muted-foreground">{pipeline.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="outline" onClick={() => beginEdit(pipeline)}>
                            <Settings className="mr-1 h-4 w-4" /> Edit
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deletePipeline(pipeline.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {pipeline.stage_order?.map((stage, index) => (
                          <Badge
                            key={index}
                            style={{ backgroundColor: stage.color }}
                            className="text-white"
                          >
                            {stage.name}
                          </Badge>
                        )) || pipeline.stages?.map((stage, index) => (
                          <Badge key={index} variant="secondary">
                            {stage}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

