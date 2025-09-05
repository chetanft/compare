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

export interface ComparisonResult {
  success?: boolean
  data?: {
    reports?: {
      directUrl?: string
      downloadUrl?: string
      hasError?: boolean
    }
    reportPath?: string // Added reportPath for direct HTML report access
    extractionDetails?: ExtractionDetails
    [key: string]: any
  }
  reportPath?: string // Added reportPath at root level
  extractionDetails?: ExtractionDetails
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

// Screenshot Comparison Types
export interface ScreenshotComparisonRequest {
  figmaScreenshot: File
  developedScreenshot: File
  settings: ComparisonSettings
  metadata?: {
    projectName?: string
    componentName?: string
    description?: string
  }
}

export interface ComparisonSettings {
  threshold: number // 0.1 - 1.0
  colorTolerance: number // 0-255
  ignoreAntiAliasing: boolean
  includeTextAnalysis: boolean
  layoutAnalysis: boolean
  colorAnalysis: boolean
  spacingAnalysis: boolean
}

export interface ScreenshotComparisonResult {
  id: string
  status: 'processing' | 'completed' | 'failed'
  figmaScreenshotPath: string
  developedScreenshotPath: string
  diffImagePath: string
  sideBySidePath: string
  metrics: {
    overallSimilarity: number
    pixelDifferences: number
    totalPixels: number
    totalDiscrepancies: number
    severityBreakdown: {
      high: number
      medium: number
      low: number
    }
    discrepancyTypes: {
      color: number
      layout: number
      text: number
      spacing: number
      missingElement: number
      extraElement: number
    }
    qualityScore: number
  }
  discrepancies: Discrepancy[]
  enhancedAnalysis?: EnhancedAnalysis
  reportPath: string
  createdAt: string
  processingTime: number
}

export interface Discrepancy {
  id: string
  type: 'color' | 'layout' | 'text' | 'spacing' | 'missing-element' | 'extra-element'
  severity: 'high' | 'medium' | 'low'
  description: string
  location: {
    x: number
    y: number
    width: number
    height: number
  }
  figmaValue?: string
  developedValue?: string
  recommendation?: string
}

export interface ScreenshotUploadResponse {
  uploadId: string
}

export interface ScreenshotComparisonListItem {
  id: string
  status: 'processing' | 'completed' | 'failed'
  createdAt: string
  metrics?: {
    overallSimilarity: number
    totalDiscrepancies: number
    qualityScore: number
  }
}

// Enhanced Analysis Types
export interface EnhancedAnalysis {
  timestamp: string
  overallScore: number
  insights: Insight[]
  recommendations: Recommendation[]
  issueBreakdown: IssueBreakdown
  designPatternAnalysis?: any
  aiSummary: string
  actionItems: ActionItem[]
  quickWins?: QuickWin[]
}

export interface Insight {
  type: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: string
  title: string
  description: string
  suggestion: string
  confidence?: number
  impact?: string
  location?: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface Recommendation {
  priority: 'high' | 'medium' | 'low'
  category: string
  title: string
  description: string
  action: string
  estimatedTime: string
  impact?: string
  effort?: 'Low' | 'Medium' | 'High'
}

export interface IssueBreakdown {
  bySeverity: {
    critical: number
    high: number
    medium: number
    low: number
  }
  byCategory: Record<string, number>
  total: number
}

export interface ActionItem {
  id: number
  priority: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  category: string
  estimatedTime: string
  confidence?: number
}

export interface QuickWin {
  title: string
  description: string
  action: string
  estimatedTime: string
  impact: string
  confidence?: number
  category: string
} 