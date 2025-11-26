import { useState, useEffect, useMemo, memo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  MouseSensor,
  useSensor,
  useSensors,
  DragOverEvent,
  closestCenter,
  MeasuringStrategy,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DraggableDealCard } from "./DraggableDealCard";
import { DroppableStage } from "./DroppableStage";

interface Deal {
  id: string;
  name: string;
  stage: string;
  amount?: number;
  close_date?: string;
  created_at: string;
  priority: string;
  timezone?: string;
  pipeline_id?: string;
  companies?: { name: string; phone?: string };
  contacts?: { id: string; first_name: string; last_name: string; phone?: string };
}

interface DragDropPipelineProps {
  deals?: Deal[];
  onDealUpdate?: () => void;
  stages?: string[];
  stageColors?: Record<string, string>;
  pipelineId?: string;
  isAdmin?: boolean;
}

const defaultStageColors: Record<string, string> = {
  "not contacted": "#9CA3AF",
  "no answer / gatekeeper": "#9CA3AF",
  "decision maker": "#F59E0B",
  "nurturing": "#9CA3AF",
  "interested": "#3B82F6",
  "strategy call booked": "#3B82F6", 
  "strategy call attended": "#3B82F6",
  "proposal / scope": "#10B981",
  "closed won": "#10B981",
  "closed lost": "#EF4444",
  "uncontacted": "#9CA3AF",
  "dm connected": "#F59E0B",
  "bizops audit agreement sent": "#8B5CF6",
  "bizops audit paid / booked": "#8B5CF6",
  "bizops audit attended": "#8B5CF6",
  "ms agreement sent": "#10B981",
  "balance paid / deal won": "#10B981",
  "not interested": "#EF4444",
  "not qualified": "#EF4444",
  "onboarding call booked": "#3B82F6",
  "onboarding call attended": "#3B82F6",
  "active client (operator)": "#10B981",
  "active client - project in progress": "#10B981",
  "paused client": "#F59E0B",
  "candidate replacement": "#F59E0B",
  "project rescope / expansion": "#8B5CF6",
  "active client - project maintenance": "#10B981",
  "cancelled / completed": "#6B7280",
  
  // Fulfillment - Operators Pipeline colors
  "active clients (launched)": "#10B981",
  "paused clients": "#F59E0B",
  "cancelled clients": "#6B7280"
};

const priorityColors = {
  high: "destructive",
  medium: "warning",
  low: "secondary"
} as const;

// Normalize stage strings to EXACT enum values - defined outside component for stability
const normalizeStage = (raw: string): string => {
  if (!raw) return 'not contacted';
  let s = raw.toLowerCase().trim();
  // Normalize spacing around slashes ONLY (keep hyphens as-is for stages like "active client - project in progress")
  s = s.replace(/\s*\/\s*/g, ' / ').replace(/\s+/g, ' ').trim();
  
  // Map ALL variants to the EXACT enum values from the database
  const stageMapping: Record<string, string> = {
    // Base enum values (these are the ONLY valid values in DB)
    'not contacted': 'not contacted',
    'no answer / gatekeeper': 'no answer / gatekeeper',
    'decision maker': 'decision maker',
    'nurturing': 'nurturing',
    'interested': 'interested',
    'strategy call booked': 'strategy call booked',
    'strategy call attended': 'strategy call attended',
    'proposal sent': 'proposal sent',
    'negotiation': 'negotiation',
    'proposal / scope': 'proposal / scope',
    'closed won': 'closed won',
    'closed lost': 'closed lost',
    
    // Extended enum values from migrations
    'uncontacted': 'uncontacted',
    'dm connected': 'dm connected',
    'discovery': 'discovery', // NEW: Separate stage from DM Connected
    'not qualified': 'not qualified',
    'not qualified / disqualified': 'not qualified / disqualified',
    'not interested': 'not interested',
    'do not call': 'do not call',
    'awaiting docs / signature': 'awaiting docs / signature',
    'business audit booked': 'business audit booked',
    'business audit attended': 'business audit attended',
    'bizops audit agreement sent': 'bizops audit agreement sent',
    'bizops audit paid / booked': 'bizops audit paid / booked',
    'bizops audit attended': 'bizops audit attended',
    'candidate interview booked': 'candidate interview booked',
    'candidate interview attended': 'candidate interview attended',
    'ms agreement sent': 'ms agreement sent',
    'deal won': 'deal won',
    'balance paid / deal won': 'balance paid / deal won',
    'onboarding call booked': 'onboarding call booked',
    'onboarding call attended': 'onboarding call attended',
    'active client (operator)': 'active client (operator)',
    'active client - project in progress': 'active client - project in progress',
    'paused client': 'paused client',
    'candidate replacement': 'candidate replacement',
    'project rescope / expansion': 'project rescope / expansion',
    'active client - project maintenance': 'active client - project maintenance',
    'cancelled / completed': 'cancelled / completed',
    
    // Fulfillment - Operators Pipeline stages
    'active clients (launched)': 'active clients (launched)',
    'paused clients': 'paused clients',
    'cancelled clients': 'cancelled clients',
    
    // Pipeline Display Label Variants (from custom pipeline configurations)
    'no answer/gatekeeper': 'no answer / gatekeeper',
    'no answers / gatekeeper': 'no answer / gatekeeper',
    'gatekeeper': 'no answer / gatekeeper',
    'dm': 'dm connected',
    'proposal': 'proposal sent',
    'proposal/scope': 'proposal / scope',
    'scope': 'proposal / scope',
    'negotiating': 'negotiation',
    'won': 'closed won',
    'lost': 'closed lost',
    'not qualified/disqualified': 'not qualified / disqualified',
    'disqualified': 'not qualified / disqualified',
    'do not call ': 'do not call', // with trailing space
    'dnc': 'do not call',
    
    // BizOps Audit variants
    'bizops audit booked': 'bizops audit paid / booked',
    'bizops audit paid': 'bizops audit paid / booked',
    
    // Deal Won variants  
    'deal won (balance paid)': 'balance paid / deal won',
    'balance paid': 'balance paid / deal won',
    
    // Project/Client lifecycle stages (these appear in your data)
    'active': 'active client - project in progress',
    'client - project maintenance': 'active client - project maintenance',
    'client - project in progress': 'active client - project in progress',
    'project maintenance': 'active client - project maintenance',
    'project in progress': 'active client - project in progress',
    
    // Fulfillment - Operators Pipeline variants
    'active clients': 'active clients (launched)',
    'launched': 'active clients (launched)',
    'paused': 'paused clients',
    'cancelled': 'cancelled clients',
    'replacement': 'candidate replacement',
    
    // Handle display variants with slashes converted from hyphens (removed duplicates)
    
    // Other variants
    'new opt / in': 'uncontacted',
    'new opt in': 'uncontacted',
    'not interested ': 'not interested', // with trailing space
  };
  
  const normalized = stageMapping[s];
  if (!normalized) {
    console.warn('[Stage Mapping] Unknown stage:', raw, '-> using lowercase version:', s);
    // Return the lowercase version instead of defaulting to "not contacted"
    // This allows custom pipeline stages to work
    return s;
  }
  return normalized;
};

export function DragDropPipeline({ deals = [], onDealUpdate, stages: propStages, stageColors: propStageColors, pipelineId, isAdmin = false }: DragDropPipelineProps) {
  const stages = propStages || [
  "not contacted",
  "no answer / gatekeeper",
  "decision maker",
  "nurturing",
  "interested",
  "strategy call booked",
  "strategy call attended",
  "proposal / scope",
  "closed won",
  "closed lost"
];

  // Debug: Log stages
  console.log('=== DragDropPipeline Stages ===');
  console.log('PropStages:', propStages);
  console.log('Final stages:', stages);
  console.log('Stages types:', stages.map(s => `${s} (${typeof s})`));

  const stageColors = propStageColors || defaultStageColors;
  const [localDeals, setLocalDeals] = useState<Deal[]>(deals);
  const [loading, setLoading] = useState(false);
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [draggedOverStage, setDraggedOverStage] = useState<string | null>(null);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const [collapsedStages, setCollapsedStages] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  
  // Performance: Limit cards shown per stage for smooth scrolling
  const CARDS_PER_STAGE_INITIAL = 1000; // Show many deals initially
  const CARDS_PER_STAGE_EXPANDED = 5000; // Show even more when expanded

  // Improved drag sensors for easier dragging
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 3, // Reduced distance for easier drag initiation
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 50, // Reduced delay for faster touch response
        tolerance: 3, // Reduced tolerance for easier touch drag
      },
    }),
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // Reduced distance for easier drag initiation
      },
    })
  );

  // Measuring configuration for smoother animations
  const measuring = {
    droppable: {
      strategy: MeasuringStrategy.Always,
    },
  };

  useEffect(() => {
    // Sync localDeals with props whenever deals change
    setLocalDeals(deals);
  }, [deals]);


  const handleDeleteDeal = useCallback(async (dealId: string) => {
    console.log('[DragDrop] Deleting deal:', dealId);
    
    // Optimistic update - remove from UI immediately
    const dealToDelete = localDeals.find(d => d.id === dealId);
    setLocalDeals(prev => prev.filter(d => d.id !== dealId));

    try {
      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', dealId);

      if (error) {
        console.error('[DragDrop] Delete error:', error);
        // Revert optimistic update on error
        if (dealToDelete) {
          setLocalDeals(prev => [...prev, dealToDelete]);
        }
        toast({
          title: "Error",
          description: error.message || "Failed to delete deal",
          variant: "destructive",
        });
        return;
      }

      console.log('[DragDrop] ✅ Successfully deleted deal');
      toast({
        title: "Deal Deleted",
        description: "The deal has been successfully removed.",
      });
      
      // Refresh the parent to update counts
      if (onDealUpdate) {
        setTimeout(() => {
          onDealUpdate();
        }, 500);
      }
    } catch (error: any) {
      console.error('[DragDrop] Error deleting deal:', error);
      // Revert optimistic update on error
      if (dealToDelete) {
        setLocalDeals(prev => [...prev, dealToDelete]);
      }
      toast({
        title: "Error",
        description: error.message || "Failed to delete deal",
        variant: "destructive",
      });
    }
  }, [localDeals, toast, onDealUpdate]);

  const updateDealStage = useCallback(async (dealId: string, newStage: string) => {
    const normalized = normalizeStage(newStage);
    console.log('[DragDrop] Updating deal stage:', {
      dealId,
      displayLabel: newStage,
      normalized,
      willSaveTo: normalized
    });
    
    // Optimistic update for immediate UX feedback
    setLocalDeals(prev => {
      const originalDeal = prev.find(d => d.id === dealId);
      if (!originalDeal) return prev;
      
      return prev.map(deal => 
        deal.id === dealId ? { ...deal, stage: normalized } : deal
      );
    });

    try {
      // Prepare update data - always update stage, and update pipeline_id if provided
      const updateData: any = { stage: normalized };
      if (pipelineId) {
        updateData.pipeline_id = pipelineId;
      }

      const { error } = await supabase
        .from('deals')
        .update(updateData)
        .eq('id', dealId);

      if (error) {
        console.error('[DragDrop] Database error:', error);
        // Revert optimistic update on error
        setLocalDeals(prev => prev.map(deal => {
          if (deal.id === dealId) {
            // Fetch the original stage from the deals prop
            const originalDeal = deals.find(d => d.id === dealId);
            return originalDeal ? { ...deal, stage: originalDeal.stage } : deal;
          }
          return deal;
        }));
        toast({
          title: "Error",
          description: error.message || "Failed to update deal",
          variant: "destructive",
        });
        return;
      }

      console.log('[DragDrop] ✅ Successfully updated stage to:', normalized, pipelineId ? `and pipeline_id to: ${pipelineId}` : '');
      
      // DON'T call onDealUpdate - it causes the parent to refresh and overwrite our optimistic update
      // The optimistic update already shows the change instantly
      // The database is already updated, so we're good!
      
      // Optional: If you need to update other components (like deal counts), 
      // you can enable this with a longer delay
      // if (onDealUpdate) {
      //   setTimeout(() => {
      //     onDealUpdate();
      //   }, 5000); // 5 second delay
      // }
    } catch (error: any) {
      console.error('[DragDrop] Error updating deal:', error);
      // Revert optimistic update on error
      setLocalDeals(prev => prev.map(deal => {
        if (deal.id === dealId) {
          const originalDeal = deals.find(d => d.id === dealId);
          return originalDeal ? { ...deal, stage: originalDeal.stage } : deal;
        }
        return deal;
      }));
      toast({
        title: "Error",
        description: error.message || "Failed to update deal",
        variant: "destructive",
      });
    }
  }, [toast, pipelineId, deals, onDealUpdate]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const deal = localDeals.find(d => d.id === active.id);
    setActiveDeal(deal || null);
  }, [localDeals]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    if (over) {
      setDraggedOverStage(over.id as string);
    } else {
      setDraggedOverStage(null);
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveDeal(null);
    setDraggedOverStage(null);
    
    if (!over) return;
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    // Find the active deal
    const activeDeal = localDeals.find(d => d.id === activeId);
    if (!activeDeal) return;
    
    // Check if we're dropping on another deal (for reordering within same stage)
    const overDeal = localDeals.find(d => d.id === overId);
    
    if (overDeal) {
      // CASE 1: Dropping on another deal - reorder within the same stage
      const activeStage = normalizeStage(activeDeal.stage);
      const overStage = normalizeStage(overDeal.stage);
      
      if (activeStage === overStage) {
        // Reordering within the same stage - HubSpot style!
        console.log('[DragDrop] Reordering within stage:', activeStage);
        
        // Get all deals in this stage
        const stageDeals = localDeals.filter(d => normalizeStage(d.stage) === activeStage);
        const oldIndex = stageDeals.findIndex(d => d.id === activeId);
        const newIndex = stageDeals.findIndex(d => d.id === overId);
        
        if (oldIndex !== newIndex) {
          // Reorder the deals array
          const reorderedStageDeals = arrayMove(stageDeals, oldIndex, newIndex);
          
          // Update localDeals with the new order
          setLocalDeals(prev => {
            const otherDeals = prev.filter(d => normalizeStage(d.stage) !== activeStage);
            return [...otherDeals, ...reorderedStageDeals];
          });
          
          console.log('[DragDrop] Reordered deals within stage');
        }
        return;
      }
    }
    
    // CASE 2: Dropping on a stage (moving between stages)
    let stageLabel = overId;
    
    // Check if stageLabel is a UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stageLabel);
    
    if (isUUID) {
      console.error('[DragDrop] Received UUID instead of stage name:', stageLabel);
      toast({
        title: "Invalid Stage Format",
        description: "The stage format is incorrect. Please refresh the page and try again.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if stage exists
    const stageExists = stages.some(s => s.toLowerCase() === stageLabel.toLowerCase());
    
    if (stageExists) {
      const normalizedNew = normalizeStage(stageLabel);
      const normalizedCurrent = normalizeStage(activeDeal.stage);
      
      console.log('[DragDrop] Moving between stages:', {
        dealId: activeId,
        from: normalizedCurrent,
        to: normalizedNew,
      });
      
      // Only update if actually different
      if (normalizedNew !== normalizedCurrent) {
        updateDealStage(activeId, stageLabel);
      }
    } else {
      console.warn('[DragDrop] Stage not found in pipeline stages:', stageLabel, 'Available stages:', stages);
      toast({
        title: "Invalid Stage",
        description: `Cannot move deal to "${stageLabel}". This stage may not exist in the current pipeline.`,
        variant: "destructive",
      });
    }
  }, [localDeals, stages, updateDealStage, toast]);

  const dealsByStage = useMemo(() => {
    const result = stages.reduce((acc, stageLabel) => {
      const normalizedStageLabel = normalizeStage(stageLabel);
      const dealsForThisStage = localDeals.filter(deal => {
        const normalizedDealStage = normalizeStage(deal.stage);
        const matches = normalizedDealStage === normalizedStageLabel;
        
        // DIRECT COMPARISON FALLBACK
        const directLowerMatch = !matches && (
          deal.stage?.toLowerCase().trim() === stageLabel?.toLowerCase().trim()
        );
        
        // STRIP ALL NON-ALPHANUMERIC FALLBACK
        const stripForComparison = (str: string) => 
          str?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
        
        const dealStageStripped = stripForComparison(deal.stage);
        const stageLabelStripped = stripForComparison(stageLabel);
        
        const strippedMatch = !matches && !directLowerMatch && (
          dealStageStripped === stageLabelStripped
        );
        
        // STRICT keyword matching
        let keywordMatch = false;
        if (!matches && !directLowerMatch && !strippedMatch) {
          const dealStageWords = deal.stage?.toLowerCase().split(/[\s\-_()]+/).filter(w => w.length > 2) || [];
          const stageLabelWords = stageLabel?.toLowerCase().split(/[\s\-_()]+/).filter(w => w.length > 2) || [];
          
          const stopWords = ['the', 'and', 'for', 'with', 'client', 'clients', 'deal', 'deals'];
          const significantStageLabelWords = stageLabelWords.filter(w => !stopWords.includes(w));
          
          if (significantStageLabelWords.length > 0) {
            keywordMatch = significantStageLabelWords.every(sw => 
              dealStageWords.some(dw => dw === sw || dw.includes(sw) || sw.includes(dw))
            );
          }
        }
        
        return matches || directLowerMatch || strippedMatch || keywordMatch;
      });
      
      acc[stageLabel] = dealsForThisStage;
      return acc;
    }, {} as Record<string, Deal[]>);
    
    return result;
  }, [localDeals, stages]);

  // Performance: Get visible deals for a stage (limited for smooth rendering)
  const getVisibleDeals = useCallback((stage: string, deals: Deal[]) => {
    const isExpanded = expandedStages.has(stage);
    const limit = isExpanded ? CARDS_PER_STAGE_EXPANDED : CARDS_PER_STAGE_INITIAL;
    return deals.slice(0, limit);
  }, [expandedStages, CARDS_PER_STAGE_INITIAL, CARDS_PER_STAGE_EXPANDED]);

  const toggleStageExpansion = useCallback((stage: string) => {
    setExpandedStages(prev => {
      const next = new Set(prev);
      if (next.has(stage)) {
        next.delete(stage);
      } else {
        next.add(stage);
      }
      return next;
    });
  }, []);

  const toggleStageCollapse = useCallback((stage: string) => {
    setCollapsedStages(prev => {
      const next = new Set(prev);
      if (next.has(stage)) {
        next.delete(stage);
      } else {
        next.add(stage);
      }
      return next;
    });
  }, []);

  const getStageTotal = useMemo(() => {
    return (stage: string) => {
    return dealsByStage[stage]?.reduce((sum, deal) => sum + (deal.amount || 0), 0) || 0;
  };
  }, [dealsByStage]);

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>;
  }

  return (
    <div className="w-full flex flex-col">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        measuring={measuring}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >

        {/* Kanban Columns - Fixed height with visible horizontal scroll */}
        <div className="w-full overflow-x-auto overflow-y-hidden pipeline-scroll pb-6 h-[calc(100vh-250px)] min-h-[700px]">
          <div className="inline-flex gap-6 p-6 pt-0 min-w-max h-full">
            {stages.map((stage, index) => {
              const stageDeals = dealsByStage[stage] || [];
              const stageTotal = getStageTotal(stage);
              const isCollapsed = collapsedStages.has(stage);
              
              return (
                <div 
                  key={stage} 
                  className={`flex-shrink-0 flex flex-col h-full transition-all duration-200 ${
                    isCollapsed ? 'w-16' : 'w-80'
                  }`}
                >
                  {/* Stage Header */}
                  <div 
                    className={`p-4 shadow-md border ${isCollapsed ? 'rounded-xl' : 'rounded-t-xl border-b-0'}`}
                    style={{
                      backgroundColor: stageColors[normalizeStage(stage)] ? `${stageColors[normalizeStage(stage)]}20` : '#f1f5f920',
                      borderColor: stageColors[normalizeStage(stage)] || '#e5e7eb'
                    }}
                  >
                    {isCollapsed ? (
                      <div className="flex flex-col items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleStageCollapse(stage)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <div 
                          className="writing-mode-vertical text-sm font-bold capitalize whitespace-nowrap"
                          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                        >
                          {stage}
                        </div>
                        <Badge variant="secondary" className="bg-background/80 text-xs font-semibold">
                          {stageDeals.length}
                        </Badge>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 flex-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 flex-shrink-0"
                              onClick={() => toggleStageCollapse(stage)}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                            <h3 className="font-bold text-base capitalize text-foreground">
                              {stage}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-background/80 text-xs font-semibold">
                              {stageDeals.length}
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Stage Metrics */}
                        <div className="space-y-1">
                          {stageTotal > 0 && (
                            <div className="text-sm font-medium text-muted-foreground">
                              ${stageTotal.toLocaleString()}
                            </div>
                          )}
                          <div className="w-full bg-background/50 rounded-full h-1.5">
                            <div 
                              className="h-1.5 rounded-full"
                              style={{ 
                                width: `${Math.min((stageDeals.length / Math.max(...stages.map(s => (dealsByStage[s] || []).length), 1)) * 100, 100)}%`,
                                backgroundColor: stageColors[normalizeStage(stage)] || '#94a3b8'
                              }}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Drop Zone - Scrollable area (only show when not collapsed) */}
                  {!isCollapsed && (
                    <DroppableStage 
                      id={stage} 
                      isOver={draggedOverStage === stage}
                    >
                    <div className={`p-4 border border-t-0 rounded-b-xl shadow-md flex-1 overflow-y-auto pipeline-scroll max-h-[calc(100vh-350px)] ${
                      draggedOverStage === stage 
                        ? 'bg-primary/5 border-primary/30' 
                        : 'bg-background/50 border-border/40'
                    }`}>
                      <SortableContext items={stageDeals.map(d => d.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-3">
                          {getVisibleDeals(stage, stageDeals).map((deal) => (
                            <DraggableDealCard 
                              key={deal.id}
                              deal={deal} 
                              isDragging={activeDeal?.id === deal.id}
                              isAdmin={isAdmin}
                              onDelete={handleDeleteDeal}
                            />
                          ))}
                        </div>
                      </SortableContext>
                      
                      {/* Load More Button */}
                      {stageDeals.length > CARDS_PER_STAGE_INITIAL && (
                        <div className="mt-4 text-center">
                          <button
                            onClick={() => toggleStageExpansion(stage)}
                            className="text-sm text-primary hover:underline font-medium px-4 py-2 rounded-lg hover:bg-primary/10 transition-colors"
                          >
                            {expandedStages.has(stage) 
                              ? `Show Less (${stageDeals.length - CARDS_PER_STAGE_EXPANDED > 0 ? `${stageDeals.length - CARDS_PER_STAGE_EXPANDED} hidden` : 'collapse'})`
                              : `Load More (${stageDeals.length - CARDS_PER_STAGE_INITIAL} more deals)`
                            }
                          </button>
                        </div>
                      )}
                      
                      {/* Empty State */}
                      {stageDeals.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                          <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center mb-2">
                            <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
                          </div>
                          <p className="text-sm">No deals yet</p>
                          <p className="text-xs opacity-75">Drop deals here</p>
                        </div>
                      )}
                    </div>
                  </DroppableStage>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Drag Overlay - Simplified for performance */}
        <DragOverlay dropAnimation={null}>
          {activeDeal ? (
            <div className="scale-105 opacity-90">
              <DraggableDealCard 
                deal={activeDeal} 
                isDragging={true}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Updating deal...</p>
          </div>
        </div>
      )}
    </div>
  );
}