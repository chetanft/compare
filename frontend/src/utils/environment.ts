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

export const ENV = {
  NODE_ENV: getMode(),
  VITE_API_URL: getEnvVar('VITE_API_URL'),
  VITE_WS_URL: getEnvVar('VITE_WS_URL'),
  VITE_SERVER_PORT: getEnvVar('VITE_SERVER_PORT') || DEFAULT_SERVER_PORT.toString(),
} as const

export const isDevelopment = ENV.NODE_ENV === 'development'
export const isProduction = ENV.NODE_ENV === 'production'

// API URL detection with consistent port handling
export function getApiBaseUrl(): string {
  return getConfigApiBaseUrl();
}

// WebSocket URL detection with consistent port handling
export function getWebSocketUrl(): string {
  return getConfigWebSocketUrl();
}

// Feature flags
export const FEATURES = {
  ENABLE_ANALYTICS: true,
  ENABLE_AI_INSIGHTS: true,
  ENABLE_REAL_TIME: true,
  ENABLE_NOTIFICATIONS: false, // Not implemented yet
  ENABLE_AUTH: false, // Not implemented yet
} as const

// Debug utilities
export function logEnvironmentInfo() {
  if (isDevelopment) {
    console.group('🔧 Environment Configuration')
    console.log('NODE_ENV:', ENV.NODE_ENV)
    console.log('API Base URL:', getApiBaseUrl())
    console.log('WebSocket URL:', getWebSocketUrl())
    console.log('Server Port:', getServerPort())
    console.log('Current Origin:', window.location.origin)
    console.log('Current Port:', window.location.port)
    console.log('Features:', FEATURES)
    console.groupEnd()
  }
}

// Call on app initialization
if (isDevelopment) {
  logEnvironmentInfo()
} 