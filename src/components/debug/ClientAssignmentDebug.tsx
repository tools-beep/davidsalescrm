import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * DEBUG COMPONENT
 * Temporary component to diagnose client assignment issues
 * To use: Import and add <ClientAssignmentDebug /> to Deals.tsx
 */
export function ClientAssignmentDebug() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDebugInfo = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setDebugInfo({ error: 'No user logged in' });
          setLoading(false);
          return;
        }

        // Get user profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        // Get client assignments
        const { data: assignments } = await (supabase as any)
          .from('user_client_assignments')
          .select('*')
          .eq('user_id', user.id);

        // Get all deals with companies for this user's pipelines
        const { data: deals } = await supabase
          .from('deals')
          .select('id, name, stage, pipeline_id, company_id, companies(id, name)')
          .limit(10);

        // Get pipelines
        const { data: pipelines } = await supabase
          .from('pipelines')
          .select('id, name');

        // Match check
        const matches: any[] = [];
        if (assignments && deals) {
          const assignedClients = assignments.map((a: any) => a.client_name.toLowerCase().trim());
          
          deals.forEach((deal: any) => {
            const companyName = deal.companies?.name?.toLowerCase().trim();
            const isMatch = assignedClients.some((c: string) => c === companyName);
            matches.push({
              dealName: deal.name,
              companyName: deal.companies?.name,
              companyNameNormalized: companyName,
              isMatch,
              assignedClients: assignments.map((a: any) => a.client_name)
            });
          });
        }

        setDebugInfo({
          user: {
            id: user.id,
            email: user.email
          },
          profile,
          assignments,
          deals,
          pipelines,
          matches
        });
        setLoading(false);
      } catch (error) {
        console.error('Debug fetch error:', error);
        setDebugInfo({ error: String(error) });
        setLoading(false);
      }
    };

    fetchDebugInfo();
  }, []);

  if (loading) {
    return (
      <Card className="mb-4 border-yellow-500">
        <CardHeader className="bg-yellow-50">
          <CardTitle className="text-sm">🔍 Debug Panel - Loading...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!debugInfo) return null;

  return (
    <Card className="mb-4 border-yellow-500">
      <CardHeader className="bg-yellow-50">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>🔍 Client Assignment Debug Panel</span>
          <Badge variant="destructive">REMOVE BEFORE PRODUCTION</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <ScrollArea className="h-96">
          <div className="space-y-4 text-xs font-mono">
            {/* User Info */}
            <div>
              <div className="font-bold text-blue-600 mb-1">👤 Current User:</div>
              <div className="ml-4">
                <div>Email: {debugInfo.user?.email}</div>
                <div>ID: {debugInfo.user?.id}</div>
                <div>Role: <Badge>{debugInfo.profile?.role}</Badge></div>
              </div>
            </div>

            {/* Client Assignments */}
            <div>
              <div className="font-bold text-green-600 mb-1">
                📋 Client Assignments ({debugInfo.assignments?.length || 0}):
              </div>
              <div className="ml-4">
                {debugInfo.assignments?.length > 0 ? (
                  debugInfo.assignments.map((a: any, i: number) => (
                    <div key={i} className="mb-2 p-2 bg-green-50 rounded">
                      <div>Client Name: <strong>{a.client_name}</strong></div>
                      <div className="text-gray-500">
                        Normalized: {a.client_name.toLowerCase().trim()}
                      </div>
                    </div>
                  ))
                ) : (
                  <Badge variant="destructive">⚠️ NO ASSIGNMENTS FOUND!</Badge>
                )}
              </div>
            </div>

            {/* Deals & Matching */}
            <div>
              <div className="font-bold text-purple-600 mb-1">
                🎯 Deal Matching (First 10 deals):
              </div>
              <div className="ml-4 space-y-2">
                {debugInfo.matches?.map((m: any, i: number) => (
                  <div 
                    key={i} 
                    className={`p-2 rounded ${m.isMatch ? 'bg-green-100 border border-green-300' : 'bg-red-50 border border-red-200'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">{m.dealName}</span>
                      <Badge variant={m.isMatch ? "default" : "destructive"}>
                        {m.isMatch ? '✅ MATCH' : '❌ NO MATCH'}
                      </Badge>
                    </div>
                    <div>Company: <strong>{m.companyName}</strong></div>
                    <div className="text-gray-500">Normalized: {m.companyNameNormalized}</div>
                    <div className="text-gray-500">
                      Assigned Clients: {m.assignedClients.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pipelines */}
            <div>
              <div className="font-bold text-indigo-600 mb-1">
                📊 Available Pipelines:
              </div>
              <div className="ml-4">
                {debugInfo.pipelines?.map((p: any) => (
                  <div key={p.id} className="mb-1">
                    • {p.name} <span className="text-gray-400">({p.id})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Raw Data */}
            <details className="mt-4">
              <summary className="cursor-pointer font-bold text-gray-600">
                🔧 Raw Data (Click to expand)
              </summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto text-[10px]">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </details>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

