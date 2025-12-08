import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, Calendar, FileText, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  type: "call" | "email" | "meeting" | "note";
  title: string;
  description: string;
  time: string;
  icon: any;
  outcome?: string;
}

export function RecentActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const allActivities: ActivityItem[] = [];

      const { data: calls } = await supabase
        .from('calls')
        .select('id, created_at, call_outcome, notes, contacts(first_name, last_name)')
        .order('created_at', { ascending: false })
        .limit(3);

      calls?.forEach(call => {
        const contactName = call.contacts 
          ? `${call.contacts.first_name} ${call.contacts.last_name}`
          : 'Unknown contact';
        allActivities.push({
          id: call.id,
          type: 'call',
          title: `Called ${contactName}`,
          description: call.notes || call.call_outcome || 'No notes',
          time: call.created_at,
          icon: Phone,
          outcome: call.call_outcome
        });
      });

      const { data: emails } = await supabase
        .from('emails')
        .select('id, created_at, subject, to_email, status')
        .order('created_at', { ascending: false })
        .limit(3);

      emails?.forEach(email => {
        allActivities.push({
          id: email.id,
          type: 'email',
          title: `Email to ${email.to_email}`,
          description: email.subject,
          time: email.created_at,
          icon: Mail,
          outcome: email.status
        });
      });

      const { data: meetings } = await supabase
        .from('meetings')
        .select('id, created_at, title, description, meeting_type')
        .order('created_at', { ascending: false })
        .limit(3);

      meetings?.forEach(meeting => {
        allActivities.push({
          id: meeting.id,
          type: 'meeting',
          title: meeting.title,
          description: meeting.description || meeting.meeting_type,
          time: meeting.created_at,
          icon: Calendar,
          outcome: meeting.meeting_type
        });
      });

      const { data: notes } = await supabase
        .from('notes')
        .select('id, created_at, content, deals(name)')
        .order('created_at', { ascending: false })
        .limit(3);

      notes?.forEach(note => {
        const dealName = note.deals?.name || 'Unknown deal';
        allActivities.push({
          id: note.id,
          type: 'note',
          title: `Note added to ${dealName}`,
          description: note.content.substring(0, 50) + (note.content.length > 50 ? '...' : ''),
          time: note.created_at,
          icon: FileText
        });
      });

      allActivities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setActivities(allActivities.slice(0, 10));

    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-[hsl(0,0%,10%)] border-[hsl(0,0%,18%)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-[hsl(40,20%,90%)]">
            <div className="p-2 rounded-lg bg-[hsl(40,40%,15%)]">
              <Activity className="h-5 w-5 text-[hsl(40,50%,55%)]" />
            </div>
            <span style={{ fontFamily: 'Cinzel, serif' }}>Recent Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-[hsl(40,10%,50%)]">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[hsl(0,0%,10%)] border-[hsl(0,0%,18%)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-[hsl(40,20%,90%)]">
          <div className="p-2 rounded-lg bg-[hsl(40,40%,15%)]">
            <Activity className="h-5 w-5 text-[hsl(40,50%,55%)]" />
          </div>
          <span style={{ fontFamily: 'Cinzel, serif' }}>Recent Activity</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-[hsl(40,10%,50%)]">No recent activity</div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-[hsl(0,0%,15%)] transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(40,40%,15%)]">
                  <activity.icon className="h-5 w-5 text-[hsl(40,50%,55%)]" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none text-[hsl(40,20%,85%)]">
                    {activity.title}
                  </p>
                  <p className="text-sm text-[hsl(40,10%,50%)]">
                    {activity.description}
                  </p>
                </div>
                <div className="text-right">
                  {activity.outcome && (
                    <Badge className="bg-[hsl(40,40%,20%)] text-[hsl(40,50%,70%)] border-[hsl(40,40%,30%)] text-xs">
                      {activity.outcome}
                    </Badge>
                  )}
                  <p className="text-xs text-[hsl(40,10%,45%)] mt-1">
                    {formatDistanceToNow(new Date(activity.time), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
