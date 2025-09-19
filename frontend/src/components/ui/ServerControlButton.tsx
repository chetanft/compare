/**
 * Server Control Button Component
 * Toggle button for starting/stopping the server with real-time status
 */

import React from 'react';
import { 
  PlayIcon, 
  StopIcon, 
  ArrowPathIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useServerControl } from '@/hooks/useServerControl';
import { useElectronServerControl } from '@/hooks/useElectronServerControl';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ServerControlButtonProps {
  className?: string;
  variant?: 'default' | 'compact' | 'icon-only';
  showStatus?: boolean;
}

export default function ServerControlButton({ 
  className = '', 
  variant = 'default',
  showStatus = true 
}: ServerControlButtonProps) {
  // Check if we're in Electron
  const isElectron = typeof window !== 'undefined' && 
                    (window.navigator.userAgent.includes('Electron') || 
                     window.process?.type === 'renderer');

  // Use appropriate control hook based on platform
  const httpControl = useServerControl();
  const electronControl = useElectronServerControl();
  
  // For Electron, if the electronAPI isn't available, use a simple status that reflects the server is embedded
  const control = isElectron ? 
    (electronControl.inElectron ? electronControl : {
      currentStatus: 'running',
      isServerRunning: true,
      isServerStopped: false,
      isTransitioning: false,
      hasError: false,
      serverStatus: { port: 3847, status: 'running', healthy: true },
      toggleServer: () => Promise.resolve({ success: true, message: 'Server is embedded in the app' }),
      isLoading: false,
      error: null
    }) : httpControl;
  
  const {
    currentStatus,
    isServerRunning,
    isServerStopped,
    isTransitioning,
    hasError,
    toggleServer,
    serverStatus,
    isLoading,
    error
  } = control;

  // Button content based on server status
  const getButtonContent = () => {
    const isLoadingState = isTransitioning || isLoading;
    
    if (isLoadingState) {
      return {
        icon: ArrowPathIcon,
        text: currentStatus === 'starting' ? 'Starting...' : 
              currentStatus === 'stopping' ? 'Stopping...' : 
              'Processing...',
        variant: 'secondary' as const,
        disabled: true
      };
    }

    if (hasError) {
      return {
        icon: ExclamationTriangleIcon,
        text: 'Server Error',
        variant: 'destructive' as const,
        disabled: false
      };
    }

    if (isServerRunning) {
      return {
        icon: StopIcon,
        text: 'Stop Server',
        variant: 'destructive' as const,
        disabled: false
      };
    }

    return {
      icon: PlayIcon,
      text: 'Start Server',
      variant: 'default' as const,
      disabled: false
    };
  };

  const buttonContent = getButtonContent();
  const IconComponent = buttonContent.icon;

  // Status badge
  const getStatusBadge = () => {
    if (!showStatus) return null;

    const statusConfig = {
      running: { variant: 'default', text: 'Running', color: 'bg-green-500' },
      stopped: { variant: 'secondary', text: 'Stopped', color: 'bg-gray-500' },
      starting: { variant: 'secondary', text: 'Starting', color: 'bg-yellow-500' },
      stopping: { variant: 'secondary', text: 'Stopping', color: 'bg-orange-500' },
      error: { variant: 'destructive', text: 'Error', color: 'bg-red-500' }
    };

    const config = statusConfig[currentStatus as keyof typeof statusConfig] || 
                   statusConfig.stopped;

    return (
      <div className="flex items-center space-x-2">
        <div className={cn("w-2 h-2 rounded-full", config.color)} />
        <Badge variant={config.variant as any} className="text-xs">
          {config.text}
        </Badge>
      </div>
    );
  };

  // Tooltip content
  const getTooltipContent = () => {
    const port = serverStatus?.port || 3847;
    const uptime = serverStatus?.uptime ? Math.floor(serverStatus.uptime / 1000) : 0;
    
    return (
      <div className="text-sm">
        <div className="font-medium">Server Status</div>
        <div className="text-xs text-muted-foreground mt-1">
          <div>Port: {port}</div>
          <div>Status: {currentStatus}</div>
          {isServerRunning && <div>Uptime: {uptime}s</div>}
          {serverStatus?.pid && <div>PID: {serverStatus.pid}</div>}
          <div>Connected: {isServerRunning ? '✅' : '❌'}</div>
        </div>
      </div>
    );
  };

  // Render variants
  if (variant === 'icon-only') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={toggleServer}
              disabled={buttonContent.disabled}
              variant={buttonContent.variant}
              size="sm"
              className={cn("p-2", className)}
            >
              <IconComponent className={cn(
                "h-4 w-4",
                buttonContent.disabled && "animate-spin"
              )} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {getTooltipContent()}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center space-x-3", className)}>
        <Button
          onClick={toggleServer}
          disabled={buttonContent.disabled}
          variant={buttonContent.variant}
          size="sm"
          className="flex items-center space-x-2"
        >
          <IconComponent className={cn(
            "h-4 w-4",
            buttonContent.disabled && "animate-spin"
          )} />
          <span>{buttonContent.text}</span>
        </Button>
        {getStatusBadge()}
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn("flex items-center justify-between p-3 bg-card rounded-lg border", className)}>
      <div className="flex items-center space-x-3">
        <Button
          onClick={toggleServer}
          disabled={buttonContent.disabled}
          variant={buttonContent.variant}
          size="sm"
          className="flex items-center space-x-2"
        >
          <IconComponent className={cn(
            "h-4 w-4",
            buttonContent.disabled && "animate-spin"
          )} />
          <span>{buttonContent.text}</span>
        </Button>
        
        <div className="text-sm text-muted-foreground">
          Port {serverStatus?.port || 3847}
        </div>
      </div>
      
      {getStatusBadge()}
    </div>
  );
}
