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

const getEnvVar = (key: string): string | undefined => {
  try {
    // @ts-ignore - Access Vite's import.meta.env
    return import.meta.env?.[key];
  } catch (e) {
    return undefined;
  }
};

// Detect if we're running in Netlify environment
const isNetlifyEnvironment = (): boolean => {
  // Check for Netlify-specific environment variables
  if (typeof window !== 'undefined') {
    // Client-side detection
    return window.location.hostname.includes('netlify.app') || 
           !!document.querySelector('meta[name="netlify"]') ||
           // Check if we're accessing Netlify functions
           window.location.pathname.includes('/.netlify/functions/');
  }
  return false;
};

export const ENV = {
  NODE_ENV: getMode(),
  VITE_API_URL: getEnvVar('VITE_API_URL'),
  VITE_WS_URL: getEnvVar('VITE_WS_URL'),
  VITE_SERVER_PORT: getEnvVar('VITE_SERVER_PORT') || DEFAULT_SERVER_PORT.toString(),
  IS_NETLIFY: isNetlifyEnvironment(),
} as const

export const isDevelopment = ENV.NODE_ENV === 'development'
export const isProduction = ENV.NODE_ENV === 'production' || ENV.IS_NETLIFY
export const isNetlify = ENV.IS_NETLIFY

// API URL detection with consistent port handling
export function getApiBaseUrl(): string {
  // If we're in Netlify, use relative paths for API
  if (isNetlify) {
    return '';
  }
  return getConfigApiBaseUrl();
}

// WebSocket URL detection with consistent port handling
export function getWebSocketUrl(): string {
  // WebSockets aren't supported in Netlify functions
  if (isNetlify) {
    return '';
  }
  return getConfigWebSocketUrl();
}

// Feature flags with environment-specific overrides
export const FEATURES = {
  ENABLE_ANALYTICS: true,
  ENABLE_AI_INSIGHTS: true,
  ENABLE_REAL_TIME: !isNetlify, // Disable real-time features in Netlify
  ENABLE_NOTIFICATIONS: false, // Not implemented yet
  ENABLE_AUTH: false, // Not implemented yet
  ENABLE_WEB_EXTRACTION: !isNetlify, // Web extraction not available in Netlify
  ENABLE_VISUAL_COMPARISON: true,
} as const

// Debug utilities
export function logEnvironmentInfo() {
  if (isDevelopment || (typeof window !== 'undefined' && window.location.search.includes('debug'))) {
    console.group('🔧 Environment Configuration')
    console.log('NODE_ENV:', ENV.NODE_ENV)
    console.log('Is Production:', isProduction)
    console.log('Is Netlify:', isNetlify)
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