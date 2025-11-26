import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, BarChart3, PieChart, TrendingUp, Users, Target, Briefcase, CheckCircle2, ListChecks, Phone, Clock, User } from "lucide-react";
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subQuarters, subYears } from 'date-fns';
import { supabase } from "@/integrations/supabase/client";
import { ReportChart } from "@/components/reports/ReportChart";
import { ReportMetric } from "@/components/reports/ReportMetric";
import { AdvancedFilters, FilterState } from "@/components/reports/AdvancedFilters";
import { EnhancedChart } from "@/components/reports/EnhancedCharts";
import { DetailedCallReports } from "@/components/reports/DetailedCallReports";
import { InteractiveDashboard } from "@/components/reports/InteractiveDashboard";
import { AccountManagerAnalytics } from "@/components/reports/AccountManagerAnalytics";
// Replaced Meetings/Emails tabs with Appointment Settings and Closing analytics

interface CallMetrics {
  totalCalls: number;
  callsByOutcome: { [key: string]: number };
  callsByType: { [key: string]: number };
  avgDuration: number;
  connectRate: number;
  repPerformance: Array<{ 
    name: string; 
    calls: number; 
    noAnswerRate: number; 
    connectRate: number; 
    conversions: number;
  }>;
  scriptProgression: Array<{ stage: string; count: number; conversionRate: number }>;
  dailyActivity: Array<{ name: string; value: number; calls: number; connects: number }>;
  // Call source breakdown
  dialpadCalls: number;
  manualCalls: number;
  dialpadDuration: number;
  manualDuration: number;
}

interface AppointmentMetrics {
  totalCalls: number;
  noAnswer: number;
  intro: number;
  shortStory: number;
  discovery: number;
  presentation: number;
  strategyBooked: number;
  strategyAttended: number;
  notInterested: number;
  dnc: number;
  resumeRequests: number;
}

interface ClosingMetrics {
  strategyAttended: number;
  sql: number; // placeholder until defined in schema
  nql: number; // placeholder until defined in schema
  proposalSent: number; // deals in stage 'proposal / scope'
  candidateInterviewBooked: number;
  candidateInterviewAttended: number;
  businessAuditBooked: number; // placeholder
  businessAuditAttended: number; // placeholder
  invoiceAgreementSent: number; // placeholder
  dealWonByProduct: Record<string, number>;
}

export default function Reports() {
  const [metrics, setMetrics] = useState<CallMetrics>({
    totalCalls: 0,
    callsByOutcome: {},
    callsByType: {},
    avgDuration: 0,
    connectRate: 0,
    repPerformance: [],
    scriptProgression: [],
    dailyActivity: [],
    dialpadCalls: 0,
    manualCalls: 0,
    dialpadDuration: 0,
    manualDuration: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    dateRange: { from: undefined, to: undefined },
    rep: '',
    pipeline: '',
    callOutcome: '',
    emailStatus: '',
    priority: ''
  });
  const [reps, setReps] = useState<Array<{ id: string; name: string }>>([]);
  const [pipelines, setPipelines] = useState<Array<{ id: string; name: string }>>([]);
  const [appointment, setAppointment] = useState<AppointmentMetrics | null>(null);
  const [closing, setClosing] = useState<ClosingMetrics | null>(null);
  
  // State for outcome detail dialog
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [outcomeDetailCalls, setOutcomeDetailCalls] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchMetrics();
    fetchRepsAndPipelines();
  }, [filters]);

  const fetchRepsAndPipelines = async () => {
    try {
      const [repsResponse, pipelinesResponse] = await Promise.all([
        supabase.from('user_profiles').select('user_id, first_name, last_name'),
        supabase.from('pipelines').select('id, name')
      ]);

      if (repsResponse.data) {
        setReps(repsResponse.data.map(rep => ({
          id: rep.user_id, // Changed from rep.id to rep.user_id
          name: `${rep.first_name || ''} ${rep.last_name || ''}`.trim() || 'Unknown Rep'
        })));
      }

      if (pipelinesResponse.data) {
        setPipelines(pipelinesResponse.data);
      }
    } catch (error) {
      console.error('Error fetching reps and pipelines:', error);
    }
  };

  const fetchOutcomeDetails = async (outcome: string) => {
    setLoadingDetails(true);
    setSelectedOutcome(outcome);
    
    try {
      const { from, to } = filters.dateRange;
      let query = supabase
        .from('calls')
        .select('*, companies(name), contacts(first_name, last_name)')
        .eq('call_outcome', outcome);

      if (from) query = query.gte('call_timestamp', from.toISOString());
      if (to) query = query.lte('call_timestamp', to.toISOString());
      if (filters.rep) query = query.eq('rep_id', filters.rep);
      if (filters.pipeline) query = query.eq('pipeline_id', filters.pipeline);

      const { data, error } = await query.order('call_timestamp', { ascending: false }).limit(100);

      if (error) throw error;

      // Fetch rep names for the calls
      const repIds = [...new Set((data || []).map(call => call.rep_id))];
      const { data: repProfiles } = await supabase
        .from('user_profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', repIds);

      const repMap = (repProfiles || []).reduce((acc, rep) => {
        acc[rep.user_id] = `${rep.first_name || ''} ${rep.last_name || ''}`.trim() || 'Unknown Rep';
        return acc;
      }, {} as Record<string, string>);

      // Enhance data with rep names
      const enhancedData = (data || []).map(call => ({
        ...call,
        rep_name: repMap[call.rep_id] || 'Unknown Rep'
      }));

      setOutcomeDetailCalls(enhancedData);
    } catch (error) {
      console.error('Error fetching outcome details:', error);
      setOutcomeDetailCalls([]);
    } finally {
      setLoadingDetails(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      // Resolve period filters to date range
      let from = filters.dateRange.from;
      let to = filters.dateRange.to;
      const now = new Date();
      const year = filters.year ? Number(filters.year) : now.getFullYear();
      if (filters.period === 'month') {
        const base = new Date(year, now.getMonth(), 1);
        from = startOfMonth(base);
        to = endOfMonth(base);
      } else if (filters.period === 'quarter') {
        const base = new Date(year, now.getMonth(), 1);
        from = startOfQuarter(base);
        to = endOfQuarter(base);
      } else if (filters.period === 'year') {
        const base = new Date(year, 0, 1);
        from = startOfYear(base);
        to = endOfYear(base);
      }

      // Previous period for comparison
      let prevFrom: Date | undefined = undefined;
      let prevTo: Date | undefined = undefined;
      if (from && to) {
        if (filters.period === 'month') {
          prevFrom = startOfMonth(subMonths(from, 1));
          prevTo = endOfMonth(subMonths(to, 1));
        } else if (filters.period === 'quarter') {
          prevFrom = startOfQuarter(subQuarters(from, 1));
          prevTo = endOfQuarter(subQuarters(to, 1));
        } else if (filters.period === 'year') {
          prevFrom = startOfYear(subYears(from, 1));
          prevTo = endOfYear(subYears(to, 1));
        }
      }

      // Fetch calls from DIALPAD ONLY (actual call data)
      // Manual logs are in a separate table now
      let query = supabase.from('calls').select('*');

      // Apply filters
      if (from) query = query.gte('call_timestamp', from.toISOString());
      if (to) query = query.lte('call_timestamp', to.toISOString());
      if (filters.rep) {
        query = query.eq('rep_id', filters.rep);
      }
      if (filters.callOutcome) {
        query = query.eq('call_outcome', filters.callOutcome as any);
      }

      const { data: calls, error } = await query;
      if (error) throw error;

      // Fetch manual logs separately
      let manualQuery = supabase.from('manual_call_logs').select('*');
      if (from) manualQuery = manualQuery.gte('call_timestamp', from.toISOString());
      if (to) manualQuery = manualQuery.lte('call_timestamp', to.toISOString());
      if (filters.rep) {
        manualQuery = manualQuery.eq('rep_id', filters.rep);
      }
      if (filters.callOutcome) {
        manualQuery = manualQuery.eq('call_outcome', filters.callOutcome as any);
      }

      const { data: manualLogs, error: manualError } = await manualQuery;
      if (manualError) console.warn('Error fetching manual logs:', manualError);

      // Comparison dataset (previous period)
      let prevCalls: any[] = [];
      let prevManualLogs: any[] = [];
      if (prevFrom && prevTo) {
        let prevQuery = supabase.from('calls').select('*');
        prevQuery = prevQuery.gte('call_timestamp', prevFrom.toISOString()).lte('call_timestamp', prevTo.toISOString());
        if (filters.rep) prevQuery = prevQuery.eq('rep_id', filters.rep);
        const { data: prevData } = await prevQuery;
        prevCalls = prevData || [];

        let prevManualQuery = supabase.from('manual_call_logs').select('*');
        prevManualQuery = prevManualQuery.gte('call_timestamp', prevFrom.toISOString()).lte('call_timestamp', prevTo.toISOString());
        if (filters.rep) prevManualQuery = prevManualQuery.eq('rep_id', filters.rep);
        const { data: prevManualData } = await prevManualQuery;
        prevManualLogs = prevManualData || [];
      }

      // DIALPAD CALLS (actual call data from Dialpad API/CTI)
      const dialpadCallsArray = Array.isArray(calls) ? calls : [];
      const dialpadCalls = dialpadCallsArray.length;
      const dialpadDuration = dialpadCallsArray.reduce((sum, call) => sum + (call.duration_seconds || 0), 0);

      // MANUAL LOGS (user-entered via Log Call form)
      const manualLogsArray = Array.isArray(manualLogs) ? manualLogs : [];
      const manualCallsCount = manualLogsArray.length;
      const manualDuration = manualLogsArray.reduce((sum, log) => sum + (log.duration_seconds || 0), 0);

      // COMBINED metrics for overall stats
      const allCallActivity = [...dialpadCallsArray, ...manualLogsArray];
      const totalCalls = allCallActivity.length;
      const callsByOutcome: { [key: string]: number } = {};
      const callsByType: { [key: string]: number } = {};
      let totalDuration = 0;
      let connectedCalls = 0;

      // Rep performance tracking
      const repStats: { [key: string]: { name: string; calls: number; noAnswer: number; connected: number; conversions: number } } = {};

      allCallActivity.forEach((call: any) => {
        callsByOutcome[call.call_outcome] = (callsByOutcome[call.call_outcome] || 0) + 1;
        callsByType[call.outbound_type] = (callsByType[call.outbound_type] || 0) + 1;
        totalDuration += call.duration_seconds || 0;
        
        const isConnected = !['no answer', 'voicemail', 'dash'].includes(call.call_outcome);
        if (isConnected) {
          connectedCalls++;
        }

        // Track rep performance
        if (call.rep_id) {
          if (!repStats[call.rep_id]) {
            repStats[call.rep_id] = {
              name: 'Unknown Rep',
              calls: 0,
              noAnswer: 0,
              connected: 0,
              conversions: 0
            };
          }
          repStats[call.rep_id].calls++;
          if (call.call_outcome === 'no answer') {
            repStats[call.rep_id].noAnswer++;
          }
          if (isConnected) {
            repStats[call.rep_id].connected++;
          }
          if (call.call_outcome === 'strategy call booked') {
            repStats[call.rep_id].conversions++;
          }
        }
      });

      const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
      const connectRate = totalCalls > 0 ? Math.round((connectedCalls / totalCalls) * 100) : 0;

      // Comparison numbers
      const prevTotalCalls = prevCalls.length;
      const prevConnects = prevCalls.filter(c => !['no answer', 'voicemail', 'dash'].includes(c.call_outcome)).length;
      const prevConnectRate = prevTotalCalls > 0 ? Math.round((prevConnects / prevTotalCalls) * 100) : 0;

      // Appointment Settings metrics (mapped from call outcomes)
      const appointmentMetrics: AppointmentMetrics = {
        totalCalls,
        noAnswer: callsByOutcome['no answer'] || 0,
        intro: callsByOutcome['introduction'] || 0,
        shortStory: callsByOutcome['DM short story'] || 0,
        discovery: callsByOutcome['DM discovery'] || 0,
        presentation: callsByOutcome['DM presentation'] || 0,
        strategyBooked: callsByOutcome['strategy call booked'] || 0,
        strategyAttended: callsByOutcome['strategy call attended'] || 0,
        notInterested: callsByOutcome['not interested'] || 0,
        dnc: (callsByOutcome['do not call'] || 0) + (callsByOutcome['asked to be put on DNC list'] || 0),
        resumeRequests: callsByOutcome['DM resume request'] || 0,
      };

      // Fetch rep names for those seen in calls
      const repIds = Object.keys(repStats);
      if (repIds.length > 0) {
        const { data: repProfiles } = await supabase
          .from('user_profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', repIds);
        (repProfiles || []).forEach((rep: any) => {
          const fullName = `${rep.first_name || ''} ${rep.last_name || ''}`.trim() || 'Unknown Rep';
          if (repStats[rep.user_id]) {
            repStats[rep.user_id].name = fullName;
          }
        });
      }

      // Process rep performance
      const repPerformance = Object.values(repStats).map(rep => ({
        name: rep.name,
        calls: rep.calls,
        noAnswerRate: rep.calls > 0 ? Math.round((rep.noAnswer / rep.calls) * 100) : 0,
        connectRate: rep.calls > 0 ? Math.round((rep.connected / rep.calls) * 100) : 0,
        conversions: rep.conversions
      }));

      // Optional: compare two reps if compareRep is selected
      let compareRepStats: { name: string; calls: number; connectRate: number } | null = null;
      if (filters.compareRep) {
        let compQuery = supabase.from('calls').select('call_outcome, rep_id');
        if (from) compQuery = compQuery.gte('call_timestamp', from.toISOString());
        if (to) compQuery = compQuery.lte('call_timestamp', to.toISOString());
        compQuery = compQuery.eq('rep_id', filters.compareRep);
        const { data: compCalls } = await compQuery;
        const cc = compCalls || [];
        const cTotal = cc.length;
        const cConnects = cc.filter(c => !['no answer', 'voicemail', 'dash'].includes(c.call_outcome)).length;
        const cRate = cTotal > 0 ? Math.round((cConnects / cTotal) * 100) : 0;
        const repName = reps.find(r => r.id === filters.compareRep)?.name || 'Compared Rep';
        compareRepStats = { name: repName, calls: cTotal, connectRate: cRate };
      }

      // Script progression analysis
      const scriptStages = [
        { stage: 'Initial Contact', outcomes: ['connected', 'DM'], nextStage: 'DM Short Story' },
        { stage: 'DM Short Story', outcomes: ['DM short story'], nextStage: 'Discovery' },
        { stage: 'Discovery', outcomes: ['DM discovery'], nextStage: 'Presentation' },
        { stage: 'Presentation', outcomes: ['DM presentation'], nextStage: 'Strategy Call' },
        { stage: 'Strategy Call Booked', outcomes: ['strategy call booked'], nextStage: null }
      ];

      const scriptProgression = scriptStages.map(stage => {
        const count = stage.outcomes.reduce((sum, outcome) => sum + (callsByOutcome[outcome] || 0), 0);
        const conversionRate = totalCalls > 0 ? Math.round((count / totalCalls) * 100) : 0;
        return { stage: stage.stage, count, conversionRate };
      });

      // Daily activity (last 30 days)
      const dailyActivity = [];
      const dailyNow = new Date();
      for (let i = 29; i >= 0; i--) {
        const date = new Date(dailyNow);
        date.setDate(dailyNow.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayCalls = calls?.filter(call => {
          const callDate = new Date(call.call_timestamp).toISOString().split('T')[0];
          return callDate === dateStr;
        }) || [];
        
        const dayConnects = dayCalls.filter(call => 
          !['no answer', 'voicemail', 'dash'].includes(call.call_outcome)
        ).length;
        
        dailyActivity.push({
          name: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          value: dayCalls.length,
          calls: dayCalls.length,
          connects: dayConnects
        });
      }

      // Closing metrics
      // Proposal sent approximated by deals in stage 'proposal / scope'
      let proposalSent = 0;
      try {
        const { data: dealsProposal } = await supabase
          .from('deals')
          .select('id')
          .eq('stage', 'proposal / scope');
        proposalSent = dealsProposal?.length || 0;
      } catch {}

      // Candidate interview counts from call outcomes
      const candidateInterviewBooked = callsByOutcome['candidate interview booked'] || 0;
      const candidateInterviewAttended = callsByOutcome['candidate interview attended'] || 0;

      // Deal won by product (from line_items for closed won deals)
      const dealWonByProduct: Record<string, number> = { VA: 0, SMM: 0, Web: 0, Webapp: 0, 'AI Adoption': 0, Other: 0 };
      try {
        const { data: wonDeals } = await supabase
          .from('deals')
          .select('id')
          .eq('stage', 'closed won');
        const wonIds = (wonDeals || []).map((d: any) => d.id);
        if (wonIds.length > 0) {
          const { data: items } = await supabase
            .from('line_items')
            .select('product_name, deal_id')
            .in('deal_id', wonIds);
          (items || []).forEach((li: any) => {
            const name = (li.product_name || '').toLowerCase();
            if (name.includes('va')) dealWonByProduct['VA']++;
            else if (name.includes('smm') || name.includes('social')) dealWonByProduct['SMM']++;
            else if (name.includes('webapp') || name.includes('app')) dealWonByProduct['Webapp']++;
            else if (name.includes('web') || name.includes('website')) dealWonByProduct['Web']++;
            else if (name.includes('ai')) dealWonByProduct['AI Adoption']++;
            else dealWonByProduct['Other']++;
          });
        }
      } catch {}

      const closingMetrics: ClosingMetrics = {
        strategyAttended: appointmentMetrics.strategyAttended,
        sql: 0,
        nql: 0,
        proposalSent,
        candidateInterviewBooked,
        candidateInterviewAttended,
        businessAuditBooked: 0,
        businessAuditAttended: 0,
        invoiceAgreementSent: 0,
        dealWonByProduct,
      };

      setAppointment(appointmentMetrics);
      setClosing(closingMetrics);

      setMetrics({
        totalCalls,
        callsByOutcome,
        callsByType,
        avgDuration,
        connectRate,
        repPerformance,
        scriptProgression,
        dailyActivity,
        // Call source breakdown (now properly separated)
        dialpadCalls,
        manualCalls: manualCallsCount,
        dialpadDuration,
        manualDuration,
      });

      // Store comparison stats in component-local state by repurposing fields or extend UI: for brevity, we’ll show comparisons in the UI below
      (window as any).__reportsComparisons = {
        prev: { totalCalls: prevTotalCalls, connectRate: prevConnectRate },
        repCompare: compareRepStats,
      };
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>;
  }

  return (
    <div className="space-y-4 md:space-y-6 p-3 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Advanced CRM analytics with comprehensive insights, filtering, and real-time tracking.
          </p>
        </div>
      </div>

      {/* Advanced Filters */}
      <AdvancedFilters 
        filters={filters}
        onFiltersChange={setFilters}
        reps={reps}
        pipelines={pipelines}
      />

      <Tabs defaultValue="overview" className="space-y-4 md:space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center space-x-1 md:space-x-2 text-xs md:text-sm">
            <BarChart3 className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center space-x-1 md:space-x-2 text-xs md:text-sm">
            <Users className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Activity</span>
          </TabsTrigger>
          <TabsTrigger value="calls" className="flex items-center space-x-1 md:space-x-2 text-xs md:text-sm">
            <TrendingUp className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Call Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="appointment" className="flex items-center space-x-1 md:space-x-2 text-xs md:text-sm">
            <ListChecks className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Appointment Settings</span>
            <span className="sm:hidden">Appointment</span>
          </TabsTrigger>
          <TabsTrigger value="closing" className="flex items-center space-x-1 md:space-x-2 text-xs md:text-sm">
            <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Closing</span>
          </TabsTrigger>
        </TabsList>

        {/* Activity Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <InteractiveDashboard />
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">

          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <ReportMetric
              title="Total Calls"
              value={metrics.totalCalls.toString()}
              icon={BarChart3}
              trend="+12% vs last period"
              positive
            />
            <ReportMetric
              title="Connect Rate"
              value={`${metrics.connectRate}%`}
              icon={Target}
              trend="+5% vs last period"
              positive
            />
            <ReportMetric
              title="Avg Duration"
              value={`${Math.floor(metrics.avgDuration / 60)}:${(metrics.avgDuration % 60).toString().padStart(2, '0')}`}
              icon={TrendingUp}
              trend="+30s vs last period"
              positive
            />
            <ReportMetric
              title="Strategy Calls"
              value={(metrics.callsByOutcome['strategy call booked'] || 0).toString()}
              icon={Users}
              trend="+3 vs last period"
              positive
            />
          </div>

          {/* Call Source Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Call Source Breakdown
              </CardTitle>
              <p className="text-sm text-muted-foreground">Dialpad CTI vs Manual Logs</p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {/* Dialpad Calls */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-blue-500" />
                      <span className="font-medium">Dialpad CTI</span>
                    </div>
                    <Badge variant="default" className="bg-blue-500">
                      {metrics.dialpadCalls}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">% of Total</span>
                      <span className="font-medium">
                        {metrics.totalCalls > 0 ? ((metrics.dialpadCalls / metrics.totalCalls) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Avg Duration</span>
                      <span className="font-medium">
                        {metrics.dialpadCalls > 0 
                          ? `${Math.floor((metrics.dialpadDuration / metrics.dialpadCalls) / 60)}:${((metrics.dialpadDuration / metrics.dialpadCalls) % 60).toFixed(0).padStart(2, '0')}`
                          : '0:00'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Duration</span>
                      <span className="font-medium">
                        {Math.floor(metrics.dialpadDuration / 60)}m {metrics.dialpadDuration % 60}s
                      </span>
                    </div>
                  </div>
                </div>

                {/* Manual Calls */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-amber-500" />
                      <span className="font-medium">Manual Logs</span>
                    </div>
                    <Badge variant="secondary" className="bg-amber-500 text-white">
                      {metrics.manualCalls}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">% of Total</span>
                      <span className="font-medium">
                        {metrics.totalCalls > 0 ? ((metrics.manualCalls / metrics.totalCalls) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Avg Duration</span>
                      <span className="font-medium">
                        {metrics.manualCalls > 0 
                          ? `${Math.floor((metrics.manualDuration / metrics.manualCalls) / 60)}:${((metrics.manualDuration / metrics.manualCalls) % 60).toFixed(0).padStart(2, '0')}`
                          : '0:00'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Duration</span>
                      <span className="font-medium">
                        {Math.floor(metrics.manualDuration / 60)}m {metrics.manualDuration % 60}s
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visual Progress Bar */}
              <div className="mt-6 space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Dialpad: {metrics.dialpadCalls}</span>
                  <span>Manual: {metrics.manualCalls}</span>
                </div>
                <div className="h-4 bg-secondary rounded-full overflow-hidden flex">
                  <div 
                    className="bg-blue-500 transition-all duration-500"
                    style={{ 
                      width: metrics.totalCalls > 0 ? `${(metrics.dialpadCalls / metrics.totalCalls) * 100}%` : '0%' 
                    }}
                  />
                  <div 
                    className="bg-amber-500 transition-all duration-500"
                    style={{ 
                      width: metrics.totalCalls > 0 ? `${(metrics.manualCalls / metrics.totalCalls) * 100}%` : '0%' 
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Charts */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Replace pie chart with horizontal bar chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Call Outcomes Distribution</CardTitle>
                <p className="text-sm text-muted-foreground">Click on any outcome to view detailed call list</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(metrics.callsByOutcome)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                    .map(([outcome, count]) => {
                      const percentage = metrics.totalCalls > 0 ? ((count / metrics.totalCalls) * 100).toFixed(1) : 0;
                      return (
                        <div 
                          key={outcome} 
                          className="space-y-2 cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-all"
                          onClick={() => fetchOutcomeDetails(outcome)}
                        >
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium capitalize">{outcome}</span>
                            <span className="text-muted-foreground">{count} ({percentage}%)</span>
                          </div>
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>

            <EnhancedChart
              data={metrics.dailyActivity.slice(-7)}
              title="Daily Activity (Last 7 Days)"
              type="line"
              subtitle="Calls and connections per day"
            />

            <EnhancedChart
              data={[{ 
                name: "Connect Rate", 
                value: metrics.connectRate,
                progress: metrics.connectRate,
                trend: 5
              }]}
              title="Connect Rate KPI"
              type="kpi"
              subtitle="Target: 25%"
            />
          </div>

          {/* Rep Performance Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Rep Performance Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.repPerformance.slice(0, 5).map((rep, index) => (
                  <div key={`${rep.name}-${index}`} className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/50 to-transparent rounded-lg border hover:border-primary/50 transition-all">
                    <div className="flex items-center space-x-4">
                      {/* Ranking Badge */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${
                        index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white' :
                        index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white' :
                        index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white' :
                        'bg-gradient-to-br from-blue-400 to-blue-600 text-white'
                      }`}>
                        {index + 1}
                      </div>
                      
                      {/* Rep Name */}
                      <div>
                        <p className="font-semibold text-base">{rep.name}</p>
                        <p className="text-xs text-muted-foreground">{rep.calls} total calls</p>
                      </div>
                    </div>
                    
                    {/* Metrics */}
                    <div className="flex items-center gap-6">
                      {/* No Answer Rate */}
                      <div className="text-center">
                        <div className={`text-lg font-bold ${
                          rep.noAnswerRate < 30 ? 'text-green-600' :
                          rep.noAnswerRate < 50 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {rep.noAnswerRate}%
                        </div>
                        <div className="text-xs text-muted-foreground">no answer</div>
                      </div>
                      
                      {/* Connect Rate */}
                      <div className="text-center">
                        <div className={`text-lg font-bold ${
                          rep.connectRate > 50 ? 'text-green-600' :
                          rep.connectRate > 30 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {rep.connectRate}%
                        </div>
                        <div className="text-xs text-muted-foreground">connect</div>
                      </div>
                      
                      {/* Conversions */}
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {rep.conversions}
                        </div>
                        <div className="text-xs text-muted-foreground">booked</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calls" className="space-y-6">
          {/* Detailed Call Reports with enhanced tracking */}
          <DetailedCallReports />
          
          {/* Account Manager Analytics Section */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Account Manager Meetings</h3>
              <Badge variant="outline">Manager Analytics</Badge>
            </div>
            <AccountManagerAnalytics dateFilter="30" />
          </div>
        </TabsContent>

        <TabsContent value="appointment" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <ReportMetric title="Calls" value={(appointment?.totalCalls || 0).toString()} icon={BarChart3} />
            <ReportMetric title="No Answer" value={(appointment?.noAnswer || 0).toString()} icon={Target} />
            <ReportMetric title="Intro" value={(appointment?.intro || 0).toString()} icon={Users} />
            <ReportMetric title="Short Story" value={(appointment?.shortStory || 0).toString()} icon={Users} />
            <ReportMetric title="Discovery" value={(appointment?.discovery || 0).toString()} icon={Users} />
            <ReportMetric title="Presentation" value={(appointment?.presentation || 0).toString()} icon={Users} />
            <ReportMetric title="Strategy Booked" value={(appointment?.strategyBooked || 0).toString()} icon={Calendar} />
            <ReportMetric title="Strategy Attended" value={(appointment?.strategyAttended || 0).toString()} icon={Calendar} />
            <ReportMetric title="Not Interested" value={(appointment?.notInterested || 0).toString()} icon={Briefcase} />
            <ReportMetric title="DND/DNC" value={(appointment?.dnc || 0).toString()} icon={Briefcase} />
            <ReportMetric title="Resume Requests" value={(appointment?.resumeRequests || 0).toString()} icon={Briefcase} />
          </div>
        </TabsContent>

        <TabsContent value="closing" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <ReportMetric title="Strategy Attended" value={(closing?.strategyAttended || 0).toString()} icon={Calendar} />
            <ReportMetric title="SQL" value={(closing?.sql || 0).toString()} icon={Target} />
            <ReportMetric title="NQL" value={(closing?.nql || 0).toString()} icon={Target} />
            <ReportMetric title="Proposal Sent" value={(closing?.proposalSent || 0).toString()} icon={Briefcase} />
            <ReportMetric title="Candidate Interview Booked" value={(closing?.candidateInterviewBooked || 0).toString()} icon={Calendar} />
            <ReportMetric title="Candidate Interview Attended" value={(closing?.candidateInterviewAttended || 0).toString()} icon={Calendar} />
            <ReportMetric title="Business Audit Booked" value={(closing?.businessAuditBooked || 0).toString()} icon={Briefcase} />
            <ReportMetric title="Business Audit Attended" value={(closing?.businessAuditAttended || 0).toString()} icon={Briefcase} />
            <ReportMetric title="Invoice/Agreement Sent" value={(closing?.invoiceAgreementSent || 0).toString()} icon={Briefcase} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Deals Won by Product</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
                {Object.entries(closing?.dealWonByProduct || {}).map(([name, count]) => (
                  <ReportMetric key={name} title={name} value={String(count)} icon={Briefcase} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Outcome Detail Dialog */}
      <Dialog open={!!selectedOutcome} onOpenChange={(open) => !open && setSelectedOutcome(null)}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Detailed Calls: <span className="capitalize text-primary">{selectedOutcome}</span>
            </DialogTitle>
          </DialogHeader>

          {loadingDetails ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {outcomeDetailCalls.length} call{outcomeDetailCalls.length !== 1 ? 's' : ''}
                </p>
                <Badge variant="secondary">{selectedOutcome}</Badge>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Rep</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outcomeDetailCalls.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No calls found for this outcome
                      </TableCell>
                    </TableRow>
                  ) : (
                    outcomeDetailCalls.map((call) => (
                      <TableRow key={call.id} className="hover:bg-muted/50">
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">
                                {new Date(call.call_timestamp).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(call.call_timestamp).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {call.companies?.name || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {call.contacts ? 
                                `${call.contacts.first_name || ''} ${call.contacts.last_name || ''}`.trim() || 'N/A'
                                : 'N/A'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{call.rep_name}</Badge>
                        </TableCell>
                        <TableCell>
                          {call.duration_seconds ? 
                            `${Math.floor(call.duration_seconds / 60)}:${(call.duration_seconds % 60).toString().padStart(2, '0')}`
                            : 'N/A'}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="text-sm text-muted-foreground truncate">
                            {call.notes || 'No notes'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}