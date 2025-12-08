import { useState, useEffect } from "react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { RecentConversations } from "@/components/dashboard/RecentConversations";
import { RecentLeads } from "@/components/dashboard/RecentLeads";
import { DialpadIframeCTI } from "@/components/calls/DialpadIframeCTI";
import { PipelineOverview } from "@/components/dashboard/PipelineOverview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Handshake, 
  Phone, 
  TrendingUp, 
  DollarSign 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    totalDeals: 0,
    pipelineValue: 0,
    callsMade: 0,
    connectRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [showDialpad, setShowDialpad] = useState(false);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const { count: dealsCount } = await supabase
        .from('deals')
        .select('*', { count: 'exact', head: true });

      const { data: dealsData } = await supabase
        .from('deals')
        .select('amount');
      
      const pipelineValue = dealsData?.reduce((sum, deal) => sum + (deal.amount || 0), 0) || 0;

      const { count: callsCount } = await supabase
        .from('calls')
        .select('*', { count: 'exact', head: true });

      const { data: callsData } = await supabase
        .from('calls')
        .select('call_outcome');
      
      const connectedCalls = callsData?.filter(call => 
        call.call_outcome !== 'no answer' && 
        call.call_outcome !== 'voicemail'
      ).length || 0;
      
      const connectRate = callsCount && callsCount > 0 
        ? Math.round((connectedCalls / callsCount) * 100) 
        : 0;

      setMetrics({
        totalDeals: dealsCount || 0,
        pipelineValue,
        callsMade: callsCount || 0,
        connectRate
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-1">
      {/* Header Section */}
      <div className="mb-8">
        <h1 
          className="text-3xl font-bold tracking-wide text-[hsl(40,20%,90%)]"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          Dashboard
        </h1>
        <p className="text-[hsl(40,10%,55%)] mt-1">
          Welcome back! Here's what's happening with your sales pipeline.
        </p>
        {/* Gold accent line */}
        <div className="mt-4 w-24 h-0.5 bg-gradient-to-r from-[hsl(40,50%,55%)] to-transparent" />
      </div>
      
      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Deals"
          value={loading ? "..." : metrics.totalDeals.toString()}
          icon={Handshake}
        />
        <MetricCard
          title="Pipeline Value"
          value={loading ? "..." : `$${(metrics.pipelineValue / 1000).toFixed(0)}K`}
          icon={DollarSign}
        />
        <MetricCard
          title="Calls Made"
          value={loading ? "..." : metrics.callsMade.toString()}
          icon={Phone}
        />
        <MetricCard
          title="Connect Rate"
          value={loading ? "..." : `${metrics.connectRate}%`}
          icon={TrendingUp}
        />
      </div>
      
      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 space-y-6">
          {/* Dialpad CTI Card */}
          <Card 
            className="bg-[hsl(0,0%,10%)] border-[hsl(0,0%,18%)] cursor-pointer hover:border-[hsl(40,40%,30%)] transition-all duration-300 hover:shadow-lg hover:shadow-[hsl(40,50%,20%)]/10" 
            onClick={() => setShowDialpad(!showDialpad)}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-[hsl(40,20%,90%)]">
                <div className="p-2 rounded-lg bg-[hsl(40,40%,15%)]">
                  <Phone className="h-5 w-5 text-[hsl(40,50%,55%)]" />
                </div>
                <span style={{ fontFamily: 'Cinzel, serif' }}>Dialpad CTI</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[hsl(40,10%,55%)]">
                {showDialpad ? 'Click to hide dialer' : 'Click to show dialer and make calls'}
              </p>
            </CardContent>
          </Card>
          <PipelineOverview />
          <RecentConversations />
        </div>
        <div className="col-span-3 space-y-6">
          <RecentLeads />
          <RecentActivity />
        </div>
      </div>

      {/* Dialpad CTI Overlay */}
      {showDialpad && (
        <DialpadIframeCTI onClose={() => setShowDialpad(false)} />
      )}
    </div>
  );
}
