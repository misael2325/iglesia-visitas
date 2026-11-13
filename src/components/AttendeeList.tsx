import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  MapPin, 
  Phone, 
  Edit3, 
  MessageSquare, 
  UserPlus, 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  X,
  CheckCircle2,
  CalendarCheck
} from 'lucide-react';
import { Attendee, AttendeeType, ChurchEvent, DayInfo } from '../types';
import { WeeklyAttendanceDays } from './WeeklyAttendanceDays';
import { getCleanPhoneNumber } from '../utils/dateUtils';

interface AttendeeListProps {
  attendees: Attendee[];
  availableZones: string[];
  weekDays: DayInfo[];
  weekOffset: number;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onCurrentWeek: () => void;
  onToggleDayAttendance: (attendeeId: string, dateString: string) => void;
  onToggleEventAttendance: (attendeeId: string, eventId: string) => void;
  onEditAttendee: (attendee: Attendee) => void;
  onOpenRegister: () => void;
  onOpenWhatsApp: (attendee: Attendee, template?: 'reminder' | 'welcome' | 'prayer') => void;
  activeEvent: ChurchEvent | null;
}

export const AttendeeList: React.FC<AttendeeListProps> = ({
  attendees,
  availableZones,
  weekDays,
  weekOffset,
  onPrevWeek,
  onNextWeek,
  onCurrentWeek,
  onToggleDayAttendance,
  onToggleEventAttendance,
  onEditAttendee,
  onOpenRegister,
  onOpenWhatsApp,
  activeEvent,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedZone, setSelectedZone] = useState<string>('all');

  // Trigger search on submit or click
  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setActiveSearch(searchTerm.trim().toLowerCase());
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setActiveSearch('');
  };

  // Filter attendees
  const filteredAttendees = useMemo(() => {
    return attendees.filter((person) => {
      // Search term
      if (activeSearch) {
        const fullName = `${person.firstName} ${person.lastName}`.toLowerCase();
        const phone = person.phone.toLowerCase();
        const zone = person.zone.toLowerCase();
        const matches = 
          fullName.includes(activeSearch) || 
          phone.includes(activeSearch) || 
          zone.includes(activeSearch);
        if (!matches) return false;
      }

      // Type filter
      if (selectedType !== 'all') {
        if (person.type !== selectedType) return false;
      }

      // Zone filter
      if (selectedZone !== 'all') {
        if (person.zone !== selectedZone) return false;
      }

      return true;
    });
  }, [attendees, activeSearch, selectedType, selectedZone]);

  // Statistics calculation for the current visible week
  const weekStats = useMemo(() => {
    const datesInWeek = weekDays.map((d) => d.dateString);
    const todayStr = weekDays.find((d) => d.isToday)?.dateString;

    let totalAttendanceMarks = 0;
    let attendeesThisWeekCount = 0;
    let attendeesTodayCount = 0;
    let newVisitorsCount = 0;

    attendees.forEach((person) => {
      if (person.type === 'visitante') newVisitorsCount++;
      let hasAttendedThisWeek = false;

      datesInWeek.forEach((dateStr) => {
        if (person.attendance[dateStr]) {
          totalAttendanceMarks++;
          hasAttendedThisWeek = true;
        }
      });

      if (hasAttendedThisWeek) attendeesThisWeekCount++;
      if (todayStr && person.attendance[todayStr]) {
        attendeesTodayCount++;
      }
    });

    return {
      totalAttendanceMarks,
      attendeesThisWeekCount,
      attendeesTodayCount,
      newVisitorsCount,
    };
  }, [attendees, weekDays]);

  const startDateLabel = weekDays[0]?.dateString || '';
  const endDateLabel = weekDays[6]?.dateString || '';

  return (
    <div className="space-y-6">
      {/* Search and Filter Control Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
          {/* Search Input with Search Button */}
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setActiveSearch(e.target.value.trim().toLowerCase());
                }}
                placeholder="Buscar por nombre, celular o zona..."
                className="w-full min-h-[42px] pl-10 pr-10 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              {searchTerm && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2 top-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-md"
                  title="Limpiar búsqueda"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="min-h-[42px] px-3.5 sm:px-4 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-xl transition-colors shrink-0 shadow-xs flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Buscar</span>
            </button>
          </form>

          {/* Quick Filter dropdowns */}
          <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Filter by Type */}
            <div className="flex items-center gap-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full sm:w-auto min-h-[40px] py-2 px-3 text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos los registros ({attendees.length})</option>
                <option value="visitante">Solo Visitas Nuevas</option>
                <option value="recurrente">Visitantes Recurrentes</option>
                <option value="miembro">Miembros y Servidores</option>
              </select>
            </div>

            {/* Filter by Zone */}
            <div className="flex items-center gap-1.5 text-xs">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="w-full sm:w-auto min-h-[40px] py-2 px-3 text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todas las Zonas</option>
                {availableZones.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>

            {/* Register New Visitor Button */}
            <button
              type="button"
              onClick={onOpenRegister}
              className="hidden sm:flex min-h-[40px] py-2 px-3.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-xl transition-colors shadow-xs items-center gap-1.5 ml-auto sm:ml-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Registrar Visita</span>
            </button>
          </div>
        </div>

        {/* Weekly Navigator Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:inline">Control Semanal:</span>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={onPrevWeek}
                className="min-w-[36px] min-h-[36px] flex items-center justify-center p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Semana anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onCurrentWeek}
                className={`min-h-[36px] px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  weekOffset === 0
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Semana Actual
              </button>
              <button
                type="button"
                onClick={onNextWeek}
                className="min-w-[36px] min-h-[36px] flex items-center justify-center p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Semana siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-white">{startDateLabel}</span> al <span className="font-semibold text-slate-900 dark:text-white">{endDateLabel}</span>
            </span>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-medium">
            <div className="text-slate-600 dark:text-slate-400">
              Registrados: <span className="font-bold text-slate-900 dark:text-white tabular-nums">{filteredAttendees.length}</span>
            </div>
            <div className="text-slate-600 dark:text-slate-400">
              Semana: <span className="font-bold text-slate-900 dark:text-white tabular-nums">{weekStats.attendeesThisWeekCount}</span>
            </div>
            <div className="text-slate-600 dark:text-slate-400">
              Hoy: <span className="font-bold text-blue-600 dark:text-blue-400 tabular-nums">{weekStats.attendeesTodayCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table / Card View of Attendees */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Table Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white">Registro de Asistencia y Visitas</h3>
              <p className="text-xs text-slate-300">
                Toca las iniciales de los días (<span className="text-blue-300 font-semibold">L, M, Mi, J, V, S, D</span>) para tachar la asistencia en tiempo real
              </p>
            </div>
          </div>

          {/* Active Event Indicator */}
          {activeEvent && (
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
              <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="text-slate-300 truncate max-w-[220px]">
                Evento activo: <strong className="text-white">{activeEvent.title}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Days Header Guide on Desktop */}
        <div className="hidden lg:flex items-center justify-between px-6 py-2.5 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          <div className="w-1/3">Nombre y Contacto</div>
          <div className="w-1/4">Zona / Lugar y Tipo</div>
          <div className="w-1/3 text-center">
            Días de la Semana (<span className="text-slate-900 dark:text-white font-extrabold">Lunes a Domingo</span>)
          </div>
          <div className="w-24 text-right">Acciones</div>
        </div>

        {/* Attendee Rows */}
        {filteredAttendees.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <Search className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No se encontraron personas registradas</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Prueba cambiando los términos de búsqueda o registra una nueva visita usando el botón superior.
            </p>
            <button
              type="button"
              onClick={onOpenRegister}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Registrar Primera Visita
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredAttendees.map((person) => {
              // Calculate attended days count for this week
              const attendedThisWeek = weekDays.filter(
                (d) => person.attendance[d.dateString]
              ).length;

              // Check if attended active event
              const isEventAttended = activeEvent ? activeEvent.attendees.includes(person.id) : false;

              return (
                <div
                  key={person.id}
                  className="px-4 sm:px-6 py-3.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                >
                  {/* Left Column: Name, Phone, and notes preview */}
                  <div className="lg:w-1/3 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors" onClick={() => onEditAttendee(person)}>
                        {person.firstName} {person.lastName}
                      </span>
                      {person.type === 'visitante' && (
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 px-2 py-0.5 rounded-md">
                          Visita 1ra Vez
                        </span>
                      )}
                      {person.type === 'recurrente' && (
                        <span className="text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 px-2 py-0.5 rounded-md">
                          Amigo Recurrente
                        </span>
                      )}
                      {person.type === 'miembro' && (
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md">
                          Miembro
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <a
                        href={`tel:${getCleanPhoneNumber(person.phone)}`}
                        className="flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-mono transition-colors"
                        title="Llamar por teléfono"
                      >
                        <Phone className="w-3 h-3 text-slate-400" />
                        {person.phone}
                      </a>
                      <span className="text-slate-300 dark:text-slate-700">·</span>
                      <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {person.zone}
                      </span>
                    </div>

                    {/* Prayer request or notes if present */}
                    {(person.prayerRequest || person.notes) && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic truncate max-w-sm">
                        {person.prayerRequest ? `Oración: ${person.prayerRequest}` : person.notes}
                      </p>
                    )}
                  </div>

                  {/* Middle: Zone & Active Event quick-badge */}
                  <div className="lg:w-1/4 flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      {activeEvent && (
                        <button
                          type="button"
                          onClick={() => onToggleEventAttendance(person.id, activeEvent.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
                            isEventAttended
                              ? 'bg-blue-600 text-white border-blue-700 dark:bg-blue-600 dark:border-blue-500'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                          title="Marcar asistencia al evento activo"
                        >
                          <CheckCircle2 className={`w-3.5 h-3.5 ${isEventAttended ? 'text-white' : 'text-slate-400'}`} />
                          <span>{isEventAttended ? 'En Conferencia' : '+ Marcar al Evento'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right: The 7 Days Initial Attendance checklist L, M, Mi, J, V, S, D */}
                  <div className="lg:w-1/3 flex items-center justify-center gap-3 overflow-x-auto no-scrollbar py-0.5">
                    <div className="flex flex-col items-center gap-1">
                      <WeeklyAttendanceDays
                        days={weekDays}
                        attendance={person.attendance}
                        onToggleDay={(dateString) => onToggleDayAttendance(person.id, dateString)}
                      />
                      <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        {attendedThisWeek} de 7 días asistidos
                      </span>
                    </div>
                  </div>

                  {/* Far Right: Actions (Conference WhatsApp Reminder, General WhatsApp, Edit) */}
                  <div className="lg:w-auto flex items-center justify-between sm:justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 lg:border-t-0 lg:pt-0 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenWhatsApp(person, 'reminder')}
                      className="min-h-[40px] flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                      title="Enviar recordatorio de la conferencia y motivar a no faltar hoy"
                    >
                      <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Recordar Hoy</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenWhatsApp(person, 'welcome')}
                      className="min-w-[40px] min-h-[40px] flex items-center justify-center p-2 text-slate-600 dark:text-slate-300 hover:text-emerald-600 bg-slate-100 dark:bg-slate-800 lg:bg-transparent hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-xl transition-colors"
                      title="Enviar otro mensaje de WhatsApp (Bienvenida u Oración)"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditAttendee(person)}
                      className="min-w-[40px] min-h-[40px] flex items-center justify-center p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 lg:bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                      title="Editar datos del registrado"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
