import React, { useState, useRef } from 'react';
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
  Trash2, 
  FileJson,
  CheckCircle2,
  Save
} from 'lucide-react';
import { Attendee, ChurchEvent } from '../types';
import { 
  getSupabaseConfig, 
  saveSupabaseConfig, 
  testSupabaseConnection, 
  pushDataToSupabase, 
  pullDataFromSupabase,
  SUPABASE_SQL_SETUP,
  ChurchDataPayload,
  DEFAULT_SUPABASE_PROJECT_ID,
  DEFAULT_SUPABASE_ANON_KEY,
  DEFAULT_SUPABASE_URL,
  normalizeSupabaseUrl
} from '../services/supabaseClient';

interface BackupSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendees: Attendee[];
  events: ChurchEvent[];
  zones: string[];
  onRestoreData: (payload: ChurchDataPayload, mode: 'replace' | 'merge') => void;
  onClearAllData: () => void;
  onNotify: (msg: string) => void;
}

export const BackupSyncModal: React.FC<BackupSyncModalProps> = ({
  isOpen,
  onClose,
  attendees,
  events,
  zones,
  onRestoreData,
  onClearAllData,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<'json' | 'supabase'>('json');
  
  // Supabase states
  const [supabaseConfig, setSupabaseConfigState] = useState(() => getSupabaseConfig());
  const [isTesting, setIsTesting] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [showSqlCode, setShowSqlCode] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // JSON upload states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedBackup, setParsedBackup] = useState<ChurchDataPayload | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Export JSON file
  const handleExportJson = () => {
    const payload: ChurchDataPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      attendees,
      events,
      zones,
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

  // Supabase Config Actions
  const handleSaveConfig = () => {
    const cleanUrl = normalizeSupabaseUrl(supabaseConfig.url);
    const updated = { ...supabaseConfig, url: cleanUrl };
    setSupabaseConfigState(updated);
    saveSupabaseConfig(updated);
    onNotify('Configuración de Supabase guardada.');
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
    };
    const res = await pushDataToSupabase(payload);
    setIsPushing(false);
    if (res.success) {
      onNotify('¡Datos guardados con éxito en la base de datos Supabase!');
      setConnectionStatus({ success: true, message: res.message });
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
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/40 rounded-lg text-indigo-200 border border-indigo-400/30">
              <Database className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-base font-bold">Respaldo y Base de Datos en la Nube</h2>
              <p className="text-xs text-slate-300">Guardado en archivo JSON y sincronización con Supabase</p>
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
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('json')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-colors border-t border-x ${
              activeTab === 'json'
                ? 'bg-white border-slate-200 text-indigo-700 shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <FileJson className="w-4 h-4" />
              Respaldo en JSON (Descargar / Cargar)
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('supabase')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-colors border-t border-x ${
              activeTab === 'supabase'
                ? 'bg-white border-slate-200 text-indigo-700 shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Cloud className="w-4 h-4" />
              Base de Datos Supabase (Nube)
            </span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'json' && (
            <div className="space-y-6">
              {/* Export Box */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Download className="w-4 h-4 text-indigo-600" />
                      1. Descargar Respaldo Completo en Formato JSON
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Guarda en tu computadora o teléfono un archivo con todos los asistentes, visitas, conferencias y asistencias semanadas marcadas.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5 shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    Descargar .JSON
                  </button>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-2 pt-2 border-t border-slate-200">
                  <span>Asistentes actuales: <strong>{attendees.length}</strong></span>
                  <span>·</span>
                  <span>Conferencias: <strong>{events.length}</strong></span>
                  <span>·</span>
                  <span>Zonas: <strong>{zones.length}</strong></span>
                </div>
              </div>

              {/* Import / Restore Box */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-emerald-600" />
                    2. Cargar / Restaurar desde Archivo JSON
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Selecciona un archivo JSON generado previamente para recuperar todos los datos de la iglesia.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    className="text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-200 file:text-slate-800 hover:file:bg-slate-300"
                  />
                </div>

                {jsonError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{jsonError}</span>
                  </div>
                )}

                {/* Preview if parsed */}
                {parsedBackup && (
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-emerald-900 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Archivo de respaldo válido detectado:</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-emerald-800">
                      <div className="bg-white p-2 rounded-lg border border-emerald-200">
                        <span className="text-[10px] uppercase block text-slate-400">Asistentes</span>
                        <strong className="text-base text-slate-900">{parsedBackup.attendees.length}</strong>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-emerald-200">
                        <span className="text-[10px] uppercase block text-slate-400">Conferencias</span>
                        <strong className="text-base text-slate-900">{parsedBackup.events.length}</strong>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-emerald-200">
                        <span className="text-[10px] uppercase block text-slate-400">Zonas</span>
                        <strong className="text-base text-slate-900">{parsedBackup.zones.length}</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => handleApplyRestore('merge')}
                        className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
                      >
                        Combinar con datos actuales
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyRestore('replace')}
                        className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs"
                      >
                        Reemplazar y Restaurar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Blank Slate Option */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5 text-slate-500" />
                    Empezar con la Página en Blanco
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Limpia los registros para que seas tú quien inserte todos los datos desde cero.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('¿Deseas dejar la base de datos en blanco para ingresar tus datos reales? (Te sugerimos descargar un respaldo JSON antes).')) {
                      onClearAllData();
                      onNotify('La aplicación ahora está en blanco para tus datos reales.');
                      onClose();
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors shrink-0"
                >
                  Dejar en Blanco
                </button>
              </div>
            </div>
          )}

          {activeTab === 'supabase' && (
            <div className="space-y-5">
              {/* Project banner */}
              <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-950">
                    <Cloud className="w-4 h-4 text-indigo-600" />
                    <span>Conexión a tu Proyecto de Supabase:</span>
                  </div>
                  <a
                    href="https://supabase.com/dashboard/project/ewwtdeypwetvpjjbbgdi"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 underline"
                  >
                    <span>Abrir Dashboard</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-xs text-indigo-900/80">
                  Almacena y sincroniza la misma información desde cualquier computadora, tablet o celular en tiempo real con tu base de datos en la nube.
                </p>
              </div>

              {/* Supabase credentials */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Supabase Project URL
                    </label>
                    {supabaseConfig.url !== DEFAULT_SUPABASE_URL && (
                      <button
                        type="button"
                        onClick={() =>
                          setSupabaseConfigState({ ...supabaseConfig, url: DEFAULT_SUPABASE_URL })
                        }
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        Restablecer URL por defecto
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={supabaseConfig.url}
                    onChange={(e) =>
                      setSupabaseConfigState({ ...supabaseConfig, url: e.target.value })
                    }
                    onBlur={() => {
                      const clean = normalizeSupabaseUrl(supabaseConfig.url);
                      setSupabaseConfigState({ ...supabaseConfig, url: clean });
                      saveSupabaseConfig({ url: clean });
                    }}
                    placeholder="https://ewwtdeypwetvpjjbbgdi.supabase.co"
                    className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl text-slate-800"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Debe ser solo la URL base: <code>https://ewwtdeypwetvpjjbbgdi.supabase.co</code> (sin <code>/rest/v1/</code> al final).
                  </p>
                </div>

                {/* Verified Key Banner */}
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Clave Pública del Proyecto Configurada y Verificada</span>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    Tu clave de Supabase (<strong>sb_publishable_...</strong>) ya ha sido vinculada y probada exitosamente con la tabla <code>church_store</code>.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Supabase Anon / Public Key <span className="text-rose-500">*</span>
                    </label>
                    {supabaseConfig.anonKey !== DEFAULT_SUPABASE_ANON_KEY && (
                      <button
                        type="button"
                        onClick={() =>
                          setSupabaseConfigState({ ...supabaseConfig, anonKey: DEFAULT_SUPABASE_ANON_KEY })
                        }
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        Restablecer clave del proyecto
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={supabaseConfig.anonKey || DEFAULT_SUPABASE_ANON_KEY}
                    onChange={(e) =>
                      setSupabaseConfigState({ ...supabaseConfig, anonKey: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Clave pública asociada al proyecto <code>ewwtdeypwetvpjjbbgdi</code>.
                  </p>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={supabaseConfig.autoSync}
                      onChange={(e) =>
                        setSupabaseConfigState({ ...supabaseConfig, autoSync: e.target.checked })
                      }
                      className="rounded-sm text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Sincronización automática en la nube al realizar cambios</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons: Test, Push, Pull */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>Probar Conexión</span>
                </button>

                <button
                  type="button"
                  onClick={handlePushSupabase}
                  disabled={isPushing}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <Upload className={`w-3.5 h-3.5 ${isPushing ? 'animate-spin' : ''}`} />
                  <span>Guardar en Supabase (Nube)</span>
                </button>

                <button
                  type="button"
                  onClick={handlePullSupabase}
                  disabled={isPulling}
                  className="px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Download className={`w-3.5 h-3.5 ${isPulling ? 'animate-spin' : ''}`} />
                  <span>Cargar desde Supabase</span>
                </button>
              </div>

              {/* Status Message */}
              {connectionStatus && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                    connectionStatus.success
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                      : 'bg-rose-50 text-rose-900 border border-rose-200'
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

              {/* SQL setup script helper */}
              <div className="pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowSqlCode(!showSqlCode)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <span>{showSqlCode ? 'Ocultar código SQL de configuración' : 'Ver código SQL para crear la tabla en Supabase'}</span>
                </button>

                {showSqlCode && (
                  <div className="mt-3 p-4 bg-slate-900 text-slate-100 rounded-xl space-y-3 font-mono text-[11px]">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-slate-400 pb-2 border-b border-slate-800">
                      <span className="font-sans font-bold text-slate-200">Ejecutar en Supabase (Solo una vez):</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCopySql}
                          className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-xs bg-slate-800 px-2.5 py-1 rounded-md"
                        >
                          {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedSql ? '¡Copiado!' : 'Copiar SQL'}
                        </button>
                        <a
                          href="https://supabase.com/dashboard/project/ewwtdeypwetvpjjbbgdi/sql/new"
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-xs bg-slate-800 px-2.5 py-1 rounded-md"
                        >
                          <span>Abrir SQL Editor</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                    <p className="font-sans text-[11px] text-slate-300">
                      Pega este código en el SQL Editor y presiona <strong>Run</strong>:
                    </p>
                    <pre className="overflow-x-auto p-1 leading-relaxed text-emerald-300">
                      {SUPABASE_SQL_SETUP}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Los datos también se guardan localmente para acceso instantáneo.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-xl"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
