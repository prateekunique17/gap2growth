// Frontend configuration
// ─────────────────────────────────────────────────────────────────────
// These values are safe to include in the browser bundle:
//   • Supabase URL / anon (publishable) key — designed to be public;
//     Row Level Security on the database protects data, not the key.
//   • API base URL — a public endpoint.
//
// Local dev: override via VITE_* vars in .env.local
// Production: falls back to the hardcoded defaults below (no need to
//             set VITE_* env vars in Vercel).
// ─────────────────────────────────────────────────────────────────────

const config = {
  supabaseUrl:
    import.meta.env.VITE_SUPABASE_URL ||
    'https://pehquqbtscyalevywpum.supabase.co',

  supabaseAnonKey:
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    'sb_publishable_aYml6zeuKRzTSwiN9MB0Vg_yF32Fuze',

  apiBaseUrl:
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.PROD
      ? 'https://gap2growth.onrender.com/api/career'
      : 'http://127.0.0.1:5000/api/career'),
};

export default config;

