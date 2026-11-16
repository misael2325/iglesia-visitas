import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  Attendee, 
  ChurchEvent, 
  AppUser, 
  Club, 
  ClubActivity, 
  ClubTransaction,
  ChurchPhoto,
  PhotoAlbum,
  CamporeeShirtPayment,
  ClubEnrollment,
  BiblicalCharacterRegistration,
  ContestCustomConfig,
  YouthGame,
  YouthGameSession,
  YouthGamePlayer,
  normalizeAppUser,
  normalizeUserRoles,
  serializeUserRoles
} from '../types';

export const DEFAULT_SUPABASE_PROJECT_ID = 'ewwtdeypwetvpjjbbgdi';
export const DEFAULT_SUPABASE_URL = `https://${DEFAULT_SUPABASE_PROJECT_ID}.supabase.co`;
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_GnoiDE0dtUks_INAuHKfcg_ZdVDw5rG';
export const PERMANENT_SYNC_CODE = 'ECLESIA-EWWTDEYPWETVPJJBBGDI';

const STORAGE_KEY_URL = 'eclesia_supabase_url';
const STORAGE_KEY_ANON_KEY = 'eclesia_supabase_anon_key';
const STORAGE_KEY_AUTO_SYNC = 'eclesia_supabase_auto_sync';
const STORAGE_KEY_DELETED_IDS = 'eclesia_deleted_ids_v2';
const DELETED_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_DELETED_TOMBSTONES = 500;

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  autoSync: boolean;
}

export interface ChurchDataPayload {
  version: number;
  exportedAt: string;
  attendees: Attendee[];
  events: ChurchEvent[];
  zones: string[];
  users?: AppUser[];
  clubs?: Club[];
  clubActivities?: ClubActivity[];
  clubTransactions?: ClubTransaction[];
  photos?: ChurchPhoto[];
  photoAlbums?: PhotoAlbum[];
  camporeeShirts?: CamporeeShirtPayment[];
  clubEnrollments?: ClubEnrollment[];
  biblicalCharacters?: BiblicalCharacterRegistration[];
  contestConfig?: ContestCustomConfig;
  youthGames?: YouthGame[];
  deletedIds?: Record<string, number>;
}

export function mergeDeletedIds(
  ...maps: Array<Record<string, number> | undefined | null>
): Record<string, number> {
  const cutoff = Date.now() - DELETED_TTL_MS;
  const combined = new Map<string, number>();

  for (const m of maps) {
    if (!m || typeof m !== 'object') continue;
    for (const [id, ts] of Object.entries(m)) {
      if (typeof ts === 'number' && Number.isFinite(ts) && ts > cutoff) {
        const prev = combined.get(id) || 0;
        if (ts > prev) combined.set(id, ts);
      }
    }
  }

  // Keep most recent tombstones up to MAX_DELETED_TOMBSTONES
  const entries = Array.from(combined.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_DELETED_TOMBSTONES);

  const result: Record<string, number> = {};
  for (const [id, ts] of entries) {
    result[id] = ts;
  }
  return result;
}

export function getLocalDeletedIds(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DELETED_IDS);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return mergeDeletedIds(parsed);
  } catch {
    return {};
  }
}

export function saveLocalDeletedIds(map: Record<string, number>): Record<string, number> {
  const cleaned = mergeDeletedIds(map);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_DELETED_IDS, JSON.stringify(cleaned));
    } catch {}
  }
  return cleaned;
}

export function recordLocalDeletedIds(ids: string[]): Record<string, number> {
  const current = getLocalDeletedIds();
  const now = Date.now();
  for (const id of ids) {
    if (id) current[id] = now;
  }
  return saveLocalDeletedIds(current);
}

function stripDeletedFromPayload(
  payload: ChurchDataPayload,
  deletedMap: Record<string, number>
): ChurchDataPayload {
  const keep = <T extends { id?: string }>(arr?: T[]): T[] | undefined =>
    Array.isArray(arr) ? arr.filter((item) => item && (!item.id || !deletedMap[item.id])) : arr;

  return {
    ...payload,
    attendees: keep(payload.attendees) || [],
    events: keep(payload.events) || [],
    users: keep(payload.users),
    clubs: keep(payload.clubs),
    clubActivities: keep(payload.clubActivities),
    clubTransactions: keep(payload.clubTransactions),
    photos: keep(payload.photos),
    camporeeShirts: keep(payload.camporeeShirts),
    clubEnrollments: keep(payload.clubEnrollments),
    biblicalCharacters: keep(payload.biblicalCharacters),
    youthGames: keep(payload.youthGames),
    deletedIds: deletedMap,
  };
}

export interface TableStatus {
  name: string;
  label: string;
  submenu: string;
  exists: boolean;
  count: number | null;
  error?: string;
}

export function normalizeSupabaseUrl(rawUrl?: string | null): string {
  if (!rawUrl || !rawUrl.trim()) return DEFAULT_SUPABASE_URL;
  let url = rawUrl.trim();

  // If user pasted dashboard link: https://supabase.com/dashboard/project/ewwtdeypwetvpjjbbgdi
  const dashboardMatch = url.match(/project\/([a-z0-9_-]+)/i);
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  // If user pasted bare project ID
  if (/^[a-z0-9]{20}$/i.test(url)) {
    return `https://${url}.supabase.co`;
  }

  // Remove trailing /rest/v1 or /rest/v1/
  url = url.replace(/\/rest\/v\d+\/?$/i, '');
  url = url.replace(/\/+$/, '');

  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  return url;
}

/**
 * Automatically link Supabase database when a guest opens a shared link with dbsync or db_url/db_key.
 * Works on any device without the guest needing to configure anything.
 */
export function autoLinkSupabaseFromUrl(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    const dbsync = params.get('dbsync');
    const dbUrl = params.get('db_url');
    const dbKey = params.get('db_key');

    let targetUrl = '';
    let targetKey = '';

    if (dbsync) {
      try {
        let base64 = dbsync.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) {
          base64 += '=';
        }
        const json = decodeURIComponent(escape(atob(base64)));
        const parsed = JSON.parse(json);
        if (parsed && parsed.u && parsed.k) {
          targetUrl = parsed.u;
          targetKey = parsed.k;
        }
      } catch (err) {
        console.warn('Error decodificando dbsync token:', err);
      }
    } else if (dbUrl && dbKey) {
      targetUrl = dbUrl;
      targetKey = dbKey;
    }

    if (targetUrl && targetKey) {
      const cleanUrl = normalizeSupabaseUrl(targetUrl);
      localStorage.setItem(STORAGE_KEY_URL, cleanUrl);
      localStorage.setItem(STORAGE_KEY_ANON_KEY, targetKey.trim());
      localStorage.setItem(STORAGE_KEY_AUTO_SYNC, 'true');
      cachedClient = null;
      lastClientKey = '';
      return true;
    }
  } catch (err) {
    console.warn('autoLinkSupabaseFromUrl warning:', err);
  }
  return false;
}

/**
 * Build the self-linking public registration link that embeds the active Supabase credentials.
 * When anyone opens this link on WhatsApp or mobile, their device automatically binds to this database.
 */
export function createPublicRegistrationShareUrl(origin?: string): string {
  if (typeof window === 'undefined') return '';
  const currentOrigin = origin || window.location.origin;
  const url = new URL(currentOrigin + window.location.pathname);
  url.searchParams.set('view', 'personaje_biblico');

  const config = getSupabaseConfig();
  if (config.url && config.anonKey) {
    try {
      const syncObj = { u: config.url, k: config.anonKey };
      const rawJson = JSON.stringify(syncObj);
      const base64 = btoa(unescape(encodeURIComponent(rawJson)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      url.searchParams.set('dbsync', base64);
    } catch {
      url.searchParams.set('db_url', config.url);
      url.searchParams.set('db_key', config.anonKey);
    }
  }

  return url.toString();
}

/**
 * Build a self-linking URL for Sociedad de Jóvenes Games (Jugador o Pantalla de Posiciones).
 */
export function createPublicGameUrl(
  roomCode: string,
  mode: 'player' | 'screen',
  origin?: string
): string {
  if (typeof window === 'undefined') return '';
  const currentOrigin = origin || window.location.origin;
  const url = new URL(currentOrigin + window.location.pathname);
  url.searchParams.set('view', 'jovenes_games');
  url.searchParams.set('room', roomCode.trim().toUpperCase());
  url.searchParams.set('mode', mode);

  const config = getSupabaseConfig();
  if (config.url && config.anonKey) {
    try {
      const syncObj = { u: config.url, k: config.anonKey };
      const rawJson = JSON.stringify(syncObj);
      const base64 = btoa(unescape(encodeURIComponent(rawJson)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      url.searchParams.set('dbsync', base64);
    } catch {
      url.searchParams.set('db_url', config.url);
      url.searchParams.set('db_key', config.anonKey);
    }
  }

  return url.toString();
}

export function getSupabaseConfig(): SupabaseConfig {
  // Permanent, non-editable database configuration across all PCs and devices
  try {
    localStorage.setItem(STORAGE_KEY_URL, DEFAULT_SUPABASE_URL);
    localStorage.setItem(STORAGE_KEY_ANON_KEY, DEFAULT_SUPABASE_ANON_KEY);
    localStorage.setItem(STORAGE_KEY_AUTO_SYNC, 'true');
  } catch {}

  return {
    url: DEFAULT_SUPABASE_URL,
    anonKey: DEFAULT_SUPABASE_ANON_KEY,
    autoSync: true,
  };
}

export function saveSupabaseConfig(_config?: Partial<SupabaseConfig>) {
  // Permanent code is locked to prevent accidental disconnection on any PC
  try {
    localStorage.setItem(STORAGE_KEY_URL, DEFAULT_SUPABASE_URL);
    localStorage.setItem(STORAGE_KEY_ANON_KEY, DEFAULT_SUPABASE_ANON_KEY);
    localStorage.setItem(STORAGE_KEY_AUTO_SYNC, 'true');
  } catch {}
  cachedClient = null;
  lastClientKey = '';
}

let cachedClient: SupabaseClient | null = null;
let lastClientKey = '';

export const CLIENT_INSTANCE_ID =
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

let lastKnownCloudUpdatedAt: string | null = null;

export function getLastKnownCloudUpdatedAt(): string | null {
  return lastKnownCloudUpdatedAt;
}

export function setLastKnownCloudUpdatedAt(ts: string | null | undefined) {
  if (ts && (!lastKnownCloudUpdatedAt || ts > lastKnownCloudUpdatedAt)) {
    lastKnownCloudUpdatedAt = ts;
  }
}

export interface LiveSyncSignal {
  senderId: string;
  action: 'upsert' | 'delete' | 'full_sync';
  entity?: keyof ChurchDataPayload;
  deletedIds?: string[];
  record?: any;
  updatedAt: string;
}

let sharedBroadcastChannel: ReturnType<SupabaseClient['channel']> | null = null;
let isSharedBroadcastSubscribed = false;
const broadcastListeners = new Set<(signal: LiveSyncSignal) => void>();

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }

  const clientKey = `${config.url}_${config.anonKey}`;
  if (cachedClient && lastClientKey === clientKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      realtime: {
        params: {
          eventsPerSecond: 20,
        },
      },
    });
    lastClientKey = clientKey;
    sharedBroadcastChannel = null;
    isSharedBroadcastSubscribed = false;
    return cachedClient;
  } catch (error) {
    console.error('Error al inicializar cliente de Supabase:', error);
    return null;
  }
}

function ensureSharedBroadcastChannel(): ReturnType<SupabaseClient['channel']> | null {
  const client = getSupabaseClient();
  if (!client) return null;

  if (sharedBroadcastChannel) return sharedBroadcastChannel;

  const channel = client.channel('eclesia-live-sync-v1', {
    config: {
      broadcast: { self: false, ack: false },
    },
  });

  channel.on('broadcast', { event: 'sync' }, (msg) => {
    const signal = msg?.payload as LiveSyncSignal | undefined;
    if (!signal || signal.senderId === CLIENT_INSTANCE_ID) return;
    setLastKnownCloudUpdatedAt(signal.updatedAt);
    broadcastListeners.forEach((cb) => {
      try {
        cb(signal);
      } catch (err) {
        console.warn('Error in live broadcast listener:', err);
      }
    });
  });

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      isSharedBroadcastSubscribed = true;
    } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
      isSharedBroadcastSubscribed = false;
    }
  });

  sharedBroadcastChannel = channel;
  return channel;
}

export function subscribeLiveSyncBroadcast(
  listener: (signal: LiveSyncSignal) => void
): () => void {
  broadcastListeners.add(listener);
  ensureSharedBroadcastChannel();
  return () => {
    broadcastListeners.delete(listener);
  };
}

export async function broadcastSyncSignal(
  partial: Omit<LiveSyncSignal, 'senderId' | 'updatedAt'> & { updatedAt?: string }
): Promise<void> {
  try {
    const channel = ensureSharedBroadcastChannel();
    if (!channel) return;

    const signal: LiveSyncSignal = {
      senderId: CLIENT_INSTANCE_ID,
      updatedAt: partial.updatedAt || new Date().toISOString(),
      action: partial.action,
      entity: partial.entity,
      deletedIds: partial.deletedIds,
      record: partial.record,
    };

    if (isSharedBroadcastSubscribed) {
      await channel.send({
        type: 'broadcast',
        event: 'sync',
        payload: signal,
      });
    } else {
      setTimeout(() => {
        channel
          .send({
            type: 'broadcast',
            event: 'sync',
            payload: signal,
          })
          .catch(() => {});
      }, 350);
    }
  } catch {}
}

export async function fetchCloudLastUpdated(): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('church_store')
      .select('updated_at')
      .eq('id', 'main_church_data')
      .maybeSingle();
    if (!error && data?.updated_at) {
      return data.updated_at as string;
    }
  } catch {}
  return null;
}

/**
 * SQL script with relational tables for EVERY sub-menu in the database
 */
export const SUPABASE_SQL_SETUP = `-- ============================================================
-- SCRIPT COMPLETO DE BASE DE DATOS PARA ECLESIA
-- Proyecto Supabase: ewwtdeypwetvpjjbbgdi
-- Ejecuta este código en: Supabase Dashboard > SQL Editor > New Query
-- Crea las tablas para CADA SUB-MENÚ del sistema
-- ============================================================

-- 1. SUBMENÚ: Asistencia y Visitas (Registro de personas y marcas de asistencia)
CREATE TABLE IF NOT EXISTS attendees (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  zone TEXT DEFAULT '',
  type TEXT NOT NULL DEFAULT 'visitante', -- visitante, recurrente, miembro
  registered_date TEXT NOT NULL,
  notes TEXT DEFAULT '',
  prayer_request TEXT DEFAULT '',
  attendance JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. SUBMENÚ: Conferencias y Actividades
CREATE TABLE IF NOT EXISTS church_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'conferencia',
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  location TEXT DEFAULT 'Auditorio Principal',
  speaker TEXT,
  description TEXT DEFAULT '',
  attendees JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. SUBMENÚ: Clubes (Catálogo de Clubes de la Iglesia)
CREATE TABLE IF NOT EXISTS clubs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  color TEXT DEFAULT 'blue',
  director TEXT DEFAULT '',
  period TEXT DEFAULT '2026',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. SUBMENÚ: Actividades de Clubes
CREATE TABLE IF NOT EXISTS club_activities (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL,
  club_name TEXT NOT NULL,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  description TEXT DEFAULT '',
  target_budget NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'planeada',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. SUBMENÚ: Finanzas de Clubes (Ingresos, Egresos y Recaudaciones)
CREATE TABLE IF NOT EXISTS club_transactions (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL,
  activity_name TEXT NOT NULL,
  club_id TEXT NOT NULL,
  club_name TEXT NOT NULL,
  type TEXT NOT NULL, -- ingreso o egreso
  category TEXT NOT NULL,
  description TEXT DEFAULT '',
  amount NUMERIC NOT NULL DEFAULT 0,
  date TEXT NOT NULL,
  payment_method TEXT DEFAULT 'efectivo',
  responsible_person TEXT DEFAULT '',
  receipt_number TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. SUBMENÚ: T-Shirts de Camporee (Control de pedidos, tallas y dinero entregado)
CREATE TABLE IF NOT EXISTS camporee_shirts (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL,
  club_name TEXT NOT NULL,
  person_name TEXT NOT NULL,
  size TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  total_price NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  is_paid BOOLEAN DEFAULT false,
  payment_date TEXT NOT NULL,
  phone TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. SUBMENÚ: Matrículas de Clubes (Inscripciones, tutores y cuotas)
CREATE TABLE IF NOT EXISTS club_enrollments (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL,
  club_name TEXT NOT NULL,
  member_name TEXT NOT NULL,
  period TEXT NOT NULL,
  category TEXT DEFAULT 'Conquistador',
  tutor_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  fee_amount NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  is_paid BOOLEAN DEFAULT false,
  enrollment_date TEXT NOT NULL,
  receipt_number TEXT DEFAULT '',
  medical_notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. SUBMENÚ: Usuarios y Perfiles (Pastor, Anciano, Secretaria, Administrador)
CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'secretaria',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_login TEXT
);

-- 9. TABLA DE RESPALDO ATÓMICO Y ZONAS
CREATE TABLE IF NOT EXISTS church_store (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. TABLA DE FOTOS Y GALERÍA DE LA IGLESIA
CREATE TABLE IF NOT EXISTS church_photos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  album TEXT NOT NULL DEFAULT 'Culto de Adoración',
  date TEXT NOT NULL,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  uploaded_by TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  description TEXT,
  tags TEXT[]
);

-- 11. SUBMENÚ: Concurso Imita tu Personaje Bíblico (28 Nov 2026)
CREATE TABLE IF NOT EXISTS biblical_characters (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  edad TEXT DEFAULT '',
  contacto TEXT NOT NULL,
  iglesia TEXT DEFAULT '',
  personaje TEXT NOT NULL,
  escena TEXT DEFAULT '',
  utileria TEXT DEFAULT '',
  audio TEXT NOT NULL DEFAULT 'No',
  ensenanza TEXT DEFAULT '',
  fecha TEXT NOT NULL,
  aprobado BOOLEAN DEFAULT false,
  notas_organizador TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Asegurar que las columnas opcionales y nuevas no bloqueen inscripciones públicas o clubes
ALTER TABLE IF EXISTS clubs ADD COLUMN IF NOT EXISTS director TEXT DEFAULT '';
ALTER TABLE IF EXISTS clubs ADD COLUMN IF NOT EXISTS period TEXT DEFAULT '2026';
ALTER TABLE IF EXISTS biblical_characters ALTER COLUMN escena DROP NOT NULL;
ALTER TABLE IF EXISTS biblical_characters ALTER COLUMN ensenanza DROP NOT NULL;
ALTER TABLE IF EXISTS biblical_characters ALTER COLUMN escena SET DEFAULT '';
ALTER TABLE IF EXISTS biblical_characters ALTER COLUMN ensenanza SET DEFAULT '';
ALTER TABLE IF EXISTS biblical_characters ADD COLUMN IF NOT EXISTS iglesia TEXT DEFAULT '';
ALTER TABLE IF EXISTS biblical_characters ADD COLUMN IF NOT EXISTS puntaje_caracterizacion NUMERIC;
ALTER TABLE IF EXISTS biblical_characters ADD COLUMN IF NOT EXISTS puntaje_actuacion NUMERIC;
ALTER TABLE IF EXISTS biblical_characters ADD COLUMN IF NOT EXISTS puntaje_fidelidad NUMERIC;
ALTER TABLE IF EXISTS biblical_characters ADD COLUMN IF NOT EXISTS puntaje_total NUMERIC;
ALTER TABLE IF EXISTS biblical_characters ADD COLUMN IF NOT EXISTS participo BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS biblical_characters ADD COLUMN IF NOT EXISTS calificado_por TEXT DEFAULT '';
ALTER TABLE IF EXISTS biblical_characters ADD COLUMN IF NOT EXISTS calificado_at TEXT DEFAULT '';

-- 12. SUBMENÚ: Sociedad de Jóvenes Games (Cuestionarios y Juegos en Vivo)
CREATE TABLE IF NOT EXISTS youth_games (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'quiz_preguntas',
  icon_emoji TEXT DEFAULT '🎮',
  color_theme TEXT DEFAULT 'purple',
  questions JSONB DEFAULT '[]'::jsonb,
  created_by TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- HABILITAR SEGURIDAD RLS EN TODAS LAS TABLAS
ALTER TABLE attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE church_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE camporee_shirts ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE church_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE church_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE biblical_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE youth_games ENABLE ROW LEVEL SECURITY;

-- CREAR POLÍTICAS DE LECTURA Y ESCRITURA PÚBLICAS (ANON KEY)
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['attendees', 'church_events', 'clubs', 'club_activities', 'club_transactions', 'camporee_shirts', 'club_enrollments', 'app_users', 'church_store', 'church_photos', 'biblical_characters', 'youth_games'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public select on %I" ON %I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "Public select on %I" ON %I FOR SELECT USING (true);', tbl, tbl);

    EXECUTE format('DROP POLICY IF EXISTS "Public insert on %I" ON %I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "Public insert on %I" ON %I FOR INSERT WITH CHECK (true);', tbl, tbl);

    EXECUTE format('DROP POLICY IF EXISTS "Public update on %I" ON %I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "Public update on %I" ON %I FOR UPDATE USING (true);', tbl, tbl);

    EXECUTE format('DROP POLICY IF EXISTS "Public delete on %I" ON %I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "Public delete on %I" ON %I FOR DELETE USING (true);', tbl, tbl);

    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I;', tbl);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;
`;

export const REQUIRED_DATABASE_TABLES = [
  { name: 'attendees', label: 'Asistentes y Visitas', submenu: 'Registro Visitas / Asistencia' },
  { name: 'church_events', label: 'Conferencias y Cultos', submenu: 'Registro Visitas / Conferencias' },
  { name: 'clubs', label: 'Clubes de la Iglesia', submenu: 'Clubes / Directorio' },
  { name: 'club_activities', label: 'Actividades de Recaudación', submenu: 'Clubes / Actividades' },
  { name: 'club_transactions', label: 'Ingresos y Egresos', submenu: 'Clubes / Finanzas' },
  { name: 'camporee_shirts', label: 'T-Shirts de Camporee', submenu: 'Clubes / Finanzas T-Shirts' },
  { name: 'club_enrollments', label: 'Matrículas de Clubes', submenu: 'Clubes / Matrícula' },
  { name: 'biblical_characters', label: 'Imita tu Personaje Bíblico', submenu: 'Eventos / Personaje Bíblico' },
  { name: 'youth_games', label: 'Sociedad de Jóvenes Games', submenu: 'Juegos / Cuestionarios en Vivo' },
  { name: 'church_photos', label: 'Fotos y Galería Eclesiástica', submenu: 'Fotos / Galería Pública' },
  { name: 'app_users', label: 'Usuarios y Perfiles (Roles)', submenu: 'Administración de Usuarios' },
  { name: 'church_store', label: 'Almacén Global y Zonas', submenu: 'Sincronización Unificada' },
];

/**
 * Verify whether each table for each sub-menu exists in Supabase
 */
export async function verifyDatabaseTables(): Promise<{
  allExist: boolean;
  tables: TableStatus[];
  generalMessage: string;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      allExist: false,
      tables: REQUIRED_DATABASE_TABLES.map((t) => ({
        ...t,
        exists: false,
        count: null,
        error: 'Cliente Supabase no configurado.',
      })),
      generalMessage: 'Falta la Clave Pública (anon key) de Supabase.',
    };
  }

  const results: TableStatus[] = [];
  let anyMissing = false;

  for (const t of REQUIRED_DATABASE_TABLES) {
    try {
      const { count, error } = await client
        .from(t.name)
        .select('*', { count: 'exact', head: true });

      if (error) {
        if (error.code === '42P01') {
          // table doesn't exist in PostgreSQL
          results.push({
            ...t,
            exists: false,
            count: null,
            error: 'Tabla no encontrada (código 42P01). Requiere creación.',
          });
          anyMissing = true;
        } else {
          results.push({
            ...t,
            exists: false,
            count: null,
            error: error.message,
          });
          anyMissing = true;
        }
      } else {
        results.push({
          ...t,
          exists: true,
          count: count !== null ? count : 0,
        });
      }
    } catch (err: any) {
      results.push({
        ...t,
        exists: false,
        count: null,
        error: err.message || 'Error de red',
      });
      anyMissing = true;
    }
  }

  const existingCount = results.filter((r) => r.exists).length;
  const generalMessage = anyMissing
    ? `Se detectaron ${existingCount} de ${results.length} tablas creadas. Ejecuta el script SQL para crear las tablas pendientes.`
    : `¡Excelente! Todas las ${results.length} tablas para cada sub-menú están creadas y operativas en Supabase.`;

  return {
    allExist: !anyMissing,
    tables: results,
    generalMessage,
  };
}

/**
 * Test general connection to Supabase
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { 
      success: false, 
      message: 'Falta la Clave Pública (anon key) de Supabase. Ingrésala en la configuración.' 
    };
  }

  try {
    const { error } = await client.from('church_store').select('id').limit(1);
    if (error) {
      if (error.code === '42P01') {
        return {
          success: false,
          message: 'Conectado a Supabase, pero la tabla "church_store" aún no existe. Copia y ejecuta el script SQL en el SQL Editor de Supabase.',
        };
      }
      if (error.message.toLowerCase().includes('invalid api key') || error.message.toLowerCase().includes('jwt')) {
        return {
          success: false,
          message: 'Error: Clave API no válida. Supabase requiere la clave JWT anon public.',
        };
      }
      return { success: false, message: `Error de Supabase: ${error.message}` };
    }
    return { success: true, message: '¡Conexión exitosa a Supabase! Base de datos lista para sincronizar.' };
  } catch (err: any) {
    return { success: false, message: `Error de red: ${err.message || 'No se pudo conectar a Supabase'}` };
  }
}

/**
 * Push local church state to Supabase (both atomic store and relational tables)
 */
export async function pushDataToSupabase(payload: ChurchDataPayload): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase no está configurado (falta anon key).' };
  }

  try {
    // 0. Fetch cloud tombstones first so deleted records are NEVER re-inserted by a stale device/tab
    let cloudDeletedIds: Record<string, number> = {};
    try {
      const { data: existingStore } = await client
        .from('church_store')
        .select('data')
        .eq('id', 'main_church_data')
        .maybeSingle();
      if (existingStore?.data?.deletedIds) {
        cloudDeletedIds = existingStore.data.deletedIds;
      }
    } catch {}

    const mergedDeleted = saveLocalDeletedIds(
      mergeDeletedIds(getLocalDeletedIds(), payload.deletedIds, cloudDeletedIds)
    );
    const cleanPayload = stripDeletedFromPayload(payload, mergedDeleted);

    // 1. Always save atomic snapshot in church_store for instant backup integrity
    const nowIso = new Date().toISOString();
    const { error: storeError } = await client
      .from('church_store')
      .upsert(
        {
          id: 'main_church_data',
          data: cleanPayload,
          updated_at: nowIso,
        },
        { onConflict: 'id' }
      );

    // 2. Also sync to individual relational tables if they exist
    try {
      if (cleanPayload.attendees && cleanPayload.attendees.length > 0) {
        const attendeeRecords = cleanPayload.attendees.map((a) => ({
          id: a.id,
          first_name: a.firstName,
          last_name: a.lastName,
          phone: a.phone || '',
          zone: a.zone || '',
          type: a.type,
          registered_date: a.registeredDate,
          notes: a.notes || '',
          prayer_request: a.prayerRequest || '',
          attendance: a.attendance || {},
        }));
        await client.from('attendees').upsert(attendeeRecords, { onConflict: 'id' });
      }

      if (cleanPayload.events && cleanPayload.events.length > 0) {
        const eventRecords = cleanPayload.events.map((e) => ({
          id: e.id,
          title: e.title,
          category: e.category,
          date: e.date,
          time: e.time,
          location: e.location || 'Auditorio Principal',
          speaker: e.speaker || '',
          description: e.description || '',
          attendees: e.attendees || [],
        }));
        await client.from('church_events').upsert(eventRecords, { onConflict: 'id' });
      }

      if (cleanPayload.clubs && cleanPayload.clubs.length > 0) {
        const clubRecords = cleanPayload.clubs.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description || '',
          color: c.color || 'blue',
          director: c.director || '',
          period: c.period || '2026',
        }));
        const { error: clubErr } = await client.from('clubs').upsert(clubRecords, { onConflict: 'id' });
        if (clubErr) {
          // Fallback if director/period columns do not exist in live clubs table yet
          const baseClubRecords = cleanPayload.clubs.map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description || '',
            color: c.color || 'blue',
          }));
          await client.from('clubs').upsert(baseClubRecords, { onConflict: 'id' });
        }
      }

      if (cleanPayload.clubActivities && cleanPayload.clubActivities.length > 0) {
        const actRecords = cleanPayload.clubActivities.map((a) => ({
          id: a.id,
          club_id: a.clubId,
          club_name: a.clubName,
          name: a.name,
          date: a.date,
          description: a.description || '',
          target_budget: a.targetBudget || 0,
          status: a.status || 'planeada',
        }));
        await client.from('club_activities').upsert(actRecords, { onConflict: 'id' });
      }

      if (cleanPayload.clubTransactions && cleanPayload.clubTransactions.length > 0) {
        const txRecords = cleanPayload.clubTransactions.map((t) => ({
          id: t.id,
          activity_id: t.activityId,
          activity_name: t.activityName,
          club_id: t.clubId,
          club_name: t.clubName,
          type: t.type,
          category: t.category,
          description: t.description || '',
          amount: t.amount,
          date: t.date,
          payment_method: t.paymentMethod || 'efectivo',
          responsible_person: t.responsiblePerson || '',
          receipt_number: t.receiptNumber || '',
        }));
        await client.from('club_transactions').upsert(txRecords, { onConflict: 'id' });
      }

      if (cleanPayload.camporeeShirts && cleanPayload.camporeeShirts.length > 0) {
        const shirtRecords = cleanPayload.camporeeShirts.map((s) => ({
          id: s.id,
          club_id: s.clubId,
          club_name: s.clubName,
          person_name: s.personName,
          size: s.size,
          quantity: s.quantity || 1,
          total_price: s.totalPrice || 0,
          amount_paid: s.amountPaid || 0,
          is_paid: !!s.isPaid,
          payment_date: s.paymentDate,
          phone: s.phone || '',
          notes: s.notes || '',
        }));
        const { error: shirtErr } = await client.from('camporee_shirts').upsert(shirtRecords, { onConflict: 'id' });
        if (shirtErr) console.warn('Upsert camporee_shirts:', shirtErr.message);
      }

      if (cleanPayload.clubEnrollments && cleanPayload.clubEnrollments.length > 0) {
        const enrollRecords = cleanPayload.clubEnrollments.map((e) => ({
          id: e.id,
          club_id: e.clubId,
          club_name: e.clubName,
          member_name: e.memberName,
          period: e.period || '2026',
          category: e.category || 'Conquistador',
          tutor_name: e.tutorName || '',
          phone: e.phone || '',
          fee_amount: e.feeAmount || 0,
          amount_paid: e.amountPaid || 0,
          is_paid: !!e.isPaid,
          enrollment_date: e.enrollmentDate,
          receipt_number: e.receiptNumber || '',
          medical_notes: e.medicalNotes || '',
        }));
        const { error: enrollErr } = await client.from('club_enrollments').upsert(enrollRecords, { onConflict: 'id' });
        if (enrollErr) console.warn('Upsert club_enrollments:', enrollErr.message);
      }

      if (cleanPayload.users && cleanPayload.users.length > 0) {
        const userRecords = cleanPayload.users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          password: u.password,
          role: serializeUserRoles(u),
          last_login: u.lastLogin || null,
        }));
        await client.from('app_users').upsert(userRecords, { onConflict: 'id' });
      }

      // Sync Biblical Characters Contest Registrations
      if (cleanPayload.biblicalCharacters && cleanPayload.biblicalCharacters.length > 0) {
        const characterRecordsWithScores = cleanPayload.biblicalCharacters.map((b) => ({
          id: b.id,
          nombre: b.nombre,
          edad: b.edad || '',
          contacto: b.contacto,
          iglesia: b.iglesia || '',
          personaje: b.personaje,
          escena: b.escena || '',
          utileria: b.utileria || '',
          audio: b.audio || 'No',
          ensenanza: b.ensenanza || '',
          fecha: b.fecha,
          aprobado: !!b.aprobado,
          notas_organizador: b.notasOrganizador || '',
          puntaje_caracterizacion: typeof b.puntajeCaracterizacion === 'number' ? b.puntajeCaracterizacion : null,
          puntaje_actuacion: typeof b.puntajeActuacion === 'number' ? b.puntajeActuacion : null,
          puntaje_fidelidad: typeof b.puntajeFidelidad === 'number' ? b.puntajeFidelidad : null,
          puntaje_total: typeof b.puntajeTotal === 'number' ? b.puntajeTotal : null,
          participo: !!b.participo,
          calificado_por: b.calificadoPor || '',
          calificado_at: b.calificadoAt || '',
        }));
        const { error: charErr } = await client
          .from('biblical_characters')
          .upsert(characterRecordsWithScores, { onConflict: 'id' });
        if (charErr) {
          const baseCharRecords = cleanPayload.biblicalCharacters.map((b) => ({
            id: b.id,
            nombre: b.nombre,
            edad: b.edad || '',
            contacto: b.contacto,
            iglesia: b.iglesia || '',
            personaje: b.personaje,
            escena: b.escena || '',
            utileria: b.utileria || '',
            audio: b.audio || 'No',
            ensenanza: b.ensenanza || '',
            fecha: b.fecha,
            aprobado: !!b.aprobado,
            notas_organizador: b.notasOrganizador || '',
          }));
          await client.from('biblical_characters').upsert(baseCharRecords, { onConflict: 'id' });
        }
      }

      if (cleanPayload.youthGames && cleanPayload.youthGames.length > 0) {
        const gameRecords = cleanPayload.youthGames.map((g) => ({
          id: g.id,
          title: g.title,
          description: g.description || '',
          kind: g.kind || 'quiz_preguntas',
          icon_emoji: g.iconEmoji || '🎮',
          color_theme: g.colorTheme || 'purple',
          questions: g.questions || [],
          created_by: g.createdBy || '',
          created_at: g.createdAt || new Date().toISOString(),
          updated_at: g.updatedAt || new Date().toISOString(),
        }));
        await client.from('youth_games').upsert(gameRecords, { onConflict: 'id' });
      }

      // 3. Sync Photos to church_photos table in batches of 5
      if (cleanPayload.photos && cleanPayload.photos.length > 0) {
        const photoRecords = cleanPayload.photos.map((p) => ({
          id: p.id,
          title: p.title,
          album: p.album || 'Culto de Adoración',
          date: p.date,
          image_url: p.imageUrl,
          thumbnail_url: p.thumbnailUrl || null,
          uploaded_by: p.uploadedBy || '',
          uploaded_at: p.uploadedAt || new Date().toISOString(),
          description: p.description || '',
          tags: p.tags || [],
        }));

        const chunkSize = 5;
        for (let i = 0; i < photoRecords.length; i += chunkSize) {
          const chunk = photoRecords.slice(i, i + chunkSize);
          await client.from('church_photos').upsert(chunk, { onConflict: 'id' });
        }
      }
    } catch (relationalErr) {
      // Individual tables might not be created yet, which is fine since church_store holds the master data
      console.warn('Tablas relacionales individuales pendientes o no creadas aún:', relationalErr);
    }

    if (storeError) {
      if (storeError.code === '42P01') {
        return {
          success: false,
          message: 'La tabla "church_store" no existe en Supabase. Abre "Configuración > Base de Datos" y copia el script SQL para crear las tablas en tu proyecto.',
        };
      }
      return { success: false, message: storeError.message };
    }

    setLastKnownCloudUpdatedAt(nowIso);
    broadcastSyncSignal({ action: 'full_sync', updatedAt: nowIso }).catch(() => {});

    return { 
      success: true, 
      message: `¡Datos y fotos guardados y sincronizados con éxito en Supabase! (${payload.attendees.length} asistentes, ${payload.events.length} cultos, ${payload.photos?.length || 0} fotos).` 
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Error al guardar en Supabase' };
  }
}

/**
 * Pull church state from Supabase (combines atomic snapshot + church_photos table)
 */
export async function pullDataFromSupabase(): Promise<{
  success: boolean;
  data?: ChurchDataPayload;
  message: string;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase no está configurado (falta anon key).' };
  }

  try {
    let pulledPayload: ChurchDataPayload | null = null;
    let updatedAtStr: string | null = null;
    let cloudDeletedIds: Record<string, number> = {};

    // 1. Try pulling atomic store snapshot
    try {
      const { data, error } = await client
        .from('church_store')
        .select('data, updated_at')
        .eq('id', 'main_church_data')
        .single();

      if (!error && data && data.data) {
        pulledPayload = data.data as ChurchDataPayload;
        updatedAtStr = data.updated_at;
        if (pulledPayload.deletedIds) {
          cloudDeletedIds = pulledPayload.deletedIds;
        }
      }
    } catch (storeErr) {
      console.warn('Could not read from church_store, trying relational tables...', storeErr);
    }

    const deletedMap = saveLocalDeletedIds(mergeDeletedIds(getLocalDeletedIds(), cloudDeletedIds));

    // 2. Query church_photos directly to ensure full gallery fidelity
    try {
      const { data: photosData, error: photosError } = await client
        .from('church_photos')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (!photosError && photosData && photosData.length > 0) {
        const mappedPhotos: ChurchPhoto[] = photosData.map((row: any) => ({
          id: row.id,
          title: row.title,
          album: row.album || 'Culto de Adoración',
          date: row.date,
          imageUrl: row.image_url,
          thumbnailUrl: row.thumbnail_url || undefined,
          uploadedBy: row.uploaded_by || undefined,
          uploadedAt: row.uploaded_at,
          description: row.description || undefined,
          tags: row.tags || [],
        }));

        if (!pulledPayload) {
          pulledPayload = {
            version: 1,
            exportedAt: new Date().toISOString(),
            attendees: [],
            events: [],
            zones: [],
            photos: mappedPhotos,
          };
        } else {
          pulledPayload.photos = mappedPhotos;
        }
      }
    } catch (photoErr) {
      console.warn('Could not read from church_photos table:', photoErr);
    }

    // 2.5 Query biblical_characters directly to ensure contest registrations are fresh
    try {
      const { data: charsData, error: charsError } = await client
        .from('biblical_characters')
        .select('*')
        .order('fecha', { ascending: false });

      if (!charsError && Array.isArray(charsData)) {
        const mappedChars: BiblicalCharacterRegistration[] = charsData
          .filter((row: any) => row && row.id && !deletedMap[row.id])
          .map((row: any) => ({
            id: row.id,
            nombre: row.nombre,
            edad: row.edad || '',
            contacto: row.contacto,
            iglesia: row.iglesia || '',
            personaje: row.personaje,
            escena: row.escena,
            utileria: row.utileria || '',
            audio: row.audio || 'No',
            ensenanza: row.ensenanza,
            fecha: row.fecha,
            aprobado: !!row.aprobado,
            notasOrganizador: row.notas_organizador || '',
            ...(typeof row.puntaje_caracterizacion === 'number' ? { puntajeCaracterizacion: row.puntaje_caracterizacion } : {}),
            ...(typeof row.puntaje_actuacion === 'number' ? { puntajeActuacion: row.puntaje_actuacion } : {}),
            ...(typeof row.puntaje_fidelidad === 'number' ? { puntajeFidelidad: row.puntaje_fidelidad } : {}),
            ...(typeof row.puntaje_total === 'number' ? { puntajeTotal: row.puntaje_total } : {}),
            ...(typeof row.participo === 'boolean' ? { participo: row.participo } : {}),
            ...(row.calificado_por ? { calificadoPor: row.calificado_por } : {}),
            ...(row.calificado_at ? { calificadoAt: row.calificado_at } : {}),
          }));

        if (!pulledPayload) {
          if (mappedChars.length > 0) {
            pulledPayload = {
              version: 1,
              exportedAt: new Date().toISOString(),
              attendees: [],
              events: [],
              zones: [],
              biblicalCharacters: mappedChars,
            };
          }
        } else {
          // Merge registrations while strictly honoring deleted tombstones
          const existingMap = new Map<string, BiblicalCharacterRegistration>();
          (pulledPayload.biblicalCharacters || []).forEach((c) => {
            if (c && c.id && !deletedMap[c.id]) {
              existingMap.set(c.id, c);
            }
          });
          mappedChars.forEach((c) => {
            const prev = existingMap.get(c.id);
            existingMap.set(c.id, {
              ...prev,
              ...c,
              iglesia: c.iglesia || prev?.iglesia || '',
              puntajeCaracterizacion: c.puntajeCaracterizacion ?? prev?.puntajeCaracterizacion,
              puntajeActuacion: c.puntajeActuacion ?? prev?.puntajeActuacion,
              puntajeFidelidad: c.puntajeFidelidad ?? prev?.puntajeFidelidad,
              puntajeTotal: c.puntajeTotal ?? prev?.puntajeTotal,
              participo: c.participo ?? prev?.participo,
              calificadoPor: c.calificadoPor ?? prev?.calificadoPor,
              calificadoAt: c.calificadoAt ?? prev?.calificadoAt,
            });
          });
          pulledPayload.biblicalCharacters = Array.from(existingMap.values());
        }
      }
    } catch (charErr) {
      console.warn('Could not read from biblical_characters table:', charErr);
    }

    // 2.6 Query club_enrollments directly so multi-device / real-time registrations are NEVER lost
    try {
      const { data: enrollData, error: enrollError } = await client
        .from('club_enrollments')
        .select('*')
        .order('created_at', { ascending: false });

      if (!enrollError && Array.isArray(enrollData)) {
        const mappedEnrollments: ClubEnrollment[] = enrollData
          .filter((row: any) => row && row.id && !deletedMap[row.id])
          .map((row: any) => ({
            id: row.id,
            clubId: row.club_id,
            clubName: row.club_name,
            memberName: row.member_name,
            period: row.period || '2026',
            category: row.category || 'Conquistador',
            tutorName: row.tutor_name || undefined,
            phone: row.phone || undefined,
            feeAmount: Number(row.fee_amount) || 0,
            amountPaid: Number(row.amount_paid) || 0,
            isPaid: !!row.is_paid,
            enrollmentDate: row.enrollment_date,
            receiptNumber: row.receipt_number || undefined,
            medicalNotes: row.medical_notes || undefined,
            createdAt: row.created_at || new Date().toISOString(),
          }));

        if (!pulledPayload) {
          if (mappedEnrollments.length > 0) {
            pulledPayload = {
              version: 1,
              exportedAt: new Date().toISOString(),
              attendees: [],
              events: [],
              zones: [],
              clubEnrollments: mappedEnrollments,
            };
          }
        } else {
          const existingMap = new Map<string, ClubEnrollment>();
          (pulledPayload.clubEnrollments || []).forEach((item) => {
            if (item && item.id && !deletedMap[item.id]) {
              existingMap.set(item.id, item);
            }
          });
          mappedEnrollments.forEach((item) => {
            const prev = existingMap.get(item.id);
            existingMap.set(item.id, {
              ...prev,
              ...item,
            });
          });
          pulledPayload.clubEnrollments = Array.from(existingMap.values());
        }
      }
    } catch (enrollErr) {
      console.warn('Could not read from club_enrollments table:', enrollErr);
    }

    // 2.7 Query camporee_shirts directly so shirt orders stay synced across devices
    try {
      const { data: shirtData, error: shirtError } = await client
        .from('camporee_shirts')
        .select('*')
        .order('created_at', { ascending: false });

      if (!shirtError && Array.isArray(shirtData)) {
        const mappedShirts: CamporeeShirtPayment[] = shirtData
          .filter((row: any) => row && row.id && !deletedMap[row.id])
          .map((row: any) => ({
            id: row.id,
            clubId: row.club_id,
            clubName: row.club_name,
            personName: row.person_name,
            size: row.size,
            quantity: Number(row.quantity) || 1,
            totalPrice: Number(row.total_price) || 0,
            amountPaid: Number(row.amount_paid) || 0,
            isPaid: !!row.is_paid,
            paymentDate: row.payment_date,
            phone: row.phone || undefined,
            notes: row.notes || undefined,
            createdAt: row.created_at || new Date().toISOString(),
          }));

        if (!pulledPayload) {
          if (mappedShirts.length > 0) {
            pulledPayload = {
              version: 1,
              exportedAt: new Date().toISOString(),
              attendees: [],
              events: [],
              zones: [],
              camporeeShirts: mappedShirts,
            };
          }
        } else {
          const existingMap = new Map<string, CamporeeShirtPayment>();
          (pulledPayload.camporeeShirts || []).forEach((item) => {
            if (item && item.id && !deletedMap[item.id]) {
              existingMap.set(item.id, item);
            }
          });
          mappedShirts.forEach((item) => {
            const prev = existingMap.get(item.id);
            existingMap.set(item.id, {
              ...prev,
              ...item,
            });
          });
          pulledPayload.camporeeShirts = Array.from(existingMap.values());
        }
      }
    } catch (shirtErr) {
      console.warn('Could not read from camporee_shirts table:', shirtErr);
    }

    // 2.8 Query youth_games directly so quizzes created on other devices sync reliably
    try {
      const { data: gamesData, error: gamesError } = await client
        .from('youth_games')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!gamesError && Array.isArray(gamesData)) {
        const mappedGames: YouthGame[] = gamesData
          .filter((row: any) => row && row.id && !deletedMap[row.id])
          .map((row: any) => ({
            id: row.id,
            title: row.title,
            description: row.description || '',
            kind: row.kind || 'quiz_preguntas',
            iconEmoji: row.icon_emoji || '🎮',
            colorTheme: row.color_theme || 'purple',
            questions: Array.isArray(row.questions) ? row.questions : [],
            createdBy: row.created_by || undefined,
            createdAt: row.created_at || new Date().toISOString(),
            updatedAt: row.updated_at || new Date().toISOString(),
          }));

        if (pulledPayload) {
          const existingMap = new Map<string, YouthGame>();
          (pulledPayload.youthGames || []).forEach((g) => {
            if (g && g.id && !deletedMap[g.id]) {
              existingMap.set(g.id, g);
            }
          });
          mappedGames.forEach((g) => {
            const prev = existingMap.get(g.id);
            if (!prev || (g.updatedAt && prev.updatedAt && g.updatedAt >= prev.updatedAt)) {
              existingMap.set(g.id, g);
            }
          });
          pulledPayload.youthGames = Array.from(existingMap.values());
        } else if (mappedGames.length > 0) {
          pulledPayload = {
            version: 1,
            exportedAt: new Date().toISOString(),
            attendees: [],
            events: [],
            zones: [],
            youthGames: mappedGames,
          };
        }
      }
    } catch {}

    // 3. Fallback: If church_store was empty, try reading relational tables
    if (!pulledPayload) {
      try {
        const [attRes, evtRes, clubRes, actRes, txRes, userRes, shirtRes, enrollRes] = await Promise.all([
          client.from('attendees').select('*'),
          client.from('church_events').select('*'),
          client.from('clubs').select('*'),
          client.from('club_activities').select('*'),
          client.from('club_transactions').select('*'),
          client.from('app_users').select('*'),
          client.from('camporee_shirts').select('*'),
          client.from('club_enrollments').select('*'),
        ]);

        const hasAnyRelational = (attRes.data && attRes.data.length > 0) ||
          (evtRes.data && evtRes.data.length > 0) ||
          (clubRes.data && clubRes.data.length > 0) ||
          (enrollRes.data && enrollRes.data.length > 0) ||
          (shirtRes.data && shirtRes.data.length > 0);

        if (hasAnyRelational) {
          pulledPayload = {
            version: 1,
            exportedAt: new Date().toISOString(),
            attendees: (attRes.data || []).map((row: any) => ({
              id: row.id,
              firstName: row.first_name,
              lastName: row.last_name,
              phone: row.phone || '',
              zone: row.zone || '',
              type: row.type || 'visitante',
              registeredDate: row.registered_date,
              notes: row.notes || '',
              prayerRequest: row.prayer_request || '',
              attendance: row.attendance || {},
            })),
            events: (evtRes.data || []).map((row: any) => ({
              id: row.id,
              title: row.title,
              category: row.category,
              date: row.date,
              time: row.time,
              location: row.location || 'Auditorio Principal',
              speaker: row.speaker || '',
              description: row.description || '',
              attendees: row.attendees || [],
            })),
            zones: Array.from(new Set((attRes.data || []).map((a: any) => a.zone).filter(Boolean))),
            clubs: (clubRes.data || []).map((row: any) => ({
              id: row.id,
              name: row.name,
              description: row.description || '',
              color: row.color || 'blue',
              director: row.director || '',
              period: row.period || '2026',
            })),
            clubActivities: (actRes.data || []).map((row: any) => ({
              id: row.id,
              clubId: row.club_id,
              clubName: row.club_name,
              name: row.name,
              date: row.date,
              description: row.description || '',
              targetBudget: Number(row.target_budget) || 0,
              status: row.status || 'planeada',
              createdAt: row.created_at || new Date().toISOString(),
            })),
            clubTransactions: (txRes.data || []).map((row: any) => ({
              id: row.id,
              activityId: row.activity_id,
              activityName: row.activity_name,
              clubId: row.club_id,
              clubName: row.club_name,
              type: row.type,
              category: row.category,
              description: row.description || '',
              amount: Number(row.amount) || 0,
              date: row.date,
              paymentMethod: row.payment_method || 'efectivo',
              responsiblePerson: row.responsible_person || '',
              receiptNumber: row.receipt_number || '',
              createdAt: row.created_at || new Date().toISOString(),
            })),
            camporeeShirts: (shirtRes.data || []).map((row: any) => ({
              id: row.id,
              clubId: row.club_id,
              clubName: row.club_name,
              personName: row.person_name,
              size: row.size,
              quantity: Number(row.quantity) || 1,
              totalPrice: Number(row.total_price) || 0,
              amountPaid: Number(row.amount_paid) || 0,
              isPaid: !!row.is_paid,
              paymentDate: row.payment_date,
              phone: row.phone || undefined,
              notes: row.notes || undefined,
              createdAt: row.created_at || new Date().toISOString(),
            })),
            clubEnrollments: (enrollRes.data || []).map((row: any) => ({
              id: row.id,
              clubId: row.club_id,
              clubName: row.club_name,
              memberName: row.member_name,
              period: row.period || '2026',
              category: row.category || 'Conquistador',
              tutorName: row.tutor_name || undefined,
              phone: row.phone || undefined,
              feeAmount: Number(row.fee_amount) || 0,
              amountPaid: Number(row.amount_paid) || 0,
              isPaid: !!row.is_paid,
              enrollmentDate: row.enrollment_date,
              receiptNumber: row.receipt_number || undefined,
              medicalNotes: row.medical_notes || undefined,
              createdAt: row.created_at || new Date().toISOString(),
            })),
            users: (userRes.data || []).map((row: any) => {
              const parsedRoles = normalizeUserRoles(row.role, row.roles);
              return {
                id: row.id,
                name: row.name,
                email: row.email,
                password: row.password,
                role: parsedRoles[0],
                roles: parsedRoles,
                createdAt: row.created_at || new Date().toISOString(),
                lastLogin: row.last_login || undefined,
              };
            }),
          };
        }
      } catch (relFallbackErr) {
        console.warn('Relational table fallback error:', relFallbackErr);
      }
    }

    if (!pulledPayload) {
      return { 
        success: false, 
        message: 'No se encontraron registros en Supabase todavía. Realiza un guardado desde la configuración.' 
      };
    }

    const sanitizedPayload = stripDeletedFromPayload(pulledPayload, deletedMap);
    if (Array.isArray(sanitizedPayload.users)) {
      sanitizedPayload.users = sanitizedPayload.users.map(normalizeAppUser);
    }
    if (updatedAtStr) {
      setLastKnownCloudUpdatedAt(updatedAtStr);
    }
    const timestamp = updatedAtStr ? new Date(updatedAtStr).toLocaleString('es-ES') : 'recientemente';
    return {
      success: true,
      data: sanitizedPayload,
      message: `Datos cargados desde Supabase (actualizados ${timestamp}).`,
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Error al descargar datos de Supabase' };
  }
}

/**
 * Register a biblical character directly online.
 * Safe for any guest device: writes directly to biblical_characters table
 * and safely appends to church_store without overwriting any other church data.
 */
export async function registerBiblicalCharacterOnline(
  reg: BiblicalCharacterRegistration
): Promise<{ success: boolean; message: string }> {
  // Ensure database credentials are bound if URL had sync tokens
  autoLinkSupabaseFromUrl();
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'No hay conexión con la base de datos de la iglesia (falta clave de Supabase).'
    };
  }

  let tableSaved = false;
  let storeSaved = false;
  let errorDetail = '';

  // 1. Direct upsert into relational table 'biblical_characters' (with safe score-column fallback)
  try {
    const baseRecord = {
      id: reg.id,
      nombre: reg.nombre,
      edad: reg.edad || '',
      contacto: reg.contacto,
      iglesia: reg.iglesia || '',
      personaje: reg.personaje,
      escena: reg.escena || '',
      utileria: reg.utileria || '',
      audio: reg.audio || 'No',
      ensenanza: reg.ensenanza || '',
      fecha: reg.fecha || new Date().toISOString(),
      aprobado: !!reg.aprobado,
      notas_organizador: reg.notasOrganizador || '',
    };
    const recordWithScores = {
      ...baseRecord,
      puntaje_caracterizacion: typeof reg.puntajeCaracterizacion === 'number' ? reg.puntajeCaracterizacion : null,
      puntaje_actuacion: typeof reg.puntajeActuacion === 'number' ? reg.puntajeActuacion : null,
      puntaje_fidelidad: typeof reg.puntajeFidelidad === 'number' ? reg.puntajeFidelidad : null,
      puntaje_total: typeof reg.puntajeTotal === 'number' ? reg.puntajeTotal : null,
      participo: !!reg.participo,
      calificado_por: reg.calificadoPor || '',
      calificado_at: reg.calificadoAt || '',
    };
    const { error } = await client.from('biblical_characters').upsert(recordWithScores, { onConflict: 'id' });
    if (!error) {
      tableSaved = true;
    } else {
      const { error: fallbackError } = await client.from('biblical_characters').upsert(baseRecord, { onConflict: 'id' });
      if (!fallbackError) {
        tableSaved = true;
      } else {
        console.warn('Upsert en biblical_characters falló:', fallbackError);
        errorDetail = fallbackError.message;
      }
    }
  } catch (err: any) {
    console.warn('Error en biblical_characters table:', err);
    errorDetail = err?.message || 'Error de red';
  }

  // 2. Safely merge into 'church_store' so the organizer's store stays perfectly synchronized
  try {
    const { data: storeRow, error: storeReadErr } = await client
      .from('church_store')
      .select('data')
      .eq('id', 'main_church_data')
      .maybeSingle();

    if (!storeReadErr && storeRow && storeRow.data) {
      const existingChars = storeRow.data.biblicalCharacters || [];
      const updatedChars = [reg, ...existingChars.filter((c: any) => c.id !== reg.id)];
      const { error: storeWriteErr } = await client
        .from('church_store')
        .update({
          data: {
            ...storeRow.data,
            biblicalCharacters: updatedChars,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', 'main_church_data');

      if (!storeWriteErr) {
        storeSaved = true;
      }
    } else {
      // If church_store row didn't exist yet, insert with this registration
      const { error: insertStoreErr } = await client
        .from('church_store')
        .upsert({
          id: 'main_church_data',
          data: {
            version: 1,
            exportedAt: new Date().toISOString(),
            attendees: [],
            events: [],
            zones: [],
            biblicalCharacters: [reg],
          },
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (!insertStoreErr) {
        storeSaved = true;
      }
    }
  } catch (storeCatch: any) {
    console.warn('Error actualizando church_store:', storeCatch);
  }

  if (tableSaved || storeSaved) {
    const nowIso = new Date().toISOString();
    setLastKnownCloudUpdatedAt(nowIso);
    broadcastSyncSignal({
      action: 'upsert',
      entity: 'biblicalCharacters',
      record: reg,
      updatedAt: nowIso,
    }).catch(() => {});
    return {
      success: true,
      message: '¡Inscripción registrada y guardada con éxito en la base de datos!'
    };
  }

  return {
    success: false,
    message: errorDetail || 'No se pudo guardar en la base de datos. Verifica la conexión a internet.'
  };
}

/**
 * Fetch latest biblical characters and contest config directly from Supabase.
 */
export async function fetchBiblicalCharactersOnline(): Promise<{
  success: boolean;
  characters?: BiblicalCharacterRegistration[];
  contestConfig?: ContestCustomConfig;
  message: string;
}> {
  autoLinkSupabaseFromUrl();
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase no está configurado.' };
  }

  try {
    const charactersMap = new Map<string, BiblicalCharacterRegistration>();
    let pulledConfig: ContestCustomConfig | undefined = undefined;
    let cloudDeletedIds: Record<string, number> = {};

    // 1. Try reading from church_store
    try {
      const { data: storeData, error: storeError } = await client
        .from('church_store')
        .select('data')
        .eq('id', 'main_church_data')
        .maybeSingle();

      if (!storeError && storeData && storeData.data) {
        if (storeData.data.deletedIds) {
          cloudDeletedIds = storeData.data.deletedIds;
        }
        if (storeData.data.contestConfig) {
          pulledConfig = storeData.data.contestConfig;
        }
        if (Array.isArray(storeData.data.biblicalCharacters)) {
          storeData.data.biblicalCharacters.forEach((c: BiblicalCharacterRegistration) => {
            if (c && c.id) charactersMap.set(c.id, c);
          });
        }
      }
    } catch (e) {
      console.warn('Error reading church_store for characters:', e);
    }

    const deletedMap = saveLocalDeletedIds(mergeDeletedIds(getLocalDeletedIds(), cloudDeletedIds));

    // 2. Try reading from biblical_characters table
    try {
      const { data: tableRows, error: tableError } = await client
        .from('biblical_characters')
        .select('*')
        .order('fecha', { ascending: false });

      if (!tableError && Array.isArray(tableRows)) {
        tableRows.forEach((row: any) => {
          if (!row || !row.id || deletedMap[row.id]) return;
          const prev = charactersMap.get(row.id);
          charactersMap.set(row.id, {
            ...prev,
            id: row.id,
            nombre: row.nombre,
            edad: row.edad || '',
            contacto: row.contacto,
            iglesia: row.iglesia || prev?.iglesia || '',
            personaje: row.personaje,
            escena: row.escena || '',
            utileria: row.utileria || '',
            audio: row.audio || 'No',
            ensenanza: row.ensenanza || '',
            fecha: row.fecha,
            aprobado: !!row.aprobado,
            notasOrganizador: row.notas_organizador || '',
            puntajeCaracterizacion:
              typeof row.puntaje_caracterizacion === 'number' ? row.puntaje_caracterizacion : prev?.puntajeCaracterizacion,
            puntajeActuacion:
              typeof row.puntaje_actuacion === 'number' ? row.puntaje_actuacion : prev?.puntajeActuacion,
            puntajeFidelidad:
              typeof row.puntaje_fidelidad === 'number' ? row.puntaje_fidelidad : prev?.puntajeFidelidad,
            puntajeTotal:
              typeof row.puntaje_total === 'number' ? row.puntaje_total : prev?.puntajeTotal,
            participo:
              typeof row.participo === 'boolean' ? row.participo : prev?.participo,
            calificadoPor: row.calificado_por || prev?.calificadoPor,
            calificadoAt: row.calificado_at || prev?.calificadoAt,
          });
        });
      }
    } catch (e) {
      console.warn('Error reading biblical_characters table:', e);
    }

    const charactersList = Array.from(charactersMap.values()).filter((c) => !deletedMap[c.id]);
    return {
      success: true,
      characters: charactersList,
      contestConfig: pulledConfig,
      message: `${charactersList.length} inscripciones obtenidas.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Error al consultar inscripciones en Supabase',
    };
  }
}

/**
 * Update a biblical character registration in real time in both relational table and church_store.
 */
export async function updateBiblicalCharacterOnline(
  reg: BiblicalCharacterRegistration
): Promise<{ success: boolean; message: string }> {
  return registerBiblicalCharacterOnline(reg);
}

/**
 * Delete a biblical character registration permanently in real time from Supabase
 * (removes from BOTH biblical_characters table and church_store).
 */
export async function deleteBiblicalCharacterOnline(
  id: string
): Promise<{ success: boolean; message: string }> {
  return deleteRecordOnline('biblical_characters', id, 'biblicalCharacters');
}

/**
 * Real-time delete of any single record by ID from its relational table AND from church_store.
 */
export async function deleteRecordOnline(
  tableName: string,
  id: string,
  storeArrayKey?: keyof ChurchDataPayload
): Promise<{ success: boolean; message: string }> {
  const updatedLocalTombstones = recordLocalDeletedIds([id]);

  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'No hay conexión con Supabase.' };
  }

  let tableDeleted = false;
  let storeUpdated = false;
  let errorDetail = '';

  // 1. Delete immediately from relational table
  try {
    const { error } = await client.from(tableName).delete().eq('id', id);
    if (!error) {
      tableDeleted = true;
    } else {
      errorDetail = error.message;
      console.warn(`Error eliminando de ${tableName}:`, error);
    }
  } catch (err: any) {
    errorDetail = err?.message || 'Error de red';
    console.warn(`Excepción eliminando de ${tableName}:`, err);
  }

  // 2. Immediately remove from church_store AND save deletedIds tombstone so no PC/tab resurrects it
  try {
    const { data: storeRow, error: readErr } = await client
      .from('church_store')
      .select('data')
      .eq('id', 'main_church_data')
      .maybeSingle();

    if (!readErr && storeRow && storeRow.data) {
      const mergedDeleted = saveLocalDeletedIds(
        mergeDeletedIds(updatedLocalTombstones, storeRow.data.deletedIds)
      );
      const nextData: any = {
        ...storeRow.data,
        deletedIds: mergedDeleted,
      };
      if (storeArrayKey && Array.isArray(storeRow.data[storeArrayKey])) {
        nextData[storeArrayKey] = (storeRow.data[storeArrayKey] as any[]).filter(
          (item: any) => item?.id !== id
        );
      }

      const { error: writeErr } = await client
        .from('church_store')
        .update({
          data: nextData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 'main_church_data');

      if (!writeErr) {
        storeUpdated = true;
      } else if (!errorDetail) {
        errorDetail = writeErr.message;
      }
    } else if (!readErr) {
      storeUpdated = true;
    }
  } catch (storeErr: any) {
    console.warn('Error actualizando church_store tras eliminar:', storeErr);
    if (!errorDetail) errorDetail = storeErr?.message || '';
  }

  if (tableDeleted || storeUpdated) {
    const nowIso = new Date().toISOString();
    setLastKnownCloudUpdatedAt(nowIso);
    broadcastSyncSignal({
      action: 'delete',
      entity: storeArrayKey,
      deletedIds: [id],
      updatedAt: nowIso,
    }).catch(() => {});
    return { success: true, message: 'Eliminado permanentemente en tiempo real de la base de datos.' };
  }
  return { success: false, message: errorDetail || 'No se pudo eliminar en Supabase.' };
}

/**
 * Real-time cascading delete of a club and its related activities, transactions, shirts, and enrollments.
 */
export async function deleteClubCascadeOnline(clubId: string): Promise<{ success: boolean; message: string }> {
  const localTombstones = recordLocalDeletedIds([clubId]);
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'No hay conexión con Supabase.' };

  try {
    await Promise.allSettled([
      client.from('clubs').delete().eq('id', clubId),
      client.from('club_activities').delete().eq('club_id', clubId),
      client.from('club_transactions').delete().eq('club_id', clubId),
      client.from('camporee_shirts').delete().eq('club_id', clubId),
      client.from('club_enrollments').delete().eq('club_id', clubId),
    ]);

    const { data: storeRow } = await client
      .from('church_store')
      .select('data')
      .eq('id', 'main_church_data')
      .maybeSingle();

    if (storeRow && storeRow.data) {
      const d = storeRow.data;
      const relatedIds = [
        clubId,
        ...((d.clubActivities || []).filter((a: any) => a.clubId === clubId).map((a: any) => a.id)),
        ...((d.clubTransactions || []).filter((t: any) => t.clubId === clubId).map((t: any) => t.id)),
        ...((d.camporeeShirts || []).filter((s: any) => s.clubId === clubId).map((s: any) => s.id)),
        ...((d.clubEnrollments || []).filter((e: any) => e.clubId === clubId).map((e: any) => e.id)),
      ];
      const mergedDeleted = saveLocalDeletedIds(
        mergeDeletedIds(localTombstones, recordLocalDeletedIds(relatedIds), d.deletedIds)
      );

      const nowIso = new Date().toISOString();
      await client
        .from('church_store')
        .update({
          data: {
            ...d,
            deletedIds: mergedDeleted,
            clubs: (d.clubs || []).filter((c: any) => c.id !== clubId),
            clubActivities: (d.clubActivities || []).filter((a: any) => a.clubId !== clubId),
            clubTransactions: (d.clubTransactions || []).filter((t: any) => t.clubId !== clubId),
            camporeeShirts: (d.camporeeShirts || []).filter((s: any) => s.clubId !== clubId),
            clubEnrollments: (d.clubEnrollments || []).filter((e: any) => e.clubId !== clubId),
          },
          updated_at: nowIso,
        })
        .eq('id', 'main_church_data');
      setLastKnownCloudUpdatedAt(nowIso);
      broadcastSyncSignal({
        action: 'delete',
        deletedIds: relatedIds,
        updatedAt: nowIso,
      }).catch(() => {});
    } else {
      broadcastSyncSignal({
        action: 'delete',
        deletedIds: [clubId],
      }).catch(() => {});
    }

    return { success: true, message: 'Club eliminado en tiempo real.' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Error eliminando club.' };
  }
}

/**
 * Real-time cascading delete of a club activity and its transactions.
 */
export async function deleteActivityCascadeOnline(activityId: string): Promise<{ success: boolean; message: string }> {
  const localTombstones = recordLocalDeletedIds([activityId]);
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'No hay conexión con Supabase.' };

  try {
    await Promise.allSettled([
      client.from('club_activities').delete().eq('id', activityId),
      client.from('club_transactions').delete().eq('activity_id', activityId),
    ]);

    const { data: storeRow } = await client
      .from('church_store')
      .select('data')
      .eq('id', 'main_church_data')
      .maybeSingle();

    if (storeRow && storeRow.data) {
      const d = storeRow.data;
      const relatedIds = [
        activityId,
        ...((d.clubTransactions || []).filter((t: any) => t.activityId === activityId).map((t: any) => t.id)),
      ];
      const mergedDeleted = saveLocalDeletedIds(
        mergeDeletedIds(localTombstones, recordLocalDeletedIds(relatedIds), d.deletedIds)
      );

      const nowIso = new Date().toISOString();
      await client
        .from('church_store')
        .update({
          data: {
            ...d,
            deletedIds: mergedDeleted,
            clubActivities: (d.clubActivities || []).filter((a: any) => a.id !== activityId),
            clubTransactions: (d.clubTransactions || []).filter((t: any) => t.activityId !== activityId),
          },
          updated_at: nowIso,
        })
        .eq('id', 'main_church_data');
      setLastKnownCloudUpdatedAt(nowIso);
      broadcastSyncSignal({
        action: 'delete',
        deletedIds: relatedIds,
        updatedAt: nowIso,
      }).catch(() => {});
    } else {
      broadcastSyncSignal({
        action: 'delete',
        deletedIds: [activityId],
      }).catch(() => {});
    }

    return { success: true, message: 'Actividad eliminada en tiempo real.' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Error eliminando actividad.' };
  }
}

/**
 * Helper to atomically merge a single item into an array inside church_store.data
 */
async function mergeSingleItemIntoChurchStore<T extends { id: string }>(
  storeArrayKey: keyof ChurchDataPayload,
  item: T
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { data: storeRow, error: readErr } = await client
      .from('church_store')
      .select('data')
      .eq('id', 'main_church_data')
      .maybeSingle();

    const nowIso = new Date().toISOString();
    if (!readErr && storeRow && storeRow.data) {
      const existingList: T[] = Array.isArray(storeRow.data[storeArrayKey])
        ? (storeRow.data[storeArrayKey] as T[])
        : [];
      const updatedList = [item, ...existingList.filter((x) => x?.id !== item.id)];
      const { error: writeErr } = await client
        .from('church_store')
        .update({
          data: {
            ...storeRow.data,
            [storeArrayKey]: updatedList,
          },
          updated_at: nowIso,
        })
        .eq('id', 'main_church_data');
      if (!writeErr) setLastKnownCloudUpdatedAt(nowIso);
      return !writeErr;
    } else if (!readErr) {
      const { error: upsertErr } = await client
        .from('church_store')
        .upsert(
          {
            id: 'main_church_data',
            data: {
              version: 1,
              exportedAt: nowIso,
              attendees: [],
              events: [],
              zones: [],
              [storeArrayKey]: [item],
            },
            updated_at: nowIso,
          },
          { onConflict: 'id' }
        );
      if (!upsertErr) setLastKnownCloudUpdatedAt(nowIso);
      return !upsertErr;
    }
  } catch (err) {
    console.warn(`Error actualizando church_store (${String(storeArrayKey)}):`, err);
  }
  return false;
}

/**
 * Real-time save of a club enrollment into BOTH club_enrollments table and church_store.
 */
export async function saveClubEnrollmentOnline(
  enrollment: ClubEnrollment
): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'No hay conexión con Supabase.' };

  let tableOk = false;
  let errorMsg = '';

  try {
    const { error } = await client.from('club_enrollments').upsert(
      {
        id: enrollment.id,
        club_id: enrollment.clubId,
        club_name: enrollment.clubName,
        member_name: enrollment.memberName,
        period: enrollment.period || '2026',
        category: enrollment.category || 'Conquistador',
        tutor_name: enrollment.tutorName || '',
        phone: enrollment.phone || '',
        fee_amount: Number(enrollment.feeAmount) || 0,
        amount_paid: Number(enrollment.amountPaid) || 0,
        is_paid: !!enrollment.isPaid,
        enrollment_date: enrollment.enrollmentDate,
        receipt_number: enrollment.receiptNumber || '',
        medical_notes: enrollment.medicalNotes || '',
      },
      { onConflict: 'id' }
    );
    if (!error) {
      tableOk = true;
    } else {
      errorMsg = error.message;
      console.warn('Error guardando en club_enrollments:', error);
    }
  } catch (err: any) {
    errorMsg = err?.message || 'Error de red';
  }

  const storeOk = await mergeSingleItemIntoChurchStore('clubEnrollments', enrollment);
  if (tableOk || storeOk) {
    broadcastSyncSignal({
      action: 'upsert',
      entity: 'clubEnrollments',
      record: enrollment,
    }).catch(() => {});
    return { success: true, message: 'Matrícula guardada en tiempo real.' };
  }
  return { success: false, message: errorMsg || 'No se pudo guardar la matrícula.' };
}

/**
 * Real-time save of a Camporee T-shirt order into BOTH camporee_shirts table and church_store.
 */
export async function saveCamporeeShirtOnline(
  shirt: CamporeeShirtPayment
): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'No hay conexión con Supabase.' };

  let tableOk = false;
  let errorMsg = '';

  try {
    const { error } = await client.from('camporee_shirts').upsert(
      {
        id: shirt.id,
        club_id: shirt.clubId,
        club_name: shirt.clubName,
        person_name: shirt.personName,
        size: shirt.size,
        quantity: Number(shirt.quantity) || 1,
        total_price: Number(shirt.totalPrice) || 0,
        amount_paid: Number(shirt.amountPaid) || 0,
        is_paid: !!shirt.isPaid,
        payment_date: shirt.paymentDate,
        phone: shirt.phone || '',
        notes: shirt.notes || '',
      },
      { onConflict: 'id' }
    );
    if (!error) {
      tableOk = true;
    } else {
      errorMsg = error.message;
    }
  } catch (err: any) {
    errorMsg = err?.message || 'Error de red';
  }

  const storeOk = await mergeSingleItemIntoChurchStore('camporeeShirts', shirt);
  if (tableOk || storeOk) {
    broadcastSyncSignal({
      action: 'upsert',
      entity: 'camporeeShirts',
      record: shirt,
    }).catch(() => {});
    return { success: true, message: 'Pedido de T-Shirt guardado en tiempo real.' };
  }
  return { success: false, message: errorMsg || 'No se pudo guardar la T-Shirt.' };
}

/**
 * Real-time save of a Club into BOTH clubs table (with schema fallback) and church_store.
 */
export async function saveClubOnline(
  club: Club
): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'No hay conexión con Supabase.' };

  let tableOk = false;
  try {
    const { error } = await client.from('clubs').upsert(
      {
        id: club.id,
        name: club.name,
        description: club.description || '',
        color: club.color || 'blue',
        director: club.director || '',
        period: club.period || '2026',
      },
      { onConflict: 'id' }
    );
    if (!error) {
      tableOk = true;
    } else {
      const { error: fallbackErr } = await client.from('clubs').upsert(
        {
          id: club.id,
          name: club.name,
          description: club.description || '',
          color: club.color || 'blue',
        },
        { onConflict: 'id' }
      );
      if (!fallbackErr) tableOk = true;
    }
  } catch {}

  const storeOk = await mergeSingleItemIntoChurchStore('clubs', club);
  if (tableOk || storeOk) {
    broadcastSyncSignal({
      action: 'upsert',
      entity: 'clubs',
      record: club,
    }).catch(() => {});
  }
  return {
    success: tableOk || storeOk,
    message: tableOk || storeOk ? 'Club guardado en tiempo real.' : 'Error guardando club.',
  };
}

/**
 * Real-time save of a Club Activity into BOTH club_activities table and church_store.
 */
export async function saveClubActivityOnline(
  act: ClubActivity
): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'No hay conexión con Supabase.' };

  let tableOk = false;
  try {
    const { error } = await client.from('club_activities').upsert(
      {
        id: act.id,
        club_id: act.clubId,
        club_name: act.clubName,
        name: act.name,
        date: act.date,
        description: act.description || '',
        target_budget: Number(act.targetBudget) || 0,
        status: act.status || 'planeada',
      },
      { onConflict: 'id' }
    );
    if (!error) tableOk = true;
  } catch {}

  const storeOk = await mergeSingleItemIntoChurchStore('clubActivities', act);
  if (tableOk || storeOk) {
    broadcastSyncSignal({
      action: 'upsert',
      entity: 'clubActivities',
      record: act,
    }).catch(() => {});
  }
  return {
    success: tableOk || storeOk,
    message: tableOk || storeOk ? 'Actividad guardada en tiempo real.' : 'Error guardando actividad.',
  };
}

/**
 * Real-time save of a Club Transaction into BOTH club_transactions table and church_store.
 */
export async function saveClubTransactionOnline(
  tx: ClubTransaction
): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'No hay conexión con Supabase.' };

  let tableOk = false;
  try {
    const { error } = await client.from('club_transactions').upsert(
      {
        id: tx.id,
        activity_id: tx.activityId,
        activity_name: tx.activityName,
        club_id: tx.clubId,
        club_name: tx.clubName,
        type: tx.type,
        category: tx.category,
        description: tx.description || '',
        amount: Number(tx.amount) || 0,
        date: tx.date,
        payment_method: tx.paymentMethod || 'efectivo',
        responsible_person: tx.responsiblePerson || '',
        receipt_number: tx.receiptNumber || '',
      },
      { onConflict: 'id' }
    );
    if (!error) tableOk = true;
  } catch {}

  const storeOk = await mergeSingleItemIntoChurchStore('clubTransactions', tx);
  if (tableOk || storeOk) {
    broadcastSyncSignal({
      action: 'upsert',
      entity: 'clubTransactions',
      record: tx,
    }).catch(() => {});
  }
  return {
    success: tableOk || storeOk,
    message: tableOk || storeOk ? 'Movimiento guardado en tiempo real.' : 'Error guardando movimiento.',
  };
}

/**
 * Real-time save of an Attendee (register, edit, attendance toggle) into attendees table and church_store.
 */
export async function saveAttendeeOnline(
  attendee: Attendee
): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'No hay conexión con Supabase.' };

  let tableOk = false;
  try {
    const { error } = await client.from('attendees').upsert(
      {
        id: attendee.id,
        first_name: attendee.firstName,
        last_name: attendee.lastName,
        phone: attendee.phone || '',
        zone: attendee.zone || '',
        type: attendee.type,
        registered_date: attendee.registeredDate,
        notes: attendee.notes || '',
        prayer_request: attendee.prayerRequest || '',
        attendance: attendee.attendance || {},
      },
      { onConflict: 'id' }
    );
    if (!error) tableOk = true;
  } catch {}

  const storeOk = await mergeSingleItemIntoChurchStore('attendees', attendee);
  if (tableOk || storeOk) {
    broadcastSyncSignal({
      action: 'upsert',
      entity: 'attendees',
      record: attendee,
    }).catch(() => {});
  }
  return {
    success: tableOk || storeOk,
    message: tableOk || storeOk ? 'Asistente guardado en tiempo real.' : 'Error guardando asistente.',
  };
}

/**
 * Real-time save of a ChurchEvent (create or toggle attendance) into church_events table and church_store.
 */
export async function saveEventOnline(
  evt: ChurchEvent
): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'No hay conexión con Supabase.' };

  let tableOk = false;
  try {
    const { error } = await client.from('church_events').upsert(
      {
        id: evt.id,
        title: evt.title,
        category: evt.category,
        date: evt.date,
        time: evt.time,
        location: evt.location || 'Auditorio Principal',
        speaker: evt.speaker || '',
        description: evt.description || '',
        attendees: evt.attendees || [],
      },
      { onConflict: 'id' }
    );
    if (!error) tableOk = true;
  } catch {}

  const storeOk = await mergeSingleItemIntoChurchStore('events', evt);
  if (tableOk || storeOk) {
    broadcastSyncSignal({
      action: 'upsert',
      entity: 'events',
      record: evt,
    }).catch(() => {});
  }
  return {
    success: tableOk || storeOk,
    message: tableOk || storeOk ? 'Evento guardado en tiempo real.' : 'Error guardando evento.',
  };
}

/**
 * Real-time save of Photos into church_photos table and broadcasts full_sync.
 */
export async function savePhotosOnline(
  photos: ChurchPhoto[]
): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client || !photos.length) {
    return { success: false, message: 'No hay conexión o fotos.' };
  }

  let tableOk = false;
  try {
    const photoRecords = photos.map((p) => ({
      id: p.id,
      title: p.title,
      album: p.album || 'Culto de Adoración',
      date: p.date,
      image_url: p.imageUrl,
      thumbnail_url: p.thumbnailUrl || null,
      uploaded_by: p.uploadedBy || '',
      uploaded_at: p.uploadedAt || new Date().toISOString(),
      description: p.description || '',
      tags: p.tags || [],
    }));
    const { error } = await client.from('church_photos').upsert(photoRecords, { onConflict: 'id' });
    if (!error) tableOk = true;
  } catch {}

  for (const photo of photos) {
    await mergeSingleItemIntoChurchStore('photos', photo);
  }

  broadcastSyncSignal({ action: 'full_sync' }).catch(() => {});
  return {
    success: tableOk,
    message: tableOk ? 'Fotos guardadas en tiempo real.' : 'Fotos sincronizadas en respaldo.',
  };
}

/**
 * Real-time save of an AppUser into app_users table and church_store.
 */
export async function saveUserOnline(
  user: AppUser
): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'No hay conexión con Supabase.' };

  const normalizedUser = normalizeAppUser(user);
  let tableOk = false;
  try {
    const { error } = await client.from('app_users').upsert(
      {
        id: normalizedUser.id,
        name: normalizedUser.name,
        email: normalizedUser.email,
        password: normalizedUser.password,
        role: serializeUserRoles(normalizedUser),
        last_login: normalizedUser.lastLogin || null,
      },
      { onConflict: 'id' }
    );
    if (!error) tableOk = true;
  } catch {}

  const storeOk = await mergeSingleItemIntoChurchStore('users', normalizedUser);
  if (tableOk || storeOk) {
    broadcastSyncSignal({
      action: 'upsert',
      entity: 'users',
      record: normalizedUser,
    }).catch(() => {});
  }
  return {
    success: tableOk || storeOk,
    message: tableOk || storeOk ? 'Usuario guardado en tiempo real.' : 'Error guardando usuario.',
  };
}

// ============================================================
// SOCIEDAD DE JÓVENES GAMES - REAL-TIME QUIZIZZ MULTIPLAYER SYNC
// ============================================================

export async function saveYouthGameOnline(
  game: YouthGame
): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'No hay conexión con Supabase.' };

  let tableOk = false;
  try {
    const { error } = await client.from('youth_games').upsert(
      {
        id: game.id,
        title: game.title,
        description: game.description || '',
        kind: game.kind,
        icon_emoji: game.iconEmoji || '🎮',
        color_theme: game.colorTheme || 'purple',
        questions: game.questions || [],
        created_by: game.createdBy || '',
        created_at: game.createdAt || new Date().toISOString(),
        updated_at: game.updatedAt || new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (!error) tableOk = true;
  } catch {}

  const storeOk = await mergeSingleItemIntoChurchStore('youthGames', game);
  if (tableOk || storeOk) {
    broadcastSyncSignal({
      action: 'upsert',
      entity: 'youthGames',
      record: game,
    }).catch(() => {});
  }

  return {
    success: tableOk || storeOk,
    message: tableOk || storeOk ? 'Juego guardado en tiempo real.' : 'Error guardando juego.',
  };
}

export async function deleteYouthGameOnline(
  gameId: string
): Promise<{ success: boolean; message: string }> {
  return deleteRecordOnline('youth_games', gameId, 'youthGames');
}

export interface GameRoomSignal {
  senderId: string;
  type: 'session_update' | 'player_update';
  session?: YouthGameSession;
  player?: YouthGamePlayer;
  updatedAt: string;
}

/**
 * Save live game session state into church_store (both game_session_<id> and room code index game_room_<code>)
 * and broadcast immediately in parallel to all connected phones and the projector leaderboard screen.
 */
export async function saveGameSessionOnline(
  session: YouthGameSession
): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'Sin conexión a Supabase.' };

  const nowIso = new Date().toISOString();
  const payloadSession: YouthGameSession = { ...session, updatedAt: nowIso };
  const roomKey = session.roomCode.trim().toUpperCase();

  // Fire instant WebSocket broadcast immediately in parallel with DB persistence
  // so phones & "Otra Pantalla" update in <100ms without waiting for 2 DB roundtrips.
  const broadcastPromise = broadcastGameRoomSignal(roomKey, {
    type: 'session_update',
    session: payloadSession,
  });

  try {
    const [sessRes, roomRes] = await Promise.all([
      client.from('church_store').upsert(
        {
          id: `game_session_${session.id}`,
          data: payloadSession,
          updated_at: nowIso,
        },
        { onConflict: 'id' }
      ),
      client.from('church_store').upsert(
        {
          id: `game_room_${roomKey}`,
          data: { sessionId: session.id, roomCode: roomKey, updatedAt: nowIso },
          updated_at: nowIso,
        },
        { onConflict: 'id' }
      ),
    ]);

    await broadcastPromise;

    if (sessRes.error && roomRes.error) {
      return { success: false, message: sessRes.error.message };
    }

    return { success: true, message: 'Sesión de juego actualizada en vivo.' };
  } catch (err: any) {
    await broadcastPromise.catch(() => {});
    return { success: false, message: err?.message || 'Error guardando partida en vivo.' };
  }
}

export async function fetchGameSessionByRoom(
  roomCode: string
): Promise<YouthGameSession | null> {
  autoLinkSupabaseFromUrl();
  const client = getSupabaseClient();
  if (!client) return null;

  const cleanRoom = roomCode.trim().toUpperCase();
  if (!cleanRoom) return null;

  try {
    const { data: roomRow } = await client
      .from('church_store')
      .select('data')
      .eq('id', `game_room_${cleanRoom}`)
      .maybeSingle();

    const sessionId = roomRow?.data?.sessionId;
    if (sessionId) {
      const { data: sessRow } = await client
        .from('church_store')
        .select('data')
        .eq('id', `game_session_${sessionId}`)
        .maybeSingle();
      if (sessRow?.data) {
        return sessRow.data as YouthGameSession;
      }
    }

    // Fallback search across game_session_% rows
    const { data: fallbackRows } = await client
      .from('church_store')
      .select('data, updated_at')
      .like('id', 'game_session_%')
      .order('updated_at', { ascending: false })
      .limit(20);

    if (Array.isArray(fallbackRows)) {
      const found = fallbackRows.find(
        (r: any) => String(r?.data?.roomCode || '').toUpperCase() === cleanRoom
      );
      if (found?.data) return found.data as YouthGameSession;
    }
  } catch (err) {
    console.warn('Error fetching game session by room:', err);
  }
  return null;
}

export async function fetchGameSessionById(
  sessionId: string
): Promise<YouthGameSession | null> {
  const client = getSupabaseClient();
  if (!client || !sessionId) return null;
  try {
    const { data } = await client
      .from('church_store')
      .select('data')
      .eq('id', `game_session_${sessionId}`)
      .maybeSingle();
    if (data?.data) return data.data as YouthGameSession;
  } catch {}
  return null;
}

/**
 * Atomically persist a single player's state & answers under their own unique row
 * (game_player_<sessionId>_<playerId>) so simultaneous answers NEVER overwrite each other.
 */
export async function saveGamePlayerOnline(
  sessionId: string,
  roomCode: string,
  player: YouthGamePlayer
): Promise<{ success: boolean }> {
  const client = getSupabaseClient();
  if (!client) return { success: false };

  const nowIso = new Date().toISOString();
  const payloadPlayer: YouthGamePlayer = { ...player, updatedAt: nowIso };
  const cleanRoom = roomCode.trim().toUpperCase();

  // Broadcast immediately in parallel with DB write for instant leaderboard & lobby presence
  const broadcastPromise = broadcastGameRoomSignal(cleanRoom, {
    type: 'player_update',
    player: payloadPlayer,
  });

  try {
    const { error } = await client.from('church_store').upsert(
      {
        id: `game_player_${sessionId}_${player.id}`,
        data: payloadPlayer,
        updated_at: nowIso,
      },
      { onConflict: 'id' }
    );

    await broadcastPromise;

    if (!error) {
      return { success: true };
    }
  } catch (err) {
    console.warn('Error saving game player:', err);
    await broadcastPromise.catch(() => {});
  }
  return { success: false };
}

/**
 * Returns null when the fetch fails so callers never confuse a transient network error with an empty room.
 */
export async function fetchGamePlayers(sessionId: string): Promise<YouthGamePlayer[] | null> {
  const client = getSupabaseClient();
  if (!client || !sessionId) return null;

  try {
    const { data, error } = await client
      .from('church_store')
      .select('id, data')
      .like('id', `game_player_${sessionId}_%`)
      .limit(500);

    if (!error && Array.isArray(data)) {
      return data
        .map((row: any) => row?.data as YouthGamePlayer)
        .filter((p) => p && p.id)
        .sort((a, b) => {
          if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
          if ((b.correctCount || 0) !== (a.correctCount || 0)) return (b.correctCount || 0) - (a.correctCount || 0);
          return (a.joinedAt || '').localeCompare(b.joinedAt || '');
        });
    }
  } catch (err) {
    console.warn('Error fetching game players:', err);
  }
  return null;
}

const activeGameChannels = new Map<string, ReturnType<SupabaseClient['channel']>>();
const subscribedGameChannels = new Set<string>();
const pendingGameSignals = new Map<string, GameRoomSignal[]>();
const gameRoomListeners = new Map<
  string,
  Set<{
    sessionId: string;
    onSignal: (signal: GameRoomSignal) => void;
    onDbRefresh?: () => void;
  }>
>();

function ensureGameRoomChannel(roomCode: string): ReturnType<SupabaseClient['channel']> | null {
  const client = getSupabaseClient();
  if (!client || !roomCode) return null;

  const cleanRoom = roomCode.trim().toUpperCase();
  const channelName = `eclesia-game-${cleanRoom}`;
  const existing = activeGameChannels.get(channelName);
  if (existing) return existing;

  const channel = client.channel(channelName, {
    config: { broadcast: { self: false, ack: false } },
  });

  channel
    .on('broadcast', { event: 'game_event' }, (msg) => {
      const signal = msg?.payload as GameRoomSignal | undefined;
      if (!signal || signal.senderId === CLIENT_INSTANCE_ID) return;
      const listeners = gameRoomListeners.get(cleanRoom);
      listeners?.forEach((entry) => {
        try {
          entry.onSignal(signal);
        } catch {}
      });
    })
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'church_store' },
      (payload: any) => {
        const changedId = String(payload?.new?.id || payload?.old?.id || '');
        if (!changedId.startsWith('game_session_') && !changedId.startsWith('game_player_')) {
          return;
        }
        const listeners = gameRoomListeners.get(cleanRoom);
        listeners?.forEach((entry) => {
          if (
            changedId === `game_session_${entry.sessionId}` ||
            changedId.startsWith(`game_player_${entry.sessionId}_`)
          ) {
            try {
              entry.onDbRefresh?.();
            } catch {}
          }
        });
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        subscribedGameChannels.add(channelName);
        const queued = pendingGameSignals.get(channelName);
        if (queued && queued.length > 0) {
          pendingGameSignals.delete(channelName);
          queued.forEach((sig) => {
            channel
              .send({
                type: 'broadcast',
                event: 'game_event',
                payload: sig,
              })
              .catch(() => {});
          });
        }
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        subscribedGameChannels.delete(channelName);
      }
    });

  activeGameChannels.set(channelName, channel);
  return channel;
}

async function broadcastGameRoomSignal(
  roomCode: string,
  partial: Omit<GameRoomSignal, 'senderId' | 'updatedAt'>
): Promise<void> {
  const cleanRoom = roomCode.trim().toUpperCase();
  const channelName = `eclesia-game-${cleanRoom}`;
  const channel = ensureGameRoomChannel(cleanRoom);
  if (!channel) return;

  const signal: GameRoomSignal = {
    senderId: CLIENT_INSTANCE_ID,
    updatedAt: new Date().toISOString(),
    ...partial,
  };

  if (!subscribedGameChannels.has(channelName)) {
    const queue = pendingGameSignals.get(channelName) || [];
    queue.push(signal);
    if (queue.length > 10) queue.shift();
    pendingGameSignals.set(channelName, queue);
  }

  try {
    await channel.send({
      type: 'broadcast',
      event: 'game_event',
      payload: signal,
    });
  } catch {}
}

export function subscribeToGameRoom(
  roomCode: string,
  sessionId: string,
  onSignal: (signal: GameRoomSignal) => void,
  onDatabaseFallbackRefresh?: () => void
): () => void {
  const cleanRoom = roomCode.trim().toUpperCase();
  if (!cleanRoom) return () => {};

  ensureGameRoomChannel(cleanRoom);
  let set = gameRoomListeners.get(cleanRoom);
  if (!set) {
    set = new Set();
    gameRoomListeners.set(cleanRoom, set);
  }

  const entry = {
    sessionId,
    onSignal,
    onDbRefresh: onDatabaseFallbackRefresh,
  };
  set.add(entry);

  return () => {
    const currentSet = gameRoomListeners.get(cleanRoom);
    if (currentSet) {
      currentSet.delete(entry);
      if (currentSet.size === 0) {
        gameRoomListeners.delete(cleanRoom);
        const channelName = `eclesia-game-${cleanRoom}`;
        const channel = activeGameChannels.get(channelName);
        const client = getSupabaseClient();
        if (channel && client) {
          client.removeChannel(channel);
        }
        activeGameChannels.delete(channelName);
        subscribedGameChannels.delete(channelName);
        pendingGameSignals.delete(channelName);
      }
    }
  };
}



