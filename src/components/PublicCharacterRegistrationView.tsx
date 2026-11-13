import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Sparkles, 
  Send, 
  User, 
  Phone, 
  Share2, 
  Sun, 
  Moon, 
  AlertCircle,
  Copy,
  Calendar,
  Volume2,
  Download,
  Church
} from 'lucide-react';
import { BiblicalCharacterRegistration, ContestCustomConfig, CHURCH_OPTIONS } from '../types';
import { downloadPhotoFile } from '../utils/photoStorage';
import { createPublicRegistrationShareUrl, fetchBiblicalCharactersOnline } from '../services/supabaseClient';

interface PublicCharacterRegistrationViewProps {
  onSaveRegistration: (reg: BiblicalCharacterRegistration) => Promise<boolean> | boolean;
  onOpenAppLogin?: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  contestConfig?: ContestCustomConfig;
}

export const PublicCharacterRegistrationView: React.FC<PublicCharacterRegistrationViewProps> = ({
  onSaveRegistration,
  darkMode,
  onToggleDarkMode,
  contestConfig,
}) => {
  const [nombre, setNombre] = useState('');
  const [edad, setEdad] = useState('');
  const [contacto, setContacto] = useState('');
  const [iglesia, setIglesia] = useState('');
  const [personaje, setPersonaje] = useState('');
  const [audio, setAudio] = useState<'Sí' | 'No' | ''>('No');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReg, setSubmittedReg] = useState<BiblicalCharacterRegistration | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedData, setCopiedData] = useState(false);

  // Live flyer & theme customization state
  const [activeConfig, setActiveConfig] = useState<ContestCustomConfig | undefined>(contestConfig);

  useEffect(() => {
    if (contestConfig) setActiveConfig(contestConfig);
  }, [contestConfig]);

  // When opening on a guest device, fetch latest flyer and config from database immediately
  useEffect(() => {
    fetchBiblicalCharactersOnline().then((res) => {
      if (res.success && res.contestConfig) {
        setActiveConfig(res.contestConfig);
      }
    }).catch(console.error);
  }, []);

  // Custom styling based on flyer config
  const primaryColor = activeConfig?.primaryColor || '#8a5a2b';
  const hasCoverPhoto = Boolean(activeConfig?.headerBannerUrl && activeConfig.headerBannerUrl.trim().length > 0);
  const hasThankYouFlyer = Boolean(activeConfig?.thankYouFlyerUrl && activeConfig.thankYouFlyerUrl.trim().length > 0);
  const eventTitle = activeConfig?.title || 'Inscripción – Imita tu Personaje Bíblico';
  const eventSubtitle = activeConfig?.subtitle || '¡Prepárate para dar vida a la historia sagrada!';
  const eventDateText = activeConfig?.eventDate || 'Sábado 28 de noviembre de 2026';
  const thankYouText = activeConfig?.thankYouMessage || '¡Muchas gracias por inscribirte en el concurso!';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!nombre.trim() || !contacto.trim() || !personaje.trim() || !audio || !iglesia.trim()) {
      setErrorMsg('Por favor completa todos los campos requeridos (*), incluyendo la iglesia a la que perteneces.');
      return;
    }

    setIsSubmitting(true);

    const newReg: BiblicalCharacterRegistration = {
      id: `bc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      nombre: nombre.trim(),
      edad: edad.trim() || undefined,
      contacto: contacto.trim(),
      iglesia: iglesia.trim(),
      personaje: personaje.trim(),
      audio: audio as 'Sí' | 'No',
      fecha: new Date().toISOString(),
      aprobado: false,
    };

    try {
      await onSaveRegistration(newReg);
      setSubmittedReg(newReg);
    } catch (err: any) {
      setErrorMsg('Hubo un inconveniente al guardar en línea. Tu inscripción fue copiada a tu portapapeles para que la envíes directamente.');
      const summaryText = formatRegistrationSummary(newReg);
      try {
        await navigator.clipboard.writeText(summaryText);
      } catch {}
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setNombre('');
    setEdad('');
    setContacto('');
    setIglesia('');
    setPersonaje('');
    setAudio('No');
    setSubmittedReg(null);
    setErrorMsg('');
  };

  const formatRegistrationSummary = (reg: BiblicalCharacterRegistration): string => {
    const shareLink = createPublicRegistrationShareUrl();
    return `📖 *INSCRIPCIÓN - ${eventTitle.toUpperCase()}*
📅 Evento: ${eventDateText}

👤 *Nombre y Apellido:* ${reg.nombre}
⛪ *Iglesia:* ${reg.iglesia || 'No especificada'}
🎂 *Edad:* ${reg.edad || 'No especificada'}
📱 *Contacto:* ${reg.contacto}
👑 *Personaje Bíblico:* ${reg.personaje}
🎵 *Requiere Audio:* ${reg.audio}

🔗 *Enlace de Inscripción:*
${shareLink}`;
  };

  const handleShareToWhatsApp = () => {
    if (!submittedReg) return;
    const text = formatRegistrationSummary(submittedReg);
    const cleanPhone = submittedReg.contacto.replace(/\D/g, '');
    const waUrl = cleanPhone.length >= 7 
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  const handleCopySummary = async () => {
    if (!submittedReg) return;
    try {
      await navigator.clipboard.writeText(formatRegistrationSummary(submittedReg));
      setCopiedData(true);
      setTimeout(() => setCopiedData(false), 2500);
    } catch {}
  };

  const handleCopyPublicLink = async () => {
    try {
      const shareUrl = createPublicRegistrationShareUrl();
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {}
  };

  return (
    <div className={`min-h-dvh pt-safe pb-safe ${darkMode ? 'dark bg-[#1c1712] text-[#f1e8da]' : 'bg-[#faf6ee] text-[#2b2118]'} transition-colors duration-200 flex flex-col font-serif`}>
      {/* Top Bar Navigation */}
      <header className="sticky top-0 z-40 border-b border-[#e3d8c6] dark:border-[#3d3329] bg-white/90 dark:bg-[#27201a]/90 backdrop-blur-md px-4 sm:px-6 py-3 transition-colors">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div 
              className="w-9 h-9 rounded-xl text-white flex items-center justify-center font-sans font-bold shadow-sm"
              style={{ backgroundColor: primaryColor }}
            >
              📖
            </div>
            <div>
              <span 
                className="block text-sm font-bold tracking-tight"
                style={{ color: primaryColor }}
              >
                Eclesia Eventos
              </span>
              <span className="block text-[11px] text-[#6f6357] dark:text-[#b5a893] font-sans">
                Inscripción Oficial
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyPublicLink}
              title="Copiar enlace para compartir"
              type="button"
              className="px-3 py-1.5 rounded-xl border border-[#e3d8c6] dark:border-[#3d3329] hover:bg-[#faf6ee] dark:hover:bg-[#1c1712] text-xs font-sans font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" style={{ color: primaryColor }} />
              <span className="hidden sm:inline">{copiedLink ? '¡Enlace copiado!' : 'Compartir'}</span>
            </button>

            <button
              onClick={onToggleDarkMode}
              title="Cambiar tema de color"
              type="button"
              className="p-2 rounded-xl border border-[#e3d8c6] dark:border-[#3d3329] hover:bg-[#faf6ee] dark:hover:bg-[#1c1712] text-[#6f6357] dark:text-[#b5a893] transition-colors cursor-pointer"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10">
        
        {/* CONDITIONAL COVER BANNER:
            - Solo si se coloca una foto de portada, se muestra la imagen horizontal arriba.
            - Si no se le coloca, muestra el texto predeterminado.
        */}
        {hasCoverPhoto ? (
          <div className="mb-8 rounded-3xl overflow-hidden shadow-lg border-2 border-[#e3d8c6] dark:border-[#3d3329] relative bg-black/10 dark:bg-black/40 group animate-in fade-in duration-300">
            <img
              src={activeConfig!.headerBannerUrl}
              alt={eventTitle}
              className="w-full h-48 sm:h-64 object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent flex flex-col justify-end p-4 sm:p-6 text-white">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-sans font-extrabold uppercase tracking-wide self-start mb-1 text-white border border-white/30 shadow-xs">
                <Calendar className="w-3.5 h-3.5" />
                <span>{eventDateText}</span>
              </span>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight drop-shadow-md">
                {eventTitle}
              </h1>
              {eventSubtitle && (
                <p className="text-xs sm:text-sm text-white/90 italic font-serif mt-1">
                  {eventSubtitle}
                </p>
              )}
            </div>
          </div>
        ) : (
          /* TEXTO PREDETERMINADO (Cuando no hay foto horizontal) */
          <div className="text-center space-y-3 mb-8 animate-in fade-in duration-300">
            <div className="text-4xl sm:text-5xl animate-bounce">📖</div>
            
            <h1 
              className="text-2xl sm:text-3xl font-extrabold tracking-tight"
              style={{ color: primaryColor }}
            >
              {eventTitle}
            </h1>
            
            <p className="text-xs sm:text-sm text-[#6f6357] dark:text-[#b5a893] max-w-md mx-auto italic">
              {eventSubtitle}
            </p>

            <div className="pt-1">
              <span 
                className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border-2 text-xs font-sans font-bold shadow-xs"
                style={{ borderColor: primaryColor, color: primaryColor }}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{eventDateText}</span>
              </span>
            </div>
          </div>
        )}

        {/* SUBMISSION SUCCESS CARD */}
        {submittedReg ? (
          <div className="bg-white dark:bg-[#27201a] border-2 border-[#6cc18d] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 text-center animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border-2 border-emerald-300 dark:border-emerald-700">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">
                ¡Inscripción Exitosa!
              </h2>
              <p className="text-xs sm:text-sm text-[#6f6357] dark:text-[#b5a893] font-sans">
                Gracias <strong>{submittedReg.nombre}</strong>. Tu personaje <strong>"{submittedReg.personaje}"</strong> ha quedado registrado.
              </p>
            </div>

            {/* FOTO VERTICAL DEL FLYER DANDO GRACIAS AL FINAL */}
            {hasThankYouFlyer && (
              <div className="space-y-3 pt-2 pb-1 animate-in fade-in duration-300">
                <div 
                  className="relative rounded-2xl overflow-hidden border-2 shadow-lg bg-black/5 dark:bg-black/30 mx-auto max-w-sm"
                  style={{ borderColor: primaryColor }}
                >
                  <img
                    src={activeConfig!.thankYouFlyerUrl}
                    alt="Flyer Oficial de Agradecimiento"
                    className="w-full h-auto max-h-[460px] object-contain mx-auto"
                  />
                </div>
                <div className="space-y-1.5">
                  <p 
                    className="text-xs sm:text-sm font-extrabold font-sans"
                    style={{ color: primaryColor }}
                  >
                    {thankYouText}
                  </p>
                  <button
                    type="button"
                    onClick={() => downloadPhotoFile(activeConfig!.thankYouFlyerUrl!, 'flyer-personaje-biblico.jpg')}
                    className="text-xs font-sans text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar Flyer de Recuerdo</span>
                  </button>
                </div>
              </div>
            )}

            {/* Registration Summary Box */}
            <div className="bg-[#faf6ee] dark:bg-[#1c1712] border border-[#e3d8c6] dark:border-[#3d3329] rounded-2xl p-4 text-left font-sans text-xs sm:text-sm space-y-2.5">
              <div className="flex justify-between border-b border-[#e3d8c6] dark:border-[#3d3329] pb-2">
                <span className="text-[#6f6357] dark:text-[#b5a893]">Nombre y Apellido:</span>
                <span className="font-bold text-[#2b2118] dark:text-[#f1e8da]">
                  {submittedReg.nombre}
                </span>
              </div>
              <div className="flex justify-between border-b border-[#e3d8c6] dark:border-[#3d3329] pb-2">
                <span className="text-[#6f6357] dark:text-[#b5a893]">Iglesia:</span>
                <span className="font-extrabold text-[#2b2118] dark:text-[#f1e8da] flex items-center gap-1">
                  <span>⛪</span>
                  <span>{submittedReg.iglesia || 'No especificada'}</span>
                </span>
              </div>
              <div className="flex justify-between border-b border-[#e3d8c6] dark:border-[#3d3329] pb-2">
                <span className="text-[#6f6357] dark:text-[#b5a893]">Edad:</span>
                <span className="font-bold text-[#2b2118] dark:text-[#f1e8da]">
                  {submittedReg.edad || 'No especificada'}
                </span>
              </div>
              <div className="flex justify-between border-b border-[#e3d8c6] dark:border-[#3d3329] pb-2">
                <span className="text-[#6f6357] dark:text-[#b5a893]">Contacto:</span>
                <span className="font-bold text-[#2b2118] dark:text-[#f1e8da]">
                  {submittedReg.contacto}
                </span>
              </div>
              <div className="flex justify-between border-b border-[#e3d8c6] dark:border-[#3d3329] pb-2">
                <span className="text-[#6f6357] dark:text-[#b5a893]">Personaje Bíblico:</span>
                <span className="font-extrabold" style={{ color: primaryColor }}>
                  {submittedReg.personaje}
                </span>
              </div>
              <div className="flex justify-between pt-0.5">
                <span className="text-[#6f6357] dark:text-[#b5a893]">Requiere Audio:</span>
                <span className="font-extrabold text-[#2b2118] dark:text-[#f1e8da]">
                  {submittedReg.audio === 'Sí' ? '🎵 Sí (Pista musical)' : '🎙️ No (Solo voz)'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-sans pt-1">
              <button
                type="button"
                onClick={handleShareToWhatsApp}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Phone className="w-4 h-4" />
                <span>Enviar a WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleCopySummary}
                className="w-full py-3 px-4 rounded-xl border-2 hover:bg-[#faf6ee] dark:hover:bg-[#1c1712] font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
                style={{ borderColor: primaryColor, color: primaryColor }}
              >
                <Copy className="w-4 h-4" />
                <span>{copiedData ? '¡Ficha Copiada!' : 'Copiar Comprobante'}</span>
              </button>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleResetForm}
                className="text-xs font-sans text-[#6f6357] dark:text-[#b5a893] underline hover:opacity-80 cursor-pointer"
              >
                Inscribir a otra persona
              </button>
            </div>
          </div>
        ) : (
          /* CLEAN AND DIRECT REGISTRATION FORM */
          <form onSubmit={handleSubmit} className="space-y-5">
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-sans flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="bg-white dark:bg-[#27201a] border border-[#e3d8c6] dark:border-[#3d3329] rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
              {/* 1. NOMBRE Y APELLIDO */}
              <div>
                <label className="block text-xs sm:text-sm font-bold mb-1.5 text-[#2b2118] dark:text-[#f1e8da]">
                  Nombre y Apellido <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: primaryColor }} />
                  <input
                    type="text"
                    required
                    placeholder="Ej. Josué David Peña"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-[#e3d8c6] dark:border-[#3d3329] bg-[#faf6ee] dark:bg-[#1c1712] text-[#2b2118] dark:text-[#f1e8da] focus:outline-none focus:ring-2 text-sm font-sans"
                    style={{ focusRingColor: primaryColor } as any}
                  />
                </div>
              </div>

              {/* 2. EDAD & 3. CONTACTO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold mb-1.5 text-[#2b2118] dark:text-[#f1e8da]">
                    Edad
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 14 años / Jóvenes"
                    value={edad}
                    onChange={(e) => setEdad(e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl border border-[#e3d8c6] dark:border-[#3d3329] bg-[#faf6ee] dark:bg-[#1c1712] text-[#2b2118] dark:text-[#f1e8da] focus:outline-none focus:ring-2 text-sm font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold mb-1.5 text-[#2b2118] dark:text-[#f1e8da]">
                    Contacto <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: primaryColor }} />
                    <input
                      type="text"
                      required
                      placeholder="Teléfono o WhatsApp"
                      value={contacto}
                      onChange={(e) => setContacto(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-[#e3d8c6] dark:border-[#3d3329] bg-[#faf6ee] dark:bg-[#1c1712] text-[#2b2118] dark:text-[#f1e8da] focus:outline-none focus:ring-2 text-sm font-sans"
                    />
                  </div>
                </div>
              </div>

              {/* 3. ¿A QUÉ IGLESIA PERTENECES? (Desplegable) */}
              <div>
                <label className="block text-xs sm:text-sm font-bold mb-1.5 text-[#2b2118] dark:text-[#f1e8da]">
                  ¿A qué iglesia perteneces? <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <Church className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: primaryColor }} />
                  <select
                    required
                    value={iglesia}
                    onChange={(e) => setIglesia(e.target.value)}
                    className="w-full pl-10 pr-9 py-3 rounded-xl border border-[#e3d8c6] dark:border-[#3d3329] bg-[#faf6ee] dark:bg-[#1c1712] text-[#2b2118] dark:text-[#f1e8da] focus:outline-none focus:ring-2 text-sm font-sans cursor-pointer appearance-none font-medium"
                    style={{ focusRingColor: primaryColor } as any}
                  >
                    <option value="">-- Selecciona tu iglesia --</option>
                    {CHURCH_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-xs text-slate-400">
                    ▼
                  </div>
                </div>
              </div>

              {/* 4. PERSONAJE BÍBLICO */}
              <div>
                <label className="block text-xs sm:text-sm font-bold mb-1.5 text-[#2b2118] dark:text-[#f1e8da]">
                  Personaje Bíblico <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <Sparkles className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: primaryColor }} />
                  <input
                    type="text"
                    required
                    placeholder="Ej. David, Moisés, Reina Ester, Jonás, Daniel..."
                    value={personaje}
                    onChange={(e) => setPersonaje(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-[#e3d8c6] dark:border-[#3d3329] bg-[#faf6ee] dark:bg-[#1c1712] text-[#2b2118] dark:text-[#f1e8da] focus:outline-none focus:ring-2 text-sm font-sans"
                  />
                </div>
              </div>

              {/* 5. ¿REQUIERE AUDIO? */}
              <div className="pt-1">
                <label className="block text-xs sm:text-sm font-bold mb-2 text-[#2b2118] dark:text-[#f1e8da]">
                  ¿Requiere Audio? <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3 font-sans">
                  <label 
                    onClick={() => setAudio('Sí')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      audio === 'Sí'
                        ? 'font-extrabold shadow-xs'
                        : 'border-[#e3d8c6] dark:border-[#3d3329] bg-[#faf6ee] dark:bg-[#1c1712] text-[#6f6357] dark:text-[#b5a893] font-semibold'
                    }`}
                    style={audio === 'Sí' ? { borderColor: primaryColor, color: primaryColor, backgroundColor: `${primaryColor}15` } : {}}
                  >
                    <input
                      type="radio"
                      name="audio"
                      value="Sí"
                      checked={audio === 'Sí'}
                      onChange={() => setAudio('Sí')}
                      className="sr-only"
                    />
                    <Volume2 className="w-4 h-4" />
                    <span>Sí (Pista / Música)</span>
                  </label>

                  <label 
                    onClick={() => setAudio('No')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      audio === 'No'
                        ? 'font-extrabold shadow-xs'
                        : 'border-[#e3d8c6] dark:border-[#3d3329] bg-[#faf6ee] dark:bg-[#1c1712] text-[#6f6357] dark:text-[#b5a893] font-semibold'
                    }`}
                    style={audio === 'No' ? { borderColor: primaryColor, color: primaryColor, backgroundColor: `${primaryColor}15` } : {}}
                  >
                    <input
                      type="radio"
                      name="audio"
                      value="No"
                      checked={audio === 'No'}
                      onChange={() => setAudio('No')}
                      className="sr-only"
                    />
                    <span>No (Solo voz)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 rounded-2xl text-white font-sans font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
              style={{ backgroundColor: primaryColor }}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Completar Inscripción</span>
                </>
              )}
            </button>
          </form>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#e3d8c6] dark:border-[#3d3329] py-5 px-4 text-center text-xs font-sans text-[#6f6357] dark:text-[#b5a893]">
        <p>Iglesia Adventista del Séptimo Día · Concurso Bíblico</p>
        <p className="mt-0.5 opacity-75">{eventDateText} · Sistema Eclesia</p>
      </footer>
    </div>
  );
};

