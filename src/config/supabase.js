/**
 * Supabase Client Configuration (JavaScript)
 * Provides Supabase client for backend Node.js server
 */

import { createClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl) {
    console.warn('⚠️ SUPABASE_URL not configured - Supabase features disabled');
}

/**
 * Create public Supabase client (for authenticated requests)
 * Uses anon key with RLS enforcement
 */
export function createPublicClient() {
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
    }

    return createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            autoRefreshToken: true,
            persistSession: false, // Server-side doesn't persist sessions
            detectSessionInUrl: false
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
 * Get Supabase client instance (public or service)
 * Returns null if not configured
 */
export function getSupabaseClient(useServiceKey = false) {
    if (!supabaseUrl) {
        return null;
    }

    try {
        if (useServiceKey) {
            return createServiceClient();
        } else {
            return createPublicClient();
        }
    } catch (error) {
        console.warn('⚠️ Failed to create Supabase client:', error.message);
        return null;
    }
}

/**
 * Default public client instance (null if not configured)
 */
export const supabase = supabaseUrl && supabaseAnonKey
    ? getSupabaseClient(false)
    : null;

