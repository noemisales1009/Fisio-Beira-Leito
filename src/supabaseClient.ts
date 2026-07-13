/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// Projeto compartilhado com o RoundKids — este app usa apenas as tabelas
// com prefixo "fisio_". A chave anon é pública por design; o acesso aos
// dados é controlado pelas policies (RLS) no Supabase.
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://ouybwkjapejgpuuujwgy.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91eWJ3a2phcGVqZ3B1dXVqd2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMjQzMDYsImV4cCI6MjA3ODcwMDMwNn0.3JLJqAlW0oUCk3uprCz8j3dSSm95RG0dabXEKJbRPVo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: { 'X-Client-Info': 'fisio-beira-leito-web' },
  },
});
