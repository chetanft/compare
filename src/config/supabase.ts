/**
 * Supabase Client Configuration
 * Provides typed Supabase client for both frontend and backend
 */

import { createClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Server-side only

if (!supabaseUrl) {
    console.warn('⚠️ SUPABASE_URL not configured - Supabase features disabled');
}

/**
 * Create public Supabase client (for frontend/authenticated requests)
 * Uses anon key with RLS enforcement
 */
export function createPublicClient() {
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
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
 * Create service client (for server-side operations)
 * Uses service key to bypass RLS - USE WITH CAUTION
 */
export function createServiceClient() {
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase service key not configured. Set SUPABASE_SERVICE_KEY environment variable.');
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}

/**
 * Default public client instance
 */
export const supabase = supabaseUrl && supabaseAnonKey
    ? createPublicClient()
    : null;

/**
 * Database types (generated from schema)
 */
export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    email: string | null;
                    display_name: string | null;
                    avatar_url: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    email?: string | null;
                    display_name?: string | null;
                    avatar_url?: string | null;
                };
                Update: {
                    email?: string | null;
                    display_name?: string | null;
                    avatar_url?: string | null;
                };
            };
            saved_credentials: {
                Row: {
                    id: string;
                    user_id: string;
                    name: string;
                    url: string;
                    username_encrypted: string;
                    password_vault_id: string;
                    notes: string | null;
                    last_used_at: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    user_id: string;
                    name: string;
                    url: string;
                    username_encrypted: string;
                    password_vault_id: string;
                    notes?: string | null;
                };
                Update: {
                    name?: string;
                    url?: string;
                    username_encrypted?: string;
                    password_vault_id?: string;
                    notes?: string | null;
                    last_used_at?: string | null;
                };
            };
            comparisons: {
                Row: {
                    id: string;
                    user_id: string;
                    figma_url: string;
                    web_url: string;
                    credential_id: string | null;
                    status: 'pending' | 'processing' | 'completed' | 'failed';
                    progress: number;
                    result: Record<string, unknown> | null;
                    error_message: string | null;
                    duration_ms: number | null;
                    created_at: string;
                    completed_at: string | null;
                };
                Insert: {
                    user_id: string;
                    figma_url: string;
                    web_url: string;
                    credential_id?: string | null;
                };
                Update: {
                    status?: 'pending' | 'processing' | 'completed' | 'failed';
                    progress?: number;
                    result?: Record<string, unknown> | null;
                    error_message?: string | null;
                    duration_ms?: number | null;
                    completed_at?: string | null;
                };
            };
            design_systems: {
                Row: {
                    id: string;
                    user_id: string | null;
                    name: string;
                    slug: string;
                    is_global: boolean;
                    tokens: Record<string, unknown>;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    user_id?: string | null;
                    name: string;
                    slug: string;
                    is_global?: boolean;
                    tokens: Record<string, unknown>;
                };
                Update: {
                    name?: string;
                    slug?: string;
                    tokens?: Record<string, unknown>;
                };
            };
        };
    };
}

/**
 * Type-safe Supabase client
 */
export type SupabaseClient = ReturnType<typeof createPublicClient>;
