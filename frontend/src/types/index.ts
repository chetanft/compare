export type Page = 'dashboard' | 'comparison' | 'reports' | 'settings'

export interface ComparisonRequest {
  figmaUrl: string
  webUrl: string
  webSelector?: string
  nodeId?: string | null
  authentication?: AuthenticationConfig
  includeVisual?: boolean
}

export interface AuthenticationConfig {
  type: 'credentials' | 'cookies' | 'headers' | 'manual'
  loginUrl?: string
  username?: string
  password?: string
  cookies?: Array<{
    name: string
    value: string
    domain: string
  }>
  headers?: Record<string, string>
  waitTime?: number
  successIndicator?: string
}

export interface ComparisonResult {
  success: boolean
  comparisonId?: string
  message?: string
  stages?: string[]
  summary?: {
    figma: {
      fileId: string
      fileName: string
      componentsExtracted: number
    }
    web: {
      url: string
      elementsExtracted: number
      authenticationUsed: string
    }
    comparison: {
      componentsAnalyzed: number
      totalDeviations: number
      totalMatches: number
      severity: {
        high: number
        medium: number
        low: number
      }
    }
  }
  reports?: {
    html: string
    json: string
    categorized?: string
  }
  metadata?: {
    comparisonId?: string
    timestamp?: string
    toolVersion?: string
  }
  error?: string
}

export interface Report {
  name: string
  path: string
  type: 'html' | 'json'
  timestamp?: string
  created?: string
}

export interface HealthStatus {
  status: string
  timestamp: string
  figma?: {
    connectionType: string
    status: string
  }
  mcp?: {
    available: boolean
    serverUrl?: string
  }
}

export interface ComparisonReport {
  id: string
  name?: string
  figmaUrl?: string
  webUrl?: string
  status: 'success' | 'error' | 'pending'
  createdAt: string
  updatedAt?: string
  htmlPath?: string
  jsonPath?: string
  summary?: {
    figma?: {
      componentsExtracted: number
    }
    web?: {
      elementsExtracted: number
    }
    comparison?: {
      totalMatches: number
    }
  }
} 