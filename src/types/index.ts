export type AttendeeType = 'visitante' | 'recurrente' | 'miembro';

export interface Attendee {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  zone: string;
  type: AttendeeType;
  registeredDate: string; // YYYY-MM-DD
  notes?: string;
  prayerRequest?: string;
  // Map of YYYY-MM-DD -> boolean
  attendance: Record<string, boolean>;
}

export type EventCategory = 'conferencia' | 'culto' | 'jovenes' | 'oracion' | 'mujeres' | 'varones' | 'ninos' | 'taller' | 'otro';

export interface ChurchEvent {
  id: string;
  title: string;
  category: EventCategory;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  location: string;
  description: string;
  speaker?: string;
  // Specific attendee IDs recorded for this event
  attendees: string[];
}

export interface DayInfo {
  label: string; // 'L', 'M', 'Mi', 'J', 'V', 'S', 'D'
  fullName: string; // 'Lunes', 'Martes', etc.
  dateString: string; // 'YYYY-MM-DD'
  isToday: boolean;
}

export interface WeeklyStats {
  weekLabel: string;
  weekStart: string;
  weekEnd: string;
  totalAttendees: number;
  newVisitors: number;
  members: number;
  growthPercentage: number;
}

export type UserRole = 
  | 'administrador' 
  | 'pastor' 
  | 'anciano' 
  | 'secretaria' 
  | 'admin' 
  | 'recepcion' 
  | 'lider';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt: string;
  lastLogin?: string;
}

// Module Navigation
export type AppModule = 'portal' | 'visitas' | 'clubes' | 'fotos' | 'personaje_biblico';

// Biblical Character Contest Registration (Imita tu Personaje Bíblico - 28 Noviembre 2026)
export const CHURCH_OPTIONS = [
  'Semana Santa',
  'Central Yaguate',
  'Maná de Yaguate',
] as const;

export type ChurchOption = (typeof CHURCH_OPTIONS)[number];

export interface BiblicalCharacterRegistration {
  id: string;
  nombre: string;
  edad?: string;
  contacto: string;
  iglesia?: string; // Semana Santa, Central Yaguate, Maná de Yaguate
  personaje: string;
  audio: 'Sí' | 'No' | string;
  escena?: string;
  utileria?: string;
  ensenanza?: string;
  fecha: string; // ISO string
  aprobado?: boolean;
  notasOrganizador?: string;
}

export interface ContestCustomConfig {
  headerBannerUrl?: string; // Foto de portada horizontal arriba
  thankYouFlyerUrl?: string; // Foto vertical del flyer dando gracias al final
  primaryColor?: string; // Color personalizado de acento según el flyer (ej: #8a5a2b)
  title?: string;
  subtitle?: string;
  eventDate?: string;
  thankYouMessage?: string;
}

// Church Photos & Gallery
export interface ChurchPhoto {
  id: string;
  title: string;
  album: string; // 'Culto de Adoración', 'Sociedad de Jóvenes', 'Conquistadores y Aventureros', 'Bautismos', 'Campamentos', 'Ministerio Infantil', 'General', or custom
  date: string; // YYYY-MM-DD
  imageUrl: string; // Data URL or remote URL
  thumbnailUrl?: string;
  uploadedBy?: string;
  uploadedAt: string; // ISO string
  description?: string;
  tags?: string[];
  sizeBytes?: number;
}

export interface PhotoAlbum {
  id: string;
  name: string;
  description?: string;
  color?: string;
  coverPhotoUrl?: string;
  createdAt: string;
}

// Club & Financial Types
export interface Club {
  id: string;
  name: string;
  description?: string;
  color?: string;
  director?: string; // Nombre del Director o Directora
  period?: string;   // Año o período eclesiástico (ej: 2026, 2026-2027)
}

export interface CamporeeShirtPayment {
  id: string;
  clubId: string;
  clubName: string;
  personName: string; // Nombre de la persona o miembro
  size: string; // Talla: 4, 6, 8, 10, 12, 14, 16, XS, S, M, L, XL, 2XL, 3XL
  quantity: number;
  totalPrice: number; // Costo total a pagar
  amountPaid: number; // Dinero entregado / abonado
  isPaid: boolean; // Estado pagado o botón toggle
  paymentDate: string; // YYYY-MM-DD
  phone?: string;
  notes?: string;
  createdAt: string;
}

export interface ClubEnrollment {
  id: string;
  clubId: string;
  clubName: string;
  memberName: string; // Nombre del conquistador/miembro
  period: string; // Año / Período (ej: 2026)
  category?: string; // Conquistador, Aventurero, Guía Mayor, Directiva, etc.
  tutorName?: string; // Nombre de padre / tutor
  phone?: string;
  feeAmount: number; // Monto total de matrícula
  amountPaid: number; // Dinero entregado / abonado
  isPaid: boolean; // Botón o estado de pagado
  enrollmentDate: string; // Fecha de matrícula
  receiptNumber?: string; // Comprobante o recibo
  medicalNotes?: string; // Observaciones médicas o generales
  createdAt: string;
}

export type TransactionType = 'ingreso' | 'egreso';

export interface ClubActivity {
  id: string;
  clubId: string;
  clubName: string;
  name: string;
  date: string; // YYYY-MM-DD
  description?: string;
  targetBudget?: number; // Presupuesto o meta monetaria
  status?: 'completada' | 'en_progreso' | 'planificada';
  createdAt: string;
}

export interface ClubTransaction {
  id: string;
  activityId: string;
  activityName: string;
  clubId: string;
  clubName: string;
  type: TransactionType; // 'ingreso' | 'egreso'
  category: string; // 'Venta de comida', 'Donación', 'Cuota', 'Insumos', 'Transporte', etc.
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  paymentMethod?: 'efectivo' | 'transferencia' | 'tarjeta' | 'otro';
  responsiblePerson?: string;
  receiptNumber?: string;
  createdAt: string;
}

// Role helper utility
export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case 'administrador':
    case 'admin':
      return 'Administrador';
    case 'pastor':
      return 'Pastor';
    case 'anciano':
      return 'Anciano';
    case 'secretaria':
      return 'Secretaría';
    case 'recepcion':
      return 'Recepción';
    case 'lider':
      return 'Líder';
    default:
      return role;
  }
}

export function isSecretariaRole(role?: UserRole): boolean {
  return role === 'secretaria';
}

export function isAdminRole(role?: UserRole): boolean {
  return role === 'administrador' || role === 'admin';
}
