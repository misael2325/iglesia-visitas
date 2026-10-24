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
  onOpenWhatsApp: (attendee: Attendee) => void;
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
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search Input with Search Button */}
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  // also update live search for instant results
                  setActiveSearch(e.target.value.trim().toLowerCase());
                }}
                placeholder="Buscar por nombre, apellido, celular o zona..."
                className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              {searchTerm && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-md"
                  title="Limpiar búsqueda"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl transition-colors shrink-0 shadow-xs flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Buscar</span>
            </button>
          </form>

          {/* Quick Filter dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter by Type */}
            <div className="flex items-center gap-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="py-2 px-3 text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Todos los registros ({attendees.length})</option>
                <option value="visitante">Solo Visitas Nuevas</option>
                <option value="recurrente">Visitantes Recurrentes</option>
                <option value="miembro">Miembros y Servidores</option>
              </select>
            </div>

            {/* Filter by Zone */}
            <div className="flex items-center gap-1.5 text-xs">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="py-2 px-3 text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
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
              className="py-2 px-3.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950 rounded-xl transition-colors shadow-xs flex items-center gap-1.5 ml-auto sm:ml-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Registrar Visita</span>
            </button>
          </div>
        </div>

        {/* Weekly Navigator Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Control Semanal:</span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={onPrevWeek}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
                title="Semana anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onCurrentWeek}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  weekOffset === 0
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semana Actual
              </button>
              <button
                type="button"
                onClick={onNextWeek}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
                title="Semana siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <span className="text-xs font-medium text-slate-600 ml-1">
              Del <span className="font-semibold text-slate-900">{startDateLabel}</span> al <span className="font-semibold text-slate-900">{endDateLabel}</span>
            </span>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-4 text-xs">
            <div className="text-slate-600">
              Registrados: <span className="font-bold text-slate-900 tabular-nums">{filteredAttendees.length}</span>
            </div>
            <div className="text-slate-600">
              Asistieron en la semana: <span className="font-bold text-emerald-600 tabular-nums">{weekStats.attendeesThisWeekCount}</span>
            </div>
            <div className="text-slate-600">
              Hoy: <span className="font-bold text-indigo-600 tabular-nums">{weekStats.attendeesTodayCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table / Card View of Attendees */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white">Registro de Asistencia y Visitas</h3>
              <p className="text-xs text-slate-300">
                Toca las iniciales de los días (<span className="text-indigo-300 font-semibold">L, M, Mi, J, V, S, D</span>) para tachar la asistencia en tiempo real
              </p>
            </div>
          </div>

          {/* Active Event Indicator */}
          {activeEvent && (
            <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
              <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="text-slate-300 truncate max-w-[220px]">
                Evento activo: <strong className="text-white">{activeEvent.title}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Days Header Guide on Desktop */}
        <div className="hidden lg:flex items-center justify-between px-6 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <div className="w-1/3">Nombre y Contacto</div>
          <div className="w-1/4">Zona / Lugar y Tipo</div>
          <div className="w-1/3 text-center">
            Días de la Semana (<span className="text-indigo-600">Lunes a Domingo</span>)
          </div>
          <div className="w-24 text-right">Acciones</div>
        </div>

        {/* Attendee Rows */}
        {filteredAttendees.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <Search className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800">No se encontraron personas registradas</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Prueba cambiando los términos de búsqueda o registra una nueva visita usando el botón superior.
            </p>
            <button
              type="button"
              onClick={onOpenRegister}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Registrar Primera Visita
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
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
                  className="px-4 sm:px-6 py-3.5 hover:bg-slate-50/80 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                >
                  {/* Left Column: Name, Phone, and notes preview */}
                  <div className="lg:w-1/3 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 hover:text-indigo-600 cursor-pointer" onClick={() => onEditAttendee(person)}>
                        {person.firstName} {person.lastName}
                      </span>
                      {person.type === 'visitante' && (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          Visita 1ra Vez
                        </span>
                      )}
                      {person.type === 'recurrente' && (
                        <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                          Amigo Recurrente
                        </span>
                      )}
                      {person.type === 'miembro' && (
                        <span className="text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                          Miembro
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <a
                        href={`tel:${getCleanPhoneNumber(person.phone)}`}
                        className="flex items-center gap-1 text-slate-600 hover:text-indigo-600 font-mono transition-colors"
                        title="Llamar por teléfono"
                      >
                        <Phone className="w-3 h-3 text-slate-400" />
                        {person.phone}
                      </a>
                      <span className="text-slate-300">·</span>
                      <span className="flex items-center gap-1 text-slate-600">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {person.zone}
                      </span>
                    </div>

                    {/* Prayer request or notes if present */}
                    {(person.prayerRequest || person.notes) && (
                      <p className="text-xs text-slate-500 italic truncate max-w-sm">
                        {person.prayerRequest ? `Oración: ${person.prayerRequest}` : person.notes}
                      </p>
                    )}
                  </div>

                  {/* Middle: Zone & Active Event quick-badge */}
                  <div className="lg:w-1/4 flex flex-col gap-1 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      {activeEvent && (
                        <button
                          type="button"
                          onClick={() => onToggleEventAttendance(person.id, activeEvent.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
                            isEventAttended
                              ? 'bg-indigo-600 text-white border-indigo-700'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
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
                  <div className="lg:w-1/3 flex items-center justify-between lg:justify-center gap-3">
                    <div className="flex flex-col items-center gap-1">
                      <WeeklyAttendanceDays
                        days={weekDays}
                        attendance={person.attendance}
                        onToggleDay={(dateString) => onToggleDayAttendance(person.id, dateString)}
                      />
                      <span className="text-xs text-slate-500 tabular-nums">
                        {attendedThisWeek} de 7 días asistidos
                      </span>
                    </div>
                  </div>

                  {/* Far Right: Actions (WhatsApp, Edit) */}
                  <div className="lg:w-24 flex items-center justify-end gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenWhatsApp(person)}
                      className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors"
                      title="Enviar mensaje de WhatsApp"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditAttendee(person)}
                      className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
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
