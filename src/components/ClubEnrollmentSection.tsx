import React, { useState, useMemo } from 'react';
import { 
  GraduationCap, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  X, 
  Check, 
  Phone, 
  User, 
  Calendar,
  AlertCircle,
  TrendingUp,
  Download,
  Receipt,
  FileCheck
} from 'lucide-react';
import { ClubEnrollment, Club } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ENROLLMENT_CATEGORIES = [
  'Aventurero',
  'Conquistador',
  'Guía Mayor',
  'Aspirante a Guía',
  'Líder Juvenil (JA)',
  'Directiva / Consejero',
  'Ministerio Infantil',
  'Membresía General'
];

interface ClubEnrollmentSectionProps {
  enrollments: ClubEnrollment[];
  clubs: Club[];
  selectedClubId: string | null;
  activeClubName?: string;
  onAddEnrollment: (enrollment: ClubEnrollment) => void;
  onUpdateEnrollment: (enrollment: ClubEnrollment) => void;
  onDeleteEnrollment: (id: string) => void;
}

export const ClubEnrollmentSection: React.FC<ClubEnrollmentSectionProps> = ({
  enrollments,
  clubs,
  selectedClubId,
  activeClubName,
  onAddEnrollment,
  onUpdateEnrollment,
  onDeleteEnrollment,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [clubFilter, setClubFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState<ClubEnrollment | null>(null);
  const [quickPayEnrollment, setQuickPayEnrollment] = useState<ClubEnrollment | null>(null);
  const [extraPaymentAmount, setExtraPaymentAmount] = useState<string>('');

  // Form states
  const [formMemberName, setFormMemberName] = useState('');
  const [formClubId, setFormClubId] = useState('');
  const [formCategory, setFormCategory] = useState('Conquistador');
  const [formPeriod, setFormPeriod] = useState(() => new Date().getFullYear().toString());
  const [formTutorName, setFormTutorName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formFeeAmount, setFormFeeAmount] = useState('300');
  const [formAmountPaid, setFormAmountPaid] = useState('300');
  const [formIsPaid, setFormIsPaid] = useState(true);
  const [formEnrollmentDate, setFormEnrollmentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formReceiptNumber, setFormReceiptNumber] = useState('');
  const [formMedicalNotes, setFormMedicalNotes] = useState('');

  // Filtered enrollments
  const relevantEnrollments = useMemo(() => {
    return enrollments.filter((e) => {
      if (selectedClubId && selectedClubId !== 'all') {
        return e.clubId === selectedClubId;
      }
      if (clubFilter !== 'all' && e.clubId !== clubFilter) {
        return false;
      }
      return true;
    });
  }, [enrollments, selectedClubId, clubFilter]);

  const filteredEnrollments = useMemo(() => {
    return relevantEnrollments.filter((e) => {
      if (statusFilter === 'paid' && !e.isPaid) return false;
      if (statusFilter === 'pending' && e.isPaid) return false;
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          e.memberName.toLowerCase().includes(q) ||
          e.clubName.toLowerCase().includes(q) ||
          (e.tutorName || '').toLowerCase().includes(q) ||
          (e.phone || '').includes(q) ||
          (e.receiptNumber || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [relevantEnrollments, statusFilter, categoryFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const totalCount = relevantEnrollments.length;
    const totalCuotas = relevantEnrollments.reduce((sum, e) => sum + (Number(e.feeAmount) || 0), 0);
    const totalRecaudado = relevantEnrollments.reduce((sum, e) => sum + (Number(e.amountPaid) || 0), 0);
    const totalPendiente = Math.max(0, totalCuotas - totalRecaudado);
    const totalPagadas = relevantEnrollments.filter((e) => e.isPaid).length;
    const totalConSaldo = totalCount - totalPagadas;

    return {
      totalCount,
      totalCuotas,
      totalRecaudado,
      totalPendiente,
      totalPagadas,
      totalConSaldo,
      porcentajeCobrado: totalCuotas > 0 ? (totalRecaudado / totalCuotas) * 100 : 0,
    };
  }, [relevantEnrollments]);

  // Open modal for new enrollment
  const handleOpenNewModal = () => {
    setEditingEnrollment(null);
    setFormMemberName('');
    const defaultClub = (selectedClubId && selectedClubId !== 'all') 
      ? clubs.find((c) => c.id === selectedClubId) 
      : clubs[0];
    setFormClubId(defaultClub?.id || (clubs[0]?.id || ''));
    setFormCategory('Conquistador');
    setFormPeriod(defaultClub?.period || new Date().getFullYear().toString());
    setFormTutorName('');
    setFormPhone('');
    setFormFeeAmount('300');
    setFormAmountPaid('300');
    setFormIsPaid(true);
    setFormEnrollmentDate(new Date().toISOString().split('T')[0]);
    setFormReceiptNumber(`REC-${Date.now().toString().slice(-4)}`);
    setFormMedicalNotes('');
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEditModal = (item: ClubEnrollment) => {
    setEditingEnrollment(item);
    setFormMemberName(item.memberName);
    setFormClubId(item.clubId);
    setFormCategory(item.category || 'Conquistador');
    setFormPeriod(item.period || new Date().getFullYear().toString());
    setFormTutorName(item.tutorName || '');
    setFormPhone(item.phone || '');
    setFormFeeAmount(String(item.feeAmount || 0));
    setFormAmountPaid(String(item.amountPaid || 0));
    setFormIsPaid(item.isPaid);
    setFormEnrollmentDate(item.enrollmentDate || new Date().toISOString().split('T')[0]);
    setFormReceiptNumber(item.receiptNumber || '');
    setFormMedicalNotes(item.medicalNotes || '');
    setIsModalOpen(true);
  };

  const handleSaveEnrollment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMemberName.trim()) return;

    const club = clubs.find((c) => c.id === formClubId) || clubs[0];
    const feeNum = Math.max(0, Number(formFeeAmount) || 0);
    let amountPaidNum = Math.max(0, Number(formAmountPaid) || 0);
    let isPaidFlag = formIsPaid;

    if (amountPaidNum >= feeNum && feeNum > 0) {
      isPaidFlag = true;
    } else if (isPaidFlag) {
      amountPaidNum = feeNum;
    }

    if (editingEnrollment) {
      const updated: ClubEnrollment = {
        ...editingEnrollment,
        clubId: club ? club.id : editingEnrollment.clubId,
        clubName: club ? club.name : editingEnrollment.clubName,
        memberName: formMemberName.trim(),
        period: formPeriod.trim() || new Date().getFullYear().toString(),
        category: formCategory,
        tutorName: formTutorName.trim() || undefined,
        phone: formPhone.trim() || undefined,
        feeAmount: feeNum,
        amountPaid: amountPaidNum,
        isPaid: isPaidFlag,
        enrollmentDate: formEnrollmentDate,
        receiptNumber: formReceiptNumber.trim() || undefined,
        medicalNotes: formMedicalNotes.trim() || undefined,
      };
      onUpdateEnrollment(updated);
    } else {
      const newEnrollment: ClubEnrollment = {
        id: `mat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        clubId: club ? club.id : (formClubId || 'general'),
        clubName: club ? club.name : 'General',
        memberName: formMemberName.trim(),
        period: formPeriod.trim() || new Date().getFullYear().toString(),
        category: formCategory,
        tutorName: formTutorName.trim() || undefined,
        phone: formPhone.trim() || undefined,
        feeAmount: feeNum,
        amountPaid: amountPaidNum,
        isPaid: isPaidFlag,
        enrollmentDate: formEnrollmentDate,
        receiptNumber: formReceiptNumber.trim() || undefined,
        medicalNotes: formMedicalNotes.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      // Reset active filters so the newly saved enrollment is always visible right away
      setSearchQuery('');
      setStatusFilter('all');
      setCategoryFilter('all');
      if (clubFilter !== 'all' && clubFilter !== newEnrollment.clubId) {
        setClubFilter('all');
      }
      onAddEnrollment(newEnrollment);
    }

    setIsModalOpen(false);
  };

  // 1-Click Toggle Paid
  const handleTogglePaid = (enrollment: ClubEnrollment) => {
    if (enrollment.isPaid) {
      const updated: ClubEnrollment = {
        ...enrollment,
        isPaid: false,
      };
      onUpdateEnrollment(updated);
    } else {
      const updated: ClubEnrollment = {
        ...enrollment,
        isPaid: true,
        amountPaid: enrollment.feeAmount,
      };
      onUpdateEnrollment(updated);
    }
  };

  // Quick partial payment save
  const handleSaveQuickPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPayEnrollment) return;

    const extra = Math.max(0, Number(extraPaymentAmount) || 0);
    const newPaid = Number(quickPayEnrollment.amountPaid) + extra;
    const isNowPaid = newPaid >= Number(quickPayEnrollment.feeAmount);

    const updated: ClubEnrollment = {
      ...quickPayEnrollment,
      amountPaid: newPaid,
      isPaid: isNowPaid,
    };
    onUpdateEnrollment(updated);
    setQuickPayEnrollment(null);
    setExtraPaymentAmount('');
  };

  // Export PDF list
  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 32, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('REGISTRO OFICIAL DE MATRÍCULAS DE CLUBES', 14, 15);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(190, 215, 255);
    const scopeName = activeClubName || 'Todos los Clubes';
    doc.text(`Club / Ministerio: ${scopeName} · Fecha: ${new Date().toLocaleDateString('es-ES')}`, 14, 23);
    doc.text(`Total Matriculados: ${stats.totalCount} | Recaudado: $${stats.totalRecaudado} | Saldo: $${stats.totalPendiente}`, 14, 28);

    const tableRows = filteredEnrollments.map((e, idx) => {
      const saldo = Math.max(0, e.feeAmount - e.amountPaid);
      return [
        idx + 1,
        e.memberName,
        e.clubName,
        e.category || '-',
        e.period,
        e.tutorName || '-',
        `$${e.feeAmount}`,
        `$${e.amountPaid}`,
        saldo > 0 ? `$${saldo}` : '$0',
        e.isPaid ? 'PAGADO' : 'PENDIENTE',
        e.receiptNumber || '-',
      ];
    });

    autoTable(doc, {
      startY: 38,
      head: [['#', 'Miembro', 'Club', 'Categoría', 'Período', 'Tutor', 'Cuota', 'Entregado', 'Saldo', 'Estado', 'Recibo']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2.5 },
      columnStyles: {
        6: { halign: 'right' },
        7: { halign: 'right' },
        8: { halign: 'right', fontStyle: 'bold' },
        9: { halign: 'center', fontStyle: 'bold' },
      },
    });

    doc.save(`Matriculas_Clubes_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 4 KPI Highlight Cards for Club Enrollments */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Matriculados */}
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-2xl border-2 border-slate-300 dark:border-slate-700 shadow-md">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] sm:text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
              Total Matriculados
            </span>
            <div className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-950/80 rounded-xl text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-800 shrink-0">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-3xl font-extrabold text-slate-950 dark:text-white tabular-nums font-mono">
              {stats.totalCount}
            </span>
            <span className="text-[11px] sm:text-xs text-slate-700 dark:text-slate-300 font-semibold block mt-1">
              {stats.totalPagadas} pagadas · {stats.totalConSaldo} con saldo
            </span>
          </div>
        </div>

        {/* Card 2: Dinero de Matrícula Recaudado */}
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-2xl border-2 border-slate-300 dark:border-slate-700 shadow-md">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] sm:text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
              Recaudado Matrícula
            </span>
            <div className="p-1.5 sm:p-2 bg-emerald-100 dark:bg-emerald-950/80 rounded-xl text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-3xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums font-mono">
              ${stats.totalRecaudado.toLocaleString('es-ES', { minimumFractionDigits: 0 })}
            </span>
            <span className="text-[11px] sm:text-xs text-slate-700 dark:text-slate-300 font-semibold block mt-1">
              {stats.porcentajeCobrado.toFixed(0)}% de cuotas
            </span>
          </div>
        </div>

        {/* Card 3: Saldo Pendiente de Matrícula */}
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-2xl border-2 border-slate-300 dark:border-slate-700 shadow-md">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] sm:text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
              Saldo Pendiente
            </span>
            <div className="p-1.5 sm:p-2 bg-amber-100 dark:bg-amber-950/80 rounded-xl text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className={`text-xl sm:text-3xl font-extrabold tabular-nums font-mono ${
              stats.totalPendiente > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
            }`}>
              ${stats.totalPendiente.toLocaleString('es-ES', { minimumFractionDigits: 0 })}
            </span>
            <span className="text-[11px] sm:text-xs text-slate-700 dark:text-slate-300 font-semibold block mt-1">
              Por liquidar
            </span>
          </div>
        </div>

        {/* Card 4: Total Presupuesto Matrículas */}
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-2xl border-2 border-slate-300 dark:border-slate-700 shadow-md">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] sm:text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
              Total Cuotas
            </span>
            <div className="p-1.5 sm:p-2 bg-indigo-100 dark:bg-indigo-950/80 rounded-xl text-indigo-700 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-800 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-3xl font-extrabold text-indigo-700 dark:text-indigo-400 tabular-nums font-mono">
              ${stats.totalCuotas.toLocaleString('es-ES', { minimumFractionDigits: 0 })}
            </span>
            <span className="text-[11px] sm:text-xs text-slate-700 dark:text-slate-300 font-semibold block mt-1">
              Ingreso esperado
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Action Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-300 dark:border-slate-700 p-3.5 sm:p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar miembro, tutor, teléfono o recibo..."
            className="w-full pl-9 pr-3 py-2.5 min-h-[42px] text-sm sm:text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 min-h-[42px] text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
          >
            <option value="all">Todos los Estados</option>
            <option value="paid">Solo Pagados Total</option>
            <option value="pending">Con Saldo Pendiente</option>
          </select>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 min-h-[42px] text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
          >
            <option value="all">Todas las Categorías</option>
            {ENROLLMENT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Club filter (if consolidated) */}
          {(!selectedClubId || selectedClubId === 'all') && (
            <select
              value={clubFilter}
              onChange={(e) => setClubFilter(e.target.value)}
              className="col-span-2 sm:col-span-1 px-3 py-2 min-h-[42px] text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
            >
              <option value="all">Todos los Clubes</option>
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}

          {/* Export PDF */}
          <button
            type="button"
            onClick={handleExportPDF}
            className="px-3 py-2 min-h-[42px] text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl transition-colors flex items-center justify-center gap-1.5"
            title="Exportar reporte de matrículas en PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>

          {/* Add Enrollment Button */}
          <button
            type="button"
            onClick={handleOpenNewModal}
            className="col-span-2 sm:col-span-1 px-4 py-2.5 min-h-[44px] text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Matrícula</span>
          </button>
        </div>
      </div>

      {/* List & Table of Enrollments */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-300 dark:border-slate-700 shadow-md overflow-hidden">
        {/* Vista Móvil (Tarjetas táctiles) */}
        <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-800">
          {filteredEnrollments.length === 0 ? (
            <div className="py-10 px-4 text-center text-slate-500 dark:text-slate-400">
              <GraduationCap className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="font-extrabold text-sm text-slate-700 dark:text-slate-300">
                No hay matrículas registradas todavía.
              </p>
              <p className="text-xs mt-1">
                Toca <strong>"Nueva Matrícula"</strong> para registrar a un miembro.
              </p>
            </div>
          ) : (
            filteredEnrollments.map((e) => {
              const saldo = Math.max(0, e.feeAmount - e.amountPaid);
              return (
                <div key={e.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 flex items-center justify-center font-black text-sm shrink-0">
                        {e.memberName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-extrabold text-sm text-slate-950 dark:text-white truncate">{e.memberName}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold truncate">
                          {e.clubName} · {e.category || 'Miembro'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="px-2 py-1 rounded-lg text-[11px] font-mono font-black bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                        {e.period}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-500">Cuota</span>
                      <span className="text-xs font-mono font-extrabold text-slate-900 dark:text-white">${e.feeAmount.toLocaleString('es-ES')}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-500">Entregado</span>
                      <span className="text-xs font-mono font-extrabold text-emerald-700 dark:text-emerald-400">${e.amountPaid.toLocaleString('es-ES')}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-500">Saldo</span>
                      <span className={`text-xs font-mono font-extrabold ${saldo > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
                        ${saldo.toLocaleString('es-ES')}
                      </span>
                    </div>
                  </div>

                  {(e.tutorName || e.phone || e.receiptNumber) && (
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                      {e.tutorName && <span className="font-semibold">Tutor: {e.tutorName}</span>}
                      {e.phone && (
                        <a href={`tel:${e.phone}`} className="inline-flex items-center gap-1 font-mono text-blue-600 dark:text-blue-400 font-semibold">
                          <Phone className="w-3 h-3" />
                          {e.phone}
                        </a>
                      )}
                      {e.receiptNumber && <span className="font-mono text-slate-500 ml-auto">{e.receiptNumber}</span>}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {e.isPaid ? (
                        <button
                          type="button"
                          onClick={() => handleTogglePaid(e)}
                          className="min-h-[38px] inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>PAGADO</span>
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleTogglePaid(e)}
                            className="min-h-[38px] inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-600 text-white shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Marcar Pagado</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setQuickPayEnrollment(e);
                              setExtraPaymentAmount('');
                            }}
                            className="min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700"
                          >
                            + Abonar
                          </button>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(e)}
                        className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-600 hover:text-blue-600 dark:text-slate-400 rounded-xl bg-slate-100 dark:bg-slate-800"
                        title="Editar"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`¿Eliminar matrícula de "${e.memberName}"?`)) {
                            onDeleteEnrollment(e.id);
                          }
                        }}
                        className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-600 hover:text-rose-600 dark:text-slate-400 rounded-xl bg-slate-100 dark:bg-slate-800"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Vista Escritorio (Tabla) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800 dark:text-slate-200">
            <thead className="bg-slate-900 text-white uppercase text-[11px] font-black tracking-wider">
              <tr>
                <th className="py-3 px-4">Miembro Matriculado</th>
                <th className="py-3 px-4">Club y Categoría</th>
                <th className="py-3 px-4">Tutor / Teléfono</th>
                <th className="py-3 px-3 text-center">Período</th>
                <th className="py-3 px-4 text-right">Cuota Matrícula</th>
                <th className="py-3 px-4 text-right">Dinero Entregado</th>
                <th className="py-3 px-4 text-right">Saldo</th>
                <th className="py-3 px-4 text-center">Estado de Pago</th>
                <th className="py-3 px-3 text-center">Recibo</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredEnrollments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <GraduationCap className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="font-extrabold text-sm text-slate-700 dark:text-slate-300">
                      No hay matrículas registradas todavía.
                    </p>
                    <p className="text-xs mt-1">
                      Haz clic en <strong>"+ Nueva Matrícula"</strong> para registrar a un conquistador, aventurero o joven con su cuota e inscripción.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredEnrollments.map((e) => {
                  const saldo = Math.max(0, e.feeAmount - e.amountPaid);
                  return (
                    <tr 
                      key={e.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      {/* Miembro */}
                      <td className="py-3 px-4 font-extrabold text-slate-950 dark:text-white">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 flex items-center justify-center font-black text-xs shrink-0">
                            {e.memberName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span>{e.memberName}</span>
                            {e.medicalNotes && (
                              <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-normal">
                                Obs: {e.medicalNotes}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Club & Categoría */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 dark:text-white block">
                          {e.clubName}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                          {e.category || 'Miembro'}
                        </span>
                      </td>

                      {/* Tutor & Teléfono */}
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        {e.tutorName ? (
                          <>
                            <span className="font-bold block">{e.tutorName}</span>
                            {e.phone && (
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {e.phone}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-400 italic">No especificado</span>
                        )}
                      </td>

                      {/* Período */}
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-mono font-black bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                          {e.period}
                        </span>
                      </td>

                      {/* Cuota */}
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-950 dark:text-white">
                        ${e.feeAmount.toLocaleString('es-ES')}
                      </td>

                      {/* Dinero Entregado */}
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-700 dark:text-emerald-400">
                        ${e.amountPaid.toLocaleString('es-ES')}
                      </td>

                      {/* Saldo */}
                      <td className="py-3 px-4 text-right font-mono font-extrabold">
                        {saldo > 0 ? (
                          <span className="text-amber-700 dark:text-amber-400">
                            ${saldo.toLocaleString('es-ES')}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 font-normal">
                            $0
                          </span>
                        )}
                      </td>

                      {/* Botón de Pagado / Estado de Pago */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {e.isPaid ? (
                            <button
                              type="button"
                              onClick={() => handleTogglePaid(e)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-200 dark:hover:bg-emerald-900 transition-colors shadow-2xs cursor-pointer"
                              title="Marcar como pendiente"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>PAGADO</span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleTogglePaid(e)}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors cursor-pointer"
                                title="Hacer clic para marcar como Pagado Total"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Marcar Pagado</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setQuickPayEnrollment(e);
                                  setExtraPaymentAmount('');
                                }}
                                className="px-2 py-1 rounded-lg text-[11px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 transition-colors"
                                title="Registrar abono de dinero parcial"
                              >
                                + Abonar
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Recibo */}
                      <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                        {e.receiptNumber || '-'}
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(e)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Editar matrícula"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`¿Eliminar matrícula de "${e.memberName}"?`)) {
                                onDeleteEnrollment(e.id);
                              }
                            }}
                            className="p-1.5 text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Eliminar matrícula"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: REGISTRAR / EDITAR MATRÍCULA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border-2 border-slate-300 dark:border-slate-700 overflow-hidden max-h-[92dvh] flex flex-col pb-safe animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 sm:px-6 py-4 bg-blue-600 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-200 shrink-0" />
                <h3 className="text-base font-extrabold text-white">
                  {editingEnrollment ? 'Editar Matrícula de Club' : 'Registrar Matrícula e Inscripción de Club'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center text-blue-100 hover:text-white rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEnrollment} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {/* Miembro */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                  Nombre Completo del Miembro / Conquistador *
                </label>
                <input
                  type="text"
                  required
                  value={formMemberName}
                  onChange={(e) => setFormMemberName(e.target.value)}
                  placeholder="Ej. Lucas Fernández"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
                />
              </div>

              {/* Club & Categoría */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                    Club *
                  </label>
                  <select
                    value={formClubId}
                    onChange={(e) => setFormClubId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
                  >
                    {clubs.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                    Categoría / Rol *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
                  >
                    {ENROLLMENT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Año / Período */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                  Año o Período Eclesiástico *
                </label>
                <input
                  type="text"
                  required
                  value={formPeriod}
                  onChange={(e) => setFormPeriod(e.target.value)}
                  placeholder="Ej. 2026 o 2026-2027"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>

              {/* Tutor & Teléfono */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                    Padre / Tutor / Contacto
                  </label>
                  <input
                    type="text"
                    value={formTutorName}
                    onChange={(e) => setFormTutorName(e.target.value)}
                    placeholder="Ej. Roberto Fernández"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                    Teléfono del Tutor
                  </label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="Ej. 809-555-4321"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Cuota & Dinero Entregado */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                    Cuota de Matrícula ($) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={formFeeAmount}
                    onChange={(e) => {
                      setFormFeeAmount(e.target.value);
                      if (formIsPaid) {
                        setFormAmountPaid(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                    Dinero Entregado ($) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={formAmountPaid}
                    onChange={(e) => {
                      setFormAmountPaid(e.target.value);
                      const paidNum = Number(e.target.value) || 0;
                      const feeNum = Number(formFeeAmount) || 0;
                      setFormIsPaid(paidNum >= feeNum && feeNum > 0);
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-emerald-700 dark:text-emerald-400 font-mono font-extrabold"
                  />
                </div>
              </div>

              {/* Botón de Pagado Toggle */}
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                    Estado: ¿Matrícula Pagada Totalmente?
                  </span>
                  <span className="text-[11px] text-slate-600 dark:text-slate-400">
                    Al activar "Pagado", el monto entregado se iguala a la cuota.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !formIsPaid;
                    setFormIsPaid(nextVal);
                    if (nextVal) {
                      setFormAmountPaid(formFeeAmount);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                    formIsPaid
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{formIsPaid ? 'PAGADO COMPLETO' : 'PENDIENTE / SALDO'}</span>
                </button>
              </div>

              {/* Fecha y Recibo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                    Fecha de Matrícula
                  </label>
                  <input
                    type="date"
                    value={formEnrollmentDate}
                    onChange={(e) => setFormEnrollmentDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                    Recibo o Comprobante #
                  </label>
                  <input
                    type="text"
                    value={formReceiptNumber}
                    onChange={(e) => setFormReceiptNumber(e.target.value)}
                    placeholder="Ej. REC-0142"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Observaciones médicas / notas */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                  Observaciones Médicas / Ficha (Opcional)
                </label>
                <input
                  type="text"
                  value={formMedicalNotes}
                  onChange={(e) => setFormMedicalNotes(e.target.value)}
                  placeholder="Ej. Alergia a medicamentos, tipo de sangre, contacto de emergencia..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              {/* Buttons */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto min-h-[44px] px-4 py-2 text-xs font-extrabold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 sm:bg-transparent rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto min-h-[44px] px-5 py-2 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingEnrollment ? 'Guardar Cambios' : 'Registrar Matrícula'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ABONO RÁPIDO DE MATRÍCULA */}
      {quickPayEnrollment && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border-2 border-slate-300 dark:border-slate-700 overflow-hidden pb-safe animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-3.5 bg-blue-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                <h3 className="text-sm font-extrabold text-white">Registrar Abono a Matrícula</h3>
              </div>
              <button
                type="button"
                onClick={() => setQuickPayEnrollment(null)}
                className="min-w-[36px] min-h-[36px] flex items-center justify-center text-blue-100 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickPayment} className="p-5 space-y-3">
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-xs space-y-1">
                <span className="font-extrabold text-slate-900 dark:text-white block">
                  {quickPayEnrollment.memberName}
                </span>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Cuota Total:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">${quickPayEnrollment.feeAmount}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Ya Entregado:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">${quickPayEnrollment.amountPaid}</span>
                </div>
                <div className="flex justify-between text-amber-700 dark:text-amber-400 font-extrabold pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span>Saldo Actual:</span>
                  <span className="font-mono">${Math.max(0, quickPayEnrollment.feeAmount - quickPayEnrollment.amountPaid)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                  Monto a Abonar Ahora ($) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  autoFocus
                  required
                  value={extraPaymentAmount}
                  onChange={(e) => setExtraPaymentAmount(e.target.value)}
                  placeholder={`Ej. ${Math.max(0, quickPayEnrollment.feeAmount - quickPayEnrollment.amountPaid)}`}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-emerald-700 dark:text-emerald-400 font-mono font-extrabold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setQuickPayEnrollment(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-xs"
                >
                  Confirmar Abono
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
