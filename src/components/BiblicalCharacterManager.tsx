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
  Church,
  Pencil,
  Trophy,
  Play,
  Award,
  Save
} from 'lucide-react';
import {
  BiblicalCharacterRegistration,
  AppUser,
  ContestCustomConfig,
  CHURCH_OPTIONS,
  CharacterAgeCategory,
  classifyCharacterByAge,
  getCharacterCategoryLabel,
  hasAnyUserRole,
} from '../types';
import { compressImageFile } from '../utils/photoStorage';
import { createPublicRegistrationShareUrl } from '../services/supabaseClient';

interface BiblicalCharacterManagerProps {
  registrations: BiblicalCharacterRegistration[];
  onAddRegistration: (reg: BiblicalCharacterRegistration) => Promise<any> | void;
  onUpdateRegistration: (reg: BiblicalCharacterRegistration) => Promise<any> | void;
  onDeleteRegistration: (id: string) => Promise<any> | void;
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
  const [filterCategory, setFilterCategory] = useState<'all' | CharacterAgeCategory>('all');

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<BiblicalCharacterRegistration | null>(null);
  const [editingReg, setEditingReg] = useState<BiblicalCharacterRegistration | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BiblicalCharacterRegistration | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [isPrintScorecardOpen, setIsPrintScorecardOpen] = useState(false);
  const [printCategoryMode, setPrintCategoryMode] = useState<'ambas' | 'ninos' | 'adultos'>('ambas');
  const [printIglesia, setPrintIglesia] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // Concurso en vivo (calificación en tiempo real + ganadores 1.º a 3.º lugar)
  const [isLiveContestOpen, setIsLiveContestOpen] = useState(false);
  const [contestCategoryTab, setContestCategoryTab] = useState<'ninos' | 'adultos' | 'all'>('ninos');
  const [contestSearch, setContestSearch] = useState('');
  const [contestFilterStatus, setContestFilterStatus] = useState<'all' | 'pendientes' | 'calificados'>('all');
  const [scoreDrafts, setScoreDrafts] = useState<
    Record<string, { vest: string; act: string; fid: string; total: string }>
  >({});
  const [savingScoreId, setSavingScoreId] = useState<string | null>(null);

  const canScoreContest =
    !currentUser ||
    hasAnyUserRole(currentUser, ['administrador', 'admin', 'pastor', 'anciano']);

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
      const cat = classifyCharacterByAge(r.edad);
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

      const matchCategory =
        filterCategory === 'all' || cat === filterCategory;

      return matchSearch && matchAudio && matchStatus && matchIglesia && matchCategory;
    });
  }, [registrations, searchTerm, filterAudio, filterStatus, filterIglesia, filterCategory]);

  // Metrics
  const stats = useMemo(() => {
    const total = registrations.length;
    const conAudio = registrations.filter((r) => r.audio === 'Sí').length;
    const sinAudio = registrations.filter((r) => r.audio === 'No').length;
    const aprobados = registrations.filter((r) => r.aprobado).length;
    const ninos = registrations.filter((r) => classifyCharacterByAge(r.edad) === 'ninos').length;
    const adultos = registrations.filter((r) => classifyCharacterByAge(r.edad) === 'adultos').length;
    const sinClasificar = total - ninos - adultos;
    return { total, conAudio, sinAudio, aprobados, ninos, adultos, sinClasificar };
  }, [registrations]);

  const handleCopyAll = async () => {
    if (registrations.length === 0) {
      showToast('No hay inscripciones registradas todavía.');
      return;
    }

    const formatGroup = (title: string, items: BiblicalCharacterRegistration[]) => {
      if (items.length === 0) return '';
      const rows = items
        .map((r, i) => {
          return `[#${i + 1}] ${r.nombre.toUpperCase()}${r.edad ? ` (${r.edad})` : ''}
⛪ Iglesia: ${r.iglesia || 'No especificada'}
👑 Personaje: ${r.personaje}
📱 Contacto: ${r.contacto}
🎵 Audio: ${r.audio}
✅ Estado: ${r.aprobado ? 'Aprobado' : 'Pendiente'}`;
        })
        .join('\n\n');
      return `=== ${title} (${items.length}) ===\n\n${rows}`;
    };

    const ninosList = registrations.filter((r) => classifyCharacterByAge(r.edad) === 'ninos');
    const adultosList = registrations.filter((r) => classifyCharacterByAge(r.edad) === 'adultos');
    const sinEdadList = registrations.filter((r) => classifyCharacterByAge(r.edad) === 'sin_clasificar');

    const sections = [
      formatGroup('CATEGORÍA NIÑOS (HASTA 17 AÑOS)', ninosList),
      formatGroup('CATEGORÍA ADULTOS (18+ AÑOS)', adultosList),
      formatGroup('SIN EDAD ESPECIFICADA', sinEdadList),
    ].filter(Boolean);

    const header = `📖 CONCURSO: IMITA TU PERSONAJE BÍBLICO\n📅 Sábado 28 de noviembre de 2026\nTotal Inscritos: ${registrations.length} (Niños: ${ninosList.length} · Adultos: ${adultosList.length})\n\n`;

    try {
      await navigator.clipboard.writeText(header + sections.join('\n\n-------------------------------\n\n'));
      showToast('¡Inscripciones clasificadas copiadas al portapapeles!');
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

  const handleCreateRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNombre.trim() || !formEdad.trim() || !formContacto.trim() || !formPersonaje.trim() || !formAudio) {
      showToast('Por favor completa todos los campos requeridos (*), incluyendo la edad');
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

    await onAddRegistration(newReg);
    setIsNewModalOpen(false);
    showToast(`¡Inscripción de ${newReg.nombre} guardada en tiempo real!`);

    // Reset form
    setFormNombre('');
    setFormEdad('');
    setFormContacto('');
    setFormIglesia('');
    setFormPersonaje('');
    setFormAudio('No');
  };

  const handleToggleAprobado = async (r: BiblicalCharacterRegistration) => {
    const updated = { ...r, aprobado: !r.aprobado };
    if (selectedDetail?.id === r.id) {
      setSelectedDetail(updated);
    }
    await onUpdateRegistration(updated);
    showToast(`Estado actualizado en la nube: ${updated.aprobado ? 'Aprobado' : 'Pendiente'}`);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReg) return;
    if (!editingReg.nombre.trim() || !editingReg.contacto.trim() || !editingReg.personaje.trim()) {
      showToast('Por favor completa los campos requeridos (*).');
      return;
    }
    setIsSavingEdit(true);
    try {
      const cleaned: BiblicalCharacterRegistration = {
        ...editingReg,
        nombre: editingReg.nombre.trim(),
        edad: editingReg.edad?.trim() || undefined,
        contacto: editingReg.contacto.trim(),
        iglesia: editingReg.iglesia?.trim() || undefined,
        personaje: editingReg.personaje.trim(),
      };
      await onUpdateRegistration(cleaned);
      if (selectedDetail?.id === cleaned.id) {
        setSelectedDetail(cleaned);
      }
      setEditingReg(null);
      showToast(`¡Cambios de ${cleaned.nombre} guardados en tiempo real!`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await onDeleteRegistration(deleteTarget.id);
      if (selectedDetail?.id === deleteTarget.id) {
        setSelectedDetail(null);
      }
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // --- CONCURSO EN VIVO: MANEJO DE PUNTAJES EN TIEMPO REAL ---
  const openLiveContestModal = () => {
    const hasNinos = registrations.some((r) => classifyCharacterByAge(r.edad) === 'ninos');
    const hasAdultos = registrations.some((r) => classifyCharacterByAge(r.edad) === 'adultos');
    if (hasNinos) {
      setContestCategoryTab('ninos');
    } else if (hasAdultos) {
      setContestCategoryTab('adultos');
    } else {
      setContestCategoryTab('all');
    }
    setScoreDrafts({});
    setIsLiveContestOpen(true);
  };

  const getDraftForReg = (r: BiblicalCharacterRegistration) => {
    const existing = scoreDrafts[r.id];
    if (existing) return existing;
    return {
      vest: typeof r.puntajeCaracterizacion === 'number' ? String(r.puntajeCaracterizacion) : '',
      act: typeof r.puntajeActuacion === 'number' ? String(r.puntajeActuacion) : '',
      fid: typeof r.puntajeFidelidad === 'number' ? String(r.puntajeFidelidad) : '',
      total: typeof r.puntajeTotal === 'number' ? String(r.puntajeTotal) : '',
    };
  };

  const clampNum = (raw: string, max: number): number | undefined => {
    const cleaned = raw.replace(/,/g, '.').trim();
    if (!cleaned) return undefined;
    const n = Number(cleaned);
    if (!Number.isFinite(n)) return undefined;
    return Math.max(0, Math.min(max, Math.round(n * 10) / 10));
  };

  const handleCriteriaDraftChange = (
    r: BiblicalCharacterRegistration,
    field: 'vest' | 'act' | 'fid',
    value: string
  ) => {
    const current = getDraftForReg(r);
    const updated = { ...current, [field]: value };
    const v = clampNum(updated.vest, 30);
    const a = clampNum(updated.act, 30);
    const f = clampNum(updated.fid, 40);
    if (v !== undefined || a !== undefined || f !== undefined) {
      const sum = Math.min(100, Math.round(((v ?? 0) + (a ?? 0) + (f ?? 0)) * 10) / 10);
      updated.total = String(sum);
    } else {
      updated.total = '';
    }
    setScoreDrafts((prev) => ({ ...prev, [r.id]: updated }));
  };

  const handleDirectTotalDraftChange = (r: BiblicalCharacterRegistration, value: string) => {
    const current = getDraftForReg(r);
    setScoreDrafts((prev) => ({
      ...prev,
      [r.id]: {
        ...current,
        vest: '',
        act: '',
        fid: '',
        total: value,
      },
    }));
  };

  const handleSaveParticipantScore = async (r: BiblicalCharacterRegistration) => {
    if (!canScoreContest) {
      showToast('Solo administradores pueden registrar o modificar puntajes.');
      return;
    }
    const draft = getDraftForReg(r);
    const v = clampNum(draft.vest, 30);
    const a = clampNum(draft.act, 30);
    const f = clampNum(draft.fid, 40);
    const directTotal = clampNum(draft.total, 100);

    const hasCriteria = v !== undefined || a !== undefined || f !== undefined;
    const computedTotal = hasCriteria
      ? Math.min(100, Math.round(((v ?? 0) + (a ?? 0) + (f ?? 0)) * 10) / 10)
      : directTotal;

    if (computedTotal === undefined) {
      showToast(`Ingresa el puntaje de ${r.nombre} antes de guardar.`);
      return;
    }

    setSavingScoreId(r.id);
    try {
      const updatedReg: BiblicalCharacterRegistration = {
        ...r,
        puntajeCaracterizacion: v,
        puntajeActuacion: a,
        puntajeFidelidad: f,
        puntajeTotal: computedTotal,
        participo: true,
        calificadoPor: currentUser?.name || 'Administrador',
        calificadoAt: new Date().toISOString(),
      };
      await onUpdateRegistration(updatedReg);
      setScoreDrafts((prev) => {
        const next = { ...prev };
        delete next[r.id];
        return next;
      });
      showToast(`✅ ${r.nombre}: ${computedTotal} pts guardados en vivo.`);
    } finally {
      setSavingScoreId(null);
    }
  };

  const handleClearParticipantScore = async (r: BiblicalCharacterRegistration) => {
    if (!canScoreContest) return;
    setSavingScoreId(r.id);
    try {
      const clearedReg: BiblicalCharacterRegistration = {
        ...r,
        puntajeCaracterizacion: undefined,
        puntajeActuacion: undefined,
        puntajeFidelidad: undefined,
        puntajeTotal: undefined,
        participo: false,
        calificadoPor: undefined,
        calificadoAt: undefined,
      };
      await onUpdateRegistration(clearedReg);
      setScoreDrafts((prev) => {
        const next = { ...prev };
        delete next[r.id];
        return next;
      });
      showToast(`Puntaje de ${r.nombre} reiniciado.`);
    } finally {
      setSavingScoreId(null);
    }
  };

  const renderCategoryBadge = (edad?: string) => {
    const cat = classifyCharacterByAge(edad);
    if (cat === 'ninos') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800 whitespace-nowrap">
          Niños
        </span>
      );
    }
    if (cat === 'adultos') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 whitespace-nowrap">
          Adultos
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 whitespace-nowrap">
        Sin edad
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="no-print fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-amber-900 text-amber-50 text-xs font-semibold rounded-2xl shadow-xl border border-amber-700 animate-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Management Content (hidden when printing separated scorecards or live contest) */}
      <div className={isPrintScorecardOpen || isLiveContestOpen ? 'no-print space-y-6' : 'space-y-6'}>
      {/* Top Breadcrumb & Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-amber-300 dark:border-amber-900/60 p-4 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={onBackToPortal}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center p-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
                title="Volver al Portal General"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-extrabold uppercase tracking-wide">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Evento Especial Eclesia</span>
              </div>
            </div>

            <h1 className="text-xl sm:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight flex items-center gap-3">
              <span>📖 Concurso: Imita tu Personaje Bíblico</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
              Gestión oficial de participantes y planilla de jurado.
              <span className="ml-1.5 font-bold text-amber-700 dark:text-amber-400">· Sábado 28 de noviembre de 2026</span>
            </p>
          </div>

          {/* Primary Quick Action Buttons */}
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5 w-full md:w-auto">
            <button
              type="button"
              onClick={() => {
                setTempConfig(contestConfig);
                setIsConfigModalOpen(true);
              }}
              className="min-h-[42px] px-3.5 sm:px-4 py-2.5 rounded-2xl border-2 border-amber-400 dark:border-amber-700 hover:border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-extrabold text-xs inline-flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
              title="Configurar foto de portada horizontal, colores y flyer vertical"
            >
              <Palette className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Personalizar Portada</span>
            </button>

            {onRefreshRegistrations && (
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="min-h-[42px] px-3.5 sm:px-4 py-2.5 rounded-2xl border-2 border-emerald-500/50 hover:border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-extrabold text-xs inline-flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-60"
                title="Consultar y actualizar registros en vivo desde la base de datos"
              >
                <RefreshCw className={`w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Sincronizando...' : 'Sincronizar Nube'}</span>
                {lastSyncedAt && (
                  <span className="text-[10px] opacity-75 font-mono hidden sm:inline">
                    ({lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })})
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handleSharePublicLink}
              className="min-h-[42px] px-3.5 sm:px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs inline-flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Share2 className="w-4 h-4 shrink-0" />
              <span>Compartir WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPrintScorecardOpen(true)}
              className="min-h-[42px] px-3.5 sm:px-4 py-2.5 rounded-2xl border-2 border-slate-300 dark:border-slate-700 hover:border-amber-600 dark:hover:border-amber-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold text-xs inline-flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Imprimir (Niños / Adultos)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsNewModalOpen(true)}
              className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs inline-flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Nueva Inscripción</span>
            </button>

            <button
              type="button"
              onClick={openLiveContestModal}
              className="min-h-[44px] sm:col-span-2 md:col-span-1 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-amber-600 hover:from-indigo-500 hover:via-purple-500 hover:to-amber-500 text-white font-extrabold text-xs inline-flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              title="Abrir panel en tiempo real para puntuar y calcular ganadores"
            >
              <Play className="w-4 h-4 fill-current shrink-0" />
              <span>Iniciar Concurso</span>
            </button>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5 mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setFilterCategory('all')}
            className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
              filterCategory === 'all'
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-700 ring-2 ring-amber-400/30'
                : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50'
            }`}
          >
            <div className="flex items-center justify-between text-amber-800 dark:text-amber-300 mb-1">
              <span className="text-[11px] font-bold uppercase">Total Inscritos</span>
              <Users className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-amber-900 dark:text-amber-200 font-mono">
              {stats.total}
            </div>
            <span className="text-[11px] text-amber-700/80 dark:text-amber-400/80">participantes</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterCategory(filterCategory === 'ninos' ? 'all' : 'ninos')}
            className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
              filterCategory === 'ninos'
                ? 'bg-sky-100 dark:bg-sky-950/60 border-sky-500 ring-2 ring-sky-400/40'
                : 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-900/50 hover:border-sky-400'
            }`}
          >
            <div className="flex items-center justify-between text-sky-800 dark:text-sky-300 mb-1">
              <span className="text-[11px] font-bold uppercase">Niños</span>
              <Users className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-sky-900 dark:text-sky-200 font-mono">
              {stats.ninos}
            </div>
            <span className="text-[11px] text-sky-700/80 dark:text-sky-400/80">hasta 17 años</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterCategory(filterCategory === 'adultos' ? 'all' : 'adultos')}
            className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
              filterCategory === 'adultos'
                ? 'bg-indigo-100 dark:bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-400/40'
                : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/50 hover:border-indigo-400'
            }`}
          >
            <div className="flex items-center justify-between text-indigo-800 dark:text-indigo-300 mb-1">
              <span className="text-[11px] font-bold uppercase">Adultos</span>
              <User className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-indigo-900 dark:text-indigo-200 font-mono">
              {stats.adultos}
            </div>
            <span className="text-[11px] text-indigo-700/80 dark:text-indigo-400/80">18 años en adelante</span>
          </button>

          <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50">
            <div className="flex items-center justify-between text-blue-800 dark:text-blue-300 mb-1">
              <span className="text-[11px] font-bold uppercase">Con Audio</span>
              <Volume2 className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-blue-900 dark:text-blue-200 font-mono">
              {stats.conAudio}
            </div>
            <span className="text-[11px] text-blue-700/80 dark:text-blue-400/80">pista musical</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700">
            <div className="flex items-center justify-between text-slate-800 dark:text-slate-300 mb-1">
              <span className="text-[11px] font-bold uppercase">Sin Audio</span>
              <VolumeX className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {stats.sinAudio}
            </div>
            <span className="text-[11px] text-slate-600 dark:text-slate-400">solo voz</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50">
            <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 mb-1">
              <span className="text-[11px] font-bold uppercase">Aprobados</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-emerald-900 dark:text-emerald-200 font-mono">
              {stats.aprobados}
            </div>
            <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">confirmados</span>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar participante, personaje o contacto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full min-h-[42px] pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 w-full lg:w-auto">
          {/* Categoría Edad Filter */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-300 dark:border-slate-700 text-[11px] sm:text-xs font-bold">
            <button
              type="button"
              onClick={() => setFilterCategory('all')}
              className={`flex-1 sm:flex-initial min-h-[34px] px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                filterCategory === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setFilterCategory('ninos')}
              className={`flex-1 sm:flex-initial min-h-[34px] px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                filterCategory === 'ninos'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Niños ({stats.ninos})
            </button>
            <button
              type="button"
              onClick={() => setFilterCategory('adultos')}
              className={`flex-1 sm:flex-initial min-h-[34px] px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                filterCategory === 'adultos'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Adultos ({stats.adultos})
            </button>
            {stats.sinClasificar > 0 && (
              <button
                type="button"
                onClick={() => setFilterCategory('sin_clasificar')}
                className={`flex-1 sm:flex-initial min-h-[34px] px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  filterCategory === 'sin_clasificar'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Sin edad ({stats.sinClasificar})
              </button>
            )}
          </div>

          {/* Iglesia Filter */}
          <div className="relative">
            <Church className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={filterIglesia}
              onChange={(e) => setFilterIglesia(e.target.value)}
              className="w-full sm:w-auto min-h-[40px] pl-8 pr-7 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="all">Todas las iglesias</option>
              {CHURCH_OPTIONS.map((ch) => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </select>
          </div>

          {/* Audio Filter */}
          <div className="grid grid-cols-3 sm:inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-300 dark:border-slate-700 text-[11px] sm:text-xs font-bold">
            <button
              type="button"
              onClick={() => setFilterAudio('all')}
              className={`min-h-[34px] px-2 sm:px-3 py-1 rounded-lg transition-all cursor-pointer truncate ${
                filterAudio === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Audio: Todos
            </button>
            <button
              type="button"
              onClick={() => setFilterAudio('si')}
              className={`min-h-[34px] px-2 sm:px-3 py-1 rounded-lg transition-all cursor-pointer truncate ${
                filterAudio === 'si'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Sí ({stats.conAudio})
            </button>
            <button
              type="button"
              onClick={() => setFilterAudio('no')}
              className={`min-h-[34px] px-2 sm:px-3 py-1 rounded-lg transition-all cursor-pointer truncate ${
                filterAudio === 'no'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              No ({stats.sinAudio})
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopyAll}
            className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
            {searchTerm || filterAudio !== 'all' || filterIglesia !== 'all'
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
        <>
          {/* MOBILE CARD LIST (Android & iOS Touch-First) */}
          <div className="md:hidden space-y-3">
            {filtered.map((r, idx) => (
              <div
                key={r.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-400">#{idx + 1}</span>
                      <h3 className="text-sm font-extrabold text-slate-950 dark:text-white truncate">
                        {r.nombre}
                      </h3>
                    </div>
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1 mt-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">{r.personaje}</span>
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleAprobado(r)}
                      className={`min-h-[34px] inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold transition-all shrink-0 ${
                        r.aprobado
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                      }`}
                    >
                      {r.aprobado ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      <span>{r.aprobado ? 'Aprobado' : 'Pendiente'}</span>
                    </button>
                    {typeof r.puntajeTotal === 'number' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 border border-purple-300 dark:border-purple-800 font-mono">
                        <Trophy className="w-3 h-3 text-amber-500" />
                        <span>{r.puntajeTotal} pts</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {renderCategoryBadge(r.edad)}
                  {r.iglesia && (
                    <span className="inline-flex items-center gap-1 font-bold text-amber-800 dark:text-amber-300">
                      <Church className="w-3.5 h-3.5 shrink-0" />
                      <span>{r.iglesia}</span>
                    </span>
                  )}
                  <a
                    href={`tel:${r.contacto.replace(/[^\d+]/g, '')}`}
                    className="inline-flex items-center gap-1 font-mono font-semibold text-blue-600 dark:text-blue-400"
                  >
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>{r.contacto}</span>
                  </a>
                  {r.edad && (
                    <span>Edad: <strong>{r.edad}</strong></span>
                  )}
                  <span className="inline-flex items-center gap-1 font-semibold">
                    {r.audio === 'Sí' ? (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span className="text-blue-700 dark:text-blue-300">Con Audio</span>
                      </>
                    ) : (
                      <>
                        <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                        <span>Sin Audio</span>
                      </>
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedDetail(r)}
                    className="min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-bold flex items-center justify-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Ver</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingReg({ ...r })}
                    className="min-h-[40px] rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[11px] font-bold flex items-center justify-center gap-1"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopySingle(r)}
                    className="min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-bold flex items-center justify-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Copiar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(r)}
                    className="min-h-[40px] rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[11px] font-bold flex items-center justify-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Borrar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP TABLE */}
          <div className="hidden md:block bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-extrabold">
                <tr>
                  <th className="py-3.5 px-4">#</th>
                  <th className="py-3.5 px-4">Nombre y Apellido</th>
                  <th className="py-3.5 px-4">Iglesia</th>
                  <th className="py-3.5 px-4">Edad</th>
                  <th className="py-3.5 px-4">Categoría</th>
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

                    <td className="py-3.5 px-4">
                      {r.iglesia ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800 whitespace-nowrap">
                          <Church className="w-3 h-3 shrink-0" />
                          <span>{r.iglesia}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">No esp.</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                      {r.edad || <span className="text-slate-400 italic">No esp.</span>}
                    </td>

                    <td className="py-3.5 px-4">
                      {renderCategoryBadge(r.edad)}
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
                      <div className="flex flex-wrap items-center gap-1.5">
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
                        {typeof r.puntajeTotal === 'number' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 border border-purple-300 dark:border-purple-800 font-mono">
                            <Trophy className="w-3 h-3 text-amber-500" />
                            <span>{r.puntajeTotal} pts</span>
                          </span>
                        )}
                      </div>
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
                          onClick={() => setEditingReg({ ...r })}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-amber-950 text-amber-700 dark:text-amber-400 transition-colors cursor-pointer"
                          title="Editar participante"
                        >
                          <Pencil className="w-3.5 h-3.5" />
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
                          onClick={() => setDeleteTarget(r)}
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
        </>
      )}
      </div>

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
                  <span className="text-slate-500 dark:text-slate-400 block font-bold mb-0.5">Edad / Categoría:</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                      {selectedDetail.edad || 'No especificada'}
                    </span>
                    {renderCategoryBadge(selectedDetail.edad)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400 block font-bold mb-0.5">Contacto:</span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                    {selectedDetail.contacto}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400 block font-bold mb-0.5">Iglesia:</span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                    <Church className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>{selectedDetail.iglesia || 'No especificada'}</span>
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400 block font-bold mb-0.5">¿Requiere Audio?:</span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                    {selectedDetail.audio === 'Sí' ? '🎵 Sí (Pista)' : '🎙️ No (Voz)'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopySingle(selectedDetail)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingReg({ ...selectedDetail })}
                  className="px-3.5 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 font-bold text-xs inline-flex items-center gap-1.5 text-amber-800 dark:text-amber-300 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
              </div>

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
                    Edad <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    placeholder="Ej. 12 años"
                    value={formEdad}
                    onChange={(e) => setFormEdad(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                  <div className="mt-1 flex items-center gap-1.5">
                    {formEdad.trim() ? (
                      renderCategoryBadge(formEdad)
                    ) : (
                      <span className="text-[10px] text-slate-500">Niños: hasta 17 · Adultos: 18+</span>
                    )}
                  </div>
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

              {/* 3.5 Iglesia a la que pertenece */}
              <div>
                <label className="block font-bold mb-1 text-slate-900 dark:text-white">
                  ¿A qué iglesia pertenece? <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formIglesia}
                  onChange={(e) => setFormIglesia(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium cursor-pointer"
                >
                  <option value="">-- Selecciona la iglesia --</option>
                  {CHURCH_OPTIONS.map((ch) => (
                    <option key={ch} value={ch}>
                      {ch}
                    </option>
                  ))}
                </select>
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

      {/* EDIT REGISTRATION MODAL (Real-time edit in database) */}
      {editingReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border-2 border-amber-400 dark:border-amber-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                  Edición en Tiempo Real · Base de Datos
                </span>
                <h3 className="text-xl font-extrabold text-slate-950 dark:text-white">
                  Editar Participante
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingReg(null)}
                className="p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1 text-slate-900 dark:text-white">
                  Nombre y Apellido <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingReg.nombre}
                  onChange={(e) => setEditingReg({ ...editingReg, nombre: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-900 dark:text-white">
                    Edad
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Ej. 14 años"
                    value={editingReg.edad || ''}
                    onChange={(e) => setEditingReg({ ...editingReg, edad: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                  <div className="mt-1">
                    {renderCategoryBadge(editingReg.edad)}
                  </div>
                </div>
                <div>
                  <label className="block font-bold mb-1 text-slate-900 dark:text-white">
                    Contacto <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingReg.contacto}
                    onChange={(e) => setEditingReg({ ...editingReg, contacto: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-900 dark:text-white">
                  ¿A qué iglesia pertenece?
                </label>
                <select
                  value={editingReg.iglesia || ''}
                  onChange={(e) => setEditingReg({ ...editingReg, iglesia: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium cursor-pointer"
                >
                  <option value="">-- Selecciona la iglesia --</option>
                  {CHURCH_OPTIONS.map((ch) => (
                    <option key={ch} value={ch}>
                      {ch}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-900 dark:text-white">
                  Personaje Bíblico <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingReg.personaje}
                  onChange={(e) => setEditingReg({ ...editingReg, personaje: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block font-bold mb-1.5 text-slate-900 dark:text-white">
                  ¿Requiere Audio?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingReg({ ...editingReg, audio: 'Sí' })}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                      editingReg.audio === 'Sí'
                        ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-extrabold'
                        : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium'
                    }`}
                  >
                    <Volume2 className="w-4 h-4 text-blue-500" />
                    <span>Sí (Pista)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingReg({ ...editingReg, audio: 'No' })}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                      editingReg.audio !== 'Sí'
                        ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-extrabold'
                        : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium'
                    }`}
                  >
                    <VolumeX className="w-4 h-4 text-slate-400" />
                    <span>No (Voz)</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingReg(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold shadow-sm cursor-pointer disabled:opacity-60"
                >
                  {isSavingEdit ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL (In-App, works reliably in iframes & deletes permanently in Supabase) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border-2 border-rose-400 dark:border-rose-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-950 dark:text-white">
                  ¿Eliminar inscripción?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  Vas a eliminar permanentemente a <strong>{deleteTarget.nombre}</strong> ({deleteTarget.personaje}). Esta acción borrará el registro en tiempo real de la base de datos.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-sm cursor-pointer disabled:opacity-60"
              >
                {isDeleting ? 'Eliminando...' : 'Sí, Eliminar Permanente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT SCORECARD MODAL / HOJAS SEPARADAS NIÑOS Y ADULTOS */}
      {isPrintScorecardOpen && (() => {
        const baseForPrint = printIglesia === 'all'
          ? registrations
          : registrations.filter((r) => r.iglesia === printIglesia);

        const ninosRows = baseForPrint.filter((r) => classifyCharacterByAge(r.edad) === 'ninos');
        const adultosRows = baseForPrint.filter((r) => classifyCharacterByAge(r.edad) === 'adultos');
        const sinEdadRows = baseForPrint.filter((r) => classifyCharacterByAge(r.edad) === 'sin_clasificar');

        const showNinosSheet = printCategoryMode === 'ambas' || printCategoryMode === 'ninos';
        const showAdultosSheet = printCategoryMode === 'ambas' || printCategoryMode === 'adultos';

        const renderPrintableSheet = (
          sheetTitle: string,
          ageRangeLabel: string,
          badgeStyle: string,
          rows: BiblicalCharacterRegistration[],
          startOnNewPage: boolean
        ) => (
          <section
            className={
              startOnNewPage
                ? 'print-page-break pt-8 border-t-4 border-dashed border-slate-300 print:border-t-0 print:pt-0 space-y-5'
                : 'space-y-5'
            }
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-slate-300 pb-4">
              <div>
                <div className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wide ${badgeStyle}`}>
                  <span>HOJA OFICIAL · {sheetTitle}</span>
                  <span>({ageRangeLabel})</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black mt-1.5 text-slate-950">
                  Concurso Bíblico: Imita tu Personaje Bíblico · {sheetTitle}
                </h2>
                <p className="text-xs text-slate-600 font-semibold">
                  Sábado 28 de noviembre de 2026
                  {printIglesia !== 'all' ? ` · Iglesia: ${printIglesia}` : ' · Todas las iglesias'}
                  {' · '}Criterios: Caracterización (30%), Actuación (30%), Fidelidad Bíblica (40%)
                </p>
              </div>

              <div className="px-4 py-2 rounded-2xl border-2 border-slate-300 bg-slate-50 text-center shrink-0">
                <span className="block text-xl font-black font-mono text-slate-950">{rows.length}</span>
                <span className="text-[10px] font-extrabold uppercase text-slate-600">{sheetTitle}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-300">
                <thead className="bg-slate-100 text-slate-800 font-black border-b border-slate-300">
                  <tr>
                    <th className="p-2 border-r border-slate-300 w-8 text-center">#</th>
                    <th className="p-2 border-r border-slate-300">Nombre y Apellido</th>
                    <th className="p-2 border-r border-slate-300">Iglesia</th>
                    <th className="p-2 border-r border-slate-300 w-16 text-center">Edad</th>
                    <th className="p-2 border-r border-slate-300">Personaje Bíblico</th>
                    <th className="p-2 border-r border-slate-300 w-14 text-center">Audio</th>
                    <th className="p-2 border-r border-slate-300 text-center w-24">Vestuario / Caract. (30)</th>
                    <th className="p-2 border-r border-slate-300 text-center w-24">Actuación / Voz (30)</th>
                    <th className="p-2 border-r border-slate-300 text-center w-24">Fidelidad Bíblica (40)</th>
                    <th className="p-2 border-r border-slate-300 text-center w-20">Total (100)</th>
                    <th className="p-2">Observaciones / Firma</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {rows.map((r, i) => (
                    <tr key={r.id} className="h-14">
                      <td className="p-2 border-r border-slate-300 font-mono font-bold text-center">{i + 1}</td>
                      <td className="p-2 border-r border-slate-300 font-bold">{r.nombre}</td>
                      <td className="p-2 border-r border-slate-300 text-slate-700 font-semibold">{r.iglesia || '-'}</td>
                      <td className="p-2 border-r border-slate-300 text-slate-700 text-center font-semibold">{r.edad || '-'}</td>
                      <td className="p-2 border-r border-slate-300 font-bold text-amber-900">{r.personaje}</td>
                      <td className="p-2 border-r border-slate-300 text-center font-bold">{r.audio}</td>
                      <td className="p-2 border-r border-slate-300 text-center"></td>
                      <td className="p-2 border-r border-slate-300 text-center"></td>
                      <td className="p-2 border-r border-slate-300 text-center"></td>
                      <td className="p-2 border-r border-slate-300 text-center font-mono font-bold"></td>
                      <td className="p-2"></td>
                    </tr>
                  ))}
                  {Array.from({ length: Math.max(0, 4 - rows.length) }).map((_, idx) => (
                    <tr key={`empty-${sheetTitle}-${idx}`} className="h-14">
                      <td className="p-2 border-r border-slate-300 font-mono font-bold text-center text-slate-400">
                        {rows.length + idx + 1}
                      </td>
                      <td className="p-2 border-r border-slate-300"></td>
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

            <div className="pt-5 border-t border-slate-200 grid grid-cols-3 gap-6 text-center text-xs print-avoid-break">
              <div className="space-y-8">
                <div className="border-b border-slate-400 h-8" />
                <span className="font-bold text-slate-700">Firma Jurado 1 ({sheetTitle})</span>
              </div>
              <div className="space-y-8">
                <div className="border-b border-slate-400 h-8" />
                <span className="font-bold text-slate-700">Firma Jurado 2 ({sheetTitle})</span>
              </div>
              <div className="space-y-8">
                <div className="border-b border-slate-400 h-8" />
                <span className="font-bold text-slate-700">Firma Pastor / Anciano</span>
              </div>
            </div>
          </section>
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 print:static print:inset-auto print:block print:bg-white print:p-0 print:backdrop-blur-none">
            <div className="bg-white text-slate-950 border border-slate-300 rounded-3xl max-w-5xl w-full p-5 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto space-y-6 print:border-0 print:rounded-none print:max-w-none print:max-h-none print:overflow-visible print:shadow-none print:p-0 print:space-y-0">
              {/* Top Controls Bar (hidden on print) */}
              <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-200 bg-slate-50 -mx-5 sm:-mx-8 -mt-5 sm:-mt-8 px-5 sm:px-8 pt-5 sm:pt-6 rounded-t-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-xl bg-white p-1 border border-slate-300 text-xs font-extrabold shadow-xs">
                    <button
                      type="button"
                      onClick={() => setPrintCategoryMode('ambas')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        printCategoryMode === 'ambas'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Ambas Hojas (Niños + Adultos)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintCategoryMode('ninos')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        printCategoryMode === 'ninos'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Solo Niños ({ninosRows.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintCategoryMode('adultos')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        printCategoryMode === 'adultos'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Solo Adultos ({adultosRows.length})
                    </button>
                  </div>

                  <select
                    value={printIglesia}
                    onChange={(e) => setPrintIglesia(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 cursor-pointer"
                  >
                    <option value="all">Todas las iglesias</option>
                    {CHURCH_OPTIONS.map((ch) => (
                      <option key={ch} value={ch}>
                        {ch}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimir Hojas Separadas</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPrintScorecardOpen(false)}
                    className="p-2 rounded-xl border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {printCategoryMode === 'ambas' && (
                <div className="no-print p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-900 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    Al imprimir se generarán <strong>hojas separadas</strong>: la hoja 1 de <strong>Niños</strong> y en una hoja distinta la de <strong>Adultos</strong>.
                  </span>
                  {sinEdadRows.length > 0 && (
                    <span className="font-bold text-rose-700">
                      Nota: {sinEdadRows.length} participante(s) sin edad ingresada aparecerán en una hoja adicional.
                    </span>
                  )}
                </div>
              )}

              {/* HOJA 1: NIÑOS */}
              {showNinosSheet &&
                renderPrintableSheet(
                  'NIÑOS',
                  'Hasta 17 años',
                  'bg-sky-100 text-sky-900 border border-sky-300',
                  ninosRows,
                  false
                )}

              {/* HOJA 2: ADULTOS (salto de página automático cuando se imprimen ambas) */}
              {showAdultosSheet &&
                renderPrintableSheet(
                  'ADULTOS',
                  '18 años en adelante',
                  'bg-indigo-100 text-indigo-900 border border-indigo-300',
                  adultosRows,
                  showNinosSheet
                )}

              {/* HOJA 3 OPCIONAL: SIN EDAD ESPECIFICADA */}
              {printCategoryMode === 'ambas' &&
                sinEdadRows.length > 0 &&
                renderPrintableSheet(
                  'SIN EDAD ESPECIFICADA',
                  'Pendiente de clasificar',
                  'bg-slate-200 text-slate-800 border border-slate-300',
                  sinEdadRows,
                  true
                )}
            </div>
          </div>
        );
      })()}

      {/* MODAL DE CONCURSO EN VIVO: CALIFICACIÓN EN TIEMPO REAL Y GANADORES (1.º - 3.º LUGAR) */}
      {isLiveContestOpen && (() => {
        const categoryParticipants = registrations.filter((r) => {
          if (contestCategoryTab === 'all') return true;
          return classifyCharacterByAge(r.edad) === contestCategoryTab;
        });

        const scoredRaw = categoryParticipants
          .filter((r) => r.participo === true || typeof r.puntajeTotal === 'number')
          .sort((a, b) => {
            const diff = (b.puntajeTotal ?? 0) - (a.puntajeTotal ?? 0);
            if (diff !== 0) return diff;
            const fidDiff = (b.puntajeFidelidad ?? 0) - (a.puntajeFidelidad ?? 0);
            if (fidDiff !== 0) return fidDiff;
            return (a.calificadoAt || a.fecha || '').localeCompare(b.calificadoAt || b.fecha || '');
          });

        // Asignar lugar únicamente del 1.º al 3.º; después del 3.º lugar NO se asigna lugar
        const rankedEntries: Array<{ reg: BiblicalCharacterRegistration; place: 1 | 2 | 3 | null }> = [];
        let lastScore: number | null = null;
        let lastPlace = 0;

        scoredRaw.forEach((reg, idx) => {
          const score = reg.puntajeTotal ?? 0;
          const computedPlace = lastScore !== null && score === lastScore ? lastPlace : idx + 1;
          lastScore = score;
          lastPlace = computedPlace;
          rankedEntries.push({
            reg,
            place: computedPlace <= 3 ? (computedPlace as 1 | 2 | 3) : null,
          });
        });

        const top3Winners = rankedEntries.filter((e) => e.place !== null);
        const otherParticipants = rankedEntries.filter((e) => e.place === null);
        const waitingParticipants = categoryParticipants.filter(
          (r) => r.participo !== true && typeof r.puntajeTotal !== 'number'
        );

        const visibleScoringList = categoryParticipants.filter((r) => {
          const q = contestSearch.trim().toLowerCase();
          const matchSearch =
            !q ||
            r.nombre.toLowerCase().includes(q) ||
            r.personaje.toLowerCase().includes(q) ||
            (r.iglesia && r.iglesia.toLowerCase().includes(q));
          const isScored = r.participo === true || typeof r.puntajeTotal === 'number';
          const matchStatus =
            contestFilterStatus === 'all' ||
            (contestFilterStatus === 'calificados' && isScored) ||
            (contestFilterStatus === 'pendientes' && !isScored);
          return matchSearch && matchStatus;
        });

        const categoryHeading =
          contestCategoryTab === 'ninos'
            ? 'Categoría Niños (hasta 17 años)'
            : contestCategoryTab === 'adultos'
            ? 'Categoría Adultos (18+ años)'
            : 'Clasificación General';

        const handleCopyContestResults = async () => {
          if (rankedEntries.length === 0) {
            showToast('Aún no hay participantes calificados en esta categoría.');
            return;
          }
          const lines: string[] = [
            `🏆 RESULTADOS DEL CONCURSO - IMITA TU PERSONAJE BÍBLICO`,
            `📂 ${categoryHeading}`,
            `📅 Sábado 28 de noviembre de 2026`,
            ``,
            `🥇 GANADORES (1.º AL 3.º LUGAR):`,
          ];

          top3Winners.forEach(({ reg, place }) => {
            const medal = place === 1 ? '🥇 1.º Lugar' : place === 2 ? '🥈 2.º Lugar' : '🥉 3.º Lugar';
            lines.push(
              `${medal}: ${reg.nombre} (${reg.personaje}${reg.iglesia ? ` · ${reg.iglesia}` : ''}) — ${reg.puntajeTotal ?? 0} pts`
            );
          });

          if (otherParticipants.length > 0) {
            lines.push(``, `📋 DEMÁS PARTICIPANTES (PUNTOS ALCANZADOS):`);
            otherParticipants.forEach(({ reg }) => {
              lines.push(
                `• ${reg.nombre} (${reg.personaje}${reg.iglesia ? ` · ${reg.iglesia}` : ''}) — ${reg.puntajeTotal ?? 0} pts`
              );
            });
          }

          try {
            await navigator.clipboard.writeText(lines.join('\n'));
            showToast('¡Resultados oficiales copiados al portapapeles!');
          } catch {
            showToast('No se pudo copiar automáticamente.');
          }
        };

        const placeStyles: Record<
          1 | 2 | 3,
          { label: string; emoji: string; card: string; badge: string; score: string }
        > = {
          1: {
            label: '1.º Lugar',
            emoji: '🥇',
            card: 'bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100/80 dark:from-amber-950/60 dark:via-yellow-950/40 dark:to-amber-900/40 border-2 border-amber-400 dark:border-amber-600 shadow-md',
            badge: 'bg-amber-500 text-white',
            score: 'text-amber-700 dark:text-amber-300',
          },
          2: {
            label: '2.º Lugar',
            emoji: '🥈',
            card: 'bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200/70 dark:from-slate-800/80 dark:to-slate-900 border-2 border-slate-400 dark:border-slate-500 shadow-sm',
            badge: 'bg-slate-600 text-white',
            score: 'text-slate-800 dark:text-slate-200',
          },
          3: {
            label: '3.º Lugar',
            emoji: '🥉',
            card: 'bg-gradient-to-br from-orange-50 via-amber-50/70 to-orange-100/70 dark:from-orange-950/50 dark:to-amber-950/40 border-2 border-orange-400 dark:border-orange-700 shadow-sm',
            badge: 'bg-orange-600 text-white',
            score: 'text-orange-700 dark:text-orange-300',
          },
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 print:static print:inset-auto print:block print:bg-white print:p-0 print:backdrop-blur-none">
            <div className="bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-white border-2 border-indigo-400/50 dark:border-indigo-800 rounded-3xl max-w-7xl w-full h-[94vh] flex flex-col shadow-2xl overflow-hidden print:border-0 print:rounded-none print:max-w-none print:h-auto print:overflow-visible print:shadow-none print:bg-white print:text-slate-950">
              {/* Top Header */}
              <div className="no-print bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
                <div className="flex items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-600 to-amber-600 text-white shadow-sm shrink-0">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          En Tiempo Real
                        </span>
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          {scoredRaw.length} de {categoryParticipants.length} calificados
                        </span>
                      </div>
                      <h2 className="text-base sm:text-xl font-black tracking-tight text-slate-950 dark:text-white">
                        Concurso en Vivo · Puntajes y Ganadores
                      </h2>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsLiveContestOpen(false)}
                    className="lg:hidden p-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Category Switcher */}
                  <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-300 dark:border-slate-700 text-xs font-extrabold">
                    <button
                      type="button"
                      onClick={() => setContestCategoryTab('ninos')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        contestCategoryTab === 'ninos'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700'
                      }`}
                    >
                      Niños ({stats.ninos})
                    </button>
                    <button
                      type="button"
                      onClick={() => setContestCategoryTab('adultos')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        contestCategoryTab === 'adultos'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700'
                      }`}
                    >
                      Adultos ({stats.adultos})
                    </button>
                    <button
                      type="button"
                      onClick={() => setContestCategoryTab('all')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        contestCategoryTab === 'all'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700'
                      }`}
                    >
                      Todos ({stats.total})
                    </button>
                  </div>

                  {onRefreshRegistrations && (
                    <button
                      type="button"
                      onClick={handleManualRefresh}
                      disabled={isRefreshing}
                      className="min-h-[36px] px-3 py-1.5 rounded-xl border border-emerald-400/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline">Sincronizar</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleCopyContestResults}
                    className="min-h-[36px] px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs inline-flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-amber-600" />
                    <span className="hidden sm:inline">Copiar Resultados</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="min-h-[36px] px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Imprimir Ganadores</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsLiveContestOpen(false)}
                    className="hidden lg:inline-flex p-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    title="Cerrar panel de concurso"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Body Split: Left Scoring / Right Live Winners */}
              <div className="flex-1 overflow-y-auto lg:overflow-hidden grid grid-cols-1 lg:grid-cols-12 print:block">
                {/* LEFT COLUMN: CALIFICAR PARTICIPANTES */}
                <div className="no-print lg:col-span-7 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 flex flex-col lg:h-full lg:overflow-hidden bg-slate-50/70 dark:bg-slate-950">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 shrink-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-black text-slate-950 dark:text-white flex items-center gap-2">
                          <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <span>Colocar Puntajes · {categoryHeading}</span>
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {canScoreContest
                            ? 'Ingresa los puntos por criterio (30 + 30 + 40) o directamente el total sobre 100 pts.'
                            : 'Modo solo lectura: un administrador puede colocar puntajes en tiempo real.'}
                        </p>
                      </div>
                      <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 text-[11px] font-bold self-start">
                        <button
                          type="button"
                          onClick={() => setContestFilterStatus('all')}
                          className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                            contestFilterStatus === 'all'
                              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          Todos ({categoryParticipants.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setContestFilterStatus('pendientes')}
                          className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                            contestFilterStatus === 'pendientes'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          Pendientes ({waitingParticipants.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setContestFilterStatus('calificados')}
                          className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                            contestFilterStatus === 'calificados'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          Calificados ({scoredRaw.length})
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Buscar participante por nombre, personaje o iglesia..."
                        value={contestSearch}
                        onChange={(e) => setContestSearch(e.target.value)}
                        className="w-full min-h-[38px] pl-9 pr-4 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex-1 lg:overflow-y-auto p-3 sm:p-4 space-y-3">
                    {visibleScoringList.length === 0 ? (
                      <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-800 p-8 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
                        <Trophy className="w-8 h-8 mx-auto text-slate-400" />
                        <p className="font-bold text-slate-700 dark:text-slate-300">
                          No hay participantes en esta vista
                        </p>
                        <p>Cambia de categoría o limpia el filtro de búsqueda.</p>
                      </div>
                    ) : (
                      visibleScoringList.map((r) => {
                        const draft = getDraftForReg(r);
                        const isScored = r.participo === true || typeof r.puntajeTotal === 'number';
                        const isSaving = savingScoreId === r.id;
                        const rankMatch = rankedEntries.find((e) => e.reg.id === r.id);

                        return (
                          <div
                            key={r.id}
                            className={`rounded-2xl border-2 p-3.5 sm:p-4 transition-all space-y-3 ${
                              isScored
                                ? 'bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-800 shadow-xs'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-sm font-black text-slate-950 dark:text-white">
                                    {r.nombre}
                                  </h4>
                                  {renderCategoryBadge(r.edad)}
                                  {r.edad && (
                                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                      ({r.edad})
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                                  <span className="font-extrabold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                    {r.personaje}
                                  </span>
                                  {r.iglesia && (
                                    <span className="text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1">
                                      <Church className="w-3 h-3 text-slate-400" />
                                      {r.iglesia}
                                    </span>
                                  )}
                                  {r.audio === 'Sí' && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                                      <Volume2 className="w-3 h-3" />
                                      Audio
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {isScored ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 font-mono">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>{r.puntajeTotal ?? 0} pts</span>
                                    {rankMatch?.place && (
                                      <span className="ml-0.5 text-[10px] font-extrabold text-amber-700 dark:text-amber-300">
                                        · {rankMatch.place}.º Lugar
                                      </span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                    <Clock className="w-3 h-3" />
                                    <span>En espera</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {canScoreContest && (
                              <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-12 gap-2 items-end">
                                <div className="sm:col-span-2">
                                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                                    Caract. /30
                                  </label>
                                  <input
                                    type="number"
                                    min={0}
                                    max={30}
                                    step="0.5"
                                    placeholder="0-30"
                                    value={draft.vest}
                                    onChange={(e) => handleCriteriaDraftChange(r, 'vest', e.target.value)}
                                    className="w-full min-h-[36px] px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  />
                                </div>

                                <div className="sm:col-span-2">
                                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                                    Actuac. /30
                                  </label>
                                  <input
                                    type="number"
                                    min={0}
                                    max={30}
                                    step="0.5"
                                    placeholder="0-30"
                                    value={draft.act}
                                    onChange={(e) => handleCriteriaDraftChange(r, 'act', e.target.value)}
                                    className="w-full min-h-[36px] px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  />
                                </div>

                                <div className="sm:col-span-2">
                                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                                    Fidelid. /40
                                  </label>
                                  <input
                                    type="number"
                                    min={0}
                                    max={40}
                                    step="0.5"
                                    placeholder="0-40"
                                    value={draft.fid}
                                    onChange={(e) => handleCriteriaDraftChange(r, 'fid', e.target.value)}
                                    className="w-full min-h-[36px] px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  />
                                </div>

                                <div className="sm:col-span-3">
                                  <label className="block text-[10px] font-extrabold text-indigo-700 dark:text-indigo-300 mb-1">
                                    Total /100 pts
                                  </label>
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    step="0.5"
                                    placeholder="Ej. 95"
                                    value={draft.total}
                                    onChange={(e) => handleDirectTotalDraftChange(r, e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSaveParticipantScore(r);
                                      }
                                    }}
                                    className="w-full min-h-[36px] px-2.5 py-1.5 rounded-xl border-2 border-indigo-400 dark:border-indigo-700 bg-indigo-50/70 dark:bg-indigo-950/40 text-sm font-mono font-black text-indigo-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  />
                                </div>

                                <div className="col-span-2 sm:col-span-3 flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    disabled={isSaving}
                                    onClick={() => handleSaveParticipantScore(r)}
                                    className="flex-1 min-h-[36px] px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs inline-flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-60"
                                  >
                                    <Save className="w-3.5 h-3.5 shrink-0" />
                                    <span>{isSaving ? '...' : isScored ? 'Actualizar' : 'Guardar'}</span>
                                  </button>

                                  {isScored && (
                                    <button
                                      type="button"
                                      disabled={isSaving}
                                      onClick={() => handleClearParticipantScore(r)}
                                      title="Limpiar puntaje de este participante"
                                      className="min-h-[36px] px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN: GANADORES EN VIVO (1.º AL 3.º LUGAR) Y DEMÁS SIN LUGAR */}
                <div className="lg:col-span-5 flex flex-col lg:h-full lg:overflow-y-auto p-4 sm:p-5 space-y-5 bg-white dark:bg-slate-900 print:p-4">
                  {/* Printable Header (visible on print and nice header on screen) */}
                  <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        Tabla Oficial en Vivo
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-slate-950 dark:text-white">
                        🏆 Ganadores · {categoryHeading}
                      </h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs font-extrabold text-amber-800 dark:text-amber-300 font-mono">
                      {scoredRaw.length} calificados
                    </span>
                  </div>

                  {/* PODIO: 1.º AL 3.º LUGAR */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                        Podio (1.º al 3.º Lugar)
                      </span>
                    </div>

                    {top3Winners.length === 0 ? (
                      <div className="rounded-2xl border-2 border-dashed border-amber-300/70 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/10 p-6 text-center space-y-2">
                        <Trophy className="w-8 h-8 mx-auto text-amber-500" />
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Aún no hay puntajes registrados
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          A medida que vayas guardando los puntajes, el sistema ubicará automáticamente del 1.º al 3.º lugar aquí.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {top3Winners.map(({ reg, place }) => {
                          if (!place) return null;
                          const style = placeStyles[place];
                          return (
                            <div key={reg.id} className={`rounded-2xl p-3.5 sm:p-4 ${style.card}`}>
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0 space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase ${style.badge}`}>
                                      <span>{style.emoji}</span>
                                      <span>{style.label}</span>
                                    </span>
                                    {reg.iglesia && (
                                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                        {reg.iglesia}
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="text-sm sm:text-base font-black text-slate-950 dark:text-white truncate">
                                    {reg.nombre}
                                  </h4>
                                  <p className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                    <span className="truncate">{reg.personaje}</span>
                                  </p>
                                  {(typeof reg.puntajeCaracterizacion === 'number' ||
                                    typeof reg.puntajeActuacion === 'number' ||
                                    typeof reg.puntajeFidelidad === 'number') && (
                                    <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 font-mono">
                                      Caract: {reg.puntajeCaracterizacion ?? 0} · Act: {reg.puntajeActuacion ?? 0} · Fidel: {reg.puntajeFidelidad ?? 0}
                                    </p>
                                  )}
                                </div>

                                <div className="text-right shrink-0">
                                  <span className={`block text-2xl sm:text-3xl font-black font-mono leading-none ${style.score}`}>
                                    {reg.puntajeTotal ?? 0}
                                  </span>
                                  <span className="text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400">
                                    puntos
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* DEMÁS PARTICIPANTES DESPUÉS DEL 3.º LUGAR (SIN ASIGNAR LUGAR) */}
                  {otherParticipants.length > 0 && (
                    <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                          Demás Participantes (Puntos Alcanzados)
                        </span>
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          {otherParticipants.length} participante(s)
                        </span>
                      </div>

                      <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 overflow-hidden">
                        {otherParticipants.map(({ reg }) => (
                          <div
                            key={reg.id}
                            className="px-3.5 py-2.5 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                                {reg.nombre}
                              </p>
                              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                                {reg.personaje}
                                {reg.iglesia ? ` · ${reg.iglesia}` : ''}
                              </p>
                            </div>
                            <span className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-black font-mono text-slate-800 dark:text-slate-100 shrink-0">
                              {reg.puntajeTotal ?? 0} pts
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* EN ESPERA DE PARTICIPAR */}
                  {waitingParticipants.length > 0 && (
                    <div className="no-print space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400 block">
                        Por participar ({waitingParticipants.length})
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {waitingParticipants.map((r) => (
                          <span
                            key={r.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          >
                            <span>{r.nombre}</span>
                            <span className="text-slate-400">·</span>
                            <span className="text-amber-700 dark:text-amber-400 font-bold">{r.personaje}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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
