import { extractNodeIdFromUrl, extractFigmaFileKey } from '../utils/urlParser.js';
import { StreamingReportGenerator } from '../report/StreamingReportGenerator.js';
import ComparisonEngine from './comparisonEngine.js';

export class ComparisonService {
  constructor(figmaExtractor, webExtractor, config = {}) {
    this.figmaExtractor = figmaExtractor;
    this.webExtractor = webExtractor;
    this.comparisonEngine = new ComparisonEngine(config);
    this.reportGenerator = new StreamingReportGenerator({
      ...config,
      chunkSize: 10,
      maxStringLength: 1000000, // 1MB
      maxArraySize: 1000
    });
    this.config = config;
  }

  /**
   * Validate and extract Figma information from URL
   */
  validateFigmaUrl(figmaUrl, nodeId = null) {
    try {
      const extractedNodeId = nodeId || extractNodeIdFromUrl(figmaUrl);
      const fileKey = extractFigmaFileKey(figmaUrl);

      if (!fileKey) {
        const error = new Error('Invalid Figma URL or file key');
        error.code = 'INVALID_FIGMA_URL';
        error.stage = 'url_validation';
        error.context = {
          figmaUrl,
          providedNodeId: nodeId,
          extractedNodeId,
          fileKey
        };
        throw error;
      }

      return { nodeId: extractedNodeId, fileKey };
    } catch (error) {
      // Enhance error with context if not already enhanced
      if (!error.code) {
        const enhancedError = new Error(`Figma URL validation failed: ${error.message}`);
        enhancedError.code = 'FIGMA_URL_VALIDATION_ERROR';
        enhancedError.stage = 'url_validation';
        enhancedError.context = {
          figmaUrl,
          providedNodeId: nodeId,
          originalError: error
        };
        throw enhancedError;
      }
      throw error;
    }
  }

  /**
   * Extract Figma data with error handling
   */
  async extractFigmaData(fileKey, nodeId, options = {}) {
    try {
      console.log('🎨 Extracting Figma data...');
      console.log('📄 File key:', fileKey);
      console.log('🔍 Node ID:', nodeId || 'Not specified');

      // Extract Figma data with progress updates
      const figmaData = await this.figmaExtractor.getFigmaData(fileKey, nodeId);

      // Report progress if callback provided
      if (options.onProgress) {
        options.onProgress({
          stage: 'figma_extraction',
          progress: 100,
          status: 'complete',
          components: figmaData.components.length
        });
      }

      console.log('✅ Figma extraction complete:', figmaData.components.length, 'components');
      return figmaData;

    } catch (error) {
      // Enhance error with context
      const enhancedError = new Error(`Figma extraction failed: ${error.message}`);
      enhancedError.code = 'FIGMA_EXTRACTION_ERROR';
      enhancedError.stage = 'figma_extraction';
      enhancedError.context = {
        fileKey,
        nodeId,
        options,
        originalError: error
      };

      console.error('❌ Figma extraction failed:', {
        message: enhancedError.message,
        code: enhancedError.code,
        stage: enhancedError.stage,
        context: enhancedError.context
      });

      throw enhancedError;
    }
  }

  /**
   * Extract web data with retries and error handling
   */
  async extractWebData(webUrl, authentication, options = {}) {
    try {
      console.log('🌐 Extracting web data...');
      
      // Initialize web extractor if needed
      if (!this.webExtractor.isReady()) {
        console.log('🔄 Web extractor not ready, initializing...');
        await this.webExtractor.initialize();
      }

      // Extract web data with progress updates
      const webData = await this.webExtractor.extractWebData(webUrl, authentication);

      // Report progress if callback provided
      if (options.onProgress) {
        options.onProgress({
          stage: 'web_extraction',
          progress: 100,
          status: 'complete',
          elements: webData.elements.length
        });
      }

      console.log('✅ Web extraction:', webData.elements.length, 'elements');
      return webData;

    } catch (error) {
      // Enhance error with context
      const enhancedError = new Error(`Web extraction failed: ${error.message}`);
      enhancedError.code = 'WEB_EXTRACTION_ERROR';
      enhancedError.stage = 'web_extraction';
      enhancedError.context = {
        webUrl,
        authentication: authentication ? 'provided' : 'none',
        extractorState: {
          initialized: this.webExtractor?.isReady() || false,
          config: this.webExtractor?.config || {}
        },
        originalError: error
      };

      console.error('❌ Web extraction failed:', {
        message: enhancedError.message,
        code: enhancedError.code,
        stage: enhancedError.stage,
        context: enhancedError.context
      });

      throw enhancedError;
    }
  }

  /**
   * Perform comparison with chunking
   */
  async compareDesigns(figmaData, webData, options = {}) {
    try {
      console.log('🔍 Performing comparison...');
      return await this.comparisonEngine.compareDesigns(figmaData, webData, {
        chunkSize: options.chunkSize || 10,
        maxComponents: options.maxComponents || 1000,
        onProgress: options.onProgress
      });
    } catch (error) {
      console.error('❌ Comparison failed:', error);
      throw error;
    }
  }

  /**
   * Generate reports with streaming
   */
  async generateReports(comparisonResults, options = {}) {
    try {
      console.log('📊 Generating reports...');
      
      // Generate reports with streaming
      const reports = await this.reportGenerator.generateReports(comparisonResults, {
        onProgress: options.onProgress,
        stream: true,
        chunkSize: 10,
        maxDepth: 2,
        ...options
      });

      return reports;

    } catch (error) {
      console.error('❌ Report generation failed:', error);
      throw error;
    }
  }

  /**
   * Compare Figma design with web implementation
   */
  async compare(figmaUrl, webUrl, options = {}) {
    try {
      console.log('🔄 Starting comparison...');
      console.log('🎨 Figma URL:', figmaUrl);
      console.log('🌐 Web URL:', webUrl);

      // Validate URLs first
      const { nodeId, fileKey } = this.validateFigmaUrl(figmaUrl);
      
      if (!webUrl || !webUrl.startsWith('http')) {
        throw new Error('Invalid web URL');
      }

      // Set default timeout
      const timeout = options.timeout || 60000; // 60 seconds default
      
      // Extract data from both sources with timeout
      console.log('📥 Extracting data from both sources...');
      
      const extractionPromises = [
        Promise.race([
          this.extractFigmaData(fileKey, nodeId),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Figma extraction timeout')), timeout)
          )
        ]),
        Promise.race([
          this.extractWebData(webUrl, options.authentication),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Web extraction timeout')), timeout)
          )
        ])
      ];

      const [figmaData, webData] = await Promise.all(extractionPromises)
        .catch(error => {
          console.error('❌ Extraction failed:', error);
          throw error;
        });

      // Compare the designs with timeout
      console.log('🔍 Comparing designs...');
      const comparisonResults = await Promise.race([
        this.comparisonEngine.compareDesigns(figmaData, webData, {
          ...options,
          onProgress: options.onProgress
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Comparison timeout')), timeout)
        )
      ]);

      // Generate reports with streaming and timeout
      console.log('📊 Generating reports...');
      const reports = await Promise.race([
        this.generateReports(comparisonResults, {
          onProgress: options.onProgress,
          stream: true,
          chunkSize: 10
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Report generation timeout')), timeout)
        )
      ]);

      return {
        figmaData,
        webData,
        comparisonResults,
        reports
      };

    } catch (error) {
      // Enhance error with context
      const enhancedError = new Error(`Comparison failed: ${error.message}`);
      enhancedError.code = error.code || 'COMPARISON_ERROR';
      enhancedError.stage = error.stage || 'comparison';
      enhancedError.context = {
        figmaUrl,
        webUrl,
        options,
        originalError: error
      };

      console.error('❌ Comparison failed:', {
        message: enhancedError.message,
        code: enhancedError.code,
        stage: enhancedError.stage,
        context: enhancedError.context
      });

      throw enhancedError;
    }
  }
} 