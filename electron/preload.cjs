/**
 * Electron Preload Script
 * Exposes server control APIs to the renderer process
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose server control APIs to the renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Server control methods
  serverControl: {
    getStatus: () => ipcRenderer.invoke('server-control:status'),
    start: () => ipcRenderer.invoke('server-control:start'),
    stop: () => ipcRenderer.invoke('server-control:stop'),
    restart: () => ipcRenderer.invoke('server-control:restart'),
  },

  // Platform detection
  platform: {
    isElectron: true,
    os: process.platform
  }
});

// Expose runtime environment variables to the renderer for API base URL resolution
try {
  const port = process.env.PORT || process.env.SERVER_PORT || '3847';
  const apiUrl = process.env.VITE_API_URL || `http://localhost:${port}`;
  const wsUrl = process.env.VITE_WS_URL || `ws://localhost:${port}`;
  contextBridge.exposeInMainWorld('__env', {
    VITE_API_URL: apiUrl,
    VITE_WS_URL: wsUrl,
    VITE_SERVER_PORT: String(port),
  });
  console.log('🌐 Exposed runtime __env to renderer:', { apiUrl, wsUrl, port });
} catch (e) {
  // Ignore runtime env exposure errors
}


console.log('🔧 Electron preload script loaded');