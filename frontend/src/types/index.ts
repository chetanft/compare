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
  figma?: {
    componentCount?: number;
    colors?: string[]; // Direct hex strings like "#ffffff"
    typography?: {
      fontFamilies?: string[];
      fontSizes?: string[];
      fontWeights?: string[];
    } | any[];
    spacing?: string[]; // Spacing values like "padding: 13px 20px 13px 20px"
    borderRadius?: string[]; // Border radius values like "8px"
    extractionTime?: number;
    fileInfo?: { name?: string, nodeId?: string };
  };
  web?: {
    elementCount?: number;
    colors?: string[];
    typography?: {
      fontFamilies?: string[];
      fontSizes?: string[];
      fontWeights?: string[];
    } | any[];
    spacing?: string[];
    borderRadius?: string[];
    extractionTime?: number;
    urlInfo?: { url?: string, title?: string };
  };
  comparison?: {
    totalComparisons?: number;
    matches?: number;
    deviations?: number;
    matchPercentage?: number;
  };
}

// Unified API Response Format
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    message: string
    code: string
    stage?: string
    details?: any
  }
  timestamp: string
  processingTime?: string
}

// Standardized Comparison Result
export interface ComparisonResult extends ApiResponse<ComparisonData> {
  comparisonId?: string
  id?: string
  reportPath?: string | null
  reports?: ComparisonData['reports'] | null
  extractionDetails?: ComparisonData['extractionDetails']
  figmaData?: ComparisonData['figmaData']
  webData?: ComparisonData['webData']
  colorAnalysis?: any // Add colorAnalysis for direct access
  comparison?: any // Add comparison for direct access
}

export interface ComparisonData {
  // Main comparison metrics
  comparison: {
    overallSimilarity: number
    totalComparisons: number
    matchedElements: number
    discrepancies: number
    colorAnalysis?: any // Add nested colorAnalysis
  }

  // Detailed extraction information
  extractionDetails: {
    figma: {
      componentCount?: number
      colors?: string[] // Direct hex strings
      typography?: {
        fontFamilies?: string[]
        fontSizes?: string[]
        fontWeights?: string[]
      } | any[] // Allow array fallback
      spacing?: string[]
      borderRadius?: string[]
      extractionTime?: number
      fileInfo?: {
        name?: string
        nodeId?: string
      }
      fileKey?: string
      fileName?: string
      url?: string
    }
    web: {
      elementCount?: number
      colors?: string[]
      typography?: {
        fontFamilies?: string[]
        fontSizes?: string[]
        fontWeights?: string[]
      } | any[] // Allow array fallback
      spacing?: string[]
      borderRadius?: string[]
      extractionTime?: number
      urlInfo?: {
        url?: string
        title?: string
      }
      extractorVersion?: string
    }
    comparison: {
      matches: number
      deviations: number
      matchPercentage: number
    }
  }

  // Raw data for detailed analysis
  figmaData?: {
    components: any[]
    metadata: any
    // specific fields might be available here too depending on extraction mode
    componentCount?: number
    colors?: any[]
    typography?: any
    spacing?: any[]
    borderRadius?: any[]
  }
  webData?: {
    elements: any[]
    metadata: any
    elementCount?: number
    colors?: any[]
    typography?: any
    spacing?: any[]
    borderRadius?: any[]
  }

  // Report information
  reportPath?: string
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
  colorPalettes?: {
    figma: ColorExtraction[]
    developed: ColorExtraction[]
    comparison: ColorComparison
  }
  reportPath: string
  createdAt: string
  processingTime: number
}

export interface ColorExtraction {
  hex: string
  rgb: { r: number; g: number; b: number }
  count: number
  frequency: number
  source: string
  location: { x: number; y: number; width: number; height: number }
}

export interface ColorComparison {
  totalFigmaColors: number
  totalDevelopedColors: number
  matchedColors: Array<{
    figmaColor: string
    developedColor: string
    similarity: number
    figmaFrequency: number
    developedFrequency: number
  }>
  missingColors: Array<{
    color: string
    frequency: number
    closestMatch: string
    distance: number
  }>
  extraColors: Array<{
    color: string
    frequency: number
    closestFigmaMatch: string
    distance: number
  }>
  colorSimilarity: number
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