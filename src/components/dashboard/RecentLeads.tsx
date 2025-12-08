import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Users, Search } from "lucide-react";

interface LeadItem {
  id: string;
  name: string;
  company?: string;
  created_at: string;
  priority?: string;
}

export function RecentLeads() {
  const [items, setItems] = useState<LeadItem[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    const { data } = await supabase
      .from('deals')
      .select('id, name, created_at, priority, companies(name)')
      .order('created_at', { ascending: false })
      .limit(50);
    const mapped: LeadItem[] = (data || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      created_at: d.created_at,
      company: d.companies?.name,
      priority: d.priority,
    }));
    setItems(mapped);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return items;
    return items.filter(i => (
      i.name.toLowerCase().includes(q) ||
      (i.company || '').toLowerCase().includes(q)
    ));
  }, [items, search]);

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium':
        return 'bg-[hsl(40,50%,20%)] text-[hsl(40,60%,70%)] border-[hsl(40,50%,30%)]';
      case 'low':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-[hsl(0,0%,20%)] text-[hsl(40,10%,60%)] border-[hsl(0,0%,25%)]';
    }
  };

  return (
    <Card className="bg-[hsl(0,0%,10%)] border-[hsl(0,0%,18%)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-[hsl(40,20%,90%)]">
          <div className="p-2 rounded-lg bg-[hsl(40,40%,15%)]">
            <Users className="h-5 w-5 text-[hsl(40,50%,55%)]" />
          </div>
          <span style={{ fontFamily: 'Cinzel, serif' }}>Recent Leads</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(40,10%,45%)]" />
          <Input 
            placeholder="Search leads..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-[hsl(0,0%,15%)] border-[hsl(0,0%,22%)] text-[hsl(40,20%,90%)] placeholder:text-[hsl(40,10%,40%)] focus:border-[hsl(40,50%,50%)] focus:ring-1 focus:ring-[hsl(40,50%,50%)]"
          />
        </div>
        <div className="max-h-80 overflow-auto space-y-2 pr-1 custom-scrollbar">
          {filtered.map((l) => (
            <div 
              key={l.id} 
              className="flex items-start justify-between p-3 rounded-lg bg-[hsl(0,0%,12%)] hover:bg-[hsl(0,0%,15%)] border border-transparent hover:border-[hsl(40,40%,25%)] transition-all duration-200"
            >
              <div>
                <p className="text-sm font-medium text-[hsl(40,20%,85%)]">{l.name}</p>
                <p className="text-xs text-[hsl(40,10%,50%)] mt-0.5">{l.company || 'No company'}</p>
              </div>
              <div className="text-right">
                {l.priority && (
                  <Badge className={`text-xs border ${getPriorityColor(l.priority)}`}>
                    {l.priority}
                  </Badge>
                )}
                <p className="text-xs text-[hsl(40,10%,45%)] mt-1">{new Date(l.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-sm text-[hsl(40,10%,50%)] py-8 text-center">No leads found</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
