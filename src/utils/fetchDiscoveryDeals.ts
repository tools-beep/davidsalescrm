// Utility to fetch and analyze Discovery stage deals
import { supabase } from "@/integrations/supabase/client";

export async function fetchDiscoveryAnalysis() {
  try {
    console.log('🔍 Fetching Discovery Stage Analysis...');
    
    // 1. Count Discovery deals
    const { count: discoveryCount, error: discoveryError } = await supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .eq('stage', 'discovery');
    
    if (discoveryError) {
      console.error('❌ Error fetching discovery count:', discoveryError);
      return { error: discoveryError.message };
    }
    
    // 2. Count DM Connected deals
    const { count: dmCount, error: dmError } = await supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .eq('stage', 'dm connected');
    
    if (dmError) {
      console.error('❌ Error fetching dm connected count:', dmError);
    }
    
    // 3. Fetch sample Discovery deals
    const { data: discoveryDeals, error: discoveryDealsError } = await supabase
      .from('deals')
      .select('id, name, stage, amount, created_at, companies(name)')
      .eq('stage', 'discovery')
      .order('created_at', { ascending: false })
      .limit(10);
    
    // 4. Get all unique stage values
    const { data: allStages, error: stagesError } = await supabase
      .from('deals')
      .select('stage');
    
    const uniqueStages = allStages ? [...new Set(allStages.map(d => d.stage))].sort() : [];
    
    // 5. Check Outbound Funnel pipeline
    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .select('id, name, stages, stage_order')
      .eq('name', 'Outbound Funnel')
      .single();
    
    const result = {
      discoveryCount: discoveryCount || 0,
      dmConnectedCount: dmCount || 0,
      discoveryDeals: discoveryDeals || [],
      uniqueStages,
      pipeline,
      hasDiscoveryInPipeline: pipeline?.stages?.includes('discovery') || false,
      hasDmConnectedInPipeline: pipeline?.stages?.includes('dm connected') || false,
    };
    
    console.log('📊 Discovery Analysis Results:', result);
    
    return result;
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { error: 'Failed to fetch discovery data' };
  }
}

export async function debugDealsInPipeline(pipelineId: string) {
  console.log('🔍 Debugging deals for pipeline:', pipelineId);
  
  const { data: deals, error, count } = await supabase
    .from('deals')
    .select('id, name, stage, pipeline_id', { count: 'exact' })
    .eq('pipeline_id', pipelineId)
    .order('stage');
  
  if (error) {
    console.error('❌ Error:', error);
    return { error: error.message };
  }
  
  console.log(`📊 Found ${count} deals in pipeline ${pipelineId}`);
  
  // Group by stage
  const byStage: Record<string, number> = {};
  deals?.forEach(deal => {
    byStage[deal.stage] = (byStage[deal.stage] || 0) + 1;
  });
  
  console.log('📊 Deals by stage:', byStage);
  
  return { count, byStage, deals };
}

