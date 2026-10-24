import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Printer, 
  Download, 
  Users, 
  UserCheck, 
  MapPin, 
  Calendar, 
  Clock, 
  Sparkles,
  Phone,
  MessageSquare,
  Search,
  CheckCircle2,
  Share2
} from 'lucide-react';
import { ChurchEvent, Attendee } from '../types';
import { formatSpanishDate, getCleanPhoneNumber, generateWhatsAppLink } from '../utils/dateUtils';

interface EventReportsViewProps {
  events: ChurchEvent[];
  attendees: Attendee[];
  selectedEventId: string | null;
  onSelectEvent: (eventId: string) => void;
  onOpenWhatsApp: (attendee: Attendee) => void;
}

export const EventReportsView: React.FC<EventReportsViewProps> = ({
  events,
  attendees,
  selectedEventId,
  onSelectEvent,
  onOpenWhatsApp,
}) => {
  const [reportSearch, setReportSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'visitante' | 'recurrente' | 'miembro'>('all');

  // Currently selected event
  const currentEvent = useMemo(() => {
    if (!events.length) return null;
    return events.find((e) => e.id === selectedEventId) || events[0];
  }, [events, selectedEventId]);

  // Attendees who were marked for this event
  const eventAttendees = useMemo(() => {
    if (!currentEvent) return [];
    return attendees.filter((a) => currentEvent.attendees.includes(a.id));
  }, [currentEvent, attendees]);

  // Filtered attendees for the detailed table
  const displayedAttendees = useMemo(() => {
    return eventAttendees.filter((person) => {
      if (filterType !== 'all' && person.type !== filterType) {
        return false;
      }
      if (reportSearch) {
        const query = reportSearch.toLowerCase();
        const fullName = `${person.firstName} ${person.lastName}`.toLowerCase();
        return fullName.includes(query) || person.phone.includes(query) || person.zone.toLowerCase().includes(query);
      }
      return true;
    });
  }, [eventAttendees, filterType, reportSearch]);

  // Metrics calculation
  const metrics = useMemo(() => {
    const total = eventAttendees.length;
    const visitors = eventAttendees.filter((a) => a.type === 'visitante');
    const recurring = eventAttendees.filter((a) => a.type === 'recurrente');
    const members = eventAttendees.filter((a) => a.type === 'miembro');

    // Group by zone
    const zoneMap: Record<string, number> = {};
    eventAttendees.forEach((a) => {
      zoneMap[a.zone] = (zoneMap[a.zone] || 0) + 1;
    });

    const zoneList = Object.entries(zoneMap)
      .map(([zone, count]) => ({ zone, count }))
      .sort((a, b) => b.count - a.count);

    const visitorPercent = total > 0 ? Math.round((visitors.length / total) * 100) : 0;

    return {
      total,
      visitorsCount: visitors.length,
      recurringCount: recurring.length,
      membersCount: members.length,
      visitorPercent,
      zoneList,
      visitorsList: visitors,
    };
  }, [eventAttendees]);

  // Export CSV
  const handleExportCSV = () => {
    if (!currentEvent) return;

    const headers = ['Nombre', 'Apellido', 'Tipo', 'Celular', 'Zona / Lugar', 'Peticion de Oracion', 'Notas'];
    const rows = eventAttendees.map((a) => [
      `"${a.firstName}"`,
      `"${a.lastName}"`,
      `"${a.type}"`,
      `"${a.phone}"`,
      `"${a.zone}"`,
      `"${(a.prayerRequest || '').replace(/"/g, '""')}"`,
      `"${(a.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Reporte_Asistencia_${currentEvent.title.replace(/\s+/g, '_')}_${currentEvent.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!currentEvent) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
        <p className="text-slate-600">No hay conferencias registradas para generar reportes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Controls: Selector & Export actions */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        {/* Event Selector */}
        <div className="flex-1 max-w-md">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Seleccionar Conferencia o Actividad:
          </label>
          <select
            value={currentEvent.id}
            onChange={(e) => onSelectEvent(e.target.value)}
            className="w-full py-2.5 px-3.5 text-sm font-semibold bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            {events.map((evt) => (
              <option key={evt.id} value={evt.id}>
                {evt.title} ({formatSpanishDate(evt.date)})
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
            title="Descargar archivo Excel / CSV"
          >
            <Download className="w-4 h-4" />
            <span>Descargar CSV</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
            title="Imprimir reporte en hoja física o guardar en PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Reporte</span>
          </button>
        </div>
      </div>

      {/* Printable Report Document Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        {/* Report Header */}
        <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
              <span>Reporte Oficial de Asistencia y Visitas</span>
              <span>·</span>
              <span className="capitalize">{currentEvent.category}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {currentEvent.title}
            </h1>
            {currentEvent.speaker && (
              <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
                Expositor / Orador: <span className="font-semibold text-slate-800">{currentEvent.speaker}</span>
              </p>
            )}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2.5">
              <span className="flex items-center gap-1 font-medium text-slate-700">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {formatSpanishDate(currentEvent.date)}
              </span>
              <span className="flex items-center gap-1 font-medium text-slate-700">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {currentEvent.time} hrs
              </span>
              <span className="flex items-center gap-1 font-medium text-slate-700">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {currentEvent.location}
              </span>
            </div>
          </div>

          <div className="text-right sm:border-l sm:border-slate-100 sm:pl-6 shrink-0">
            <span className="text-xs text-slate-400 uppercase font-semibold">Generado Automáticamente</span>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </p>
            <span className="inline-block mt-2 px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">
              {metrics.visitorPercent}% Nuevas Visitas
            </span>
          </div>
        </div>

        {/* 4 Summary Stat Boxes */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Total Asistentes
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 tabular-nums">
                {metrics.total}
              </span>
              <span className="text-xs text-slate-500">registrados</span>
            </div>
          </div>

          <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-xl">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">
              Visitas de 1ra Vez
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-700 tabular-nums">
                {metrics.visitorsCount}
              </span>
              <span className="text-xs font-medium text-emerald-600">
                ({metrics.visitorPercent}% del evento)
              </span>
            </div>
          </div>

          <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-xl">
            <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider block">
              Amigos Recurrentes
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-blue-700 tabular-nums">
                {metrics.recurringCount}
              </span>
              <span className="text-xs text-blue-600">en seguimiento</span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Miembros / Servidores
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-800 tabular-nums">
                {metrics.membersCount}
              </span>
              <span className="text-xs text-slate-500">apoyando</span>
            </div>
          </div>
        </div>

        {/* Zone Distribution Bar Summary */}
        <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-500" />
            Distribución de Asistencia por Zona / Lugar de Procedencia
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {metrics.zoneList.slice(0, 8).map((z) => (
              <div key={z.zone} className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-700 font-medium truncate">{z.zone}</span>
                <span className="text-xs font-bold text-indigo-700 tabular-nums bg-indigo-50 px-2 py-0.5 rounded-md">
                  {z.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Visitor Table Header & Filters */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Lista Detallada de Asistentes y Visitas ({displayedAttendees.length})</span>
            </h3>

            {/* Filter buttons */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  value={reportSearch}
                  onChange={(e) => setReportSearch(e.target.value)}
                  placeholder="Buscar en el reporte..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              </div>

              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    filterType === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('visitante')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    filterType === 'visitante' ? 'bg-white text-emerald-800 shadow-xs font-bold' : 'text-slate-600'
                  }`}
                >
                  Solo Visitas
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Nombre Completo</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Celular</th>
                  <th className="px-4 py-3">Lugar / Zona</th>
                  <th className="px-4 py-3">Petición de Oración / Motivo</th>
                  <th className="px-4 py-3 text-right no-print">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedAttendees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No hay registros marcados para este evento o filtro.
                    </td>
                  </tr>
                ) : (
                  displayedAttendees.map((person) => (
                    <tr key={person.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {person.firstName} {person.lastName}
                      </td>
                      <td className="px-4 py-3">
                        {person.type === 'visitante' && (
                          <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold">
                            Visita 1ra Vez
                          </span>
                        )}
                        {person.type === 'recurrente' && (
                          <span className="text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                            Recurrente
                          </span>
                        )}
                        {person.type === 'miembro' && (
                          <span className="text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                            Miembro
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700">
                        <a
                          href={`tel:${getCleanPhoneNumber(person.phone)}`}
                          className="hover:underline flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3 text-slate-400" />
                          {person.phone}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium">
                        {person.zone}
                      </td>
                      <td className="px-4 py-3 text-slate-600 italic max-w-xs truncate">
                        {person.prayerRequest || person.notes || '—'}
                      </td>
                      <td className="px-4 py-3 text-right no-print">
                        <button
                          type="button"
                          onClick={() => onOpenWhatsApp(person)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer for Printable Document */}
        <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            <span>Iglesia Cristiana · Departamento de Recepción y Crecimiento</span>
          </div>
          <div>
            <span>Firma del Pastor o Líder Encargado: _______________________</span>
          </div>
        </div>
      </div>
    </div>
  );
};
