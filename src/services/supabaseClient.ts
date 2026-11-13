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
  ContestCustomConfig
} from '../types';

export const DEFAULT_SUPABASE_PROJECT_ID = 'ewwtdeypwetvpjjbbgdi';
export const DEFAULT_SUPABASE_URL = `https://${DEFAULT_SUPABASE_PROJECT_ID}.supabase.co`;
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_GnoiDE0dtUks_INAuHKfcg_ZdVDw5rG';

const STORAGE_KEY_URL = 'eclesia_supabase_url';
const STORAGE_KEY_ANON_KEY = 'eclesia_supabase_anon_key';
const STORAGE_KEY_AUTO_SYNC = 'eclesia_supabase_auto_sync';

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

export function getSupabaseConfig(): SupabaseConfig {
  // Check if link had auto-link credentials
  autoLinkSupabaseFromUrl();

  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

  const savedUrl = localStorage.getItem(STORAGE_KEY_URL);
  const savedKey = localStorage.getItem(STORAGE_KEY_ANON_KEY);
  const savedAutoSync = localStorage.getItem(STORAGE_KEY_AUTO_SYNC);

  const finalUrl = normalizeSupabaseUrl(savedUrl || envUrl || DEFAULT_SUPABASE_URL);
  const finalKey = savedKey && savedKey.trim().length > 0 ? savedKey.trim() : (envKey || DEFAULT_SUPABASE_ANON_KEY);

  return {
    url: finalUrl,
    anonKey: finalKey,
    autoSync: savedAutoSync === null ? true : savedAutoSync === 'true',
  };
}

export function saveSupabaseConfig(config: Partial<SupabaseConfig>) {
  if (config.url !== undefined) {
    const clean = normalizeSupabaseUrl(config.url);
    localStorage.setItem(STORAGE_KEY_URL, clean);
  }
  if (config.anonKey !== undefined) {
    localStorage.setItem(STORAGE_KEY_ANON_KEY, config.anonKey.trim());
  }
  if (config.autoSync !== undefined) {
    localStorage.setItem(STORAGE_KEY_AUTO_SYNC, String(config.autoSync));
  }
  cachedClient = null;
  lastClientKey = '';
}

let cachedClient: SupabaseClient | null = null;
let lastClientKey = '';

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
    cachedClient = createClient(config.url, config.anonKey);
    lastClientKey = clientKey;
    return cachedClient;
  } catch (error) {
    console.error('Error al inicializar cliente de Supabase:', error);
    return null;
  }
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

-- Asegurar que las columnas opcionales y nuevas no bloqueen inscripciones públicas
ALTER TABLE IF EXISTS biblical_characters ALTER COLUMN escena DROP NOT NULL;
ALTER TABLE IF EXISTS biblical_characters ALTER COLUMN ensenanza DROP NOT NULL;
ALTER TABLE IF EXISTS biblical_characters ALTER COLUMN escena SET DEFAULT '';
ALTER TABLE IF EXISTS biblical_characters ALTER COLUMN ensenanza SET DEFAULT '';
ALTER TABLE IF EXISTS biblical_characters ADD COLUMN IF NOT EXISTS iglesia TEXT DEFAULT '';

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

-- CREAR POLÍTICAS DE LECTURA Y ESCRITURA PÚBLICAS (ANON KEY)
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['attendees', 'church_events', 'clubs', 'club_activities', 'club_transactions', 'camporee_shirts', 'club_enrollments', 'app_users', 'church_store', 'church_photos', 'biblical_characters'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public select on %I" ON %I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "Public select on %I" ON %I FOR SELECT USING (true);', tbl, tbl);

    EXECUTE format('DROP POLICY IF EXISTS "Public insert on %I" ON %I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "Public insert on %I" ON %I FOR INSERT WITH CHECK (true);', tbl, tbl);

    EXECUTE format('DROP POLICY IF EXISTS "Public update on %I" ON %I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "Public update on %I" ON %I FOR UPDATE USING (true);', tbl, tbl);

    EXECUTE format('DROP POLICY IF EXISTS "Public delete on %I" ON %I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "Public delete on %I" ON %I FOR DELETE USING (true);', tbl, tbl);
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
    // 1. Always save atomic snapshot in church_store for instant backup integrity
    const { error: storeError } = await client
      .from('church_store')
      .upsert(
        {
          id: 'main_church_data',
          data: payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

    // 2. Also sync to individual relational tables if they exist
    try {
      if (payload.attendees && payload.attendees.length > 0) {
        const attendeeRecords = payload.attendees.map((a) => ({
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

      if (payload.events && payload.events.length > 0) {
        const eventRecords = payload.events.map((e) => ({
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

      if (payload.clubs && payload.clubs.length > 0) {
        const clubRecords = payload.clubs.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description || '',
          color: c.color || 'blue',
        }));
        await client.from('clubs').upsert(clubRecords, { onConflict: 'id' });
      }

      if (payload.clubActivities && payload.clubActivities.length > 0) {
        const actRecords = payload.clubActivities.map((a) => ({
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

      if (payload.clubTransactions && payload.clubTransactions.length > 0) {
        const txRecords = payload.clubTransactions.map((t) => ({
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

      if (payload.users && payload.users.length > 0) {
        const userRecords = payload.users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          password: u.password,
          role: u.role,
          last_login: u.lastLogin || null,
        }));
        await client.from('app_users').upsert(userRecords, { onConflict: 'id' });
      }

      // Sync Biblical Characters Contest Registrations
      if (payload.biblicalCharacters && payload.biblicalCharacters.length > 0) {
        const characterRecords = payload.biblicalCharacters.map((b) => ({
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
        await client.from('biblical_characters').upsert(characterRecords, { onConflict: 'id' });
      }

      // 3. Sync Photos to church_photos table in batches of 5
      if (payload.photos && payload.photos.length > 0) {
        const photoRecords = payload.photos.map((p) => ({
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
      }
    } catch (storeErr) {
      console.warn('Could not read from church_store, trying relational tables...', storeErr);
    }

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

      if (!charsError && charsData && charsData.length > 0) {
        const mappedChars: BiblicalCharacterRegistration[] = charsData.map((row: any) => ({
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
        }));

        if (!pulledPayload) {
          pulledPayload = {
            version: 1,
            exportedAt: new Date().toISOString(),
            attendees: [],
            events: [],
            zones: [],
            biblicalCharacters: mappedChars,
          };
        } else {
          // Merge registrations, keeping newest
          const existingMap = new Map((pulledPayload.biblicalCharacters || []).map((c) => [c.id, c]));
          mappedChars.forEach((c) => existingMap.set(c.id, c));
          pulledPayload.biblicalCharacters = Array.from(existingMap.values());
        }
      }
    } catch (charErr) {
      console.warn('Could not read from biblical_characters table:', charErr);
    }

    // 3. Fallback: If church_store was empty, try reading relational tables
    if (!pulledPayload) {
      try {
        const [attRes, evtRes, clubRes, actRes, txRes, userRes] = await Promise.all([
          client.from('attendees').select('*'),
          client.from('church_events').select('*'),
          client.from('clubs').select('*'),
          client.from('club_activities').select('*'),
          client.from('club_transactions').select('*'),
          client.from('app_users').select('*'),
        ]);

        const hasAnyRelational = (attRes.data && attRes.data.length > 0) ||
          (evtRes.data && evtRes.data.length > 0) ||
          (clubRes.data && clubRes.data.length > 0);

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
            users: (userRes.data || []).map((row: any) => ({
              id: row.id,
              name: row.name,
              email: row.email,
              password: row.password,
              role: row.role,
              createdAt: row.created_at || new Date().toISOString(),
              lastLogin: row.last_login || undefined,
            })),
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

    const timestamp = updatedAtStr ? new Date(updatedAtStr).toLocaleString('es-ES') : 'recientemente';
    return {
      success: true,
      data: pulledPayload,
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

  // 1. Direct upsert into relational table 'biblical_characters'
  try {
    const record = {
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
    const { error } = await client.from('biblical_characters').upsert(record, { onConflict: 'id' });
    if (!error) {
      tableSaved = true;
    } else {
      console.warn('Upsert en biblical_characters falló:', error);
      errorDetail = error.message;
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
    let charactersMap = new Map<string, BiblicalCharacterRegistration>();
    let pulledConfig: ContestCustomConfig | undefined = undefined;

    // 1. Try reading from church_store
    try {
      const { data: storeData, error: storeError } = await client
        .from('church_store')
        .select('data')
        .eq('id', 'main_church_data')
        .maybeSingle();

      if (!storeError && storeData && storeData.data) {
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

    // 2. Try reading from biblical_characters table
    try {
      const { data: tableRows, error: tableError } = await client
        .from('biblical_characters')
        .select('*')
        .order('fecha', { ascending: false });

      if (!tableError && Array.isArray(tableRows)) {
        tableRows.forEach((row: any) => {
          charactersMap.set(row.id, {
            id: row.id,
            nombre: row.nombre,
            edad: row.edad || '',
            contacto: row.contacto,
            iglesia: row.iglesia || '',
            personaje: row.personaje,
            escena: row.escena || '',
            utileria: row.utileria || '',
            audio: row.audio || 'No',
            ensenanza: row.ensenanza || '',
            fecha: row.fecha,
            aprobado: !!row.aprobado,
            notasOrganizador: row.notas_organizador || '',
          });
        });
      }
    } catch (e) {
      console.warn('Error reading biblical_characters table:', e);
    }

    const charactersList = Array.from(charactersMap.values());
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
