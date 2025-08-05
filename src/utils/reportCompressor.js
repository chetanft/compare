/**
 * Report Compression Utility
 * Reduces report file sizes and provides optional detailed/summary modes
 */

import { promises as fs } from 'fs';
import path from 'path';
import zlib from 'zlib';

export class ReportCompressor {
  /**
   * Compress report data with different modes
   * @param {Object} reportData - Original report data
   * @param {Object} options - Compression options
   * @returns {Object} Compressed report data
   */
  static compressReport(reportData, options = {}) {
    const {
      mode = 'detailed', // 'summary', 'detailed', 'full'
      maxComponents = 1000,
      maxDeviations = 500,
      includeStyles = true,
      includePositions = true,
      compressStrings = true
    } = options;

    const compressed = {
      metadata: this.compressMetadata(reportData.metadata),
      summary: reportData.summary,
      mode,
      compressionInfo: {
        originalSize: JSON.stringify(reportData).length,
        compressedAt: new Date().toISOString(),
        compressionRatio: 0 // Will be calculated later
      }
    };

    switch (mode) {
      case 'summary':
        compressed.comparisons = this.createSummaryComparisons(reportData.comparisons);
        break;
      case 'detailed':
        compressed.comparisons = this.createDetailedComparisons(reportData.comparisons, {
          maxComponents,
          maxDeviations,
          includeStyles,
          includePositions
        });
        break;
      case 'full':
      default:
        compressed.comparisons = reportData.comparisons;
        break;
    }

    // Apply string compression if enabled
    if (compressStrings) {
      compressed.comparisons = this.compressStrings(compressed.comparisons);
    }

    // Calculate compression ratio
    const compressedSize = JSON.stringify(compressed).length;
    compressed.compressionInfo.compressedSize = compressedSize;
    compressed.compressionInfo.compressionRatio = ((compressed.compressionInfo.originalSize - compressedSize) / compressed.compressionInfo.originalSize * 100).toFixed(1);

    return compressed;
  }

  /**
   * Create summary-only comparisons (minimal data)
   */
  static createSummaryComparisons(comparisons) {
    return comparisons.slice(0, 100).map(comp => ({
      componentId: comp.componentId,
      componentName: comp.componentName,
      componentType: comp.componentType,
      status: comp.status,
      deviationCount: comp.deviations?.length || 0,
      matchCount: comp.matches?.length || 0,
      severity: this.getHighestSeverity(comp.deviations),
      topDeviations: comp.deviations?.slice(0, 3).map(dev => ({
        property: dev.property,
        severity: dev.severity,
        difference: dev.difference
      })) || []
    }));
  }

  /**
   * Create detailed comparisons (moderate compression)
   */
  static createDetailedComparisons(comparisons, options) {
    const { maxComponents, maxDeviations, includeStyles, includePositions } = options;
    
    return comparisons.slice(0, maxComponents).map(comp => {
      const compressed = {
        componentId: comp.componentId,
        componentName: comp.componentName,
        componentType: comp.componentType,
        selector: comp.selector,
        status: comp.status,
        deviations: comp.deviations?.slice(0, maxDeviations).map(dev => ({
          property: dev.property,
          figmaValue: this.compressValue(dev.figmaValue),
          webValue: this.compressValue(dev.webValue),
          difference: dev.difference,
          severity: dev.severity,
          message: dev.message
        })) || [],
        matches: comp.matches?.slice(0, 10) || [] // Limit matches
      };

      // Conditionally include styles and positions
      if (includeStyles && comp.styles) {
        compressed.styles = this.compressStyles(comp.styles);
      }

      if (includePositions && comp.position) {
        compressed.position = comp.position;
      }

      return compressed;
    });
  }

  /**
   * Compress metadata
   */
  static compressMetadata(metadata) {
    if (!metadata) return metadata;

    return {
      figma: {
        fileId: metadata.figma?.fileId,
        fileName: metadata.figma?.fileName,
        extractedAt: metadata.figma?.extractedAt,
        componentCount: metadata.figma?.components?.length || 0
      },
      web: {
        url: metadata.web?.url,
        extractedAt: metadata.web?.extractedAt,
        elementsCount: metadata.web?.elementsCount || 0
      },
      comparedAt: metadata.comparedAt,
      summary: metadata.summary
    };
  }

  /**
   * Compress style objects
   */
  static compressStyles(styles) {
    if (!styles || typeof styles !== 'object') return styles;

    const compressed = {};
    
    // Only include non-default/meaningful styles
    const meaningfulProperties = [
      'fontSize', 'fontFamily', 'fontWeight', 'color', 'backgroundColor',
      'padding', 'margin', 'borderRadius', 'boxShadow', 'width', 'height'
    ];

    meaningfulProperties.forEach(prop => {
      if (styles[prop] && styles[prop] !== 'initial' && styles[prop] !== 'auto') {
        compressed[prop] = this.compressValue(styles[prop]);
      }
    });

    return compressed;
  }

  /**
   * Compress individual values
   */
  static compressValue(value) {
    if (typeof value === 'string') {
      // Compress long strings
      if (value.length > 100) {
        return value.substring(0, 97) + '...';
      }
      
      // Compress repeated patterns
      if (value.includes('rgb(')) {
        return value.replace(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/g, 'rgb($1,$2,$3)');
      }
      
      return value;
    }
    
    if (typeof value === 'number') {
      // Round numbers to reasonable precision
      return Math.round(value * 100) / 100;
    }
    
    return value;
  }

  /**
   * Compress repeated strings using a dictionary approach
   */
  static compressStrings(data) {
    const stringDict = new Map();
    let dictIndex = 0;
    
    const compress = (obj) => {
      if (typeof obj === 'string') {
        if (obj.length > 20) {
          if (!stringDict.has(obj)) {
            stringDict.set(obj, `__STR_${dictIndex++}__`);
          }
          return stringDict.get(obj);
        }
        return obj;
      }
      
      if (Array.isArray(obj)) {
        return obj.map(compress);
      }
      
      if (obj && typeof obj === 'object') {
        const compressed = {};
        for (const [key, value] of Object.entries(obj)) {
          compressed[key] = compress(value);
        }
        return compressed;
      }
      
      return obj;
    };

    const compressedData = compress(data);
    
    // Add dictionary for decompression
    if (stringDict.size > 0) {
      const dictionary = {};
      for (const [original, compressed] of stringDict.entries()) {
        dictionary[compressed] = original;
      }
      
      return {
        data: compressedData,
        stringDictionary: dictionary,
        compressed: true
      };
    }
    
    return compressedData;
  }

  /**
   * Get highest severity from deviations
   */
  static getHighestSeverity(deviations) {
    if (!deviations || deviations.length === 0) return 'none';
    
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    
    return deviations.reduce((highest, dev) => {
      const currentLevel = severityOrder[dev.severity] || 0;
      const highestLevel = severityOrder[highest] || 0;
      return currentLevel > highestLevel ? dev.severity : highest;
    }, 'low');
  }

  /**
   * Save compressed report to file
   */
  static async saveCompressedReport(reportData, outputPath, options = {}) {
    const compressed = this.compressReport(reportData, options);
    
    // Create directory if it doesn't exist
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });
    
    // Save JSON file
    const jsonPath = outputPath.replace(/\.html$/, '.json');
    await fs.writeFile(jsonPath, JSON.stringify(compressed, null, 2));
    
    // Optionally create gzipped version
    if (options.gzip) {
      const gzipPath = jsonPath + '.gz';
      const gzipped = zlib.gzipSync(JSON.stringify(compressed));
      await fs.writeFile(gzipPath, gzipped);
      
    } else {
    }
    
    return {
      jsonPath,
      gzipPath: options.gzip ? jsonPath + '.gz' : null,
      compressionInfo: compressed.compressionInfo
    };
  }

  /**
   * Decompress report data
   */
  static decompressReport(compressedData) {
    if (!compressedData.compressed || !compressedData.stringDictionary) {
      return compressedData;
    }
    
    const { data, stringDictionary } = compressedData;
    
    const decompress = (obj) => {
      if (typeof obj === 'string' && stringDictionary[obj]) {
        return stringDictionary[obj];
      }
      
      if (Array.isArray(obj)) {
        return obj.map(decompress);
      }
      
      if (obj && typeof obj === 'object') {
        const decompressed = {};
        for (const [key, value] of Object.entries(obj)) {
          decompressed[key] = decompress(value);
        }
        return decompressed;
      }
      
      return obj;
    };
    
    return decompress(data);
  }

  /**
   * Get compression statistics
   */
  static getCompressionStats(originalData, compressedData) {
    const originalSize = JSON.stringify(originalData).length;
    const compressedSize = JSON.stringify(compressedData).length;
    const reduction = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
    
    return {
      originalSize: `${(originalSize / 1024).toFixed(1)}KB`,
      compressedSize: `${(compressedSize / 1024).toFixed(1)}KB`,
      reduction: `${reduction}%`,
      ratio: `${(originalSize / compressedSize).toFixed(1)}:1`
    };
  }
}

export default ReportCompressor; 