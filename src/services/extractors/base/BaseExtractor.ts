import { ExtractedData, ExtractorOptions } from '../../../types/extractor.js';

export interface BaseExtractor {
  /**
   * Extract data from the source
   */
  extract(): Promise<ExtractedData>;

  /**
   * Validate the extractor configuration
   */
  validate(): Promise<boolean>;

  /**
   * Clean up resources
   */
  cleanup(): Promise<void>;

  /**
   * Initialize the extractor with options
   */
  initialize(options: ExtractorOptions): Promise<void>;

  /**
   * Get current extraction status
   */
  getStatus(): Promise<ExtractorStatus>;
}

export interface ExtractorStatus {
  isReady: boolean;
  error?: Error;
  progress?: number;
  stage?: string;
}

export class ExtractorError extends Error {
  code: string;
  originalError?: Error;

  constructor(code: string, originalError?: Error) {
    super(`Extraction failed: ${code}`);
    this.name = 'ExtractorError';
    this.code = code;
    this.originalError = originalError;
  }
} 