/**
 * Server Control Button Component
 * Toggle button for starting/stopping the server with real-time status
 */

import React, { useState, useEffect } from 'react';
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
import { isElectronEnvironment } from '@/config/ports';
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
  // Use unified control hook - it handles Electron vs HTTP automatically
  const {
    currentStatus,
    isServerRunning,
    isServerStopped,
    isTransitioning,
    hasError,
    toggleServer,
    serverStatus,
    isLoading,
  } = useServerControl();
  
  // In Electron, the server is always managed by the app
  // In web mode, check if it's externally managed (e.g., via npm run dev)
  const isElectron = isElectronEnvironment();
  const managed = isElectron ? true : ((serverStatus as any)?.runningProcessManaged ?? (serverStatus as any)?.managed ?? false);

  // Rate limiting data
  const [rateLimitData, setRateLimitData] = useState<any>(null);

  // Fetch rate limiting data when server is running
  useEffect(() => {
    if (isServerRunning && serverStatus?.port) {
      const fetchRateLimitData = async () => {
        try {
          const response = await fetch(`http://localhost:${serverStatus.port}/api/health`);
          if (response.ok) {
            const data = await response.json();
            setRateLimitData(data.data?.enhanced?.circuitBreakers || null);
          }
        } catch (error) {
          console.warn('Failed to fetch rate limit data:', error);
        }
      };

      fetchRateLimitData();
      const interval = setInterval(fetchRateLimitData, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isServerRunning, serverStatus?.port]);

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
        text: 'Connection Issue',
        variant: 'outline' as const,
        disabled: false
      };
    }

    if (isServerRunning) {
      return {
        icon: StopIcon,
        text: 'Stop Server',
        variant: 'secondary' as const,
        disabled: false, // Allow stopping even if externally managed - API will handle it
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

  // Default variant - Modern card design with vertical layout
  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border bg-gradient-to-r from-card to-card/50 p-4 shadow-sm transition-all duration-200 hover:shadow-md",
      hasError && "border-orange-200 bg-gradient-to-r from-orange-50 to-orange-50/30",
      isServerRunning && "border-green-200 bg-gradient-to-r from-green-50 to-green-50/30",
      className
    )}>
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:20px_20px]" />
      
      <div className="relative flex flex-col space-y-3">
        {/* Server Status */}
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-3">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
              hasError && "bg-orange-100 text-orange-600",
              isServerRunning && "bg-green-100 text-green-600",
              !isServerRunning && !hasError && "bg-blue-100 text-blue-600"
            )}>
              <IconComponent className={cn(
                "h-5 w-5",
                buttonContent.disabled && "animate-spin"
              )} />
            </div>
            
            <div className="text-center">
              <div className="font-medium text-sm">
                {hasError ? 'Server Connection' : isServerRunning ? 'Server Active' : 'Server Ready'}
              </div>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex justify-center">
          <span className={cn(
            "inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium",
            isServerRunning && "bg-green-100 text-green-700 border border-green-200",
            hasError && "bg-orange-100 text-orange-700 border border-orange-200",
            !isServerRunning && !hasError && "bg-gray-100 text-gray-700 border border-gray-200"
          )}>
            <div className={cn(
              "h-1.5 w-1.5 rounded-full",
              isServerRunning && "bg-green-500",
              hasError && "bg-orange-500",
              !isServerRunning && !hasError && "bg-gray-400"
            )} />
            <span>{currentStatus}</span>
          </span>
        </div>

        {/* Port Information */}
        <div className="text-center">
          <div className="text-sm font-medium text-gray-700">
            Port {serverStatus?.port || 3847}
          </div>
        </div>

        {/* Rate Limiting Info */}
        {isServerRunning && (
          <div className="text-center border-t pt-2">
            <div className="text-xs text-muted-foreground">
              Rate Limits: API 100/15min • Extraction 10/15min
            </div>
            {rateLimitData ? (
              <div className={cn(
                "text-xs mt-1",
                rateLimitData.healthy ? "text-green-600" : "text-orange-600"
              )}>
                {rateLimitData.healthy ? "✓" : "⚠"} Circuit Breakers: {rateLimitData.closed}/{rateLimitData.total} OK
                {rateLimitData.open > 0 && ` • ${rateLimitData.open} Open`}
              </div>
            ) : (
              <div className="text-xs text-green-600 mt-1">
                ✓ All limits available
              </div>
            )}
          </div>
        )}
        
        {/* Managed Externally Note */}
        {!managed && isServerRunning && (
          <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
            <span className="inline-block">Managed Externally</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <ExclamationTriangleIcon className="h-3 w-3" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Server started outside the app (e.g., via npm run dev)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
        
        {/* Control Button */}
        <div className="flex justify-center pt-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={toggleServer}
                  disabled={buttonContent.disabled}
                  variant={buttonContent.variant}
                  size="sm"
                  className={cn(
                    "flex items-center space-x-2 font-medium transition-all min-w-[100px]",
                    hasError && "border-orange-300 hover:bg-orange-50",
                    isServerRunning && "border-green-300 hover:bg-green-50"
                  )}
                >
                  <span>{buttonContent.text}</span>
                  <IconComponent
                    className={cn(
                      "h-4 w-4",
                      buttonContent.disabled && "animate-spin"
                    )}
                  />
                </Button>
              </TooltipTrigger>
              {!managed && isServerRunning && (
                <TooltipContent>
                  <p className="text-xs">Server started externally - stopping may require manual intervention</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
