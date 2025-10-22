import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'meeting' | 'task' | 'call';
  color?: string;
}

interface FullCalendarViewProps {
  events: Event[];
  view: 'month' | 'week' | 'day';
  onEventClick?: (event: Event) => void;
  onDateClick?: (date: Date) => void;
}

export function FullCalendarView({ events, view, onEventClick, onDateClick }: FullCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDay = startOfMonth.getDay();
  const daysInMonth = endOfMonth.getDate();

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const previousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const previousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const nextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const formatMonthYear = () => {
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatWeek = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const formatDay = () => {
    return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const renderMonthView = () => {
    const days = [];
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Add empty cells for days before start of month
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="min-h-[100px] p-2 border border-border/50" />);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayEvents = getEventsForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();

      days.push(
        <div
          key={day}
          className={cn(
            "min-h-[100px] p-2 border border-border/50 cursor-pointer hover:bg-accent/50 transition-colors",
            isToday && "bg-primary/5"
          )}
          onClick={() => onDateClick?.(date)}
        >
          <div className={cn(
            "font-medium text-sm mb-1",
            isToday && "text-primary font-bold"
          )}>
            {day}
          </div>
          <div className="space-y-1">
            {dayEvents.slice(0, 3).map(event => (
              <div
                key={event.id}
                className={cn(
                  "text-xs p-1 rounded cursor-pointer truncate",
                  event.type === 'meeting' && "bg-blue-100 text-blue-800",
                  event.type === 'task' && "bg-green-100 text-green-800",
                  event.type === 'call' && "bg-purple-100 text-purple-800"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick?.(event);
                }}
              >
                {event.title}
              </div>
            ))}
            {dayEvents.length > 3 && (
              <div className="text-xs text-muted-foreground">
                +{dayEvents.length - 3} more
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="grid grid-cols-7 gap-0">
          {weekDays.map(day => (
            <div key={day} className="text-center font-medium p-2 bg-muted text-sm">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0 border border-border/50">
          {days}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    const days = [];
    const hours = Array.from({ length: 24 }, (_, i) => i);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(date);
    }

    return (
      <div className="overflow-auto max-h-[600px]">
        <div className="grid grid-cols-8 gap-0 min-w-[800px]">
          {/* Time column */}
          <div className="border-r border-border/50">
            <div className="h-12 border-b border-border/50" />
            {hours.map(hour => (
              <div key={hour} className="h-16 border-b border-border/50 text-xs text-muted-foreground p-1">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
            ))}
          </div>
          
          {/* Days */}
          {days.map((date, i) => {
            const dayEvents = getEventsForDate(date);
            const isToday = date.toDateString() === new Date().toDateString();
            
            return (
              <div key={i} className="border-r border-border/50">
                <div className={cn(
                  "h-12 border-b border-border/50 text-center font-medium flex flex-col justify-center",
                  isToday && "bg-primary/10"
                )}>
                  <div className="text-xs text-muted-foreground">
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className={cn(
                    "text-sm",
                    isToday && "text-primary font-bold"
                  )}>
                    {date.getDate()}
                  </div>
                </div>
                <div className="relative">
                  {hours.map(hour => (
                    <div key={hour} className="h-16 border-b border-border/50" />
                  ))}
                  {dayEvents.map(event => {
                    const startHour = event.start.getHours() + event.start.getMinutes() / 60;
                    const duration = (event.end.getTime() - event.start.getTime()) / (1000 * 60 * 60);
                    
                    return (
                      <div
                        key={event.id}
                        className={cn(
                          "absolute left-0 right-0 mx-1 p-1 rounded text-xs cursor-pointer overflow-hidden",
                          event.type === 'meeting' && "bg-blue-500 text-white",
                          event.type === 'task' && "bg-green-500 text-white",
                          event.type === 'call' && "bg-purple-500 text-white"
                        )}
                        style={{
                          top: `${startHour * 64}px`,
                          height: `${Math.max(duration * 64, 32)}px`
                        }}
                        onClick={() => onEventClick?.(event)}
                      >
                        <div className="font-medium truncate">{event.title}</div>
                        <div className="text-[10px] opacity-90">
                          {event.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayEvents = getEventsForDate(currentDate);

    return (
      <div className="overflow-auto max-h-[600px]">
        <div className="grid grid-cols-[80px_1fr] gap-0 min-w-[400px]">
          {/* Time column */}
          <div className="border-r border-border/50">
            {hours.map(hour => (
              <div key={hour} className="h-16 border-b border-border/50 text-xs text-muted-foreground p-1">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
            ))}
          </div>
          
          {/* Events */}
          <div className="relative border-r border-border/50">
            {hours.map(hour => (
              <div key={hour} className="h-16 border-b border-border/50" />
            ))}
            {dayEvents.map(event => {
              const startHour = event.start.getHours() + event.start.getMinutes() / 60;
              const duration = (event.end.getTime() - event.start.getTime()) / (1000 * 60 * 60);
              
              return (
                <div
                  key={event.id}
                  className={cn(
                    "absolute left-0 right-0 mx-2 p-2 rounded text-sm cursor-pointer",
                    event.type === 'meeting' && "bg-blue-500 text-white",
                    event.type === 'task' && "bg-green-500 text-white",
                    event.type === 'call' && "bg-purple-500 text-white"
                  )}
                  style={{
                    top: `${startHour * 64}px`,
                    height: `${Math.max(duration * 64, 48)}px`
                  }}
                  onClick={() => onEventClick?.(event)}
                >
                  <div className="font-medium">{event.title}</div>
                  <div className="text-xs opacity-90">
                    {event.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - 
                    {event.end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={view === 'month' ? previousMonth : view === 'week' ? previousWeek : previousDay}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={view === 'month' ? nextMonth : view === 'week' ? nextWeek : nextDay}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
        </div>
        <h2 className="text-lg font-semibold">
          {view === 'month' && formatMonthYear()}
          {view === 'week' && formatWeek()}
          {view === 'day' && formatDay()}
        </h2>
      </div>

      {view === 'month' && renderMonthView()}
      {view === 'week' && renderWeekView()}
      {view === 'day' && renderDayView()}
    </Card>
  );
}

