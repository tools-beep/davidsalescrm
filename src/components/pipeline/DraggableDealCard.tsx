import { memo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, Calendar, User, Clock, Phone, ArrowRightLeft } from "lucide-react";
import { ClickToCall } from "@/components/calls/ClickToCall";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Deal {
  id: string;
  name: string;
  stage: string;
  amount?: number;
  close_date?: string;
  created_at: string;
  priority: string;
  timezone?: string;
  companies?: { name: string; phone?: string };
  contacts?: { id: string; first_name: string; last_name: string; phone?: string };
}

const stageColors = {
  "not contacted": "secondary",
  "no answer / gatekeeper": "secondary",
  "decision maker": "warning", 
  "nurturing": "secondary",
  "interested": "primary",
  "strategy call booked": "primary",
  "strategy call attended": "primary",
  "proposal / scope": "success",
  "closed won": "success",
  "closed lost": "destructive"
} as const;

const priorityColors = {
  high: "destructive",
  medium: "warning",
  low: "secondary"
} as const;

interface Pipeline {
  id: string;
  name: string;
}

interface DraggableDealCardProps {
  deal: Deal;
  isDragging?: boolean;
  pipelines?: Pipeline[];
  currentPipelineId?: string;
  onTransferPipeline?: (dealId: string, newPipelineId: string, newStage: string) => void;
}

export const DraggableDealCard = memo(function DraggableDealCard({ 
  deal, 
  isDragging = false, 
  pipelines = [], 
  currentPipelineId,
  onTransferPipeline 
}: DraggableDealCardProps) {
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");
  const [selectedStage, setSelectedStage] = useState<string>("");

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: deal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition, // Disable transition while dragging for smoothness
    opacity: isDragging ? 0.8 : 1,
  };

  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId);
  const availablePipelines = pipelines.filter(p => p.id !== currentPipelineId);

  const handleTransfer = () => {
    if (selectedPipelineId && selectedStage && onTransferPipeline) {
      onTransferPipeline(deal.id, selectedPipelineId, selectedStage);
      setTransferDialogOpen(false);
      setSelectedPipelineId("");
      setSelectedStage("");
    }
  };

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group cursor-grab active:cursor-grabbing border border-border/40 bg-card ${
        isDragging ? 'shadow-lg z-50 scale-105 border-primary' : 'hover:border-primary/30 hover:shadow-md'
      }`}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header with Deal Name and Priority Indicator */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <Link to={`/deals/${deal.id}`}>
                <h4 className="font-semibold text-sm hover:text-primary transition-colors truncate group-hover:text-primary">
                  {deal.name}
                </h4>
              </Link>
              {deal.companies?.name && (
                <p className="text-xs text-muted-foreground truncate mt-1">
                  {deal.companies.name}
                </p>
              )}
            </div>
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
              deal.priority === 'high' ? 'bg-destructive shadow-destructive/30 shadow-md' :
              deal.priority === 'medium' ? 'bg-warning shadow-warning/30 shadow-md' :
              'bg-muted shadow-muted/30 shadow-sm'
            }`} />
          </div>

          {/* Amount - Most Prominent */}
          {deal.amount && (
            <div className="bg-success/10 rounded-lg p-2 border border-success/20">
              <div className="flex items-center justify-center space-x-1">
                <DollarSign className="h-4 w-4 text-success" />
                <span className="font-bold text-success text-lg">
                  ${deal.amount.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Contact Info */}
          {deal.contacts && (
            <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
              <div className="flex items-center space-x-2">
              <User className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">
                {deal.contacts.first_name} {deal.contacts.last_name}
              </span>
              </div>
              {deal.contacts.phone && (
                <ClickToCall 
                  phoneNumber={deal.contacts.phone}
                  contactId={deal.contacts.id}
                  dealId={deal.id}
                  variant="ghost"
                  size="icon"
                />
              )}
            </div>
          )}
          
          {/* Timeline Info */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {deal.close_date && (
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>{new Date(deal.close_date).toLocaleDateString()}</span>
              </div>
            )}
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{new Date(deal.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Stage and Priority Badges */}
          <div className="flex items-center gap-1 pt-2 border-t border-border/50">
            <Badge 
              variant={stageColors[deal.stage as keyof typeof stageColors] || "secondary"}
              className="text-xs font-medium flex-1 justify-center"
            >
              {deal.stage.charAt(0).toUpperCase() + deal.stage.slice(1)}
            </Badge>
          </div>

          {/* Transfer Pipeline Button */}
          {pipelines && pipelines.length > 1 && onTransferPipeline && (
            <>
              <div className="pt-2 border-t border-border/50">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs h-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTransferDialogOpen(true);
                  }}
                >
                  <ArrowRightLeft className="h-3 w-3 mr-1" />
                  Transfer Pipeline
                </Button>
              </div>

              <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
                <DialogContent onClick={(e) => e.stopPropagation()}>
                  <DialogHeader>
                    <DialogTitle>Transfer Deal to Another Pipeline</DialogTitle>
                    <DialogDescription>
                      Select the pipeline and stage for "{deal.name}"
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    {/* Step 1: Select Pipeline */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">1. Select Pipeline</label>
                      <Select value={selectedPipelineId} onValueChange={(value) => {
                        setSelectedPipelineId(value);
                        setSelectedStage(""); // Reset stage when pipeline changes
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a pipeline..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availablePipelines.map((pipeline) => (
                            <SelectItem key={pipeline.id} value={pipeline.id}>
                              {pipeline.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Step 2: Select Stage (only shown after pipeline is selected) */}
                    {selectedPipelineId && selectedPipeline && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">2. Select Stage</label>
                        <Select value={selectedStage} onValueChange={setSelectedStage}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a stage..." />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedPipeline.stages && selectedPipeline.stages.length > 0 ? (
                              selectedPipeline.stages.map((stage) => (
                                <SelectItem key={stage} value={stage}>
                                  {stage}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="Not Contacted">Not Contacted (default)</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setTransferDialogOpen(false);
                        setSelectedPipelineId("");
                        setSelectedStage("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTransfer();
                      }}
                      disabled={!selectedPipelineId || !selectedStage}
                    >
                      Transfer Deal
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo - only re-render if these specific props change
  return (
    prevProps.deal.id === nextProps.deal.id &&
    prevProps.deal.name === nextProps.deal.name &&
    prevProps.deal.stage === nextProps.deal.stage &&
    prevProps.deal.amount === nextProps.deal.amount &&
    prevProps.deal.priority === nextProps.deal.priority &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.currentPipelineId === nextProps.currentPipelineId
  );
});