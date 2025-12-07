/**
 * Supabase Client Configuration (Frontend)
 * Provides typed Supabase client for React frontend
 */

import { createClient } from '@supabase/supabase-js';

declare const window: Window & { __env?: Record<string, string> };
declare const process: { env?: Record<string, string | undefined> };

  // Resolve environment variables from multiple sources so SaaS builds (Vercel) work
  const resolveEnv = (key: string): string | undefined => {
    const viteValue = (import.meta.env as Record<string, string | undefined>)[key];
    if (viteValue) {
      return viteValue as string;
    }

  if (typeof window !== 'undefined' && window.__env?.[key]) {
    return window.__env[key];
  }

  if (typeof process !== 'undefined' && process.env?.[key]) {
    return process.env[key];
  }

  return undefined;
};

const supabaseUrl = resolveEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = resolveEnv('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase not configured - Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

/**
 * Create Supabase client for frontend
 * Uses anon key with RLS enforcement
 */
export function createSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });
}

/**
 * Default Supabase client instance
 * Returns null if not configured (allows graceful degradation)
 */
export const supabase = supabaseUrl && supabaseAnonKey
  ? createSupabaseClient()
  : null;
