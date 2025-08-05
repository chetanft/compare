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
  type: 'form' | 'credentials' | 'cookies' | 'headers' | 'manual' | 'none'
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
  figmaToken?: string
}

export interface ComparisonResult {
  success?: boolean
  data?: {
    reports?: {
      directUrl?: string
      downloadUrl?: string
      hasError?: boolean
    }
    reportPath?: string // Added reportPath for direct HTML report access
    [key: string]: any
  }
  reportPath?: string // Added reportPath at root level
  comparisonId?: string
  id?: string
  timestamp?: string
  figmaData?: {
    fileId?: string
    fileName?: string
    componentsCount?: number
    components?: any[]
  }
  webData?: {
    url?: string
    elementsCount?: number
    elements?: any[]
  }
  comparison?: {
    matches?: any[]
    mismatches?: any[]
    missing?: any[]
    extra?: any[]
  }
  metadata?: {
    extractedAt?: string
    figmaComponentCount?: number
    webComponentCount?: number
    matchCount?: number
    mismatchCount?: number
    missingCount?: number
    extraCount?: number
  }
  reports?: {
    directUrl?: string
    downloadUrl?: string
    hasError?: boolean
  }
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