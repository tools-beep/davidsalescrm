import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar as CalendarIcon, Clock, Users, CheckSquare, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FullCalendarView } from "@/components/calendar/FullCalendarView";

interface Meeting {
  id: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_type: string;
  is_booked: boolean;
  is_attended: boolean;
  meeting_link?: string;
  location?: string;
  notes?: string;
}

const meetingTypeColors = {
  consultation: 'primary',
  strategy: 'secondary',
  interview: 'warning',
  onboarding: 'success',
  follow_up: 'secondary',
} as const;

export default function Calendar() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventDetailOpen, setEventDetailOpen] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    scheduled_at: "",
    duration_minutes: 30,
    meeting_type: "consultation",
    meeting_link: "",
    location: "",
    notes: "",
  });

  useEffect(() => {
    fetchAllEvents();
  }, []);

  const fetchAllEvents = async () => {
    try {
      // Fetch meetings
      const { data: meetingsData, error: meetingsError } = await supabase
        .from('meetings')
        .select('*')
        .order('scheduled_at', { ascending: true });

      if (meetingsError) throw meetingsError;
      setMeetings(meetingsData || []);

      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true });

      if (tasksError) console.error('Tasks error:', tasksError);
      setTasks(tasksData || []);

      // Fetch calls
      const { data: callsData, error: callsError } = await supabase
        .from('calls')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (callsError) console.error('Calls error:', callsError);
      setCalls(callsData || []);

    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error",
        description: "Failed to load events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Convert all events to calendar format
  const calendarEvents = [
    ...meetings.map(m => ({
      id: m.id,
      title: m.title,
      start: new Date(m.scheduled_at),
      end: new Date(new Date(m.scheduled_at).getTime() + m.duration_minutes * 60000),
      type: 'meeting' as const,
    })),
    ...tasks.map(t => ({
      id: t.id,
      title: t.title || 'Untitled Task',
      start: new Date(t.due_date),
      end: new Date(new Date(t.due_date).getTime() + 3600000), // 1 hour default
      type: 'task' as const,
    })),
    ...calls.map(c => ({
      id: c.id,
      title: `Call - ${c.contact_name || 'Unknown'}`,
      start: new Date(c.created_at),
      end: new Date(new Date(c.created_at).getTime() + (c.duration || 5) * 60000),
      type: 'call' as const,
    })),
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.scheduled_at) {
      toast({
        title: "Error",
        description: "Title and scheduled time are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('meetings')
        .insert({
          title: formData.title,
          scheduled_at: formData.scheduled_at,
          duration_minutes: formData.duration_minutes,
          meeting_type: formData.meeting_type as any,
          meeting_link: formData.meeting_link || null,
          location: formData.location || null,
          notes: formData.notes || null,
          is_booked: true,
          is_attended: false,
        })
        .select()
        .single();

      if (error) throw error;

      setMeetings([...meetings, data]);
      setDialogOpen(false);
      setFormData({
        title: "",
        scheduled_at: "",
        duration_minutes: 30,
        meeting_type: "consultation",
        meeting_link: "",
        location: "",
        notes: "",
      });
      
      // Refresh all events
      fetchAllEvents();

      toast({
        title: "Success",
        description: "Meeting scheduled successfully",
      });
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast({
        title: "Error",
        description: "Failed to schedule meeting",
        variant: "destructive",
      });
    }
  };

  const upcomingEvents = meetings
    .filter(meeting => new Date(meeting.scheduled_at) >= new Date())
    .slice(0, 5);

  return (
    <div className="space-y-4 md:space-y-6 p-3 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Schedule and manage your meetings, calls, and interviews.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="text-sm">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Schedule Event</span>
              <span className="sm:hidden">Schedule</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Schedule New Event</DialogTitle>
              <DialogDescription>
                Create a new meeting or event on your calendar.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Strategy Call - Company Name"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="scheduled_at">Date & Time *</Label>
                  <Input
                    id="scheduled_at"
                    type="datetime-local"
                    value={formData.scheduled_at}
                    onChange={(e) => setFormData(prev => ({ ...prev, scheduled_at: e.target.value }))}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="meeting_type">Meeting Type</Label>
                  <Select
                    value={formData.meeting_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, meeting_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consultation">Consultation</SelectItem>
                      <SelectItem value="strategy">Strategy</SelectItem>
                      <SelectItem value="interview">Interview</SelectItem>
                      <SelectItem value="onboarding">Onboarding</SelectItem>
                      <SelectItem value="follow_up">Follow Up</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 30 }))}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="meeting_link">Meeting Link</Label>
                  <Input
                    id="meeting_link"
                    value={formData.meeting_link}
                    onChange={(e) => setFormData(prev => ({ ...prev, meeting_link: e.target.value }))}
                    placeholder="https://zoom.us/..."
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Office, Zoom, etc."
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional details..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Schedule Event</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* View Selector */}
      <div className="flex items-center justify-between">
        <Tabs value={view} onValueChange={(v) => setView(v as any)}>
          <TabsList>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="day">Day</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            Meetings
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            Tasks
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            Calls
          </Badge>
        </div>
      </div>

      {/* Full Calendar View */}
      {loading ? (
        <Card className="p-8 text-center">
          <p>Loading events...</p>
        </Card>
      ) : (
        <FullCalendarView
          events={calendarEvents}
          view={view}
          onEventClick={(event) => {
            setSelectedEvent(event);
            setEventDetailOpen(true);
          }}
          onDateClick={(date) => {
            setFormData({ ...formData, scheduled_at: date.toISOString().slice(0, 16) });
            setDialogOpen(true);
          }}
        />
      )}

      {/* Upcoming Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Upcoming Events</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading meetings...</div>
          ) : upcomingEvents.length > 0 ? (
            <div className="space-y-4">
              {upcomingEvents.map((meeting) => (
                <div key={meeting.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="font-medium">{meeting.title}</h4>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <CalendarIcon className="h-3 w-3" />
                        <span>{new Date(meeting.scheduled_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(meeting.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={meetingTypeColors[meeting.meeting_type as keyof typeof meetingTypeColors] || 'secondary'}>
                      {meeting.meeting_type}
                    </Badge>
                    <Badge variant={meeting.is_attended ? 'success' : 'secondary'}>
                      {meeting.is_attended ? 'Attended' : 'Scheduled'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="mx-auto h-12 w-12 mb-2" />
              <p>No upcoming events</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Detail Dialog */}
      <Dialog open={eventDetailOpen} onOpenChange={setEventDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {selectedEvent.type === 'meeting' && <Users className="h-4 w-4 text-blue-500" />}
                {selectedEvent.type === 'task' && <CheckSquare className="h-4 w-4 text-green-500" />}
                {selectedEvent.type === 'call' && <Phone className="h-4 w-4 text-purple-500" />}
                <Badge variant="secondary">{selectedEvent.type}</Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {selectedEvent.start.toLocaleString('en-US', { 
                    dateStyle: 'medium', 
                    timeStyle: 'short' 
                  })}
                  {' - '}
                  {selectedEvent.end.toLocaleTimeString('en-US', { timeStyle: 'short' })}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
