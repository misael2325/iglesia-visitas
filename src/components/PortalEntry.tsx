import React from 'react';
import {
  ClipboardList,
  Building2,
  Camera,
  BookOpen,
  Gamepad2,
} from 'lucide-react';
import { AppUser, getAllowedModulesForUser, getUserRolesDisplayName } from '../types';

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
  onSelectModule: (module: 'visitas' | 'clubes' | 'fotos' | 'personaje_biblico' | 'jovenes_games') => void;
}

const MENU_MODULES: Array<{
  id: 'visitas' | 'clubes' | 'fotos' | 'personaje_biblico' | 'jovenes_games';
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  accentBar: string;
  hoverBorder: string;
}> = [
  {
    id: 'visitas',
    title: 'Registro Visitas',
    icon: ClipboardList,
    iconBg: 'bg-blue-600 shadow-blue-600/25',
    accentBar: 'bg-blue-600',
    hoverBorder: 'hover:border-blue-500 dark:hover:border-blue-500',
  },
  {
    id: 'clubes',
    title: 'Gestión de Clubes',
    icon: Building2,
    iconBg: 'bg-emerald-600 shadow-emerald-600/25',
    accentBar: 'bg-emerald-600',
    hoverBorder: 'hover:border-emerald-500 dark:hover:border-emerald-500',
  },
  {
    id: 'fotos',
    title: 'Fotos y Galería',
    icon: Camera,
    iconBg: 'bg-violet-600 shadow-violet-600/25',
    accentBar: 'bg-violet-600',
    hoverBorder: 'hover:border-violet-500 dark:hover:border-violet-500',
  },
  {
    id: 'personaje_biblico',
    title: 'Concurso Bíblico',
    icon: BookOpen,
    iconBg: 'bg-amber-600 shadow-amber-600/25',
    accentBar: 'bg-amber-600',
    hoverBorder: 'hover:border-amber-500 dark:hover:border-amber-500',
  },
  {
    id: 'jovenes_games',
    title: 'Sociedad de Jóvenes Games',
    icon: Gamepad2,
    iconBg: 'bg-fuchsia-600 shadow-fuchsia-600/25',
    accentBar: 'bg-fuchsia-600',
    hoverBorder: 'hover:border-fuchsia-500 dark:hover:border-fuchsia-500',
  },
];

export const PortalEntry: React.FC<PortalEntryProps> = ({
  currentUser,
  onSelectModule,
}) => {
  const allowedModules = getAllowedModulesForUser(currentUser);
  const visibleModules = MENU_MODULES.filter((m) => allowedModules.includes(m.id));
  const gridClass =
    visibleModules.length <= 2
      ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl'
      : visibleModules.length <= 4
      ? 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 max-w-4xl'
      : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 max-w-5xl';

  return (
    <div className="py-3 sm:py-8 space-y-5 sm:space-y-8 animate-in fade-in duration-200">
      {/* Compact User Greeting */}
      <div className="text-center max-w-2xl mx-auto px-2">
        <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Hola, <span className="text-blue-600 dark:text-blue-400">{currentUser.name}</span>
        </h1>
        <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
          {getUserRolesDisplayName(currentUser)}
        </p>
      </div>

      {/* Minimalist Menu Grid: Icon + Name Only */}
      <div className={`grid ${gridClass} gap-3.5 sm:gap-5 mx-auto`}>
        {visibleModules.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectModule(item.id)}
              className={`group relative bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border-2 border-slate-200 dark:border-slate-800 ${item.hoverBorder} p-5 sm:p-7 shadow-sm hover:shadow-xl active:scale-[0.97] transition-all duration-200 flex flex-col items-center justify-center gap-3.5 sm:gap-4 min-h-[136px] sm:min-h-[172px] cursor-pointer overflow-hidden text-center`}
            >
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${item.accentBar}`} />

              <div
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ${item.iconBg} flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform duration-200`}
              >
                <Icon className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>

              <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                {item.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
