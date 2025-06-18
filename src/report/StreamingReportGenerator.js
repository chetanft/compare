import { promises as fs } from 'fs';
import { createWriteStream } from 'fs';
import path from 'path';
import ReportGenerator from './reportGenerator.js';

export class StreamingReportGenerator extends ReportGenerator {
  constructor(config = {}) {
    super(config);
    this.chunkSize = config.chunkSize || 5;
    this.maxStringLength = config.maxStringLength || 500000; // Reduced from 1MB
    this.maxArraySize = config.maxArraySize || 500; // Reduced from 1000
  }

  /**
   * Generate reports with streaming support for large datasets
   */
  async generateReports(comparisonData, options = {}) {
    try {
      const { comparisons = [], metadata = {}, summary = {} } = comparisonData;
      
      // Generate reports in parallel using streams
      const [htmlReport, jsonReport] = await Promise.all([
        this.generateStreamingHTML(comparisons, metadata, summary, options),
        this.generateStreamingJSON(comparisons, metadata, summary, options)
      ]);

      // Write reports to files
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const htmlPath = path.join(this.outputDir, `comparison-${timestamp}.html`);
      const jsonPath = path.join(this.outputDir, `comparison-${timestamp}.json`);

      // Ensure output directory exists
      await fs.promises.mkdir(this.outputDir, { recursive: true });

      // Write reports
      await Promise.all([
        fs.promises.writeFile(htmlPath, htmlReport),
        fs.promises.writeFile(jsonPath, JSON.stringify(jsonReport, null, 2))
      ]);

      return {
        html: htmlPath,
        json: jsonPath,
        timestamp,
        summary: {
          totalComparisons: comparisons.length,
          ...summary
        }
      };

    } catch (error) {
      console.error('❌ Report generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate streaming HTML report
   */
  async generateStreamingHTML(comparisons, metadata, summary, options = {}) {
    try {
      const { chunkSize = 10 } = options;
      let html = this.generateHTMLHeader(metadata);

      // Process comparisons in chunks
      for (let i = 0; i < comparisons.length; i += chunkSize) {
        const chunk = comparisons.slice(i, i + chunkSize);
        html += await this.processComparisonChunk(chunk, i / comparisons.length);

        // Report progress
        if (options.onProgress) {
          options.onProgress({
            stage: 'html_generation',
            progress: (i + chunk.length) / comparisons.length * 100,
            processed: i + chunk.length,
            total: comparisons.length
          });
        }
      }

      html += this.generateHTMLFooter(summary);
      return html;

    } catch (error) {
      console.error('❌ HTML report generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate streaming JSON report
   */
  async generateStreamingJSON(comparisons, metadata, summary, options = {}) {
    try {
      const { chunkSize = 10 } = options;
      const report = {
        metadata,
        summary,
        comparisons: [],
        timestamp: new Date().toISOString()
      };

      // Process comparisons in chunks
      for (let i = 0; i < comparisons.length; i += chunkSize) {
        const chunk = comparisons.slice(i, i + chunkSize);
        report.comparisons.push(...chunk);

        // Report progress
        if (options.onProgress) {
          options.onProgress({
            stage: 'json_generation',
            progress: (i + chunk.length) / comparisons.length * 100,
            processed: i + chunk.length,
            total: comparisons.length
          });
        }
      }

      return report;

    } catch (error) {
      console.error('❌ JSON report generation failed:', error);
      throw error;
    }
  }

  /**
   * Process a chunk of comparisons for HTML report
   */
  async processComparisonChunk(chunk, progress) {
    let html = '';
    for (const comparison of chunk) {
      html += `
        <div class="comparison">
          <h3>${comparison.title || 'Untitled Comparison'}</h3>
          <div class="metadata">
            <p>URL: ${comparison.url}</p>
            <p>Timestamp: ${comparison.timestamp}</p>
          </div>
          <div class="elements">
            <h4>Elements (${comparison.elements.length})</h4>
            ${this.renderElements(comparison.elements)}
          </div>
          <div class="semantic">
            <h4>Semantic Elements (${comparison.semanticElements.length})</h4>
            ${this.renderSemanticElements(comparison.semanticElements)}
          </div>
        </div>
      `;
    }
    return html;
  }

  /**
   * Render elements for HTML report
   */
  renderElements(elements) {
    return elements.map(el => `
      <div class="element">
        <span class="tag">${el.tag}</span>
        ${el.id ? `<span class="id">#${el.id}</span>` : ''}
        ${el.classes.length ? `<span class="classes">.${el.classes.join('.')}</span>` : ''}
        ${el.text ? `<span class="text">${el.text}</span>` : ''}
      </div>
    `).join('');
  }

  /**
   * Render semantic elements for HTML report
   */
  renderSemanticElements(elements) {
    return elements.map(el => `
      <div class="semantic-element">
        <span class="type">${el.type}</span>
        ${el.role ? `<span class="role">[${el.role}]</span>` : ''}
        ${el.text ? `<span class="text">${el.text}</span>` : ''}
      </div>
    `).join('');
  }

  /**
   * Generate HTML header with metadata and summary
   */
  generateHTMLHeader(title, metadata, summary) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .header { margin-bottom: 30px; }
          .summary { margin-bottom: 30px; padding: 15px; background: #f5f5f5; }
          .comparison-item { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; }
          .deviation { color: #d32f2f; }
          .match { color: #388e3c; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${title}</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
        <div class="summary">
          <h2>Summary</h2>
          <p>Total Components: ${summary.totalComponents || 0}</p>
          <p>Total Deviations: ${summary.totalDeviations || 0}</p>
          <p>Total Matches: ${summary.totalMatches || 0}</p>
        </div>
        <div class="comparisons">
    `;
  }

  /**
   * Generate HTML footer
   */
  generateHTMLFooter(summary) {
    return `
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Split array into chunks
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Sanitize data to prevent memory issues
   */
  sanitizeData(data) {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.slice(0, this.maxArraySize).map(item => this.sanitizeData(item));
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' && value.length > this.maxStringLength) {
        sanitized[key] = value.substring(0, this.maxStringLength) + '... (truncated)';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
} 