// Quick diagnostic component to check Discovery vs DM Connected data
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export default function CheckDiscoveryData() {
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    checkData();
  }, []);

  const checkData = async () => {
    console.log("🔍 Checking Discovery and DM Connected data...");

    try {
      // Check Discovery deals
      const { data: discoveryDeals, error: discoveryError, count: discoveryCount } = await supabase
        .from("deals")
        .select("id, name, stage, pipeline_id, amount, companies(name)", { count: "exact" })
        .eq("stage", "discovery")
        .limit(10);

      // Check DM Connected deals
      const { data: dmDeals, error: dmError, count: dmCount } = await supabase
        .from("deals")
        .select("id, name, stage, pipeline_id, amount, companies(name)", { count: "exact" })
        .eq("stage", "dm connected")
        .limit(10);

      // Check Outbound Funnel pipeline
      const { data: pipeline } = await supabase
        .from("pipelines")
        .select("id, name, stages")
        .eq("name", "Outbound Funnel")
        .single();

      // Check all stages in current pipeline deals
      const { data: allStages } = await supabase
        .from("deals")
        .select("stage")
        .eq("pipeline_id", pipeline?.id || "00000000-0000-0000-0000-000000000001");

      const stageCounts = allStages?.reduce((acc, deal) => {
        acc[deal.stage] = (acc[deal.stage] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const result = {
        discoveryCount: discoveryCount || 0,
        dmCount: dmCount || 0,
        discoveryDeals: discoveryDeals || [],
        dmDeals: dmDeals || [],
        pipeline: pipeline,
        stageCounts: stageCounts,
        discoveryError: discoveryError?.message,
        dmError: dmError?.message,
      };

      console.log("📊 Results:", result);
      setResults(result);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  if (!results) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Discovery Data Check</h1>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-6 border rounded-lg bg-blue-50">
          <h2 className="text-xl font-bold mb-2">Discovery Stage</h2>
          <div className="text-4xl font-bold text-blue-600">{results.discoveryCount}</div>
          <div className="text-sm text-muted-foreground">Total deals</div>
          {results.discoveryError && (
            <div className="mt-2 text-red-600 text-sm">Error: {results.discoveryError}</div>
          )}
        </div>

        <div className="p-6 border rounded-lg bg-orange-50">
          <h2 className="text-xl font-bold mb-2">DM Connected Stage</h2>
          <div className="text-4xl font-bold text-orange-600">{results.dmCount}</div>
          <div className="text-sm text-muted-foreground">Total deals</div>
          {results.dmError && (
            <div className="mt-2 text-red-600 text-sm">Error: {results.dmError}</div>
          )}
        </div>
      </div>

      <div className="p-6 border rounded-lg">
        <h2 className="text-xl font-bold mb-4">Pipeline Configuration</h2>
        <div className="space-y-2">
          <div>
            <strong>Name:</strong> {results.pipeline?.name}
          </div>
          <div>
            <strong>ID:</strong> {results.pipeline?.id}
          </div>
          <div>
            <strong>Stages:</strong>
            <div className="mt-2 flex flex-wrap gap-2">
              {results.pipeline?.stages?.map((stage: string, i: number) => (
                <div
                  key={i}
                  className={`px-3 py-1 rounded-full text-sm ${
                    stage === "discovery"
                      ? "bg-blue-600 text-white"
                      : stage === "dm connected"
                      ? "bg-orange-600 text-white"
                      : "bg-gray-200"
                  }`}
                >
                  {stage}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 border rounded-lg">
        <h2 className="text-xl font-bold mb-4">All Stage Counts</h2>
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(results.stageCounts || {}).map(([stage, count]) => (
            <div key={stage} className="p-3 border rounded">
              <div className="font-semibold capitalize">{stage}</div>
              <div className="text-2xl font-bold text-primary">{count as number}</div>
            </div>
          ))}
        </div>
      </div>

      {results.discoveryDeals.length > 0 && (
        <div className="p-6 border rounded-lg">
          <h2 className="text-xl font-bold mb-4">Sample Discovery Deals</h2>
          <div className="space-y-2">
            {results.discoveryDeals.map((deal: any) => (
              <div key={deal.id} className="p-3 border rounded flex justify-between">
                <div>
                  <div className="font-semibold">{deal.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {deal.companies?.name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">${deal.amount?.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">{deal.stage}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {results.dmDeals.length > 0 && (
        <div className="p-6 border rounded-lg">
          <h2 className="text-xl font-bold mb-4">Sample DM Connected Deals</h2>
          <div className="space-y-2">
            {results.dmDeals.map((deal: any) => (
              <div key={deal.id} className="p-3 border rounded flex justify-between">
                <div>
                  <div className="font-semibold">{deal.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {deal.companies?.name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">${deal.amount?.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">{deal.stage}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-6 border rounded-lg bg-yellow-50">
        <h2 className="text-xl font-bold mb-4">💡 Diagnosis</h2>
        <div className="space-y-2">
          {results.discoveryCount === 0 && results.dmCount > 0 && (
            <>
              <p className="font-semibold text-yellow-900">
                ⚠️ You have {results.dmCount} deals in "dm connected" but 0 in "discovery"
              </p>
              <p className="text-yellow-900">
                This means all your deals are currently in the "dm connected" stage.
                {!results.pipeline?.stages?.includes("discovery") && (
                  <strong className="block mt-2">
                    ⚠️ Also, "discovery" is NOT in your pipeline stages array!
                  </strong>
                )}
              </p>
            </>
          )}
          {results.discoveryCount > 0 && (
            <p className="font-semibold text-green-900">
              ✅ You have deals in both stages - they're properly separated!
            </p>
          )}
        </div>
      </div>

      <Button onClick={checkData}>Refresh Data</Button>
    </div>
  );
}


