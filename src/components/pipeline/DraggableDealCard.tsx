import { memo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, Calendar, User, Clock, Phone, Eye, FileText, Trash2 } from "lucide-react";
import { ClickToCall } from "@/components/calls/ClickToCall";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Link } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

interface DraggableDealCardProps {
  deal: Deal;
  isDragging?: boolean;
  isAdmin?: boolean;
  onDelete?: (dealId: string) => void;
}

export const DraggableDealCard = memo(function DraggableDealCard({ 
  deal, 
  isDragging = false,
  isAdmin = false,
  onDelete
}: DraggableDealCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ 
    id: deal.id,
    transition: {
      duration: 150, // Faster 150ms animation for snappier feel
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)', // Smooth easing function
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isSortableDragging ? 'none' : transition || 'transform 150ms cubic-bezier(0.25, 1, 0.5, 1)',
    opacity: isDragging || isSortableDragging ? 0.6 : 1,
    zIndex: isDragging || isSortableDragging ? 999 : 'auto',
    cursor: isSortableDragging ? 'grabbing' : 'grab',
  };

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`group border border-border/40 bg-card transition-all duration-150 ease-out ${
        isDragging || isSortableDragging 
          ? 'shadow-2xl scale-105 border-primary ring-2 ring-primary/50 rotate-1 bg-primary/5' 
          : 'hover:border-primary/40 hover:shadow-lg hover:scale-[1.02] hover:bg-accent/50'
      }`}
    >
      <CardContent className="p-4 cursor-grab active:cursor-grabbing" {...listeners}>
        <div className="space-y-3">
          {/* Header with Deal Name and Priority Indicator */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <Link to={`/deals/${deal.id}`} onClick={(e) => {
                // Prevent navigation if we're in the middle of a drag
                if (isSortableDragging) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}>
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

          {/* Action Buttons */}
          <div className="pt-2 border-t border-border/50 flex gap-2">
            <Link to={`/deals/${deal.id}`} className="flex-1">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-xs h-7"
                onClick={(e) => {
                  // Allow navigation, just stop propagation to prevent drag
                  e.stopPropagation();
                }}
              >
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
            </Link>
            {isAdmin && onDelete && (
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs h-7 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteDialog(true);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deal.name}"? This action cannot be undone.
              {deal.companies?.name && (
                <span className="block mt-2 text-sm font-medium">
                  Company: {deal.companies.name}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.stopPropagation();
                if (onDelete) {
                  onDelete(deal.id);
                }
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
    prevProps.isAdmin === nextProps.isAdmin
  );
});