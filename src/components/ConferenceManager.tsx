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
  Users
} from 'lucide-react';
import { ChurchEvent, EventCategory, Attendee } from '../types';
import { formatSpanishDate, formatLocalDate } from '../utils/dateUtils';

interface ConferenceManagerProps {
  events: ChurchEvent[];
  attendees: Attendee[];
  activeEventId: string | null;
  onSetActiveEvent: (eventId: string) => void;
  onAddEvent: (newEvent: ChurchEvent) => void;
  onSelectEventForReport: (event: ChurchEvent) => void;
}

export const ConferenceManager: React.FC<ConferenceManagerProps> = ({
  events,
  attendees,
  activeEventId,
  onSetActiveEvent,
  onAddEvent,
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

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">
            Conferencias, Cultos y Actividades de la Iglesia
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Administra eventos y genera reportes automáticos de visitas y asistencia en tiempo real
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Conferencia / Actividad</span>
        </button>
      </div>

      {/* Grid of Events or Empty State */}
      {events.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">No hay conferencias o actividades creadas</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              La página está en blanco lista para que ingreses los cultos, conferencias o vigilias reales de tu iglesia.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Primera Conferencia o Culto</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((evt) => {
            const isActive = evt.id === activeEventId;
            const totalAttending = evt.attendees.length;

          // Count visitors among attendees
          const visitorsCount = evt.attendees.filter((id) => {
            const person = attendees.find((a) => a.id === id);
            return person && person.type === 'visitante';
          }).length;

          const categoryBadgeColor = {
            conferencia: 'bg-indigo-50 text-indigo-700 border-indigo-200',
            culto: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            jovenes: 'bg-amber-50 text-amber-700 border-amber-200',
            oracion: 'bg-purple-50 text-purple-700 border-purple-200',
            mujeres: 'bg-pink-50 text-pink-700 border-pink-200',
            varones: 'bg-blue-50 text-blue-700 border-blue-200',
            ninos: 'bg-yellow-50 text-yellow-700 border-yellow-200',
            taller: 'bg-teal-50 text-teal-700 border-teal-200',
            otro: 'bg-slate-50 text-slate-700 border-slate-200',
          }[evt.category] || 'bg-slate-50 text-slate-700 border-slate-200';

          return (
            <div
              key={evt.id}
              className={`bg-white rounded-2xl p-5 border transition-all ${
                isActive
                  ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-md'
                  : 'border-slate-200 shadow-xs hover:border-slate-300'
              } flex flex-col justify-between`}
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-md border ${categoryBadgeColor} capitalize`}>
                    {evt.category}
                  </span>
                  {isActive ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Evento Activo
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSetActiveEvent(evt.id)}
                      className="text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors"
                    >
                      Activar este evento
                    </button>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {evt.title}
                </h3>

                {evt.speaker && (
                  <p className="text-xs text-indigo-700 font-medium mt-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Expositor: {evt.speaker}
                  </p>
                )}

                <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                  {evt.description || 'Actividad congregacional de edificación y comunión.'}
                </p>

                {/* Details */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {formatSpanishDate(evt.date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {evt.time} hrs
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {evt.location}
                  </span>
                </div>
              </div>

              {/* Footer stats & actions */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1 font-semibold text-slate-900">
                    <Users className="w-4 h-4 text-slate-500" />
                    <span className="tabular-nums">{totalAttending}</span> asistentes
                  </div>
                  <div className="text-emerald-700 font-medium">
                    <span className="tabular-nums font-bold">{visitorsCount}</span> visitas
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectEventForReport(evt)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 border border-indigo-200 rounded-xl transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Reporte Detallado</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Modal to add new event */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold">Crear Nueva Conferencia o Actividad</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre del Evento o Conferencia <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej. Conferencia de Avivamiento y Familia 2026"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Categoría
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as EventCategory)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white"
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
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Expositor o Predicador
                  </label>
                  <input
                    type="text"
                    value={speaker}
                    onChange={(e) => setSpeaker(e.target.value)}
                    placeholder="Ej. Pastor Invitado"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Fecha
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Hora
                  </label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Lugar o Auditorio
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ej. Auditorio Principal o Salón Anexo"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Descripción o Propósito
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalles sobre el enfoque de la reunión..."
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
                >
                  Guardar Conferencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
