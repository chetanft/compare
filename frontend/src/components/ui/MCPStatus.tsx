import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useWebSocket } from '../../hooks/useWebSocket';
import { isProduction } from '../../utils/environment';

interface MCPStatusProps {
  showDetails?: boolean;
  className?: string;
}

interface MCPStatusData {
  officialMCP: boolean;
  thirdPartyMCP: boolean;
  figmaAPI: boolean;
  activeMethod: string;
}

const MCPStatus: React.FC<MCPStatusProps> = ({ showDetails = false, className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { data, isLoading, error } = useQuery<MCPStatusData>({
    queryKey: ['mcp-status'],
    queryFn: async () => {
      try {
        const response = await axios.get('/api/mcp/status');
        return response.data;
      } catch (err) {
        console.error('Failed to fetch MCP status:', err);
        return {
          officialMCP: false,
          thirdPartyMCP: false,
          figmaAPI: false,
          activeMethod: 'none'
        };
      }
    },
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000,
  });
  
  const { isConnected } = useWebSocket();
  
  const getStatusIcon = (isActive: boolean) => {
    return isActive ? (
      <CheckCircleIcon className="w-5 h-5 text-green-500" />
    ) : (
      <XCircleIcon className="w-5 h-5 text-red-500" />
    );
  };
  
  const getActiveMethodBadge = (method: string) => {
    switch (method) {
      case 'official':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Official MCP
          </span>
        );
      case 'third-party':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            Third-Party MCP
          </span>
        );
      case 'api':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Figma API
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            None
          </span>
        );
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center text-sm text-gray-500">
        <div className="animate-pulse w-4 h-4 bg-gray-300 rounded-full mr-2"></div>
        Checking MCP...
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center text-sm text-red-500">
        <ExclamationTriangleIcon className="w-5 h-5 mr-1" />
        MCP status unavailable
      </div>
    );
  }
  
  if (!data) {
    return (
      <div className="flex items-center text-sm text-gray-500">
        <ExclamationTriangleIcon className="w-5 h-5 mr-1" />
        No MCP data
      </div>
    );
  }
  
  const isAnyMCPAvailable = data.officialMCP || data.thirdPartyMCP;
  const isAnyFigmaAvailable = isAnyMCPAvailable || data.figmaAPI;
  
  // In production on Netlify, WebSockets are not available
  if (isProduction) {
    return (
      <div className={`flex items-center ${className}`}>
        <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></div>
        <span className="text-xs text-gray-500">Static Mode</span>
      </div>
    );
  }
  
  if (!showDetails) {
    return (
      <div className={`flex items-center ${className}`}>
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
        <span className="text-xs text-gray-500">{isConnected ? 'Connected' : 'Disconnected'}</span>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-medium">Figma Connection Status</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {isExpanded ? 'Hide Details' : 'Show Details'}
        </button>
      </div>
      
      <div className="flex items-center mb-2">
        <div className="mr-4">
          {isAnyFigmaAvailable ? (
            <div className="flex items-center">
              <CheckCircleIcon className="w-6 h-6 text-green-500 mr-2" />
              <span className="font-medium">Connected</span>
            </div>
          ) : (
            <div className="flex items-center">
              <XCircleIcon className="w-6 h-6 text-red-500 mr-2" />
              <span className="font-medium">Disconnected</span>
            </div>
          )}
        </div>
        
        <div>
          <span className="text-sm text-gray-500 mr-2">Active Method:</span>
          {getActiveMethodBadge(data.activeMethod)}
        </div>
      </div>
      
      {isExpanded && (
        <div className="mt-4 border-t pt-4">
          <h4 className="text-sm font-medium mb-2">Connection Methods</h4>
          
          <div className="space-y-2">
            <div className="flex items-center">
              {getStatusIcon(data.officialMCP)}
              <span className="ml-2 text-sm">Official Figma MCP</span>
            </div>
            
            <div className="flex items-center">
              {getStatusIcon(data.thirdPartyMCP)}
              <span className="ml-2 text-sm">Third-Party MCP Tools</span>
            </div>
            
            <div className="flex items-center">
              {getStatusIcon(data.figmaAPI)}
              <span className="ml-2 text-sm">Figma API Token</span>
            </div>
          </div>
          
          {!isAnyFigmaAvailable && (
            <div className="mt-4 p-3 bg-yellow-50 text-yellow-800 rounded-md text-sm">
              <p className="font-medium">No Figma connection available</p>
              <p className="mt-1">
                Please configure at least one connection method in the settings.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MCPStatus; 