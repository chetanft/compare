import React, { useEffect } from 'react';
import { useServerControl } from '@/hooks/useServerControl';

interface ServerStatusProps {
  className?: string;
  onStatusChange?: (status: 'online' | 'offline' | 'checking') => void;
}

export default function ServerStatus({ className = '', onStatusChange }: ServerStatusProps) {
  const {
    serverStatus,
    currentStatus,
    isServerRunning,
    isTransitioning,
    hasError,
    isLoadingStatus,
    statusError
  } = useServerControl();

  const port = serverStatus?.port ?? 3847;
  const hasStatusError = Boolean(statusError);

  const isChecking = isLoadingStatus || isTransitioning;
  const isUp = isServerRunning && !hasError && !hasStatusError;
  const isOffline = hasError || hasStatusError;
  const isStopped = !isUp && !isChecking && currentStatus === 'stopped';

  useEffect(() => {
    if (!onStatusChange) return;

    if (isChecking) {
      onStatusChange('checking');
      return;
    }

    onStatusChange(isUp ? 'online' : 'offline');
  }, [isChecking, isUp, onStatusChange]);

  let indicatorColor = 'bg-gray-400';
  let description = `Port ${port} - Checking...`;

  if (isChecking) {
    indicatorColor = 'bg-yellow-500';
    description = `Port ${port} - ${currentStatus === 'starting' ? 'Starting...' : currentStatus === 'stopping' ? 'Stopping...' : 'Checking...'}`;
  } else if (isUp) {
    indicatorColor = 'bg-green-500';
    description = `Port ${port} - Running`;
  } else if (isOffline) {
    indicatorColor = 'bg-red-500';
    description = `Port ${port} - Offline`;
  } else if (isStopped) {
    indicatorColor = 'bg-gray-400';
    description = `Port ${port} - Stopped`;
  } else {
    indicatorColor = 'bg-gray-400';
    description = `Port ${port} - Standby`;
  }

  return (
    <div className={`flex items-center ${className}`}>
      <div
        className={`w-2 h-2 rounded-full mr-2 ${indicatorColor}`}
      ></div>
      <span className="text-xs text-muted-foreground">
        {description}
      </span>
    </div>
  );
}