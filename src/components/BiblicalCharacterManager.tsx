import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  Calendar, 
  Users, 
  Volume2, 
  VolumeX, 
  Plus, 
  Search, 
  Copy, 
  CheckCircle2, 
  Printer, 
  Share2, 
  Trash2, 
  ArrowLeft, 
  Sparkles, 
  Phone, 
  FileText, 
  Check, 
  Clock, 
  X,
  User,
  Palette,
  Upload,
  Image as ImageIcon,
  ExternalLink,
  RotateCcw,
  RefreshCw,
  Cloud,
  Church
} from 'lucide-react';
import { BiblicalCharacterRegistration, AppUser, ContestCustomConfig, CHURCH_OPTIONS } from '../types';
import { compressImageFile } from '../utils/photoStorage';
import { createPublicRegistrationShareUrl, getSupabaseConfig } from '../services/supabaseClient';

interface BiblicalCharacterManagerProps {
  registrations: BiblicalCharacterRegistration[];
  onAddRegistration: (reg: BiblicalCharacterRegistration) => void;
  onUpdateRegistration: (reg: BiblicalCharacterRegistration) => void;
  onDeleteRegistration: (id: string) => void;
  onBackToPortal: () => void;
  currentUser?: AppUser;
  contestConfig: ContestCustomConfig;
  onUpdateContestConfig: (config: ContestCustomConfig) => void;
  onRefreshRegistrations?: () => Promise<void> | void;
}

export const BiblicalCharacterManager: React.FC<BiblicalCharacterManagerProps> = ({
  registrations,
  onAddRegistration,
  onUpdateRegistration,
  onDeleteRegistration,
  onBackToPortal,
  currentUser,
  contestConfig,
  onUpdateContestConfig,
  onRefreshRegistrations,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAudio, setFilterAudio] = useState<'all' | 'si' | 'no'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'aprobados' | 'pendientes'>('all');
  const [filterIglesia, setFilterIglesia] = useState<string>('all');

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<BiblicalCharacterRegistration | null>(null);
  const [toastMsg, setToastMsg] = useState('');
  const [isPrintScorecardOpen, setIsPrintScorecardOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // Auto-polling for new registrations from shared links every 12 seconds
  React.useEffect(() => {
    if (!onRefreshRegistrations) return;
    const interval = setInterval(async () => {
      try {
        await onRefreshRegistrations();
        setLastSyncedAt(new Date());
      } catch (err) {
        console.warn('Background sync warning:', err);
      }
    }, 12000);
    return () => clearInterval(interval);
  }, [onRefreshRegistrations]);

  const handleManualRefresh = async () => {
    if (!onRefreshRegistrations) return;
    setIsRefreshing(true);
    try {
      await onRefreshRegistrations();
      setLastSyncedAt(new Date());
      showToast('☁️ Inscripciones sincronizadas en vivo con la base de datos.');
    } catch {
      showToast('No se pudo sincronizar con la nube.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Configuration modal temporary editing state
  const [tempConfig, setTempConfig] = useState<ContestCustomConfig>(contestConfig);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingFlyer, setIsUploadingFlyer] = useState(false);

  // Form state for new manual registration (Strictly: nombre, edad, contacto, personaje, audio)
  const [formNombre, setFormNombre] = useState('');
  const [formEdad, setFormEdad] = useState('');
  const [formContacto, setFormContacto] = useState('');
  const [formIglesia, setFormIglesia] = useState('');
  const [formPersonaje, setFormPersonaje] = useState('');
  const [formAudio, setFormAudio] = useState<'Sí' | 'No'>('No');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const COLOR_PRESETS = [
    { label: 'Dorado Bíblico', value: '#8a5a2b' },
    { label: 'Azul Real', value: '#1d4ed8' },
    { label: 'Púrpura Imperial', value: '#7c3aed' },
    { label: 'Verde Esmeralda', value: '#047857' },
    { label: 'Rojo Carmesí', value: '#b91c1c' },
    { label: 'Ámbar Cálido', value: '#d97706' },
    { label: 'Teal Profundo', value: '#0f766e' },
    { label: 'Índigo Bíblico', value: '#4338ca' },
  ];

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCover(true);
    try {
      const res = await compressImageFile(file, 1600, 0.85);
      setTempConfig((prev) => ({ ...prev, headerBannerUrl: res.dataUrl }));
      showToast('Foto de portada horizontal cargada.');
    } catch {
      showToast('Error al procesar la imagen de portada.');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleFlyerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingFlyer(true);
    try {
      const res = await compressImageFile(file, 1600, 0.85);
      setTempConfig((prev) => ({ ...prev, thankYouFlyerUrl: res.dataUrl }));
      showToast('Foto vertical del flyer cargada.');
    } catch {
      showToast('Error al procesar el flyer.');
    } finally {
      setIsUploadingFlyer(false);
    }
  };

  const handleSaveConfig = () => {
    onUpdateContestConfig(tempConfig);
    setIsConfigModalOpen(false);
    showToast('¡Configuración de enlace y diseño guardada!');
  };

  const handleResetConfig = () => {
    const defaultConf: ContestCustomConfig = {
      headerBannerUrl: '',
      thankYouFlyerUrl: '',
      primaryColor: '#8a5a2b',
      title: 'Inscripción – Imita tu Personaje Bíblico',
      subtitle: '¡Prepárate para dar vida a la historia sagrada!',
      eventDate: 'Sábado 28 de noviembre de 2026',
      thankYouMessage: '¡Muchas gracias por inscribirte en el concurso!',
    };
    setTempConfig(defaultConf);
    onUpdateContestConfig(defaultConf);
    showToast('Configuración restablecida (sin fotos, colores por defecto).');
  };

  const filtered = useMemo(() => {
    return registrations.filter((r) => {
      const matchSearch =
        r.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.personaje.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.edad && r.edad.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.iglesia && r.iglesia.toLowerCase().includes(searchTerm.toLowerCase())) ||
        r.contacto.toLowerCase().includes(searchTerm.toLowerCase());

      const matchAudio =
        filterAudio === 'all' ||
        (filterAudio === 'si' && r.audio === 'Sí') ||
        (filterAudio === 'no' && r.audio === 'No');

      const matchStatus =
        filterStatus === 'all' ||
        (filterStatus === 'aprobados' && r.aprobado) ||
        (filterStatus === 'pendientes' && !r.aprobado);

      const matchIglesia =
        filterIglesia === 'all' || r.iglesia === filterIglesia;

      return matchSearch && matchAudio && matchStatus && matchIglesia;
    });
  }, [registrations, searchTerm, filterAudio, filterStatus, filterIglesia]);

  // Metrics
  const stats = useMemo(() => {
    const total = registrations.length;
    const conAudio = registrations.filter((r) => r.audio === 'Sí').length;
    const sinAudio = registrations.filter((r) => r.audio === 'No').length;
    const aprobados = registrations.filter((r) => r.aprobado).length;
    return { total, conAudio, sinAudio, aprobados };
  }, [registrations]);

  const handleCopyAll = async () => {
    if (registrations.length === 0) {
      showToast('No hay inscripciones registradas todavía.');
      return;
    }

    const text = registrations
      .map((r, i) => {
        return `[#${i + 1}] ${r.nombre.toUpperCase()}${r.edad ? ` (${r.edad})` : ''}
⛪ Iglesia: ${r.iglesia || 'No especificada'}
👑 Personaje: ${r.personaje}
📱 Contacto: ${r.contacto}
🎵 Audio: ${r.audio}
✅ Estado: ${r.aprobado ? 'Aprobado' : 'Pendiente'}`;
      })
      .join('\n\n-------------------------------\n\n');

    const header = `📖 CONCURSO: IMITA TU PERSONAJE BÍBLICO\n📅 Sábado 28 de noviembre de 2026\nTotal Inscritos: ${registrations.length}\n\n`;

    try {
      await navigator.clipboard.writeText(header + text);
      showToast('¡Todas las inscripciones fueron copiadas al portapapeles!');
    } catch {
      showToast('No se pudo copiar automáticamente.');
    }
  };

  const handleCopySingle = async (r: BiblicalCharacterRegistration) => {
    const text = `📖 *INSCRIPCIÓN - IMITA TU PERSONAJE BÍBLICO*
👤 *Participante:* ${r.nombre}${r.edad ? ` (${r.edad})` : ''}
⛪ *Iglesia:* ${r.iglesia || 'No especificada'}
👑 *Personaje:* ${r.personaje}
📱 *Contacto:* ${r.contacto}
🎵 *Requiere Audio:* ${r.audio}`;

    try {
      await navigator.clipboard.writeText(text);
      showToast(`¡Ficha de ${r.nombre} copiada!`);
    } catch {}
  };

  const handleSharePublicLink = async () => {
    const shareUrl = createPublicRegistrationShareUrl();
    const shareText = `📖 *¡Inscríbete en el concurso "Imita tu Personaje Bíblico"!*\n📅 Sábado 28 de noviembre de 2026\n\nSolo necesitas ingresar tu nombre, edad, contacto, personaje bíblico y si requieres audio:\n${shareUrl}`;

    try {
      await navigator.clipboard.writeText(shareText);
      showToast('¡Enlace de inscripción copiado! Conectado automáticamente con tu base de datos.');
    } catch {}

    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank');
  };

  const handleCreateRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNombre.trim() || !formContacto.trim() || !formPersonaje.trim() || !formAudio) {
      showToast('Por favor completa los campos requeridos (*)');
      return;
    }

    const newReg: BiblicalCharacterRegistration = {
      id: `bc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      nombre: formNombre.trim(),
      edad: formEdad.trim() || undefined,
      contacto: formContacto.trim(),
      iglesia: formIglesia.trim() || undefined,
      personaje: formPersonaje.trim(),
      audio: formAudio,
      fecha: new Date().toISOString(),
      aprobado: true,
    };

    onAddRegistration(newReg);
    setIsNewModalOpen(false);
    showToast(`¡Inscripción de ${newReg.nombre} guardada con éxito!`);

    // Reset form
    setFormNombre('');
    setFormEdad('');
    setFormContacto('');
    setFormIglesia('');
    setFormPersonaje('');
    setFormAudio('No');
  };

  const handleToggleAprobado = (r: BiblicalCharacterRegistration) => {
    const updated = { ...r, aprobado: !r.aprobado };
    onUpdateRegistration(updated);
    showToast(`Estado actualizado: ${updated.aprobado ? 'Aprobado' : 'Pendiente'}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-amber-900 text-amber-50 text-xs font-semibold rounded-2xl shadow-xl border border-amber-700 animate-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Breadcrumb & Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-amber-300 dark:border-amber-900/60 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onBackToPortal}
                className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                title="Volver al Portal General"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-extrabold uppercase tracking-wide">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Evento Especial Eclesia</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight flex items-center gap-3">
              <span>📖 Concurso: Imita tu Personaje Bíblico</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
              Gestión oficial de participantes (nombre, apellido, edad, contacto, personaje y audio) y planilla de jurado.
              <span className="ml-2 font-bold text-amber-700 dark:text-amber-400">· Sábado 28 de noviembre de 2026</span>
            </p>
          </div>

          {/* Primary Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setTempConfig(contestConfig);
                setIsConfigModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-2xl border-2 border-amber-400 dark:border-amber-700 hover:border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-extrabold text-xs inline-flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              title="Configurar foto de portada horizontal, colores y flyer vertical"
            >
              <Palette className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Personalizar Portada y Flyer</span>
            </button>

            {onRefreshRegistrations && (
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="px-4 py-2.5 rounded-2xl border-2 border-emerald-500/50 hover:border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-extrabold text-xs inline-flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-60"
                title="Consultar y actualizar registros en vivo desde la base de datos"
              >
                <RefreshCw className={`w-4 h-4 text-emerald-600 dark:text-emerald-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Sincronizando...' : 'Sincronizar Nube'}</span>
                {lastSyncedAt && (
                  <span className="text-[10px] opacity-75 font-mono">
                    ({lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })})
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handleSharePublicLink}
              className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs inline-flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Compartir Link WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPrintScorecardOpen(true)}
              className="px-4 py-2.5 rounded-2xl border-2 border-slate-300 dark:border-slate-700 hover:border-amber-600 dark:hover:border-amber-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold text-xs inline-flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Planilla para Jurado</span>
            </button>

            <button
              type="button"
              onClick={() => setIsNewModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs inline-flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Inscripción</span>
            </button>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50">
            <div className="flex items-center justify-between text-amber-800 dark:text-amber-300 mb-1">
              <span className="text-xs font-bold uppercase">Total Inscritos</span>
              <Users className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-amber-900 dark:text-amber-200 font-mono">
              {stats.total}
            </div>
            <span className="text-[11px] text-amber-700/80 dark:text-amber-400/80">participantes registrados</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50">
            <div className="flex items-center justify-between text-blue-800 dark:text-blue-300 mb-1">
              <span className="text-xs font-bold uppercase">Con Audio</span>
              <Volume2 className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-blue-900 dark:text-blue-200 font-mono">
              {stats.conAudio}
            </div>
            <span className="text-[11px] text-blue-700/80 dark:text-blue-400/80">requieren pista musical</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700">
            <div className="flex items-center justify-between text-slate-800 dark:text-slate-300 mb-1">
              <span className="text-xs font-bold uppercase">Sin Audio</span>
              <VolumeX className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {stats.sinAudio}
            </div>
            <span className="text-[11px] text-slate-600 dark:text-slate-400">solo voz y actuación</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50">
            <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 mb-1">
              <span className="text-xs font-bold uppercase">Aprobados / Listos</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-emerald-900 dark:text-emerald-200 font-mono">
              {stats.aprobados}
            </div>
            <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">confirmados en orden</span>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar participante, personaje o contacto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Audio Filter */}
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-300 dark:border-slate-700 text-xs font-bold">
            <button
              type="button"
              onClick={() => setFilterAudio('all')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                filterAudio === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Todos ({registrations.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterAudio('si')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                filterAudio === 'si'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Con Audio ({stats.conAudio})
            </button>
            <button
              type="button"
              onClick={() => setFilterAudio('no')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                filterAudio === 'no'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Sin Audio ({stats.sinAudio})
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopyAll}
            className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Copiar Todo</span>
          </button>
        </div>
      </div>

      {/* MAIN DATA TABLE / LIST */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-800 p-12 text-center space-y-3">
          <div className="text-4xl">📖</div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            No se encontraron inscripciones
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {searchTerm || filterAudio !== 'all'
              ? 'Prueba cambiando los filtros o el término de búsqueda.'
              : 'Aún no hay participantes inscritos. Comparte el enlace público en WhatsApp o crea la primera inscripción manual.'}
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              type="button"
              onClick={handleSharePublicLink}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Compartir Enlace Público</span>
            </button>
            <button
              type="button"
              onClick={() => setIsNewModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Inscribir Manualmente</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-extrabold">
                <tr>
                  <th className="py-3.5 px-4">#</th>
                  <th className="py-3.5 px-4">Nombre y Apellido</th>
                  <th className="py-3.5 px-4">Edad</th>
                  <th className="py-3.5 px-4">Contacto</th>
                  <th className="py-3.5 px-4">Personaje Bíblico</th>
                  <th className="py-3.5 px-4">¿Requiere Audio?</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filtered.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-400">
                      {idx + 1}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{r.nombre}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                      {r.edad || <span className="text-slate-400 italic">No esp.</span>}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{r.contacto}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>{r.personaje}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {r.audio === 'Sí' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold border border-blue-300 dark:border-blue-800">
                          <Volume2 className="w-3 h-3" />
                          <span>Sí (Audio)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-300 dark:border-slate-700">
                          <VolumeX className="w-3 h-3" />
                          <span>No</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleAprobado(r)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                          r.aprobado
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                        }`}
                      >
                        {r.aprobado ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Aprobado</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" />
                            <span>Pendiente</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedDetail(r)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                          title="Ver ficha"
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopySingle(r)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                          title="Copiar para WhatsApp"
                        >
                          <Copy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`¿Seguro que deseas eliminar la inscripción de ${r.nombre}?`)) {
                              onDeleteRegistration(r.id);
                              showToast(`Inscripción de ${r.nombre} eliminada.`);
                            }
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                          title="Eliminar inscripción"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                  Ficha de Participante
                </span>
                <h3 className="text-xl font-extrabold text-slate-950 dark:text-white">
                  {selectedDetail.nombre}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50">
                <span className="font-extrabold text-amber-800 dark:text-amber-300 uppercase block mb-1">
                  Personaje Bíblico a Imitar:
                </span>
                <p className="text-base font-extrabold text-amber-950 dark:text-amber-100">
                  {selectedDetail.personaje}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400 block font-bold mb-0.5">Edad:</span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                    {selectedDetail.edad || 'No especificada'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400 block font-bold mb-0.5">Contacto:</span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                    {selectedDetail.contacto}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400 block font-bold mb-0.5">¿Requiere Audio?:</span>
                <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                  {selectedDetail.audio === 'Sí' ? '🎵 Sí (Pista musical)' : '🎙️ No (Solo voz)'}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleCopySingle(selectedDetail)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Ficha</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleAprobado(selectedDetail)}
                className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                  selectedDetail.aprobado
                    ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{selectedDetail.aprobado ? 'Marcar Pendiente' : 'Aprobar Participante'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW MANUAL REGISTRATION MODAL (nombre, edad, contacto, personaje, audio) */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                  Organizador · Eclesia
                </span>
                <h3 className="text-xl font-extrabold text-slate-950 dark:text-white">
                  Nueva Inscripción
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRegistration} className="space-y-4 text-xs">
              {/* 1. Nombre y Apellido */}
              <div>
                <label className="block font-bold mb-1 text-slate-900 dark:text-white">
                  Nombre y Apellido <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Samuel Josué Martínez"
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>

              {/* 2. Edad & 3. Contacto */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-900 dark:text-white">
                    Edad
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 12 años"
                    value={formEdad}
                    onChange={(e) => setFormEdad(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-900 dark:text-white">
                    Contacto <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Teléfono o WhatsApp"
                    value={formContacto}
                    onChange={(e) => setFormContacto(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              {/* 4. Personaje Bíblico */}
              <div>
                <label className="block font-bold mb-1 text-slate-900 dark:text-white">
                  Personaje Bíblico <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. David, Jonás, Reina Ester, Moisés..."
                  value={formPersonaje}
                  onChange={(e) => setFormPersonaje(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>

              {/* 5. Requiere Audio */}
              <div>
                <label className="block font-bold mb-1.5 text-slate-900 dark:text-white">
                  ¿Requiere Audio? <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label 
                    onClick={() => setFormAudio('Sí')}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                      formAudio === 'Sí'
                        ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-extrabold'
                        : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium'
                    }`}
                  >
                    <Volume2 className="w-4 h-4 text-blue-500" />
                    <span>Sí (Pista)</span>
                  </label>

                  <label 
                    onClick={() => setFormAudio('No')}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                      formAudio === 'No'
                        ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-extrabold'
                        : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium'
                    }`}
                  >
                    <VolumeX className="w-4 h-4 text-slate-400" />
                    <span>No (Voz)</span>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold shadow-sm cursor-pointer"
                >
                  Guardar Inscripción
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT SCORECARD MODAL / JURADO VIEW */}
      {isPrintScorecardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white text-slate-950 border border-slate-300 rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black uppercase">
                  Planilla Oficial del Jurado Calificador
                </div>
                <h2 className="text-2xl font-black mt-1">
                  Concurso Bíblico: Imita tu Personaje Bíblico
                </h2>
                <p className="text-xs text-slate-600 font-semibold">
                  Sábado 28 de noviembre de 2026 · Criterios: Caracterización (30%), Interpretación (30%), Fidelidad Bíblica y Mensaje (40%)
                </p>
              </div>

              <div className="flex items-center gap-2 no-print">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / Guardar PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintScorecardOpen(false)}
                  className="p-2 rounded-xl border text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scorecard Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-300">
                <thead className="bg-slate-100 text-slate-800 font-black border-b border-slate-300">
                  <tr>
                    <th className="p-2 border-r border-slate-300 w-8">#</th>
                    <th className="p-2 border-r border-slate-300">Nombre y Apellido</th>
                    <th className="p-2 border-r border-slate-300 w-16">Edad</th>
                    <th className="p-2 border-r border-slate-300">Personaje Bíblico</th>
                    <th className="p-2 border-r border-slate-300 w-16 text-center">Audio</th>
                    <th className="p-2 border-r border-slate-300 text-center w-24">Vestuario / Caract. (30)</th>
                    <th className="p-2 border-r border-slate-300 text-center w-24">Actuación / Voz (30)</th>
                    <th className="p-2 border-r border-slate-300 text-center w-24">Fidelidad Bíblica (40)</th>
                    <th className="p-2 border-r border-slate-300 text-center w-20">Total (100)</th>
                    <th className="p-2">Observaciones / Firma</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {registrations.map((r, i) => (
                    <tr key={r.id} className="h-14">
                      <td className="p-2 border-r border-slate-300 font-mono font-bold text-center">{i + 1}</td>
                      <td className="p-2 border-r border-slate-300 font-bold">{r.nombre}</td>
                      <td className="p-2 border-r border-slate-300 text-slate-600">{r.edad || '-'}</td>
                      <td className="p-2 border-r border-slate-300 font-bold text-amber-900">{r.personaje}</td>
                      <td className="p-2 border-r border-slate-300 text-center font-bold">{r.audio}</td>
                      <td className="p-2 border-r border-slate-300 text-center"></td>
                      <td className="p-2 border-r border-slate-300 text-center"></td>
                      <td className="p-2 border-r border-slate-300 text-center"></td>
                      <td className="p-2 border-r border-slate-300 text-center font-mono font-bold"></td>
                      <td className="p-2"></td>
                    </tr>
                  ))}
                  {/* Empty rows if few */}
                  {Array.from({ length: Math.max(0, 5 - registrations.length) }).map((_, idx) => (
                    <tr key={`empty-${idx}`} className="h-14">
                      <td className="p-2 border-r border-slate-300 font-mono font-bold text-center text-slate-400">
                        {registrations.length + idx + 1}
                      </td>
                      <td className="p-2 border-r border-slate-300"></td>
                      <td className="p-2 border-r border-slate-300"></td>
                      <td className="p-2 border-r border-slate-300"></td>
                      <td className="p-2 border-r border-slate-300 text-center"></td>
                      <td className="p-2 border-r border-slate-300 text-center"></td>
                      <td className="p-2 border-r border-slate-300 text-center"></td>
                      <td className="p-2 border-r border-slate-300 text-center"></td>
                      <td className="p-2 border-r border-slate-300 text-center font-mono font-bold"></td>
                      <td className="p-2"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Signature section */}
            <div className="pt-6 border-t border-slate-200 grid grid-cols-3 gap-6 text-center text-xs">
              <div className="space-y-8">
                <div className="border-b border-slate-400 h-8" />
                <span className="font-bold text-slate-700">Firma Jurado 1</span>
              </div>
              <div className="space-y-8">
                <div className="border-b border-slate-400 h-8" />
                <span className="font-bold text-slate-700">Firma Jurado 2</span>
              </div>
              <div className="space-y-8">
                <div className="border-b border-slate-400 h-8" />
                <span className="font-bold text-slate-700">Firma Pastor / Anciano</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PERSONALIZACIÓN DEL ENLACE Y FLYER */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border-2 border-amber-400 dark:border-amber-800 rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl max-h-[92vh] overflow-y-auto space-y-6">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wide text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5" />
                  Personalización del Enlace Público
                </span>
                <h3 className="text-xl font-extrabold text-slate-950 dark:text-white">
                  Portada Horizontal, Colores y Flyer Vertical
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Personaliza cómo ven la página las personas que se inscriban según el flyer de tu evento.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-6 text-xs">
              {/* SECCIÓN 1: FOTO DE PORTADA HORIZONTAL (ARRIBA) */}
              <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-amber-600" />
                      <span>1. Foto de Portada Horizontal (Arriba)</span>
                    </label>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                      Solo si se coloca una foto de portada, se mostrará la imagen horizontal arriba. Si no se coloca, se mostrará el texto predeterminado.
                    </p>
                  </div>
                  {tempConfig.headerBannerUrl && (
                    <button
                      type="button"
                      onClick={() => setTempConfig((prev) => ({ ...prev, headerBannerUrl: '' }))}
                      className="text-xs text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer"
                    >
                      Quitar foto (Usar texto)
                    </button>
                  )}
                </div>

                {tempConfig.headerBannerUrl ? (
                  <div className="space-y-2">
                    <div className="relative rounded-2xl overflow-hidden border-2 border-amber-400 dark:border-amber-700 max-h-48 shadow-sm">
                      <img
                        src={tempConfig.headerBannerUrl}
                        alt="Vista previa de portada horizontal"
                        className="w-full h-44 object-cover object-center"
                      />
                      <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur-xs">
                        Portada Activa (Horizontal)
                      </div>
                    </div>
                    <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploadingCover ? 'Cargando imagen...' : 'Cambiar imagen de portada'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverUpload}
                        disabled={isUploadingCover}
                        className="sr-only"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-amber-300 dark:border-amber-800 rounded-2xl p-4 text-center space-y-2 bg-white/70 dark:bg-slate-900/60">
                    <div className="text-2xl">🖼️</div>
                    <p className="font-semibold text-slate-700 dark:text-slate-300">
                      Actualmente se muestra el texto predeterminado ("Inscripción – Imita tu Personaje Bíblico").
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <label className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold inline-flex items-center gap-2 shadow-xs cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isUploadingCover ? 'Procesando...' : 'Subir Foto Horizontal'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCoverUpload}
                          disabled={isUploadingCover}
                          className="sr-only"
                        />
                      </label>
                      <span className="text-slate-400">o pega enlace:</span>
                      <input
                        type="url"
                        placeholder="https://ejemplo.com/portada.jpg"
                        value={tempConfig.headerBannerUrl || ''}
                        onChange={(e) => setTempConfig((prev) => ({ ...prev, headerBannerUrl: e.target.value }))}
                        className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs w-48 sm:w-60"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* SECCIÓN 2: COLORES DEL TEMA / FLYER */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div>
                  <label className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Palette className="w-4 h-4 text-amber-600" />
                    <span>2. Color del Tema según tu Flyer</span>
                  </label>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                    Elige o extrae el color predominante de tu flyer para botones, títulos y bordes.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {COLOR_PRESETS.map((p) => {
                    const isSelected = (tempConfig.primaryColor || '#8a5a2b').toLowerCase() === p.value.toLowerCase();
                    return (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setTempConfig((prev) => ({ ...prev, primaryColor: p.value }))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'border-slate-900 dark:border-white shadow-sm ring-2 ring-amber-500/50'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'
                        }`}
                      >
                        <span className="w-3.5 h-3.5 rounded-full shadow-xs shrink-0" style={{ backgroundColor: p.value }} />
                        <span className="text-slate-800 dark:text-slate-200">{p.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Color Picker */}
                <div className="flex items-center gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={tempConfig.primaryColor || '#8a5a2b'}
                      onChange={(e) => setTempConfig((prev) => ({ ...prev, primaryColor: e.target.value }))}
                      className="w-9 h-9 rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer p-0.5 bg-white dark:bg-slate-800"
                    />
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      Color exacto (Hex):
                    </span>
                  </div>
                  <input
                    type="text"
                    value={tempConfig.primaryColor || '#8a5a2b'}
                    onChange={(e) => setTempConfig((prev) => ({ ...prev, primaryColor: e.target.value }))}
                    className="w-28 px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white"
                  />
                  <div
                    className="px-3 py-1.5 rounded-xl text-white font-extrabold text-[11px] shadow-xs"
                    style={{ backgroundColor: tempConfig.primaryColor || '#8a5a2b' }}
                  >
                    Muestra del Botón
                  </div>
                </div>
              </div>

              {/* SECCIÓN 3: FOTO VERTICAL DEL FLYER DANDO GRACIAS AL FINAL */}
              <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-emerald-600" />
                      <span>3. Foto Vertical del Flyer (Al Final Dando Gracias)</span>
                    </label>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                      Se mostrará en la pantalla de confirmación exitosa con opción para que los participantes lo descarguen y compartan.
                    </p>
                  </div>
                  {tempConfig.thankYouFlyerUrl && (
                    <button
                      type="button"
                      onClick={() => setTempConfig((prev) => ({ ...prev, thankYouFlyerUrl: '' }))}
                      className="text-xs text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer"
                    >
                      Quitar flyer
                    </button>
                  )}
                </div>

                {tempConfig.thankYouFlyerUrl ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-4">
                      <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-400 dark:border-emerald-700 w-36 max-h-52 shrink-0 shadow-sm">
                        <img
                          src={tempConfig.thankYouFlyerUrl}
                          alt="Vista previa flyer vertical"
                          className="w-full h-auto object-contain"
                        />
                      </div>
                      <div className="space-y-2 flex-1">
                        <label className="block font-bold text-slate-800 dark:text-slate-200">
                          Mensaje de Agradecimiento:
                        </label>
                        <input
                          type="text"
                          value={tempConfig.thankYouMessage || ''}
                          onChange={(e) => setTempConfig((prev) => ({ ...prev, thankYouMessage: e.target.value }))}
                          placeholder="¡Muchas gracias por inscribirte en el concurso!"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold"
                        />
                        <div className="pt-1">
                          <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
                            <Upload className="w-3.5 h-3.5" />
                            <span>{isUploadingFlyer ? 'Cargando flyer...' : 'Cambiar imagen de flyer'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFlyerUpload}
                              disabled={isUploadingFlyer}
                              className="sr-only"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-emerald-300 dark:border-emerald-800 rounded-2xl p-4 text-center space-y-2 bg-white/70 dark:bg-slate-900/60">
                    <div className="text-2xl">📋</div>
                    <p className="font-semibold text-slate-700 dark:text-slate-300">
                      Sube la imagen vertical del flyer oficial del evento para mostrarla al finalizar la inscripción.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <label className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold inline-flex items-center gap-2 shadow-xs cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isUploadingFlyer ? 'Procesando...' : 'Subir Flyer Vertical'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFlyerUpload}
                          disabled={isUploadingFlyer}
                          className="sr-only"
                        />
                      </label>
                      <span className="text-slate-400">o pega enlace:</span>
                      <input
                        type="url"
                        placeholder="https://ejemplo.com/flyer-vertical.jpg"
                        value={tempConfig.thankYouFlyerUrl || ''}
                        onChange={(e) => setTempConfig((prev) => ({ ...prev, thankYouFlyerUrl: e.target.value }))}
                        className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs w-48 sm:w-60"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* SECCIÓN 4: DETALLES DE TEXTO (OPCIONAL) */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <label className="font-extrabold text-sm text-slate-900 dark:text-white block">
                  4. Textos del Evento (Opcional)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-600 dark:text-slate-400 font-bold block mb-1">Título:</span>
                    <input
                      type="text"
                      value={tempConfig.title || ''}
                      onChange={(e) => setTempConfig((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="Inscripción – Imita tu Personaje Bíblico"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <span className="text-slate-600 dark:text-slate-400 font-bold block mb-1">Fecha del Evento:</span>
                    <input
                      type="text"
                      value={tempConfig.eventDate || ''}
                      onChange={(e) => setTempConfig((prev) => ({ ...prev, eventDate: e.target.value }))}
                      placeholder="Sábado 28 de noviembre de 2026"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* BOTONES DE ACCIÓN DEL MODAL */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleResetConfig}
                className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs inline-flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer Predeterminados</span>
              </button>

              <div className="flex items-center gap-2">
                <a
                  href={createPublicRegistrationShareUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs inline-flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  title="Abre el enlace auto-vinculable que cualquier invitado puede usar"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Probar Enlace en Nueva Pestaña</span>
                </a>

                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
                >
                  Guardar Personalización
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
