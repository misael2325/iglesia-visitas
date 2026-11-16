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
  | 'directiva_clubes'
  | 'directiva_jovenes'
  | 'admin' 
  | 'recepcion' 
  | 'lider';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  roles?: UserRole[]; // Múltiples perfiles / roles asignados al usuario
  createdAt: string;
  lastLogin?: string;
}

// Module Navigation
export type AppModule = 'portal' | 'visitas' | 'clubes' | 'fotos' | 'personaje_biblico' | 'jovenes_games';

// Biblical Character Contest Registration (Imita tu Personaje Bíblico - 28 Noviembre 2026)
export const CHURCH_OPTIONS = [
  'Semana Santa',
  'Central Yaguate',
  'Maná de Yaguate',
] as const;

export type ChurchOption = (typeof CHURCH_OPTIONS)[number];

export type CharacterAgeCategory = 'ninos' | 'adultos' | 'sin_clasificar';

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
  // Evaluación en tiempo real del concurso
  puntajeCaracterizacion?: number; // 0 - 30
  puntajeActuacion?: number; // 0 - 30
  puntajeFidelidad?: number; // 0 - 40
  puntajeTotal?: number; // 0 - 100
  participo?: boolean;
  calificadoPor?: string;
  calificadoAt?: string;
}

export function parseNumericAge(edad?: string): number | null {
  if (!edad) return null;
  const match = String(edad).match(/\d+/);
  if (!match) return null;
  const num = parseInt(match[0], 10);
  if (!Number.isFinite(num) || num < 0 || num > 120) return null;
  return num;
}

export function classifyCharacterByAge(edad?: string): CharacterAgeCategory {
  const num = parseNumericAge(edad);
  if (num !== null) {
    return num >= 18 ? 'adultos' : 'ninos';
  }
  const lower = (edad || '').toLowerCase().trim();
  if (!lower) return 'sin_clasificar';
  if (
    lower.includes('niñ') ||
    lower.includes('nin') ||
    lower.includes('menor') ||
    lower.includes('adolesc') ||
    lower.includes('aventur') ||
    lower.includes('conquist')
  ) {
    return 'ninos';
  }
  if (
    lower.includes('adult') ||
    lower.includes('mayor') ||
    lower.includes('joven') ||
    lower.includes('jóven') ||
    lower.includes('ja')
  ) {
    return 'adultos';
  }
  return 'sin_clasificar';
}

export function getCharacterCategoryLabel(cat: CharacterAgeCategory): string {
  switch (cat) {
    case 'ninos':
      return 'Niños';
    case 'adultos':
      return 'Adultos';
    default:
      return 'Sin edad';
  }
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

export interface AssignableRoleMeta {
  value: UserRole;
  label: string;
  shortDesc: string;
  badgeClass: string;
}

export const ASSIGNABLE_USER_ROLES: AssignableRoleMeta[] = [
  {
    value: 'secretaria',
    label: 'Secretaría',
    shortDesc: 'Asistencia y Reportes',
    badgeClass: 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-200 border-sky-300 dark:border-sky-800',
  },
  {
    value: 'directiva_clubes',
    label: 'Directiva de Clubes',
    shortDesc: 'Módulo de Clubes',
    badgeClass: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800',
  },
  {
    value: 'directiva_jovenes',
    label: 'Directiva de Jóvenes',
    shortDesc: 'Sociedad de Jóvenes Games',
    badgeClass: 'bg-fuchsia-100 dark:bg-fuchsia-950/60 text-fuchsia-800 dark:text-fuchsia-200 border-fuchsia-300 dark:border-fuchsia-800',
  },
  {
    value: 'pastor',
    label: 'Pastor',
    shortDesc: 'Supervisión Pastoral General',
    badgeClass: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-800',
  },
  {
    value: 'anciano',
    label: 'Anciano',
    shortDesc: 'Supervisión y Asistencia',
    badgeClass: 'bg-violet-100 dark:bg-violet-950/60 text-violet-800 dark:text-violet-200 border-violet-300 dark:border-violet-800',
  },
  {
    value: 'administrador',
    label: 'Administrador',
    shortDesc: 'Control Total del Sistema',
    badgeClass: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200 border-indigo-300 dark:border-indigo-800',
  },
];

// Role helper utility
export function getRoleDisplayName(role: UserRole | string): string {
  if (typeof role === 'string' && role.includes(',')) {
    const parts = role
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);
    return parts.map((r) => getRoleDisplayName(r as UserRole)).join(' · ');
  }
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
    case 'directiva_clubes':
      return 'Directiva de Clubes';
    case 'directiva_jovenes':
      return 'Directiva de Jóvenes';
    case 'recepcion':
      return 'Recepción';
    case 'lider':
      return 'Líder';
    default:
      return String(role);
  }
}

export function normalizeUserRoles(
  role?: UserRole | string | null,
  roles?: Array<UserRole | string> | null
): UserRole[] {
  const collected: UserRole[] = [];
  const pushValid = (raw?: string | null) => {
    if (!raw) return;
    for (const part of String(raw).split(',')) {
      const clean = part.trim() as UserRole;
      if (clean && !collected.includes(clean)) {
        collected.push(clean);
      }
    }
  };

  if (Array.isArray(roles) && roles.length > 0) {
    roles.forEach((r) => pushValid(r));
  }
  pushValid(role);

  return collected.length > 0 ? collected : ['secretaria'];
}

export function getUserRoles(user?: Pick<AppUser, 'role' | 'roles'> | null): UserRole[] {
  if (!user) return [];
  return normalizeUserRoles(user.role, user.roles);
}

export function normalizeAppUser(user: AppUser): AppUser {
  const roles = normalizeUserRoles(user.role, user.roles);
  return {
    ...user,
    role: roles[0],
    roles,
  };
}

export function serializeUserRoles(user: Pick<AppUser, 'role' | 'roles'>): string {
  const roles = getUserRoles(user);
  return roles.length > 0 ? roles.join(',') : 'secretaria';
}

export function getUserRolesDisplayName(user?: Pick<AppUser, 'role' | 'roles'> | null): string {
  const roles = getUserRoles(user);
  if (roles.length === 0) return '';
  return roles.map((r) => getRoleDisplayName(r)).join(' · ');
}

export function hasUserRole(
  user: Pick<AppUser, 'role' | 'roles'> | null | undefined,
  targetRole: UserRole
): boolean {
  return getUserRoles(user).includes(targetRole);
}

export function hasAnyUserRole(
  user: Pick<AppUser, 'role' | 'roles'> | null | undefined,
  targets: UserRole[]
): boolean {
  const roles = getUserRoles(user);
  return targets.some((t) => roles.includes(t));
}

export type ContentModule = Exclude<AppModule, 'portal'>;

const ALL_CONTENT_MODULES: ContentModule[] = [
  'visitas',
  'clubes',
  'fotos',
  'personaje_biblico',
  'jovenes_games',
];

const GENERAL_ACCESS_ROLES: UserRole[] = [
  'administrador',
  'admin',
  'pastor',
  'anciano',
  'secretaria',
  'recepcion',
  'lider',
];

export function getAllowedModulesForUser(
  user?: Pick<AppUser, 'role' | 'roles'> | null
): ContentModule[] {
  if (!user) return [];
  const roles = getUserRoles(user);

  // Si tiene cualquier rol de acceso general (Admin, Pastor, Anciano, Secretaría, etc.), accede a los módulos generales
  if (roles.some((r) => GENERAL_ACCESS_ROLES.includes(r))) {
    return ALL_CONTENT_MODULES;
  }

  // Si solo tiene perfiles especializados (Directiva de Clubes, Directiva de Jóvenes o ambos)
  const modules: ContentModule[] = [];
  if (roles.includes('directiva_clubes')) {
    modules.push('clubes');
  }
  if (roles.includes('directiva_jovenes')) {
    modules.push('jovenes_games');
  }

  return modules.length > 0 ? modules : ALL_CONTENT_MODULES;
}

export function canUserAccessConfig(
  user?: Pick<AppUser, 'role' | 'roles'> | null
): boolean {
  if (!user) return false;
  const roles = getUserRoles(user);
  return roles.some((r) => GENERAL_ACCESS_ROLES.includes(r));
}

export function isSecretariaRestrictedUser(
  user?: Pick<AppUser, 'role' | 'roles'> | null
): boolean {
  if (!user) return false;
  const roles = getUserRoles(user);
  const hasFullLeadership = roles.some((r) =>
    ['administrador', 'admin', 'pastor', 'anciano', 'lider', 'recepcion'].includes(r)
  );
  return roles.includes('secretaria') && !hasFullLeadership;
}

export function isSecretariaRole(role?: UserRole): boolean {
  return role === 'secretaria';
}

export function isDirectivaClubesRole(role?: UserRole): boolean {
  return role === 'directiva_clubes';
}

export function isDirectivaJovenesRole(role?: UserRole): boolean {
  return role === 'directiva_jovenes';
}

export function isAdminRole(role?: UserRole): boolean {
  return role === 'administrador' || role === 'admin';
}

// ============================================================
// Sociedad de Jóvenes Games (Quizizz-style Live Multiplayer)
// ============================================================
export type YouthGameKind =
  | 'quiz_preguntas'
  | 'verdadero_falso'
  | 'adivinanza_biblica'
  | 'personalizado';

export interface YouthQuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number | null; // null cuando se importa sin respuesta marcada hasta que el usuario la elija
  timeLimitSeconds: number;
  points: number;
  explanation?: string;
}

export interface YouthGame {
  id: string;
  title: string;
  description?: string;
  kind: YouthGameKind;
  iconEmoji?: string;
  colorTheme?: 'purple' | 'indigo' | 'emerald' | 'amber' | 'rose';
  questions: YouthQuizQuestion[];
  isDefaultStarter?: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export type YouthGameSessionStatus = 'lobby' | 'playing' | 'finished';
export type YouthGamePlayMode = 'self_paced' | 'host_paced';

export interface YouthGameSession {
  id: string;
  roomCode: string;
  gameId: string;
  gameTitle: string;
  gameKind: YouthGameKind;
  status: YouthGameSessionStatus;
  playMode: YouthGamePlayMode;
  currentQuestionIndex: number;
  questionStartedAt?: string;
  questions: YouthQuizQuestion[];
  hostName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface YouthGameAnswerRecord {
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
  pointsAwarded: number;
  responseMs: number;
  answeredAt: string;
}

export interface YouthGamePlayer {
  id: string;
  sessionId: string;
  name: string;
  avatarEmoji: string;
  score: number;
  streak: number;
  bestStreak: number;
  correctCount: number;
  answeredCount: number;
  currentQuestionIndex: number;
  finished: boolean;
  answers: Record<string, YouthGameAnswerRecord>;
  joinedAt: string;
  updatedAt: string;
}
