/**
 * Centralized port configuration for the frontend
 * This ensures consistent port usage across the frontend application
 */

// Default port for the backend server (web app)
export const DEFAULT_SERVER_PORT = 3007;

// macOS app port
export const MACOS_APP_PORT = 3007;

// Function to detect if we're running in Electron (macOS app)
export function isElectronApp(): boolean {
  return typeof window !== 'undefined' && 
         (window.navigator.userAgent.includes('Electron') || 
          // @ts-ignore - Check for Electron APIs
          window.require !== undefined ||
          // @ts-ignore - Check for process in renderer
          (window.process && window.process.type === 'renderer'));
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
    console.log('🖥️ Detected Electron app, using macOS app port:', MACOS_APP_PORT);
    return MACOS_APP_PORT;
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
  const env = import.meta.env;
  
  // Use explicit environment variable if set
  if (env.VITE_API_URL) {
    return env.VITE_API_URL;
  }

  // In development with Vite dev server, use the explicit URL to the backend server
  if (env.MODE === 'development') {
    console.log(`Using API base URL: http://localhost:${getServerPort()}`);
    return `http://localhost:${getServerPort()}`; // Use explicit URL to backend
  }

  // For production, use relative URL to work with Netlify functions
  return '';  // Empty string will use the current origin
}

// Get WebSocket URL with the correct port
export function getWebSocketUrl(): string {
  const env = import.meta.env;
  
  // Use explicit environment variable if set
  if (env.VITE_WS_URL) {
    return env.VITE_WS_URL;
  }

  // In development, use the server port
  const port = getServerPort();
  
  // In production, WebSockets are not supported with Netlify functions
  if (env.MODE === 'production') {
    return ''; // Will be handled gracefully by the app
  }
  
  return `ws://localhost:${port}`;
} 