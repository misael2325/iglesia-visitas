import React from 'react';
import { DayInfo } from '../types';

interface WeeklyAttendanceDaysProps {
  days: DayInfo[];
  attendance: Record<string, boolean>;
  onToggleDay: (dateString: string) => void;
  compact?: boolean;
}

export const WeeklyAttendanceDays: React.FC<WeeklyAttendanceDaysProps> = ({
  days,
  attendance,
  onToggleDay,
  compact = false,
}) => {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {days.map((day) => {
        const isAttended = !!attendance[day.dateString];
        const isToday = day.isToday;

        return (
          <button
            key={day.dateString}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleDay(day.dateString);
            }}
            title={`${day.fullName} (${day.dateString}) — ${
              isAttended ? 'Asistencia Marcada (Click para desmarcar)' : 'Sin Asistencia (Click para tachar asistencia)'
            }`}
            className={`
              relative flex flex-col items-center justify-center font-bold transition-all duration-150 select-none
              ${compact ? 'w-7 h-7 sm:w-8 sm:h-8 text-xs' : 'w-8 h-8 sm:w-9 sm:h-9 text-xs sm:text-sm'}
              rounded-lg cursor-pointer
              ${
                isAttended
                  ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xs border border-slate-950 dark:border-blue-500 scale-100 hover:bg-slate-800 dark:hover:bg-blue-500 active:scale-95'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-950 dark:hover:text-white border border-slate-300 dark:border-slate-700 shadow-2xs'
              }
              ${isToday ? 'ring-2 ring-blue-600 ring-offset-1 dark:ring-offset-slate-900 font-extrabold' : ''}
            `}
          >
            {/* The day initial: L, M, Mi, J, V, S, D */}
            <span className={`relative leading-none ${isAttended ? 'line-through decoration-blue-400 dark:decoration-amber-300 decoration-2' : ''}`}>
              {day.label}
            </span>

            {/* Subtle small dot indicator when attended */}
            {isAttended && (
              <span className="absolute bottom-1 w-1 h-1 bg-blue-400 dark:bg-white rounded-full" />
            )}

            {/* Today indicator label if not attended */}
            {isToday && !isAttended && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
};
