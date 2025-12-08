import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Search } from "lucide-react";

interface Conversation {
  id: string;
  last_message_at: string;
  contact_name?: string;
  deal_name?: string;
  last_message_snippet?: string;
}

export function RecentConversations() {
  const [items, setItems] = useState<Conversation[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    const { data } = await supabase
      .from('sms_messages')
      .select('id, message_body, created_at, contacts(first_name,last_name), deals(name)')
      .order('created_at', { ascending: false })
      .limit(50);

    const mapped: Conversation[] = (data || []).map((m: any) => ({
      id: m.id,
      last_message_at: m.created_at,
      contact_name: m.contacts ? `${m.contacts.first_name || ''} ${m.contacts.last_name || ''}`.trim() : undefined,
      deal_name: m.deals?.name,
      last_message_snippet: m.message_body?.slice(0, 80)
    }));
    setItems(mapped);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return items;
    return items.filter(i => (
      (i.contact_name || '').toLowerCase().includes(q) ||
      (i.deal_name || '').toLowerCase().includes(q) ||
      (i.last_message_snippet || '').toLowerCase().includes(q)
    ));
  }, [items, search]);

  return (
    <Card className="bg-[hsl(0,0%,10%)] border-[hsl(0,0%,18%)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-[hsl(40,20%,90%)]">
          <div className="p-2 rounded-lg bg-[hsl(40,40%,15%)]">
            <MessageSquare className="h-5 w-5 text-[hsl(40,50%,55%)]" />
          </div>
          <span style={{ fontFamily: 'Cinzel, serif' }}>Recent Conversations</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(40,10%,45%)]" />
          <Input 
            placeholder="Search conversations..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-[hsl(0,0%,15%)] border-[hsl(0,0%,22%)] text-[hsl(40,20%,90%)] placeholder:text-[hsl(40,10%,40%)] focus:border-[hsl(40,50%,50%)] focus:ring-1 focus:ring-[hsl(40,50%,50%)]"
          />
        </div>
        <div className="max-h-80 overflow-auto space-y-2 pr-1 custom-scrollbar">
          {filtered.map((c) => (
            <div 
              key={c.id} 
              className="p-3 rounded-lg bg-[hsl(0,0%,12%)] hover:bg-[hsl(0,0%,15%)] border border-transparent hover:border-[hsl(40,40%,25%)] transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-[hsl(40,20%,85%)]">
                  {c.contact_name || 'Unknown contact'}
                </p>
                <Badge className="text-xs bg-[hsl(0,0%,18%)] text-[hsl(40,10%,60%)] border-[hsl(0,0%,25%)]">
                  {new Date(c.last_message_at).toLocaleString()}
                </Badge>
              </div>
              <p className="text-xs text-[hsl(40,50%,55%)] mb-1">{c.deal_name || 'No deal'}</p>
              <p className="text-sm text-[hsl(40,10%,60%)]">{c.last_message_snippet}</p>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-sm text-[hsl(40,10%,50%)] py-8 text-center">No conversations found</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
