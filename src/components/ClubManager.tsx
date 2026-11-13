import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Calendar, 
  Plus, 
  Filter, 
  Search, 
  Download, 
  Printer, 
  Share2, 
  X, 
  CheckCircle2, 
  FileText, 
  Building2, 
  ShieldCheck, 
  ArrowUpRight, 
  ArrowDownRight, 
  Percent, 
  Receipt, 
  Tag, 
  User, 
  Trash2,
  AlertCircle,
  HelpCircle,
  MessageSquare,
  ArrowLeft,
  ArrowRight,
  BarChart2,
  Shirt,
  GraduationCap,
  Edit3,
  AlertTriangle
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Club, ClubActivity, ClubTransaction, TransactionType, CamporeeShirtPayment, ClubEnrollment } from '../types';
import { formatSpanishDate, generateWhatsAppLink } from '../utils/dateUtils';
import { CamporeeShirtSection } from './CamporeeShirtSection';
import { ClubEnrollmentSection } from './ClubEnrollmentSection';

export const DEFAULT_CLUBS: Club[] = [
  { id: 'club-conquistadores', name: 'Club de Conquistadores', description: 'Adolescentes de 10 a 15 años', color: 'amber', director: 'Carlos Méndez', period: '2026' },
  { id: 'club-aventureros', name: 'Club de Aventureros', description: 'Niños de 6 a 9 años', color: 'blue', director: 'Laura Sánchez', period: '2026' },
  { id: 'club-guias', name: 'Club de Guías Mayores', description: 'Jóvenes y liderazgo juvenil', color: 'purple', director: 'David Ramos', period: '2026' },
  { id: 'club-jovenes', name: 'Sociedad de Jóvenes (JA)', description: 'Jóvenes universitarios y adultos jóvenes', color: 'indigo', director: 'Marcos Peña', period: '2026' },
  { id: 'club-damas', name: 'Club de Damas / Ministerio de la Mujer', description: 'Mujeres y actividades misioneras', color: 'rose', director: 'Elena Rosario', period: '2026' },
  { id: 'club-infantil', name: 'Ministerio Infantil', description: 'Cuna, Infantes y Primarios', color: 'emerald', director: 'Rosa Morales', period: '2026' },
];

export const INITIAL_CLUB_ACTIVITIES: ClubActivity[] = [];

export const INITIAL_CLUB_TRANSACTIONS: ClubTransaction[] = [];

interface ClubManagerProps {
  clubs: Club[];
  activities: ClubActivity[];
  transactions: ClubTransaction[];
  camporeeShirts: CamporeeShirtPayment[];
  clubEnrollments: ClubEnrollment[];
  onAddClub: (club: Club) => void;
  onUpdateClub?: (club: Club) => void;
  onDeleteClub: (id: string) => void;
  onAddActivity: (activity: ClubActivity) => void;
  onAddTransaction: (transaction: ClubTransaction) => void;
  onDeleteTransaction: (id: string) => void;
  onDeleteActivity: (id: string) => void;
  onAddCamporeeShirt: (shirt: CamporeeShirtPayment) => void;
  onUpdateCamporeeShirt: (shirt: CamporeeShirtPayment) => void;
  onDeleteCamporeeShirt: (id: string) => void;
  onAddClubEnrollment: (enrollment: ClubEnrollment) => void;
  onUpdateClubEnrollment: (enrollment: ClubEnrollment) => void;
  onDeleteClubEnrollment: (id: string) => void;
  onBackToPortal?: () => void;
}

export const ClubManager: React.FC<ClubManagerProps> = ({
  clubs,
  activities,
  transactions,
  camporeeShirts,
  clubEnrollments,
  onAddClub,
  onUpdateClub,
  onDeleteClub,
  onAddActivity,
  onAddTransaction,
  onDeleteTransaction,
  onDeleteActivity,
  onAddCamporeeShirt,
  onUpdateCamporeeShirt,
  onDeleteCamporeeShirt,
  onAddClubEnrollment,
  onUpdateClubEnrollment,
  onDeleteClubEnrollment,
  onBackToPortal,
}) => {
  // Navigation inside Club Module: null (Directorio de Clubes) | string (Club específico) | 'all' (Consolidado)
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'analisis' | 'movimientos' | 'tshirts' | 'matricula'>('analisis');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'ingreso' | 'egreso'>('all');
  const [activityFilter, setActivityFilter] = useState<string>('all');

  // Modals state
  const [isNewActivityModalOpen, setIsNewActivityModalOpen] = useState(false);
  const [isNewTxModalOpen, setIsNewTxModalOpen] = useState(false);
  const [isNewClubModalOpen, setIsNewClubModalOpen] = useState(false);
  const [clubToDelete, setClubToDelete] = useState<Club | null>(null);
  const [clubToEdit, setClubToEdit] = useState<Club | null>(null);
  const [presetTxType, setPresetTxType] = useState<TransactionType>('ingreso');
  const [presetActivityId, setPresetActivityId] = useState<string>('');

  // WhatsApp share modal or trigger
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharePhone, setSharePhone] = useState('');

  // Form states for New Activity
  const [newActName, setNewActName] = useState('');
  const [newActClubId, setNewActClubId] = useState('');
  const [newActDate, setNewActDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newActBudget, setNewActBudget] = useState('');
  const [newActDesc, setNewActDesc] = useState('');

  // Form states for New Transaction
  const [txType, setTxType] = useState<TransactionType>('ingreso');
  const [txActivityId, setTxActivityId] = useState('');
  const [txDescription, setTxDescription] = useState('');
  const [txCategory, setTxCategory] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [txResponsible, setTxResponsible] = useState('');
  const [txPaymentMethod, setTxPaymentMethod] = useState<'efectivo' | 'transferencia' | 'tarjeta' | 'otro'>('efectivo');
  const [txReceipt, setTxReceipt] = useState('');

  // Form states for New Club
  const [newClubName, setNewClubName] = useState('');
  const [newClubDirector, setNewClubDirector] = useState('');
  const [newClubPeriod, setNewClubPeriod] = useState(() => new Date().getFullYear().toString());
  const [newClubDesc, setNewClubDesc] = useState('');

  // Form states for Edit Club
  const [editClubName, setEditClubName] = useState('');
  const [editClubDirector, setEditClubDirector] = useState('');
  const [editClubPeriod, setEditClubPeriod] = useState('');
  const [editClubDesc, setEditClubDesc] = useState('');

  // Filtered Activities
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      if (selectedClubId !== 'all' && act.clubId !== selectedClubId) {
        return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return act.name.toLowerCase().includes(q) || (act.description || '').toLowerCase().includes(q) || act.clubName.toLowerCase().includes(q);
      }
      return true;
    });
  }, [activities, selectedClubId, searchQuery]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (selectedClubId !== 'all' && tx.clubId !== selectedClubId) {
        return false;
      }
      if (activityFilter !== 'all' && tx.activityId !== activityFilter) {
        return false;
      }
      if (typeFilter !== 'all' && tx.type !== typeFilter) {
        return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          tx.description.toLowerCase().includes(q) ||
          tx.activityName.toLowerCase().includes(q) ||
          tx.category.toLowerCase().includes(q) ||
          (tx.responsiblePerson || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [transactions, selectedClubId, activityFilter, typeFilter, searchQuery]);

  // Overall Financial Calculations
  const stats = useMemo(() => {
    // Filter relevant transactions based on selectedClubId
    const relevantTxs = selectedClubId === 'all' 
      ? transactions 
      : transactions.filter((tx) => tx.clubId === selectedClubId);

    const totalIngresos = relevantTxs
      .filter((t) => t.type === 'ingreso')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const totalEgresos = relevantTxs
      .filter((t) => t.type === 'egreso')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const gananciaNeta = totalIngresos - totalEgresos;
    const margen = totalIngresos > 0 ? (gananciaNeta / totalIngresos) * 100 : 0;

    // Per-activity breakdown
    const activityMap: Record<string, {
      activity: ClubActivity;
      ingresos: number;
      egresos: number;
      ganancia: number;
      margen: number;
      count: number;
    }> = {};

    const relevantActivities = selectedClubId === 'all'
      ? activities
      : activities.filter((a) => a.clubId === selectedClubId);

    relevantActivities.forEach((act) => {
      activityMap[act.id] = {
        activity: act,
        ingresos: 0,
        egresos: 0,
        ganancia: 0,
        margen: 0,
        count: 0,
      };
    });

    relevantTxs.forEach((tx) => {
      if (!activityMap[tx.activityId]) {
        // find or placeholder
        const found = activities.find((a) => a.id === tx.activityId);
        if (found) {
          activityMap[tx.activityId] = {
            activity: found,
            ingresos: 0,
            egresos: 0,
            ganancia: 0,
            margen: 0,
            count: 0,
          };
        }
      }

      if (activityMap[tx.activityId]) {
        if (tx.type === 'ingreso') {
          activityMap[tx.activityId].ingresos += Number(tx.amount) || 0;
        } else {
          activityMap[tx.activityId].egresos += Number(tx.amount) || 0;
        }
        activityMap[tx.activityId].count += 1;
      }
    });

    Object.values(activityMap).forEach((item) => {
      item.ganancia = item.ingresos - item.egresos;
      item.margen = item.ingresos > 0 ? (item.ganancia / item.ingresos) * 100 : 0;
    });

    const activityAnalysis = Object.values(activityMap).sort((a, b) => b.ganancia - a.ganancia);

    return {
      totalIngresos,
      totalEgresos,
      gananciaNeta,
      margen,
      activityAnalysis,
      totalActivities: relevantActivities.length,
      totalTransactions: relevantTxs.length,
    };
  }, [transactions, activities, selectedClubId]);

  // Active club object when a specific club is opened
  const activeClub = useMemo(() => {
    if (!selectedClubId || selectedClubId === 'all') return null;
    return clubs.find((c) => c.id === selectedClubId) || null;
  }, [clubs, selectedClubId]);

  // Per-club summary stats for the Directory view
  const clubsStats = useMemo(() => {
    return clubs.map((c) => {
      const clubActs = activities.filter((a) => a.clubId === c.id);
      const clubTxs = transactions.filter((t) => t.clubId === c.id);
      const clubShirts = camporeeShirts.filter((s) => s.clubId === c.id);
      const clubMats = clubEnrollments.filter((e) => e.clubId === c.id);
      const ingresos = clubTxs
        .filter((t) => t.type === 'ingreso')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      const egresos = clubTxs
        .filter((t) => t.type === 'egreso')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      const ganancia = ingresos - egresos;
      const shirtsCount = clubShirts.reduce((sum, s) => sum + (Number(s.quantity) || 1), 0);
      const enrollmentsCount = clubMats.length;
      return {
        club: c,
        activitiesCount: clubActs.length,
        transactionsCount: clubTxs.length,
        shirtsCount,
        enrollmentsCount,
        ingresos,
        egresos,
        ganancia,
      };
    });
  }, [clubs, activities, transactions, camporeeShirts, clubEnrollments]);

  // Club Editing & Deleting Handlers
  const handleOpenEditClub = (club: Club) => {
    setClubToEdit(club);
    setEditClubName(club.name);
    setEditClubDirector(club.director || '');
    setEditClubPeriod(club.period || new Date().getFullYear().toString());
    setEditClubDesc(club.description || '');
  };

  const handleSaveEditClub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubToEdit || !editClubName.trim()) return;

    const updated: Club = {
      ...clubToEdit,
      name: editClubName.trim(),
      director: editClubDirector.trim() || undefined,
      period: editClubPeriod.trim() || new Date().getFullYear().toString(),
      description: editClubDesc.trim() || 'Ministerio / Club de iglesia',
    };

    if (onUpdateClub) {
      onUpdateClub(updated);
    }
    setClubToEdit(null);
  };

  const handleConfirmDeleteClub = () => {
    if (!clubToDelete) return;
    onDeleteClub(clubToDelete.id);
    if (selectedClubId === clubToDelete.id) {
      setSelectedClubId(null);
    }
    setClubToDelete(null);
  };

  // Handlers for opening transaction modal with presets
  const handleOpenAddTx = (type: TransactionType = 'ingreso', activityId: string = '') => {
    setTxType(type);
    const availableActs = selectedClubId && selectedClubId !== 'all'
      ? activities.filter((a) => a.clubId === selectedClubId)
      : activities;
    setTxActivityId(activityId || (availableActs[0]?.id ?? ''));
    setTxDescription('');
    setTxCategory(type === 'ingreso' ? 'Venta de comida / Recaudación' : 'Insumos y Materiales');
    setTxAmount('');
    setTxDate(new Date().toISOString().split('T')[0]);
    setTxResponsible('');
    setTxReceipt('');
    setIsNewTxModalOpen(true);
  };

  const handleSaveActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActName.trim()) return;

    const club = clubs.find((c) => c.id === (newActClubId || clubs[0].id)) || clubs[0];
    const newAct: ClubActivity = {
      id: `act-${Date.now()}`,
      clubId: club.id,
      clubName: club.name,
      name: newActName.trim(),
      date: newActDate,
      description: newActDesc.trim(),
      targetBudget: newActBudget ? Number(newActBudget) : undefined,
      status: 'en_progreso',
      createdAt: new Date().toISOString(),
    };

    onAddActivity(newAct);
    setIsNewActivityModalOpen(false);
    setNewActName('');
    setNewActDesc('');
    setNewActBudget('');
  };

  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txDescription.trim() || !txAmount || Number(txAmount) <= 0) return;

    const activity = activities.find((a) => a.id === txActivityId) || activities[0];
    if (!activity) return;

    const newTx: ClubTransaction = {
      id: `tx-${Date.now()}`,
      activityId: activity.id,
      activityName: activity.name,
      clubId: activity.clubId,
      clubName: activity.clubName,
      type: txType,
      category: txCategory.trim() || (txType === 'ingreso' ? 'Ingreso General' : 'Gasto Operativo'),
      description: txDescription.trim(),
      amount: Number(txAmount),
      date: txDate,
      paymentMethod: txPaymentMethod,
      responsiblePerson: txResponsible.trim() || undefined,
      receiptNumber: txReceipt.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    onAddTransaction(newTx);
    setIsNewTxModalOpen(false);
  };

  const handleSaveClub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClubName.trim()) return;

    const newClub: Club = {
      id: `club-${Date.now()}`,
      name: newClubName.trim(),
      director: newClubDirector.trim() || undefined,
      period: newClubPeriod.trim() || new Date().getFullYear().toString(),
      description: newClubDesc.trim() || 'Ministerio / Club de iglesia',
      color: 'blue',
    };

    onAddClub(newClub);
    setIsNewClubModalOpen(false);
    setNewClubName('');
    setNewClubDirector('');
    setNewClubPeriod(new Date().getFullYear().toString());
    setNewClubDesc('');
  };

  // Export to PDF using jsPDF and autoTable
  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const activeClubName = selectedClubId === 'all'
      ? 'Todos los Clubes de la Iglesia'
      : clubs.find((c) => c.id === selectedClubId)?.name || 'Club';

    // Header styling
    doc.setFillColor(15, 23, 42); // slate-900 navy
    doc.rect(0, 0, 210, 32, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE FINANCIERO Y BALANCE DE CLUBES', 14, 15);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(190, 215, 255);
    doc.text(`Departamento de Finanzas y Actividades · ${activeClubName}`, 14, 23);
    doc.text(`Emitido: ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, 14, 28);

    // Summary box
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN GENERAL DE RENTABILIDAD Y FONDOS', 14, 42);

    const summaryData = [
      ['Total Recaudado (Ingresos)', `$ ${stats.totalIngresos.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`],
      ['Total Gastado (Egresos)', `$ ${stats.totalEgresos.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`],
      ['Ganancia Neta / Balance', `$ ${stats.gananciaNeta.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`],
      ['Margen de Rentabilidad', `${stats.margen.toFixed(1)}%`],
      ['Actividades Analizadas', `${stats.totalActivities}`],
      ['Total de Movimientos Contables', `${stats.totalTransactions}`],
    ];

    autoTable(doc, {
      startY: 46,
      head: [['Indicador Financiero', 'Monto / Estado']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2.5 },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [30, 41, 59] },
        1: { halign: 'right', fontStyle: 'bold' },
      },
    });

    // Activities Table
    const nextY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('DESGLOSE Y RESULTADOS POR ACTIVIDAD', 14, nextY);

    const activitiesData = stats.activityAnalysis.map((item) => [
      item.activity.name,
      item.activity.clubName,
      item.activity.date,
      `$ ${item.ingresos.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`,
      `$ ${item.egresos.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`,
      `$ ${item.ganancia.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`,
      `${item.margen.toFixed(0)}%`,
    ]);

    autoTable(doc, {
      startY: nextY + 4,
      head: [['Actividad', 'Club', 'Fecha', 'Recaudado', 'Gastado', 'Ganancia Neta', 'Margen']],
      body: activitiesData,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2.5 },
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right', fontStyle: 'bold' },
        6: { halign: 'center' },
      },
    });

    // Signatures footer
    const finalY = Math.min((doc as any).lastAutoTable.finalY + 22, 265);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('____________________________________', 25, finalY);
    doc.text('Director / Líder del Club', 35, finalY + 5);

    doc.text('____________________________________', 90, finalY);
    doc.text('Tesorero / Encargado de Finanzas', 95, finalY + 5);

    doc.text('____________________________________', 155, finalY);
    doc.text('Pastor / Anciano Asesor', 165, finalY + 5);

    doc.save(`Balance_Financiero_Clubes_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // WhatsApp summary message builder
  const buildWhatsAppMessage = () => {
    const activeClubName = selectedClubId === 'all'
      ? 'Todos los Clubes'
      : clubs.find((c) => c.id === selectedClubId)?.name || 'Club';

    let text = `📊 *REPORTE FINANCIERO DE ACTIVIDADES - ${activeClubName.toUpperCase()}*\n`;
    text += `🏛 *Iglesia Cristiana*\n`;
    text += `📅 Fecha: ${new Date().toLocaleDateString('es-ES')}\n\n`;
    text += `💰 *RESUMEN GENERAL:*\n`;
    text += `• Total Recaudado (Ingresos): $${stats.totalIngresos.toLocaleString('es-ES', { minimumFractionDigits: 2 })}\n`;
    text += `• Total Gastado (Egresos): $${stats.totalEgresos.toLocaleString('es-ES', { minimumFractionDigits: 2 })}\n`;
    text += `• *Ganancia Neta / Balance: $${stats.gananciaNeta.toLocaleString('es-ES', { minimumFractionDigits: 2 })}*\n`;
    text += `• Rentabilidad: ${stats.margen.toFixed(1)}%\n\n`;

    text += `📋 *DESGLOSE POR ACTIVIDAD:*\n`;
    stats.activityAnalysis.forEach((item, idx) => {
      text += `${idx + 1}. *${item.activity.name}* (${item.activity.clubName})\n`;
      text += `   - Recaudado: $${item.ingresos.toLocaleString('es-ES')}\n`;
      text += `   - Gastado: $${item.egresos.toLocaleString('es-ES')}\n`;
      text += `   - Ganancia: $${item.ganancia.toLocaleString('es-ES')} (${item.margen.toFixed(0)}% margen)\n`;
    });

    text += `\nBendiciones a la directiva y pastores por el trabajo en los clubes de nuestra iglesia.`;
    return text;
  };

  const handleShareWhatsApp = () => {
    const msg = buildWhatsAppMessage();
    const url = generateWhatsAppLink(sharePhone || '', msg);
    window.open(url, '_blank');
    setIsShareModalOpen(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* VISTA 1: DIRECTORIO DE CLUBES Y MINISTERIOS (Cuando no se ha seleccionado un club aún) */}
      {selectedClubId === null && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header Card for Directory */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-300 dark:border-slate-700 shadow-md p-4 sm:p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 sm:pb-6 border-b-2 border-slate-200 dark:border-slate-800">
              <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                {onBackToPortal && (
                  <button
                    type="button"
                    onClick={onBackToPortal}
                    className="min-h-[40px] flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 border-2 border-slate-300 dark:border-slate-700 rounded-xl transition-all shadow-xs shrink-0"
                    title="Volver al Menú Principal"
                  >
                    <ArrowLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="hidden sm:inline">Menú Principal</span>
                  </button>
                )}

                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shrink-0">
                  <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <h1 className="text-lg sm:text-2xl font-extrabold text-slate-950 dark:text-white tracking-tight">
                      Directorio de Clubes
                    </h1>
                    <span className="text-[10px] sm:text-[11px] uppercase font-black text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-800">
                      Finanzas por Club
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium mt-1">
                    Toca cualquier club para abrir su panel financiero, actividades, ingresos y egresos.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-2.5 w-full md:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedClubId('all')}
                  className="min-h-[44px] px-3 sm:px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-900 dark:text-slate-100 font-extrabold text-xs border-2 border-slate-300 dark:border-slate-700 transition-all flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <BarChart2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Consolidado</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsNewClubModalOpen(true)}
                  className="min-h-[44px] px-3 sm:px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>+ Nuevo Club</span>
                </button>
              </div>
            </div>

            {/* Quick summary stats across all clubs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-6 text-center">
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700">
                <span className="block text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
                  {clubs.length}
                </span>
                <span className="text-[11px] text-slate-700 dark:text-slate-300 font-extrabold uppercase">
                  Clubes Activos
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700">
                <span className="block text-2xl font-extrabold text-blue-700 dark:text-blue-400 font-mono">
                  {activities.length}
                </span>
                <span className="text-[11px] text-slate-700 dark:text-slate-300 font-extrabold uppercase">
                  Actividades
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700">
                <span className="block text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">
                  ${stats.totalIngresos.toLocaleString('es-ES', { minimumFractionDigits: 0 })}
                </span>
                <span className="text-[11px] text-slate-700 dark:text-slate-300 font-extrabold uppercase">
                  Total Recaudado
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700">
                <span className={`block text-2xl font-extrabold font-mono ${
                  stats.gananciaNeta >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  ${stats.gananciaNeta.toLocaleString('es-ES', { minimumFractionDigits: 0 })}
                </span>
                <span className="text-[11px] text-slate-700 dark:text-slate-300 font-extrabold uppercase">
                  Balance Total
                </span>
              </div>
            </div>
          </div>

          {/* Grid of Club Rectangular Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clubsStats.map(({ club: c, activitiesCount, shirtsCount, enrollmentsCount, ingresos, egresos, ganancia }) => (
              <div
                key={c.id}
                onClick={() => {
                  setSelectedClubId(c.id);
                  setNewActClubId(c.id);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedClubId(c.id);
                    setNewActClubId(c.id);
                  }
                }}
                className="group relative bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-300 dark:border-slate-700 hover:border-emerald-600 dark:hover:border-emerald-500 p-6 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col justify-between text-left overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-2 bg-emerald-600 group-hover:h-2.5 transition-all" />

                <div>
                  <div className="flex items-start justify-between gap-2 mb-3 pt-1">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center font-extrabold text-base shrink-0 group-hover:scale-105 transition-transform">
                      <Building2 className="w-6 h-6" />
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditClub(c);
                        }}
                        className="p-1.5 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
                        title="Editar directiva, director o período del club"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setClubToDelete(c);
                        }}
                        className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
                        title="Eliminar este club"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-lg font-extrabold text-slate-950 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {c.name}
                  </h3>

                  {/* Director & Período badges */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-300 dark:border-slate-700">
                      <User className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span>{c.director ? `Dir: ${c.director}` : 'Sin Director'}</span>
                    </span>

                    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-extrabold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-300 dark:border-slate-700">
                      <Calendar className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      <span>{c.period || '2026'}</span>
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-2 leading-relaxed">
                    {c.description || 'Club / Ministerio eclesiástico'}
                  </p>

                  {/* Summary counts pills */}
                  <div className="flex items-center gap-2 mt-3 text-[11px] font-extrabold text-slate-600 dark:text-slate-400">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      {activitiesCount} {activitiesCount === 1 ? 'actividad' : 'actividades'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                      <Shirt className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      {shirtsCount}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                      <GraduationCap className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      {enrollmentsCount}
                    </span>
                  </div>

                  {/* Financial mini-dashboard */}
                  <div className="mt-3.5 pt-3 border-t-2 border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 block">
                        Ingresos
                      </span>
                      <span className="font-extrabold text-emerald-700 dark:text-emerald-400 font-mono text-sm">
                        ${ingresos.toLocaleString('es-ES', { minimumFractionDigits: 0 })}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 block">
                        Egresos
                      </span>
                      <span className="font-extrabold text-rose-600 dark:text-rose-400 font-mono text-sm">
                        ${egresos.toLocaleString('es-ES', { minimumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase">
                      Ganancia Neta:
                    </span>
                    <span className={`font-mono font-extrabold text-sm ${
                      ganancia >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {ganancia >= 0 ? '+' : ''}${ganancia.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-2">
                  <div className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm group-hover:shadow-emerald-500/25 transition-all">
                    <span>Abrir Gestión del Club</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}

            {/* Consolidado Card */}
            <div
              onClick={() => setSelectedClubId('all')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedClubId('all');
                }
              }}
              className="group relative bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-600 dark:hover:border-blue-500 p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col justify-between text-left overflow-hidden"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4 pt-1">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 flex items-center justify-center font-extrabold text-base shrink-0 group-hover:scale-105 transition-transform">
                    <BarChart2 className="w-6 h-6" />
                  </div>

                  <span className="text-[11px] px-2.5 py-1 rounded-full font-extrabold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                    Consolidado
                  </span>
                </div>

                <h3 className="text-lg font-extrabold text-slate-950 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Todos los Clubes (Consolidado)
                </h3>

                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-1 leading-relaxed">
                  Visión general y tesorería de todos los clubes juntos, libro contable centralizado y balance general.
                </p>

                <div className="mt-4 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase">
                    Balance General:
                  </span>
                  <span className={`font-mono font-extrabold text-sm ${
                    stats.gananciaNeta >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {stats.gananciaNeta >= 0 ? '+' : ''}${stats.gananciaNeta.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="mt-5 pt-2">
                <div className="w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all">
                  <span>Abrir Balance Consolidado</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 2: PANEL FINANCIERO DEL CLUB ABIERTO (Cuando se seleccionó un club o 'all') */}
      {selectedClubId !== null && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Header Card for Active Club */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-300 dark:border-slate-700 shadow-md overflow-hidden">
            {/* Dark Strip */}
            <div className="px-4 sm:px-6 py-4 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setSelectedClubId(null)}
                  className="min-h-[40px] flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold text-slate-100 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl transition-all shadow-xs shrink-0"
                  title="Volver al Directorio de Clubes"
                >
                  <ArrowLeft className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="hidden xs:inline sm:inline">Clubes</span>
                </button>

                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 shadow-xs shrink-0">
                  <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-300" />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight truncate">
                      {activeClub ? activeClub.name : 'Todos los Clubes (Consolidado)'}
                    </h1>
                    <span className="text-[10px] uppercase font-black text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded-sm border border-emerald-800 shrink-0">
                      {activeClub ? 'Club Abierto' : 'Consolidado'}
                    </span>
                  </div>

                  {activeClub ? (
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1 text-xs text-slate-300">
                      <span className="inline-flex items-center gap-1 font-bold text-white bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                        <User className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate max-w-[140px] sm:max-w-none">{activeClub.director || 'Sin asignar'}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 font-bold text-white font-mono bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                        <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>{activeClub.period || '2026'}</span>
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-300 font-medium mt-0.5">
                      Balance consolidado de todos los clubes de la iglesia
                    </p>
                  )}
                </div>
              </div>

              {/* Quick Actions (Add Activity, Add Transaction, Edit Club, Delete Club, Share, PDF) */}
              <div className="flex flex-wrap items-center gap-2 no-print">
                <button
                  type="button"
                  onClick={() => handleOpenAddTx('ingreso')}
                  className="min-h-[40px] flex-1 sm:flex-none px-3.5 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors shadow-2xs flex items-center justify-center gap-1.5"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>+ Ingreso</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenAddTx('egreso')}
                  className="min-h-[40px] flex-1 sm:flex-none px-3.5 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors shadow-2xs flex items-center justify-center gap-1.5"
                >
                  <ArrowDownRight className="w-4 h-4" />
                  <span>- Egreso</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewActClubId(activeClub ? activeClub.id : (clubs[0]?.id || ''));
                    setIsNewActivityModalOpen(true);
                  }}
                  className="min-h-[40px] flex-1 sm:flex-none px-3.5 py-2 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors shadow-2xs flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Actividad</span>
                </button>

                <div className="flex items-center gap-1.5">
                  {activeClub && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenEditClub(activeClub)}
                        className="min-h-[40px] min-w-[40px] px-2.5 sm:px-3 py-2 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                        title="Editar Director, Período o Nombre de este club"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                        <span className="hidden sm:inline">Editar Club</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setClubToDelete(activeClub)}
                        className="min-h-[40px] min-w-[40px] px-2.5 sm:px-3 py-2 text-xs font-bold text-rose-300 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                        title="Eliminar este club"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span className="hidden sm:inline">Eliminar</span>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsShareModalOpen(true)}
                    className="min-h-[40px] min-w-[40px] p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors flex items-center justify-center"
                    title="Compartir balance por WhatsApp"
                  >
                    <Share2 className="w-4 h-4 text-emerald-400" />
                  </button>

                  <button
                    type="button"
                    onClick={handleExportPDF}
                    className="min-h-[40px] min-w-[40px] p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors flex items-center justify-center"
                    title="Descargar Reporte en PDF"
                  >
                    <Download className="w-4 h-4 text-blue-400" />
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="hidden sm:flex min-h-[40px] min-w-[40px] p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors items-center justify-center"
                    title="Imprimir balance"
                  >
                    <Printer className="w-4 h-4 text-slate-300" />
                  </button>
                </div>
              </div>
            </div>

            {/* Club Switcher Pills Bar */}
            <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-950/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 overflow-x-auto no-print">
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase font-black tracking-wider text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-2 py-1 rounded-md border border-slate-300 dark:border-slate-700 shrink-0 hidden sm:inline">
                  Cambiar Club:
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedClubId('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold whitespace-nowrap transition-all ${
                      selectedClubId === 'all'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-2 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Todos los Clubes ({activities.length})
                  </button>

                  {clubs.map((c) => {
                    const count = activities.filter((a) => a.clubId === c.id).length;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedClubId(c.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                          selectedClubId === c.id
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-2 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span>{c.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono font-black ${
                          selectedClubId === c.id
                            ? 'bg-emerald-700 text-white'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedClubId(null)}
                className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300 hover:underline whitespace-nowrap flex items-center gap-1 shrink-0 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800"
              >
                <span>Ver Directorio</span>
              </button>
            </div>
          </div>

      {/* 4 Financial KPI Highlight Boxes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Recaudado (Ingresos) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border-2 border-slate-300 dark:border-slate-700 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
              Total Recaudado (Ingresos)
            </span>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/80 rounded-xl text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums font-mono">
              ${stats.totalIngresos.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold block mt-1">
              Dinero recolectado de actividades y cuotas
            </span>
          </div>
        </div>

        {/* Card 2: Total Gastado (Egresos) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border-2 border-slate-300 dark:border-slate-700 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
              Total Gastado (Egresos)
            </span>
            <div className="p-2 bg-rose-100 dark:bg-rose-950/80 rounded-xl text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 tabular-nums font-mono">
              ${stats.totalEgresos.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold block mt-1">
              Insumos, transporte, uniformes y comida
            </span>
          </div>
        </div>

        {/* Card 3: Ganancia Neta (Balance / Superávit) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border-2 border-slate-300 dark:border-slate-700 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
              Ganancia Neta (Balance)
            </span>
            <div className={`p-2 rounded-xl border ${
              stats.gananciaNeta >= 0
                ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800'
                : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800'
            }`}>
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className={`text-2xl sm:text-3xl font-extrabold tabular-nums font-mono ${
              stats.gananciaNeta >= 0
                ? 'text-blue-700 dark:text-blue-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}>
              {stats.gananciaNeta >= 0 ? '+' : ''}${stats.gananciaNeta.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold block mt-1">
              Fondos limpios disponibles en caja
            </span>
          </div>
        </div>

        {/* Card 4: Margen de Rentabilidad */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border-2 border-slate-300 dark:border-slate-700 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
              Margen de Rentabilidad
            </span>
            <div className="p-2 bg-indigo-100 dark:bg-indigo-950/80 rounded-xl text-indigo-700 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-800">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-indigo-700 dark:text-indigo-400 tabular-nums font-mono">
              {stats.margen.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold block mt-1">
              Eficiencia de ganancia sobre recaudación
            </span>
          </div>
        </div>
      </div>

      {/* Sub-menu Recuadro: Análisis General vs Libro Contable (Prominent high-contrast frame) */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 shadow-md rounded-2xl p-2.5 sm:p-3 my-4 no-print">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase font-black tracking-wider text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-950 px-2.5 py-1 rounded-md border border-emerald-300 dark:border-emerald-800 shrink-0 hidden sm:inline">
              Submenú Vistas:
            </span>

            <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-300 dark:border-slate-800 overflow-x-auto w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveTab('analisis')}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-extrabold rounded-lg transition-all whitespace-nowrap ${
                  activeTab === 'analisis'
                    ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-500/30'
                    : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-300 dark:border-slate-700 shadow-2xs'
                }`}
              >
                <BarChart2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Análisis y Rentabilidad</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-black ml-1 ${
                  activeTab === 'analisis' ? 'bg-emerald-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                }`}>
                  {stats.activityAnalysis.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('movimientos')}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-extrabold rounded-lg transition-all whitespace-nowrap ${
                  activeTab === 'movimientos'
                    ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-500/30'
                    : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-300 dark:border-slate-700 shadow-2xs'
                }`}
              >
                <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Libro Contable</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-black ml-1 ${
                  activeTab === 'movimientos' ? 'bg-emerald-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                }`}>
                  {filteredTransactions.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('tshirts')}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-extrabold rounded-lg transition-all whitespace-nowrap ${
                  activeTab === 'tshirts'
                    ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-500/30'
                    : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-300 dark:border-slate-700 shadow-2xs'
                }`}
              >
                <Shirt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>T-Shirts Camporee</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-black ml-1 ${
                  activeTab === 'tshirts' ? 'bg-emerald-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                }`}>
                  {selectedClubId === 'all' 
                    ? camporeeShirts.reduce((sum, s) => sum + (s.quantity || 1), 0)
                    : camporeeShirts.filter((s) => s.clubId === selectedClubId).reduce((sum, s) => sum + (s.quantity || 1), 0)
                  }
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('matricula')}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-extrabold rounded-lg transition-all whitespace-nowrap ${
                  activeTab === 'matricula'
                    ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-500/30'
                    : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-300 dark:border-slate-700 shadow-2xs'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Matrícula</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-black ml-1 ${
                  activeTab === 'matricula' ? 'bg-emerald-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                }`}>
                  {selectedClubId === 'all' 
                    ? clubEnrollments.length
                    : clubEnrollments.filter((e) => e.clubId === selectedClubId).length
                  }
                </span>
              </button>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative w-full md:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por actividad, concepto..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>
      </div>

      {/* VIEW 1: ANÁLISIS DE ACTIVIDADES */}
      {activeTab === 'analisis' && (
        <div className="space-y-6">
          {/* Detailed Activities Table with Profit Breakdown */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Desglose de Rentabilidad por Actividad</h3>
              </div>
              <span className="text-xs text-slate-300">
                Mostrando: <strong className="text-white">{stats.activityAnalysis.length} actividades</strong>
              </span>
            </div>

            {stats.activityAnalysis.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No hay actividades creadas para este club</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Comienza creando la primera actividad de recaudación pro-fondos para registrar sus ingresos y egresos.
                </p>
                <button
                  type="button"
                  onClick={() => setIsNewActivityModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  Registrar Primera Actividad
                </button>
              </div>
            ) : (
              <>
                {/* Mobile Card List for Activities */}
                <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-800">
                  {stats.activityAnalysis.map((item) => {
                    const isProfitPositive = item.ganancia >= 0;
                    return (
                      <div key={item.activity.id} className="p-4 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="font-extrabold text-sm text-slate-900 dark:text-white block">
                              {item.activity.name}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                              {item.activity.clubName} · {formatSpanishDate(item.activity.date)}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] shrink-0 ${
                            item.margen >= 40
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : item.margen > 0
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          }`}>
                            {item.margen.toFixed(0)}%
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2 border border-slate-200 dark:border-slate-700 font-mono">
                          <div>
                            <span className="block text-[10px] text-slate-500 uppercase font-sans font-bold">Ingreso</span>
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                              ${item.ingresos.toLocaleString('es-ES', { minimumFractionDigits: 0 })}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-500 uppercase font-sans font-bold">Egreso</span>
                            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                              ${item.egresos.toLocaleString('es-ES', { minimumFractionDigits: 0 })}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-500 uppercase font-sans font-bold">Neto</span>
                            <span className={`text-xs font-extrabold ${isProfitPositive ? 'text-blue-700 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {isProfitPositive ? '+' : ''}${item.ganancia.toLocaleString('es-ES', { minimumFractionDigits: 0 })}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 no-print">
                          <button
                            type="button"
                            onClick={() => handleOpenAddTx('ingreso', item.activity.id)}
                            className="flex-1 min-h-[38px] rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center justify-center gap-1"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>+ Ingreso</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenAddTx('egreso', item.activity.id)}
                            className="flex-1 min-h-[38px] rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold flex items-center justify-center gap-1"
                          >
                            <ArrowDownRight className="w-3.5 h-3.5" />
                            <span>- Egreso</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`¿Deseas eliminar la actividad "${item.activity.name}"?`)) {
                                onDeleteActivity(item.activity.id);
                              }
                            }}
                            className="min-w-[38px] min-h-[38px] rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 flex items-center justify-center"
                            title="Eliminar actividad"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-5 py-3.5">Nombre de la Actividad</th>
                      <th className="px-4 py-3.5">Club Responsable</th>
                      <th className="px-4 py-3.5">Fecha</th>
                      <th className="px-4 py-3.5 text-right text-emerald-700 dark:text-emerald-400">Recaudado (Ingreso)</th>
                      <th className="px-4 py-3.5 text-right text-rose-600 dark:text-rose-400">Gastado (Egreso)</th>
                      <th className="px-4 py-3.5 text-right">Ganancia Neta</th>
                      <th className="px-4 py-3.5 text-center">Margen</th>
                      <th className="px-4 py-3.5 text-right no-print">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {stats.activityAnalysis.map((item) => {
                      const isProfitPositive = item.ganancia >= 0;
                      return (
                        <tr key={item.activity.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-5 py-3.5">
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white block text-sm">
                                {item.activity.name}
                              </span>
                              {item.activity.description && (
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate max-w-xs">
                                  {item.activity.description}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300 font-medium">
                            <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                              {item.activity.clubName}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400 font-mono">
                            {formatSpanishDate(item.activity.date)}
                          </td>

                          <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                            ${item.ingresos.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                          </td>

                          <td className="px-4 py-3.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                            ${item.egresos.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                          </td>

                          <td className="px-4 py-3.5 text-right font-mono font-extrabold tabular-nums">
                            <span className={isProfitPositive ? 'text-blue-700 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}>
                              {isProfitPositive ? '+' : ''}${item.ganancia.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-[11px] ${
                              item.margen >= 40
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : item.margen > 0
                                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            }`}>
                              {item.margen.toFixed(0)}%
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-right no-print">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenAddTx('ingreso', item.activity.id)}
                                className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-lg transition-colors"
                                title="Añadir ingreso a esta actividad"
                              >
                                <ArrowUpRight className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenAddTx('egreso', item.activity.id)}
                                className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors"
                                title="Añadir gasto a esta actividad"
                              >
                                <ArrowDownRight className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`¿Deseas eliminar la actividad "${item.activity.name}"?`)) {
                                    onDeleteActivity(item.activity.id);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors"
                                title="Eliminar actividad"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-950/80 font-bold border-t-2 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                    <tr>
                      <td colSpan={3} className="px-5 py-3 text-right uppercase text-[11px] tracking-wider text-slate-500 dark:text-slate-400">
                        Total Consolidado General:
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-700 dark:text-emerald-400 tabular-nums">
                        ${stats.totalIngresos.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-rose-600 dark:text-rose-400 tabular-nums">
                        ${stats.totalEgresos.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-blue-700 dark:text-blue-400 text-sm tabular-nums">
                        ${stats.gananciaNeta.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-center text-indigo-700 dark:text-indigo-400">
                        {stats.margen.toFixed(1)}%
                      </td>
                      <td className="no-print"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: LIBRO CONTABLE DETALLADO DE MOVIMIENTOS */}
      {activeTab === 'movimientos' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          {/* Header & Sub-filters */}
          <div className="px-6 py-4 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">Libro de Entradas y Salidas de Fondos</h3>
            </div>

            <div className="flex flex-wrap items-center gap-2 no-print">
              {/* Type Filter */}
              <div className="flex items-center bg-slate-800 p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setTypeFilter('all')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                    typeFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('ingreso')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                    typeFilter === 'ingreso' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Ingresos
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('egreso')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                    typeFilter === 'egreso' ? 'bg-rose-600 text-white' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Egresos
                </button>
              </div>

              {/* Activity Filter */}
              <select
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value)}
                className="py-1 px-2.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white"
              >
                <option value="all">Todas las actividades</option>
                {activities.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Transactions Table */}
          {filteredTransactions.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No hay movimientos registrados para este filtro</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Usa los botones superiores para registrar los primeros ingresos o gastos de tus actividades.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card List for Ledger Transactions */}
              <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-800">
                {filteredTransactions.map((tx) => (
                  <div key={tx.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-0.5 text-[11px] px-2 py-0.5 rounded-md font-bold border ${
                            tx.type === 'ingreso'
                              ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800'
                              : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800'
                          }`}>
                            {tx.type === 'ingreso' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {tx.type === 'ingreso' ? 'Ingreso' : 'Egreso'}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">{formatSpanishDate(tx.date)}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                          {tx.description}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {tx.activityName} · {tx.clubName}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`font-mono font-extrabold text-sm block ${
                          tx.type === 'ingreso' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {tx.type === 'ingreso' ? '+' : '-'}${Number(tx.amount).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`¿Deseas eliminar el movimiento "${tx.description}"?`)) {
                              onDeleteTransaction(tx.id);
                            }
                          }}
                          className="mt-1 inline-flex items-center gap-1 text-[11px] text-rose-500 font-semibold px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 no-print"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Borrar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-5 py-3">Fecha</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Actividad / Club</th>
                    <th className="px-4 py-3">Concepto / Detalle</th>
                    <th className="px-4 py-3">Categoría</th>
                    <th className="px-4 py-3">Responsable</th>
                    <th className="px-4 py-3 text-right">Monto</th>
                    <th className="px-4 py-3 text-right no-print">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {formatSpanishDate(tx.date)}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {tx.type === 'ingreso' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-md font-bold">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            Ingreso
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-md font-bold">
                            <ArrowDownRight className="w-3.5 h-3.5" />
                            Egreso
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-900 dark:text-white block">{tx.activityName}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">{tx.clubName}</span>
                      </td>

                      <td className="px-4 py-3 text-slate-800 dark:text-slate-200 font-medium max-w-xs">
                        <div>{tx.description}</div>
                        {tx.receiptNumber && (
                          <span className="text-[10px] text-slate-500 font-mono">Recibo: {tx.receiptNumber}</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px]">
                          {tx.category}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {tx.responsiblePerson || '—'}
                      </td>

                      <td className="px-4 py-3 text-right font-mono font-bold text-sm tabular-nums whitespace-nowrap">
                        <span className={tx.type === 'ingreso' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                          {tx.type === 'ingreso' ? '+' : '-'}${Number(tx.amount).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right no-print">
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`¿Deseas eliminar el movimiento "${tx.description}"?`)) {
                              onDeleteTransaction(tx.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md transition-colors"
                          title="Eliminar movimiento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      )}

      {/* VIEW 3: T-SHIRTS DE CAMPOREE */}
      {activeTab === 'tshirts' && (
        <CamporeeShirtSection
          shirts={camporeeShirts}
          clubs={clubs}
          selectedClubId={selectedClubId}
          activeClubName={activeClub?.name}
          onAddShirt={onAddCamporeeShirt}
          onUpdateShirt={onUpdateCamporeeShirt}
          onDeleteShirt={onDeleteCamporeeShirt}
        />
      )}

      {/* VIEW 4: MATRÍCULAS Y MEMBRESÍA */}
      {activeTab === 'matricula' && (
        <ClubEnrollmentSection
          enrollments={clubEnrollments}
          clubs={clubs}
          selectedClubId={selectedClubId}
          activeClubName={activeClub?.name}
          onAddEnrollment={onAddClubEnrollment}
          onUpdateEnrollment={onUpdateClubEnrollment}
          onDeleteEnrollment={onDeleteClubEnrollment}
        />
      )}
      </div>
      )}

      {/* MODAL 1: REGISTRAR NUEVA ACTIVIDAD */}
      {isNewActivityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold">Registrar Nueva Actividad de Club</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewActivityModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveActivity} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Club Perteneciente
                </label>
                <select
                  value={newActClubId || clubs[0]?.id}
                  onChange={(e) => setNewActClubId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                >
                  {clubs.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Nombre de la Actividad *
                </label>
                <input
                  type="text"
                  required
                  value={newActName}
                  onChange={(e) => setNewActName(e.target.value)}
                  placeholder="Ej. Kermesse de Alimentos pro-uniformes, Lavado de autos..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Fecha de la Actividad
                  </label>
                  <input
                    type="date"
                    required
                    value={newActDate}
                    onChange={(e) => setNewActDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Meta de Recaudación ($)
                  </label>
                  <input
                    type="number"
                    value={newActBudget}
                    onChange={(e) => setNewActBudget(e.target.value)}
                    placeholder="Ej. 25000"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Descripción o Propósito de los Fondos
                </label>
                <textarea
                  rows={2}
                  value={newActDesc}
                  onChange={(e) => setNewActDesc(e.target.value)}
                  placeholder="Detalla en qué se utilizará la ganancia de esta actividad..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewActivityModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
                >
                  Guardar Actividad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTRAR INGRESO / EGRESO */}
      {isNewTxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className={`px-6 py-4 text-white flex items-center justify-between border-b ${
              txType === 'ingreso' ? 'bg-emerald-800 border-emerald-900' : 'bg-rose-800 border-rose-900'
            }`}>
              <div className="flex items-center gap-2">
                {txType === 'ingreso' ? <ArrowUpRight className="w-5 h-5 text-emerald-200" /> : <ArrowDownRight className="w-5 h-5 text-rose-200" />}
                <h3 className="text-sm font-bold">
                  {txType === 'ingreso' ? 'Registrar Ingreso (Dinero Recaudado)' : 'Registrar Egreso (Dinero Gastado)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewTxModalOpen(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="p-6 space-y-4">
              {/* Type selector toggle */}
              <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                <button
                  type="button"
                  onClick={() => setTxType('ingreso')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                    txType === 'ingreso'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Ingreso / Recaudación</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('egreso')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                    txType === 'egreso'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  <span>Egreso / Gasto</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Actividad Vinculada *
                </label>
                <select
                  required
                  value={txActivityId}
                  onChange={(e) => setTxActivityId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                >
                  {activities.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.clubName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Monto en Dinero ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Fecha del Movimiento
                  </label>
                  <input
                    type="date"
                    required
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Concepto / Detalle del {txType === 'ingreso' ? 'Ingreso' : 'Gasto'} *
                </label>
                <input
                  type="text"
                  required
                  value={txDescription}
                  onChange={(e) => setTxDescription(e.target.value)}
                  placeholder={txType === 'ingreso' ? 'Ej. Venta de 40 platos de comida' : 'Ej. Compra de desechables, verduras y carne'}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Categoría
                  </label>
                  <input
                    type="text"
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value)}
                    placeholder={txType === 'ingreso' ? 'Venta, Cuotas, Donación' : 'Insumos, Transporte, Comida'}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Método de Pago
                  </label>
                  <select
                    value={txPaymentMethod}
                    onChange={(e) => setTxPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="efectivo">Efectivo en Caja</option>
                    <option value="transferencia">Transferencia Bancaria</option>
                    <option value="tarjeta">Tarjeta / POS</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Responsable / Entregado por
                  </label>
                  <input
                    type="text"
                    value={txResponsible}
                    onChange={(e) => setTxResponsible(e.target.value)}
                    placeholder="Nombre del hermano/a"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    No. Recibo / Comprobante
                  </label>
                  <input
                    type="text"
                    value={txReceipt}
                    onChange={(e) => setTxReceipt(e.target.value)}
                    placeholder="Ej. REC-004 o FAC-12"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewTxModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs ${
                    txType === 'ingreso' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Guardar {txType === 'ingreso' ? 'Ingreso' : 'Egreso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CREAR NUEVO CLUB */}
      {isNewClubModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold">Añadir Nuevo Club o Ministerio</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewClubModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClub} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Nombre del Club *
                </label>
                <input
                  type="text"
                  required
                  value={newClubName}
                  onChange={(e) => setNewClubName(e.target.value)}
                  placeholder="Ej. Club de Varones, Ministerio Musical, etc."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Director(a) / Líder
                  </label>
                  <input
                    type="text"
                    value={newClubDirector}
                    onChange={(e) => setNewClubDirector(e.target.value)}
                    placeholder="Ej. Carlos Méndez"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Año / Período
                  </label>
                  <input
                    type="text"
                    value={newClubPeriod}
                    onChange={(e) => setNewClubPeriod(e.target.value)}
                    placeholder="Ej. 2026"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Descripción o Edades
                </label>
                <input
                  type="text"
                  value={newClubDesc}
                  onChange={(e) => setNewClubDesc(e.target.value)}
                  placeholder="Ej. Adultos y caballeros de la congregación"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewClubModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
                >
                  Crear Club
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3B: EDITAR CLUB (DIRECTOR, AÑO, NOMBRE) */}
      {clubToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-slate-300 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-extrabold">Editar Datos del Club</h3>
              </div>
              <button
                type="button"
                onClick={() => setClubToEdit(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditClub} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                  Nombre del Club *
                </label>
                <input
                  type="text"
                  required
                  value={editClubName}
                  onChange={(e) => setEditClubName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                    Director(a) / Líder
                  </label>
                  <input
                    type="text"
                    value={editClubDirector}
                    onChange={(e) => setEditClubDirector(e.target.value)}
                    placeholder="Ej. Carlos Méndez"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                    Año / Período
                  </label>
                  <input
                    type="text"
                    value={editClubPeriod}
                    onChange={(e) => setEditClubPeriod(e.target.value)}
                    placeholder="Ej. 2026"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                  Descripción o Edades
                </label>
                <input
                  type="text"
                  value={editClubDesc}
                  onChange={(e) => setEditClubDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setClubToEdit(null)}
                  className="px-4 py-2 text-xs font-extrabold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3C: CONFIRMAR ELIMINAR CLUB */}
      {clubToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-rose-300 dark:border-rose-900/60 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-200" />
                <h3 className="text-sm font-extrabold text-white">¿Eliminar este Club?</h3>
              </div>
              <button
                type="button"
                onClick={() => setClubToDelete(null)}
                className="text-rose-100 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl">
                <p className="text-xs font-bold text-rose-900 dark:text-rose-200 leading-relaxed">
                  Estás a punto de eliminar el club:
                </p>
                <p className="text-sm font-black text-rose-950 dark:text-white mt-1">
                  "{clubToDelete.name}"
                </p>
                {clubToDelete.director && (
                  <p className="text-xs text-rose-800 dark:text-rose-300 mt-1">
                    Director: {clubToDelete.director} ({clubToDelete.period || '2026'})
                  </p>
                )}
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Esta acción borrará el club de la lista general, junto con sus actividades de recaudación, movimientos contables, registros de t-shirts y matrículas asociadas a él.
              </p>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setClubToDelete(null)}
                  className="px-4 py-2 text-xs font-extrabold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteClub}
                  className="px-5 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Sí, Eliminar Club</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: COMPARTIR BALANCE POR WHATSAPP */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 bg-emerald-700 dark:bg-emerald-800 text-white flex items-center justify-between border-b border-emerald-800">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-emerald-200" />
                <h3 className="text-sm font-bold">Enviar Reporte Financiero por WhatsApp</h3>
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
                  Número de WhatsApp del Destinatario (Pastor, Tesorero o Líder)
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
                  Vista Previa del Mensaje a Enviar:
                </label>
                <div className="p-3 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-[11px] text-slate-800 dark:text-slate-200 whitespace-pre-wrap max-h-56 overflow-y-auto">
                  {buildWhatsAppMessage()}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(buildWhatsAppMessage());
                    alert('¡Texto copiado al portapapeles!');
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
                    onClick={handleShareWhatsApp}
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
