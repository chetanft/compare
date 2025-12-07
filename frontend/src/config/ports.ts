/**
 * Centralized port configuration for the frontend
 * This ensures consistent port usage across the frontend application
 */

// Determine the unified server port (defaults to 3847 for both web + mac)
const resolveConfiguredPort = (): number => {
  const envPort = (typeof import.meta !== 'undefined' && import.meta.env)
    ? import.meta.env.VITE_SERVER_PORT
    : undefined;

  const parsed = envPort ? parseInt(envPort, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : 3847;
};

export const APP_SERVER_PORT = resolveConfiguredPort();

// Default port for the backend server (web app) - Unified Architecture  
export const DEFAULT_SERVER_PORT = APP_SERVER_PORT;

// macOS app port - Uses same unified port
export const MACOS_APP_PORT = APP_SERVER_PORT;

// Function to detect if we're running in Electron (macOS app)
export function isElectronApp(): boolean {
  return typeof window !== 'undefined' && 
         (window.navigator.userAgent.includes('Electron') || 
          // @ts-ignore - Check for Electron APIs
          window.require !== undefined ||
          // @ts-ignore - Check for process in renderer
          (window.process && window.process.type === 'renderer'));
}

// Function to detect if we're running in Electron environment (e.g., Electron app or renderer)
export function isElectronEnvironment(): boolean {
  return typeof window !== 'undefined' && !!(window as any).electronAPI;
}

// Type declaration for Vite's import.meta.env
interface ImportMetaEnv {
  MODE: string;
  VITE_SERVER_PORT?: string;
  VITE_API_URL?: string;
  VITE_WS_URL?: string;
  [key: string]: any;
}

// Augment the import.meta
declare global {
  interface ImportMeta {
    env: ImportMetaEnv;
  }
}

// Get the server port from environment variables or use the default
export function getServerPort(): number {
  // Check for the global __SERVER_PORT__ defined in vite.config.ts
  // @ts-ignore - This is defined in vite.config.ts
  const definedPort = typeof __SERVER_PORT__ !== 'undefined' ? __SERVER_PORT__ : null;
  
  // Check for environment variable
  const env = import.meta.env;
  const envPort = env.VITE_SERVER_PORT;
  
  // Auto-detect port based on environment
  if (!definedPort && !envPort && isElectronApp()) {
    console.log('🖥️ Detected Electron app, using unified server port:', APP_SERVER_PORT);
    return APP_SERVER_PORT; // Use unified port for consistency
  }
  
  // Parse the port from environment or use default
  const port = definedPort || (envPort ? parseInt(envPort, 10) : DEFAULT_SERVER_PORT);
  
  if (!definedPort && !envPort) {
    console.log('🌐 Detected web app, using web app port:', port);
  }
  
  return port;
}

// Get the API base URL with the correct port
export function getApiBaseUrl(): string {
  const envApiUrl = (typeof import.meta !== 'undefined' && import.meta.env)
    ? import.meta.env.VITE_API_URL
    : undefined;

  if (envApiUrl) {
    return envApiUrl;
  }

  if (typeof window !== 'undefined') {
    const runtimeApiUrl = (window as any).__env?.VITE_API_URL;
    if (runtimeApiUrl) {
      return runtimeApiUrl;
    }

    const origin = window.location?.origin;
    if (origin && origin !== 'null' && !origin.startsWith('file://')) {
      return origin;
    }
  }

  return `http://localhost:${APP_SERVER_PORT}`;
}

// Get WebSocket URL with the correct port
export function getWebSocketUrl(): string {
  const env = import.meta.env;
  
  if (env.VITE_WS_URL) {
    return env.VITE_WS_URL;
  }

  if (typeof window !== 'undefined') {
    const runtimeWsUrl = (window as any).__env?.VITE_WS_URL;
    if (runtimeWsUrl) {
      return runtimeWsUrl;
    }

    const origin = window.location?.origin;
    if (origin && origin !== 'null' && !origin.startsWith('file://')) {
      const protocol = origin.startsWith('https') ? 'wss' : 'ws';
      const host = window.location.host;
      return `${protocol}://${host}`;
    }
  }
  
  return `ws://localhost:${getServerPort()}`;
}
