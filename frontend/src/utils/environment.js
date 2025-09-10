/**
 * Node.js compatible environment utilities
 * This is a fallback for when the TypeScript version can't be loaded in Node.js
 */

// Simple fallback for Node.js testing
export function getApiBaseUrl() {
  // Default API base URL for testing
  return process.env.VITE_API_URL || 'http://localhost:3007';
}

export function getWebSocketUrl() {
  return process.env.VITE_WS_URL || 'ws://localhost:3007';
}

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  VITE_API_URL: process.env.VITE_API_URL,
  VITE_WS_URL: process.env.VITE_WS_URL,
  VITE_SERVER_PORT: process.env.VITE_SERVER_PORT || '3007',
};

export const isDevelopment = ENV.NODE_ENV === 'development';
export const isProduction = ENV.NODE_ENV === 'production';

export const FEATURES = {
  ENABLE_ANALYTICS: true,
  ENABLE_AI_INSIGHTS: true,
  ENABLE_REAL_TIME: true,
  ENABLE_NOTIFICATIONS: false,
  ENABLE_AUTH: false,
  ENABLE_WEB_EXTRACTION: true,
  ENABLE_VISUAL_COMPARISON: true,
};

export function logEnvironmentInfo() {
  if (isDevelopment) {
    console.log('🔧 Environment Configuration (Node.js fallback)');
    console.log('NODE_ENV:', ENV.NODE_ENV);
    console.log('API Base URL:', getApiBaseUrl());
    console.log('WebSocket URL:', getWebSocketUrl());
  }
}
