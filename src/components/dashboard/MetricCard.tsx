import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
}

export function MetricCard({ title, value, change, changeType, icon: Icon }: MetricCardProps) {
  return (
    <Card className="bg-[hsl(0,0%,10%)] border-[hsl(0,0%,18%)] hover:border-[hsl(40,40%,30%)] transition-all duration-300 hover:shadow-lg hover:shadow-[hsl(40,50%,20%)]/10 luxury-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-[hsl(40,10%,60%)]">{title}</CardTitle>
        <div className="p-2 rounded-lg bg-[hsl(40,40%,15%)]">
          <Icon className="h-4 w-4 text-[hsl(40,50%,55%)]" />
        </div>
      </CardHeader>
      <CardContent>
        <div 
          className="text-3xl font-bold text-[hsl(40,20%,90%)]"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          {value}
        </div>
        {change && (
          <p className={`text-xs mt-1 ${
            changeType === "positive" 
              ? "text-emerald-400" 
              : changeType === "negative" 
              ? "text-red-400" 
              : "text-[hsl(40,10%,50%)]"
          }`}>
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
