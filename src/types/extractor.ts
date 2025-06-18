export interface ExtractedData {
  id: string;
  timestamp: number;
  source: string;
  data: any; // Will be extended by specific extractor types
  metadata: {
    version: string;
    extractorType: string;
    [key: string]: any;
  };
}

export interface ExtractorOptions {
  timeout?: number;
  retryAttempts?: number;
  cacheEnabled?: boolean;
  validateBeforeExtract?: boolean;
  [key: string]: any; // Allow extractor-specific options
}

export interface FigmaData extends ExtractedData {
  data: {
    document: any;
    components: any[];
    styles: any[];
    [key: string]: any;
  };
}

export interface WebData extends ExtractedData {
  data: {
    html: string;
    screenshots: string[];
    resources: string[];
    [key: string]: any;
  };
} 