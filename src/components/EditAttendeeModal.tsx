import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Phone, MapPin, Heart, AlertTriangle } from 'lucide-react';
import { Attendee, AttendeeType } from '../types';

interface EditAttendeeModalProps {
  isOpen: boolean;
  attendee: Attendee | null;
  onClose: () => void;
  onUpdate: (updated: Attendee) => void;
  onDelete: (id: string) => void;
  availableZones: string[];
}

export const EditAttendeeModal: React.FC<EditAttendeeModalProps> = ({
  isOpen,
  attendee,
  onClose,
  onUpdate,
  onDelete,
  availableZones,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [zone, setZone] = useState('');
  const [customZone, setCustomZone] = useState('');
  const [isCustomZone, setIsCustomZone] = useState(false);
  const [type, setType] = useState<AttendeeType>('visitante');
  const [notes, setNotes] = useState('');
  const [prayerRequest, setPrayerRequest] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (attendee) {
      setFirstName(attendee.firstName);
      setLastName(attendee.lastName);
      setPhone(attendee.phone);
      setZone(attendee.zone);
      setType(attendee.type);
      setNotes(attendee.notes || '');
      setPrayerRequest(attendee.prayerRequest || '');
      setIsCustomZone(!availableZones.includes(attendee.zone));
      if (!availableZones.includes(attendee.zone)) {
        setCustomZone(attendee.zone);
      }
      setShowDeleteConfirm(false);
    }
  }, [attendee, availableZones]);

  if (!isOpen || !attendee) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;

    const finalZone = isCustomZone ? (customZone.trim() || 'Zona General') : zone;

    const updated: Attendee = {
      ...attendee,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      zone: finalZone,
      type,
      notes: notes.trim() || undefined,
      prayerRequest: prayerRequest.trim() || undefined,
    };

    onUpdate(updated);
    onClose();
  };

  const handleDelete = () => {
    onDelete(attendee.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Editar Datos del Registrado</h2>
            <p className="text-xs text-slate-300">Actualizar información de contacto, zona y notas</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
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
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900"
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
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                Celular / Teléfono
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Tipo / Rol
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AttendeeType)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900"
              >
                <option value="visitante">Visitante por 1ra vez</option>
                <option value="recurrente">Visitante recurrente (Amigo de la casa)</option>
                <option value="miembro">Miembro / Servidor</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                Lugar o Zona
              </label>
              <button
                type="button"
                onClick={() => setIsCustomZone(!isCustomZone)}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 underline"
              >
                {isCustomZone ? 'Elegir de la lista' : '+ Escribir otra zona'}
              </button>
            </div>

            {isCustomZone ? (
              <input
                type="text"
                value={customZone}
                onChange={(e) => setCustomZone(e.target.value)}
                placeholder="Escribe la zona..."
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900"
              />
            ) : (
              <select
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900"
              >
                {availableZones.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              Petición de Oración
            </label>
            <input
              type="text"
              value={prayerRequest}
              onChange={(e) => setPrayerRequest(e.target.value)}
              placeholder="Petición de oración o motivo especial"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Notas Adicionales
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 resize-none"
            />
          </div>

          {/* Delete Danger Zone */}
          <div className="pt-3 border-t border-slate-100">
            {showDeleteConfirm ? (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-rose-800 text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>¿Confirmar eliminación de este registro y todo su historial de asistencia?</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-800"
                  >
                    No, cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-3 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs"
                  >
                    Sí, eliminar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar este registro
              </button>
            )}
          </div>

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
              className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-sm flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
