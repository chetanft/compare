/**
 * Centralized port configuration for the frontend
 * This ensures consistent port usage across the frontend application
 */

// Default port for the backend server
export const DEFAULT_SERVER_PORT = 3007;

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
  
  // Parse the port from environment or use default
  const port = definedPort || (envPort ? parseInt(envPort, 10) : DEFAULT_SERVER_PORT);
  
  return port;
}

// Get the API base URL with the correct port
export function getApiBaseUrl(): string {
  const env = import.meta.env;
  
  // Use explicit environment variable if set
  if (env.VITE_API_URL) {
    return env.VITE_API_URL;
  }

  // In development with Vite dev server, use the proxy
  if (env.MODE === 'development') {
    return ''; // Empty string will use the current origin with Vite's proxy
  }

  // For production, use the server port
  const port = getServerPort();
  return `http://localhost:${port}`;
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
  return `ws://localhost:${port}`;
} 