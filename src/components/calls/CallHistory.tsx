import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Phone, PhoneIncoming, PhoneOutgoing, Clock, User, FileText, Headphones, Search, Edit2, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { CallLogForm } from "./CallLogForm";

interface Call {
  id: string;
  call_direction: string | null;
  call_outcome: string;
  call_status: string | null;
  call_timestamp: string | null;
  caller_number: string | null;
  callee_number: string | null;
  duration_seconds: number | null;
  outbound_type: string;
  notes: string | null;
  recording_url: string | null;
  transcript: string | null;
  rep_id: string | null;
  related_contact_id: string | null;
  related_deal_id: string | null;
  dialpad_call_id: string | null;
  // Meeting-specific fields
  meeting_type?: string;
  meeting_outcome?: string;
  meeting_timestamp?: string | null;
  is_meeting?: boolean;
}

interface CallHistoryProps {
  contactId?: string;
  dealId?: string;
  limit?: number;
}

export function CallHistory({ contactId, dealId, limit = 10 }: CallHistoryProps) {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingCall, setEditingCall] = useState<Call | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    if (contactId || dealId) {
      fetchCallHistory();
    }
  }, [contactId, dealId]);

  const fetchCallHistory = async () => {
    try {
      setLoading(true);
      
      // Fetch from calls table
      let callsQuery = supabase
        .from('calls')
        .select('*')
        .order('call_timestamp', { ascending: false })
        .limit(limit);

      if (contactId) {
        callsQuery = callsQuery.eq('related_contact_id', contactId);
      } else if (dealId) {
        callsQuery = callsQuery.eq('related_deal_id', dealId);
      }

      const { data: callsData, error: callsError } = await callsQuery;
      if (callsError) throw callsError;

      // Mark Account Manager meetings
      const callsWithMeetingFlag = (callsData || []).map((call: any) => ({
        ...call,
        is_meeting: call.is_account_manager_meeting === true,
        meeting_type: call.meeting_type,
        meeting_outcome: call.meeting_outcome,
        meeting_timestamp: call.meeting_timestamp,
      }));

      setCalls(callsWithMeetingFlag);
    } catch (error) {
      console.error('Error fetching call history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getOutcomeColor = (outcome: string) => {
    const outcomeMap: Record<string, string> = {
      'DM': 'success',
      'introduction': 'success',
      'voicemail': 'warning',
      'no answer': 'secondary',
      'not interested': 'destructive',
      'gatekeeper': 'secondary',
    };
    return outcomeMap[outcome?.toLowerCase()] || 'default';
  };

  // Filter calls based on search term
  const filteredCalls = useMemo(() => {
    if (!searchTerm) return calls;
    
    const searchLower = searchTerm.toLowerCase();
    return calls.filter(call => 
      call.call_outcome?.toLowerCase().includes(searchLower) ||
      call.outbound_type?.toLowerCase().includes(searchLower) ||
      call.notes?.toLowerCase().includes(searchLower) ||
      call.caller_number?.includes(searchTerm) ||
      call.callee_number?.includes(searchTerm)
    );
  }, [calls, searchTerm]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Call History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Call History ({calls.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {calls.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No call history available
          </p>
        ) : (
          <>
            {/* Search Input */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search calls by outcome, notes, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {filteredCalls.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No calls match your search
          </p>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
                  {filteredCalls.map((call) => (
                <div
                  key={call.id}
                  className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {call.is_meeting ? (
                        <Calendar className="h-4 w-4 text-blue-500" />
                      ) : call.call_direction === 'outbound' ? (
                        <PhoneOutgoing className="h-4 w-4 text-primary" />
                      ) : (
                        <PhoneIncoming className="h-4 w-4 text-success" />
                      )}
                      <span className="font-medium text-sm capitalize">
                        {call.is_meeting ? (call.meeting_type || 'Meeting') : (call.outbound_type || call.call_direction || 'Call')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getOutcomeColor(call.call_outcome) as any}>
                        {call.is_meeting ? call.meeting_outcome : call.call_outcome}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => {
                          setEditingCall(call);
                          setEditDialogOpen(true);
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    {(call.call_timestamp || call.meeting_timestamp) && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span>
                          {format(new Date(call.call_timestamp || call.meeting_timestamp!), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                    )}

                    {call.duration_seconds !== null && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span>Duration: {formatDuration(call.duration_seconds)}</span>
                      </div>
                    )}

                    {(call.caller_number || call.callee_number) && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        <span>
                          {call.call_direction === 'outbound' 
                            ? `To: ${call.callee_number}` 
                            : `From: ${call.caller_number}`}
                        </span>
                      </div>
                    )}

                    {call.notes && (
                      <div className="flex items-start gap-2 mt-2">
                        <FileText className="h-3 w-3 flex-shrink-0 mt-0.5" />
                        <span className="text-xs">{call.notes}</span>
                      </div>
                    )}

                    {call.recording_url && (
                      <div className="flex items-center gap-2 mt-2">
                        <Headphones className="h-3 w-3" />
                        <a
                          href={call.recording_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-xs"
                        >
                          Listen to recording
                        </a>
                      </div>
                    )}

                    {call.call_status && (
                      <div className="mt-1">
                        <Badge variant="outline" className="text-xs">
                          {call.call_status}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
            )}
          </>
        )}
      </CardContent>

      {/* Edit Call Dialog */}
      {editingCall && (
        <CallLogForm
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          existingCallId={editingCall.id}
          callData={{
            phoneNumber: editingCall.caller_number || editingCall.callee_number || '',
            callId: editingCall.dialpad_call_id ? parseInt(editingCall.dialpad_call_id) : undefined,
            startTime: editingCall.call_timestamp ? new Date(editingCall.call_timestamp) : undefined,
            duration: editingCall.duration_seconds || 0,
            dealId: editingCall.related_deal_id || undefined,
            contactId: editingCall.related_contact_id || undefined,
          }}
          onSubmit={() => {
            fetchCallHistory();
            setEditDialogOpen(false);
            setEditingCall(null);
          }}
        >
          <span style={{ display: 'none' }} />
        </CallLogForm>
      )}
    </Card>
  );
}

