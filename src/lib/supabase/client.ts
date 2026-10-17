import { createBrowserClient } from '@supabase/ssr';

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  if (url.includes('your_supabase') || key.includes('your_supabase')) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function createClient() {
  const configured = isSupabaseConfigured();
  const supabaseUrl = configured
    ? process.env.NEXT_PUBLIC_SUPABASE_URL!
    : 'https://placeholder-project.supabase.co';
  const supabaseKey = configured
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key';

  return createBrowserClient(
    supabaseUrl,
    supabaseKey
  );
}
