import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  Users, 
  UserPlus, 
  Calendar, 
  MapPin, 
  ArrowUpRight, 
  Sparkles,
  PieChart,
  CheckCircle2,
  CalendarCheck2
} from 'lucide-react';
import { Attendee, DayInfo, ChurchEvent } from '../types';

interface WeeklyStatsViewProps {
  attendees: Attendee[];
  events: ChurchEvent[];
  weekDays: DayInfo[];
}

export const WeeklyStatsView: React.FC<WeeklyStatsViewProps> = ({
  attendees,
  events,
  weekDays,
}) => {
  // Current week date list
  const currentWeekDates = useMemo(() => weekDays.map((d) => d.dateString), [weekDays]);

  // Compute metrics strictly based on real registered data
  const stats = useMemo(() => {
    let attendeesThisWeek = 0;
    let newVisitorsThisWeek = 0;
    let totalMarksInWeek = 0;

    // Day by day distribution for L, M, Mi, J, V, S, D in the active week
    const dayCounts = weekDays.map((day) => {
      let count = 0;
      let visitorsOnDay = 0;
      attendees.forEach((a) => {
        if (a.attendance && a.attendance[day.dateString]) {
          count++;
          if (a.type === 'visitante') visitorsOnDay++;
        }
      });
      return {
        label: day.label,
        fullName: day.fullName,
        dateString: day.dateString,
        count,
        visitorsOnDay,
        isToday: day.isToday,
      };
    });

    // Real per-attendee calculations
    attendees.forEach((a) => {
      let attendedInWeek = false;
      currentWeekDates.forEach((dateStr) => {
        if (a.attendance && a.attendance[dateStr]) {
          attendedInWeek = true;
          totalMarksInWeek++;
        }
      });

      if (attendedInWeek) {
        attendeesThisWeek++;
        if (a.type === 'visitante') {
          newVisitorsThisWeek++;
        }
      }
    });

    // Classification
    const totalRegistered = attendees.length;
    const totalVisitors = attendees.filter((a) => a.type === 'visitante').length;
    const totalRecurring = attendees.filter((a) => a.type === 'recurrente').length;
    const totalMembers = attendees.filter((a) => a.type === 'miembro').length;

    // Zone breakdown
    const zoneMap: Record<string, { total: number; visitors: number; members: number }> = {};
    attendees.forEach((a) => {
      const z = a.zone || 'Sin Zona';
      if (!zoneMap[z]) {
        zoneMap[z] = { total: 0, visitors: 0, members: 0 };
      }
      zoneMap[z].total++;
      if (a.type === 'visitante') {
        zoneMap[z].visitors++;
      } else {
        zoneMap[z].members++;
      }
    });

    const zoneStats = Object.entries(zoneMap)
      .map(([zone, data]) => ({ zone, ...data }))
      .sort((a, b) => b.total - a.total);

    // Retention rate: attendees who have attended on more than 1 occasion
    const multiAttendanceCount = attendees.filter(
      (a) => a.attendance && Object.values(a.attendance).filter(Boolean).length > 1
    ).length;
    const retentionRate = totalRegistered > 0 ? Math.round((multiAttendanceCount / totalRegistered) * 100) : 0;

    // Event attendance stats
    const eventStats = events.map((evt) => {
      const attendingPersons = attendees.filter(
        (a) => (evt.attendees && evt.attendees.includes(a.id)) || (evt.date && a.attendance && a.attendance[evt.date])
      );
      const visitors = attendingPersons.filter((a) => a.type === 'visitante').length;
      return {
        id: evt.id,
        title: evt.title,
        date: evt.date,
        total: attendingPersons.length,
        visitors,
        members: attendingPersons.length - visitors,
      };
    });

    return {
      attendeesThisWeek,
      newVisitorsThisWeek,
      totalMarksInWeek,
      dayCounts,
      zoneStats,
      totalRegistered,
      totalVisitors,
      totalRecurring,
      totalMembers,
      retentionRate,
      eventStats,
    };
  }, [attendees, events, currentWeekDates, weekDays]);

  // Max value for scaling day bar chart
  const maxDayCount = Math.max(...stats.dayCounts.map((d) => d.count), 1);
  const maxEventCount = Math.max(...stats.eventStats.map((e) => e.total), 1);

  return (
    <div className="space-y-6">
      {/* Overview Control Box */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <span>Estadísticas Reales del Padrón y Asistencias</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Métricas generadas 100% en base a los registros reales de visitas, asistencias marcadas y eventos
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-800 dark:text-blue-300 text-xs font-bold shrink-0">
          <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Sincronizado en Tiempo Real con Registros</span>
        </div>
      </div>

      {/* 4 KPI Cards ("Cuadros de Resumen con datos reales") */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Asistencia en la Semana Activa */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Asistencia Esta Semana
            </span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-200 dark:border-blue-900">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
              {stats.attendeesThisWeek}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">personas</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {stats.totalMarksInWeek} asistencias marcadas en total
          </p>
        </div>

        {/* KPI 2: Nuevas Visitas Registradas */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Visitas en el Sistema
            </span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-200 dark:border-emerald-900">
              <UserPlus className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
              {stats.totalVisitors}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
              {stats.newVisitorsThisWeek} activas esta semana
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Almas nuevas para seguimiento pastoral
          </p>
        </div>

        {/* KPI 3: Tasa de Retención Real */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Tasa de Retención
            </span>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg border border-indigo-200 dark:border-indigo-900">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-indigo-700 dark:text-indigo-400 tabular-nums">
              {stats.retentionRate}%
            </span>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">constancia</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Personas con más de 1 asistencia registrada
          </p>
        </div>

        {/* KPI 4: Total Padrón */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Padrón Registrado
            </span>
            <div className="p-2 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-lg border border-purple-200 dark:border-purple-900">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
              {stats.totalRegistered}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">personas</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {stats.totalMembers} miembros · {stats.totalRecurring} recurrentes · {stats.totalVisitors} visitas
          </p>
        </div>
      </div>

      {/* 2 Main Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Distribution (L, M, Mi, J, V, S, D) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white">
                Asistencia por Día (<span className="text-blue-300 font-extrabold">L, M, Mi, J, V, S, D</span>)
              </h3>
              <p className="text-xs text-slate-300">Conteo exacto de tachados en la semana activa</p>
            </div>
            <span className="text-xs font-semibold text-blue-200 bg-blue-950 border border-blue-800 px-2.5 py-1 rounded-md">
              Semana Actual
            </span>
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between">
            {/* Daily Bars */}
            <div className="h-56 flex items-end justify-between gap-2.5 pt-6 pb-2 border-b border-slate-200 dark:border-slate-800">
              {stats.dayCounts.map((day) => {
                const heightPct = day.count > 0 ? Math.max(Math.round((day.count / maxDayCount) * 100), 12) : 4;
                return (
                  <div key={day.dateString} className="flex-1 flex flex-col items-center h-full justify-end group">
                    <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity mb-1 tabular-nums">
                      {day.count}
                    </div>
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full max-w-[36px] rounded-t-lg transition-all duration-300 flex items-center justify-center ${
                        day.isToday
                          ? 'bg-blue-600 shadow-sm'
                          : day.count > 0
                          ? 'bg-slate-800 dark:bg-blue-800 hover:bg-slate-700 dark:hover:bg-blue-700'
                          : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                      title={`${day.fullName} (${day.dateString}): ${day.count} asistentes (${day.visitorsOnDay} visitas)`}
                    >
                      {day.count > 0 && (
                        <span className="text-[10px] font-bold text-white tabular-nums hidden sm:inline">
                          {day.count}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <span className={`block text-xs font-bold ${day.isToday ? 'text-blue-600 dark:text-blue-400 font-extrabold' : 'text-slate-700 dark:text-slate-300'}`}>
                        {day.label}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block -mt-0.5">
                        {day.fullName.slice(0, 3)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Muestra la concurrencia real registrada día a día</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">Total: {stats.totalMarksInWeek} asistencias</span>
            </div>
          </div>
        </div>

        {/* Real Conferences & Events Attendance */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white">Asistencia en Conferencias y Cultos</h3>
              <p className="text-xs text-slate-300">Total y proporción de visitas por evento registrado</p>
            </div>
            <span className="text-xs font-semibold text-slate-300 font-mono">
              {stats.eventStats.length} eventos
            </span>
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between">
            {stats.eventStats.length === 0 ? (
              <div className="h-56 flex flex-col items-center justify-center text-center p-4">
                <CalendarCheck2 className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No hay conferencias registradas todavía</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Crea una conferencia o culto en el submenú "Conferencias" para ver sus métricas aquí.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {stats.eventStats.map((evt) => {
                  const pct = Math.round((evt.total / maxEventCount) * 100);
                  return (
                    <div key={evt.id} className="p-3 bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white mb-1">
                        <span className="truncate max-w-[200px]">{evt.title}</span>
                        <span className="text-blue-600 dark:text-blue-400 font-mono">{evt.total} asistieron</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${evt.total > 0 ? (evt.visitors / evt.total) * 100 : 0}%` }}
                          className="bg-emerald-500 h-full"
                          title={`Visitas: ${evt.visitors}`}
                        />
                        <div
                          style={{ width: `${evt.total > 0 ? (evt.members / evt.total) * 100 : 0}%` }}
                          className="bg-blue-600 h-full"
                          title={`Miembros: ${evt.members}`}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{evt.visitors} visitas</span>
                        <span>Fecha: {evt.date}</span>
                        <span className="text-blue-600 dark:text-blue-400 font-semibold">{evt.members} miembros</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-xs"></span> Verde: Visitas</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-blue-600 rounded-xs"></span> Azul: Miembros</span>
            </div>
          </div>
        </div>
      </div>

      {/* Zone / Geographic Analytics Table framed with Navy Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold">Distribución Real por Zonas de la Iglesia</h3>
          </div>
          <span className="text-xs text-slate-300 font-mono">
            {stats.zoneStats.length} Zonas con asistentes
          </span>
        </div>

        <div className="p-6">
          {stats.zoneStats.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500 dark:text-slate-400">
              No hay personas registradas por zona aún. Al registrar personas en "Asistencia y Visitas", aparecerán aquí en tiempo real.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.zoneStats.map((z, idx) => {
                const pct = stats.totalRegistered > 0 ? Math.round((z.total / stats.totalRegistered) * 100) : 0;
                return (
                  <div key={z.zone} className="p-4 bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{z.zone}</span>
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        <span className="font-bold text-slate-900 dark:text-white tabular-nums">{z.total}</span> personas ({pct}%)
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${z.total > 0 ? (z.visitors / z.total) * 100 : 0}%` }}
                        className="bg-emerald-500 h-full"
                        title={`Visitas: ${z.visitors}`}
                      />
                      <div
                        style={{ width: `${z.total > 0 ? ((z.total - z.visitors) / z.total) * 100 : 0}%` }}
                        className="bg-blue-600 h-full"
                        title={`Miembros / Recurrentes: ${z.total - z.visitors}`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                        {z.visitors} visitas
                      </span>
                      <span className="text-blue-700 dark:text-blue-400 font-medium">
                        {z.total - z.visitors} miembros y recurrentes
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
