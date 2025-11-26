import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Phone, Mail, Calendar, TrendingUp, Download, X, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface Activity {
  id: string;
  activity_type: string;
  activity_date: string;
  related_contact_id?: string;
  related_company_id?: string;
  related_deal_id?: string;
  assigned_to: string;
  details?: string;
  call_outcome?: string;
  contacts?: { first_name: string; last_name: string; phone?: string };
  companies?: { name: string };
  deals?: { name: string };
}

interface CallData {
  id: string;
  call_timestamp: string;
  caller_number: string;
  duration_seconds: number;
  call_outcome: string;
  outbound_type: string;
  notes: string;
  dialpad_call_id?: string;
  related_contact_id?: string;
  related_company_id?: string;
  related_deal_id?: string;
  rep_id: string;
  contacts?: { first_name: string; last_name: string; phone?: string };
  companies?: { name: string };
}

interface MeetingData {
  id: string;
  title: string;
  scheduled_at: string;
  meeting_type: string;
  is_booked: boolean;
  is_attended: boolean;
  deal_id?: string;
  contact_id?: string;
  deals?: { name: string };
  contacts?: { first_name: string; last_name: string };
}

export function InteractiveDashboard() {
  const [loading, setLoading] = useState(true);
  const [calls, setCalls] = useState<CallData[]>([]);
  const [meetings, setMeetings] = useState<MeetingData[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<{
    type: 'call' | 'email' | 'meeting';
    data: any[];
    title: string;
  } | null>(null);
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: string } | null>(null);
  const navigate = useNavigate();

  // Helper function to format role display names
  const getRoleDisplayName = (role: string): string => {
    const roleMap: Record<string, string> = {
      'eod_user': 'Operator',
      'rep': 'Sales Rep',
      'manager': 'Account Manager',
      'admin': 'Admin'
    };
    return roleMap[role] || role;
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  const fetchCurrentUser = async () => {
    try {
      // Get current logged-in user from Supabase auth
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        console.log('🔍 Fetching profile for auth user:', user.id);
        
        // Fetch user profile - use user_id column, not id column
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('user_id, first_name, last_name, email, role')
          .eq('user_id', user.id)  // Fixed: use user_id, not id
          .single();
        
        console.log('📋 Profile data:', profile);
        console.log('❌ Profile error:', profileError);
        
        if (profile) {
          setCurrentUser({
            id: profile.user_id,  // Fixed: use user_id
            name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email || 'User',
            role: profile.role || 'user'
          });
          console.log('✅ Current user set:', profile.user_id, profile.first_name, profile.last_name);
        } else {
          console.log('⚠️ No profile found for user');
          setLoading(false);
        }
      } else {
        console.log('⚠️ No auth user found');
        setLoading(false);
      }
    } catch (error) {
      console.error('❌ Error fetching current user:', error);
      setLoading(false);
    }
  };

  const fetchData = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);

      console.log('Fetching data for user:', currentUser);

      // Fetch calls - get all calls without date filter first
      const { data: callsData, error: callsError } = await supabase
        .from('calls')
        .select(`
          *,
          contacts(first_name, last_name, phone),
          companies(name)
        `)
        .order('call_timestamp', { ascending: false });

      console.log('Calls data:', callsData);
      console.log('Calls error:', callsError);

      // Fetch meetings - get all meetings without filters
      const { data: meetingsData, error: meetingsError } = await supabase
        .from('meetings')
        .select(`
          *,
          deals(name),
          contacts(first_name, last_name)
        `)
        .order('scheduled_at', { ascending: false });

      console.log('Meetings data:', meetingsData);
      console.log('Meetings error:', meetingsError);

      // Filter by current user on the client side if needed
      const userCalls = (callsData || []).filter(call => call.rep_id === currentUser.id);
      const userMeetings = (meetingsData || []).filter(meeting => meeting.created_by === currentUser.id);

      console.log('User calls:', userCalls.length);
      console.log('User meetings:', userMeetings.length);

      setCalls(userCalls);
      setMeetings(userMeetings);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate activity metrics
  const activityMetrics = useMemo(() => {
    const callCount = calls.length;
    const emailCount = 0; // We don't have email tracking yet
    const meetingCount = meetings.filter(m => m.is_attended).length;
    const total = callCount + emailCount + meetingCount;

    return {
      calls: { count: callCount, percentage: total > 0 ? ((callCount / total) * 100).toFixed(1) : '0' },
      emails: { count: emailCount, percentage: total > 0 ? ((emailCount / total) * 100).toFixed(1) : '0' },
      meetings: { count: meetingCount, percentage: total > 0 ? ((meetingCount / total) * 100).toFixed(1) : '0' },
      total
    };
  }, [calls, meetings]);

  // Calculate call outcomes
  const callOutcomes = useMemo(() => {
    const outcomes: Record<string, number> = {};
    calls.forEach(call => {
      const outcome = call.call_outcome || 'unknown';
      outcomes[outcome] = (outcomes[outcome] || 0) + 1;
    });

    const total = calls.length;
    return Object.entries(outcomes).map(([outcome, count]) => ({
      outcome,
      count,
      percentage: total > 0 ? ((count / total) * 100).toFixed(1) : '0'
    })).sort((a, b) => b.count - a.count);
  }, [calls]);

  // Calculate meetings booked
  const meetingsBooked = useMemo(() => {
    const booked = meetings.filter(m => m.is_booked).length;
    const attended = meetings.filter(m => m.is_attended).length;
    return {
      booked,
      attended,
      attendanceRate: booked > 0 ? ((attended / booked) * 100).toFixed(1) : '0'
    };
  }, [meetings]);

  const handleBarClick = (type: 'call' | 'email' | 'meeting') => {
    let data: any[] = [];
    let title = '';

    switch (type) {
      case 'call':
        data = calls;
        title = 'Call Activities';
        break;
      case 'email':
        data = [];
        title = 'Email Activities';
        break;
      case 'meeting':
        data = meetings;
        title = 'Meeting Activities';
        break;
    }

    setSelectedMetric({ type, data, title });
  };

  const getOutcomeColor = (outcome: string) => {
    const colorMap: Record<string, string> = {
      'DM introduction': '#10B981',
      'dm connected': '#10B981',
      'introduction': '#3B82F6',
      'discovery': '#3B82F6',
      'no answer': '#94A3B8',
      'voicemail': '#F59E0B',
      'gatekeeper': '#9CA3AF',
      'not interested': '#EF4444',
      'do not call': '#EF4444',
    };
    return colorMap[outcome.toLowerCase()] || '#6B7280';
  };

  const handleCallClick = (call: CallData) => {
    // Open Dialpad call details if dialpad_call_id exists
    if (call.dialpad_call_id) {
      // Try multiple Dialpad URL formats for call details
      // Format 1: Shared call link (most common for accessing call summaries)
      const dialpadUrl = `https://dialpad.com/shared/call/${call.dialpad_call_id}`;
      
      // Alternative formats that might work:
      // Format 2: Direct app link - https://dialpad.com/app/calls/{call_id}
      // Format 3: Call summary - https://dialpad.com/calls/{call_id}
      
      console.log('Opening Dialpad call:', {
        call_id: call.dialpad_call_id,
        url: dialpadUrl,
        timestamp: call.call_timestamp,
        outcome: call.call_outcome
      });
      
      window.open(dialpadUrl, '_blank', 'noopener,noreferrer');
    } else {
      console.warn('No Dialpad call ID available for this call');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  // Show empty state if no data
  const hasData = calls.length > 0 || meetings.length > 0;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{currentUser?.name || 'User'} - Activity Dashboard</h2>
        <Badge variant="outline" className="capitalize">{currentUser?.role ? getRoleDisplayName(currentUser.role) : 'User'}</Badge>
      </div>

      {/* Empty State */}
      {!hasData && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Phone className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Activity Data Yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
              Start making calls and booking meetings to see your activity analytics here.
            </p>
            <Button variant="outline" onClick={fetchData}>
              <TrendingUp className="mr-2 h-4 w-4" />
              Refresh Data
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Cards */}
      {hasData && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Daily Activities */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Daily Activities</CardTitle>
              <Badge variant="secondary">{activityMetrics.total}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Calls Bar */}
              <div
                className="relative cursor-pointer group"
                onClick={() => handleBarClick('call')}
                onMouseEnter={() => setHoveredBar('calls')}
                onMouseLeave={() => setHoveredBar(null)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium">Call</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{activityMetrics.calls.count}</span>
                </div>
                <div className="h-8 bg-red-500 rounded hover:bg-red-600 transition-colors flex items-center px-2">
                  <span className="text-white text-xs font-medium">{activityMetrics.calls.percentage}%</span>
                </div>
                
                {/* Tooltip */}
                {hoveredBar === 'calls' && (
                  <div className="absolute left-0 top-full mt-2 z-10 bg-popover border rounded-lg shadow-lg p-3 min-w-[200px]">
                    <p className="font-semibold mb-2">Call Activities</p>
                    <p className="text-sm text-muted-foreground">Total: {activityMetrics.calls.count}</p>
                    <p className="text-sm text-muted-foreground">Percentage: {activityMetrics.calls.percentage}%</p>
                    <p className="text-xs text-primary mt-2">Click to view details</p>
                  </div>
                )}
              </div>

              {/* Meetings Bar */}
              <div
                className="relative cursor-pointer group"
                onClick={() => handleBarClick('meeting')}
                onMouseEnter={() => setHoveredBar('meetings')}
                onMouseLeave={() => setHoveredBar(null)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium">Meeting</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{activityMetrics.meetings.count}</span>
                </div>
                <div className="h-8 bg-purple-500 rounded hover:bg-purple-600 transition-colors flex items-center px-2">
                  <span className="text-white text-xs font-medium">{activityMetrics.meetings.percentage}%</span>
                </div>

                {hoveredBar === 'meetings' && (
                  <div className="absolute left-0 top-full mt-2 z-10 bg-popover border rounded-lg shadow-lg p-3 min-w-[200px]">
                    <p className="font-semibold mb-2">Meeting Activities</p>
                    <p className="text-sm text-muted-foreground">Total: {activityMetrics.meetings.count}</p>
                    <p className="text-sm text-muted-foreground">Percentage: {activityMetrics.meetings.percentage}%</p>
                    <p className="text-xs text-primary mt-2">Click to view details</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call Count & Outcomes */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Call Count & Outcomes</CardTitle>
              <Badge variant="secondary">{calls.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {callOutcomes.slice(0, 6).map((outcome) => (
                <div key={outcome.outcome} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate">{outcome.outcome}</span>
                    <span className="text-muted-foreground">{outcome.count} ({outcome.percentage}%)</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${outcome.percentage}%`,
                        backgroundColor: getOutcomeColor(outcome.outcome)
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Meetings Booked */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Meetings Booked</CardTitle>
              <Badge variant="secondary">{meetingsBooked.booked}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Booked</span>
                  <span className="text-2xl font-bold">{meetingsBooked.booked}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Attended</span>
                  <span className="text-2xl font-bold text-green-600">{meetingsBooked.attended}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${meetingsBooked.attendanceRate}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {meetingsBooked.attendanceRate}% attendance rate
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      )}

      {/* Detailed View Dialog */}
      <Dialog open={!!selectedMetric} onOpenChange={() => setSelectedMetric(null)}>
        <DialogContent className="max-w-6xl max-h-[80vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{selectedMetric?.title}</DialogTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {selectedMetric?.data.length} Activities
                </Badge>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity Date</TableHead>
                  <TableHead>Associated Contacts</TableHead>
                  <TableHead>Associated Companies</TableHead>
                  <TableHead>Activity Type</TableHead>
                  <TableHead>Details</TableHead>
                  {selectedMetric?.type === 'call' && <TableHead>Call Outcome</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedMetric?.type === 'call' && selectedMetric.data.map((call: CallData) => (
                  <TableRow 
                    key={call.id} 
                    className={`hover:bg-muted/50 ${call.dialpad_call_id ? 'cursor-pointer' : ''}`}
                    onClick={() => call.dialpad_call_id && handleCallClick(call)}
                    title={call.dialpad_call_id ? 'Click to view call details in Dialpad' : ''}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {format(new Date(call.call_timestamp), 'MMM d, yyyy h:mm a')}
                        {call.dialpad_call_id && (
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {call.contacts 
                        ? `${call.contacts.first_name} ${call.contacts.last_name}${call.contacts.phone ? ` (${call.contacts.phone})` : ''}`
                        : '-'}
                    </TableCell>
                    <TableCell>{call.companies?.name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">Call</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{call.notes || '-'}</TableCell>
                    <TableCell>
                      <Badge 
                        style={{ 
                          backgroundColor: `${getOutcomeColor(call.call_outcome)}20`,
                          color: getOutcomeColor(call.call_outcome),
                          border: `1px solid ${getOutcomeColor(call.call_outcome)}40`
                        }}
                      >
                        {call.call_outcome}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {selectedMetric?.type === 'meeting' && selectedMetric.data.map((meeting: MeetingData) => (
                  <TableRow key={meeting.id} className="hover:bg-muted/50 cursor-pointer">
                    <TableCell>{format(new Date(meeting.scheduled_at), 'MMM d, yyyy h:mm a')}</TableCell>
                    <TableCell>
                      {meeting.contacts 
                        ? `${meeting.contacts.first_name} ${meeting.contacts.last_name}`
                        : '-'}
                    </TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>
                      <Badge variant="outline">Meeting</Badge>
                    </TableCell>
                    <TableCell>{meeting.title}</TableCell>
                    <TableCell>
                      <Badge variant={meeting.is_attended ? "success" : "secondary"}>
                        {meeting.is_attended ? 'Attended' : 'Booked'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

