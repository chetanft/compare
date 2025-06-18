import React, { useState, useEffect } from 'react';
import { checkServerHealth } from '../../services/serverStatus';

interface ServerStatusProps {
  showRetryButton?: boolean;
  className?: string;
  onStatusChange?: (status: 'online' | 'offline' | 'checking') => void;
}

const ServerStatus: React.FC<ServerStatusProps> = ({
  showRetryButton = true,
  className = '',
  onStatusChange
}) => {
  const [status, setStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  const checkStatus = async () => {
    setStatus('checking');
    const isHealthy = await checkServerHealth();
    const newStatus = isHealthy ? 'online' : 'offline';
    setStatus(newStatus);
    
    if (onStatusChange) {
      onStatusChange(newStatus);
    }
  };

  useEffect(() => {
    checkStatus();
    
    // Set up periodic checking (every 30 seconds)
    const interval = setInterval(() => {
      checkStatus();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`flex items-center ${className}`}>
      <span className="mr-2 text-sm text-gray-600">Server:</span>
      {status === 'checking' && (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
          Checking...
        </span>
      )}
      {status === 'online' && (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
          Online
        </span>
      )}
      {status === 'offline' && (
        <div className="flex items-center">
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 mr-2">
            Offline
          </span>
          {showRetryButton && (
            <button 
              onClick={checkStatus}
              className="text-xs text-indigo-600 hover:text-indigo-900"
              aria-label="Retry server connection"
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ServerStatus; 