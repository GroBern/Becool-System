import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import PageHeader from '../components/PageHeader';
import { cn } from '../lib/utils';

const HOURS = Array.from({ length: 12 }, (_, i) => i + 6);

export default function Schedule() {
  const { state } = useApp();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());

  const weekStart = new Date(currentDate);
  weekStart.setDate(currentDate.getDate() - currentDate.getDay() + 1);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  function prevWeek() { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); }
  function nextWeek() { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); }
  function goToday() { setCurrentDate(new Date()); }

  const today = new Date().toISOString().split('T')[0];
  const weekLabel = `${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  function getInstructorName(id: string) {
    return state.instructors.find(i => i.id === id)?.name || '?';
  }

  // Merge lessons + group lessons into unified schedule items
  function getItemsForDay(date: Date) {
    const dateStr = date.toISOString().split('T')[0];
    const lessons = state.lessons.filter(l => l.date === dateStr).map(l => ({
      id: l.id,
      name: l.name,
      startTime: l.startTime,
      endTime: l.endTime,
      status: l.status,
      instructors: l.instructors.map(i => getInstructorName(i.instructorId)).join(', '),
      count: `${l.studentIds.length}/${l.maxStudents}`,
      type: 'lesson' as const,
    }));
    const groups = state.groupLessons.filter(g => g.date === dateStr).map(g => ({
      id: g.id,
      name: g.name,
      startTime: g.startTime,
      endTime: g.endTime,
      status: g.status,
      instructors: g.instructors.map(i => getInstructorName(i.instructorId)).join(', '),
      count: `${g.participants.length}/${g.maxParticipants}`,
      type: 'group' as const,
    }));
    return [...lessons, ...groups];
  }

  const statusBgColors: Record<string, string> = {
    'scheduled': 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-500/20 dark:border-amber-500/40 dark:text-amber-300',
    'in-progress': 'bg-brand-light border-brand text-brand',
    'completed': 'bg-green-100 border-green-300 text-green-800 dark:bg-green-500/20 dark:border-green-500/40 dark:text-green-300',
    'cancelled': 'bg-red-100 border-red-300 text-red-800 dark:bg-red-500/20 dark:border-red-500/40 dark:text-red-300',
  };

  const typeBg: Record<string, string> = {
    'lesson': '',
    'group': 'border-l-2 border-l-blue-400',
  };

  function getLessonStyle(startTime: string, endTime: string) {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const topOffset = (sh - 6) * 64 + (sm / 60) * 64;
    const height = ((eh - sh) * 60 + (em - sm)) / 60 * 64;
    return { top: `${topOffset}px`, height: `${Math.max(height, 32)}px` };
  }

  return (
    <>
      <PageHeader
        title="Schedule"
        subtitle={weekLabel}
        action={
          <button onClick={() => navigate('/lessons')}
            className="bg-brand text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-brand/30 hover:scale-105 transition-transform flex items-center gap-2">
            <Calendar size={16} /> Manage Lessons
          </button>
        }
      />

      <div className="flex-1 overflow-hidden px-4 sm:px-6 lg:px-10 pb-6 lg:pb-10 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={prevWeek} className="w-8 h-8 rounded-lg bg-surface-dim flex items-center justify-center text-icon-default hover:bg-border-default">
              <ChevronLeft size={16} />
            </button>
            <button onClick={nextWeek} className="w-8 h-8 rounded-lg bg-surface-dim flex items-center justify-center text-icon-default hover:bg-border-default">
              <ChevronRight size={16} />
            </button>
            <button onClick={goToday} className="px-4 py-1.5 rounded-lg bg-surface-dim text-xs font-bold text-text-secondary hover:bg-border-default">
              Today
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-brand" />
              <span className="text-[10px] font-bold text-text-secondary">Private/Kids</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-[10px] font-bold text-text-secondary">Group</span>
            </div>
          </div>
          <span className="text-sm font-bold">{weekLabel}</span>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar bg-surface rounded-3xl border border-border-default shadow-sm">
          <div className="flex min-w-[900px]">
            <div className="w-16 shrink-0 border-r border-border-default">
              <div className="h-12 border-b border-border-default" />
              {HOURS.map(hour => (
                <div key={hour} className="h-16 flex items-start justify-center pt-1 border-b border-border-light">
                  <span className="text-[10px] text-text-secondary font-bold">{hour > 12 ? hour - 12 : hour}{hour >= 12 ? 'PM' : 'AM'}</span>
                </div>
              ))}
            </div>

            {weekDays.map((day, dayIdx) => {
              const dateStr = day.toISOString().split('T')[0];
              const isToday = dateStr === today;
              const items = getItemsForDay(day);

              return (
                <div key={dayIdx} className="flex-1 min-w-[120px] border-r border-border-light last:border-0">
                  <div className={cn(
                    "h-12 flex flex-col items-center justify-center border-b border-border-default sticky top-0 z-10",
                    isToday ? "bg-brand text-white" : "bg-surface"
                  )}>
                    <span className="text-[10px] font-bold uppercase">{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                    <span className="text-sm font-bold">{day.getDate()}</span>
                  </div>

                  <div className="relative">
                    {HOURS.map(hour => (
                      <div key={hour} className={cn("h-16 border-b border-border-light", isToday && "bg-brand/[0.02] dark:bg-brand/[0.05]")} />
                    ))}

                    {items.map(item => {
                      const style = getLessonStyle(item.startTime, item.endTime);
                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "absolute left-0.5 right-0.5 rounded-lg border px-1.5 py-1 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity",
                            statusBgColors[item.status],
                            typeBg[item.type]
                          )}
                          style={style}
                          onClick={() => navigate(item.type === 'group' ? '/group-lessons' : '/lessons')}
                        >
                          <div className="text-[9px] font-bold leading-tight truncate">{item.name}</div>
                          <div className="text-[8px] opacity-70 truncate">{item.startTime}-{item.endTime}</div>
                          <div className="text-[8px] opacity-70 truncate">{item.instructors}</div>
                          <div className="text-[8px] opacity-70 truncate">{item.count} {item.type === 'group' ? 'participants' : 'students'}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-6 mt-4">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-amber-100 border border-amber-300 dark:bg-amber-500/20 dark:border-amber-500/40" /><span className="text-[10px] font-bold text-text-secondary">Scheduled</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-brand-light border border-brand" /><span className="text-[10px] font-bold text-text-secondary">In Progress</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-green-100 border border-green-300 dark:bg-green-500/20 dark:border-green-500/40" /><span className="text-[10px] font-bold text-text-secondary">Completed</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-100 border border-red-300 dark:bg-red-500/20 dark:border-red-500/40" /><span className="text-[10px] font-bold text-text-secondary">Cancelled</span></div>
        </div>
      </div>
    </>
  );
}
