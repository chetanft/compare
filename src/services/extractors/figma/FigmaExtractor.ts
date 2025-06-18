import { BaseExtractor, ExtractorError, ExtractorStatus } from '../base/BaseExtractor.js';
import { ExtractorOptions, FigmaData } from '../../../types/extractor.js';
import FigmaMCPIntegration from '../../../figma/mcpIntegration.js';

interface FigmaUrlInfo {
  fileKey: string;
  nodeId?: string | null;
}

export class FigmaExtractor implements BaseExtractor {
  private status: ExtractorStatus = { isReady: false };
  private options: ExtractorOptions = {};
  private figmaFileKey: string = '';
  private nodeId?: string | null;
  private mcpIntegration: FigmaMCPIntegration;

  constructor() {
    this.mcpIntegration = new FigmaMCPIntegration();
  }

  private parseFigmaUrl(url: string): FigmaUrlInfo {
    try {
      const figmaUrl = new URL(url);
      const pathParts = figmaUrl.pathname.split('/');
      
      // Find the file key - it's usually after 'file' or 'design' in the path
      let fileKey = '';
      for (let i = 0; i < pathParts.length - 1; i++) {
        if (pathParts[i] === 'file' || pathParts[i] === 'design') {
          fileKey = pathParts[i + 1];
          break;
        }
      }

      const nodeId = figmaUrl.searchParams.get('node-id');

      if (!fileKey) {
        throw new ExtractorError('INVALID_FIGMA_URL');
      }

      return { fileKey, nodeId };
    } catch (error) {
      throw new ExtractorError('FIGMA_URL_PARSE_FAILED', error as Error);
    }
  }

  private async validateFrame(fileKey: string, nodeId?: string | null): Promise<boolean> {
    try {
      await this.mcpIntegration.initialize();
      const response = await this.mcpIntegration.getFigmaData(fileKey, nodeId, 1); // Minimal depth for validation

      // Check if frame exists and is not detached
      if (nodeId && (!response || !response.document)) {
        throw new ExtractorError('FRAME_NOT_FOUND');
      }

      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('detached Frame')) {
        throw new ExtractorError('DETACHED_FRAME', error);
      }
      throw error;
    }
  }

  async initialize(options: ExtractorOptions & { figmaUrl: string }): Promise<void> {
    try {
      this.options = options;
      const { figmaUrl } = options;

      if (!figmaUrl) {
        throw new ExtractorError('FIGMA_URL_MISSING');
      }

      // Parse Figma URL
      const { fileKey, nodeId } = this.parseFigmaUrl(figmaUrl);
      this.figmaFileKey = fileKey;
      this.nodeId = nodeId;

      // Initialize MCP integration
      await this.mcpIntegration.initialize();

      // Validate frame if nodeId is provided
      if (nodeId) {
        await this.validateFrame(fileKey, nodeId);
      }

      this.status = { isReady: true };
    } catch (error) {
      this.status = { 
        isReady: false, 
        error: error instanceof Error ? error : new Error('Unknown error') 
      };
      throw error;
    }
  }

  async validate(): Promise<boolean> {
    try {
      if (!this.status.isReady) {
        throw new ExtractorError('FIGMA_NOT_INITIALIZED');
      }

      return await this.validateFrame(this.figmaFileKey, this.nodeId);
    } catch (error) {
      throw new ExtractorError('FIGMA_VALIDATION_FAILED', error as Error);
    }
  }

  async extract(): Promise<FigmaData> {
    try {
      this.status.stage = 'EXTRACTING';
      this.status.progress = 0;

      if (this.options.validateBeforeExtract) {
        await this.validate();
      }

      await this.mcpIntegration.initialize();
      const figmaData = await this.mcpIntegration.getFigmaData(this.figmaFileKey, this.nodeId);

      this.status.progress = 100;
      
      return {
        id: `figma-${this.figmaFileKey}-${Date.now()}`,
        timestamp: Date.now(),
        source: 'figma',
        data: figmaData,
        metadata: {
          version: '1.0.0',
          extractorType: 'figma',
          fileKey: this.figmaFileKey,
          nodeId: this.nodeId
        }
      };
    } catch (error) {
      this.status.error = error as Error;
      throw new ExtractorError('FIGMA_EXTRACTION_FAILED', error as Error);
    }
  }

  async cleanup(): Promise<void> {
    this.status = { isReady: false };
  }

  async getStatus(): Promise<ExtractorStatus> {
    return this.status;
  }
} 