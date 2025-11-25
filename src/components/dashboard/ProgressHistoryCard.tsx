import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown,
  Minus,
  Award,
  Zap,
  Target,
  Activity,
  BarChart3
} from "lucide-react";

interface ProgressHistoryCardProps {
  type: 'weekly' | 'trend' | 'streak' | 'monthly';
  message: string;
  subtext: string;
  indicator: 'up' | 'stable' | 'gentle' | 'balanced';
  category: 'speed' | 'focus' | 'consistency' | 'momentum' | 'growth';
  value?: number;
  trend?: 'improving' | 'stable' | 'balanced';
}

const indicatorConfig = {
  up: {
    icon: TrendingUp,
    color: '#B8EBD0', // Pastel Mint
    bgColor: '#F5FDF9',
    label: 'Growing',
  },
  stable: {
    icon: Minus,
    color: '#A7C7E7', // Pastel Blue
    bgColor: '#F5F9FD',
    label: 'Stable',
  },
  gentle: {
    icon: Activity,
    color: '#C7B8EA', // Pastel Lavender
    bgColor: '#F9F7FD',
    label: 'Balanced',
  },
  balanced: {
    icon: Target,
    color: '#F8D4C7', // Pastel Peach
    bgColor: '#FEF9F7',
    label: 'Harmonious',
  },
};

const categoryIcons = {
  speed: Zap,
  focus: Target,
  consistency: BarChart3,
  momentum: TrendingUp,
  growth: Award,
};

export function ProgressHistoryCard({
  type,
  message,
  subtext,
  indicator,
  category,
  value,
  trend,
}: ProgressHistoryCardProps) {
  const config = indicatorConfig[indicator];
  const IndicatorIcon = config.icon;
  const CategoryIcon = categoryIcons[category] || Activity; // Fallback to Activity icon

  return (
    <Card className="border-0 hover-lift animate-bloom opacity-0 transition-all duration-200" style={{
      backgroundColor: config.bgColor,
      borderRadius: '28px',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)',
    }}>
      <CardContent className="p-7">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="p-3 rounded-2xl flex-shrink-0" style={{ 
            backgroundColor: config.color,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
          }}>
            <CategoryIcon className="h-6 w-6" style={{ color: '#FFFCF9' }} />
          </div>
          <Badge className="rounded-full px-4 py-1.5 text-[13px] font-medium border-0" style={{
            backgroundColor: config.color,
            color: '#4B4B4B',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
          }}>
            <IndicatorIcon className="h-3.5 w-3.5 mr-1.5" />
            {config.label}
          </Badge>
        </div>
        
        <div className="space-y-3">
          <p className="text-[16px] font-medium leading-relaxed" style={{ color: '#4B4B4B' }}>
            {message}
          </p>
          <p className="text-[15px] leading-relaxed" style={{ color: '#6F6F6F' }}>
            {subtext}
          </p>
          
          {value !== undefined && (
            <div className="mt-5 pt-5 border-t" style={{ borderColor: config.color, opacity: 0.3 }}>
              <span className="text-3xl font-semibold" style={{ color: config.color }}>
                {value}
              </span>
              <span className="text-[14px] ml-3" style={{ color: '#6F6F6F' }}>
                {type === 'monthly' ? 'this month' : 'this week'}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
