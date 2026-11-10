/**
 * Migration script: Reads local-demo-user.json and writes into Supabase table user_career_states
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://fsxooysamvccofwoineb.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const jsonPath = path.resolve(__dirname, '../data/local-demo-user.json');
  if (!fs.existsSync(jsonPath)) {
    console.log('No local-demo-user.json found to migrate.');
    return;
  }

  const raw = fs.readFileSync(jsonPath, 'utf8').replace(/^\uFEFF/, '');
  const state = JSON.parse(raw);

  const payload = {
    user_id: 'local-demo-user',
    profile: state.profile || {},
    resume: state.resume || null,
    analysis: state.analysis || null,
    analysis_cache: state.analysis_cache || null,
    roadmap: state.roadmap || null,
    roadmap_cache: state.roadmap_cache || null,
    jobs: state.jobs || null,
    updated_at: new Date().toISOString(),
  };

  console.log('Attempting to sync local-demo-user state to Supabase table user_career_states...');
  const { data, error } = await supabase
    .from('user_career_states')
    .upsert(payload, { onConflict: 'user_id' })
    .select();

  if (error) {
    console.error('Migration failed:', error.message);
    if (error.code === 'PGRST205') {
      console.log('\n[NOTE] Table public.user_career_states was not found in schema cache.');
      console.log('Please ensure the SQL query has been executed in your Supabase SQL Editor and committed.');
    }
  } else {
    console.log('Migration successful! Synced row:', data);
  }
}

run().catch(console.error);
