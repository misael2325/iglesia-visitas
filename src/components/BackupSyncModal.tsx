import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Download, 
  Upload, 
  Cloud, 
  Database, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Copy, 
  ExternalLink, 
  FileJson,
  CheckCircle2,
  TableProperties,
  ShieldCheck,
  Layers,
  Lock
} from 'lucide-react';
import { 
  Attendee, 
  ChurchEvent, 
  AppUser, 
  Club, 
  ClubActivity, 
  ClubTransaction,
  ChurchPhoto,
  PhotoAlbum,
  CamporeeShirtPayment,
  ClubEnrollment,
  BiblicalCharacterRegistration,
  ContestCustomConfig,
  YouthGame
} from '../types';
import { 
  getSupabaseConfig, 
  saveSupabaseConfig, 
  testSupabaseConnection, 
  pushDataToSupabase, 
  pullDataFromSupabase,
  verifyDatabaseTables,
  TableStatus,
  SUPABASE_SQL_SETUP,
  ChurchDataPayload,
  DEFAULT_SUPABASE_ANON_KEY,
  DEFAULT_SUPABASE_URL,
  PERMANENT_SYNC_CODE,
  REQUIRED_DATABASE_TABLES,
  getLocalDeletedIds
} from '../services/supabaseClient';

interface BackupSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendees: Attendee[];
  events: ChurchEvent[];
  zones: string[];
  users?: AppUser[];
  clubs?: Club[];
  clubActivities?: ClubActivity[];
  clubTransactions?: ClubTransaction[];
  photos?: ChurchPhoto[];
  photoAlbums?: PhotoAlbum[];
  camporeeShirts?: CamporeeShirtPayment[];
  clubEnrollments?: ClubEnrollment[];
  biblicalCharacters?: BiblicalCharacterRegistration[];
  contestConfig?: ContestCustomConfig;
  youthGames?: YouthGame[];
  onRestoreData: (payload: ChurchDataPayload, mode: 'replace' | 'merge') => void;
  onNotify: (msg: string) => void;
  initialTab?: 'tables' | 'supabase' | 'json';
}

export const BackupSyncModal: React.FC<BackupSyncModalProps> = ({
  isOpen,
  onClose,
  attendees,
  events,
  zones,
  users,
  clubs,
  clubActivities,
  clubTransactions,
  photos,
  photoAlbums,
  camporeeShirts,
  clubEnrollments,
  biblicalCharacters,
  contestConfig,
  youthGames,
  onRestoreData,
  onNotify,
  initialTab = 'tables',
}) => {
  const [activeTab, setActiveTab] = useState<'tables' | 'supabase' | 'json'>(initialTab);
  
  // Supabase states
  const [supabaseConfig, setSupabaseConfigState] = useState(() => getSupabaseConfig());
  const [isTesting, setIsTesting] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [showSqlCode, setShowSqlCode] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Table verification state
  const [isCheckingTables, setIsCheckingTables] = useState(false);
  const [tableReport, setTableReport] = useState<{
    allExist: boolean;
    tables: TableStatus[];
    generalMessage: string;
  } | null>(null);

  // JSON upload states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedBackup, setParsedBackup] = useState<ChurchDataPayload | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Automatically check tables when opened or when tab switches to tables
  useEffect(() => {
    if (isOpen && activeTab === 'tables' && !tableReport && !isCheckingTables) {
      handleCheckTables();
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  // Check database tables
  const handleCheckTables = async () => {
    setIsCheckingTables(true);
    try {
      const res = await verifyDatabaseTables();
      setTableReport(res);
      if (res.allExist) {
        onNotify('¡Todas las tablas para cada sub-menú están verificadas y operativas!');
      }
    } catch (e: any) {
      onNotify('Error al verificar tablas: ' + (e.message || 'error de red'));
    } finally {
      setIsCheckingTables(false);
    }
  };

  // Export JSON file
  const handleExportJson = () => {
    const payload: ChurchDataPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      attendees,
      events,
      zones,
      users,
      clubs,
      clubActivities,
      clubTransactions,
      photos,
      photoAlbums,
      camporeeShirts,
      clubEnrollments,
      biblicalCharacters,
      contestConfig,
      youthGames,
    };

    const dateStr = new Date().toISOString().split('T')[0];
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `eclesia_respaldo_iglesia_${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    onNotify('Respaldo JSON descargado con éxito.');
  };

  // Read JSON file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setJsonError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed || !Array.isArray(parsed.attendees) || !Array.isArray(parsed.events)) {
          throw new Error('El archivo no tiene la estructura válida de respaldo de Eclesia.');
        }

        setParsedBackup(parsed);
      } catch (err: any) {
        setJsonError(err.message || 'Error al procesar el archivo JSON.');
        setParsedBackup(null);
      }
    };
    reader.readAsText(file);
  };

  const handleApplyRestore = (mode: 'replace' | 'merge') => {
    if (!parsedBackup) return;
    onRestoreData(parsedBackup, mode);
    setParsedBackup(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  // Supabase Config Actions (locked to permanent project code)
  const handleSaveConfig = () => {
    const updated = {
      url: DEFAULT_SUPABASE_URL,
      anonKey: DEFAULT_SUPABASE_ANON_KEY,
      autoSync: true,
    };
    setSupabaseConfigState(updated);
    saveSupabaseConfig(updated);
    return updated;
  };

  const handleTestConnection = async () => {
    handleSaveConfig();
    setIsTesting(true);
    setConnectionStatus(null);
    const res = await testSupabaseConnection();
    setIsTesting(false);
    setConnectionStatus(res);
  };

  const handlePushSupabase = async () => {
    handleSaveConfig();
    setIsPushing(true);
    const payload: ChurchDataPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      attendees,
      events,
      zones,
      users,
      clubs,
      clubActivities,
      clubTransactions,
      photos,
      photoAlbums,
      camporeeShirts,
      clubEnrollments,
      biblicalCharacters,
      contestConfig,
      youthGames,
      deletedIds: getLocalDeletedIds(),
    };
    const res = await pushDataToSupabase(payload);
    setIsPushing(false);
    if (res.success) {
      onNotify('¡Datos guardados con éxito en la base de datos Supabase!');
      setConnectionStatus({ success: true, message: res.message });
      // Re-verify table counts
      handleCheckTables();
    } else {
      setConnectionStatus({ success: false, message: res.message });
    }
  };

  const handlePullSupabase = async () => {
    handleSaveConfig();
    setIsPulling(true);
    const res = await pullDataFromSupabase();
    setIsPulling(false);
    if (res.success && res.data) {
      onRestoreData(res.data, 'replace');
      onNotify(res.message);
      setConnectionStatus({ success: true, message: res.message });
      onClose();
    } else {
      setConnectionStatus({ success: false, message: res.message });
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SETUP);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/30 rounded-xl text-blue-200 border border-blue-400/30">
              <Database className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Configuración del Sistema y Base de Datos</h2>
              <p className="text-xs text-slate-300 font-medium">Verificación de tablas ({REQUIRED_DATABASE_TABLES.length}), código permanente Supabase en tiempo real y respaldos JSON</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-6 pt-3 gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('tables')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-t border-x shrink-0 ${
              activeTab === 'tables'
                ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <TableProperties className="w-4 h-4" />
              Verificar Tablas en Database
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('supabase')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-t border-x shrink-0 ${
              activeTab === 'supabase'
                ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Cloud className="w-4 h-4" />
              Sincronización en la Nube
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('json')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-t border-x shrink-0 ${
              activeTab === 'json'
                ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <FileJson className="w-4 h-4" />
              Respaldo en JSON
            </span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: VERIFICAR TABLAS EN DATABASE */}
          {activeTab === 'tables' && (
            <div className="space-y-5">
              {/* Top verification banner */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    Estado de Tablas para Cada Sub-Menú
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Verifica si cada tabla requerida existe en PostgreSQL / Supabase para guardar la información correspondiente
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCheckTables}
                    disabled={isCheckingTables}
                    className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingTables ? 'animate-spin' : ''}`} />
                    <span>Verificar Ahora</span>
                  </button>
                </div>
              </div>

              {/* Status summary message */}
              {tableReport && (
                <div
                  className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
                    tableReport.allExist
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
                      : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300'
                  }`}
                >
                  {tableReport.allExist ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-bold text-sm mb-0.5">
                      {tableReport.allExist
                        ? '¡Todas las tablas relacionales están creadas y listas!'
                        : 'Tablas pendientes de creación detectadas'}
                    </p>
                    <p>{tableReport.generalMessage}</p>
                  </div>
                </div>
              )}

              {/* Table List with Status */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
                <div className="px-4 py-2.5 bg-slate-900 text-white text-xs font-bold flex items-center justify-between">
                  <span>Sub-Menú y Tabla Correspondiente</span>
                  <span>Estado en Base de Datos</span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(tableReport?.tables || REQUIRED_DATABASE_TABLES.map((t) => ({ ...t, exists: false, count: null }))).map((t) => (
                    <div
                      key={t.name}
                      className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-950/50 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {t.label}
                          </span>
                          <code className="text-[11px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                            {t.name}
                          </code>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {t.submenu}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {t.exists ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Creada ({t.count ?? 0} filas)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <span>Pendiente de Crear</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Box: Copy SQL & Open Supabase SQL Editor */}
              <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Script SQL para Crear Todas las Tablas con 1 Clic
                    </h4>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Copia el código y ejecútalo en tu consola de Supabase SQL Editor para crear las tablas al instante.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleCopySql}
                      className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
                    >
                      {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSql ? '¡Código Copiado!' : 'Copiar Código SQL'}</span>
                    </button>

                    <a
                      href="https://supabase.com/dashboard/project/ewwtdeypwetvpjjbbgdi/sql/new"
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2 text-xs font-bold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      <span>Abrir SQL Editor</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSqlCode(!showSqlCode)}
                    className="text-xs text-blue-400 hover:text-blue-300 underline"
                  >
                    {showSqlCode ? 'Ocultar código SQL' : 'Mostrar / Inspeccionar código SQL completo'}
                  </button>

                  {showSqlCode && (
                    <pre className="mt-3 p-3 bg-slate-950 rounded-lg text-emerald-300 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-64 border border-slate-800">
                      {SUPABASE_SQL_SETUP}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SUPABASE SYNC */}
          {activeTab === 'supabase' && (
            <div className="space-y-5">
              {/* Project banner */}
              <div className="p-4 bg-blue-50/70 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-950 dark:text-blue-200">
                    <Cloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Conexión a tu Base de Datos en Supabase:</span>
                  </div>
                  <a
                    href="https://supabase.com/dashboard/project/ewwtdeypwetvpjjbbgdi"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 underline"
                  >
                    <span>Abrir Dashboard</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-xs text-blue-900/80 dark:text-blue-300/80">
                  Almacena y sincroniza la misma información desde cualquier computadora, tablet o celular en tiempo real con tu base de datos en la nube.
                </p>
              </div>

              {/* Permanent Locked Sync Code Banner */}
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-800 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-900 dark:text-emerald-200">
                    <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Código de Sincronización Permanente (Bloqueado)</span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-600 text-white">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Permanente · No Editable</span>
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-emerald-200 dark:border-emerald-800 font-mono text-xs font-extrabold text-slate-900 dark:text-emerald-300 select-all">
                  <span>{PERMANENT_SYNC_CODE}</span>
                  <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                </div>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
                  Este código está vinculado de forma fija al sistema. No importa desde qué computadora, celular o navegador lo abras: siempre se conectará en tiempo real a la misma base de datos sin permitir ediciones accidentales.
                </p>
              </div>

              {/* Supabase credentials (Read-only / Locked) */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-slate-400" />
                      <span>Supabase Project URL (Fija)</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={DEFAULT_SUPABASE_URL}
                    className="w-full px-3.5 py-2 text-xs font-mono bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 cursor-not-allowed select-all"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-slate-400" />
                      <span>Supabase Anon / Public Key (Fija)</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={DEFAULT_SUPABASE_ANON_KEY}
                    className="w-full px-3.5 py-2 text-xs font-mono bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 cursor-not-allowed select-all"
                  />
                </div>

                <div className="pt-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Sincronización automática en tiempo real activa permanentemente en todas las PCs</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Test, Push, Pull */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>Probar Conexión</span>
                </button>

                <button
                  type="button"
                  onClick={handlePushSupabase}
                  disabled={isPushing}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <Upload className={`w-3.5 h-3.5 ${isPushing ? 'animate-spin' : ''}`} />
                  <span>Guardar en Supabase (Nube)</span>
                </button>

                <button
                  type="button"
                  onClick={handlePullSupabase}
                  disabled={isPulling}
                  className="px-4 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Download className={`w-3.5 h-3.5 ${isPulling ? 'animate-spin' : ''}`} />
                  <span>Descargar desde Supabase</span>
                </button>
              </div>

              {/* Status Message */}
              {connectionStatus && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                    connectionStatus.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                  }`}
                >
                  {connectionStatus.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{connectionStatus.message}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RESPALDO JSON */}
          {activeTab === 'json' && (
            <div className="space-y-6">
              {/* Export Box */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      1. Descargar Respaldo Completo en Formato JSON
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Guarda un archivo con todos los asistentes, visitas, conferencias, clubes y asistencias reales marcadas.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5 shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    Descargar .JSON
                  </button>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span>Asistentes registrados: <strong>{attendees.length}</strong></span>
                  <span>·</span>
                  <span>Conferencias: <strong>{events.length}</strong></span>
                  <span>·</span>
                  <span>Clubes: <strong>{(clubs || []).length}</strong></span>
                </div>
              </div>

              {/* Import / Restore Box */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    2. Cargar / Restaurar desde Archivo JSON
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Selecciona un archivo JSON generado previamente para recuperar tus datos.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    className="text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-200 dark:file:bg-slate-800 file:text-slate-800 dark:file:text-slate-200 hover:file:bg-slate-300 dark:hover:file:bg-slate-700"
                  />
                </div>

                {jsonError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>{jsonError}</span>
                  </div>
                )}

                {/* Preview if parsed */}
                {parsedBackup && (
                  <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-300 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Archivo de respaldo válido detectado:</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-emerald-800 dark:text-emerald-200">
                      <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <span className="text-[10px] uppercase block text-slate-400">Asistentes</span>
                        <strong className="text-base text-slate-900 dark:text-white">{parsedBackup.attendees.length}</strong>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <span className="text-[10px] uppercase block text-slate-400">Conferencias</span>
                        <strong className="text-base text-slate-900 dark:text-white">{parsedBackup.events.length}</strong>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <span className="text-[10px] uppercase block text-slate-400">Zonas</span>
                        <strong className="text-base text-slate-900 dark:text-white">{parsedBackup.zones.length}</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => handleApplyRestore('merge')}
                        className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors"
                      >
                        Combinar con datos actuales
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyRestore('replace')}
                        className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs"
                      >
                        Restaurar Respaldo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Tus datos se guardan con persistencia local y sincronización en la nube.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
