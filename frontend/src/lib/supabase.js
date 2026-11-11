import { createClient } from '@supabase/supabase-js';
import config from './config';

export const isSupabaseConfigured = Boolean(config.supabaseUrl && config.supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase is not configured. Check config.js or add VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY to .env.local'
  );
}

export const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);

