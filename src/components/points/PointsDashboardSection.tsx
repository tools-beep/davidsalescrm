// 📊 Points Dashboard Section Component
// Displays comprehensive points overview in Smart DAR Dashboard

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatPoints } from '@/utils/pointsEngine';
import { Trophy, TrendingUp, Calendar, Star, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PointsDashboardSectionProps {
  userId: string;
}

interface PointsSummary {
  total_points: number;
  weekly_points: number;
  monthly_points: number;
  points_today: number;
  recent_history: Array<{
    id: string;
    timestamp: string;
    points: number;
    reason: string;
    task_id: string | null;
  }>;
}

const PASTEL_COLORS = {
  lavender: '#D8C8FF',
  mint: '#CFF5D6',
  peach: '#FBC7A7',
  blue: '#BFD9FF',
  yellow: '#FFE9B5',
};

export function PointsDashboardSection({ userId }: PointsDashboardSectionProps) {
  const [points, setPoints] = useState<PointsSummary>({
    total_points: 0,
    weekly_points: 0,
    monthly_points: 0,
    points_today: 0,
    recent_history: [],
  });
  const [loading, setLoading] = useState(true);
  
  const fetchPoints = async () => {
    try {
      setLoading(true);
      
      // Get points summary using RPC function
      const { data, error } = await (supabase as any)
        .rpc('get_user_points_summary', { p_user_id: userId });
      
      if (error) {
        console.error('Error fetching points summary:', error);
        
        // Fallback: fetch manually
        const { data: profile } = await (supabase as any)
          .from('user_profiles')
          .select('total_points, weekly_points, monthly_points')
          .eq('user_id', userId)
          .single();
        
        const { data: history } = await (supabase as any)
          .from('points_history')
          .select('*')
          .eq('user_id', userId)
          .order('timestamp', { ascending: false })
          .limit(10);
        
        const today = new Date().toISOString().split('T')[0];
        const todayPoints = history
          ?.filter((h: any) => h.timestamp.startsWith(today))
          .reduce((sum: number, h: any) => sum + h.points, 0) || 0;
        
        setPoints({
          total_points: profile?.total_points || 0,
          weekly_points: profile?.weekly_points || 0,
          monthly_points: profile?.monthly_points || 0,
          points_today: todayPoints,
          recent_history: history || [],
        });
      } else if (data && data.length > 0) {
        const summary = data[0];
        setPoints({
          total_points: summary.total_points || 0,
          weekly_points: summary.weekly_points || 0,
          monthly_points: summary.monthly_points || 0,
          points_today: summary.points_today || 0,
          recent_history: summary.recent_history || [],
        });
      }
    } catch (error) {
      console.error('Error in fetchPoints:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchPoints();
    
    // Real-time updates
    const channel = (supabase as any)
      .channel('points-dashboard-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'points_history',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchPoints();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
  
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="h-32 rounded-[22px] animate-pulse"
              style={{ background: PASTEL_COLORS.lavender }}
            />
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Points Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Today's Points */}
        <Card
          className="border-0 shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${PASTEL_COLORS.yellow}, #FFF4D9)`,
            borderRadius: '22px',
          }}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#7A5D00] mb-1">
                  Points Today
                </p>
                <p className="text-3xl font-bold text-[#7A5D00]">
                  +{formatPoints(points.points_today)}
                </p>
              </div>
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{
                  background: 'rgba(255, 255, 255, 0.4)',
                  border: '2px solid rgba(250, 232, 164, 0.5)',
                }}
              >
                <Clock className="w-7 h-7 text-[#7A5D00]" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Weekly Points */}
        <Card
          className="border-0 shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${PASTEL_COLORS.blue}, #D6E9FF)`,
            borderRadius: '22px',
          }}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#2A5A8A] mb-1">
                  This Week
                </p>
                <p className="text-3xl font-bold text-[#2A5A8A]">
                  {formatPoints(points.weekly_points)}
                </p>
              </div>
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{
                  background: 'rgba(255, 255, 255, 0.4)',
                  border: '2px solid rgba(167, 199, 231, 0.5)',
                }}
              >
                <TrendingUp className="w-7 h-7 text-[#2A5A8A]" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Monthly Points */}
        <Card
          className="border-0 shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${PASTEL_COLORS.mint}, #E3F9E8)`,
            borderRadius: '22px',
          }}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#0A7A32] mb-1">
                  This Month
                </p>
                <p className="text-3xl font-bold text-[#0A7A32]">
                  {formatPoints(points.monthly_points)}
                </p>
              </div>
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{
                  background: 'rgba(255, 255, 255, 0.4)',
                  border: '2px solid rgba(184, 235, 208, 0.5)',
                }}
              >
                <Calendar className="w-7 h-7 text-[#0A7A32]" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Lifetime Points */}
        <Card
          className="border-0 shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${PASTEL_COLORS.lavender}, #E8DDFF)`,
            borderRadius: '22px',
          }}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#4A3F7A] mb-1">
                  Lifetime
                </p>
                <p className="text-3xl font-bold text-[#4A3F7A]">
                  {formatPoints(points.total_points)}
                </p>
              </div>
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{
                  background: 'rgba(255, 255, 255, 0.4)',
                  border: '2px solid rgba(199, 184, 234, 0.5)',
                }}
              >
                <Trophy className="w-7 h-7 text-[#4A3F7A]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Points Activity */}
      <Card
        className="border-0 shadow-lg"
        style={{
          background: 'linear-gradient(135deg, #FFFFFF, #F8F8FF)',
          borderRadius: '22px',
        }}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#4A3F7A]">
            <Star className="w-5 h-5" />
            Recent Points Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {points.recent_history.length === 0 ? (
            <div className="text-center py-8 text-[#6F6F6F]">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No points earned yet. Complete tasks to start earning!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {points.recent_history.map((entry, index) => (
                <div
                  key={entry.id || index}
                  className="flex items-center justify-between p-3 rounded-[16px] transition-all hover:shadow-md"
                  style={{
                    background: index % 2 === 0 ? PASTEL_COLORS.lavender + '20' : PASTEL_COLORS.mint + '20',
                    border: `1px solid ${index % 2 === 0 ? PASTEL_COLORS.lavender : PASTEL_COLORS.mint}40`,
                  }}
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#2A2A2A]">
                      {entry.reason}
                    </p>
                    <p className="text-xs text-[#6F6F6F] mt-0.5">
                      {new Date(entry.timestamp).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div
                    className="px-3 py-1.5 rounded-full font-bold text-sm"
                    style={{
                      background: entry.points > 0 ? PASTEL_COLORS.mint : PASTEL_COLORS.peach,
                      color: entry.points > 0 ? '#0A7A32' : '#7A3F1E',
                    }}
                  >
                    {entry.points > 0 ? '+' : ''}{entry.points}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

