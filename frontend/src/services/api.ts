import { getApiBaseUrl } from '../utils/environment'
import axios from 'axios'
import { FigmaData, WebData } from '../../../src/types/extractor'
import { ComparisonResult } from '../../../src/services/comparison/ComparisonEngine'
import { isProduction } from '../utils/environment'

// API Configuration and Service Layer
const API_CONFIG = {
  baseURL: getApiBaseUrl(),
  timeout: 120000,
  retries: 3
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

  private async fetchWithRetry(url: string, options: RequestInit = {}, retryCount = 0): Promise<Response> {
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
      const response = await fetch(`${this.baseURL}${url}`, {
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
      
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorData.message || errorMessage
      } catch {
        // If response is not JSON, use status text
      }
      
      const error: ApiError = {
        message: errorMessage,
        status: response.status,
        code: response.status.toString()
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

  // Reports method
  async getReports(): Promise<any> {
    return this.get('/api/reports')
  }

  // Settings methods
  async getCurrentSettings(): Promise<any> {
    return this.get('/api/settings/current')
  }

  async saveSettings(settings: any): Promise<any> {
    return this.post('/api/settings/save', settings)
  }

  async testConnection(data: any): Promise<any> {
    return this.post('/api/settings/test-connection', data)
  }

  // Figma data method
  async getFigmaData(comparisonId: string): Promise<any> {
    return this.get(`/api/comparison/${comparisonId}/figma-data`)
  }

  // Web data method
  async getWebData(comparisonId: string): Promise<any> {
    return this.get(`/api/comparison/${comparisonId}/web-data`)
  }

  // Get current API configuration
  getConfig() {
    return {
      baseURL: this.baseURL,
      timeout: this.timeout,
      retries: this.retries
    }
  }

  async postAxios(url: string, data: any) {
    try {
      const response = await axios.post(url, data, {
        headers: {
          'Content-Type': 'application/json'
        }
      })
      return response.data
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data.details || error.response.data.error || 'Request failed')
      }
      throw error
    }
  }

  async getAxios(url: string) {
    try {
      const response = await axios.get(url)
      return response.data
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data.details || error.response.data.error || 'Request failed')
      }
      throw error
    }
  }

  createEventSource(url: string) {
    return new EventSource(url)
  }
}

export const apiService = new ApiService()
export default apiService

// Use the same API base URL from environment
const API_BASE_URL = getApiBaseUrl()

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
})

export interface ComparisonRequest {
  figmaUrl: string
  webUrl: string
  includeVisual?: boolean
  authentication?: {
    figmaToken?: string
    webAuth?: {
      username?: string
      password?: string
    }
  }
}

export const extractFigmaData = async (figmaUrl: string): Promise<FigmaData> => {
  try {
    const response = await api.get('/figma/extract', {
      params: { figmaUrl }
    })
    return response.data.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 422) {
        throw new Error('The specified Figma frame is detached. Please select a valid frame.')
      }
      throw new Error(error.response?.data?.message || 'Failed to extract Figma data')
    }
    throw error
  }
}

export const extractWebData = async (url: string): Promise<WebData> => {
  try {
    const response = await api.get('/web/extract', {
      params: { url }
    })
    return response.data.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'Failed to extract web data')
    }
    throw error
  }
}

export const compareUrls = async (request: ComparisonRequest): Promise<ComparisonResult> => {
  try {
    const response = await api.post('/api/compare', request);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Comparison failed');
    }
    
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.error?.message || 
                         error.response?.data?.message || 
                         error.message || 
                         'Failed to compare URLs';
      throw new Error(errorMessage);
    }
    throw error;
  }
}

export const getExtractorStatus = async (type: 'figma' | 'web') => {
  try {
    const response = await api.get(`/status/${type}`)
    return response.data.status
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'Failed to get status')
    }
    throw error
  }
} 