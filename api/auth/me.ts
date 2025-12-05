/**
 * Auth Middleware for Edge Functions - validates Supabase JWT tokens
 */

import { createClient } from '@supabase/supabase-js';
import { corsResponse, getEnv, jsonResponse, methodNotAllowed } from '../../vercel/edge-helpers';

export const config = {
    runtime: 'edge'
};

const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseServiceKey = getEnv('SUPABASE_SERVICE_KEY');
let cachedClient: ReturnType<typeof createClient> | null = null;

const getSupabaseClient = () => {
    if (!supabaseUrl || !supabaseServiceKey) {
        return null;
    }
    if (!cachedClient) {
        cachedClient = createClient(supabaseUrl, supabaseServiceKey);
    }
    return cachedClient;
};

/**
 * Verify Supabase JWT token and return user
 */
export async function verifyAuth(req: Request) {
    const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
        return { user: null, error: 'Missing or invalid authorization header' };
    }

    const token = authHeader.split(' ')[1];
    const supabase = getSupabaseClient();

    if (!supabase) {
        return { user: null, error: 'Supabase not configured' };
    }

    const {
        data: { user },
        error
    } = await supabase.auth.getUser(token);

    if (error || !user) {
        return { user: null, error: error?.message || 'Invalid token' };
    }

    return { user, error: null };
}

/**
 * Middleware wrapper for authenticated endpoints
 */
export function withAuth(handler: (req: Request, user: any) => Promise<Response>) {
    return async (req: Request): Promise<Response> => {
        if (req.method === 'OPTIONS') {
            return corsResponse();
        }

        const { user, error } = await verifyAuth(req);

        if (!user) {
            return jsonResponse({ error: error || 'Unauthorized' }, 401);
        }

        return handler(req, user);
    };
}

/**
 * Get current user from request
 */
export default async function handler(req: Request): Promise<Response> {
    if (req.method === 'OPTIONS') {
        return corsResponse();
    }

    if (req.method !== 'GET') {
        return methodNotAllowed(['GET']);
    }

    const { user, error } = await verifyAuth(req);

    if (!user) {
        return jsonResponse({ error: error || 'Unauthorized' }, 401);
    }

    return jsonResponse({
        id: user.id,
        email: user.email,
        created_at: user.created_at
    });
}
