/**
 * Supabase Client Configuration (Frontend)
 * Provides typed Supabase client for React frontend
 */

import { createClient } from '@supabase/supabase-js';

// Environment variables (Vite exposes these with VITE_ prefix)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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

