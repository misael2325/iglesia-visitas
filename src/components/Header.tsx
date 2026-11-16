import React, { useState, useRef, useEffect } from 'react';
import { 
  UserPlus, 
  LogOut, 
  LogIn, 
  ChevronDown,
  Moon,
  Sun,
  ClipboardList,
  Building2,
  Users,
  LayoutGrid,
  Settings,
  Camera,
  BookOpen,
  Download,
  Gamepad2
} from 'lucide-react';
import { 
  AppUser, 
  AppModule, 
  canUserAccessConfig,
  getAllowedModulesForUser, 
  getRoleDisplayName, 
  getUserRoles, 
  getUserRolesDisplayName, 
  hasAnyUserRole, 
  isSecretariaRestrictedUser 
} from '../types';

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
  canInstallApp?: boolean;
  onOpenInstallApp?: () => void;
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
  canInstallApp,
  onOpenInstallApp,
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

  const isAdmin = hasAnyUserRole(currentUser, ['administrador', 'admin']);
  const isSecretaria = isSecretariaRestrictedUser(currentUser);
  const allowedModules = getAllowedModulesForUser(currentUser);
  const hasMultipleModules = allowedModules.length > 1;
  const canConfig = canUserAccessConfig(currentUser);
  const defaultHomeModule: AppModule = hasMultipleModules ? 'portal' : (allowedModules[0] || 'portal');

  const canSeeVisitas = allowedModules.includes('visitas');
  const canSeeClubes = allowedModules.includes('clubes');
  const canSeeFotos = allowedModules.includes('fotos');
  const canSeePersonaje = allowedModules.includes('personaje_biblico');
  const canSeeGames = allowedModules.includes('jovenes_games');

  const userRoles = getUserRoles(currentUser);

  const handleSelectVisitas = () => {
    onChangeModule('visitas');
    if (isSecretaria && (currentTab === 'conferencias' || currentTab === 'estadisticas')) {
      onChangeTab('asistencia');
    }
  };

  // Compute mobile bottom tab columns dynamically
  const mobileTabCount = (hasMultipleModules ? 1 : 0) + allowedModules.length;
  const mobileGridClass =
    mobileTabCount <= 2
      ? 'grid-cols-2'
      : mobileTabCount === 3
      ? 'grid-cols-3'
      : mobileTabCount === 4
      ? 'grid-cols-4'
      : mobileTabCount === 5
      ? 'grid-cols-5'
      : 'grid-cols-6';

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md pt-safe no-print">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          {/* Main Header Bar */}
          <div className="flex items-center justify-between gap-2 sm:gap-3 h-14 sm:h-16">
            {/* Zone 1: Brand Wordmark & Desktop Module Switcher */}
            <div className="flex items-center gap-3 sm:gap-6 min-w-0 shrink-0">
              {/* Wordmark */}
              <button
                type="button"
                onClick={() => onChangeModule(defaultHomeModule)}
                className="flex items-center gap-2 sm:gap-2.5 shrink-0 text-left hover:opacity-90 transition-opacity min-h-[40px]"
                title={hasMultipleModules ? 'Ir al Menú Principal' : 'Panel Principal · Eclesia'}
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-black border border-slate-700 overflow-hidden flex items-center justify-center shadow-xs shrink-0">
                  <img
                    src="/assets/aistudio/a_clean_modern_app_icon_style_graphic_with_a_roun_45278ae7.png"
                    alt="Eclesia"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain scale-[1.06]"
                  />
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

              {/* Desktop / Tablet Primary Module Switcher */}
              <div className="hidden md:flex items-center bg-slate-800 border-2 border-slate-700 p-1 rounded-xl shadow-xs">
                {hasMultipleModules && (
                  <button
                    type="button"
                    onClick={() => onChangeModule('portal')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all whitespace-nowrap ${
                      activeModule === 'portal'
                        ? 'bg-blue-600 text-white shadow-md ring-1 ring-white/20'
                        : 'text-slate-100 hover:text-white hover:bg-slate-700'
                    }`}
                    title="Portal Principal de Entrada"
                  >
                    <LayoutGrid className="w-3.5 h-3.5 text-blue-300" />
                    <span>Menú Principal</span>
                  </button>
                )}

                {canSeeVisitas && (
                  <button
                    type="button"
                    onClick={handleSelectVisitas}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all whitespace-nowrap ${
                      activeModule === 'visitas'
                        ? 'bg-blue-600 text-white shadow-md ring-1 ring-white/20'
                        : 'text-slate-100 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    <span>Registro Visitas</span>
                  </button>
                )}

                {canSeeClubes && (
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
                )}

                {canSeeFotos && (
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
                )}

                {canSeePersonaje && (
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
                )}

                {canSeeGames && (
                  <button
                    type="button"
                    onClick={() => onChangeModule('jovenes_games')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all whitespace-nowrap ${
                      activeModule === 'jovenes_games'
                        ? 'bg-fuchsia-600 text-white shadow-md ring-1 ring-white/20'
                        : 'text-slate-100 hover:text-white hover:bg-slate-700'
                    }`}
                    title="Sociedad de Jóvenes Games"
                  >
                    <Gamepad2 className="w-3.5 h-3.5 text-fuchsia-300" />
                    <span className="hidden lg:inline">Jóvenes Games</span>
                    <span className="lg:hidden">Games</span>
                  </button>
                )}
              </div>
            </div>

            {/* Mobile Active Module Indicator */}
            <div className="md:hidden text-xs font-bold text-slate-300 truncate px-1">
              {activeModule === 'portal'
                ? 'Inicio'
                : activeModule === 'visitas'
                ? 'Visitas'
                : activeModule === 'clubes'
                ? 'Clubes'
                : activeModule === 'fotos'
                ? 'Fotos'
                : activeModule === 'jovenes_games'
                ? 'Jóvenes Games'
                : 'Concurso'}
            </div>

            {/* Zone 3: Actions & User Account Profile */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              {/* Dark Mode Toggle */}
              <button
                type="button"
                onClick={onToggleDarkMode}
                className="min-w-[40px] min-h-[40px] p-2 text-xs font-extrabold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 rounded-xl transition-colors whitespace-nowrap shrink-0 flex items-center justify-center"
                title={darkMode ? 'Activar modo día' : 'Activar modo noche'}
                aria-label="Alternar modo noche"
              >
                {darkMode ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-blue-300" />
                )}
              </button>

              {/* System Configuration */}
              {canConfig && (
                <button
                  type="button"
                  onClick={onOpenBackupModal}
                  className="hidden sm:flex min-h-[40px] px-2.5 sm:px-3 py-2 text-xs font-extrabold text-slate-100 hover:text-white bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 rounded-xl transition-colors whitespace-nowrap shrink-0 items-center gap-1.5 shadow-2xs"
                  title="Configuración del Sistema y Base de Datos (Verificar Tablas y Nube)"
                >
                  <Settings className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="hidden md:inline">Configuración</span>
                </button>
              )}

              {/* Quick Register Visitor CTA */}
              {canSeeVisitas && activeModule === 'visitas' && (
                <button
                  type="button"
                  onClick={onOpenRegister}
                  className="hidden sm:flex min-h-[40px] px-3 sm:px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors shadow-2xs whitespace-nowrap shrink-0 items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4 shrink-0" />
                  <span>Registrar Visita</span>
                </button>
              )}

              {/* User Account Capsule Container */}
              {currentUser ? (
                <div className="relative shrink-0" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="min-h-[40px] flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-750 transition-colors text-left shrink-0"
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0 ${
                      isAdmin ? 'bg-blue-600' : 'bg-slate-700'
                    }`}>
                      {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="hidden sm:block text-left leading-tight max-w-[140px] truncate">
                      <span className="font-bold text-white block text-xs truncate">{currentUser.name}</span>
                      <span className="text-[10px] text-blue-300 block truncate font-medium">
                        {getUserRolesDisplayName(currentUser)}
                      </span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </button>

                  {/* Dropdown Menu */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-2xl py-2 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-4 py-2.5 border-b border-slate-800 space-y-1.5">
                        <div>
                          <p className="font-bold text-white">{currentUser.name}</p>
                          <p className="text-[11px] text-slate-400 font-mono truncate">{currentUser.email}</p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {userRoles.map((r) => (
                            <span
                              key={r}
                              className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800 uppercase tracking-wide"
                            >
                              {getRoleDisplayName(r)}
                            </span>
                          ))}
                        </div>
                      </div>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowUserMenu(false);
                            onOpenUserManagement();
                          }}
                          className="w-full min-h-[44px] px-4 py-2.5 text-left text-slate-300 hover:bg-slate-800 hover:text-white font-medium flex items-center gap-2 transition-colors"
                        >
                          <Users className="w-4 h-4 text-blue-400" />
                          <span>Gestión de Usuarios y Perfiles</span>
                        </button>
                      )}

                      {canConfig && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowUserMenu(false);
                            onOpenBackupModal();
                          }}
                          className="w-full min-h-[44px] px-4 py-2.5 text-left text-slate-200 hover:bg-slate-800 hover:text-white font-bold flex items-center gap-2 transition-colors"
                        >
                          <Settings className="w-4 h-4 text-blue-400" />
                          <span>Configuración y Base de Datos</span>
                        </button>
                      )}

                      {canInstallApp && onOpenInstallApp && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowUserMenu(false);
                            onOpenInstallApp();
                          }}
                          className="w-full min-h-[44px] px-4 py-2.5 text-left text-emerald-300 hover:bg-slate-800 hover:text-emerald-200 font-bold flex items-center gap-2 transition-colors"
                        >
                          <Download className="w-4 h-4 text-emerald-400" />
                          <span>Instalar App (Android / iOS)</span>
                        </button>
                      )}

                      <div className="pt-1 mt-1 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => {
                            setShowUserMenu(false);
                            onLogout();
                          }}
                          className="w-full min-h-[44px] px-4 py-2.5 text-left text-rose-400 hover:bg-rose-950/40 font-semibold flex items-center gap-2 transition-colors"
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
                  className="min-h-[40px] px-3 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Entrar</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Thumb-Zone Tab Bar (when user has >1 allowed module) */}
      {hasMultipleModules && currentUser && (
        <nav
          aria-label="Navegación móvil"
          className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-slate-900/95 backdrop-blur-md border-t border-slate-800 pb-safe no-print shadow-[0_-4px_20px_rgba(0,0,0,0.25)]"
        >
          <div className={`grid ${mobileGridClass} items-center h-16 px-0.5`}>
            <button
              type="button"
              onClick={() => onChangeModule('portal')}
              className={`flex flex-col items-center justify-center min-h-[52px] rounded-xl transition-colors ${
                activeModule === 'portal'
                  ? 'text-blue-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-5 h-5" />
              <span className={`text-[10px] mt-1 tracking-tight ${activeModule === 'portal' ? 'font-extrabold' : 'font-medium'}`}>
                Inicio
              </span>
            </button>

            {canSeeVisitas && (
              <button
                type="button"
                onClick={handleSelectVisitas}
                className={`flex flex-col items-center justify-center min-h-[52px] rounded-xl transition-colors ${
                  activeModule === 'visitas'
                    ? 'text-blue-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ClipboardList className="w-5 h-5" />
                <span className={`text-[10px] mt-1 tracking-tight ${activeModule === 'visitas' ? 'font-extrabold' : 'font-medium'}`}>
                  Visitas
                </span>
              </button>
            )}

            {canSeeClubes && (
              <button
                type="button"
                onClick={() => onChangeModule('clubes')}
                className={`flex flex-col items-center justify-center min-h-[52px] rounded-xl transition-colors ${
                  activeModule === 'clubes'
                    ? 'text-emerald-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Building2 className="w-5 h-5" />
                <span className={`text-[10px] mt-1 tracking-tight ${activeModule === 'clubes' ? 'font-extrabold' : 'font-medium'}`}>
                  Clubes
                </span>
              </button>
            )}

            {canSeeFotos && (
              <button
                type="button"
                onClick={() => onChangeModule('fotos')}
                className={`flex flex-col items-center justify-center min-h-[52px] rounded-xl transition-colors ${
                  activeModule === 'fotos'
                    ? 'text-violet-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Camera className="w-5 h-5" />
                <span className={`text-[10px] mt-1 tracking-tight ${activeModule === 'fotos' ? 'font-extrabold' : 'font-medium'}`}>
                  Fotos
                </span>
              </button>
            )}

            {canSeePersonaje && (
              <button
                type="button"
                onClick={() => onChangeModule('personaje_biblico')}
                className={`flex flex-col items-center justify-center min-h-[52px] rounded-xl transition-colors ${
                  activeModule === 'personaje_biblico'
                    ? 'text-amber-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BookOpen className="w-5 h-5" />
                <span className={`text-[10px] mt-1 tracking-tight ${activeModule === 'personaje_biblico' ? 'font-extrabold' : 'font-medium'}`}>
                  Bíblico
                </span>
              </button>
            )}

            {canSeeGames && (
              <button
                type="button"
                onClick={() => onChangeModule('jovenes_games')}
                className={`flex flex-col items-center justify-center min-h-[52px] rounded-xl transition-colors ${
                  activeModule === 'jovenes_games'
                    ? 'text-fuchsia-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Gamepad2 className="w-5 h-5" />
                <span className={`text-[10px] mt-1 tracking-tight ${activeModule === 'jovenes_games' ? 'font-extrabold' : 'font-medium'}`}>
                  Games
                </span>
              </button>
            )}
          </div>
        </nav>
      )}
    </>
  );
};
