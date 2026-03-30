import { useEffect } from 'react';
import { getSupabaseBrowserClient, hasSupabaseConfig } from '../utils/supabase/client';

export default function SupabaseSessionProvider({ children }) {
  useEffect(() => {
    if (!hasSupabaseConfig()) {
      return undefined;
    }

    const supabase = getSupabaseBrowserClient();

    // Boot the browser client early so persisted sessions can hydrate and refresh.
    supabase.auth.getSession().catch(() => {});

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {});

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return children;
}
