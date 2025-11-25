import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Calendar, Info } from "lucide-react";
import { format } from "date-fns";

interface StreakHistoryCardProps {
  streakLength: number;
  startDate: Date;
  endDate: Date;
  resetReason?: string;
  isCurrent: boolean;
}

export function StreakHistoryCard({
  streakLength,
  startDate,
  endDate,
  resetReason,
  isCurrent,
}: StreakHistoryCardProps) {
  const isLongStreak = streakLength >= 7;
  const isMediumStreak = streakLength >= 4;

  return (
    <Card className="border-0 hover-lift animate-bloom opacity-0 transition-all duration-200" style={{
      backgroundColor: isCurrent ? '#FFFBF5' : '#FFFCF9',
      borderRadius: '28px',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)',
    }}>
      <CardContent className="p-7">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="p-3 rounded-2xl" style={{ 
            backgroundColor: isCurrent ? '#FAE8A4' : '#EDEDED',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
          }}>
            <Flame className="h-6 w-6" style={{ color: isCurrent ? '#4B4B4B' : '#FFFCF9' }} />
          </div>
          {isCurrent && (
            <Badge className="rounded-full px-4 py-1.5 text-[13px] font-medium border-0" style={{
              backgroundColor: '#FAE8A4',
              color: '#4B4B4B',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
            }}>
              Active Now
            </Badge>
          )}
          {!isCurrent && isLongStreak && (
            <Badge className="rounded-full px-4 py-1.5 text-[13px] font-medium border-0" style={{
              backgroundColor: '#C7B8EA',
              color: '#4B4B4B',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
            }}>
              Personal Best
            </Badge>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-semibold" style={{ 
                color: isCurrent ? '#FAE8A4' : '#4B4B4B'
              }}>
                {streakLength}
              </span>
              <span className="text-[15px]" style={{ color: '#6F6F6F' }}>
                day streak
              </span>
            </div>
            
            {isLongStreak && (
              <p className="text-[15px] font-medium mt-3" style={{ color: '#C7B8EA' }}>
                Incredible commitment! 🌟
              </p>
            )}
            {!isLongStreak && isMediumStreak && (
              <p className="text-[15px] font-medium mt-3" style={{ color: '#A7C7E7' }}>
                Building strong momentum! 💪
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 text-[14px]" style={{ color: '#6F6F6F' }}>
            <Calendar className="h-4 w-4" />
            <span>
              {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
            </span>
          </div>

          {resetReason && (
            <div className="mt-5 pt-5 border-t" style={{ borderColor: '#EDEDED' }}>
              <div className="flex items-start gap-3">
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#A7C7E7' }} />
                <p className="text-[15px] leading-relaxed" style={{ color: '#6F6F6F' }}>
                  {resetReason}
                </p>
              </div>
            </div>
          )}

          {isCurrent && (
            <div className="mt-5 pt-5 border-t" style={{ borderColor: '#FAE8A4', opacity: 0.3 }}>
              <p className="text-[15px] font-medium" style={{ color: '#6F6F6F' }}>
                Keep going! Each day adds to your journey. 🚀
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
