/**
 * Unified API Service
 * Standardized API communication with proper error handling and type safety
 */

import { ComparisonRequest, ComparisonResult, ApiResponse } from '../types';
import { getApiBaseUrl } from '../utils/environment';

class UnifiedApiService {
  private baseURL: string;
  private timeout: number;

  constructor() {
    this.baseURL = getApiBaseUrl();
    this.timeout = 300000; // 5 minutes for comparison operations (handles slow web extraction)
  }

  /**
   * Generic API request method with standardized error handling
   */
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const controller = new AbortController();
    
    // Set timeout
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.timeout);

    try {
      console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      const data = await response.json() as ApiResponse<T>;
      
      console.log(`📥 API Response [${response.status}]:`, {
        success: data.success,
        hasData: !!data.data,
        hasError: !!data.error,
        timestamp: data.timestamp
      });

      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP ${response.status}`);
      }

      if (!data.success) {
        throw new Error(data.error?.message || 'API request failed');
      }

      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout / 1000} seconds`);
      }
      
      console.error(`❌ API Error (${endpoint}):`, error.message);
      throw error;
    }
  }

  /**
   * Health check endpoint
   */
  async checkHealth(): Promise<ApiResponse<any>> {
    return this.request('/api/health');
  }

  /**
   * Compare Figma and web URLs
   */
  async compareUrls(request: ComparisonRequest): Promise<ComparisonResult> {
    console.log('🚀 Starting comparison:', {
      figmaUrl: request.figmaUrl,
      webUrl: request.webUrl,
      hasAuth: !!request.authentication
    });

    // Validate request
    this.validateComparisonRequest(request);

    // Prepare request payload
    const payload = {
      figmaUrl: request.figmaUrl,
      webUrl: request.webUrl,
      nodeId: request.nodeId,
      includeVisual: request.includeVisual || false,
      authentication: request.authentication,
      extractionMode: (request as any).extractionMode || 'both'
    };

    const result = await this.request<any>('/api/compare', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    // Transform response to match ComparisonResult interface
    return this.transformComparisonResponse(result);
  }

  /**
   * Get reports list
   */
  async getReports(): Promise<ApiResponse<{ reports: any[]; total: number }>> {
    return this.request('/api/reports/list');
  }

  /**
   * Get MCP status
   */
  async getMCPStatus(): Promise<ApiResponse<any>> {
    return this.request('/api/mcp/status');
  }

  /**
   * Validate comparison request
   */
  private validateComparisonRequest(request: ComparisonRequest): void {
    if (!request.figmaUrl || typeof request.figmaUrl !== 'string') {
      throw new Error('figmaUrl is required and must be a string');
    }

    if (!request.webUrl || typeof request.webUrl !== 'string') {
      throw new Error('webUrl is required and must be a string');
    }

    if (!request.figmaUrl.includes('figma.com')) {
      throw new Error('figmaUrl must be a valid Figma URL');
    }

    if (!request.webUrl.startsWith('http')) {
      throw new Error('webUrl must be a valid HTTP/HTTPS URL');
    }
  }

  /**
   * Transform API response to match frontend expectations
   */
  private transformComparisonResponse(apiResponse: ApiResponse<any>): ComparisonResult {
    const data = apiResponse.data;
    
    if (!data) {
      throw new Error('No comparison data received from API');
    }

    // Create standardized comparison result
    const result: ComparisonResult = {
      success: apiResponse.success,
      data: {
        comparison: data.comparison || {
          overallSimilarity: 0,
          totalComparisons: 0,
          matchedElements: 0,
          discrepancies: 0
        },
        extractionDetails: data.extractionDetails || {
          figma: {},
          web: {},
          comparison: {
            totalComparisons: 0,
            matches: 0,
            deviations: 0,
            matchPercentage: 0
          }
        },
        figmaData: data.figmaData,
        webData: data.webData,
        reportPath: data.reportPath,
        reports: data.reports
      },
      timestamp: apiResponse.timestamp,
      processingTime: apiResponse.processingTime,
      error: apiResponse.error,
      comparisonId: data.comparisonId || data.id,
      id: data.id || data.comparisonId,
      reportPath: data.reportPath,
      reports: data.reports,
      extractionDetails: data.extractionDetails,
      figmaData: data.figmaData,
      webData: data.webData
    };

    console.log('✅ Transformed comparison result:', {
      success: result.success,
      similarity: result.data?.comparison.overallSimilarity,
      figmaComponents: result.data?.figmaData?.components?.length,
      webElements: result.data?.webData?.elements?.length
    });

    return result;
  }

  /**
   * Set custom timeout for requests
   */
  setTimeout(timeout: number): void {
    this.timeout = timeout;
  }

  /**
   * Get current configuration
   */
  getConfig(): { baseURL: string; timeout: number } {
    return {
      baseURL: this.baseURL,
      timeout: this.timeout
    };
  }
}

// Export singleton instance
export const unifiedApiService = new UnifiedApiService();
export default unifiedApiService;
