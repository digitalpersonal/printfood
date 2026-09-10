import { createClient } from '@supabase/supabase-js';

let rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Clean the URL in case the user added /rest/v1 or trailing slashes by mistake
if (rawUrl && rawUrl.includes('supabase.co')) {
  try {
    const urlObj = new URL(rawUrl);
    rawUrl = `${urlObj.protocol}//${urlObj.host}`;
  } catch (e) {
    // ignore invalid URLs here, will be caught below
  }
}

export const isSupabaseConfigured = () => {
  if (!rawUrl || !supabaseKey) return false;
  if (rawUrl === 'sua_url_aqui' || supabaseKey === 'sua_chave_anon_aqui') return false;
  try {
    new URL(rawUrl);
    return true;
  } catch {
    return false;
  }
};

// Only initialize if configured to prevent crashes on startup
export const supabase = isSupabaseConfigured() 
  ? createClient(rawUrl, supabaseKey)
  : ({} as any);
