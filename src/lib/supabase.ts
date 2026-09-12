import { createClient } from '@supabase/supabase-js';

// Fallback das chaves de produção verificadas
const FALLBACK_URL = 'https://etcuknfmwgqkdycmrrba.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0Y3VrbmZtd2dxa2R5Y21ycmJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNTY2NzUsImV4cCI6MjEwNDYzMjY3NX0.LsfuQplJukmXB3_fpOtthg060oy5hvb1rbEsCY9pFVY';

// Lê do ambiente (VITE_) ou usa o fallback seguro
let rawUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_KEY;

// Limpeza de URL (caso o usuário coloque o sufixo /rest/v1 ou barras extras no final)
if (rawUrl && rawUrl.includes('supabase.co')) {
  try {
    const urlObj = new URL(rawUrl);
    rawUrl = `${urlObj.protocol}//${urlObj.host}`;
  } catch (e) {
    rawUrl = FALLBACK_URL;
  }
}

export const SUPABASE_URL = rawUrl;
export const SUPABASE_ANON_KEY = rawKey;

export const isSupabaseConfigured = () => true;

export const getSupabaseConfig = () => ({
  url: SUPABASE_URL,
  key: SUPABASE_ANON_KEY
});

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper para gerar UUIDs válidos exigidos pelo Supabase nas chaves primárias
export function uuidv4(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // fallback
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

