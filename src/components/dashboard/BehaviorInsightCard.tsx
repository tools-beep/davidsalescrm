import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Clock, Target, Heart, Award, Smile } from "lucide-react";

interface BehaviorInsightProps {
  id: string;
  title: string;
  insight: string;
  advice: string;
  tag: 'Timing Pattern' | 'Focus Pattern' | 'Strength' | 'Momentum' | 'Energy' | 'Wellness' | 'Category' | 'Accuracy' | 'Deep Work';
  category: 'energy' | 'timing' | 'focus' | 'balance' | 'strength' | 'wellness' | 'enjoyment' | 'accuracy' | 'momentum' | 'deepwork';
  color: string;
}

const categoryConfig: Record<BehaviorInsightProps['category'], { icon: any; bgColor: string; badgeColor: string }> = {
  energy: {
    icon: Zap,
    bgColor: '#FEF9F7',
    badgeColor: '#4B4B4B',
  },
  timing: {
    icon: Clock,
    bgColor: '#F5F9FD',
    badgeColor: '#4B4B4B',
  },
  focus: {
    icon: Target,
    bgColor: '#F9F7FD',
    badgeColor: '#4B4B4B',
  },
  balance: {
    icon: Heart,
    bgColor: '#FEF8F9',
    badgeColor: '#4B4B4B',
  },
  strength: {
    icon: Award,
    bgColor: '#F5FDF9',
    badgeColor: '#4B4B4B',
  },
  wellness: {
    icon: Smile,
    bgColor: '#FEF9F7',
    badgeColor: '#4B4B4B',
  },
  enjoyment: {
    icon: Heart,
    bgColor: '#FEF8F9',
    badgeColor: '#4B4B4B',
  },
  accuracy: {
    icon: Target,
    bgColor: '#FFFBF5',
    badgeColor: '#4B4B4B',
  },
  momentum: {
    icon: Zap,
    bgColor: '#F5FDF9',
    badgeColor: '#4B4B4B',
  },
  deepwork: {
    icon: Award,
    bgColor: '#F9F7FD',
    badgeColor: '#4B4B4B',
  },
};

export function BehaviorInsightCard({ title, insight, advice, tag, category, color }: BehaviorInsightProps) {
  const config = categoryConfig[category];
  const IconComponent = config.icon;

  return (
    <Card className="border-0 hover-lift animate-bloom opacity-0 transition-all duration-200" style={{
      backgroundColor: config.bgColor,
      borderRadius: '28px',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)',
    }}>
      <CardContent className="p-7">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl flex-shrink-0" style={{ 
            backgroundColor: color,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
          }}>
            <IconComponent className="h-6 w-6" style={{ color: '#FFFCF9' }} />
          </div>
          <div className="flex-1 space-y-3">
            <h4 className="text-[17px] font-semibold leading-tight" style={{ color: '#4B4B4B' }}>
              {title}
            </h4>
            <p className="text-[15px] font-medium leading-relaxed" style={{ color: '#4B4B4B' }}>
              {insight}
            </p>
            <p className="text-[14px] leading-relaxed" style={{ color: '#6F6F6F' }}>
              {advice}
            </p>
            <Badge className="rounded-full px-4 py-1.5 text-[13px] font-medium border-0 mt-3" style={{
              backgroundColor: color,
              color: config.badgeColor,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
            }}>
              {tag}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
