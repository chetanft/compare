import { getApiBaseUrl } from '../utils/environment'
import axios from 'axios'
import { FigmaData, WebData } from '../../../src/types/extractor'
import { ComparisonResult } from '../../../src/services/comparison/ComparisonEngine'
import { isProduction, isNetlify } from '../utils/environment'

// API Configuration and Service Layer
const API_CONFIG = {
  baseURL: getApiBaseUrl(),
  timeout: 120000,
  retries: 3,
  netlifyFunctionsPath: '/.netlify/functions/figma-only'
}

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

// Default mock responses for production when endpoints are missing
const PRODUCTION_FALLBACKS = {
  '/api/health': {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: 'netlify-static',
    services: {
      figmaExtractor: true,
      webExtractor: false,
      puppeteer: false
    }
  },
  '/api/settings/current': {
    success: true,
    data: {
      figma: {
        accessToken: "",
        enabled: false
      },
      mcp: {
        official: {
          enabled: false,
          serverUrl: ""
        },
        thirdParty: {
          enabled: false,
          environment: "netlify"
        }
      },
      puppeteer: {
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
      },
      thresholds: {
        colorDifference: 10,
        sizeDifference: 5,
        spacingDifference: 3,
        fontSizeDifference: 2
      }
    }
  },
  '/api/settings/save': {
    success: true,
    message: "Settings saved (static response in production)",
    data: {}
  },
  '/api/settings/test-connection': {
    success: true,
    message: "Connection test successful (static response in production)",
    data: {
      connected: true,
      details: "This is a simulated response in the Netlify environment"
    }
  },
  '/api/reports': {
    success: true,
    data: []
  }
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
    // In Netlify environment, we need to use the functions path
    if (isNetlify) {
      // Remove leading slash if present
      const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
      
      // If the URL already includes the functions path, don't add it again
      if (cleanUrl.startsWith('.netlify/functions/')) {
        return `${this.baseURL}/${cleanUrl}`;
      }
      
      // For API endpoints, use the figma-only function
      if (cleanUrl.startsWith('api/')) {
        return `${this.baseURL}${API_CONFIG.netlifyFunctionsPath}/${cleanUrl}`;
      }
      
      // For static files, use the static function
      if (cleanUrl.startsWith('reports/') || 
          cleanUrl.startsWith('images/') || 
          cleanUrl.startsWith('screenshots/')) {
        return `${this.baseURL}/.netlify/functions/static/${cleanUrl}`;
      }
      
      // Default to the figma-only function
      return `${this.baseURL}${API_CONFIG.netlifyFunctionsPath}/${cleanUrl}`;
    }
    
    // In local development, use the URL as is
    return `${this.baseURL}${url}`;
  }

  private async fetchWithRetry(url: string, options: RequestInit = {}, retryCount = 0): Promise<Response> {
    // Get the correct API URL
    const apiUrl = this.getApiUrl(url);
    
    // In production, check for fallbacks first
    if (isProduction && PRODUCTION_FALLBACKS[url]) {
      console.log(`Using fallback response for ${url} in production environment`);
      // Create a mock response
      const mockResponse = new Response(JSON.stringify(PRODUCTION_FALLBACKS[url]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      return mockResponse;
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

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
      
      // In production, if we get a 404, use fallbacks
      if (isProduction && response.status === 404) {
        // Check if we have a fallback for a similar endpoint
        const fallbackKey = Object.keys(PRODUCTION_FALLBACKS).find(key => 
          url.startsWith(key) || key.startsWith(url)
        );
        
        if (fallbackKey) {
          console.log(`Using fallback response for ${url} (matched ${fallbackKey}) in production environment`);
          return new Response(JSON.stringify(PRODUCTION_FALLBACKS[fallbackKey]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
      
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (retryCount < this.retries && (error as Error).name !== 'AbortError') {
        console.warn(`API request failed, retrying... (${retryCount + 1}/${this.retries})`)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000))
        return this.fetchWithRetry(url, options, retryCount + 1)
      }
      
      // In production, use fallbacks for failed requests
      if (isProduction) {
        const fallbackKey = Object.keys(PRODUCTION_FALLBACKS).find(key => 
          url.startsWith(key) || key.startsWith(url)
        );
        
        if (fallbackKey) {
          console.log(`Using fallback response for ${url} after error in production environment`);
          return new Response(JSON.stringify(PRODUCTION_FALLBACKS[fallbackKey]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
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
    // In production, check for fallbacks first for POST requests
    if (isProduction && PRODUCTION_FALLBACKS[endpoint]) {
      console.log(`Using fallback response for POST ${endpoint} in production environment`);
      // For settings/save, merge the submitted data with the response
      if (endpoint === '/api/settings/save' && data) {
        const fallbackResponse = { 
          ...PRODUCTION_FALLBACKS[endpoint],
          data: data // Include the submitted data in the response
        };
        return fallbackResponse as T;
      }
      // For test-connection, customize based on the type
      if (endpoint === '/api/settings/test-connection' && data) {
        const fallbackResponse = { 
          ...PRODUCTION_FALLBACKS[endpoint],
          data: {
            ...PRODUCTION_FALLBACKS[endpoint].data,
            type: data.type || 'unknown'
          }
        };
        return fallbackResponse as T;
      }
      return PRODUCTION_FALLBACKS[endpoint] as T;
    }

    const response = await this.fetchWithRetry(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
    return this.handleResponse<T>(response)
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

  // Health check method
  async healthCheck(): Promise<any> {
    return this.get('/api/health')
  }

  // Get all reports
  async getReports(): Promise<any> {
    return this.get('/api/reports')
  }

  // Get current settings
  async getCurrentSettings(): Promise<any> {
    return this.get('/api/settings/current')
  }

  // Save settings
  async saveSettings(settings: any): Promise<any> {
    return this.post('/api/settings/save', settings)
  }

  // Test connection
  async testConnection(data: any): Promise<any> {
    return this.post('/api/settings/test-connection', data)
  }

  // Get Figma data for a comparison
  async getFigmaData(comparisonId: string): Promise<any> {
    return this.get(`/api/figma/data/${comparisonId}`)
  }

  // Get web data for a comparison
  async getWebData(comparisonId: string): Promise<any> {
    return this.get(`/api/web/data/${comparisonId}`)
  }

  // Get API config
  getConfig() {
    return {
      baseURL: this.baseURL,
      timeout: this.timeout,
      retries: this.retries,
      isNetlify: isNetlify,
      isProduction: isProduction
    }
  }

  // Use Axios for larger requests
  async postAxios(url: string, data: any) {
    try {
      const apiUrl = this.getApiUrl(url);
      const response = await axios.post(apiUrl, data, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        };
      }
      throw error;
    }
  }

  // Use Axios for GET requests
  async getAxios(url: string) {
    try {
      const apiUrl = this.getApiUrl(url);
      const response = await axios.get(apiUrl, {
        timeout: this.timeout
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        };
      }
      throw error;
    }
  }

  // Create event source for server-sent events
  createEventSource(url: string) {
    // In Netlify environment, SSE is not supported
    if (isNetlify) {
      console.warn('Server-sent events are not supported in Netlify environment');
      return null;
    }
    
    const apiUrl = this.getApiUrl(url);
    return new EventSource(apiUrl);
  }
}

// Create a singleton instance
const apiService = new ApiService()
export default apiService

// Export comparison request interface
export interface ComparisonRequest {
  figmaUrl: string
  webUrl: string
  includeVisual?: boolean
  nodeId?: string | null
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

// Extract Figma data
export const extractFigmaData = async (figmaUrl: string): Promise<FigmaData> => {
  try {
    console.log('Extracting Figma data from URL:', figmaUrl);
    
    // Use the appropriate API endpoint based on environment
    const endpoint = '/api/figma/extract';
    
    const response = await apiService.post(endpoint, { figmaUrl });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to extract Figma data');
    }
    
    return response.data;
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

// Extract web data
export const extractWebData = async (url: string): Promise<WebData> => {
  try {
    console.log('Extracting web data from URL:', url);
    
    // In Netlify environment, web extraction is limited
    if (isNetlify) {
      return {
        url,
        components: [],
        metadata: {
          extractedAt: new Date().toISOString(),
          extractionMethod: 'Netlify Static',
          note: 'Web extraction is not available in Netlify environment.'
        }
      };
    }
    
    const response = await apiService.post('/api/web/extract', { url });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to extract web data');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error extracting web data:', error);
    throw error;
  }
};

// Compare URLs
export const compareUrls = async (request: ComparisonRequest): Promise<ComparisonResult> => {
  try {
    console.log('Comparing URLs:', request);
    
    // Use the appropriate API endpoint
    const endpoint = '/api/compare';
    
    // For large requests, use Axios instead of fetch
    const response = await apiService.postAxios(endpoint, request);
    
    if (!response.success) {
      throw new Error(response.error || 'Comparison failed');
    }
    
    return response.data || response;
  } catch (error) {
    console.error('Error comparing URLs:', error);
    throw error;
  }
};

// Get extractor status
export const getExtractorStatus = async (type: 'figma' | 'web') => {
  try {
    const response = await apiService.get('/api/health');
    
    if (type === 'figma') {
      return {
        available: response.services?.figmaExtractor === 'initialized' || 
                  response.services?.figmaExtractor === 'available',
        status: response.services?.figmaExtractor || 'unavailable'
      };
    } else {
      return {
        available: !isNetlify && (
          response.services?.webExtractor === 'initialized' || 
          response.services?.webExtractor === 'available'
        ),
        status: isNetlify ? 'unavailable in Netlify' : (response.services?.webExtractor || 'unavailable')
      };
    }
  } catch (error) {
    console.error(`Error getting ${type} extractor status:`, error);
    return {
      available: false,
      status: 'error',
      error: (error as Error).message
    };
  }
}; 