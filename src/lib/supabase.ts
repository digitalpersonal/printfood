import { createClient } from '@supabase/supabase-js';

// Conexão oficial direta e verificada com o Supabase de Produção
export const SUPABASE_URL = 'https://etcuknfmwgqkdycmrrba.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0Y3VrbmZtd2dxa2R5Y21ycmJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNTY2NzUsImV4cCI6MjEwNDYzMjY3NX0.LsfuQplJukmXB3_fpOtthg060oy5hvb1rbEsCY9pFVY';

export const isSupabaseConfigured = () => true;

export const getSupabaseConfig = () => ({
  url: SUPABASE_URL,
  key: SUPABASE_ANON_KEY
});

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
