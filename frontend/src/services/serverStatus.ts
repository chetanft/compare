/**
 * Service for checking server status and health
 */

/**
 * Response from the server health endpoint
 */
export interface ServerHealthResponse {
  status: string;
  uptime: number;
  timestamp: string;
  serverInfo: {
    figmaExtractor: string;
    webExtractor: string;
    comparisonService: string;
  };
}

/**
 * Check if the server is running and healthy
 * @returns Promise resolving to true if server is healthy, false otherwise
 */
export const checkServerHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch('/api/health', {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      // Set a reasonable timeout for the health check
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) {
      console.error('Server health check failed with status:', response.status);
      return false;
    }
    
    const data = await response.json() as ServerHealthResponse;
    return data.status === 'ok';
  } catch (error) {
    console.error('Error checking server health:', error);
    return false;
  }
};

/**
 * Check if a specific report is available on the server
 * @param reportId The ID of the report to check
 * @returns Promise resolving to true if the report exists, false otherwise
 */
export const checkReportAvailability = async (reportId: string): Promise<boolean> => {
  try {
    // Clean up reportId - remove any "comparison-" prefix if it exists
    const cleanReportId = reportId.startsWith('comparison-') ? reportId : `comparison-${reportId}`;
    
    // Try different paths to find the report
    const paths = [
      `/output/reports/${cleanReportId}.html`,
      `/reports/${cleanReportId}.html`,
      `/output/reports/${reportId}.html`,
      `/reports/${reportId}.html`,
      `/output/reports/${cleanReportId}.json`,
      `/reports/${cleanReportId}.json`,
      `/output/reports/${reportId}.json`,
      `/reports/${reportId}.json`
    ];
    
    // Try each path with a HEAD request to check if the file exists
    for (const path of paths) {
      try {
        const response = await fetch(path, {
          method: 'HEAD',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          signal: AbortSignal.timeout(2000)
        });
        
        if (response.ok) {
          return true;
        }
      } catch (e) {
        // Continue to next path
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking report availability:', error);
    return false;
  }
}; 