import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, TrendingUp, DollarSign, Target, Activity, Search, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DealForm } from "@/components/deals/DealForm";
import { DragDropPipeline } from "@/components/pipeline/DragDropPipeline";
import { DealListView } from "@/components/pipeline/DealListView";
import { AdvancedFilters } from "@/components/pipeline/AdvancedFilters";
import { PipelineManager } from "@/components/pipeline/PipelineManager";
import { useDebounce } from "@/hooks/useDebounce";

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
  companies?: { id: string; name: string; phone?: string };
  contacts?: { id: string; first_name: string; last_name: string; phone?: string };
}

interface Pipeline {
  id: string;
  name: string;
  description: string | null;
  stages: string[];
  stage_order?: Array<{ name: string; color: string }>;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface FilterState {
  stages: string[];
  priorities: string[];
  amountRange: [number, number];
  dateRange: { from?: Date; to?: Date };
  search: string;
  companies: string[];
}

export default function Deals() {
  const [viewMode, setViewMode] = useState<"pipeline" | "list">("pipeline");
  const [deals, setDeals] = useState<Deal[]>([]);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [assignees, setAssignees] = useState<Array<{ id: string; name: string }>>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewDealForm, setShowNewDealForm] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [totalPipelineDealsCount, setTotalPipelineDealsCount] = useState<number>(0); // NEW: Actual count from DB
  const [filters, setFilters] = useState<FilterState>({
    stages: [],
    priorities: [],
    amountRange: [0, 1000000],
    dateRange: {},
    search: "",
    companies: [],
  });
  
  // Debounce search for better performance
  const debouncedSearch = useDebounce(filters.search, 300);

  useEffect(() => {
    console.log('=== DEALS PAGE INITIALIZATION ===');
    fetchPipelines();
    fetchCompanies();
    fetchAssignees();
    // Don't fetch deals on mount - wait for pipeline to be selected
    console.log('Initial setup complete, waiting for pipeline selection');
  }, []);

  useEffect(() => {
    if (selectedPipeline) {
      console.log('=== PIPELINE CHANGED ===');
      console.log('New pipeline:', selectedPipeline);
      console.log('Current deals count before clear:', deals.length);
      
      // Clear deals state before fetching to ensure clean slate
      setDeals([]);
      console.log('Cleared deals state, now fetching...');
      
      fetchDeals();
      
      // Debug: Log Discovery stage analysis
      import('@/utils/fetchDiscoveryDeals').then(({ fetchDiscoveryAnalysis }) => {
        fetchDiscoveryAnalysis().then(analysis => {
          console.log('🔍 DISCOVERY ANALYSIS:', analysis);
        });
      });
    }
  }, [selectedPipeline]);

  const fetchPipelines = async () => {
    try {
      const { data, error } = await supabase
        .from("pipelines")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: true});

      if (error) throw error;
      
      // Cast the data to proper Pipeline type
      const pipelines = (data || []).map((p: any) => {
        let stages: string[];
        let stageOrder: Array<{ name: string; color: string }> = [];
        
        // Parse stages - handle both formats
        if (Array.isArray(p.stages)) {
          // Check if stages are objects {name, position, color} or strings
          if (p.stages.length > 0 && typeof p.stages[0] === 'object' && p.stages[0].name) {
            // Old format: array of objects
            stages = p.stages.map((s: any) => s.name.toLowerCase());
            stageOrder = p.stages.map((s: any) => ({ name: s.name, color: s.color }));
          } else {
            // New format: array of strings
            stages = p.stages;
            stageOrder = p.stage_order ? (Array.isArray(p.stage_order) ? p.stage_order : JSON.parse(p.stage_order as string)) : [];
          }
        } else {
          stages = JSON.parse(p.stages as string);
          stageOrder = p.stage_order ? JSON.parse(p.stage_order as string) : [];
        }
        
        return {
          ...p,
          stages,
          stage_order: stageOrder,
        };
      }) as Pipeline[];
      
      setPipelines(pipelines);
      
      // Set first pipeline as default if none selected
      if (pipelines.length > 0 && !selectedPipeline) {
        console.log('Setting default pipeline:', pipelines[0].id, pipelines[0].name);
        setSelectedPipeline(pipelines[0].id);
      } else if (pipelines.length === 0) {
        // No pipelines available - stop loading
        console.log('No pipelines found - stopping loading state');
        setLoading(false);
        setSelectedPipeline(null);
      }
    } catch (error) {
      console.error("Error fetching pipelines:", error);
      setLoading(false); // Stop loading on error
    }
  };

  const fetchDeals = async () => {
    try {
      setLoading(true);
      console.log('=== FETCHING DEALS ===');
      console.log('Selected pipeline:', selectedPipeline);
      console.log('Current deals in state before fetch:', deals.length);
      
      // Step 1: Get the EXACT COUNT from database (without fetching all data)
      let countQuery = supabase
        .from("deals")
        .select('*', { count: 'exact', head: true }); // head: true means only get count, not data
      
      if (selectedPipeline) {
        countQuery = countQuery.eq("pipeline_id", selectedPipeline);
      }
      
      const { count: exactCount, error: countError } = await countQuery;
      
      if (countError) {
        console.error('Error getting count:', countError);
      } else {
        console.log('📊 EXACT COUNT FROM DATABASE (all stages):', exactCount);
        setTotalPipelineDealsCount(exactCount || 0);
      }
      
      // Also get count specifically for "uncontacted" stage to diagnose the 770 vs 532 issue
      let uncontactedCountQuery = supabase
        .from("deals")
        .select('*', { count: 'exact', head: true })
        .eq('stage', 'uncontacted');
      
      if (selectedPipeline) {
        uncontactedCountQuery = uncontactedCountQuery.eq("pipeline_id", selectedPipeline);
      }
      
      const { count: uncontactedTotal, error: uncontactedError } = await uncontactedCountQuery;
      
      if (!uncontactedError) {
        console.log('🎯 EXACT COUNT of "uncontacted" deals for this pipeline:', uncontactedTotal);
      }
      
      // Count ALL "uncontacted" deals (no pipeline filter) for comparison
      const { count: allUncontactedTotal } = await supabase
        .from("deals")
        .select('*', { count: 'exact', head: true })
        .eq('stage', 'uncontacted');
      
      console.log('🎯 TOTAL "uncontacted" deals in entire database:', allUncontactedTotal);
      
      // Step 2: Fetch deals for display (can limit to 1000 for performance)
      let dataQuery = supabase
        .from("deals")
        .select(`
          *,
          companies (id, name, phone),
          contacts:primary_contact_id (id, first_name, last_name, phone)
        `);

      // Filter by selected pipeline
      if (selectedPipeline) {
        dataQuery = dataQuery.eq("pipeline_id", selectedPipeline);
        console.log('🔍 Filtering by pipeline_id:', selectedPipeline);
        
        // Get the pipeline name for reference
        const selectedPipelineName = pipelines.find(p => p.id === selectedPipeline)?.name;
        console.log('📊 Pipeline name:', selectedPipelineName);
      } else {
        console.log('No pipeline filter - showing all deals');
      }

      // Fetch deals (Supabase defaults to 1000 rows, so use range to fetch more)
      const { data, error } = await dataQuery
        .order("created_at", { ascending: false })
        .range(0, 9999); // Get up to 10000 rows for display
      
      console.log('📊 Fetched data length:', data?.length);
      
      // Count specifically uncontacted deals
      const uncontactedInData = data?.filter(d => d.stage === 'uncontacted').length || 0;
      console.log('📊 Uncontacted deals in fetched data:', uncontactedInData);
      console.log('📊 Expected uncontacted from DB:', uncontactedTotal);

      if (error) throw error;
      
      console.log('Fetched deals for display:', data?.length);
      console.log('Sample deals:', data?.slice(0, 2).map(d => ({ id: d.id, name: d.name, stage: d.stage, pipeline_id: d.pipeline_id })));
      
      // Count deals by stage for debugging
      const stageBreakdown = data?.reduce((acc, deal) => {
        const stage = deal.stage || 'null';
        acc[stage] = (acc[stage] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log('📊 STAGE BREAKDOWN (deals fetched):', stageBreakdown);
      
      // Specifically check "uncontacted" count
      const uncontactedCount = data?.filter(d => d.stage === 'uncontacted').length || 0;
      console.log('🎯 "uncontacted" deals in fetched data:', uncontactedCount);
      console.log('🎯 "uncontacted" deals in DB (total):', exactCount ? 'need to query separately' : 'unknown');
      
      setDeals(data || []);
      console.log('Updated deals state to:', data?.length);
      console.log('But TOTAL COUNT is:', exactCount);
      console.log('⚠️ Missing deals:', (exactCount || 0) - (data?.length || 0));
      console.log('=== FETCH COMPLETE ===');
    } catch (error) {
      console.error("Error fetching deals:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };

  const fetchAssignees = async () => {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, first_name, last_name")
        .order("first_name");

      if (error) throw error;
      setAssignees(
        (data || []).map((u) => ({ id: u.id, name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown' }))
      );
    } catch (error) {
      console.error("Error fetching assignees:", error);
    }
  };

  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      if (filters.stages.length > 0 && !filters.stages.includes(deal.stage)) {
        return false;
      }

      if (filters.priorities.length > 0 && !filters.priorities.includes(deal.priority)) {
        return false;
      }

      if (deal.amount) {
        if (deal.amount < filters.amountRange[0] || deal.amount > filters.amountRange[1]) {
          return false;
        }
      }

      if (filters.dateRange.from || filters.dateRange.to) {
        const closeDate = deal.close_date ? new Date(deal.close_date) : null;
        if (closeDate) {
          if (filters.dateRange.from && closeDate < filters.dateRange.from) {
            return false;
          }
          if (filters.dateRange.to && closeDate > filters.dateRange.to) {
            return false;
          }
        }
      }

      // Use debounced search for better performance
      const searchLower = debouncedSearch.toLowerCase();
      if (searchLower) {
        const matchesName = deal.name.toLowerCase().includes(searchLower);
        const matchesCompany = deal.companies?.name.toLowerCase().includes(searchLower);
        const matchesContact = deal.contacts 
          ? `${deal.contacts.first_name} ${deal.contacts.last_name}`.toLowerCase().includes(searchLower)
          : false;
        
        if (!matchesName && !matchesCompany && !matchesContact) {
          return false;
        }
      }

      if (filters.companies.length > 0) {
        const companyId = deal.companies?.id;
        if (!companyId || !filters.companies.includes(companyId)) return false;
      }

      return true;
    });
  }, [deals, filters.stages, filters.priorities, filters.amountRange, filters.dateRange, debouncedSearch, filters.companies]);

  // Remove totalDealsCount - not needed anymore, we use deals.length

  const pipelineMetrics = useMemo(() => {
    console.log('=== PIPELINE METRICS CALCULATION ===');
    console.log('Selected Pipeline:', selectedPipeline);
    console.log('Total deals loaded in state:', deals.length);
    console.log('EXACT TOTAL from database:', totalPipelineDealsCount);
    console.log('Filtered deals:', filteredDeals.length);
    console.log('Loading state:', loading);
    
    // Log sample deals to verify pipeline filtering
    if (deals.length > 0) {
      console.log('Sample deals (first 5):', deals.slice(0, 5).map(d => ({
        id: d.id,
        name: d.name,
        pipeline_id: d.pipeline_id
      })));
        
      // Check if all deals have the same pipeline_id
      const uniquePipelines = [...new Set(deals.map(d => d.pipeline_id))];
      console.log('Unique pipeline IDs in deals:', uniquePipelines);
      console.log('All deals from same pipeline?', uniquePipelines.length === 1);
      
      // Count deals by pipeline to debug
      const pipelineCounts = deals.reduce((acc, deal) => {
        acc[deal.pipeline_id] = (acc[deal.pipeline_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log('Deals count by pipeline_id:', pipelineCounts);
    } else {
      console.log('⚠️ No deals in state - metrics will show 0');
      }
    
    // Total Deals = EXACT count from database (not deals.length which might be capped)
    // Other metrics = based on filteredDeals (with all filters applied)
    const totalValue = filteredDeals.reduce((sum, deal) => sum + (deal.amount || 0), 0);
    const closedWonDeals = filteredDeals.filter(d => d.stage === "closed won");
    const closedWonValue = closedWonDeals.reduce((sum, deal) => sum + (deal.amount || 0), 0);
    const conversionRate = filteredDeals.length > 0 ? (closedWonDeals.length / filteredDeals.length) * 100 : 0;

    const metrics = {
      totalDeals: totalPipelineDealsCount, // ✅ Use EXACT count from database, not deals.length
      totalValue,
      closedWonCount: closedWonDeals.length,
      closedWonValue,
      conversionRate,
    };
    
    console.log('Calculated metrics:', metrics);
    console.log('🎯 UI will display Total Deals:', metrics.totalDeals, '(from database count)');
    console.log('=== END METRICS ===');
    
    return metrics;
  }, [deals, filteredDeals, selectedPipeline, filters, loading, totalPipelineDealsCount]);

  const handleStageChange = useCallback(async (dealId: string, newStage: string) => {
    try {
      const { error } = await supabase
        .from("deals")
        .update({ stage: newStage as any })
        .eq("id", dealId);

      if (error) throw error;

      setDeals((prevDeals) =>
        prevDeals.map((deal) =>
          deal.id === dealId ? { ...deal, stage: newStage } : deal
        )
      );
    } catch (error) {
      console.error("Error updating deal stage:", error);
    }
  }, []);

  // Removed: Transfer Pipeline functionality
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleTransferPipeline = useCallback(async (dealId: string, newPipelineId: string, selectedStage: string) => {
    try {
      console.log('=== TRANSFER PIPELINE ===');
      const targetPipeline = pipelines.find(p => p.id === newPipelineId);
      const deal = deals.find(d => d.id === dealId);
      console.log('Deal to transfer:', deal?.name);
      console.log('Current pipeline:', selectedPipeline);
      console.log('Target pipeline:', targetPipeline?.name, newPipelineId);
      console.log('Selected stage:', selectedStage);
      
      // Map of common pipeline stage names to valid database enum values
      const stageMapping: Record<string, string> = {
        'new opt-in': 'not contacted',
        'new_opt-in': 'not contacted',
        'new opt in': 'not contacted',
        'uncontacted': 'uncontacted',
        'not contacted': 'not contacted',
        'no answer / gatekeeper': 'no answer / gatekeeper',
        'no answer': 'no answer / gatekeeper',
        'gatekeeper': 'no answer / gatekeeper',
        'dm connected': 'dm connected',
        'decision maker': 'decision maker',
        'nurturing': 'nurturing',
        'interested': 'interested',
        'strategy call booked': 'strategy call booked',
        'strategy call attended': 'strategy call attended',
        'proposal / scope': 'proposal / scope',
        'proposal': 'proposal / scope',
        'closed won': 'closed won',
        'closed lost': 'closed lost',
        'not interested': 'not interested',
        'not qualified': 'not qualified',
        'bizops audit agreement sent': 'bizops audit agreement sent',
        'bizops audit paid / booked': 'bizops audit paid / booked',
        'bizops audit attended': 'bizops audit attended',
        'ms agreement sent': 'ms agreement sent',
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
        'candidate interview booked': 'candidate interview booked',
        'candidate interview attended': 'candidate interview attended',
        'deal won': 'deal won',
      };
      
      // Convert selected stage to lowercase for mapping lookup
      const selectedStageLower = selectedStage.toLowerCase().trim();
      
      console.log('Selected stage (lowercase):', selectedStageLower);
      
      // Try to map it, otherwise use safe default
      const safeStage = stageMapping[selectedStageLower] || 'not contacted';
      
      console.log('Mapped to database enum:', safeStage);
      console.log('Updating deal with:', { pipeline_id: newPipelineId, stage: safeStage });
      
      const { data: updatedDeal, error } = await supabase
        .from("deals")
        .update({ 
          pipeline_id: newPipelineId,
          stage: safeStage
        })
        .eq("id", dealId)
        .select()
        .single();

      if (error) {
        console.error('Transfer error:', error);
        throw error;
      }

      console.log('✅ Database update successful!');
      console.log('Updated deal:', updatedDeal);
      
      // Ask user if they want to switch to the target pipeline to see the deal
      const pipelineName = targetPipeline?.name || 'new pipeline';
      const switchPipeline = window.confirm(
        `✅ Successfully moved "${deal?.name}" to:\n\nPipeline: ${pipelineName}\nStage: ${selectedStage}\n\nDo you want to switch to the "${pipelineName}" pipeline to see the deal?`
      );
      
      if (switchPipeline) {
        console.log('Switching to target pipeline:', newPipelineId);
        setSelectedPipeline(newPipelineId);
        // fetchDeals will be called automatically by the useEffect when selectedPipeline changes
      } else {
        console.log('Staying on current pipeline, refreshing view');
        // Refresh current pipeline (deal will disappear since it's been moved)
        await fetchDeals();
      }
      
    } catch (error) {
      console.error("Error transferring deal:", error);
      alert("❌ Failed to transfer deal. Please try again.");
    }
  }, []);

  const handleFiltersChange = useCallback((newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentPipeline = pipelines.find(p => p.id === selectedPipeline);
  
  // Debug: Log pipeline data
  console.log('Current Pipeline:', currentPipeline);
  console.log('Raw stages:', currentPipeline?.stages);
  console.log('Stage order:', currentPipeline?.stage_order);
  
  // BULLETPROOF: Extract stages from pipeline, filtering out any UUIDs
  const extractStagesFromPipeline = (pipeline: any): string[] => {
    if (!pipeline) return [];
    
    // UUID regex pattern
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    let stageArray: any[] = [];
    
    // Try to get stages from stage_order first (more reliable)
    if (pipeline.stage_order && Array.isArray(pipeline.stage_order)) {
      stageArray = pipeline.stage_order;
    } 
    // Fallback to stages array
    else if (pipeline.stages && Array.isArray(pipeline.stages)) {
      stageArray = pipeline.stages;
    }
    
    // Extract and validate stage names
    const validStages = stageArray
      .map(stage => {
        // If stage is an object with a name property
        if (typeof stage === 'object' && stage !== null && 'name' in stage) {
          return String(stage.name);
        }
        // If stage is a string
        if (typeof stage === 'string') {
          return stage;
        }
        return null;
      })
      .filter(stage => {
        // Filter out nulls, empty strings, and UUIDs
        if (!stage || stage.trim() === '') return false;
        if (uuidPattern.test(stage)) {
          console.warn('⚠️ Filtered out UUID from stages:', stage);
          return false;
        }
        return true;
      })
      .map(stage => stage!.replace(/\s*\/\s*/g, ' / ').toLowerCase().trim());
    
    console.log('✅ Extracted valid stages:', validStages);
    return validStages;
  };
  
  const pipelineStages = extractStagesFromPipeline(currentPipeline);
  
  // If no stages found, use stages from actual deals as fallback
  if (pipelineStages.length === 0 && filteredDeals.length > 0) {
    const dealsInPipeline = filteredDeals.filter(d => d.pipeline_id === selectedPipeline);
    const uniqueStages = [...new Set(dealsInPipeline.map(d => d.stage))];
    console.warn('⚠️ No stages in pipeline config, using stages from deals:', uniqueStages);
    pipelineStages.push(...uniqueStages);
  }
  
  console.log('Final pipelineStages:', pipelineStages);

  return (
    <div className="flex flex-col min-h-screen p-4 md:p-6 space-y-3 md:space-y-6 bg-gradient-subtle">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent truncate">
            Sales Pipeline
          </h1>
          <p className="text-muted-foreground mt-0.5 md:mt-1 text-xs sm:text-sm md:text-base">
            Manage and track your deals
          </p>
        </div>
        <div className="flex flex-row items-center gap-2 flex-shrink-0">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "pipeline" | "list")} className="w-auto">
            <TabsList className="h-9">
              <TabsTrigger value="pipeline" className="text-xs px-2 sm:px-3">
                <span className="hidden sm:inline">Pipeline</span>
                <span className="sm:hidden">📊</span>
              </TabsTrigger>
              <TabsTrigger value="list" className="text-xs px-2 sm:px-3">
                <span className="hidden sm:inline">List</span>
                <span className="sm:hidden">📋</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => {
            setShowNewDealForm(true);
            document.getElementById('new-deal-trigger')?.click();
          }} className="shadow-glow text-xs sm:text-sm h-9 px-3" size="sm">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">New Deal</span>
          </Button>
        </div>
      </div>

      {/* Pipeline Selector and Search Bar */}
      <div className="flex flex-col gap-2 md:gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs sm:text-sm font-medium whitespace-nowrap">Pipeline:</label>
          <Select value={selectedPipeline || undefined} onValueChange={setSelectedPipeline}>
            <SelectTrigger className="flex-1 h-9 text-xs sm:text-sm">
              <SelectValue placeholder="Select pipeline" />
            </SelectTrigger>
            <SelectContent>
              {pipelines.map((pipeline) => (
                <SelectItem key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <PipelineManager onPipelineCreated={fetchPipelines} />
        </div>
        {selectedPipeline && currentPipeline && (
          <div className="text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-md">
            📊 Viewing <span className="font-semibold">{currentPipeline.name}</span> pipeline • 
            Showing {filteredDeals.length} of {totalPipelineDealsCount} deals in this pipeline
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search deals..."
            className="pl-10 h-9 text-xs sm:text-sm"
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          />
        </div>
      </div>

      {/* Advanced Filters - Always hidden for now */}
      <AdvancedFilters 
        isOpen={advancedOpen}
        onToggle={() => setAdvancedOpen(!advancedOpen)}
        dealStages={pipelineStages}
        companies={companies}
        assignees={assignees}
        onFiltersChange={(f) => {
          setFilters((prev) => ({
            ...prev,
            stages: f.stages,
            priorities: f.priorities as any,
            amountRange: f.amountRange,
            dateRange: f.dateRange,
            // Keep the existing search value from quick search
            search: prev.search,
            companies: f.companies,
          }));
        }}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <Card className="shadow-soft hover:shadow-medium transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-1 md:pb-2 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Total</CardTitle>
            <Target className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold">{pipelineMetrics.totalDeals}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Deals</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft hover:shadow-medium transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-1 md:pb-2 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Value</CardTitle>
            <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold">
              ${(pipelineMetrics.totalValue / 1000).toFixed(0)}k
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Pipeline</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft hover:shadow-medium transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-1 md:pb-2 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Won</CardTitle>
            <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold">
              {pipelineMetrics.closedWonCount}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
              ${(pipelineMetrics.closedWonValue / 1000).toFixed(0)}k
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-soft hover:shadow-medium transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-1 md:pb-2 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Rate</CardTitle>
            <Activity className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold">
              {pipelineMetrics.conversionRate.toFixed(1)}%
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Convert</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg">
        {pipelines.length === 0 && !loading ? (
          <Card className="shadow-soft">
            <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="rounded-full bg-primary/10 p-4 mb-4">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Pipelines Found</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                Get started by creating your first sales pipeline. Pipelines help you organize and track your deals through different stages.
              </p>
              <PipelineManager onPipelineCreated={fetchPipelines} />
            </CardContent>
          </Card>
        ) : viewMode === "pipeline" ? (
          <div className="w-full">
            <DragDropPipeline 
              deals={filteredDeals} 
              onDealUpdate={fetchDeals}
              stages={pipelineStages}
              stageColors={currentPipeline?.stage_order?.reduce((acc, stage) => {
                // Normalize stage names to match database enum values
                const normalized = stage.name.replace(/\s*\/\s*/g, ' / ').toLowerCase().trim();
                acc[normalized] = stage.color;
                return acc;
              }, {} as Record<string, string>)}
              pipelineId={selectedPipeline || undefined}
            />
          </div>
        ) : (
          <DealListView deals={filteredDeals} onStageChange={handleStageChange} />
        )}
      </div>

      <DealForm onSuccess={fetchDeals}>
        <Button style={{ display: 'none' }} id="new-deal-trigger" />
      </DealForm>
    </div>
  );
}
