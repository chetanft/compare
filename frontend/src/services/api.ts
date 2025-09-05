import { getApiBaseUrl } from '../utils/environment';
import axios from 'axios';
import { AuthenticationConfig, ComparisonResult } from '../types';
import { FigmaData, WebData } from '../../../src/types/extractor';

// API Configuration
const API_CONFIG = {
  baseURL: getApiBaseUrl(),
  // Increased to accommodate slow, JS-heavy sites (e.g., FreightTiger). Adjustable if needed.
  timeout: 420000,
  retries: 3
};

// API response interface
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface ApiError {
  message: string
  status?: number
  code?: string
  details?: string
}

class ApiService {
  private baseURL: string
  private timeout: number
  private retries: number

  constructor() {
    this.baseURL = API_CONFIG.baseURL
    this.timeout = API_CONFIG.timeout
    this.retries = API_CONFIG.retries
  }

  /**
   * Get the correct API URL based on environment and endpoint
   * @param url The API endpoint path
   * @returns The complete URL to use
   */
  private getApiUrl(url: string): string {
    // Prevent duplication if the URL already contains the base URL
    if (url.startsWith(this.baseURL)) {
      return url;
    }
    
    // Always use local server - no Netlify Functions
    return `${this.baseURL}${url}`;
  }

  private async fetchWithRetry(url: string, options: RequestInit = {}, retryCount = 0): Promise<Response> {
    // Get the correct API URL
    const apiUrl = this.getApiUrl(url);

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(new Error(`Client request timeout after ${this.timeout}ms`)), this.timeout)

    try {
      console.log(`🌐 API Request: ${apiUrl}`);
      const response = await fetch(apiUrl, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      
      // Normalize abort errors with a helpful message
      if ((error as Error).name === 'AbortError' || /aborted/i.test((error as Error).message)) {
        const friendly = new Error(`Request aborted: timed out after ${Math.round(this.timeout/1000)}s`)
        ;(friendly as any).code = 'ABORT_TIMEOUT'
        throw friendly
      }

      if (retryCount < this.retries) {
        console.warn(`API request failed, retrying... (${retryCount + 1}/${this.retries})`)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000))
        return this.fetchWithRetry(url, options, retryCount + 1)
      }
      
      throw error
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`
      let errorDetails = '';
      
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorData.message || errorMessage
        errorDetails = errorData.details || errorData.stack || '';
      } catch {
        // If response is not JSON, use status text
      }
      
      const error: ApiError = {
        message: errorMessage,
        status: response.status,
        code: response.status.toString(),
        details: errorDetails
      }
      
      throw error
    }

    try {
      return await response.json()
    } catch (error) {
      throw new Error('Invalid JSON response from server')
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await this.fetchWithRetry(endpoint, { method: 'GET' })
    return this.handleResponse<T>(response)
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
      // No cache busting
  const dataWithCacheBuster = data || {};
    
    const options: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dataWithCacheBuster)
    };
    
    const response = await this.fetchWithRetry(endpoint, options);
    return this.handleResponse<T>(response);
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    const response = await this.fetchWithRetry(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
    return this.handleResponse<T>(response)
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await this.fetchWithRetry(endpoint, { method: 'DELETE' })
    return this.handleResponse<T>(response)
  }

  async healthCheck(): Promise<any> {
    return this.get('/api/health')
  }

  async getReports(): Promise<any> {
    return this.get('/api/reports')
  }

  async getCurrentSettings(): Promise<any> {
    return this.get('/api/settings/current')
  }

  async saveSettings(settings: any): Promise<any> {
    return this.post('/api/settings/save', settings)
  }

  async testConnection(data: any): Promise<any> {
    return this.post('/api/settings/test-connection', data)
  }

  async getFigmaData(comparisonId: string): Promise<any> {
    return this.get(`/api/figma-data/${comparisonId}`)
  }

  async getWebData(comparisonId: string): Promise<any> {
    return this.get(`/api/web-data/${comparisonId}`)
  }

  getConfig() {
    return {
      baseURL: this.baseURL,
      timeout: this.timeout,
      retries: this.retries
    }
  }

  // Use axios for specific cases where fetch doesn't work well
  async postAxios<T = any>(url: string, data: any, options?: { headers?: Record<string, string> }): Promise<T> {
    try {
      const apiUrl = this.getApiUrl(url);
      console.log(`🌐 Axios Request: ${apiUrl}`);
      
      const headers = options?.headers || {};
      
      // Don't set Content-Type for FormData - let axios handle it
      if (!(data instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
      }
      
      const response = await axios.post(apiUrl, data, {
        headers,
        timeout: this.timeout
      });
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const apiError: ApiError = {
          message: error.response?.data?.error || error.message,
          status: error.response?.status,
          code: error.code,
          details: error.response?.data?.details
        };
        throw apiError;
      }
      throw error;
    }
  }

  async getAxios(url: string) {
    try {
      const apiUrl = this.getApiUrl(url);
      console.log(`🌐 Axios Request: ${apiUrl}`);
      
      const response = await axios.get(apiUrl, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: this.timeout
      });
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.message);
      }
      throw error;
    }
  }

  createEventSource(url: string) {
    const apiUrl = this.getApiUrl(url);
    return new EventSource(apiUrl);
  }
}

const apiService = new ApiService()

export default apiService

export interface ComparisonRequest {
  figmaUrl: string
  webUrl: string
  includeVisual?: boolean
  nodeId?: string | null
  extractionMode?: 'frame-only' | 'global-styles' | 'both'
  authentication?: {
    type?: 'credentials' | 'cookies' | 'headers'
    figmaToken?: string
    loginUrl?: string
    username?: string
    password?: string
    waitTime?: number
    successIndicator?: string
    webAuth?: {
      username?: string
      password?: string
    }
  } | null
}

export interface ExtractionDetails {
  figma: {
    componentCount: number;
    colors: Array<{name: string, value: string, type: string}>;
    typography: Array<{fontFamily: string, fontSize: number, fontWeight: number}>;
    extractionTime: number;
    fileInfo: {name: string, nodeId?: string};
  };
  web: {
    elementCount: number;
    colors: string[];
    typography: {
      fontFamilies: string[];
      fontSizes: string[];
      fontWeights: string[];
    };
    spacing: string[];
    borderRadius: string[];
    extractionTime: number;
    urlInfo: {url: string, title?: string};
  };
  comparison: {
    totalComparisons: number;
    matches: number;
    deviations: number;
    matchPercentage: number;
  };
}

// Extract Figma data
export const extractFigmaData = async (figmaUrl: string): Promise<FigmaData> => {
  try {
    console.log('Extracting Figma data from URL:', figmaUrl);
    
    // Use the appropriate API endpoint based on environment
    const endpoint = '/api/figma/extract';
    
    const response = await apiService.post<ApiResponse<FigmaData>>(endpoint, { figmaUrl });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to extract Figma data');
    }
    
    return response.data as FigmaData;
  } catch (error) {
    console.error('Error extracting Figma data:', error);
    
    // Provide more helpful error messages
    if ((error as ApiError).status === 403) {
      throw new Error('Access denied to Figma file. Please check your API token permissions.');
    } else if ((error as ApiError).status === 404) {
      throw new Error('Figma file not found. Please check the URL.');
    }
    
    throw error;
  }
};

// Extract Web data
export const extractWebData = async (url: string): Promise<WebData> => {
  try {
    console.log('Extracting Web data from URL:', url);
    
    const response = await apiService.post<ApiResponse<WebData>>('/api/web/extract', { url });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to extract Web data');
    }
    
    return response.data as WebData;
  } catch (error) {
    console.error('Error extracting Web data:', error);
    throw error;
  }
};

// Compare URLs
export const compareUrls = async (request: ComparisonRequest): Promise<ComparisonResult> => {
  try {
    console.log('Comparing URLs:', request);
    
    // Ensure extractionMode is set with a default value if not provided
    const requestWithDefaults = {
      ...request,
      extractionMode: request.extractionMode || 'both'
    };
    
    const response = await apiService.postAxios<ApiResponse<ComparisonResult>>('/api/compare', requestWithDefaults);
    
    if (!response.success) {
      throw new Error(response.error || 'Comparison failed');
    }
    
    return response.data as ComparisonResult;
  } catch (error) {
    console.error('Error comparing URLs:', error);
    throw error;
  }
};

// Get extractor status
export const getExtractorStatus = async (type: 'figma' | 'web') => {
  try {
    const response = await apiService.get<any>(`/api/status/${type}`);
    
    return {
      available: response.available || false,
      status: response.status || 'unknown',
      message: response.message || 'Status unknown',
      timestamp: response.timestamp || new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error getting ${type} extractor status:`, error);
    
    return {
      available: false,
      status: 'error',
      message: `Could not connect to ${type} extractor service`,
      timestamp: new Date().toISOString()
    };
  }
};

// Define types for the extraction responses
export interface FigmaOnlyResponse {
  success: boolean;
  data: {
    components: any[];
    colors: any[];
    typography: any[];
    styles: any;
    tokens: {
      colors: any[];
      typography: any[];
      spacing: any[];
      borderRadius: any[];
    };
    metadata: {
      fileName: string;
      extractedAt: string;
      extractionMethod: string;
      componentCount: number;
      colorCount: number;
      typographyCount: number;
      version: string;
    };
    reportPath?: string; // Added reportPath
  };
  error?: string;
}

export interface WebOnlyResponse {
  success: boolean;
  data: {
    elements: any[];
    colorPalette: string[];
    typography: {
      fontFamilies: string[];
      fontSizes: string[];
      fontWeights: string[];
    };
    metadata: {
      url: string;
      timestamp: string;
      elementsExtracted: number;
    };
    screenshot?: string;
    reportPath?: string;
  };
  error?: string;
}

export interface FigmaExtractionOptions {
  figmaUrl: string;
  extractionMode?: 'frame-only' | 'global-styles' | 'both';
}

export const extractFigmaOnly = async (options: FigmaExtractionOptions): Promise<FigmaOnlyResponse['data']> => {
  try {
    const apiService = new ApiService();
    
    // Add a timestamp to prevent caching
    const timestamp = new Date().getTime();
    const url = `${options.figmaUrl}${options.figmaUrl.includes('?') ? '&' : '?'}_t=${timestamp}`;
    
    const response = await apiService.post<any>('/api/figma-only/extract', {
      figmaUrl: url,
      extractionMode: options.extractionMode || 'both'
    });
    
    console.log('Raw API response:', response);
    
    // Check if the response is in the expected format (with success field)
    if (response && typeof response === 'object') {
      if ('success' in response) {
        // Old format with success field
        if (!response.success) {
          throw new Error(response.error || 'Failed to extract Figma data');
        }
        console.log('Returning response.data:', response.data);
        return response.data;
      } else {
        // New format from minimal-server (direct response without success wrapper)
        // Transform the response to match the expected format
        return {
          components: response.components || [],
          colors: response.colors || [],
          typography: response.typography || [],
          styles: response.styles || {},
          tokens: {
            colors: response.colors || [],
            typography: response.typography || [],
            spacing: [],
            borderRadius: []
          },
          metadata: response.metadata || {
            fileName: 'Unknown',
            extractedAt: new Date().toISOString(),
            extractionMethod: 'figma-api',
            componentCount: 0,
            colorCount: 0,
            typographyCount: 0,
            version: '1.0.0'
          }
        };
      }
    }
    
    throw new Error('Invalid response format from server');
  } catch (error) {
    console.error('Error extracting Figma data:', error);
    throw error;
  }
}

// Extract Web data only
export const extractWebOnly = async (
  webUrl: string, 
  webSelector?: string,
  authentication?: AuthenticationConfig
): Promise<WebOnlyResponse['data']> => {
  try {
    console.log('Extracting Web-only data from URL:', webUrl);
    
    // Use the UnifiedWebExtractor endpoint with FreightTiger authentication fixes
    const endpoint = '/api/web/extract-v3';
    
    const response = await apiService.post<WebOnlyResponse>(endpoint, { 
      url: webUrl, // UnifiedWebExtractor expects 'url', not 'webUrl'
      authentication,
      options: {
        includeScreenshot: false,
        viewport: { width: 1920, height: 1080 },
        timeout: webUrl.includes('freighttiger.com') ? 120000 : 60000 // Extended timeout for FreightTiger
      }
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to extract web data');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error extracting Web-only data:', error);
    throw error;
  }
}; 

// Export convenience functions that use the singleton
export const testConnection = async (data: { figmaPersonalAccessToken: string }) => {
  return apiService.testConnection(data);
};

// Screenshot Comparison API Functions
export const uploadScreenshots = async (formData: FormData): Promise<{ uploadId: string }> => {
  try {
    console.log('🌐 Uploading screenshots with FormData:', formData);
    
    // Debug FormData contents
    console.log('📝 FormData contents before upload:');
    for (const [key, value] of formData.entries()) {
      console.log(`  ${key}:`, value instanceof File ? `File(${value.name}, ${value.size} bytes)` : value);
    }
    
    const response = await apiService.postAxios<ApiResponse<{ uploadId: string }>>(
      '/api/screenshots/upload', 
      formData
    );
    
    if (!response.success) {
      throw new Error(response.error || 'Screenshot upload failed');
    }
    
    return response.data as { uploadId: string };
  } catch (error) {
    console.error('Error uploading screenshots:', error);
    throw error;
  }
};

export const startScreenshotComparison = async (
  uploadId: string, 
  settings: any
): Promise<any> => {
  try {
    const response = await apiService.postAxios<ApiResponse<any>>(
      '/api/screenshots/compare',
      { uploadId, settings }
    );
    
    if (!response.success) {
      throw new Error(response.error || 'Screenshot comparison failed');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error starting screenshot comparison:', error);
    throw error;
  }
};

export const getScreenshotComparisonStatus = async (
  comparisonId: string
): Promise<any> => {
  try {
    const response = await apiService.getAxios<ApiResponse<any>>(
      `/api/screenshots/compare/${comparisonId}`
    );
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to get comparison status');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error getting comparison status:', error);
    throw error;
  }
};

export const listScreenshotComparisons = async (): Promise<any[]> => {
  try {
    const response = await apiService.getAxios<ApiResponse<any[]>>(
      '/api/screenshots/list'
    );
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to list comparisons');
    }
    
    return response.data as any[];
  } catch (error) {
    console.error('Error listing comparisons:', error);
    throw error;
  }
}; 