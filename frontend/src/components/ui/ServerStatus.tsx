import React, { useState, useEffect } from 'react';
import { checkServerHealth } from '../../services/serverStatus';
import { isNetlify } from '../../utils/environment';

interface ServerStatusProps {
  showRetryButton?: boolean;
  className?: string;
  onStatusChange?: (status: 'online' | 'offline' | 'checking' | 'netlify') => void;
}

const ServerStatus: React.FC<ServerStatusProps> = ({
  showRetryButton = true,
  className = '',
  onStatusChange
}) => {
  const [status, setStatus] = useState<'online' | 'offline' | 'checking' | 'netlify'>('checking');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkStatus = async () => {
    // If we're in Netlify environment, we don't need to check server health
    if (isNetlify) {
      const netlifyStatus = 'netlify';
      setStatus(netlifyStatus);
      setLastChecked(new Date());
      
      if (onStatusChange) {
        onStatusChange(netlifyStatus);
      }
      return;
    }
    
    setStatus('checking');
    
    try {
      const isHealthy = await checkServerHealth();
      const newStatus = isHealthy ? 'online' : 'offline';
      setStatus(newStatus);
      
      if (onStatusChange) {
        onStatusChange(newStatus);
      }
    } catch (error) {
      console.error('Error checking server health:', error);
      setStatus('offline');
      
      if (onStatusChange) {
        onStatusChange('offline');
      }
    } finally {
      setLastChecked(new Date());
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
    <div className={`flex items-center ${className}`} title={lastChecked ? `Last checked: ${lastChecked.toLocaleTimeString()}` : 'Checking server status...'}>
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
      {status === 'netlify' && (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
          Netlify
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