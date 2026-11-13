import React, { useState } from 'react';
import { 
  Calendar, 
  Plus, 
  MapPin, 
  Clock, 
  UserCheck, 
  FileText, 
  CheckCircle2, 
  Sparkles,
  Users,
  Trash2,
  X,
  Search,
  Check
} from 'lucide-react';
import { ChurchEvent, EventCategory, Attendee } from '../types';
import { formatSpanishDate, formatLocalDate } from '../utils/dateUtils';

interface ConferenceManagerProps {
  events: ChurchEvent[];
  attendees: Attendee[];
  activeEventId: string | null;
  onSetActiveEvent: (eventId: string) => void;
  onAddEvent: (newEvent: ChurchEvent) => void;
  onDeleteEvent?: (eventId: string) => void;
  onToggleEventAttendance?: (attendeeId: string, eventId: string) => void;
  onSelectEventForReport: (event: ChurchEvent) => void;
}

export const ConferenceManager: React.FC<ConferenceManagerProps> = ({
  events,
  attendees,
  activeEventId,
  onSetActiveEvent,
  onAddEvent,
  onDeleteEvent,
  onToggleEventAttendance,
  onSelectEventForReport,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EventCategory>('conferencia');
  const [date, setDate] = useState(formatLocalDate(new Date()));
  const [time, setTime] = useState('19:00');
  const [location, setLocation] = useState('Auditorio Principal');
  const [speaker, setSpeaker] = useState('');
  const [description, setDescription] = useState('');

  // Attendee management modal for a specific event
  const [managingEvent, setManagingEvent] = useState<ChurchEvent | null>(null);
  const [attendeeSearch, setAttendeeSearch] = useState('');

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newEvent: ChurchEvent = {
      id: `evt-${Date.now()}`,
      title: title.trim(),
      category,
      date,
      time,
      location: location.trim() || 'Auditorio Principal',
      speaker: speaker.trim() || undefined,
      description: description.trim(),
      attendees: [],
    };

    onAddEvent(newEvent);
    // Reset form
    setTitle('');
    setDescription('');
    setSpeaker('');
    setShowAddModal(false);
  };

  const activeEvent = events.find((e) => e.id === activeEventId) || null;

  return (
    <div className="space-y-6">
      {/* Top Control Bar with Quick Stats */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <span>Conferencias, Cultos y Actividades de la Iglesia</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Administra eventos y genera reportes automáticos de visitas y asistencia en tiempo real
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="w-full sm:w-auto min-h-[44px] py-2.5 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Conferencia / Actividad</span>
            </button>
          </div>
        </div>

        {/* Quick Metrics Bar identical to AttendeeList */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
            <div>
              Total Actividades: <span className="font-bold text-slate-900 dark:text-white tabular-nums">{events.length}</span>
            </div>
            <div>
              {activeEvent ? (
                <span>
                  Actividad en Curso: <strong className="text-blue-600 dark:text-blue-400">{activeEvent.title}</strong>
                </span>
              ) : (
                <span className="text-slate-400 dark:text-slate-500">Ningún evento seleccionado como activo</span>
              )}
            </div>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Toca <strong>"Activar este evento"</strong> para vincularlo a las marcas de asistencia del día
          </div>
        </div>
      </div>

      {/* Main Framed Card with Navy Title Bar (matching Asistencia y Visitas) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Table Header Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-blue-400 shrink-0" />
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white">Catálogo de Conferencias y Actividades</h3>
              <p className="text-xs text-slate-300">
                Información organizada en cuadros con fecha, hora, auditorio, expositor y reporte por evento
              </p>
            </div>
          </div>

          {/* Active Event Indicator */}
          {activeEvent && (
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="text-slate-300 truncate max-w-[240px]">
                Activo: <strong className="text-white">{activeEvent.title}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Content Section: Events Grid framed in boxes */}
        {events.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <Calendar className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No hay conferencias o actividades creadas</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Ingresa los cultos, conferencias o vigilias reales de tu iglesia para comenzar el registro.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Primera Conferencia o Culto</span>
            </button>
          </div>
        ) : (
          <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            {events.map((evt) => {
              const isActive = evt.id === activeEventId;

              // Synchronized count: person is in evt.attendees OR has attended on evt.date
              const eventAttendeesList = attendees.filter((a) => {
                const inList = evt.attendees && evt.attendees.includes(a.id);
                const onDate = evt.date && a.attendance && !!a.attendance[evt.date];
                return inList || onDate;
              });

              const totalAttending = eventAttendeesList.length;
              const visitorsCount = eventAttendeesList.filter((a) => a.type === 'visitante').length;

              const categoryBadgeColor = {
                conferencia: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
                culto: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
                jovenes: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
                oracion: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
                mujeres: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/60 dark:text-pink-300 dark:border-pink-800',
                varones: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
                ninos: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/60 dark:text-yellow-300 dark:border-yellow-800',
                taller: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800',
                otro: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
              }[evt.category] || 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

              return (
                <div
                  key={evt.id}
                  className={`rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                    isActive
                      ? 'bg-blue-50/20 dark:bg-blue-950/20 border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                      : 'bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header Row: Category Badge + Active status + Delete */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${categoryBadgeColor}`}>
                          {evt.category}
                        </span>
                        {isActive && (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-blue-700 dark:text-blue-400 bg-blue-100/70 dark:bg-blue-950/80 px-2 py-0.5 rounded-lg border border-blue-300 dark:border-blue-800">
                            <CheckCircle2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            <span>Activo</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {!isActive && (
                          <button
                            type="button"
                            onClick={() => onSetActiveEvent(evt.id)}
                            className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
                          >
                            Activar
                          </button>
                        )}
                        {onDeleteEvent && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`¿Deseas eliminar la conferencia "${evt.title}"?`)) {
                                onDeleteEvent(evt.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors"
                            title="Eliminar evento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Title & Speaker */}
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                        {evt.title}
                      </h3>
                      {evt.speaker && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-1 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Expositor: {evt.speaker}</span>
                        </p>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                      {evt.description || 'Actividad congregacional de edificación y comunión.'}
                    </p>

                    {/* Highlighted Information Boxes */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                      {/* Box 1: Date */}
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                        <div className="min-w-0">
                          <span className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 leading-tight">Fecha</span>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block">
                            {formatSpanishDate(evt.date)}
                          </span>
                        </div>
                      </div>

                      {/* Box 2: Time */}
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                        <div className="min-w-0">
                          <span className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 leading-tight">Horario</span>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono truncate block">
                            {evt.time} hrs
                          </span>
                        </div>
                      </div>

                      {/* Box 3: Location */}
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2 col-span-2 sm:col-span-1">
                        <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                        <div className="min-w-0">
                          <span className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 leading-tight">Auditorio</span>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block">
                            {evt.location}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Stats & Report CTA */}
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    {/* Attendance Boxes */}
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setManagingEvent(evt)}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 transition-colors"
                        title="Ver y marcar lista de asistentes para esta conferencia"
                      >
                        <Users className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                        <span className="text-slate-600 dark:text-slate-400">Asistieron:</span>
                        <strong className="text-slate-900 dark:text-white tabular-nums">{totalAttending}</strong>
                      </button>

                      <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Visitas:</span>
                        <strong className="tabular-nums font-bold">{visitorsCount}</strong>
                      </div>
                    </div>

                    {/* Report button */}
                    <button
                      type="button"
                      onClick={() => onSelectEventForReport(evt)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-xl transition-colors shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Ver Reporte</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal to add new event */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92dvh] flex flex-col pb-safe animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 sm:px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold">Crear Nueva Conferencia o Actividad</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-white text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Nombre del Evento o Conferencia <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej. Conferencia de Avivamiento y Familia 2026"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Categoría
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as EventCategory)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-slate-100"
                  >
                    <option value="conferencia">Conferencia Especial</option>
                    <option value="culto">Culto General</option>
                    <option value="jovenes">Reunión de Jóvenes</option>
                    <option value="oracion">Vigilia / Oración</option>
                    <option value="mujeres">Ministerio de Mujeres</option>
                    <option value="varones">Ministerio de Varones</option>
                    <option value="ninos">Escuela Bíblica Infantil</option>
                    <option value="taller">Taller / Seminario</option>
                    <option value="otro">Otra Actividad</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Expositor o Predicador
                  </label>
                  <input
                    type="text"
                    value={speaker}
                    onChange={(e) => setSpeaker(e.target.value)}
                    placeholder="Ej. Pastor Invitado"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Fecha
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Hora
                  </label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Lugar o Auditorio
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ej. Auditorio Principal o Salón Anexo"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Descripción o Propósito
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalles sobre el enfoque de la reunión..."
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 resize-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="min-h-[44px] px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 sm:bg-transparent rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-xs"
                >
                  Guardar Conferencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal to view & toggle attendees directly for an event */}
      {managingEvent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90dvh] pb-safe">
            <div className="px-5 sm:px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Users className="w-5 h-5 text-blue-400 shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-sm font-bold truncate">Asistentes: {managingEvent.title}</h3>
                  <p className="text-[11px] text-slate-300">Tacha o desmarca quién asistió a esta conferencia</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setManagingEvent(null)}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-white shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={attendeeSearch}
                onChange={(e) => setAttendeeSearch(e.target.value)}
                placeholder="Buscar por nombre, apellido o zona..."
                className="w-full text-xs bg-transparent border-0 focus:outline-hidden text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {attendees.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400">
                  No hay personas registradas en el padrón todavía.
                </div>
              ) : (
                attendees
                  .filter((a) => {
                    if (!attendeeSearch) return true;
                    const q = attendeeSearch.toLowerCase();
                    return `${a.firstName} ${a.lastName}`.toLowerCase().includes(q) || a.zone.toLowerCase().includes(q);
                  })
                  .map((person) => {
                    const isAttending =
                      (managingEvent.attendees && managingEvent.attendees.includes(person.id)) ||
                      (managingEvent.date && person.attendance && !!person.attendance[managingEvent.date]);

                    return (
                      <div
                        key={person.id}
                        onClick={() => {
                          if (onToggleEventAttendance) {
                            onToggleEventAttendance(person.id, managingEvent.id);
                          }
                        }}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                          isAttending
                            ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-slate-900 dark:text-white'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                              isAttending
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            {isAttending && <Check className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <span className="font-bold text-xs">
                              {person.firstName} {person.lastName}
                            </span>
                            <div className="text-[10px] text-slate-400 flex items-center gap-2">
                              <span className="capitalize">{person.type}</span>
                              <span>·</span>
                              <span>{person.zone || 'Sin Zona'}</span>
                            </div>
                          </div>
                        </div>

                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                          isAttending
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : 'text-slate-400'
                        }`}>
                          {isAttending ? 'Asistió' : 'Ausente'}
                        </span>
                      </div>
                    );
                  })
              )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setManagingEvent(null)}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
