/**
 * 📅 EOD History Calendar Filter Component
 * 
 * Provides calendar-based filtering for EOD history with:
 * - Visual calendar component
 * - Date range picker
 * - Quick filter buttons (Today, Week, Month, etc.)
 * - Summary statistics for filtered period
 * - Pastel macaroon theme matching Smart DAR Dashboard
 * 
 * IMPORTANT: This is ADDITIVE ONLY - does not modify existing functionality
 */

import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Clock, Activity, TrendingUp, CheckCircle2, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  roundHours,
  calculateShiftDuration,
  calculateActiveTaskHours,
} from "@/utils/eodCalculations";

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

interface EODHistoryCalendarFilterProps {
  allSubmissions: Submission[];
  onFilteredSubmissionsChange: (filtered: Submission[]) => void;
}

type QuickFilter = 'today' | 'yesterday' | 'thisWeek' | 'last7' | 'last14' | 'thisMonth' | 'lastMonth' | 'custom' | null;

export function EODHistoryCalendarFilter({
  allSubmissions,
  onFilteredSubmissionsChange,
}: EODHistoryCalendarFilterProps) {
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [activeQuickFilter, setActiveQuickFilter] = useState<QuickFilter>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Calculate date ranges for quick filters
  const getQuickFilterDates = (filter: QuickFilter): { from: Date; to: Date } | null => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (filter) {
      case 'today':
        return { from: today, to: today };
      
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { from: yesterday, to: yesterday };
      }
      
      case 'thisWeek': {
        const startOfWeek = new Date(today);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Monday
        startOfWeek.setDate(diff);
        return { from: startOfWeek, to: today };
      }
      
      case 'last7': {
        const last7 = new Date(today);
        last7.setDate(last7.getDate() - 6);
        return { from: last7, to: today };
      }
      
      case 'last14': {
        const last14 = new Date(today);
        last14.setDate(last14.getDate() - 13);
        return { from: last14, to: today };
      }
      
      case 'thisMonth': {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return { from: startOfMonth, to: today };
      }
      
      case 'lastMonth': {
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        return { from: startOfLastMonth, to: endOfLastMonth };
      }
      
      default:
        return null;
    }
  };

  // Handle quick filter click
  const handleQuickFilter = (filter: QuickFilter) => {
    const dates = getQuickFilterDates(filter);
    if (dates) {
      setDateRange(dates);
      setActiveQuickFilter(filter);
      const filtered = filterSubmissions(allSubmissions, dates.from, dates.to);
      onFilteredSubmissionsChange(filtered);
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
      setCalendarOpen(false);
    }
  };

  // Clear filters
  const handleClearFilters = () => {
    setDateRange({ from: undefined, to: undefined });
    setActiveQuickFilter(null);
    onFilteredSubmissionsChange(allSubmissions);
  };

  // Filter submissions by date range
  const filterSubmissions = (submissions: Submission[], from: Date, to: Date): Submission[] => {
    // Create date boundaries in local timezone (user's perspective)
    const fromTime = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0).getTime();
    const toTime = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999).getTime();
    
    return submissions.filter(sub => {
      // Parse submitted_at as local date for comparison
      const subDate = new Date(sub.submitted_at).getTime();
      return subDate >= fromTime && subDate <= toTime;
    });
  };

  // Get filtered submissions based on current date range
  const filteredSubmissions = useMemo(() => {
    if (!dateRange.from || !dateRange.to) {
      return allSubmissions;
    }
    return filterSubmissions(allSubmissions, dateRange.from, dateRange.to);
  }, [allSubmissions, dateRange]);

  // Update parent whenever filtered submissions change
  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      onFilteredSubmissionsChange(filteredSubmissions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredSubmissions, dateRange.from, dateRange.to]);

  // Calculate summary statistics for filtered period
  const summaryStats = useMemo(() => {
    // Use filteredSubmissions which is what's actually being displayed
    const submissions = filteredSubmissions;
    
    if (submissions.length === 0) {
      return {
        totalShiftHoursRaw: 0,
        totalShiftHoursRounded: 0,
        totalTaskHoursRaw: 0,
        totalTaskHoursRounded: 0,
        totalTasks: 0,
        avgUtilization: 0,
        totalPoints: 0,
      };
    }

    let totalShiftHoursRaw = 0;
    let totalTaskHoursRaw = 0;
    let totalTasks = submissions.length;

    submissions.forEach(sub => {
      const shiftHours = calculateShiftDuration(sub.clocked_in_at, sub.clocked_out_at);
      const taskHours = calculateActiveTaskHours(sub.total_active_seconds || 0);
      
      totalShiftHoursRaw += shiftHours;
      totalTaskHoursRaw += taskHours;
    });

    const avgUtilization = totalShiftHoursRaw > 0 
      ? Math.round((totalTaskHoursRaw / totalShiftHoursRaw) * 100)
      : 0;

    return {
      totalShiftHoursRaw,
      totalShiftHoursRounded: roundHours(totalShiftHoursRaw),
      totalTaskHoursRaw,
      totalTaskHoursRounded: roundHours(totalTaskHoursRaw),
      totalTasks,
      avgUtilization,
      totalPoints: totalTasks * 10, // Assuming 10 points per task
    };
  }, [filteredSubmissions]);

  // Get dates with EOD submissions for calendar highlighting
  const datesWithSubmissions = useMemo(() => {
    return allSubmissions.map(sub => {
      const date = new Date(sub.submitted_at);
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    });
  }, [allSubmissions]);

  const quickFilters: Array<{ key: QuickFilter; label: string; icon?: string }> = [
    { key: 'today', label: 'Today', icon: '📅' },
    { key: 'yesterday', label: 'Yesterday', icon: '⏮️' },
    { key: 'thisWeek', label: 'This Week', icon: '📆' },
    { key: 'last7', label: 'Last 7 Days', icon: '🗓️' },
    { key: 'last14', label: 'Last 14 Days', icon: '📊' },
    { key: 'thisMonth', label: 'This Month', icon: '🗓️' },
    { key: 'lastMonth', label: 'Last Month', icon: '📅' },
  ];

  return (
    <div className="space-y-6">
      {/* Calendar Filter Card */}
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
            className="flex items-center gap-2 text-xl"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            <CalendarIcon className="h-6 w-6" style={{ color: '#667eea' }} />
            Filter by Date Range
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick Filter Buttons */}
          <div>
            <div className="text-sm font-medium text-purple-700 mb-3">Quick Filters</div>
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
            <div className="text-sm font-medium text-purple-700 mb-3">Custom Date Range</div>
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
                  modifiers={{
                    hasSubmission: datesWithSubmissions,
                  }}
                  modifiersStyles={{
                    hasSubmission: {
                      fontWeight: 'bold',
                      textDecoration: 'underline',
                      color: '#10b981',
                    },
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Active Filter Display & Clear Button */}
          {(dateRange.from && dateRange.to) && (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/70 border border-purple-200">
              <div className="flex items-center gap-2">
                <Badge
                  className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-purple-200"
                  style={{ borderRadius: '12px', padding: '6px 12px' }}
                >
                  {activeQuickFilter && activeQuickFilter !== 'custom'
                    ? quickFilters.find(f => f.key === activeQuickFilter)?.label
                    : 'Custom Range'}
                </Badge>
                <span className="text-sm text-purple-700 font-medium">
                  {filteredSubmissions.length} {filteredSubmissions.length === 1 ? 'report' : 'reports'} found
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClearFilters}
                className="text-purple-600 hover:text-purple-800 hover:bg-purple-100"
                style={{ borderRadius: '12px' }}
              >
                <X className="h-4 w-4 mr-1" />
                Clear Filter
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Statistics Card */}
      {(dateRange.from && dateRange.to) && filteredSubmissions.length > 0 && (
        <Card
          style={{
            background: 'linear-gradient(135deg, #DDEBFF 0%, #D9FFF0 100%)',
            borderRadius: '24px',
            border: '2px solid rgba(255,255,255,0.5)',
            boxShadow: '0px 6px 20px rgba(0,0,0,0.08)'
          }}
        >
          <CardHeader>
            <CardTitle
              className="flex items-center gap-2 text-xl"
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              <TrendingUp className="h-6 w-6" style={{ color: '#3b82f6' }} />
              Period Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Total Shift Hours */}
              <div
                className="p-4 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.7)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <div className="text-xs text-blue-700 font-medium">Total Shift Hours</div>
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  {summaryStats.totalShiftHoursRounded}h
                </div>
                <div className="text-xs text-blue-600 opacity-75">
                  {summaryStats.totalShiftHoursRaw.toFixed(2)}h raw
                </div>
              </div>

              {/* Total Task Hours */}
              <div
                className="p-4 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.7)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-teal-600" />
                  <div className="text-xs text-teal-700 font-medium">Total Task Hours</div>
                </div>
                <div className="text-2xl font-bold text-teal-900">
                  {summaryStats.totalTaskHoursRounded}h
                </div>
                <div className="text-xs text-teal-600 opacity-75">
                  {summaryStats.totalTaskHoursRaw.toFixed(2)}h raw
                </div>
              </div>

              {/* Total Tasks */}
              <div
                className="p-4 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.7)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <div className="text-xs text-green-700 font-medium">Total Reports</div>
                </div>
                <div className="text-2xl font-bold text-green-900">
                  {summaryStats.totalTasks}
                </div>
                <div className="text-xs text-green-600 opacity-75">
                  {summaryStats.totalPoints} points
                </div>
              </div>

              {/* Average Utilization */}
              <div
                className="p-4 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.7)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  <div className="text-xs text-purple-700 font-medium">Avg Utilization</div>
                </div>
                <div className="text-2xl font-bold text-purple-900">
                  {summaryStats.avgUtilization}%
                </div>
                <div className="text-xs text-purple-600 opacity-75">
                  {summaryStats.avgUtilization >= 75 ? '🎯 Great!' : summaryStats.avgUtilization >= 50 ? '👍 Good' : '📈 Improving'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Results Message */}
      {(dateRange.from && dateRange.to) && filteredSubmissions.length === 0 && (
        <Card
          style={{
            background: 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)',
            borderRadius: '24px',
            border: '2px solid rgba(255,255,255,0.5)',
            boxShadow: '0px 6px 20px rgba(0,0,0,0.08)'
          }}
        >
          <CardContent className="py-12">
            <div className="text-center">
              <div className="text-6xl mb-4">📅</div>
              <h3 className="text-xl font-bold text-red-800 mb-2">
                No EOD Reports Found
              </h3>
              <p className="text-red-700">
                No reports were submitted during the selected date range.
              </p>
              <Button
                onClick={handleClearFilters}
                className="mt-4 bg-gradient-to-r from-red-100 to-pink-100 text-red-700 hover:from-red-200 hover:to-pink-200 border-red-200"
                style={{ borderRadius: '12px' }}
              >
                Clear Filter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

