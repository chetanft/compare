/**
 * Server Control Hook
 * Manages server start/stop functionality with real-time status updates
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { getApiBaseUrl } from '../config/ports';

export interface ServerStatus {
  status: 'stopped' | 'starting' | 'running' | 'stopping' | 'error';
  port: number;
  pid: number | null;
  uptime: number;
  startTime: string | null;
  healthy?: boolean;
  lastHealthCheck?: string;
}

export interface ServerControlResult {
  success: boolean;
  message: string;
  data?: ServerStatus;
  error?: string;
}

export function useServerControl() {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const apiBaseUrl = getApiBaseUrl();

  // Query server status
  const {
    data: serverStatus,
    isLoading: isLoadingStatus,
    error: statusError,
    refetch: refetchStatus
  } = useQuery<ServerControlResult>({
    queryKey: ['serverControl', 'status'],
    queryFn: async () => {
      const response = await axios.get(`${apiBaseUrl}/api/server/status`);
      return response.data;
    },
    refetchInterval: 5000, // Refetch every 5 seconds
    retry: 2,
    retryDelay: 1000
  });

  // Start server mutation
  const startServerMutation = useMutation<ServerControlResult, Error>({
    mutationFn: async () => {
      const response = await axios.post(`${apiBaseUrl}/api/server/start`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serverControl'] });
      // Refetch status immediately and then continue polling
      setTimeout(() => refetchStatus(), 1000);
    },
    onError: (error) => {
      console.error('Failed to start server:', error);
    }
  });

  // Stop server mutation
  const stopServerMutation = useMutation<ServerControlResult, Error>({
    mutationFn: async () => {
      const response = await axios.post(`${apiBaseUrl}/api/server/stop`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serverControl'] });
      setTimeout(() => refetchStatus(), 1000);
    },
    onError: (error) => {
      console.error('Failed to stop server:', error);
    }
  });

  // Restart server mutation
  const restartServerMutation = useMutation<ServerControlResult, Error>({
    mutationFn: async () => {
      const response = await axios.post(`${apiBaseUrl}/api/server/restart`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serverControl'] });
      setTimeout(() => refetchStatus(), 2000);
    },
    onError: (error) => {
      console.error('Failed to restart server:', error);
    }
  });

  // Real-time status updates via Server-Sent Events
  useEffect(() => {
    let eventSource: EventSource | null = null;

    const setupSSE = () => {
      try {
        eventSource = new EventSource(`${apiBaseUrl}/api/server/status-stream`);
        
        eventSource.onopen = () => {
          setIsConnected(true);
          console.log('🔗 Connected to server status stream');
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type !== 'heartbeat') {
              // Update the query cache with real-time data
              queryClient.setQueryData(['serverControl', 'status'], (oldData: ServerControlResult | undefined) => ({
                ...oldData,
                success: true,
                data: data
              }));

              window.dispatchEvent(new Event('server-status-updated'));
            }
          } catch (error) {
            console.error('Error parsing SSE data:', error);
          }
        };

        eventSource.onerror = (error) => {
          console.error('SSE connection error:', error);
          setIsConnected(false);
          
          // Reconnect after a delay
          setTimeout(() => {
            if (eventSource?.readyState === EventSource.CLOSED) {
              setupSSE();
            }
          }, 5000);
        };

      } catch (error) {
        console.error('Failed to setup SSE:', error);
        setIsConnected(false);
      }
    };

    setupSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
        setIsConnected(false);
      }
    };
  }, [apiBaseUrl, queryClient]);

  // Computed values
  const currentStatus = serverStatus?.data?.status || 'unknown';
  const isServerRunning = currentStatus === 'running';
  const isServerStopped = currentStatus === 'stopped';
  const isTransitioning = currentStatus === 'starting' || currentStatus === 'stopping';
  const hasError = currentStatus === 'error' || !!statusError;

  // Action handlers
  const startServer = useCallback(() => {
    if (!isTransitioning && !isServerRunning) {
      startServerMutation.mutate();
    }
  }, [startServerMutation, isTransitioning, isServerRunning]);

  const stopServer = useCallback(() => {
    if (!isTransitioning && (serverStatus?.data?.runningProcessManaged || serverStatus?.data?.managed)) {
      stopServerMutation.mutate();
    }
  }, [stopServerMutation, isTransitioning, serverStatus?.data]);

  const restartServer = useCallback(() => {
    if (!isTransitioning) {
      restartServerMutation.mutate();
    }
  }, [restartServerMutation, isTransitioning]);

  const toggleServer = useCallback(() => {
    if (isServerRunning && (serverStatus?.data?.runningProcessManaged || serverStatus?.data?.managed)) {
      stopServer();
    } else if (isServerStopped) {
      startServer();
    }
  }, [isServerRunning, isServerStopped, startServer, stopServer, serverStatus?.data]);

  return {
    // Status
    serverStatus: serverStatus?.data,
    currentStatus,
    isServerRunning,
    isServerStopped,
    isTransitioning,
    hasError,
    isLoadingStatus,
    isConnected,
    
    // Actions
    startServer,
    stopServer,
    restartServer,
    toggleServer,
    refetchStatus,
    
    // Mutation states
    isStarting: startServerMutation.isPending,
    isStopping: stopServerMutation.isPending,
    isRestarting: restartServerMutation.isPending,
    
    // Errors
    statusError,
    startError: startServerMutation.error,
    stopError: stopServerMutation.error,
    restartError: restartServerMutation.error
  };
}
