import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Phone,
  Users,
  Building2,
  Clock,
  TrendingUp,
  Target,
  Calendar,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  Award,
  BarChart3,
  PieChart,
  Activity,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface CallRecord {
  id: string;
  call_timestamp: string;
  caller_number: string;
  duration_seconds: number;
  call_outcome: string;
  outbound_type: string;
  call_direction: string;
  rep_id: string;
  related_contact_id: string;
  related_deal_id: string;
  related_company_id: string;
  notes: string;
}

interface RepPerformance {
  rep_id: string;
  rep_name: string;
  total_calls: number;
  total_duration: number;
  avg_duration: number;
  outcomes: Record<string, number>;
  best_outcome: string;
  connect_rate: number;
  conversion_rate: number;
  deals_impacted: number;
}

interface ContactCallStats {
  contact_id: string;
  contact_name: string;
  contact_email: string;
  company_name: string;
  total_calls: number;
  last_called: string;
  outcomes: string[];
  deal_stage: string;
}

interface CallTrend {
  date: string;
  total: number;
  connects: number;
  no_answer: number;
  voicemail: number;
}

interface OutcomeBreakdown {
  outcome: string;
  count: number;
  percentage: number;
  avg_duration: number;
  avg_follow_ups: number;
}

export function DetailedCallReports() {
  const [loading, setLoading] = useState(true);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [repPerformance, setRepPerformance] = useState<RepPerformance[]>([]);
  const [contactStats, setContactStats] = useState<ContactCallStats[]>([]);
  const [callTrends, setCallTrends] = useState<CallTrend[]>([]);
  const [outcomeBreakdown, setOutcomeBreakdown] = useState<OutcomeBreakdown[]>([]);
  const [dateRange, setDateRange] = useState("30"); // days
  const [selectedRep, setSelectedRep] = useState<string>("all");
  const [reps, setReps] = useState<Array<{ id: string; name: string }>>([]);

  // Summary metrics
  const [totalCalls, setTotalCalls] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [avgDuration, setAvgDuration] = useState(0);
  const [connectRate, setConnectRate] = useState(0);
  const [topPerformer, setTopPerformer] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, [dateRange, selectedRep]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Calculate date filter
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange));

      // Fetch calls with filters
      let query = supabase
        .from('calls')
        .select(`
          *,
          contacts:related_contact_id(id, first_name, last_name, email, company_id),
          companies:related_company_id(id, name),
          deals:related_deal_id(id, stage)
        `)
        .gte('call_timestamp', daysAgo.toISOString())
        .order('call_timestamp', { ascending: false });

      if (selectedRep !== 'all') {
        query = query.eq('rep_id', selectedRep);
      }

      const { data: callsData, error } = await query;

      if (error) throw error;

      setCalls(callsData || []);

      // Fetch reps
      const { data: repsData } = await supabase
        .from('user_profiles')
        .select('user_id, first_name, last_name')
        .in('role', ['rep', 'manager', 'admin']);

      const repsFormatted = repsData?.map(r => ({
        id: r.user_id, // Changed from r.id to r.user_id
        name: `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Unknown'
      })) || [];

      setReps(repsFormatted);

      // Process data
      if (callsData) {
        await processCallData(callsData, repsFormatted);
      }

    } catch (error) {
      console.error('Error fetching call reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const processCallData = async (callsData: any[], repsFormatted: any[]) => {
    // Calculate summary metrics
    setTotalCalls(callsData.length);
    const totalDur = callsData.reduce((sum, call) => sum + (call.duration_seconds || 0), 0);
    setTotalDuration(totalDur);
    setAvgDuration(callsData.length > 0 ? Math.round(totalDur / callsData.length) : 0);

    // Calculate connect rate (calls that reached decision maker / total calls)
    const connectedOutcomes = ['DM', 'introduction', 'DM short story', 'DM discovery', 'DM presentation'];
    const connectedCalls = callsData.filter(call =>
      connectedOutcomes.includes(call.call_outcome)
    ).length;
    setConnectRate(callsData.length > 0 ? Math.round((connectedCalls / callsData.length) * 100) : 0);

    // Rep Performance
    const repMap = new Map<string, RepPerformance>();
    callsData.forEach(call => {
      if (!repMap.has(call.rep_id)) {
        const repData = repsFormatted.find(r => r.id === call.rep_id);
        repMap.set(call.rep_id, {
          rep_id: call.rep_id,
          rep_name: repData?.name || 'Unknown Rep',
          total_calls: 0,
          total_duration: 0,
          avg_duration: 0,
          outcomes: {},
          best_outcome: '',
          connect_rate: 0,
          conversion_rate: 0,
          deals_impacted: 0,
        });
      }

      const rep = repMap.get(call.rep_id)!;
      rep.total_calls++;
      rep.total_duration += call.duration_seconds || 0;
      rep.outcomes[call.call_outcome] = (rep.outcomes[call.call_outcome] || 0) + 1;
      if (call.related_deal_id) {
        rep.deals_impacted++;
      }
    });

    // Calculate rep metrics
    repMap.forEach(rep => {
      rep.avg_duration = rep.total_calls > 0 ? Math.round(rep.total_duration / rep.total_calls) : 0;
      const repCalls = callsData.filter(c => c.rep_id === rep.rep_id);
      const repConnected = repCalls.filter(c => connectedOutcomes.includes(c.call_outcome)).length;
      rep.connect_rate = repCalls.length > 0 ? Math.round((repConnected / repCalls.length) * 100) : 0;
      
      // Find best outcome
      const sortedOutcomes = Object.entries(rep.outcomes).sort((a, b) => b[1] - a[1]);
      rep.best_outcome = sortedOutcomes[0]?.[0] || 'N/A';
    });

    const repPerf = Array.from(repMap.values()).sort((a, b) => b.total_calls - a.total_calls);
    setRepPerformance(repPerf);
    setTopPerformer(repPerf[0]?.rep_name || 'N/A');

    // Contact Call Stats
    const contactMap = new Map<string, ContactCallStats>();
    callsData.forEach(call => {
      if (call.related_contact_id && call.contacts) {
        if (!contactMap.has(call.related_contact_id)) {
          contactMap.set(call.related_contact_id, {
            contact_id: call.related_contact_id,
            contact_name: `${call.contacts.first_name || ''} ${call.contacts.last_name || ''}`.trim(),
            contact_email: call.contacts.email || '',
            company_name: call.companies?.name || 'Unknown Company',
            total_calls: 0,
            last_called: call.call_timestamp,
            outcomes: [],
            deal_stage: call.deals?.stage || 'N/A',
          });
        }

        const contact = contactMap.get(call.related_contact_id)!;
        contact.total_calls++;
        contact.outcomes.push(call.call_outcome);
        // Keep most recent call date
        if (new Date(call.call_timestamp) > new Date(contact.last_called)) {
          contact.last_called = call.call_timestamp;
        }
      }
    });

    const contactStatsArray = Array.from(contactMap.values()).sort((a, b) => b.total_calls - a.total_calls);
    setContactStats(contactStatsArray);

    // Call Trends (daily)
    const trendsMap = new Map<string, CallTrend>();
    callsData.forEach(call => {
      const date = format(new Date(call.call_timestamp), 'MMM dd');
      if (!trendsMap.has(date)) {
        trendsMap.set(date, {
          date,
          total: 0,
          connects: 0,
          no_answer: 0,
          voicemail: 0,
        });
      }

      const trend = trendsMap.get(date)!;
      trend.total++;
      if (connectedOutcomes.includes(call.call_outcome)) trend.connects++;
      if (call.call_outcome === 'no answer') trend.no_answer++;
      if (call.call_outcome === 'voicemail') trend.voicemail++;
    });

    const trendsArray = Array.from(trendsMap.values()).slice(-14); // Last 14 days
    setCallTrends(trendsArray);

    // Outcome Breakdown
    const outcomeMap = new Map<string, { count: number; durations: number[] }>();
    callsData.forEach(call => {
      if (!outcomeMap.has(call.call_outcome)) {
        outcomeMap.set(call.call_outcome, { count: 0, durations: [] });
      }
      const outcome = outcomeMap.get(call.call_outcome)!;
      outcome.count++;
      outcome.durations.push(call.duration_seconds || 0);
    });

    const outcomeBreakdownArray: OutcomeBreakdown[] = Array.from(outcomeMap.entries()).map(([outcome, data]) => ({
      outcome,
      count: data.count,
      percentage: Math.round((data.count / callsData.length) * 100),
      avg_duration: Math.round(data.durations.reduce((a, b) => a + b, 0) / data.durations.length),
      avg_follow_ups: 0, // Can be calculated if you track follow-ups
    })).sort((a, b) => b.count - a.count);

    setOutcomeBreakdown(outcomeBreakdownArray);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedRep} onValueChange={setSelectedRep}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Reps" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reps</SelectItem>
            {reps.map(rep => (
              <SelectItem key={rep.id} value={rep.id}>{rep.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={fetchData}>
          <Activity className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCalls}</div>
            <p className="text-xs text-muted-foreground">
              Last {dateRange} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(totalDuration)}</div>
            <p className="text-xs text-muted-foreground">
              Avg: {formatDuration(avgDuration)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connect Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{connectRate}%</div>
            <p className="text-xs text-muted-foreground">
              Decision maker reached
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold truncate">{topPerformer}</div>
            <p className="text-xs text-muted-foreground">
              Most calls made
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contactStats.length}</div>
            <p className="text-xs text-muted-foreground">
              People called
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="reps" className="space-y-4">
        <TabsList>
          <TabsTrigger value="reps" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Rep Performance
          </TabsTrigger>
          <TabsTrigger value="contacts" className="flex items-center gap-2">
            <PhoneCall className="h-4 w-4" />
            Who We Called
          </TabsTrigger>
          <TabsTrigger value="outcomes" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Call Outcomes
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Trends
          </TabsTrigger>
        </TabsList>

        {/* Rep Performance Tab */}
        <TabsContent value="reps" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rep Performance Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rep Name</TableHead>
                    <TableHead className="text-right">Total Calls</TableHead>
                    <TableHead className="text-right">Avg Duration</TableHead>
                    <TableHead className="text-right">Connect Rate</TableHead>
                    <TableHead className="text-right">Deals Impacted</TableHead>
                    <TableHead>Top Outcome</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {repPerformance.map((rep, index) => (
                    <TableRow key={`${rep.rep_id || 'unknown'}-${index}`}>
                      <TableCell className="font-medium">{rep.rep_name}</TableCell>
                      <TableCell className="text-right">{rep.total_calls}</TableCell>
                      <TableCell className="text-right">{formatDuration(rep.avg_duration)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={rep.connect_rate > 30 ? "default" : "secondary"}>
                          {rep.connect_rate}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{rep.deals_impacted}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{rep.best_outcome}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contacts Called - Who We Reached Out To</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Calls Made</TableHead>
                    <TableHead>Last Called</TableHead>
                    <TableHead>Deal Stage</TableHead>
                    <TableHead>Latest Outcome</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contactStats.slice(0, 50).map((contact) => (
                    <TableRow key={contact.contact_id}>
                      <TableCell className="font-medium">{contact.contact_name || 'Unknown'}</TableCell>
                      <TableCell>{contact.company_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{contact.contact_email}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={contact.total_calls > 3 ? "default" : "secondary"}>
                          {contact.total_calls}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(contact.last_called), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{contact.deal_stage}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge>{contact.outcomes[contact.outcomes.length - 1]}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Outcomes Tab */}
        <TabsContent value="outcomes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Call Outcome Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Outcome</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Percentage</TableHead>
                    <TableHead className="text-right">Avg Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outcomeBreakdown.map((outcome) => (
                    <TableRow key={outcome.outcome}>
                      <TableCell className="font-medium">{outcome.outcome}</TableCell>
                      <TableCell className="text-right">{outcome.count}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${outcome.percentage}%` }}
                            />
                          </div>
                          <span>{outcome.percentage}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatDuration(outcome.avg_duration)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Call Activity (Last 14 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Total Calls</TableHead>
                    <TableHead className="text-right">Connects</TableHead>
                    <TableHead className="text-right">No Answer</TableHead>
                    <TableHead className="text-right">Voicemail</TableHead>
                    <TableHead className="text-right">Connect Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {callTrends.map((trend) => {
                    const rate = trend.total > 0 ? Math.round((trend.connects / trend.total) * 100) : 0;
                    return (
                      <TableRow key={trend.date}>
                        <TableCell className="font-medium">{trend.date}</TableCell>
                        <TableCell className="text-right">{trend.total}</TableCell>
                        <TableCell className="text-right text-green-600">{trend.connects}</TableCell>
                        <TableCell className="text-right text-orange-600">{trend.no_answer}</TableCell>
                        <TableCell className="text-right text-blue-600">{trend.voicemail}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={rate > 30 ? "default" : "secondary"}>
                            {rate}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

