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

console.log('🔧 Electron preload script loaded');