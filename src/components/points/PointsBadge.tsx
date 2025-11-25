// 🏆 Points Badge Component
// Live-updating badge showing user's total points with hover details

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatPoints } from '@/utils/pointsEngine';
import { Trophy } from 'lucide-react';

interface PointsBadgeProps {
  userId: string;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

interface PointsSummary {
  total_points: number;
  weekly_points: number;
  monthly_points: number;
  points_today: number;
}

export function PointsBadge({ userId, size = 'medium', showLabel = true }: PointsBadgeProps) {
  const [points, setPoints] = useState<PointsSummary>({
    total_points: 0,
    weekly_points: 0,
    monthly_points: 0,
    points_today: 0,
  });
  const [isHovered, setIsHovered] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Size configurations
  const sizeConfig = {
    small: {
      container: 'px-3 py-1.5 text-xs',
      icon: 'w-3 h-3',
      badge: 'w-8 h-8',
    },
    medium: {
      container: 'px-4 py-2 text-sm',
      icon: 'w-4 h-4',
      badge: 'w-10 h-10',
    },
    large: {
      container: 'px-5 py-2.5 text-base',
      icon: 'w-5 h-5',
      badge: 'w-12 h-12',
    },
  };
  
  const config = sizeConfig[size];
  
  // Fetch points summary
  const fetchPoints = async () => {
    try {
      setLoading(true);
      
      // Get user points from user_profiles
      const { data: profile, error: profileError } = await (supabase as any)
        .from('user_profiles')
        .select('total_points, weekly_points, monthly_points')
        .eq('user_id', userId)
        .single();
      
      if (profileError) {
        console.error('Error fetching points:', profileError);
        return;
      }
      
      // Get today's points from points_history
      const today = new Date().toISOString().split('T')[0];
      const { data: todayPoints, error: todayError } = await (supabase as any)
        .from('points_history')
        .select('points')
        .eq('user_id', userId)
        .gte('timestamp', `${today}T00:00:00`)
        .lte('timestamp', `${today}T23:59:59`);
      
      const pointsToday = todayPoints?.reduce((sum: number, entry: any) => sum + entry.points, 0) || 0;
      
      setPoints({
        total_points: profile?.total_points || 0,
        weekly_points: profile?.weekly_points || 0,
        monthly_points: profile?.monthly_points || 0,
        points_today: pointsToday,
      });
    } catch (error) {
      console.error('Error in fetchPoints:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchPoints();
    
    // Set up real-time subscription for points updates
    const channel = (supabase as any)
      .channel('points-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_profiles',
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
      <div
        className={`inline-flex items-center gap-2 rounded-full ${config.container} animate-pulse`}
        style={{
          background: 'linear-gradient(135deg, #D8C8FF, #E8DDFF)',
          border: '2px solid #C7B8EA',
        }}
      >
        <div className={`${config.badge} rounded-full bg-white/30`} />
        {showLabel && <div className="w-16 h-4 bg-white/30 rounded" />}
      </div>
    );
  }
  
  return (
    <div className="relative inline-block">
      {/* Main Badge */}
      <div
        className={`inline-flex items-center gap-2 rounded-full ${config.container} cursor-pointer transition-all duration-300`}
        style={{
          background: isHovered
            ? 'linear-gradient(135deg, #C7B8EA, #D8C8FF)'
            : 'linear-gradient(135deg, #D8C8FF, #E8DDFF)',
          border: '2px solid #C7B8EA',
          boxShadow: isHovered
            ? '0 8px 24px rgba(199, 184, 234, 0.4), 0 0 20px rgba(199, 184, 234, 0.3)'
            : '0 4px 12px rgba(199, 184, 234, 0.2)',
          transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Trophy Icon */}
        <div
          className={`${config.badge} rounded-full flex items-center justify-center`}
          style={{
            background: 'rgba(255, 255, 255, 0.4)',
            border: '1px solid rgba(199, 184, 234, 0.5)',
          }}
        >
          <Trophy className={`${config.icon} text-[#4A3F7A]`} />
        </div>
        
        {/* Points Display */}
        {showLabel && (
          <div className="flex flex-col items-start">
            <span className="font-bold text-[#4A3F7A] leading-none">
              {formatPoints(points.total_points)}
            </span>
            <span className="text-[10px] text-[#6F6F6F] leading-none mt-0.5">
              points
            </span>
          </div>
        )}
      </div>
      
      {/* Hover Tooltip */}
      {isHovered && (
        <div
          className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-50 pointer-events-none"
          style={{
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            className="px-4 py-3 rounded-[18px] shadow-xl min-w-[200px]"
            style={{
              background: 'linear-gradient(135deg, #FFFFFF, #F8F8FF)',
              border: '2px solid #C7B8EA',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            }}
          >
            {/* Arrow */}
            <div
              className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 rotate-45"
              style={{
                background: 'linear-gradient(135deg, #FFFFFF, #F8F8FF)',
                border: '2px solid #C7B8EA',
                borderRight: 'none',
                borderBottom: 'none',
              }}
            />
            
            {/* Content */}
            <div className="relative space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#6F6F6F]">Today</span>
                <span className="text-sm font-bold text-[#4A3F7A]">
                  +{formatPoints(points.points_today)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#6F6F6F]">This Week</span>
                <span className="text-sm font-bold text-[#4A3F7A]">
                  {formatPoints(points.weekly_points)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#6F6F6F]">This Month</span>
                <span className="text-sm font-bold text-[#4A3F7A]">
                  {formatPoints(points.monthly_points)}
                </span>
              </div>
              
              <div
                className="pt-2 mt-2 flex justify-between items-center"
                style={{ borderTop: '1px solid #E8DDFF' }}
              >
                <span className="text-xs font-semibold text-[#6F6F6F]">Lifetime</span>
                <span className="text-base font-bold text-[#4A3F7A]">
                  {formatPoints(points.total_points)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translate(-50%, -10px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
      `}</style>
    </div>
  );
}

