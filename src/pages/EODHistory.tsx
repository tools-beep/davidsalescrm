import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Calendar } from "lucide-react";
import { EODHistoryList } from "@/components/eod/EODHistoryList";

interface Submission {
  id: string;
  submitted_at: string;
  clocked_in_at: string | null;
  clocked_out_at: string | null;
  total_hours: number;
  summary: string;
  email_sent: boolean;
  planned_shift_minutes?: number | null;
  daily_task_goal?: number | null;
  total_active_seconds?: number | null;
}

export default function EODHistory() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('eod_submissions')
        .select('*')
        .order('submitted_at', { ascending: false});

      if (error) throw error;
      setSubmissions(data || []);
    } catch (e: any) {
      toast({ title: 'Failed to load history', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/eod')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to EOD
            </Button>
            <div>
              <h1 className="text-2xl font-bold">EOD History</h1>
              <p className="text-sm text-muted-foreground">View your past end-of-day reports with shift goals and utilization metrics</p>
            </div>
          </div>
        </div>

        {/* Submissions List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Submitted Reports ({submissions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EODHistoryList submissions={submissions} onRefresh={loadSubmissions} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
