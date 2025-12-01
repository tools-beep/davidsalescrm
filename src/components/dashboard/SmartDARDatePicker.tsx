/**
 * 📅 Smart DAR Date Picker Component
 * 
 * Calendar navigation for Smart DAR Dashboard
 * - Allows viewing historical DAR data
 * - Shows indicators for days with data
 * - "Back to Today" button
 * - Pastel macaroon theme
 * 
 * IMPORTANT: ADDITIVE ONLY - Does not modify existing metrics logic
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, RotateCcw } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { nowEST, getDateKeyEST } from "@/utils/timezoneUtils";

interface SmartDARDatePickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  userId: string;
}

// Pastel Macaroon Colors (matching Smart DAR Dashboard)
const COLORS = {
  pastelBlue: '#A7C7E7',
  pastelLavender: '#C7B8EA',
  pastelMint: '#B8EBD0',
  pastelPeach: '#F8D4C7',
  pastelYellow: '#FAE8A4',
  pastelPink: '#F7C9D4',
  cream: '#FFFCF9',
  softGray: '#EDEDED',
  warmText: '#6F6F6F',
  darkText: '#4B4B4B',
};

export function SmartDARDatePicker({ selectedDate, onDateChange, userId }: SmartDARDatePickerProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [datesWithData, setDatesWithData] = useState<Set<string>>(new Set());
  const [datesWithSurveys, setDatesWithSurveys] = useState<Set<string>>(new Set());
  const [datesWithEOD, setDatesWithEOD] = useState<Set<string>>(new Set());

  const today = nowEST();
  const isToday = getDateKeyEST(selectedDate) === getDateKeyEST(today);

  // Fetch dates with data for calendar indicators
  useEffect(() => {
    if (userId) {
      fetchDatesWithData();
    }
  }, [userId]);

  const fetchDatesWithData = async () => {
    try {
      // Fetch dates with tasks (last 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data: tasks } = await supabase
        .from('eod_time_entries')
        .select('started_at')
        .eq('user_id', userId)
        .gte('started_at', ninetyDaysAgo.toISOString());

      if (tasks) {
        const taskDates = new Set(
          tasks.map(t => getDateKeyEST(new Date(t.started_at)))
        );
        setDatesWithData(taskDates);
      }

      // Fetch dates with surveys
      const { data: surveys } = await supabase
        .from('mood_check_ins')
        .select('created_at')
        .eq('user_id', userId)
        .gte('created_at', ninetyDaysAgo.toISOString());

      if (surveys) {
        const surveyDates = new Set(
          surveys.map(s => getDateKeyEST(new Date(s.created_at)))
        );
        setDatesWithSurveys(surveyDates);
      }

      // Fetch dates with EOD submissions
      const { data: eodSubmissions } = await supabase
        .from('eod_submissions')
        .select('submitted_at')
        .eq('user_id', userId)
        .gte('submitted_at', ninetyDaysAgo.toISOString());

      if (eodSubmissions) {
        const eodDates = new Set(
          eodSubmissions.map(e => getDateKeyEST(new Date(e.submitted_at)))
        );
        setDatesWithEOD(eodDates);
      }
    } catch (error) {
      console.error('Error fetching dates with data:', error);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      // 🔧 CRITICAL FIX: Calendar gives us midnight in browser's LOCAL timezone
      // Extract year/month/day and create a proper EST date at noon
      // This prevents off-by-one errors when browser timezone != EST
      
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      
      // Create EST date string at noon (safe middle of day)
      const estDateString = `${year}-${month}-${day}T12:00:00-05:00`;
      const estDate = new Date(estDateString);
      
      console.log('📅 Calendar clicked:', format(date, 'MMM dd, yyyy'));
      console.log('📅 Browser gave us:', date.toISOString());
      console.log('📅 Created EST date:', estDate.toISOString());
      console.log('📅 EST Date Key will be:', getDateKeyEST(estDate));
      
      onDateChange(estDate);
      setCalendarOpen(false);
    }
  };

  const handleBackToToday = () => {
    onDateChange(today);
  };

  // Custom day renderer with indicators
  const getDayClassName = (date: Date) => {
    const dateKey = getDateKeyEST(date);
    const hasTask = datesWithData.has(dateKey);
    const hasSurvey = datesWithSurveys.has(dateKey);
    const hasEOD = datesWithEOD.has(dateKey);

    if (hasEOD) {
      return 'bg-gradient-to-br from-green-100 to-emerald-100 font-semibold';
    }
    if (hasTask && hasSurvey) {
      return 'bg-gradient-to-br from-blue-100 to-purple-100';
    }
    if (hasTask) {
      return 'bg-blue-50';
    }
    return '';
  };

  return (
    <Card 
      className="border-0 hover-lift transition-all duration-300"
      style={{
        background: 'linear-gradient(135deg, #E8D9FF 0%, #FFDDEA 50%, #D9FFF0 100%)',
        borderRadius: '24px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06)'
      }}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle 
            className="flex items-center gap-3 text-xl"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            <div 
              className="p-2.5 rounded-2xl"
              style={{ backgroundColor: 'rgba(255,255,255,0.7)' }}
            >
              <CalendarIcon className="h-5 w-5" style={{ color: '#667eea' }} />
            </div>
            View Historical Data
          </CardTitle>

          {!isToday && (
            <Button
              onClick={handleBackToToday}
              size="sm"
              className="rounded-full border-0 transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, #A7C7E7 0%, #B8EBD0 100%)',
                color: COLORS.darkText,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)'
              }}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Back to Today
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Selector */}
        <div className="flex items-center gap-4">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal border-0"
                style={{
                  background: 'rgba(255,255,255,0.7)',
                  borderRadius: '16px',
                  padding: '12px 16px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                }}
              >
                <CalendarIcon className="mr-2 h-4 w-4" style={{ color: '#667eea' }} />
                <span style={{ color: COLORS.darkText }}>
                  {format(selectedDate, "EEEE, MMMM d, yyyy")}
                </span>
                {isToday && (
                  <Badge 
                    className="ml-auto rounded-full px-2 py-0.5 text-xs border-0"
                    style={{
                      background: 'linear-gradient(135deg, #B8EBD0 0%, #A7C7E7 100%)',
                      color: COLORS.darkText
                    }}
                  >
                    Today
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-auto p-0 border-0" 
              align="start"
              style={{
                borderRadius: '20px',
                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.1)'
              }}
            >
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                initialFocus
                modifiers={{
                  hasTask: (date) => datesWithData.has(getDateKeyEST(date)),
                  hasSurvey: (date) => datesWithSurveys.has(getDateKeyEST(date)),
                  hasEOD: (date) => datesWithEOD.has(getDateKeyEST(date)),
                }}
                modifiersStyles={{
                  hasTask: {
                    backgroundColor: '#EBF5FF',
                    fontWeight: '500',
                  },
                  hasSurvey: {
                    backgroundColor: '#F3E8FF',
                    fontWeight: '500',
                  },
                  hasEOD: {
                    background: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)',
                    fontWeight: '600',
                  },
                }}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Legend */}
        <div 
          className="p-4 rounded-2xl space-y-2"
          style={{
            background: 'rgba(255,255,255,0.5)',
            border: '1px solid rgba(255,255,255,0.8)'
          }}
        >
          <div className="text-xs font-medium mb-2" style={{ color: COLORS.warmText }}>
            Calendar Legend:
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ background: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)' }}
              />
              <span style={{ color: COLORS.darkText }}>Complete DAR</span>
            </div>
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: '#F3E8FF' }}
              />
              <span style={{ color: COLORS.darkText }}>Has Surveys</span>
            </div>
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: '#EBF5FF' }}
              />
              <span style={{ color: COLORS.darkText }}>Has Tasks</span>
            </div>
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full border-2"
                style={{ borderColor: COLORS.pastelMint }}
              />
              <span style={{ color: COLORS.darkText }}>Today</span>
            </div>
          </div>
        </div>

        {/* Selected Date Info */}
        {!isToday && (
          <div 
            className="p-4 rounded-2xl text-center"
            style={{
              background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
              border: '1px solid rgba(255,255,255,0.8)'
            }}
          >
            <div className="text-sm font-medium" style={{ color: COLORS.darkText }}>
              📊 Viewing historical data for {format(selectedDate, "MMMM d, yyyy")}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

