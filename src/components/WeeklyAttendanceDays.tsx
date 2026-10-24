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
            title={`${day.fullName} ${day.dateString} — ${isAttended ? 'Asistencia Marcada (Click para quitar)' : 'Sin Asistencia (Click para marcar/tachar)'}`}
            className={`
              relative flex flex-col items-center justify-center font-bold transition-all duration-150 select-none
              ${compact ? 'w-7 h-7 sm:w-8 sm:h-8 text-xs' : 'w-8 h-8 sm:w-9 sm:h-9 text-xs sm:text-sm'}
              rounded-lg cursor-pointer
              ${
                isAttended
                  ? 'bg-emerald-600 text-white shadow-xs scale-100 hover:bg-emerald-700 active:scale-95'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 border border-slate-200'
              }
              ${isToday ? 'ring-2 ring-indigo-500 ring-offset-1 font-extrabold' : ''}
            `}
          >
            {/* The day initial: L, M, Mi, J, V, S, D */}
            <span className={`relative leading-none ${isAttended ? 'line-through decoration-white/70 decoration-2' : ''}`}>
              {day.label}
            </span>

            {/* Subtle small dot indicator when attended */}
            {isAttended && (
              <span className="absolute bottom-0.5 w-1 h-1 bg-white rounded-full"></span>
            )}

            {/* Today indicator label if compact */}
            {isToday && !isAttended && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full"></span>
            )}
          </button>
        );
      })}
    </div>
  );
};
