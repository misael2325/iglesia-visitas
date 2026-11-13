import React, { useState, useMemo } from 'react';
import { 
  Shirt, 
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
  Tag, 
  Calendar,
  AlertCircle,
  TrendingUp,
  Download,
  Receipt
} from 'lucide-react';
import { CamporeeShirtPayment, Club } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const SHIRT_SIZES = ['4', '6', '8', '10', '12', '14', '16', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

interface CamporeeShirtSectionProps {
  shirts: CamporeeShirtPayment[];
  clubs: Club[];
  selectedClubId: string | null;
  activeClubName?: string;
  onAddShirt: (shirt: CamporeeShirtPayment) => void;
  onUpdateShirt: (shirt: CamporeeShirtPayment) => void;
  onDeleteShirt: (id: string) => void;
}

export const CamporeeShirtSection: React.FC<CamporeeShirtSectionProps> = ({
  shirts,
  clubs,
  selectedClubId,
  activeClubName,
  onAddShirt,
  onUpdateShirt,
  onDeleteShirt,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [sizeFilter, setSizeFilter] = useState<string>('all');
  const [clubFilter, setClubFilter] = useState<string>('all');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShirt, setEditingShirt] = useState<CamporeeShirtPayment | null>(null);
  const [quickPayShirt, setQuickPayShirt] = useState<CamporeeShirtPayment | null>(null);
  const [extraPaymentAmount, setExtraPaymentAmount] = useState<string>('');

  // Form states
  const [formPersonName, setFormPersonName] = useState('');
  const [formClubId, setFormClubId] = useState('');
  const [formSize, setFormSize] = useState('M');
  const [formQuantity, setFormQuantity] = useState('1');
  const [formTotalPrice, setFormTotalPrice] = useState('500');
  const [formAmountPaid, setFormAmountPaid] = useState('500');
  const [formIsPaid, setFormIsPaid] = useState(true);
  const [formPaymentDate, setFormPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formPhone, setFormPhone] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Filtered shirts based on selected club or consolidated
  const relevantShirts = useMemo(() => {
    return shirts.filter((s) => {
      if (selectedClubId && selectedClubId !== 'all') {
        return s.clubId === selectedClubId;
      }
      if (clubFilter !== 'all' && s.clubId !== clubFilter) {
        return false;
      }
      return true;
    });
  }, [shirts, selectedClubId, clubFilter]);

  const filteredShirts = useMemo(() => {
    return relevantShirts.filter((s) => {
      if (statusFilter === 'paid' && !s.isPaid) return false;
      if (statusFilter === 'pending' && s.isPaid) return false;
      if (sizeFilter !== 'all' && s.size !== sizeFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.personName.toLowerCase().includes(q) ||
          s.clubName.toLowerCase().includes(q) ||
          (s.notes || '').toLowerCase().includes(q) ||
          (s.phone || '').includes(q)
        );
      }
      return true;
    });
  }, [relevantShirts, statusFilter, sizeFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const totalCount = relevantShirts.reduce((sum, s) => sum + (Number(s.quantity) || 1), 0);
    const totalFacturado = relevantShirts.reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0);
    const totalRecaudado = relevantShirts.reduce((sum, s) => sum + (Number(s.amountPaid) || 0), 0);
    const totalPendiente = Math.max(0, totalFacturado - totalRecaudado);
    const totalPagadas = relevantShirts.filter((s) => s.isPaid).length;
    const totalConSaldo = relevantShirts.length - totalPagadas;

    return {
      totalCount,
      totalFacturado,
      totalRecaudado,
      totalPendiente,
      totalPagadas,
      totalConSaldo,
      porcentajeCobrado: totalFacturado > 0 ? (totalRecaudado / totalFacturado) * 100 : 0,
    };
  }, [relevantShirts]);

  // Open modal for new shirt
  const handleOpenNewModal = () => {
    setEditingShirt(null);
    setFormPersonName('');
    const defaultClub = (selectedClubId && selectedClubId !== 'all') 
      ? clubs.find((c) => c.id === selectedClubId) 
      : clubs[0];
    setFormClubId(defaultClub?.id || (clubs[0]?.id || ''));
    setFormSize('M');
    setFormQuantity('1');
    setFormTotalPrice('500');
    setFormAmountPaid('500');
    setFormIsPaid(true);
    setFormPaymentDate(new Date().toISOString().split('T')[0]);
    setFormPhone('');
    setFormNotes('');
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEditModal = (shirt: CamporeeShirtPayment) => {
    setEditingShirt(shirt);
    setFormPersonName(shirt.personName);
    setFormClubId(shirt.clubId);
    setFormSize(shirt.size);
    setFormQuantity(String(shirt.quantity || 1));
    setFormTotalPrice(String(shirt.totalPrice || 0));
    setFormAmountPaid(String(shirt.amountPaid || 0));
    setFormIsPaid(shirt.isPaid);
    setFormPaymentDate(shirt.paymentDate || new Date().toISOString().split('T')[0]);
    setFormPhone(shirt.phone || '');
    setFormNotes(shirt.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveShirt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPersonName.trim()) return;

    const club = clubs.find((c) => c.id === formClubId) || clubs[0];
    const totalPriceNum = Math.max(0, Number(formTotalPrice) || 0);
    let amountPaidNum = Math.max(0, Number(formAmountPaid) || 0);
    let isPaidFlag = formIsPaid;

    if (amountPaidNum >= totalPriceNum && totalPriceNum > 0) {
      isPaidFlag = true;
    } else if (isPaidFlag) {
      amountPaidNum = totalPriceNum;
    }

    if (editingShirt) {
      const updated: CamporeeShirtPayment = {
        ...editingShirt,
        clubId: club ? club.id : editingShirt.clubId,
        clubName: club ? club.name : editingShirt.clubName,
        personName: formPersonName.trim(),
        size: formSize,
        quantity: Math.max(1, Number(formQuantity) || 1),
        totalPrice: totalPriceNum,
        amountPaid: amountPaidNum,
        isPaid: isPaidFlag,
        paymentDate: formPaymentDate,
        phone: formPhone.trim() || undefined,
        notes: formNotes.trim() || undefined,
      };
      onUpdateShirt(updated);
    } else {
      const newShirt: CamporeeShirtPayment = {
        id: `shirt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        clubId: club ? club.id : 'general',
        clubName: club ? club.name : 'General',
        personName: formPersonName.trim(),
        size: formSize,
        quantity: Math.max(1, Number(formQuantity) || 1),
        totalPrice: totalPriceNum,
        amountPaid: amountPaidNum,
        isPaid: isPaidFlag,
        paymentDate: formPaymentDate,
        phone: formPhone.trim() || undefined,
        notes: formNotes.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      onAddShirt(newShirt);
    }

    setIsModalOpen(false);
  };

  // 1-Click Toggle Paid
  const handleTogglePaid = (shirt: CamporeeShirtPayment) => {
    if (shirt.isPaid) {
      // Revert to partial or pending
      const updated: CamporeeShirtPayment = {
        ...shirt,
        isPaid: false,
      };
      onUpdateShirt(updated);
    } else {
      // Mark as fully paid
      const updated: CamporeeShirtPayment = {
        ...shirt,
        isPaid: true,
        amountPaid: shirt.totalPrice,
        paymentDate: new Date().toISOString().split('T')[0],
      };
      onUpdateShirt(updated);
    }
  };

  // Quick partial payment save
  const handleSaveQuickPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPayShirt) return;

    const extra = Math.max(0, Number(extraPaymentAmount) || 0);
    const newPaid = Number(quickPayShirt.amountPaid) + extra;
    const isNowPaid = newPaid >= Number(quickPayShirt.totalPrice);

    const updated: CamporeeShirtPayment = {
      ...quickPayShirt,
      amountPaid: newPaid,
      isPaid: isNowPaid,
      paymentDate: new Date().toISOString().split('T')[0],
    };
    onUpdateShirt(updated);
    setQuickPayShirt(null);
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
    doc.text('LISTA Y CONTROL DE T-SHIRTS DE CAMPOREE', 14, 15);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(190, 215, 255);
    const scopeName = activeClubName || 'Todos los Clubes';
    doc.text(`Club / Ministerio: ${scopeName} · Fecha: ${new Date().toLocaleDateString('es-ES')}`, 14, 23);
    doc.text(`Total Camisetas: ${stats.totalCount} | Recaudado: $${stats.totalRecaudado} | Saldo: $${stats.totalPendiente}`, 14, 28);

    const tableRows = filteredShirts.map((s, idx) => {
      const saldo = Math.max(0, s.totalPrice - s.amountPaid);
      return [
        idx + 1,
        s.personName,
        s.clubName,
        s.size,
        s.quantity,
        `$${s.totalPrice}`,
        `$${s.amountPaid}`,
        saldo > 0 ? `$${saldo}` : '$0',
        s.isPaid ? 'PAGADO' : 'PENDIENTE',
        s.phone || '-',
      ];
    });

    autoTable(doc, {
      startY: 38,
      head: [['#', 'Persona', 'Club', 'Talla', 'Cant.', 'Total', 'Entregado', 'Saldo', 'Estado', 'Teléfono']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2.5 },
      columnStyles: {
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right', fontStyle: 'bold' },
        8: { halign: 'center', fontStyle: 'bold' },
      },
    });

    doc.save(`TShirts_Camporee_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 4 KPI Highlight Cards for Camporee T-Shirts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Camisetas */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border-2 border-slate-300 dark:border-slate-700 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
              Total Camisetas
            </span>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/80 rounded-xl text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
              <Shirt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white tabular-nums font-mono">
              {stats.totalCount}
            </span>
            <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold block mt-1">
              {stats.totalPagadas} pagadas · {stats.totalConSaldo} con saldo
            </span>
          </div>
        </div>

        {/* Card 2: Dinero Entregado (Recaudado) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border-2 border-slate-300 dark:border-slate-700 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
              Dinero Entregado
            </span>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/80 rounded-xl text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums font-mono">
              ${stats.totalRecaudado.toLocaleString('es-ES', { minimumFractionDigits: 0 })}
            </span>
            <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold block mt-1">
              {stats.porcentajeCobrado.toFixed(0)}% del costo total recaudado
            </span>
          </div>
        </div>

        {/* Card 3: Saldo Pendiente por Cobrar */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border-2 border-slate-300 dark:border-slate-700 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
              Saldo Pendiente
            </span>
            <div className="p-2 bg-amber-100 dark:bg-amber-950/80 rounded-xl text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className={`text-2xl sm:text-3xl font-extrabold tabular-nums font-mono ${
              stats.totalPendiente > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
            }`}>
              ${stats.totalPendiente.toLocaleString('es-ES', { minimumFractionDigits: 0 })}
            </span>
            <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold block mt-1">
              Monto por recaudar de pedidos
            </span>
          </div>
        </div>

        {/* Card 4: Costo Total Facturado */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border-2 border-slate-300 dark:border-slate-700 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
              Total Facturado
            </span>
            <div className="p-2 bg-blue-100 dark:bg-blue-950/80 rounded-xl text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-800">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-blue-700 dark:text-blue-400 tabular-nums font-mono">
              ${stats.totalFacturado.toLocaleString('es-ES', { minimumFractionDigits: 0 })}
            </span>
            <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold block mt-1">
              Valor de todos los pedidos registrados
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Action Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-300 dark:border-slate-700 p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre de persona, club o teléfono..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
          >
            <option value="all">Todos los Estados</option>
            <option value="paid">Solo Pagados Total</option>
            <option value="pending">Con Saldo Pendiente</option>
          </select>

          {/* Size filter */}
          <select
            value={sizeFilter}
            onChange={(e) => setSizeFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
          >
            <option value="all">Todas las Tallas</option>
            {SHIRT_SIZES.map((sz) => (
              <option key={sz} value={sz}>Talla {sz}</option>
            ))}
          </select>

          {/* Club filter (if consolidated) */}
          {(!selectedClubId || selectedClubId === 'all') && (
            <select
              value={clubFilter}
              onChange={(e) => setClubFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
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
            className="px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl transition-colors flex items-center gap-1.5"
            title="Exportar reporte en PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PDF</span>
          </button>

          {/* Add Shirt Button */}
          <button
            type="button"
            onClick={handleOpenNewModal}
            className="px-4 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Registrar T-Shirt</span>
          </button>
        </div>
      </div>

      {/* Table of Shirts & Payments */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-300 dark:border-slate-700 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800 dark:text-slate-200">
            <thead className="bg-slate-900 text-white uppercase text-[11px] font-black tracking-wider">
              <tr>
                <th className="py-3 px-4">Persona / Miembro</th>
                <th className="py-3 px-4">Club</th>
                <th className="py-3 px-3 text-center">Talla</th>
                <th className="py-3 px-3 text-center">Cant.</th>
                <th className="py-3 px-4 text-right">Costo Total</th>
                <th className="py-3 px-4 text-right">Dinero Entregado</th>
                <th className="py-3 px-4 text-right">Saldo</th>
                <th className="py-3 px-4 text-center">Estado de Pago</th>
                <th className="py-3 px-4 text-center">Fecha</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredShirts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <Shirt className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="font-extrabold text-sm text-slate-700 dark:text-slate-300">
                      No hay registros de camisetas de camporee aún.
                    </p>
                    <p className="text-xs mt-1">
                      Haz clic en <strong>"+ Registrar T-Shirt"</strong> para ingresar el pedido de una persona y su dinero entregado.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredShirts.map((s) => {
                  const saldo = Math.max(0, s.totalPrice - s.amountPaid);
                  return (
                    <tr 
                      key={s.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      {/* Persona */}
                      <td className="py-3 px-4 font-extrabold text-slate-950 dark:text-white">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-black text-xs shrink-0">
                            {s.personName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span>{s.personName}</span>
                            {s.phone && (
                              <span className="block text-[11px] font-normal text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-slate-400" />
                                {s.phone}
                              </span>
                            )}
                            {s.notes && (
                              <span className="block text-[10px] text-slate-500 dark:text-slate-400 italic">
                                "{s.notes}"
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Club */}
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-semibold">
                        {s.clubName}
                      </td>

                      {/* Talla */}
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block px-2.5 py-1 rounded-md text-xs font-black bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800 font-mono">
                          {s.size}
                        </span>
                      </td>

                      {/* Cantidad */}
                      <td className="py-3 px-3 text-center font-extrabold font-mono text-slate-900 dark:text-white">
                        {s.quantity || 1}
                      </td>

                      {/* Costo Total */}
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-950 dark:text-white">
                        ${s.totalPrice.toLocaleString('es-ES')}
                      </td>

                      {/* Dinero Entregado */}
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-700 dark:text-emerald-400">
                        ${s.amountPaid.toLocaleString('es-ES')}
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
                          {s.isPaid ? (
                            <button
                              type="button"
                              onClick={() => handleTogglePaid(s)}
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
                                onClick={() => handleTogglePaid(s)}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors cursor-pointer"
                                title="Hacer clic para marcar como Pagado Total"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Marcar Pagado</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setQuickPayShirt(s);
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

                      {/* Fecha */}
                      <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                        {s.paymentDate}
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(s)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Editar pedido de T-Shirt"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`¿Eliminar pedido de camiseta de "${s.personName}"?`)) {
                                onDeleteShirt(s.id);
                              }
                            }}
                            className="p-1.5 text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Eliminar pedido"
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

      {/* MODAL 1: REGISTRAR / EDITAR T-SHIRT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-slate-300 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shirt className="w-5 h-5 text-emerald-200" />
                <h3 className="text-base font-extrabold text-white">
                  {editingShirt ? 'Editar Pedido de T-Shirt' : 'Registrar Dinero y T-Shirt de Camporee'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-emerald-100 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveShirt} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Persona */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                  Nombre de la Persona / Miembro *
                </label>
                <input
                  type="text"
                  required
                  value={formPersonName}
                  onChange={(e) => setFormPersonName(e.target.value)}
                  placeholder="Ej. Juan Pérez / Sofía Ramos"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
                />
              </div>

              {/* Club selector */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                  Club o Ministerio *
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

              {/* Talla & Cantidad */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                    Talla de Camiseta *
                  </label>
                  <select
                    value={formSize}
                    onChange={(e) => setFormSize(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
                  >
                    <optgroup label="Tallas Infantiles / Niños">
                      <option value="4">Talla 4 (Infantil)</option>
                      <option value="6">Talla 6 (Infantil)</option>
                      <option value="8">Talla 8 (Infantil)</option>
                      <option value="10">Talla 10 (Infantil)</option>
                      <option value="12">Talla 12 (Infantil)</option>
                      <option value="14">Talla 14 (Infantil)</option>
                      <option value="16">Talla 16 (Infantil)</option>
                    </optgroup>
                    <optgroup label="Tallas Adultos">
                      <option value="XS">Talla XS (Extra Small)</option>
                      <option value="S">Talla S (Small)</option>
                      <option value="M">Talla M (Medium)</option>
                      <option value="L">Talla L (Large)</option>
                      <option value="XL">Talla XL (Extra Large)</option>
                      <option value="2XL">Talla 2XL</option>
                      <option value="3XL">Talla 3XL</option>
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                    Cantidad *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formQuantity}
                    onChange={(e) => {
                      const qty = Math.max(1, parseInt(e.target.value) || 1);
                      setFormQuantity(String(qty));
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
              </div>

              {/* Costo Total & Dinero Entregado */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                    Costo Total a Pagar ($) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={formTotalPrice}
                    onChange={(e) => {
                      setFormTotalPrice(e.target.value);
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
                      const totalNum = Number(formTotalPrice) || 0;
                      setFormIsPaid(paidNum >= totalNum && totalNum > 0);
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-emerald-700 dark:text-emerald-400 font-mono font-extrabold"
                  />
                </div>
              </div>

              {/* Botón de Pagado Toggle */}
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                    Estado: ¿Está Pagado Totalmente?
                  </span>
                  <span className="text-[11px] text-slate-600 dark:text-slate-400">
                    Al activar "Pagado", el dinero entregado se iguala al costo total.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !formIsPaid;
                    setFormIsPaid(nextVal);
                    if (nextVal) {
                      setFormAmountPaid(formTotalPrice);
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

              {/* Fecha y Teléfono */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                    Fecha de Registro / Pago
                  </label>
                  <input
                    type="date"
                    value={formPaymentDate}
                    onChange={(e) => setFormPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                    Teléfono de Contacto (Opcional)
                  </label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="Ej. 809-555-1234"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                  Notas u Observaciones (Opcional)
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ej. T-shirt entregada, personalización con nombre, etc."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-extrabold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingShirt ? 'Guardar Cambios' : 'Registrar Pedido'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ABONO RÁPIDO DE DINERO */}
      {quickPayShirt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-slate-300 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-3.5 bg-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                <h3 className="text-sm font-extrabold text-white">Registrar Abono de Dinero</h3>
              </div>
              <button
                type="button"
                onClick={() => setQuickPayShirt(null)}
                className="text-emerald-100 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickPayment} className="p-5 space-y-3">
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-xs space-y-1">
                <span className="font-extrabold text-slate-900 dark:text-white block">
                  {quickPayShirt.personName}
                </span>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Costo Total:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">${quickPayShirt.totalPrice}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Ya Entregado:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">${quickPayShirt.amountPaid}</span>
                </div>
                <div className="flex justify-between text-amber-700 dark:text-amber-400 font-extrabold pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span>Saldo Actual:</span>
                  <span className="font-mono">${Math.max(0, quickPayShirt.totalPrice - quickPayShirt.amountPaid)}</span>
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
                  placeholder={`Ej. ${Math.max(0, quickPayShirt.totalPrice - quickPayShirt.amountPaid)}`}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-emerald-700 dark:text-emerald-400 font-mono font-extrabold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setQuickPayShirt(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs"
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
