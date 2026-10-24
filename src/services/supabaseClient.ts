import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Attendee, ChurchEvent } from '../types';

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

export function getSupabaseConfig(): SupabaseConfig {
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
 * SQL script for Supabase SQL Editor
 */
export const SUPABASE_SQL_SETUP = `-- ============================================================
-- SCRIPT DE INICIALIZACIÓN PARA SUPABASE
-- Proyecto: ewwtdeypwetvpjjbbgdi
-- Ejecuta este código en: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- 1. Crear tabla para sincronización en tiempo real de la iglesia
create table if not exists church_store (
  id text primary key,
  data jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Habilitar seguridad de nivel de fila (Row Level Security)
alter table church_store enable row level security;

-- 3. Crear políticas para lectura y guardado con la API Key pública (anon)
drop policy if exists "Permitir lectura publica" on church_store;
create policy "Permitir lectura publica" on church_store 
  for select using (true);

drop policy if exists "Permitir guardado publico" on church_store;
create policy "Permitir guardado publico" on church_store 
  for insert with check (true);

drop policy if exists "Permitir actualizacion publica" on church_store;
create policy "Permitir actualizacion publica" on church_store 
  for update using (true);
`;

/**
 * Test connection to Supabase
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
          message: 'Conectado a Supabase, pero la tabla "church_store" aún no existe. Copia y ejecuta el script SQL provisto en el SQL Editor de Supabase.',
        };
      }
      if (error.message.toLowerCase().includes('invalid api key') || error.message.toLowerCase().includes('jwt')) {
        return {
          success: false,
          message: 'Error: Clave API no válida. Supabase requiere la clave JWT que comienza con "eyJhbGciOiJIUzI1Ni...". Búscala en Project Settings > API > Project API keys > anon public.',
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
 * Push local church state to Supabase
 */
export async function pushDataToSupabase(payload: ChurchDataPayload): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase no está configurado (falta anon key).' };
  }

  try {
    const { error } = await client
      .from('church_store')
      .upsert(
        {
          id: 'main_church_data',
          data: payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

    if (error) {
      if (error.code === '42P01') {
        return {
          success: false,
          message: 'La tabla "church_store" no existe en Supabase. Ejecuta el script SQL en Supabase.',
        };
      }
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Datos guardados y sincronizados en Supabase en la nube.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Error al guardar en Supabase' };
  }
}

/**
 * Pull church state from Supabase
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
    const { data, error } = await client
      .from('church_store')
      .select('data, updated_at')
      .eq('id', 'main_church_data')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { 
          success: false, 
          message: 'No hay datos guardados aún en Supabase para esta iglesia. Puedes hacer el primer guardado ahora.' 
        };
      }
      return { success: false, message: error.message };
    }

    if (!data || !data.data) {
      return { success: false, message: 'No se encontraron registros en Supabase.' };
    }

    return {
      success: true,
      data: data.data as ChurchDataPayload,
      message: `Datos cargados desde Supabase (actualizados el ${new Date(data.updated_at || Date.now()).toLocaleString('es-ES')}).`,
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Error al descargar datos de Supabase' };
  }
}
