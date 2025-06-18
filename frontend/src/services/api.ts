import { getApiBaseUrl } from '../utils/environment'
import axios from 'axios'
import { FigmaData, WebData } from '../../../src/types/extractor'
import { ComparisonResult } from '../../../src/services/comparison/ComparisonEngine'

// API Configuration and Service Layer
const API_CONFIG = {
  baseURL: getApiBaseUrl() || 'http://localhost:3007',
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

class ApiService {
  private baseURL: string
  private timeout: number
  private retries: number

  constructor() {
    this.baseURL = API_CONFIG.baseURL || 'http://localhost:3007'
    this.timeout = API_CONFIG.timeout
    this.retries = API_CONFIG.retries
  }

  private async fetchWithRetry(url: string, options: RequestInit = {}, retryCount = 0): Promise<Response> {
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
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (retryCount < this.retries && (error as Error).name !== 'AbortError') {
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
const API_BASE_URL = getApiBaseUrl() || 'http://localhost:3007'

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