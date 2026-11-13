import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  MessageSquareQuote, 
  Check, 
  PhoneCall, 
  Calendar, 
  Edit2, 
  Save, 
  Sparkles,
  Flame
} from 'lucide-react';
import { Attendee, ChurchEvent } from '../types';
import { generateWhatsAppLink, formatSpanishDate } from '../utils/dateUtils';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendee: Attendee | null;
  activeEvent?: ChurchEvent | null;
  initialTemplate?: 'reminder' | 'welcome' | 'prayer';
}

const STORAGE_KEY_CHURCH_PHONE = 'eclesia_church_phone_v2';
const DEFAULT_CHURCH_PHONE = '+1 (809) 555-0199';

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  attendee,
  activeEvent,
  initialTemplate = 'reminder',
}) => {
  // Church phone stored configuration
  const [churchPhone, setChurchPhone] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_CHURCH_PHONE) || DEFAULT_CHURCH_PHONE;
    } catch {
      return DEFAULT_CHURCH_PHONE;
    }
  });

  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [tempPhone, setTempPhone] = useState(churchPhone);

  const handleSaveChurchPhone = () => {
    const val = tempPhone.trim() || DEFAULT_CHURCH_PHONE;
    setChurchPhone(val);
    localStorage.setItem(STORAGE_KEY_CHURCH_PHONE, val);
    setIsEditingPhone(false);
  };

  const eventName = activeEvent ? activeEvent.title : 'nuestra conferencia de hoy';
  const eventTime = activeEvent?.time ? ` a las ${activeEvent.time} hrs` : '';
  const eventLoc = activeEvent?.location ? ` en ${activeEvent.location}` : '';
  const speakerText = activeEvent?.speaker ? ` con el expositor ${activeEvent.speaker}` : '';
  const dateFormatted = activeEvent?.date ? ` (${formatSpanishDate(activeEvent.date)})` : '';

  const templates = [
    {
      id: 'reminder',
      title: '📅 Recordatorio Conferencia (Hoy)',
      badge: 'Motivación & No Faltar',
      text: attendee 
        ? `¡Hola ${attendee.firstName}! Te saludamos con mucho cariño de parte de la congregación. Queremos recordarte nuestra conferencia de hoy: "${eventName}"${speakerText}${eventTime}${eventLoc}${dateFormatted}.\n\n¡No faltes hoy! Tu lugar está reservado y creemos con fe que Dios tiene una bendición especial para tu vida y familia. Si necesitas transporte, dirección o tienes alguna consulta, comunícate con nosotros al teléfono oficial de la iglesia: ${churchPhone}. ¡Te esperamos con los brazos abiertos!`
        : '',
    },
    {
      id: 'welcome',
      title: '👋 Bienvenida Primera Vez',
      badge: 'Nuevas Visitas',
      text: attendee 
        ? `¡Hola ${attendee.firstName}! Bendiciones y un saludo muy especial de la familia de la iglesia. Fue un inmenso gozo tenerte con nosotros en ${eventName}. Esperamos que hayas sido grandemente edificado/a. ¡Nuestra iglesia es tu casa y te esperamos pronto nuevamente!`
        : '',
    },
    {
      id: 'prayer',
      title: '🙏 Oración & Acompañamiento',
      badge: 'Pastoral',
      text: attendee 
        ? `¡Hola ${attendee.firstName}! Que la paz de Dios guarde tu corazón. Te escribimos para recordarte que seguimos orando por ti${attendee.prayerRequest ? ` y por tu petición (${attendee.prayerRequest})` : ''}. Cualquier necesidad o apoyo espiritual, estamos a tu disposición al: ${churchPhone}.`
        : '',
    },
  ];

  const defaultIndex = initialTemplate === 'reminder' ? 0 : initialTemplate === 'welcome' ? 1 : 2;
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(defaultIndex);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (attendee) {
      const idx = initialTemplate === 'reminder' ? 0 : initialTemplate === 'welcome' ? 1 : 2;
      setSelectedTemplateIndex(idx);
      setMessage(templates[idx].text);
    }
  }, [attendee, initialTemplate, churchPhone, activeEvent]);

  if (!isOpen || !attendee) return null;

  const handleSelectTemplate = (idx: number) => {
    setSelectedTemplateIndex(idx);
    setMessage(templates[idx].text);
  };

  const handleOpenWhatsApp = () => {
    const url = generateWhatsAppLink(attendee.phone, message);
    window.open(url, '_blank');
    onClose();
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-emerald-700 dark:bg-emerald-800 text-white border-b border-emerald-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-800/80 rounded-lg text-emerald-200">
              <MessageSquareQuote className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-base font-bold">Enviar Mensaje de WhatsApp</h2>
              <p className="text-xs text-emerald-100">
                Destinatario: <span className="font-semibold">{attendee.firstName} {attendee.lastName}</span> ({attendee.phone})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white rounded-lg hover:bg-emerald-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Church Contact Phone Configuration Box */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider block">
                  Teléfono de Contacto de la Iglesia:
                </span>
                {isEditingPhone ? (
                  <div className="flex items-center gap-1.5 mt-1">
                    <input
                      type="text"
                      value={tempPhone}
                      onChange={(e) => setTempPhone(e.target.value)}
                      placeholder="+1 (809) 000-0000"
                      className="px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md font-mono text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={handleSaveChurchPhone}
                      className="p-1 text-xs bg-emerald-600 text-white rounded-md hover:bg-emerald-700 font-bold"
                    >
                      <Save className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {churchPhone}
                  </span>
                )}
              </div>
            </div>

            {!isEditingPhone && (
              <button
                type="button"
                onClick={() => {
                  setTempPhone(churchPhone);
                  setIsEditingPhone(true);
                }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <Edit2 className="w-3 h-3" />
                <span>Configurar</span>
              </button>
            )}
          </div>

          {/* Plantillas de Mensaje */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Seleccionar Plantilla
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {templates.map((tpl, idx) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleSelectTemplate(idx)}
                  className={`p-2.5 text-xs font-medium rounded-xl border text-left transition-all ${
                    selectedTemplateIndex === idx
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-300 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="font-bold block truncate">{tpl.title}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">{tpl.badge}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Editable text area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Mensaje a Enviar
              </label>
              <button
                type="button"
                onClick={handleCopyText}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 font-medium"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Copiado al portapapeles
                  </>
                ) : (
                  'Copiar texto'
                )}
              </button>
            </div>
            <textarea
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 resize-none font-sans leading-relaxed"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Abrir en WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
