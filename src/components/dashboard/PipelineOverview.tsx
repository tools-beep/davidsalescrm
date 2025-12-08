import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp } from "lucide-react";

interface StageData {
  name: string;
  count: number;
  value: number;
}

export function PipelineOverview() {
  const [pipelineStages, setPipelineStages] = useState<StageData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPipelineData();
  }, []);

  const fetchPipelineData = async () => {
    try {
      const { data: deals, error } = await supabase
        .from('deals')
        .select('stage, amount');

      if (error) throw error;

      const stageMap = new Map<string, { count: number; value: number }>();
      
      deals?.forEach(deal => {
        const stage = deal.stage || 'not contacted';
        const current = stageMap.get(stage) || { count: 0, value: 0 };
        stageMap.set(stage, {
          count: current.count + 1,
          value: current.value + (deal.amount || 0)
        });
      });

      const stages: StageData[] = Array.from(stageMap.entries()).map(([stage, data]) => ({
        name: stage.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        count: data.count,
        value: data.value
      }));

      const stageOrder = [
        'not contacted', 'no answer / gatekeeper', 'decision maker', 
        'nurturing', 'interested', 'strategy call booked', 
        'strategy call attended', 'proposal / scope', 'closed won', 'closed lost'
      ];
      
      stages.sort((a, b) => {
        const indexA = stageOrder.indexOf(a.name.toLowerCase());
        const indexB = stageOrder.indexOf(b.name.toLowerCase());
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
      });

      setPipelineStages(stages);
    } catch (error) {
      console.error('Error fetching pipeline data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalValue = pipelineStages.reduce((sum, stage) => sum + stage.value, 0);
  
  return (
    <Card className="bg-[hsl(0,0%,10%)] border-[hsl(0,0%,18%)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-[hsl(40,20%,90%)]">
          <div className="p-2 rounded-lg bg-[hsl(40,40%,15%)]">
            <TrendingUp className="h-5 w-5 text-[hsl(40,50%,55%)]" />
          </div>
          <span style={{ fontFamily: 'Cinzel, serif' }}>Pipeline Overview</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-[hsl(40,10%,50%)]">Loading...</div>
        ) : pipelineStages.length === 0 ? (
          <div className="text-center py-8 text-[hsl(40,10%,50%)]">No pipeline data</div>
        ) : (
          <>
            <div className="space-y-4">
              {pipelineStages.map((stage) => (
                <div key={stage.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-[hsl(40,20%,85%)]">{stage.name}</span>
                    <span className="text-[hsl(40,10%,55%)]">
                      {stage.count} deals • ${stage.value.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[hsl(0,0%,15%)] overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-[hsl(40,55%,55%)] to-[hsl(40,50%,45%)] transition-all duration-500"
                      style={{ width: `${totalValue > 0 ? (stage.value / totalValue) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-[hsl(0,0%,20%)]">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-[hsl(40,10%,60%)]">Total Pipeline Value</span>
                <span className="font-bold text-[hsl(40,50%,65%)]" style={{ fontFamily: 'Cinzel, serif' }}>
                  ${totalValue.toLocaleString()}
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
