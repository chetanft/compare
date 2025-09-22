/**
 * Reports Data Adapter
 * Transforms file-based report data into frontend-compatible format
 * Parses HTML report files to extract metadata
 */

import fs from 'fs';
import path from 'path';
import { logger } from '../../utils/logger.js';

export class ReportsDataAdapter {
  constructor(reportsPath = 'output/reports') {
    this.reportsPath = path.resolve(reportsPath);
  }

  /**
   * Get all reports with parsed metadata
   */
  async getAllReports() {
    try {
      if (!fs.existsSync(this.reportsPath)) {
        logger.warn('Reports directory does not exist:', this.reportsPath);
        return [];
      }

      const files = fs.readdirSync(this.reportsPath);
      const htmlFiles = files.filter(file => file.endsWith('.html'));
      
      const reports = await Promise.all(
        htmlFiles.map(async (file) => {
          try {
            return await this.parseReportFile(file);
          } catch (error) {
            logger.error(`Failed to parse report file ${file}:`, error);
            return null;
          }
        })
      );

      // Filter out failed parses and sort by creation date (newest first)
      return reports
        .filter(report => report !== null)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    } catch (error) {
      logger.error('Failed to get all reports:', error);
      throw error;
    }
  }

  /**
   * Parse a single report file and extract metadata
   */
  async parseReportFile(filename) {
    const filePath = path.join(this.reportsPath, filename);
    const stats = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf8');

    // Extract basic file info
    const id = this.extractReportId(filename);
    const createdAt = stats.birthtime.toISOString();
    const size = stats.size;

    // Parse HTML content for metadata
    const metadata = this.parseHtmlMetadata(content);
    
    // Determine report type and status
    const type = this.determineReportType(filename, content);
    const status = this.determineReportStatus(content);

    return {
      id,
      title: metadata.title || this.generateTitle(filename, type),
      figmaUrl: metadata.figmaUrl || metadata.figmaFile || 'Unknown',
      webUrl: metadata.webUrl || metadata.webFile || 'N/A',
      status,
      createdAt,
      duration: metadata.duration || this.estimateDuration(size),
      score: metadata.score || this.calculateScore(metadata),
      issues: metadata.issues || this.countIssues(content),
      type,
      size,
      url: `/reports/${filename}`,
      // Additional metadata for detailed view
      extractionMethod: metadata.extractionMethod || 'unknown',
      componentsCount: metadata.componentsCount || 0,
      colorsCount: metadata.colorsCount || 0,
      typographyCount: metadata.typographyCount || 0
    };
  }

  /**
   * Extract report ID from filename
   */
  extractReportId(filename) {
    // Extract timestamp or use filename as ID
    const timestampMatch = filename.match(/(\d{13})/);
    if (timestampMatch) {
      return timestampMatch[1];
    }
    
    // Fallback to filename without extension
    return filename.replace('.html', '');
  }

  /**
   * Parse HTML content to extract metadata
   */
  parseHtmlMetadata(content) {
    const metadata = {};

    try {
      // Extract title from <title> tag or <h1>
      const titleMatch = content.match(/<title>(.*?)<\/title>/i) || 
                        content.match(/<h1[^>]*>(.*?)<\/h1>/i);
      if (titleMatch) {
        metadata.title = titleMatch[1].replace(/&[^;]+;/g, '').trim();
      }

      // Extract Figma URL/File
      const figmaMatch = content.match(/<strong>Figma\s*(?:File|URL)?:?\s*<\/strong>\s*([^<]+)/i) ||
                        content.match(/figma\.com\/[^"'\s]+/i);
      if (figmaMatch) {
        metadata.figmaUrl = figmaMatch[1] ? figmaMatch[1].trim() : figmaMatch[0];
      }

      // Extract Web URL/File
      const webMatch = content.match(/<strong>Web\s*(?:File|URL)?:?\s*<\/strong>\s*([^<]+)/i) ||
                      content.match(/https?:\/\/[^"'\s<>]+/i);
      if (webMatch && !webMatch[0].includes('figma.com')) {
        metadata.webUrl = webMatch[1] ? webMatch[1].trim() : webMatch[0];
      }

      // Extract extraction method
      const methodMatch = content.match(/extraction.*method[^:]*:\s*([^<\n]+)/i) ||
                         content.match(/method[^:]*:\s*([^<\n]+)/i);
      if (methodMatch) {
        metadata.extractionMethod = methodMatch[1].trim();
      }

      // Extract component counts
      const componentsMatch = content.match(/(\d+)\s*(?:Figma\s*)?components?\s*extracted/i) ||
                             content.match(/<div class="summary-value">(\d+)<\/div>/);
      if (componentsMatch) {
        metadata.componentsCount = parseInt(componentsMatch[1], 10);
      }

      // Extract colors count
      const colorsMatch = content.match(/(\d+)\s*colors?\s*(?:found|extracted)/i);
      if (colorsMatch) {
        metadata.colorsCount = parseInt(colorsMatch[1], 10);
      }

      // Extract typography count
      const typographyMatch = content.match(/(\d+)\s*(?:typography|fonts?|text\s*styles?)\s*(?:found|extracted)/i);
      if (typographyMatch) {
        metadata.typographyCount = parseInt(typographyMatch[1], 10);
      }

      // Extract duration if present
      const durationMatch = content.match(/duration[^:]*:\s*(\d+(?:\.\d+)?)\s*(ms|seconds?|s)/i);
      if (durationMatch) {
        const value = parseFloat(durationMatch[1]);
        const unit = durationMatch[2].toLowerCase();
        metadata.duration = unit.startsWith('s') ? value * 1000 : value;
      }

      // Extract score if present
      const scoreMatch = content.match(/score[^:]*:\s*(\d+(?:\.\d+)?)\s*%?/i);
      if (scoreMatch) {
        metadata.score = parseFloat(scoreMatch[1]);
      }

    } catch (error) {
      logger.warn('Failed to parse HTML metadata:', error);
    }

    return metadata;
  }

  /**
   * Determine report type from filename and content
   */
  determineReportType(filename, content) {
    if (filename.includes('comparison') || content.includes('comparison')) {
      return 'comparison';
    }
    if (content.includes('Figma Extraction') || content.includes('figma')) {
      return 'figma-extraction';
    }
    if (content.includes('Web Extraction') || content.includes('web')) {
      return 'web-extraction';
    }
    return 'unknown';
  }

  /**
   * Determine report status from content
   */
  determineReportStatus(content) {
    if (content.includes('error') || content.includes('failed') || content.includes('Error')) {
      return 'failed';
    }
    if (content.includes('in progress') || content.includes('processing')) {
      return 'in-progress';
    }
    // If we have a complete HTML file, assume it completed
    if (content.includes('</html>') && content.includes('</body>')) {
      return 'completed';
    }
    return 'completed'; // Default assumption
  }

  /**
   * Generate a readable title from filename and type
   */
  generateTitle(filename, type) {
    // Extract timestamp and convert to readable format
    const timestampMatch = filename.match(/(\d{13})/);
    if (timestampMatch) {
      const date = new Date(parseInt(timestampMatch[1]));
      const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const typeLabel = type === 'comparison' ? 'Comparison' : 
                       type === 'figma-extraction' ? 'Figma Extraction' :
                       type === 'web-extraction' ? 'Web Extraction' : 'Report';
      
      return `${typeLabel} - ${formattedDate}`;
    }

    // Fallback to filename-based title
    return filename.replace('.html', '').replace(/[_-]/g, ' ');
  }

  /**
   * Estimate duration based on file size
   */
  estimateDuration(size) {
    // Rough estimation: larger files took longer to generate
    if (size > 5000000) return 120000; // 2 minutes
    if (size > 1000000) return 60000;  // 1 minute
    if (size > 100000) return 30000;   // 30 seconds
    return 15000; // 15 seconds
  }

  /**
   * Calculate a quality score based on metadata
   */
  calculateScore(metadata) {
    let score = 70; // Base score

    // Bonus for having components
    if (metadata.componentsCount > 0) {
      score += Math.min(20, metadata.componentsCount / 100);
    }

    // Bonus for having colors
    if (metadata.colorsCount > 0) {
      score += Math.min(5, metadata.colorsCount);
    }

    // Bonus for having typography
    if (metadata.typographyCount > 0) {
      score += Math.min(5, metadata.typographyCount);
    }

    return Math.min(100, Math.round(score));
  }

  /**
   * Count issues/warnings in the report content
   */
  countIssues(content) {
    const errorPatterns = [
      /error/gi,
      /warning/gi,
      /failed/gi,
      /missing/gi,
      /not found/gi
    ];

    let issuesCount = 0;
    for (const pattern of errorPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        issuesCount += matches.length;
      }
    }

    // Cap at reasonable number and filter out false positives
    return Math.min(10, Math.max(0, issuesCount - 2));
  }
}

export default ReportsDataAdapter;
