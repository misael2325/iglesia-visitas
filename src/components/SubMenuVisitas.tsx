import React from 'react';
import { 
  ClipboardList, 
  Calendar, 
  FileText, 
  BarChart2, 
  ArrowLeft, 
  UserPlus
} from 'lucide-react';
import { NavTab } from './Header';
import { isSecretariaRole, UserRole } from '../types';

interface SubMenuVisitasProps {
  currentTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
  onBackToPortal: () => void;
  onOpenRegister: () => void;
  userRole?: UserRole;
  attendeesCount?: number;
  eventsCount?: number;
}

export const SubMenuVisitas: React.FC<SubMenuVisitasProps> = ({
  currentTab,
  onChangeTab,
  onBackToPortal,
  onOpenRegister,
  userRole,
  attendeesCount,
  eventsCount,
}) => {
  const isSecretaria = isSecretariaRole(userRole);

  const tabs: {
    id: NavTab;
    label: string;
    description: string;
    icon: React.ElementType;
    count?: number;
    badgeText?: string;
    secretariaAllowed: boolean;
  }[] = [
    {
      id: 'asistencia',
      label: 'Asistencia y Visitas',
      description: 'Control diario y semanal',
      icon: ClipboardList,
      count: attendeesCount,
      secretariaAllowed: true,
    },
    {
      id: 'conferencias',
      label: 'Conferencias y Cultos',
      description: 'Eventos y programas',
      icon: Calendar,
      count: eventsCount,
      secretariaAllowed: false,
    },
    {
      id: 'reportes',
      label: 'Reportes por Evento',
      description: 'Informes y exportación',
      icon: FileText,
      badgeText: 'PDF',
      secretariaAllowed: true,
    },
    {
      id: 'estadisticas',
      label: 'Estadísticas Semanales',
      description: 'Métricas de crecimiento',
      icon: BarChart2,
      badgeText: 'Gráficos',
      secretariaAllowed: false,
    },
  ];

  const visibleTabs = tabs.filter((tab) => !isSecretaria || tab.secretariaAllowed);

  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 shadow-md rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 mb-5 sm:mb-6 transition-all duration-200">
      {/* 1. SECCIÓN SUPERIOR: TÍTULO REGISTRO DE VISITAS + BOTÓN VOLVER + ACCIÓN */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-3.5 sm:pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackToPortal}
            className="min-h-[40px] flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 border-2 border-slate-300 dark:border-slate-700 rounded-xl transition-all shadow-xs shrink-0"
            title="Volver al Menú Principal"
          >
            <ArrowLeft className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="hidden xs:inline sm:inline">Menú</span>
          </button>

          <div className="h-7 w-[2px] bg-slate-300 dark:bg-slate-700 hidden sm:block" />

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-[10px] uppercase font-black tracking-wider text-blue-800 dark:text-blue-200 bg-blue-100 dark:bg-blue-950 px-2 py-0.5 rounded-md border border-blue-300 dark:border-blue-800">
                Módulo General
              </span>
              <h1 className="text-base sm:text-2xl font-black text-slate-950 dark:text-white tracking-tight truncate">
                Registro de Visitas
              </h1>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5 hidden sm:block">
              Gestión en tiempo real de asistencia semanal, cultos y estadísticas eclesiásticas
            </p>
          </div>
        </div>

        {/* Botón de acción rápida: + Registrar Visita */}
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={onOpenRegister}
            className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 whitespace-nowrap active:scale-98"
          >
            <UserPlus className="w-4 h-4 shrink-0" />
            <span>+ Registrar Visita</span>
          </button>
        </div>
      </div>

      {/* 2. CINTA HORIZONTAL DEBAJO DEL TÍTULO (SIN SCROLL NI RECUADRO REDUCIDO) */}
      <div className="mt-4">
        <div className={`w-full grid gap-2 sm:gap-3 p-1.5 bg-slate-100 dark:bg-slate-950 rounded-2xl border-2 border-slate-300 dark:border-slate-800 shadow-inner ${
          visibleTabs.length === 2 
            ? 'grid-cols-1 sm:grid-cols-2' 
            : 'grid-cols-2 lg:grid-cols-4'
        }`}>
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChangeTab(tab.id)}
                className={`flex items-center justify-between gap-2.5 px-3.5 py-3 rounded-xl transition-all text-left ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-500/40 translate-y-[-1px]'
                    : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-300 dark:border-slate-700 shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-2 rounded-lg shrink-0 ${
                    isActive 
                      ? 'bg-blue-700/60 text-white' 
                      : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900'
                  }`}>
                    <Icon className="w-4 h-4 shrink-0" />
                  </div>
                  <div className="min-w-0">
                    <span className={`block text-xs sm:text-sm font-extrabold truncate ${
                      isActive ? 'text-white' : 'text-slate-950 dark:text-white'
                    }`}>
                      {tab.label}
                    </span>
                    <span className={`block text-[11px] font-medium truncate ${
                      isActive ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      {tab.description}
                    </span>
                  </div>
                </div>

                {/* Badge de contador o etiqueta */}
                {tab.count !== undefined ? (
                  <span
                    className={`text-xs font-mono px-2 py-0.5 rounded-lg font-black shrink-0 ${
                      isActive
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {tab.count}
                  </span>
                ) : tab.badgeText ? (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md font-extrabold shrink-0 uppercase tracking-wider ${
                      isActive
                        ? 'bg-blue-700 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {tab.badgeText}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
