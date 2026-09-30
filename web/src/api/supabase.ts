import { createClient } from '@supabase/supabase-js';

const defaultUrl = 'https://wyvaqahmlgwavaupwluw.supabase.co';

export const getSupabaseConfig = () => {
  const url = import.meta.env.VITE_SUPABASE_URL || defaultUrl;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('haziniy_anon_key') || '' : '';
  const anonKey = envKey || localKey;

  return {
    url,
    anonKey,
    isConfigured: !!anonKey && anonKey !== 'placeholder-key',
  };
};

const config = getSupabaseConfig();

export const supabase = createClient(
  config.url,
  config.anonKey || 'placeholder-key-to-prevent-crash',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
