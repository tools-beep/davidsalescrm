import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Users, TrendingUp, AlertCircle } from "lucide-react";

interface Meeting {
  id: string;
  meeting_type: string;
  meeting_outcome: string;
  call_timestamp: string;
  duration_seconds: number;
  rep_id: string;
  user_profiles?: {
    first_name: string;
    last_name: string;
  };
}

interface Props {
  dateFilter?: string;
}

export function AccountManagerAnalytics({ dateFilter = "all" }: Props) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMeetings();
  }, [dateFilter]);

  const fetchMeetings = async () => {
    try {
      // Fetch Account Manager meetings from calls table
      let query = supabase
        .from('calls')
        .select('*')
        .eq('is_account_manager_meeting', true)
        .order('meeting_timestamp', { ascending: false });

      // Apply date filter
      if (dateFilter !== "all") {
        const days = parseInt(dateFilter);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        query = query.gte('meeting_timestamp', startDate.toISOString());
      }

      const { data: meetingsData, error: meetingsError } = await query;

      if (meetingsError) throw meetingsError;

      // Fetch user profiles separately
      const userIds = [...new Set((meetingsData || []).map(m => m.account_manager_id || m.rep_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error fetching user profiles:', profilesError);
      }

      // Create a map of user profiles
      const profileMap = (profiles || []).reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, any>);

      // Transform data to match expected interface
      const transformedData = (meetingsData || []).map((meeting: any) => ({
        id: meeting.id,
        meeting_type: meeting.meeting_type,
        meeting_outcome: meeting.meeting_outcome,
        call_timestamp: meeting.meeting_timestamp || meeting.call_timestamp, // Use meeting_timestamp first
        duration_seconds: meeting.duration_seconds,
        rep_id: meeting.account_manager_id || meeting.rep_id, // Use account_manager_id first
        user_profiles: profileMap[meeting.account_manager_id || meeting.rep_id] || null
      }));
      
      setMeetings(transformedData);
    } catch (error) {
      console.error('Error fetching Account Manager meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics
  const metrics = useMemo(() => {
    const total = meetings.length;
    const avgDuration = meetings.length > 0 
      ? Math.round(meetings.reduce((sum, m) => sum + (m.duration_seconds || 0), 0) / meetings.length)
      : 0;

    // Meeting types breakdown
    const typeBreakdown = meetings.reduce((acc, m) => {
      acc[m.meeting_type] = (acc[m.meeting_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Meeting outcomes breakdown
    const outcomeBreakdown = meetings.reduce((acc, m) => {
      acc[m.meeting_outcome] = (acc[m.meeting_outcome] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Risk indicators
    const riskCount = meetings.filter(m => 
      m.meeting_outcome === "Client - Risk Churn" || 
      m.meeting_outcome === "Operator - At Risk"
    ).length;

    // Opportunities
    const opportunityCount = meetings.filter(m => 
      m.meeting_outcome === "Client - Upsell Opportunity" || 
      m.meeting_outcome === "Client - Referral Opportunity"
    ).length;

    // Manager performance
    const managerStats = meetings.reduce((acc, m) => {
      const name = m.user_profiles 
        ? `${m.user_profiles.first_name} ${m.user_profiles.last_name}`
        : "Unknown";
      if (!acc[name]) {
        acc[name] = { total: 0, risks: 0, opportunities: 0 };
      }
      acc[name].total++;
      if (m.meeting_outcome === "Client - Risk Churn" || m.meeting_outcome === "Operator - At Risk") {
        acc[name].risks++;
      }
      if (m.meeting_outcome === "Client - Upsell Opportunity" || m.meeting_outcome === "Client - Referral Opportunity") {
        acc[name].opportunities++;
      }
      return acc;
    }, {} as Record<string, { total: number; risks: number; opportunities: number }>);

    return {
      total,
      avgDuration,
      typeBreakdown,
      outcomeBreakdown,
      riskCount,
      opportunityCount,
      managerStats
    };
  }, [meetings]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-12">
            <p className="text-center text-muted-foreground">Loading Account Manager analytics...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Meetings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total}</div>
            <p className="text-xs text-muted-foreground">
              Avg duration: {Math.floor(metrics.avgDuration / 60)}m {metrics.avgDuration % 60}s
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Risk</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{metrics.riskCount}</div>
            <p className="text-xs text-muted-foreground">
              Clients/Operators needing attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opportunities</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.opportunityCount}</div>
            <p className="text-xs text-muted-foreground">
              Upsell & referral potential
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account Managers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(metrics.managerStats).length}</div>
            <p className="text-xs text-muted-foreground">
              Active this period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Meeting Types Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Meeting Types Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(metrics.typeBreakdown)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm">{type}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ width: `${(count / metrics.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{count}</span>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Meeting Outcomes Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Meeting Outcomes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2">
            {Object.entries(metrics.outcomeBreakdown)
              .sort((a, b) => b[1] - a[1])
              .map(([outcome, count]) => {
                const isRisk = outcome.includes("Risk") || outcome.includes("At Risk");
                const isOpportunity = outcome.includes("Opportunity");
                const variant = isRisk ? "destructive" : isOpportunity ? "default" : "secondary";
                
                return (
                  <div key={outcome} className="flex items-center justify-between p-2 border rounded-lg">
                    <span className="text-sm">{outcome}</span>
                    <Badge variant={variant as any}>{count}</Badge>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Account Manager Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Account Manager Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(metrics.managerStats)
              .sort((a, b) => b[1].total - a[1].total)
              .map(([name, stats]) => (
                <div key={name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{name}</p>
                    <p className="text-sm text-muted-foreground">{stats.total} meetings</p>
                  </div>
                  <div className="flex gap-2">
                    {stats.risks > 0 && (
                      <Badge variant="destructive">{stats.risks} At Risk</Badge>
                    )}
                    {stats.opportunities > 0 && (
                      <Badge variant="default">{stats.opportunities} Opportunities</Badge>
                    )}
                    {stats.risks === 0 && stats.opportunities === 0 && (
                      <Badge variant="secondary">All Good</Badge>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

