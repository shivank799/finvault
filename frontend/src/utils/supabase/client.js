import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.REACT_APP_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

let browserClient;

export function hasSupabaseConfig() {
  return Boolean(supabaseUrl && supabaseKey);
}

export function getSupabaseBrowserClient() {
  if (!hasSupabaseConfig()) {
    throw new Error('Supabase environment variables are missing in the frontend app.');
  }

  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return browserClient;
}

export default getSupabaseBrowserClient;
