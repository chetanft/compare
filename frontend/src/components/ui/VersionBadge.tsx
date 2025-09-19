/**
 * Version Badge Component - Shows frontend/backend version info
 */
import React, { useEffect, useState } from 'react';
import { Badge } from './badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
import { fetchVersion, getFrontendVersion, checkVersionMatch, type VersionInfo } from '../../services/version';
import { cn } from '../../lib/utils';

interface VersionBadgeProps {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
}

export function VersionBadge({ variant = 'secondary', className = '' }: VersionBadgeProps) {
  const [backendVersion, setBackendVersion] = useState<VersionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const frontendVersion = getFrontendVersion();

  useEffect(() => {
    async function loadVersion() {
      try {
        const response = await fetchVersion();
        if (response.success) {
          setBackendVersion(response.data);
          setError(null);
        } else {
          setError(response.error || 'Failed to fetch version');
          setBackendVersion(response.data); // Fallback data
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }

    loadVersion();
  }, []);

  if (isLoading) {
    return (
      <Badge variant={variant} className={`text-xs ${className}`}>
        Loading...
      </Badge>
    );
  }

  const versionsMatch = backendVersion ? checkVersionMatch(frontendVersion, backendVersion.version) : false;
  const badgeVariant = error ? 'destructive' : versionsMatch ? 'secondary' : 'outline';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className={cn(
            "inline-flex items-center space-x-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
            error && "bg-red-50 text-red-700 border border-red-200",
            versionsMatch && !error && "bg-green-50 text-green-700 border border-green-200",
            !versionsMatch && !error && "bg-yellow-50 text-yellow-700 border border-yellow-200",
            className
          )}>
            <div className={cn(
              "h-2 w-2 rounded-full",
              error && "bg-red-500",
              versionsMatch && !error && "bg-green-500",
              !versionsMatch && !error && "bg-yellow-500"
            )} />
            <span>v{frontendVersion}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm">
          <div className="space-y-2">
            <div>
              <strong>Frontend:</strong> v{frontendVersion}
            </div>
            {backendVersion && (
              <>
                <div>
                  <strong>Backend:</strong> v{backendVersion.version}
                </div>
                <div>
                  <strong>Phase:</strong> {backendVersion.phase}
                </div>
                <div>
                  <strong>Architecture:</strong> {backendVersion.architecture.consolidated ? 'Consolidated' : 'Legacy'}
                </div>
                <div className="text-xs opacity-75">
                  <strong>Build:</strong> {new Date(backendVersion.buildTime).toLocaleString()}
                </div>
              </>
            )}
            {error && (
              <div className="text-red-400 text-xs">
                <strong>Error:</strong> {error}
              </div>
            )}
            {!versionsMatch && !error && (
              <div className="text-yellow-400 text-xs">
                ⚠️ Frontend/Backend version mismatch
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
