// Temporary diagnostic page to check Discovery stage data
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface Deal {
  id: string;
  name: string;
  stage: string;
  amount?: number;
  pipeline_id?: string;
  created_at: string;
  companies?: { name: string };
}

interface Pipeline {
  id: string;
  name: string;
  stages: string[];
  stage_order: any[];
}

export default function CheckDiscovery() {
  const [loading, setLoading] = useState(true);
  const [discoveryDeals, setDiscoveryDeals] = useState<Deal[]>([]);
  const [dmConnectedDeals, setDmConnectedDeals] = useState<Deal[]>([]);
  const [discoveryCount, setDiscoveryCount] = useState(0);
  const [dmConnectedCount, setDmConnectedCount] = useState(0);
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [enumStatus, setEnumStatus] = useState<string>("");

  useEffect(() => {
    checkData();
  }, []);

  const checkData = async () => {
    try {
      setLoading(true);

      // 1. Check Discovery deals
      const { data: discoveryData, error: discoveryError, count: discCount } = await supabase
        .from("deals")
        .select("id, name, stage, amount, pipeline_id, created_at, companies(name)", { count: "exact" })
        .eq("stage", "discovery")
        .order("created_at", { ascending: false })
        .limit(50);

      if (discoveryError) {
        if (discoveryError.message.includes("invalid input value")) {
          setEnumStatus("❌ 'discovery' is NOT a valid enum value");
        } else {
          console.error("Discovery error:", discoveryError);
        }
      } else {
        setDiscoveryDeals(discoveryData || []);
        setDiscoveryCount(discCount || 0);
        setEnumStatus("✅ 'discovery' is a valid enum value");
      }

      // 2. Check DM Connected deals
      const { data: dmData, error: dmError, count: dmCount } = await supabase
        .from("deals")
        .select("id, name, stage, amount, pipeline_id, created_at, companies(name)", { count: "exact" })
        .eq("stage", "dm connected")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!dmError) {
        setDmConnectedDeals(dmData || []);
        setDmConnectedCount(dmCount || 0);
      }

      // 3. Check pipeline configuration
      const { data: pipelineData, error: pipelineError } = await supabase
        .from("pipelines")
        .select("id, name, stages, stage_order")
        .eq("name", "Outbound Funnel")
        .single();

      if (!pipelineError && pipelineData) {
        setPipeline(pipelineData);
      }

    } catch (error) {
      console.error("Error checking data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Discovery Stage Data Check</h1>
        <p className="text-muted-foreground mt-2">Diagnostic tool to verify Discovery vs DM Connected stages</p>
      </div>

      {/* Enum Status */}
      <Card>
        <CardHeader>
          <CardTitle>🔬 Database Enum Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-lg font-semibold">{enumStatus}</div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>📊 Discovery Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-600">{discoveryCount}</div>
            <p className="text-muted-foreground">Total deals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📊 DM Connected Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-orange-600">{dmConnectedCount}</div>
            <p className="text-muted-foreground">Total deals</p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Configuration */}
      {pipeline && (
        <Card>
          <CardHeader>
            <CardTitle>🎯 Outbound Funnel Pipeline Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Pipeline ID</div>
                <div className="font-mono text-sm">{pipeline.id}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-2">Stages ({pipeline.stages?.length || 0})</div>
                <div className="flex flex-wrap gap-2">
                  {pipeline.stages?.map((stage, index) => {
                    const isDiscovery = stage === "discovery";
                    const isDmConnected = stage === "dm connected";
                    return (
                      <Badge
                        key={index}
                        variant={isDiscovery ? "default" : isDmConnected ? "secondary" : "outline"}
                        className="text-sm"
                      >
                        {index + 1}. {stage}
                        {isDiscovery && " 🆕"}
                        {isDmConnected && " 📞"}
                      </Badge>
                    );
                  })}
                </div>
              </div>
              <div className="pt-4 border-t">
                <div className="flex gap-4">
                  <div>
                    <span className="font-semibold">Has "discovery":</span>{" "}
                    {pipeline.stages?.includes("discovery") ? "✅ YES" : "❌ NO"}
                  </div>
                  <div>
                    <span className="font-semibold">Has "dm connected":</span>{" "}
                    {pipeline.stages?.includes("dm connected") ? "✅ YES" : "❌ NO"}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Discovery Deals List */}
      <Card>
        <CardHeader>
          <CardTitle>🔍 Discovery Stage Deals (First 50)</CardTitle>
        </CardHeader>
        <CardContent>
          {discoveryDeals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              ⚠️ No deals found with stage = "discovery"
              <div className="mt-2 text-sm">
                This means either:
                <ul className="list-disc list-inside mt-2">
                  <li>No deals have been moved to "discovery" stage yet</li>
                  <li>All deals are still in "dm connected" stage</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {discoveryDeals.map((deal, index) => (
                <div key={deal.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-semibold">
                      {index + 1}. {deal.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Company: {deal.companies?.name || "N/A"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600">
                      ${deal.amount?.toLocaleString() || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(deal.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* DM Connected Deals List */}
      <Card>
        <CardHeader>
          <CardTitle>📞 DM Connected Stage Deals (First 50)</CardTitle>
        </CardHeader>
        <CardContent>
          {dmConnectedDeals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              ℹ️ No deals found with stage = "dm connected"
            </div>
          ) : (
            <div className="space-y-2">
              {dmConnectedDeals.map((deal, index) => (
                <div key={deal.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-semibold">
                      {index + 1}. {deal.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Company: {deal.companies?.name || "N/A"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-orange-600">
                      ${deal.amount?.toLocaleString() || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(deal.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendation */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">💡 Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-900">
          <div className="space-y-2">
            {discoveryCount === 0 && dmConnectedCount > 0 && (
              <>
                <p className="font-semibold">
                  Your deals are currently in "dm connected" stage ({dmConnectedCount} deals).
                </p>
                <p>After verifying the enum is added, you may want to:</p>
                <ol className="list-decimal list-inside space-y-1 ml-4">
                  <li>Update your Outbound Funnel pipeline to include "discovery" as a separate stage</li>
                  <li>Decide which deals should be in "discovery" vs "dm connected"</li>
                  <li>Move appropriate deals to the new "discovery" stage</li>
                </ol>
              </>
            )}
            {discoveryCount > 0 && (
              <p className="font-semibold text-green-700">
                ✅ Great! You have {discoveryCount} deals in "discovery" and {dmConnectedCount} in "dm connected". 
                The stages are now properly separated!
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


