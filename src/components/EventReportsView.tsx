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
  Share2,
  FileDown,
  X
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharePhone, setSharePhone] = useState('');

  // Currently selected event
  const currentEvent = useMemo(() => {
    if (!events.length) return null;
    return events.find((e) => e.id === selectedEventId) || events[0];
  }, [events, selectedEventId]);

  // Attendees who were marked for this event (synchronized with both event list and daily attendance calendar)
  const eventAttendees = useMemo(() => {
    if (!currentEvent) return [];
    return attendees.filter((a) => {
      const inEventList = currentEvent.attendees && currentEvent.attendees.includes(a.id);
      const inDateCalendar = currentEvent.date && a.attendance && !!a.attendance[currentEvent.date];
      return inEventList || inDateCalendar;
    });
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

  // Generate & Download PDF via jsPDF & autoTable
  const handleExportPDF = () => {
    if (!currentEvent) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Dark Navy Top Banner
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 32, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE OFICIAL DE ASISTENCIA Y VISITAS', 14, 14);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(190, 215, 255);
    doc.text(`Iglesia Cristiana · Departamento de Recepción y Crecimiento`, 14, 21);
    doc.text(`Evento: ${currentEvent.title} (${formatSpanishDate(currentEvent.date)})`, 14, 27);

    // Event Info Section
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN DE LA CONFERENCIA / ACTIVIDAD', 14, 42);

    const eventInfoData = [
      ['Título del Evento', currentEvent.title],
      ['Categoría', currentEvent.category.toUpperCase()],
      ['Fecha y Hora', `${formatSpanishDate(currentEvent.date)} a las ${currentEvent.time} hrs`],
      ['Lugar / Auditorio', currentEvent.location],
      ['Expositor / Orador', currentEvent.speaker || 'Equipo Ministerial'],
    ];

    autoTable(doc, {
      startY: 46,
      body: eventInfoData,
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [30, 41, 59], cellWidth: 50 },
        1: { textColor: [15, 23, 42] },
      },
    });

    // Summary Metrics Table
    const nextY1 = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN ESTADÍSTICO DE ASISTENCIA', 14, nextY1);

    const metricsData = [
      ['Total de Asistentes', `${metrics.total} personas`],
      ['Visitas de Primera Vez', `${metrics.visitorsCount} personas (${metrics.visitorPercent}%)`],
      ['Amigos Recurrentes en Seguimiento', `${metrics.recurringCount} personas`],
      ['Miembros de la Congregación', `${metrics.membersCount} personas`],
    ];

    autoTable(doc, {
      startY: nextY1 + 4,
      body: metricsData,
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 2.2 },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [30, 41, 59], cellWidth: 90 },
        1: { fontStyle: 'bold', halign: 'right' },
      },
    });

    // Attendee List Table
    const nextY2 = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`PARTICIPANTES REGISTRADOS (${eventAttendees.length})`, 14, nextY2);

    const attendeesData = eventAttendees.map((a, i) => [
      `${i + 1}`,
      `${a.firstName} ${a.lastName}`,
      a.type === 'visitante' ? 'Visita 1ra Vez' : a.type === 'recurrente' ? 'Recurrente' : 'Miembro',
      a.phone,
      a.zone,
      a.prayerRequest || a.notes || '—',
    ]);

    autoTable(doc, {
      startY: nextY2 + 4,
      head: [['#', 'Nombre Completo', 'Tipo', 'Celular', 'Zona / Sector', 'Petición de Oración']],
      body: attendeesData,
      theme: 'striped',
      headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 7.5, cellPadding: 2 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { fontStyle: 'bold' },
        3: { fontStyle: 'normal' },
      },
    });

    // Signatures footer
    const finalY = Math.min((doc as any).lastAutoTable.finalY + 20, 270);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('____________________________________', 30, finalY);
    doc.text('Secretaría de Iglesia / Recepción', 36, finalY + 5);

    doc.text('____________________________________', 125, finalY);
    doc.text('Pastor / Anciano Supervisor', 133, finalY + 5);

    doc.save(`Reporte_Asistencia_${currentEvent.title.replace(/\s+/g, '_')}_${currentEvent.date}.pdf`);
  };

  // WhatsApp Message Builder
  const buildWhatsAppReportMessage = () => {
    if (!currentEvent) return '';
    let text = `📊 *REPORTE OFICIAL DE ASISTENCIA Y VISITAS*\n`;
    text += `🏛 *Iglesia Cristiana*\n\n`;
    text += `📌 *Evento:* ${currentEvent.title}\n`;
    text += `📅 *Fecha:* ${formatSpanishDate(currentEvent.date)} (${currentEvent.time} hrs)\n`;
    text += `📍 *Lugar:* ${currentEvent.location}\n`;
    if (currentEvent.speaker) {
      text += `🎙 *Expositor:* ${currentEvent.speaker}\n`;
    }
    text += `\n👥 *RESULTADOS DE ASISTENCIA:*\n`;
    text += `• Total Asistentes: *${metrics.total} personas*\n`;
    text += `• Visitas de 1ra Vez: *${metrics.visitorsCount}* (${metrics.visitorPercent}% de impacto)\n`;
    text += `• Amigos Recurrentes: *${metrics.recurringCount}*\n`;
    text += `• Miembros Apoyando: *${metrics.membersCount}*\n\n`;

    if (metrics.zoneList.length > 0) {
      text += `📍 *ZONAS CON MAYOR PARTICIPACIÓN:*\n`;
      metrics.zoneList.slice(0, 5).forEach((z) => {
        text += `• ${z.zone}: ${z.count} asistentes\n`;
      });
      text += `\n`;
    }

    text += `¡Damos gracias a Dios por cada persona que se dio cita!`;
    return text;
  };

  const handleShareReportWhatsApp = () => {
    const msg = buildWhatsAppReportMessage();
    const url = generateWhatsAppLink(sharePhone, msg);
    window.open(url, '_blank');
    setIsShareModalOpen(false);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!currentEvent) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs space-y-3">
        <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
          <FileText className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">No hay conferencias o cultos creados para generar reportes</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Crea tu primera conferencia o culto en la pestaña "Conferencias y Actividades" para comenzar a generar reportes automáticos detallados de asistencia y visitas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Controls: Selector & Export actions */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        {/* Event Selector */}
        <div className="flex-1 max-w-md">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
            Seleccionar Conferencia o Actividad:
          </label>
          <select
            value={currentEvent.id}
            onChange={(e) => onSelectEvent(e.target.value)}
            className="w-full py-2.5 px-3.5 text-sm font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            {events.map((evt) => (
              <option key={evt.id} value={evt.id}>
                {evt.title} ({formatSpanishDate(evt.date)})
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons: PDF Download, WhatsApp Share, Print, CSV */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportPDF}
            className="px-3.5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors shadow-2xs flex items-center gap-1.5"
            title="Descargar reporte oficial en formato PDF"
          >
            <FileDown className="w-4 h-4" />
            <span>Descargar PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            className="px-3.5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors shadow-2xs flex items-center gap-1.5"
            title="Enviar reporte por WhatsApp a la directiva o pastor"
          >
            <Share2 className="w-4 h-4" />
            <span>Enviar por WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
            title="Imprimir reporte en hoja física"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors flex items-center gap-1"
            title="Descargar archivo Excel / CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Main Framed Report Card with Navy Title Bar (matching Asistencia y Visitas) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Navy Header Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-blue-400 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight text-white">Reporte Oficial de Asistencia y Visitas</h3>
                <span className="text-[10px] uppercase font-bold text-blue-300 bg-blue-950 px-2 py-0.5 rounded-sm border border-blue-800">
                  {currentEvent.category}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Auditoría completa de participantes, nuevos amigos y distribución congregacional
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
            <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="text-slate-300">
              Fecha: <strong className="text-white">{formatSpanishDate(currentEvent.date)}</strong>
            </span>
          </div>
        </div>

        {/* Inner Report Content */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Event Title Banner Box */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {currentEvent.title}
              </h1>
              {currentEvent.speaker && (
                <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-semibold mt-1">
                  Expositor / Orador: <span>{currentEvent.speaker}</span>
                </p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-2.5">
                <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {currentEvent.time} hrs
                </span>
                <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {currentEvent.location}
                </span>
              </div>
            </div>

            <div className="text-left sm:text-right sm:border-l sm:border-slate-200 dark:sm:border-slate-800 sm:pl-6 shrink-0">
              <span className="text-[11px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Porcentaje de Impacto</span>
              <div className="mt-1">
                <span className="inline-block px-3 py-1 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                  {metrics.visitorPercent}% Visitas de 1ra Vez
                </span>
              </div>
            </div>
          </div>

          {/* 4 Summary Stat Boxes ("Cuadros de Estadísticas") */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Box 1: Total */}
            <div className="p-4 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Total Asistentes
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                  {metrics.total}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">personas</span>
              </div>
            </div>

            {/* Box 2: Visitas */}
            <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 shadow-2xs">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
                Visitas de 1ra Vez
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {metrics.visitorsCount}
                </span>
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  ({metrics.visitorPercent}%)
                </span>
              </div>
            </div>

            {/* Box 3: Recurrentes */}
            <div className="p-4 bg-blue-50/50 dark:bg-blue-950/30 rounded-xl border border-blue-200/80 dark:border-blue-900/60 shadow-2xs">
              <span className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider block">
                Amigos Recurrentes
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-blue-700 dark:text-blue-400 tabular-nums">
                  {metrics.recurringCount}
                </span>
                <span className="text-xs text-blue-600 dark:text-blue-400">en seguimiento</span>
              </div>
            </div>

            {/* Box 4: Miembros */}
            <div className="p-4 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Miembros / Servidores
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                  {metrics.membersCount}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">apoyando</span>
              </div>
            </div>
          </div>

          {/* Zone Distribution Box */}
          <div className="p-4.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-500" />
              <span>Distribución de Asistencia por Zona / Sector de Procedencia</span>
            </h4>
            {metrics.zoneList.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">No hay registros con zonas marcadas en este evento.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {metrics.zoneList.slice(0, 8).map((z) => (
                  <div key={z.zone} className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate">{z.zone}</span>
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-300 tabular-nums bg-blue-50 dark:bg-blue-950/80 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900">
                      {z.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detailed Visitor Table Header & Filters */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                <span>Lista Detallada de Asistentes al Evento ({displayedAttendees.length})</span>
              </h3>

              {/* Filter controls */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    value={reportSearch}
                    onChange={(e) => setReportSearch(e.target.value)}
                    placeholder="Buscar en el reporte..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                </div>

                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setFilterType('all')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      filterType === 'all'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('visitante')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      filterType === 'visitante'
                        ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-300 shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Solo Visitas
                  </button>
                </div>
              </div>
            </div>

            {/* Table framed */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Nombre Completo</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Celular</th>
                    <th className="px-4 py-3">Lugar / Zona</th>
                    <th className="px-4 py-3">Petición de Oración / Motivo</th>
                    <th className="px-4 py-3 text-right no-print">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {displayedAttendees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                        No hay registros marcados para este evento o filtro.
                      </td>
                    </tr>
                  ) : (
                    displayedAttendees.map((person) => (
                      <tr key={person.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                          {person.firstName} {person.lastName}
                        </td>
                        <td className="px-4 py-3">
                          {person.type === 'visitante' && (
                            <span className="text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-md font-semibold">
                              Visita 1ra Vez
                            </span>
                          )}
                          {person.type === 'recurrente' && (
                            <span className="text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-md">
                              Recurrente
                            </span>
                          )}
                          {person.type === 'miembro' && (
                            <span className="text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md">
                              Miembro
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">
                          <a
                            href={`tel:${getCleanPhoneNumber(person.phone)}`}
                            className="hover:underline flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            <Phone className="w-3 h-3 text-slate-400" />
                            {person.phone}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium">
                          {person.zone}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 italic max-w-xs truncate">
                          {person.prayerRequest || person.notes || '—'}
                        </td>
                        <td className="px-4 py-3 text-right no-print">
                          <button
                            type="button"
                            onClick={() => onOpenWhatsApp(person)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-colors"
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
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div>
              <span>Iglesia Cristiana · Departamento de Recepción y Crecimiento</span>
            </div>
            <div>
              <span>Firma del Pastor o Líder Encargado: _______________________</span>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: ENVIAR REPORTE POR WHATSAPP */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 bg-emerald-700 dark:bg-emerald-800 text-white flex items-center justify-between border-b border-emerald-800">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-emerald-200" />
                <h3 className="text-sm font-bold">Enviar Reporte de Conferencia por WhatsApp</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="text-emerald-100 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Número de WhatsApp del Destinatario (Pastor, Líder o Directiva)
                </label>
                <input
                  type="tel"
                  value={sharePhone}
                  onChange={(e) => setSharePhone(e.target.value)}
                  placeholder="Ej. +1 809 123 4567 o 55 1234 5678"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Resumen Oficial Formateado:
                </label>
                <div className="p-3 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-[11px] text-slate-800 dark:text-slate-200 whitespace-pre-wrap max-h-56 overflow-y-auto">
                  {buildWhatsAppReportMessage()}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(buildWhatsAppReportMessage());
                    alert('¡Resumen de reporte copiado!');
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                >
                  Copiar Texto
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsShareModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleShareReportWhatsApp}
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Abrir en WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
