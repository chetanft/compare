import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (data) => ipcRenderer.invoke('dialog:saveFile', data),
  
  // Notifications
  showNotification: (message) => ipcRenderer.invoke('notification:show', message),
  
  // App info
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  
  // Menu events
  onMenuAction: (callback) => ipcRenderer.on('menu-action', callback),
  
  // Platform info
  platform: process.platform,
  
  // Development helpers
  isDev: process.env.NODE_ENV === 'development'
});

// DOM ready
window.addEventListener('DOMContentLoaded', () => {
  console.log('Electron preload script loaded');
});
