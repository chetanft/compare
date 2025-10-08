import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { getApiBaseUrl } from '../../utils/environment';

interface MCPStatusProps {
  showDetails?: boolean;
  className?: string;
}

interface MCPStatusResponse {
  status: string;
  message: string;
  available: boolean;
  error?: string;
}

const MCPStatus: React.FC<MCPStatusProps> = ({ showDetails = false, className = '' }) => {
  const apiBaseUrl = getApiBaseUrl();
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['mcpStatus'],
    queryFn: async () => {
      try {
        const response = await axios.get<MCPStatusResponse>(`${apiBaseUrl}/api/mcp/status`);
        return response.data;
      } catch (err) {
        console.error('Failed to fetch MCP status:', err);
        throw err;
      }
    },
    retry: 2,
    retryDelay: 1000,
    refetchInterval: 60000, // Refetch every minute
    refetchOnWindowFocus: false
  });
  
  // keep in sync with server status events without violating hook order
  React.useEffect(() => {
    if (isLoading || error) {
      return;
    }

    const handler = () => refetch();
    window.addEventListener('server-status-updated', handler);
    return () => window.removeEventListener('server-status-updated', handler);
  }, [isLoading, error, refetch]);

  if (isLoading) {
    return (
      <div className={`flex items-center ${className}`}>
        <div className="animate-pulse w-2 h-2 rounded-full bg-gray-400 mr-2"></div>
        <span className="text-xs text-muted-foreground">Checking MCP...</span>
      </div>
    );
  }
  
  if (error || !data) {
    return (
      <div className={`flex items-center ${className}`}>
        <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
        <span className="text-xs text-muted-foreground">MCP unavailable</span>
      </div>
    );
  }
  
  const isAvailable = data.available;

  return (
    <div className={`flex items-center ${className}`}>
      <div 
        className={`w-2 h-2 rounded-full mr-2 ${
          isAvailable ? 'bg-green-500' : 'bg-red-500'
        }`}
      ></div>
      <span className="text-xs text-muted-foreground">
        {isAvailable 
          ? 'MCP connected' 
          : 'MCP unavailable'}
      </span>
      {showDetails && (
        <div className="ml-2 text-xs text-gray-400">
          {data.message}
        </div>
      )}
    </div>
  );
};

export default MCPStatus; 