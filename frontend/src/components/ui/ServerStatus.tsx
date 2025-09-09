import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { getApiBaseUrl } from '../../utils/environment';

interface ServerStatusProps {
  className?: string;
  onStatusChange?: (status: 'online' | 'offline' | 'checking') => void;
}

interface ServerStatusResponse {
  success: boolean;
  data: {
    status: string;
    message?: string;
    version?: string;
    uptime?: number;
    timestamp?: string;
  };
  timestamp?: string;
}

export default function ServerStatus({ className = '', onStatusChange }: ServerStatusProps) {
  const apiBaseUrl = getApiBaseUrl();
  
  // Extract port from the API base URL
  const getPortFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.port || (urlObj.protocol === 'https:' ? '443' : '80');
    } catch {
      return '3007'; // Default port
    }
  };
  
  const currentPort = getPortFromUrl(apiBaseUrl);
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['serverStatus'],
    queryFn: async () => {
      try {
        const response = await axios.get<ServerStatusResponse>(`${apiBaseUrl}/api/health`);
        return response.data;
      } catch (err) {
        console.error('Failed to fetch server status:', err);
        throw err;
      }
    },
    retry: 2,
    retryDelay: 1000,
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: false
  });
  
  // Call onStatusChange when status changes
  useEffect(() => {
    if (isLoading) {
      onStatusChange?.('checking');
    } else if (error || !data || !data.success) {
      onStatusChange?.('offline');
    } else {
      const isOnline = data.data.status === 'healthy' || data.data.status === 'ok' || data.data.status === 'online';
      onStatusChange?.(isOnline ? 'online' : 'offline');
    }
  }, [data, isLoading, error, onStatusChange]);
  
  if (isLoading) {
    return (
      <div className={`flex items-center ${className}`}>
        <div className="animate-pulse w-2 h-2 rounded-full bg-gray-400 mr-2"></div>
        <span className="text-xs text-muted-foreground">Port {currentPort} - Checking...</span>
      </div>
    );
  }
  
  if (error || !data || !data.success) {
    return (
      <div className={`flex items-center ${className}`}>
        <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
        <span className="text-xs text-muted-foreground">Port {currentPort} - Offline</span>
      </div>
    );
  }
  
  const isOnline = data.data.status === 'healthy' || data.data.status === 'ok' || data.data.status === 'online';
  
  return (
    <div className={`flex items-center ${className}`}>
      <div 
        className={`w-2 h-2 rounded-full mr-2 ${
          isOnline ? 'bg-green-500' : 'bg-red-500'
        }`}
      ></div>
      <span className="text-xs text-muted-foreground">
        Port {currentPort} - {isOnline ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );
} 