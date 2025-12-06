/**
 * Database Module
 * Factory for creating database adapters based on deployment mode
 */

import { SupabaseAdapter } from './adapters/SupabaseAdapter.js';
import { SQLiteAdapter } from './adapters/SQLiteAdapter.js';
import { runMigrations, initializeSchema } from './migrations/MigrationRunner.js';
import path from 'path';
import fs from 'fs';

let adapterInstance = null;
let adapterType = null;

/**
 * Detect deployment mode
 * @returns {'supabase'|'sqlite'} Deployment mode
 */
export function detectDeploymentMode() {
  // Check explicit mode
  if (process.env.DEPLOYMENT_MODE) {
    return process.env.DEPLOYMENT_MODE === 'saas' ? 'supabase' : 'sqlite';
  }

  // Check for Supabase configuration
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;

  if (supabaseUrl && isVercel) {
    return 'supabase'; // SaaS mode always uses Supabase
  }

  // Desktop mode - default to SQLite
  return 'sqlite';
}

/**
 * Get database adapter instance
 * @param {Object} options - Adapter options
 * @param {string} [options.userId] - User ID for Supabase
 * @param {string} [options.dbPath] - Database path for SQLite
 * @returns {Promise<DatabaseAdapter>} Database adapter
 */
export async function getDatabaseAdapter(options = {}) {
  const mode = detectDeploymentMode();

  // Return cached instance if mode matches
  if (adapterInstance && adapterType === mode) {
    return adapterInstance;
  }

  // Create new adapter
  let adapter;
  if (mode === 'supabase') {
    adapter = new SupabaseAdapter(options.userId);
  } else {
    const dbPath = options.dbPath || process.env.DATABASE_URL?.replace('file:', '') || null;
    adapter = new SQLiteAdapter(dbPath);
  }

  // Connect
  await adapter.connect();

  // Initialize schema and run migrations
  try {
    await initializeSchema(adapter);
    const applied = await runMigrations(adapter);
    if (applied.length > 0) {
      console.log(`✅ Applied ${applied.length} migration(s)`);
    }
  } catch (error) {
    console.warn('⚠️ Migration failed:', error.message);
    // Continue anyway - schema might already be initialized
  }

  adapterInstance = adapter;
  adapterType = mode;

  return adapter;
}

/**
 * Reset adapter instance (useful for testing)
 */
export function resetAdapter() {
  adapterInstance = null;
  adapterType = null;
}

/**
 * Get current adapter type
 * @returns {'supabase'|'sqlite'|null} Adapter type
 */
export function getAdapterType() {
  return adapterType || detectDeploymentMode();
}

export default {
  detectDeploymentMode,
  getDatabaseAdapter,
  resetAdapter,
  getAdapterType
};

