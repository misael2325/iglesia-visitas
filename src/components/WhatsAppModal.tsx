import React, { useState } from 'react';
import { X, Send, MessageSquareQuote, Check } from 'lucide-react';
import { Attendee, ChurchEvent } from '../types';
import { generateWhatsAppLink } from '../utils/dateUtils';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendee: Attendee | null;
  activeEvent?: ChurchEvent | null;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  attendee,
  activeEvent,
}) => {
  if (!isOpen || !attendee) return null;

  const eventName = activeEvent ? activeEvent.title : 'nuestra congregación';

  const templates = [
    {
      title: 'Bienvenida Primera Vez',
      text: `¡Hola ${attendee.firstName}! Bendiciones y un saludo muy especial de parte de la familia de la iglesia. Fue una gran bendición tenerte con nosotros en ${eventName}. Esperamos que hayas disfrutado este tiempo y nos encantaría verte pronto nuevamente. ¡Nuestra casa es tu casa!`,
    },
    {
      title: 'Seguimiento & Petición de Oración',
      text: `¡Hola ${attendee.firstName}! Que la gracia de Dios esté contigo y tu familia. Queríamos saludarte y recordarte que estamos orando por ti${attendee.prayerRequest ? ` y por tu petición (${attendee.prayerRequest})` : ''}. Si necesitas apoyo o consejería, estamos a tu disposición.`,
    },
    {
      title: 'Invitación a Próxima Conferencia',
      text: `¡Hola ${attendee.firstName}! Te saludamos con mucho cariño. Queremos invitarte a nuestra próxima actividad en la iglesia: "${eventName}". ¡Será un tiempo de gran refrigerio espiritual para tu vida!`,
    },
  ];

  const [message, setMessage] = useState(templates[0].text);
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);
  const [copied, setCopied] = useState(false);

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
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        role="dialog"
      >
        <div className="flex items-center justify-between px-6 py-4 bg-emerald-700 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-800/80 rounded-lg text-emerald-200">
              <MessageSquareQuote className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-base font-bold">Enviar Mensaje de WhatsApp</h2>
              <p className="text-xs text-emerald-100">
                Contacto a: <span className="font-semibold">{attendee.firstName} {attendee.lastName}</span> ({attendee.phone})
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
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Plantillas de Mensaje Rápido
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {templates.map((tpl, idx) => (
                <button
                  key={tpl.title}
                  type="button"
                  onClick={() => handleSelectTemplate(idx)}
                  className={`px-2.5 py-2 text-xs font-medium rounded-xl border text-left transition-all ${
                    selectedTemplateIndex === idx
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {tpl.title}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Mensaje Personalizado
              </label>
              <button
                type="button"
                onClick={handleCopyText}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Copiado
                  </>
                ) : (
                  'Copiar texto'
                )}
              </button>
            </div>
            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-900 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Abrir en WhatsApp Web / App
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
