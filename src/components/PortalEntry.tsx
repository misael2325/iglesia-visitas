import React from 'react';
import { 
  ClipboardList, 
  Building2, 
  Users, 
  Calendar, 
  FileText, 
  BarChart2, 
  ArrowRight, 
  Coins, 
  Wallet, 
  TrendingUp, 
  ShieldCheck, 
  Church,
  Camera,
  Images,
  Upload,
  Share2,
  Download,
  FolderHeart,
  BookOpen,
  Sparkles
} from 'lucide-react';
import { AppUser, getRoleDisplayName, AppModule } from '../types';

interface PortalEntryProps {
  currentUser: AppUser;
  attendeesCount: number;
  eventsCount: number;
  zonesCount: number;
  clubsCount: number;
  activitiesCount: number;
  totalClubBalance: number;
  photosCount?: number;
  albumsCount?: number;
  biblicalCharactersCount?: number;
  onSelectModule: (module: 'visitas' | 'clubes' | 'fotos' | 'personaje_biblico') => void;
}

export const PortalEntry: React.FC<PortalEntryProps> = ({
  currentUser,
  attendeesCount,
  eventsCount,
  zonesCount,
  clubsCount,
  activitiesCount,
  totalClubBalance,
  photosCount = 0,
  albumsCount = 0,
  biblicalCharactersCount = 0,
  onSelectModule,
}) => {
  return (
    <div className="py-2 sm:py-8 space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="text-center max-w-3xl mx-auto space-y-2.5 sm:space-y-3 px-1">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100 dark:bg-blue-950 border border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-xs font-extrabold tracking-wide uppercase">
          <Church className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Portal de Entrada General · Eclesia</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-950 dark:text-white tracking-tight">
          Bienvenido/a, <span className="text-blue-600 dark:text-blue-400">{currentUser.name}</span>
        </h1>

        <p className="text-xs sm:text-base text-slate-700 dark:text-slate-200 font-medium max-w-2xl mx-auto">
          Selecciona el módulo con el que deseas trabajar hoy:
        </p>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 font-bold shadow-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Perfil activo: <strong className="text-slate-950 dark:text-white font-extrabold">{getRoleDisplayName(currentUser.role)}</strong></span>
        </div>
      </div>

      {/* The Three Grand Rectangular Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-7 max-w-7xl mx-auto">
        {/* CARD 1: REGISTRO VISITAS */}
        <div
          onClick={() => onSelectModule('visitas')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectModule('visitas');
            }
          }}
          className="group relative bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-300 dark:border-slate-700 hover:border-blue-600 dark:hover:border-blue-500 p-5 sm:p-7 shadow-md hover:shadow-2xl active:scale-[0.99] transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between cursor-pointer overflow-hidden text-left"
        >
          {/* Accent Header Bar */}
          <div className="absolute top-0 left-0 right-0 h-2.5 bg-blue-600 group-hover:h-3 transition-all" />

          <div>
            {/* Top Row: Big Function Icon & Category Tag */}
            <div className="flex items-start justify-between gap-4 mb-5 pt-1">
              <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg group-hover:scale-105 group-hover:shadow-blue-500/30 transition-all duration-300 shrink-0">
                <ClipboardList className="w-9 h-9" />
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800 uppercase tracking-wider">
                Módulo Asistencia
              </span>
            </div>

            {/* Title & Description */}
            <h2 className="text-xl font-extrabold text-slate-950 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              Registro Visitas y Asistencia
            </h2>

            <p className="mt-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
              Control semanal de visitas y miembros, conferencias especiales, reportes en PDF y estadísticas de crecimiento eclesiástico.
            </p>

            {/* Sub-menu features included */}
            <div className="mt-5 space-y-2">
              <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Submenús incluidos:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                  <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Asistencia
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                  <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Cultos
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                  <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  PDF
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                  <BarChart2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Estadísticas
                </span>
              </div>
            </div>

            {/* Live Metrics preview */}
            <div className="mt-6 pt-4 border-t-2 border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700">
                <span className="block text-lg sm:text-xl font-extrabold text-blue-700 dark:text-blue-400 font-mono">
                  {attendeesCount}
                </span>
                <span className="text-[10px] text-slate-700 dark:text-slate-300 font-extrabold uppercase tracking-wide">
                  Registrados
                </span>
              </div>
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700">
                <span className="block text-lg sm:text-xl font-extrabold text-blue-700 dark:text-blue-400 font-mono">
                  {eventsCount}
                </span>
                <span className="text-[10px] text-slate-700 dark:text-slate-300 font-extrabold uppercase tracking-wide">
                  Cultos
                </span>
              </div>
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700">
                <span className="block text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                  {zonesCount}
                </span>
                <span className="text-[10px] text-slate-700 dark:text-slate-300 font-extrabold uppercase tracking-wide">
                  Zonas
                </span>
              </div>
            </div>
          </div>

          {/* Action CTA Button */}
          <div className="mt-6 pt-2">
            <div className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md group-hover:shadow-blue-500/30 transition-all">
              <span>Ingresar a Registro Visitas</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </div>
        </div>

        {/* CARD 2: GESTIÓN DE CLUBES Y FINANZAS */}
        <div
          onClick={() => onSelectModule('clubes')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectModule('clubes');
            }
          }}
          className="group relative bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-300 dark:border-slate-700 hover:border-emerald-600 dark:hover:border-emerald-500 p-5 sm:p-7 shadow-md hover:shadow-2xl active:scale-[0.99] transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between cursor-pointer overflow-hidden text-left"
        >
          {/* Accent Header Bar */}
          <div className="absolute top-0 left-0 right-0 h-2.5 bg-emerald-600 group-hover:h-3 transition-all" />

          <div>
            {/* Top Row: Big Function Icon & Category Tag */}
            <div className="flex items-start justify-between gap-4 mb-5 pt-1">
              <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg group-hover:scale-105 group-hover:shadow-emerald-500/30 transition-all duration-300 shrink-0">
                <Building2 className="w-9 h-9" />
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 uppercase tracking-wider">
                Módulo Finanzas
              </span>
            </div>

            {/* Title & Description */}
            <h2 className="text-xl font-extrabold text-slate-950 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              Gestión de Clubes y Finanzas
            </h2>

            <p className="mt-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
              Administración financiera por club (Conquistadores, Aventureros, Guías, JA). Abre directamente el club para gestionar actividades, ingresos y egresos.
            </p>

            {/* Sub-menu features included */}
            <div className="mt-5 space-y-2">
              <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Submenús incluidos:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Directorio
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                  <Coins className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Actividades
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Finanzas
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                  <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Rentabilidad
                </span>
              </div>
            </div>

            {/* Live Metrics preview */}
            <div className="mt-6 pt-4 border-t-2 border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700">
                <span className="block text-lg sm:text-xl font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">
                  {clubsCount}
                </span>
                <span className="text-[10px] text-slate-700 dark:text-slate-300 font-extrabold uppercase tracking-wide">
                  Clubes
                </span>
              </div>
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700">
                <span className="block text-lg sm:text-xl font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">
                  {activitiesCount}
                </span>
                <span className="text-[10px] text-slate-700 dark:text-slate-300 font-extrabold uppercase tracking-wide">
                  Actividades
                </span>
              </div>
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700">
                <span className={`block text-lg sm:text-xl font-extrabold font-mono truncate ${
                  totalClubBalance >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  ${totalClubBalance.toLocaleString('es-ES', { minimumFractionDigits: 0 })}
                </span>
                <span className="text-[10px] text-slate-700 dark:text-slate-300 font-extrabold uppercase tracking-wide">
                  Ganancia
                </span>
              </div>
            </div>
          </div>

          {/* Action CTA Button */}
          <div className="mt-6 pt-2">
            <div className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md group-hover:shadow-emerald-500/30 transition-all">
              <span>Ingresar a Gestión Clubes</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </div>
        </div>

        {/* CARD 3: FOTOS Y GALERÍA DE LA IGLESIA (NUEVO 3ER SUBMENÚ GENERAL) */}
        <div
          onClick={() => onSelectModule('fotos')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectModule('fotos');
            }
          }}
          className="group relative bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-300 dark:border-slate-700 hover:border-violet-600 dark:hover:border-violet-500 p-5 sm:p-7 shadow-md hover:shadow-2xl active:scale-[0.99] transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between cursor-pointer overflow-hidden text-left"
        >
          {/* Accent Header Bar */}
          <div className="absolute top-0 left-0 right-0 h-2.5 bg-violet-600 group-hover:h-3 transition-all" />

          <div>
            {/* Top Row: Big Function Icon & Category Tag */}
            <div className="flex items-start justify-between gap-4 mb-5 pt-1">
              <div className="w-16 h-16 rounded-2xl bg-violet-600 flex items-center justify-center text-white shadow-lg group-hover:scale-105 group-hover:shadow-violet-500/30 transition-all duration-300 shrink-0">
                <Camera className="w-9 h-9" />
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-300 border border-violet-300 dark:border-violet-800 uppercase tracking-wider">
                Módulo Multimedia
              </span>
            </div>

            {/* Title & Description */}
            <h2 className="text-xl font-extrabold text-slate-950 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
              Fotos y Galería de la Iglesia
            </h2>

            <p className="mt-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
              Sube fotos tomadas en los cultos, bautismos y campamentos. Comparte un enlace público para que los miembros descarguen sus fotos libremente.
            </p>

            {/* Sub-menu features included */}
            <div className="mt-5 space-y-2">
              <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Submenús incluidos:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                  <Upload className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                  Subir Fotos
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                  <FolderHeart className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                  Álbumes
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                  <Share2 className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                  Enlace Público
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                  <Download className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                  Descargas
                </span>
              </div>
            </div>

            {/* Live Metrics preview */}
            <div className="mt-6 pt-4 border-t-2 border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700">
                <span className="block text-lg sm:text-xl font-extrabold text-violet-700 dark:text-violet-400 font-mono">
                  {photosCount}
                </span>
                <span className="text-[10px] text-slate-700 dark:text-slate-300 font-extrabold uppercase tracking-wide">
                  Fotos
                </span>
              </div>
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700">
                <span className="block text-lg sm:text-xl font-extrabold text-violet-700 dark:text-violet-400 font-mono">
                  {albumsCount}
                </span>
                <span className="text-[10px] text-slate-700 dark:text-slate-300 font-extrabold uppercase tracking-wide">
                  Álbumes
                </span>
              </div>
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700">
                <span className="block text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                  HD
                </span>
                <span className="text-[10px] text-slate-700 dark:text-slate-300 font-extrabold uppercase tracking-wide">
                  Calidad
                </span>
              </div>
            </div>
          </div>

          {/* Action CTA Button */}
          <div className="mt-6 pt-2">
            <div className="w-full py-3 px-4 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md group-hover:shadow-violet-500/30 transition-all">
              <span>Ingresar a Galería Fotos</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* FEATURED EVENT BANNER: IMITA TU PERSONAJE BÍBLICO */}
      <div className="max-w-7xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-600/15 dark:from-amber-950/40 dark:via-orange-950/20 dark:to-amber-900/40 border-2 border-amber-300 dark:border-amber-700/60 p-5 sm:p-7 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-start sm:items-center gap-3.5 sm:gap-5 text-left">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-amber-600 dark:bg-amber-500 text-white flex items-center justify-center text-2xl sm:text-3xl shadow-lg shrink-0">
              📖
            </div>
            <div className="space-y-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wide">
                <Sparkles className="w-3 h-3 shrink-0" />
                <span>Evento · 28 Nov 2026</span>
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-950 dark:text-white leading-snug">
                Concurso Bíblico: Imita tu Personaje Bíblico
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium max-w-xl">
                Inscripciones abiertas para participantes, requerimientos técnicos y planilla oficial para el jurado calificador.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 shrink-0 w-full md:w-auto">
            <div className="px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700/80 text-center font-mono shadow-xs flex sm:block items-center justify-between">
              <span className="text-[11px] sm:hidden text-slate-600 dark:text-slate-400 font-extrabold uppercase">
                Inscritos totales:
              </span>
              <span className="block text-lg font-black text-amber-700 dark:text-amber-400">
                {biblicalCharactersCount}
              </span>
              <span className="hidden sm:block text-[10px] text-slate-600 dark:text-slate-400 font-extrabold uppercase">
                Inscritos
              </span>
            </div>

            <button
              type="button"
              onClick={() => onSelectModule('personaje_biblico')}
              className="min-h-[44px] px-5 py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-2 shadow-md hover:shadow-amber-500/25 transition-all cursor-pointer"
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>Gestionar Inscripciones y Jurado</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
