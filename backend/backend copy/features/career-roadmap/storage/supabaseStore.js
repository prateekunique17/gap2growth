// Supabase storage driver for user career states
const { createClient } = require('@supabase/supabase-js');
const jsonStore = require('./jsonStore');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}

function safeId(value) {
  const id = String(value || '').trim();
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) {
    throw Object.assign(new Error('Invalid user id'), { statusCode: 400 });
  }
  return id;
}

const defaultEmptyState = {
  profile: null,
  resume: null,
  analysis: null,
  analysis_cache: null,
  roadmap: null,
  roadmap_cache: null,
  jobs: null,
  updated_at: null,
};

async function readState(id) {
  const userId = safeId(id);

  if (!supabase || process.env.STORAGE_DRIVER === 'json') {
    return jsonStore.readState(userId);
  }

  try {
    const { data, error } = await supabase
      .from('user_career_states')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[supabaseStore] Failed to read from Supabase, falling back to JSON:', error.message);
      return jsonStore.readState(userId);
    }

    if (!data) {
      // Check local JSON store as fallback if not yet migrated
      const local = await jsonStore.readState(userId);
      if (local && (local.resume || local.analysis || local.roadmap)) {
        return local;
      }
      return { ...defaultEmptyState };
    }

    return {
      profile: data.profile || null,
      resume: data.resume || null,
      analysis: data.analysis || null,
      analysis_cache: data.analysis_cache || null,
      roadmap: data.roadmap || null,
      roadmap_cache: data.roadmap_cache || null,
      jobs: data.jobs || null,
      updated_at: data.updated_at || null,
    };
  } catch (err) {
    console.warn('[supabaseStore] Read exception, falling back to JSON:', err.message);
    return jsonStore.readState(userId);
  }
}

async function writeState(id, state) {
  const userId = safeId(id);

  // Always write to JSON backup as well for safety
  try {
    await jsonStore.writeState(userId, state);
  } catch (jsonErr) {
    console.warn('[supabaseStore] JSON backup write error:', jsonErr.message);
  }

  if (!supabase || process.env.STORAGE_DRIVER === 'json') {
    return state;
  }

  try {
    const payload = {
      user_id: userId,
      profile: state.profile || {},
      resume: state.resume || null,
      analysis: state.analysis || null,
      analysis_cache: state.analysis_cache || null,
      roadmap: state.roadmap || null,
      roadmap_cache: state.roadmap_cache || null,
      jobs: state.jobs || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('user_career_states')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) {
      console.error('[supabaseStore] Upsert to Supabase failed:', error.message, error.hint || '');
    } else {
      console.log(`[supabaseStore] Synced state for user ${userId} to Supabase successfully.`);
    }
  } catch (err) {
    console.error('[supabaseStore] Write exception:', err.message);
  }

  return state;
}

async function updateState(id, change) {
  const userId = safeId(id);
  const current = await readState(userId);
  const next = await change(current);
  await writeState(userId, next);
  return next;
}

async function clearState(id) {
  const userId = safeId(id);
  try {
    await jsonStore.clearState(userId);
  } catch (e) {}

  if (supabase && process.env.STORAGE_DRIVER !== 'json') {
    try {
      await supabase.from('user_career_states').delete().eq('user_id', userId);
    } catch (err) {
      console.warn('[supabaseStore] Clear state error in Supabase:', err.message);
    }
  }
}

module.exports = {
  readState,
  writeState,
  updateState,
  clearState,
  supabase,
};

