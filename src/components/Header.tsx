import React from 'react';
import { UserPlus, Church } from 'lucide-react';

export type NavTab = 'asistencia' | 'conferencias' | 'reportes' | 'estadisticas';

interface HeaderProps {
  currentTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
  onOpenRegister: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onChangeTab,
  onOpenRegister,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          {/* Zone 1: Brand Wordmark (Single text element) */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Church className="w-5 h-5 text-indigo-100" />
            </div>
            <button
              type="button"
              onClick={() => onChangeTab('asistencia')}
              className="text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap hover:text-indigo-600 transition-colors"
            >
              Eclesia
            </button>
          </div>

          {/* Zone 2: 4 Clean single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <button
              type="button"
              onClick={() => onChangeTab('asistencia')}
              className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
                currentTab === 'asistencia'
                  ? 'text-indigo-600 font-bold border-b-2 border-indigo-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Asistencia y Visitas
            </button>

            <button
              type="button"
              onClick={() => onChangeTab('conferencias')}
              className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
                currentTab === 'conferencias'
                  ? 'text-indigo-600 font-bold border-b-2 border-indigo-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Conferencias y Actividades
            </button>

            <button
              type="button"
              onClick={() => onChangeTab('reportes')}
              className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
                currentTab === 'reportes'
                  ? 'text-indigo-600 font-bold border-b-2 border-indigo-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Reportes por Evento
            </button>

            <button
              type="button"
              onClick={() => onChangeTab('estadisticas')}
              className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
                currentTab === 'estadisticas'
                  ? 'text-indigo-600 font-bold border-b-2 border-indigo-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Estadísticas Semanales
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenRegister}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl transition-colors shadow-xs whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>Registrar Visita</span>
            </button>
          </div>
        </div>

        {/* Mobile Nav strip */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-100 text-xs font-semibold overflow-x-auto gap-2">
          <button
            type="button"
            onClick={() => onChangeTab('asistencia')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
              currentTab === 'asistencia' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600'
            }`}
          >
            Asistencia
          </button>
          <button
            type="button"
            onClick={() => onChangeTab('conferencias')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
              currentTab === 'conferencias' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600'
            }`}
          >
            Conferencias
          </button>
          <button
            type="button"
            onClick={() => onChangeTab('reportes')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
              currentTab === 'reportes' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600'
            }`}
          >
            Reportes
          </button>
          <button
            type="button"
            onClick={() => onChangeTab('estadisticas')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
              currentTab === 'estadisticas' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600'
            }`}
          >
            Estadísticas
          </button>
        </div>
      </div>
    </header>
  );
};
