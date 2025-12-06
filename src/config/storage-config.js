/**
 * Storage Configuration
 * Detects storage mode and provides appropriate StorageProvider instance
 */

import { LocalStorageProvider } from '../storage/LocalStorageProvider.js';
import { SupabaseStorageProvider } from '../storage/SupabaseStorageProvider.js';

let storageProviderInstance = null;
let storageMode = null;

/**
 * Detect storage mode based on environment
 * @returns {'local'|'supabase'} Storage mode
 */
export function detectStorageMode() {
  // Check if Supabase is configured
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  
  if (supabaseUrl) {
    // Check if we're in SaaS mode (Vercel) or desktop with Supabase configured
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
    
    if (isVercel) {
      return 'supabase'; // SaaS mode always uses Supabase
    }
    
    // Desktop mode with Supabase configured - can use either
    // Default to local, but can be overridden via env var
    return process.env.STORAGE_MODE === 'supabase' ? 'supabase' : 'local';
  }
  
  return 'local'; // Default to local filesystem
}

/**
 * Get storage provider instance
 * @param {string} [userId] - User ID for Supabase storage (optional for local)
 * @returns {StorageProvider} Storage provider instance
 */
export function getStorageProvider(userId = null) {
  // Return cached instance if mode hasn't changed
  const currentMode = detectStorageMode();
  
  if (storageProviderInstance && storageMode === currentMode) {
    // Update userId if provided and using Supabase
    if (currentMode === 'supabase' && userId && storageProviderInstance.userId !== userId) {
      storageProviderInstance.userId = userId;
    }
    return storageProviderInstance;
  }
  
  // Create new instance based on mode
  storageMode = currentMode;
  
  if (storageMode === 'supabase') {
    try {
      storageProviderInstance = new SupabaseStorageProvider(userId);
    } catch (error) {
      console.warn('⚠️ Failed to initialize Supabase storage, falling back to local:', error.message);
      storageProviderInstance = new LocalStorageProvider();
      storageMode = 'local';
    }
  } else {
    storageProviderInstance = new LocalStorageProvider();
  }
  
  return storageProviderInstance;
}

/**
 * Check if Supabase storage is available
 * @returns {Promise<boolean>} Availability status
 */
export async function isSupabaseStorageAvailable() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    return false;
  }
  
  try {
    const provider = new SupabaseStorageProvider();
    return await provider.isAvailable();
  } catch (error) {
    return false;
  }
}

/**
 * Get current storage mode
 * @returns {'local'|'supabase'} Current storage mode
 */
export function getStorageMode() {
  if (!storageMode) {
    storageMode = detectStorageMode();
  }
  return storageMode;
}

/**
 * Reset storage provider instance (useful for testing or mode changes)
 */
export function resetStorageProvider() {
  storageProviderInstance = null;
  storageMode = null;
}

export default {
  detectStorageMode,
  getStorageProvider,
  isSupabaseStorageAvailable,
  getStorageMode,
  resetStorageProvider
};
