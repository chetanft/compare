/**
 * Authentication Middleware
 * Extracts and validates Supabase user session from requests
 */

import { getSupabaseClient } from '../config/supabase.js';

/**
 * Extract user from request (optional auth)
 * Adds req.user if authenticated, otherwise req.user is null
 */
export async function extractUser(req, res, next) {
  req.user = null;
  
  // Check for Supabase session token
  const authHeader = req.headers.authorization || req.headers.Authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    // No auth header - continue without user (for public endpoints)
    return next();
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const supabase = getSupabaseClient(false);
    if (!supabase) {
      return next(); // Supabase not configured, continue without user
    }
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (!error && user) {
      req.user = user;
    }
  } catch (error) {
    console.warn('Auth extraction error:', error.message);
  }
  
  next();
}

/**
 * Require authentication middleware
 * Returns 401 if user is not authenticated
 */
export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  next();
}

/**
 * Optional auth middleware
 * Continues whether authenticated or not
 */
export function optionalAuth(req, res, next) {
  extractUser(req, res, next);
}
