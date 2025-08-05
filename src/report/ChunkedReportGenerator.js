import { promises as fs } from 'fs';
import path from 'path';
import { ErrorHandlingService } from '../utils/ErrorHandlingService.js';

export class ChunkedReportGenerator {
  constructor(config = {}) {
    this.config = {
      chunkSize: 10,
      maxStringLength: 1000000, // 1MB
      maxArraySize: 1000,
      outputDir: 'output/reports',
      ...config
    };

    this.errorHandler = new ErrorHandlingService();
  }

  /**
   * Generate report in chunks to handle large datasets
   */
  async generateReport(data, options = {}) {
    const {
      format = 'json',
      compress = true,
      includeScreenshots = true
    } = options;

    try {
      // Create output directory if it doesn't exist
      await fs.mkdir(this.config.outputDir, { recursive: true });

      // Generate unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `comparison-${timestamp}.${format}`;
      const reportPath = path.join(this.config.outputDir, filename);

      // Process data in chunks
      const chunks = this.chunkifyData(data);

      let processedChunks = 0;
      const processedData = {
        metadata: {
          generatedAt: timestamp,
          version: '2.0.0',
          chunkCount: chunks.length,
          options
        },
        components: []
      };

      // Process each chunk
      for (const [index, chunk] of chunks.entries()) {
        
        // Process chunk data
        const processedChunk = await this.processChunk(chunk, {
          maxStringLength: this.config.maxStringLength,
          maxArraySize: this.config.maxArraySize
        });

        // Add processed chunk to final data
        processedData.components.push(...processedChunk);
        processedChunks++;

        // Write intermediate results
        if (processedChunks % 5 === 0 || processedChunks === chunks.length) {
          await this.writeChunk(reportPath, processedData, { format, compress });
        }
      }

      return {
        reportPath,
        stats: {
          totalChunks: chunks.length,
          processedChunks,
          timestamp
        }
      };
    } catch (error) {
      const categorizedError = this.errorHandler.categorizeError(error, {
        type: 'report_generation',
        format,
        dataSize: JSON.stringify(data).length
      });

      throw categorizedError;
    }
  }

  /**
   * Split data into manageable chunks
   */
  chunkifyData(data) {
    const components = data.components || [];
    const chunks = [];
    
    for (let i = 0; i < components.length; i += this.config.chunkSize) {
      chunks.push(components.slice(i, i + this.config.chunkSize));
    }

    return chunks;
  }

  /**
   * Process a single chunk of data
   */
  async processChunk(chunk, options) {
    const { maxStringLength, maxArraySize } = options;

    return chunk.map(component => {
      // Sanitize component data
      const sanitized = this.sanitizeData(component, {
        maxStringLength,
        maxArraySize
      });

      return {
        ...sanitized,
        processed: true,
        timestamp: new Date().toISOString()
      };
    });
  }

  /**
   * Sanitize data to prevent memory issues
   */
  sanitizeData(data, options) {
    const { maxStringLength, maxArraySize } = options;

    if (typeof data !== 'object' || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.slice(0, maxArraySize).map(item => 
        this.sanitizeData(item, options)
      );
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' && value.length > maxStringLength) {
        sanitized[key] = value.slice(0, maxStringLength) + '...';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value, options);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Write chunk to file
   */
  async writeChunk(filePath, data, options) {
    const { format, compress } = options;
    
    let content = '';
    if (format === 'json') {
      content = JSON.stringify(data, null, compress ? 0 : 2);
    } else {
      throw new Error(`Unsupported format: ${format}`);
    }

    await fs.writeFile(filePath, content, 'utf8');
  }
} 