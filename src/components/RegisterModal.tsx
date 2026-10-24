import React, { useState } from 'react';
import { X, UserPlus, Phone, MapPin, Heart, Calendar, CheckCircle2 } from 'lucide-react';
import { Attendee, AttendeeType, ChurchEvent } from '../types';
import { formatLocalDate } from '../utils/dateUtils';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (attendee: Attendee, markCurrentEvent?: boolean) => void;
  availableZones: string[];
  activeEvent?: ChurchEvent | null;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({
  isOpen,
  onClose,
  onSave,
  availableZones,
  activeEvent,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [zone, setZone] = useState(availableZones[0] || 'Zona Central');
  const [customZone, setCustomZone] = useState('');
  const [isCustomZone, setIsCustomZone] = useState(false);
  const [type, setType] = useState<AttendeeType>('visitante');
  const [notes, setNotes] = useState('');
  const [prayerRequest, setPrayerRequest] = useState('');
  const [markAttendanceToday, setMarkAttendanceToday] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;

    const finalZone = isCustomZone ? (customZone.trim() || 'Zona no especificada') : zone;
    const todayStr = formatLocalDate(new Date());

    const newAttendee: Attendee = {
      id: `att-${Date.now()}`,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      zone: finalZone,
      type,
      registeredDate: todayStr,
      notes: notes.trim() || undefined,
      prayerRequest: prayerRequest.trim() || undefined,
      attendance: markAttendanceToday ? { [todayStr]: true } : {},
    };

    onSave(newAttendee, markAttendanceToday);
    // Reset form
    setFirstName('');
    setLastName('');
    setPhone('');
    setCustomZone('');
    setIsCustomZone(false);
    setNotes('');
    setPrayerRequest('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/40 rounded-lg text-indigo-200 border border-indigo-400/30">
              <UserPlus className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">Registrar Nueva Visita o Asistente</h2>
              <p className="text-xs text-slate-300">Formulario de recepción y seguimiento para la iglesia</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Active Event Banner if present */}
          {activeEvent && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-start gap-3">
              <Calendar className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div className="text-xs text-indigo-950">
                <span className="font-semibold text-indigo-900">Evento Activo Actual:</span> {activeEvent.title}
                <p className="text-slate-600 mt-0.5">{activeEvent.location} · {activeEvent.time} hrs</p>
              </div>
            </div>
          )}

          {/* Nombre y Apellido */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Nombre <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ej. Juan Carlos"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Apellido <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Ej. Pérez González"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Celular y Tipo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                Celular / Teléfono <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej. 55 1234 5678"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Condición / Tipo
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AttendeeType)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900"
              >
                <option value="visitante">Visitante por 1ra vez</option>
                <option value="recurrente">Visitante recurrente (Amigo de la casa)</option>
                <option value="miembro">Miembro / Servidor</option>
              </select>
            </div>
          </div>

          {/* Lugar o Zona */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                Lugar o Zona de Residencia <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCustomZone(!isCustomZone)}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 underline"
              >
                {isCustomZone ? 'Elegir zona existente' : '+ Escribir otra zona'}
              </button>
            </div>

            {isCustomZone ? (
              <input
                type="text"
                value={customZone}
                onChange={(e) => setCustomZone(e.target.value)}
                placeholder="Escribe el barrio, colonia o zona..."
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400"
              />
            ) : (
              <select
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900"
              >
                {availableZones.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Petición de Oración */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              Petición de Oración o Motivo
            </label>
            <input
              type="text"
              value={prayerRequest}
              onChange={(e) => setPrayerRequest(e.target.value)}
              placeholder="Ej. Oración por salud, trabajo, bendición familiar..."
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400"
            />
          </div>

          {/* Notas de Bienvenida / Invitador */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Notas Adicionales (¿Quién le invitó?, observaciones)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Invitado por el hermano Roberto. Interesado en clases bíblicas."
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400 resize-none"
            />
          </div>

          {/* Tachar / Marcar Asistencia Inmediata */}
          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-center gap-3 p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl cursor-pointer hover:bg-emerald-50 transition-colors">
              <input
                type="checkbox"
                checked={markAttendanceToday}
                onChange={(e) => setMarkAttendanceToday(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded-sm border-slate-300 focus:ring-emerald-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Marcar asistencia inmediatamente para el día de hoy
                </span>
                <p className="text-emerald-800/80">Tacha la asistencia de hoy en tiempo real y sumará al reporte del evento actual.</p>
              </div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl transition-colors shadow-sm flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Guardar y Registrar Asistencia
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
