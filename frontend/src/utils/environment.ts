// Environment configuration utilities
import { DEFAULT_SERVER_PORT, getServerPort, getApiBaseUrl as getConfigApiBaseUrl, getWebSocketUrl as getConfigWebSocketUrl } from '../config/ports';

// Safely access environment variables
const getMode = (): string => {
  try {
    // @ts-ignore - Access Vite's import.meta.env
    return import.meta.env?.MODE || 'development';
  } catch (e) {
    return 'development';
  }
};

export const getEnvVar = (key: string, defaultValue: string = ''): string => {
  // In Vite, environment variables are prefixed with VITE_
  const viteKey = `VITE_${key}`
  
  if (import.meta.env[viteKey]) {
    return import.meta.env[viteKey] as string
  }
  
  // Fallback to window.__env if available (for runtime environment variables)
  if (typeof window !== 'undefined' && window.__env && window.__env[key]) {
    return window.__env[key]
  }
  
  return defaultValue
}

export const ENV = {
  NODE_ENV: getMode(),
  VITE_API_URL: getEnvVar('VITE_API_URL'),
  VITE_WS_URL: getEnvVar('VITE_WS_URL'),
  VITE_SERVER_PORT: getEnvVar('VITE_SERVER_PORT') || DEFAULT_SERVER_PORT.toString(),
} as const

export const isDevelopment = ENV.NODE_ENV === 'development'
export const isProduction = ENV.NODE_ENV === 'production' || import.meta.env.PROD

// API URL detection with consistent port handling
export function getApiBaseUrl(): string {
  return getConfigApiBaseUrl();
}

// WebSocket URL detection with consistent port handling
export function getWebSocketUrl(): string {
  return getConfigWebSocketUrl();
}

// Feature flags with environment-specific overrides
export const FEATURES = {
  ENABLE_ANALYTICS: true,
  ENABLE_AI_INSIGHTS: true,
  ENABLE_REAL_TIME: true,
  ENABLE_NOTIFICATIONS: false, // Not implemented yet
  ENABLE_AUTH: false, // Not implemented yet
  ENABLE_WEB_EXTRACTION: true,
  ENABLE_VISUAL_COMPARISON: true,
} as const

// Debug utilities
export function logEnvironmentInfo() {
  if (isDevelopment || (typeof window !== 'undefined' && window.location.search.includes('debug'))) {
    console.group('🔧 Environment Configuration')
    console.log('NODE_ENV:', ENV.NODE_ENV)
    console.log('Is Production:', isProduction)
    console.log('API Base URL:', getApiBaseUrl())
    console.log('WebSocket URL:', getWebSocketUrl())
    console.log('Server Port:', getServerPort())
    console.log('Current Origin:', typeof window !== 'undefined' ? window.location.origin : 'N/A')
    console.log('Current Port:', typeof window !== 'undefined' ? window.location.port : 'N/A')
    console.log('Features:', FEATURES)
    console.groupEnd()
  }
}

// Call on app initialization
if (isDevelopment) {
  logEnvironmentInfo()
}

// Add this to global Window interface
declare global {
  interface Window {
    __env?: Record<string, string>
  }
} 