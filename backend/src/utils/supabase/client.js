'use strict';

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  process.env.SUPABASE_PUBLISHABLE_DEFAULT_KEY;

function assertSupabaseConfig() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables are missing in the backend app.');
  }
}

function buildClient(options = {}) {
  assertSupabaseConfig();

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    ...options,
  });
}

function getSupabaseClient() {
  return buildClient();
}

function createRequestSupabaseClient(accessToken) {
  if (!accessToken) {
    return buildClient();
  }

  return buildClient({
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

module.exports = {
  createRequestSupabaseClient,
  getSupabaseClient,
};
