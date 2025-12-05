/**
 * Auth Middleware for Vercel Serverless Functions
 * Validates Supabase JWT tokens
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

/**
 * Verify Supabase JWT token and return user
 */
export async function verifyAuth(req: VercelRequest) {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return { user: null, error: 'Missing or invalid authorization header' };
    }

    const token = authHeader.split(' ')[1];

    if (!supabaseUrl || !supabaseServiceKey) {
        return { user: null, error: 'Supabase not configured' };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
        return { user: null, error: error?.message || 'Invalid token' };
    }

    return { user, error: null };
}

/**
 * Middleware wrapper for authenticated endpoints
 */
export function withAuth(
    handler: (req: VercelRequest, res: VercelResponse, user: any) => Promise<void>
) {
    return async (req: VercelRequest, res: VercelResponse) => {
        // CORS preflight
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        const { user, error } = await verifyAuth(req);

        if (!user) {
            return res.status(401).json({ error: error || 'Unauthorized' });
        }

        return handler(req, res, user);
    };
}

/**
 * Get current user from request
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { user, error } = await verifyAuth(req);

    if (!user) {
        return res.status(401).json({ error: error || 'Unauthorized' });
    }

    return res.status(200).json({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
    });
}
