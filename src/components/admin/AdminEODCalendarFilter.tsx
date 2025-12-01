/**
 * 📅 Admin EOD Calendar Filter Component
 * 
 * Calendar-based filtering for Admin portal's EOD Reports section
 * Integrates with existing reportFilters state
 * 
 * IMPORTANT: This is ADDITIVE ONLY - does not modify existing functionality
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface FilterOptions {
  user: string;
  client: string;
  dateFrom: string;
  dateTo: string;
}

interface AdminEODCalendarFilterProps {
  reportFilters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
}

type QuickFilter = 'today' | 'yesterday' | 'thisWeek' | 'last7' | 'last14' | 'thisMonth' | 'lastMonth' | 'custom';

export function AdminEODCalendarFilter({
  reportFilters,
  onFilterChange,
}: AdminEODCalendarFilterProps) {
  const [activeQuickFilter, setActiveQuickFilter] = useState<QuickFilter | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: reportFilters.dateFrom ? new Date(reportFilters.dateFrom) : undefined,
    to: reportFilters.dateTo ? new Date(reportFilters.dateTo) : undefined,
  });

  // Calculate date ranges for quick filters
  const getQuickFilterDates = (filter: QuickFilter): { from: string; to: string } | null => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0];
    };
    
    switch (filter) {
      case 'today':
        return { from: formatDate(today), to: formatDate(today) };
      
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { from: formatDate(yesterday), to: formatDate(yesterday) };
      }
      
      case 'thisWeek': {
        const startOfWeek = new Date(today);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Monday
        startOfWeek.setDate(diff);
        return { from: formatDate(startOfWeek), to: formatDate(today) };
      }
      
      case 'last7': {
        const last7 = new Date(today);
        last7.setDate(last7.getDate() - 6);
        return { from: formatDate(last7), to: formatDate(today) };
      }
      
      case 'last14': {
        const last14 = new Date(today);
        last14.setDate(last14.getDate() - 13);
        return { from: formatDate(last14), to: formatDate(today) };
      }
      
      case 'thisMonth': {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return { from: formatDate(startOfMonth), to: formatDate(today) };
      }
      
      case 'lastMonth': {
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        return { from: formatDate(startOfLastMonth), to: formatDate(endOfLastMonth) };
      }
      
      default:
        return null;
    }
  };

  // Handle quick filter click
  const handleQuickFilter = (filter: QuickFilter) => {
    const dates = getQuickFilterDates(filter);
    if (dates) {
      setActiveQuickFilter(filter);
      setDateRange({
        from: new Date(dates.from),
        to: new Date(dates.to),
      });
      onFilterChange({
        ...reportFilters,
        dateFrom: dates.from,
        dateTo: dates.to,
      });
    }
  };

  // Handle custom date range selection
  const handleDateRangeChange = (range: { from: Date | undefined; to: Date | undefined }) => {
    // 🔧 FIX: Ensure 'to' is always set when 'from' is set (for single date selection)
    const normalizedRange = {
      from: range.from,
      to: range.to || range.from, // If 'to' is undefined, use 'from' (single date)
    };
    
    setDateRange(normalizedRange);
    setActiveQuickFilter('custom');
    
    if (normalizedRange.from && normalizedRange.to) {
      onFilterChange({
        ...reportFilters,
        dateFrom: normalizedRange.from.toISOString().split('T')[0],
        dateTo: normalizedRange.to.toISOString().split('T')[0],
      });
      setCalendarOpen(false);
    }
  };

  // Clear date filters
  const handleClearDateFilters = () => {
    setDateRange({ from: undefined, to: undefined });
    setActiveQuickFilter(null);
    onFilterChange({
      ...reportFilters,
      dateFrom: '',
      dateTo: '',
    });
  };

  const quickFilters: Array<{ key: QuickFilter; label: string; icon?: string }> = [
    { key: 'today', label: 'Today', icon: '📅' },
    { key: 'yesterday', label: 'Yesterday', icon: '⏮️' },
    { key: 'thisWeek', label: 'This Week', icon: '📆' },
    { key: 'last7', label: 'Last 7 Days', icon: '🗓️' },
    { key: 'last14', label: 'Last 14 Days', icon: '📊' },
    { key: 'thisMonth', label: 'This Month', icon: '🗓️' },
    { key: 'lastMonth', label: 'Last Month', icon: '📅' },
  ];

  const hasDateFilter = reportFilters.dateFrom || reportFilters.dateTo;

  return (
    <Card
      style={{
        background: 'linear-gradient(135deg, #E8D9FF 0%, #FFDDEA 50%, #D9FFF0 100%)',
        borderRadius: '24px',
        border: '2px solid rgba(255,255,255,0.5)',
        boxShadow: '0px 6px 20px rgba(0,0,0,0.08)'
      }}
    >
      <CardHeader>
        <CardTitle
          className="flex items-center gap-2 text-lg"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          <CalendarIcon className="h-5 w-5" style={{ color: '#667eea' }} />
          Filter by Date Range
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Filter Buttons */}
        <div>
          <div className="text-sm font-medium text-purple-700 mb-2">Quick Filters</div>
          <div className="flex flex-wrap gap-2">
            {quickFilters.map(filter => (
              <Button
                key={filter.key}
                size="sm"
                variant={activeQuickFilter === filter.key ? 'default' : 'outline'}
                onClick={() => handleQuickFilter(filter.key)}
                className={cn(
                  "transition-all duration-200",
                  activeQuickFilter === filter.key
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-purple-300 hover:from-purple-600 hover:to-pink-600"
                    : "bg-white/70 text-purple-700 border-purple-200 hover:bg-white hover:border-purple-300"
                )}
                style={{ borderRadius: '12px' }}
              >
                {filter.icon && <span className="mr-1">{filter.icon}</span>}
                {filter.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Calendar Picker */}
        <div>
          <div className="text-sm font-medium text-purple-700 mb-2">Custom Date Range</div>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dateRange.from && "text-muted-foreground",
                  "bg-white/70 border-purple-200 hover:bg-white hover:border-purple-300"
                )}
                style={{ borderRadius: '16px', padding: '12px 16px' }}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {dateRange.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {' - '}
                      {dateRange.to.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </>
                  ) : (
                    dateRange.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => handleDateRangeChange(range || { from: undefined, to: undefined })}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Active Filter Display & Clear Button */}
        {hasDateFilter && (
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/70 border border-purple-200">
            <div className="flex items-center gap-2">
              <Badge
                className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-purple-200"
                style={{ borderRadius: '12px', padding: '6px 12px' }}
              >
                {activeQuickFilter && activeQuickFilter !== 'custom'
                  ? quickFilters.find(f => f.key === activeQuickFilter)?.label
                  : 'Custom Range'}
              </Badge>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClearDateFilters}
              className="text-purple-600 hover:text-purple-800 hover:bg-purple-100"
              style={{ borderRadius: '12px' }}
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

