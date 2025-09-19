/**
 * Version Service - Fetches version info from backend
 */
import { getApiBaseUrl } from '../utils/environment.js';

export interface VersionInfo {
  version: string;
  name: string;
  buildTime: string;
  phase: string;
  architecture: {
    servers: number;
    extractors: number;
    mcpClients: number;
    consolidated: boolean;
  };
}

export interface VersionResponse {
  success: boolean;
  data: VersionInfo;
  error?: string;
}

/**
 * Fetch version information from backend
 */
export async function fetchVersion(): Promise<VersionResponse> {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/version`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch version:', error);
    return {
      success: false,
      data: {
        version: '1.1.0',
        name: 'figma-web-comparison-tool',
        buildTime: new Date().toISOString(),
        phase: 'Phase 13 - Local Build',
        architecture: {
          servers: 1,
          extractors: 1,
          mcpClients: 1,
          consolidated: true
        }
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check if frontend and backend versions match
 */
export function checkVersionMatch(frontendVersion: string, backendVersion: string): boolean {
  return frontendVersion === backendVersion;
}

/**
 * Get frontend version from package.json (build time)
 */
export function getFrontendVersion(): string {
  // This will be replaced by Vite during build
  return import.meta.env.PACKAGE_VERSION || '1.1.0';
}
