import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, TrendingUp, Calendar, Award, Star, Zap } from "lucide-react";
import { startOfDayEST, endOfDayEST } from "@/utils/timezoneUtils";
import { format } from "date-fns";

interface PointsHistory {
  id: string;
  points: number;
  reason: string;
  created_at: string;
}

interface PointsSummary {
  total_points: number;
  weekly_points: number;
  monthly_points: number;
}

interface PointsDashboardSectionProps {
  userId: string;
  selectedDate?: Date; // Date from parent dashboard
}

const COLORS = {
  cream: '#FFFCF9',
  pastelBlue: '#C7D7EC',
  pastelMint: '#B8EBD0',
  pastelPeach: '#FFDAB9',
  pastelLavender: '#D8C8FF',
  pastelYellow: '#FAE8A4',
  darkText: '#2D2D2D',
  warmText: '#6F6F6F',
  softGray: '#E8E8E8',
};

export function PointsDashboardSection({ userId, selectedDate }: PointsDashboardSectionProps) {
  
  const [pointsSummary, setPointsSummary] = useState<PointsSummary>({
    total_points: 0,
    weekly_points: 0,
    monthly_points: 0,
  });
  const [recentHistory, setRecentHistory] = useState<PointsHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    fetchPointsData();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel(`points_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'points_history',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchPointsData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, selectedDate]);

  const fetchPointsData = async () => {
    try {
      setLoading(true);

      // Fetch points summary from user_profiles
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('total_points, weekly_points, monthly_points')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;

      setPointsSummary({
        total_points: profileData?.total_points || 0,
        weekly_points: profileData?.weekly_points || 0,
        monthly_points: profileData?.monthly_points || 0,
      });

      // Fetch points history filtered by selected date
      let query = supabase
        .from('points_history')
        .select('id, points, reason, created_at')
        .eq('user_id', userId);

      // Filter by selected date if specified (using EST timezone)
      if (selectedDate) {
        const startOfDay = startOfDayEST(selectedDate);
        const endOfDay = endOfDayEST(selectedDate);

        query = query
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString());
      }

      const { data: historyData, error: historyError } = await query
        .order('created_at', { ascending: false })
        .limit(50); // Increased to 50 to show more transactions per day

      if (historyError) throw historyError;

      setRecentHistory(historyData || []);
    } catch (error) {
      console.error('Error fetching points data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPoints = (points: number) => {
    return points.toLocaleString();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getPointsIcon = (reason: string) => {
    if (reason.includes('Deep Work') || reason.includes('Immediate Impact')) return '🧠';
    if (reason.includes('High Priority')) return '🔥';
    if (reason.includes('Goal Achieved') || reason.includes('Accurate')) return '🎯';
    if (reason.includes('Enjoyment')) return '😊';
    if (reason.includes('Streak')) return '⚡';
    if (reason.includes('Momentum')) return '🚀';
    return '⭐';
  };

  if (loading) {
    return (
      <Card className="border-0 animate-pulse" style={{
        backgroundColor: COLORS.cream,
        borderRadius: '28px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)'
      }}>
        <CardContent className="h-64"></CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 hover-lift transition-all" style={{
      backgroundColor: COLORS.cream,
      borderRadius: '28px',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)'
    }}>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-3 text-xl mb-2" style={{ color: COLORS.darkText }}>
              <div className="p-2.5 rounded-2xl" style={{ 
                background: 'linear-gradient(135deg, #D8C8FF, #E8DDFF)',
                boxShadow: '0 4px 12px rgba(199, 184, 234, 0.2)'
              }}>
                <Trophy className="h-5 w-5 text-white" />
              </div>
              Points System
              <Badge className="ml-2 rounded-full px-3 py-1 text-xs font-medium border-0" style={{
                backgroundColor: COLORS.pastelYellow,
                color: COLORS.darkText
              }}>
                Active
              </Badge>
            </CardTitle>
            <CardDescription className="text-[15px]" style={{ color: COLORS.warmText }}>
              Your productivity rewards & achievements
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Points Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Lifetime Points */}
          <div className="p-6 rounded-3xl hover-lift transition-all" style={{
            background: 'linear-gradient(135deg, #D8C8FF, #E8DDFF)',
            boxShadow: '0 4px 12px rgba(199, 184, 234, 0.2)'
          }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-white/90">Lifetime</p>
              <Trophy className="h-4 w-4 text-white/70" />
            </div>
            <p className="text-4xl font-bold text-white mb-1">
              {formatPoints(pointsSummary.total_points)}
            </p>
            <p className="text-xs text-white/70">Total points earned</p>
          </div>

          {/* Monthly Points */}
          <div className="p-6 rounded-3xl hover-lift transition-all" style={{
            background: 'linear-gradient(135deg, #B8EBD0, #D0F4E6)',
            boxShadow: '0 4px 12px rgba(184, 235, 208, 0.2)'
          }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-emerald-900/90">This Month</p>
              <Calendar className="h-4 w-4 text-emerald-900/70" />
            </div>
            <p className="text-4xl font-bold text-emerald-900 mb-1">
              {formatPoints(pointsSummary.monthly_points)}
            </p>
            <p className="text-xs text-emerald-900/70">30-day total</p>
          </div>

          {/* Weekly Points */}
          <div className="p-6 rounded-3xl hover-lift transition-all" style={{
            background: 'linear-gradient(135deg, #FAE8A4, #FFF4C4)',
            boxShadow: '0 4px 12px rgba(250, 232, 164, 0.2)'
          }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-amber-900/90">This Week</p>
              <TrendingUp className="h-4 w-4 text-amber-900/70" />
            </div>
            <p className="text-4xl font-bold text-amber-900 mb-1">
              {formatPoints(pointsSummary.weekly_points)}
            </p>
            <p className="text-xs text-amber-900/70">7-day total</p>
          </div>
        </div>

        {/* Recent Points History */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4" style={{ color: COLORS.warmText }} />
              <h3 className="text-sm font-semibold" style={{ color: COLORS.darkText }}>
                {selectedDate && format(selectedDate, "PPP") === format(new Date(), "PPP") 
                  ? "Today's Activity" 
                  : `Activity for ${selectedDate ? format(selectedDate, "MMM d, yyyy") : "All Time"}`}
              </h3>
            </div>
            <Badge className="rounded-full px-3 py-1 text-xs font-medium border-0" style={{
              backgroundColor: COLORS.pastelMint,
              color: COLORS.darkText
            }}>
              {recentHistory.length} {recentHistory.length === 1 ? 'transaction' : 'transactions'}
            </Badge>
          </div>
          
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
            {recentHistory.length === 0 ? (
              <div className="text-center py-8">
                <Star className="h-12 w-12 mx-auto mb-3 opacity-30" style={{ color: COLORS.warmText }} />
                <p className="text-sm" style={{ color: COLORS.warmText }}>
                  No points earned yet. Complete tasks to start earning!
                </p>
              </div>
            ) : (
              recentHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 rounded-2xl hover:scale-[1.02] transition-all"
                  style={{
                    backgroundColor: '#FFFFFF',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                  }}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="text-2xl flex-shrink-0">
                      {getPointsIcon(entry.reason)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: COLORS.darkText }}>
                        {entry.reason}
                      </p>
                      <p className="text-xs" style={{ color: COLORS.warmText }}>
                        {formatDate(entry.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                    <span className="text-lg font-bold" style={{ 
                      color: entry.points > 0 ? '#10B981' : '#EF4444'
                    }}>
                      {entry.points > 0 ? '+' : ''}{entry.points}
                    </span>
                    <Zap className="h-3.5 w-3.5" style={{ color: '#F59E0B' }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

