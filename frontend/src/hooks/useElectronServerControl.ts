/**
 * Electron Server Control Hook
 * Manages the internal Electron server via IPC instead of HTTP API
 */

import { useState, useEffect, useCallback } from 'react';

export interface ElectronServerStatus {
  status: 'stopped' | 'starting' | 'running' | 'stopping' | 'error';
  port: number | null;
  pid: number | null;
  uptime: number;
  startTime: string | null;
  healthy: boolean;
}

export interface ElectronServerControlResult {
  success: boolean;
  message: string;
  data?: ElectronServerStatus;
}

// Check if we're running in Electron
const isElectron = () => {
  return typeof window !== 'undefined' && 
         window.electronAPI && 
         window.electronAPI.platform.isElectron;
};

export function useElectronServerControl() {
  const [serverStatus, setServerStatus] = useState<ElectronServerStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if we're in Electron
  const inElectron = isElectron();

  // Fetch server status
  const fetchStatus = useCallback(async () => {
    if (!inElectron || !window.electronAPI) return;

    try {
      const status = await window.electronAPI.serverControl.getStatus();
      setServerStatus(status);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get server status');
    }
  }, [inElectron]);

  // Start server
  const startServer = useCallback(async () => {
    if (!inElectron || !window.electronAPI) return { success: false, message: 'Not in Electron' };

    setIsLoading(true);
    setError(null);

    try {
      const result = await window.electronAPI.serverControl.start();
      await fetchStatus(); // Refresh status
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start server';
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, [inElectron, fetchStatus]);

  // Stop server
  const stopServer = useCallback(async () => {
    if (!inElectron || !window.electronAPI) return { success: false, message: 'Not in Electron' };

    setIsLoading(true);
    setError(null);

    try {
      const result = await window.electronAPI.serverControl.stop();
      await fetchStatus(); // Refresh status
      
      // Dispatch event to notify app that server was stopped
      if (result.success) {
        window.dispatchEvent(new CustomEvent('server-stopped'));
      }
      
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to stop server';
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, [inElectron, fetchStatus]);

  // Restart server
  const restartServer = useCallback(async () => {
    if (!inElectron || !window.electronAPI) return { success: false, message: 'Not in Electron' };

    setIsLoading(true);
    setError(null);

    try {
      const result = await window.electronAPI.serverControl.restart();
      await fetchStatus(); // Refresh status
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to restart server';
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, [inElectron, fetchStatus]);

  // Toggle server (start if stopped, stop if running)
  const toggleServer = useCallback(async () => {
    if (!serverStatus) return { success: false, message: 'Server status unknown' };

    if (serverStatus.status === 'running') {
      return await stopServer();
    } else if (serverStatus.status === 'stopped') {
      return await startServer();
    }

    return { success: false, message: 'Server is transitioning' };
  }, [serverStatus, startServer, stopServer]);

  // Fetch status on mount and set up polling
  useEffect(() => {
    if (!inElectron) return;

    fetchStatus();

    // Poll status every 5 seconds
    const interval = setInterval(fetchStatus, 5000);
    
    return () => clearInterval(interval);
  }, [inElectron, fetchStatus]);

  // Computed values
  const currentStatus = serverStatus?.status || 'unknown';
  const isServerRunning = currentStatus === 'running';
  const isServerStopped = currentStatus === 'stopped';
  const isTransitioning = currentStatus === 'starting' || currentStatus === 'stopping';
  const hasError = currentStatus === 'error' || !!error;

  return {
    // Status
    serverStatus,
    currentStatus,
    isServerRunning,
    isServerStopped,
    isTransitioning,
    hasError,
    isLoading,
    error,
    inElectron,
    
    // Actions
    startServer,
    stopServer,
    restartServer,
    toggleServer,
    fetchStatus
  };
}

// Type declarations for Electron API
declare global {
  interface Window {
    electronAPI?: {
      serverControl: {
        getStatus: () => Promise<ElectronServerStatus>;
        start: () => Promise<ElectronServerControlResult>;
        stop: () => Promise<ElectronServerControlResult>;
        restart: () => Promise<ElectronServerControlResult>;
      };
      platform: {
        isElectron: boolean;
        os: string;
      };
    };
  }
}
