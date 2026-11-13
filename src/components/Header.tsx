import React, { useState, useRef, useEffect } from 'react';
import { 
  UserPlus, 
  Church, 
  Cloud, 
  User, 
  ShieldCheck, 
  Users, 
  LogOut, 
  LogIn, 
  ChevronDown,
  Moon,
  Sun,
  ClipboardList,
  Building2,
  Calendar,
  FileText,
  BarChart2,
  Database,
  LayoutGrid,
  Settings,
  Camera,
  BookOpen
} from 'lucide-react';
import { AppUser, AppModule, UserRole, getRoleDisplayName, isSecretariaRole } from '../types';

export type NavTab = 'asistencia' | 'conferencias' | 'reportes' | 'estadisticas';

interface HeaderProps {
  activeModule: AppModule;
  onChangeModule: (module: AppModule) => void;
  currentTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
  onOpenRegister: () => void;
  onOpenBackupModal: () => void;
  currentUser: AppUser | null;
  onOpenAuth: () => void;
  onOpenUserManagement: () => void;
  onLogout: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeModule,
  onChangeModule,
  currentTab,
  onChangeTab,
  onOpenRegister,
  onOpenBackupModal,
  currentUser,
  onOpenAuth,
  onOpenUserManagement,
  onLogout,
  darkMode,
  onToggleDarkMode,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAdmin = currentUser?.role === 'administrador' || currentUser?.role === 'admin';
  const isSecretaria = isSecretariaRole(currentUser?.role);

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Header Bar */}
        <div className="flex items-center justify-between gap-3 h-16">
          {/* Zone 1: Brand Wordmark & Module Switcher */}
          <div className="flex items-center gap-3 sm:gap-6 shrink-0">
            {/* Wordmark (clickable to Portal) */}
            <button
              type="button"
              onClick={() => onChangeModule('portal')}
              className="flex items-center gap-2.5 shrink-0 text-left hover:opacity-90 transition-opacity"
              title="Ir al Portal de Entrada Principal"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 shadow-xs shrink-0">
                <Church className="w-5 h-5 text-blue-300" />
              </div>
              <div className="flex flex-col">
                <span className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                  Eclesia
                </span>
                <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider hidden sm:inline">
                  Sistema Iglesia
                </span>
              </div>
            </button>

            {/* Top Primary Module Switcher: [Menú Principal] | [Registro Visitas] | [Clubes] */}
            <div className="flex items-center bg-slate-800 border-2 border-slate-700 p-1 rounded-xl shadow-xs">
              <button
                type="button"
                onClick={() => onChangeModule('portal')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all whitespace-nowrap ${
                  activeModule === 'portal'
                    ? 'bg-blue-600 text-white shadow-md ring-1 ring-white/20'
                    : 'text-slate-100 hover:text-white hover:bg-slate-700'
                }`}
                title="Portal Principal de Entrada con los 2 módulos"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-blue-300" />
                <span className="hidden sm:inline">Menú Principal</span>
                <span className="sm:hidden">Inicio</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onChangeModule('visitas');
                  if (isSecretaria && (currentTab === 'conferencias' || currentTab === 'estadisticas')) {
                    onChangeTab('asistencia');
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all whitespace-nowrap ${
                  activeModule === 'visitas'
                    ? 'bg-blue-600 text-white shadow-md ring-1 ring-white/20'
                    : 'text-slate-100 hover:text-white hover:bg-slate-700'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Registro Visitas</span>
                <span className="sm:hidden">Visitas</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeModule('clubes')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all whitespace-nowrap ${
                  activeModule === 'clubes'
                    ? 'bg-emerald-600 text-white shadow-md ring-1 ring-white/20'
                    : 'text-slate-100 hover:text-white hover:bg-slate-700'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>Clubes</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeModule('fotos')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all whitespace-nowrap ${
                  activeModule === 'fotos'
                    ? 'bg-violet-600 text-white shadow-md ring-1 ring-white/20'
                    : 'text-slate-100 hover:text-white hover:bg-slate-700'
                }`}
              >
                <Camera className="w-3.5 h-3.5 text-violet-300" />
                <span>Fotos</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeModule('personaje_biblico')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all whitespace-nowrap ${
                  activeModule === 'personaje_biblico'
                    ? 'bg-amber-600 text-white shadow-md ring-1 ring-white/20'
                    : 'text-slate-100 hover:text-white hover:bg-slate-700'
                }`}
                title="Concurso Imita tu Personaje Bíblico"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden lg:inline">Personaje Bíblico</span>
                <span className="lg:hidden">Bíblico</span>
              </button>
            </div>
          </div>

          {/* Zone 3: Actions & User Account Profile */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Dark Mode Toggle */}
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="p-2 text-xs font-extrabold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 rounded-xl transition-colors whitespace-nowrap shrink-0 flex items-center justify-center"
              title={darkMode ? "Activar modo día" : "Activar modo noche"}
              aria-label="Alternar modo noche"
            >
              {darkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-blue-300" />
              )}
            </button>

            {/* Dedicated System Configuration & Database Modal */}
            <button
              type="button"
              onClick={onOpenBackupModal}
              className="px-2.5 sm:px-3 py-2 text-xs font-extrabold text-slate-100 hover:text-white bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 rounded-xl transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-2xs"
              title="Configuración del Sistema y Base de Datos (Verificar Tablas y Nube)"
            >
              <Settings className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="hidden md:inline">Configuración</span>
            </button>

            {/* Quick Register Visitor CTA */}
            {activeModule === 'visitas' && (
              <button
                type="button"
                onClick={onOpenRegister}
                className="px-3 sm:px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors shadow-2xs whitespace-nowrap shrink-0 flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Registrar Visita</span>
                <span className="sm:hidden">Visita</span>
              </button>
            )}

            {/* User Account Capsule Container - Perfectly bounded inside header */}
            {currentUser ? (
              <div className="relative shrink-0" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-750 transition-colors text-left shrink-0"
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0 ${
                    isAdmin ? 'bg-blue-600' : 'bg-slate-700'
                  }`}>
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left leading-tight max-w-[110px] truncate">
                    <span className="font-bold text-white block text-xs truncate">{currentUser.name}</span>
                    <span className="text-[10px] text-blue-300 block truncate font-medium">
                      {getRoleDisplayName(currentUser.role)}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-2xl py-2 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2.5 border-b border-slate-800">
                      <p className="font-bold text-white">{currentUser.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono truncate">{currentUser.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800 uppercase tracking-wide">
                        {getRoleDisplayName(currentUser.role)}
                      </span>
                    </div>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenUserManagement();
                        }}
                        className="w-full px-4 py-2.5 text-left text-slate-300 hover:bg-slate-800 hover:text-white font-medium flex items-center gap-2 transition-colors"
                      >
                        <Users className="w-4 h-4 text-blue-400" />
                        <span>Gestión de Usuarios y Servidores</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenBackupModal();
                      }}
                      className="w-full px-4 py-2.5 text-left text-slate-200 hover:bg-slate-800 hover:text-white font-bold flex items-center gap-2 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-blue-400" />
                      <span>Configuración y Base de Datos</span>
                    </button>

                    <div className="pt-1 mt-1 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false);
                          onLogout();
                        }}
                        className="w-full px-4 py-2.5 text-left text-rose-400 hover:bg-rose-950/40 font-semibold flex items-center gap-2 transition-colors"
                      >
                        <LogOut className="w-4 h-4 text-rose-400" />
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="px-3 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <LogIn className="w-4 h-4" />
                <span>Entrar</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
