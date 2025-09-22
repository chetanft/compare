/**
 * macOS Screenshot Comparison Service
 * Port of web app screenshot comparison with macOS-specific optimizations
 * Maintains 100% API compatibility with frontend expectations
 */

import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';

export class ScreenshotComparisonService {
  constructor(config = {}) {
    this.config = config;
    this.uploadsDir = path.join(process.cwd(), 'output/screenshots/uploads');
    this.comparisonsDir = path.join(process.cwd(), 'output/screenshots/comparisons');
    
    // Ensure directories exist
    this.ensureDirectories();
  }

  /**
   * Ensure required directories exist
   */
  async ensureDirectories() {
    try {
      await fsPromises.mkdir(this.uploadsDir, { recursive: true });
      await fsPromises.mkdir(this.comparisonsDir, { recursive: true });
      console.log('📁 Screenshot directories initialized');
    } catch (error) {
      console.error('Failed to create screenshot directories:', error);
    }
  }

  /**
   * Process uploaded screenshots and store metadata
   * @param {Array} files - Array of uploaded files
   * @param {Object} metadata - Upload metadata
   * @returns {Promise<string>} Upload ID
   */
  async processUpload(files, metadata = {}) {
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const uploadDir = path.join(this.uploadsDir, uploadId);
    
    try {
      // Create upload directory
      await fsPromises.mkdir(uploadDir, { recursive: true });
      
      // Process and save files
      const processedFiles = {};
      
      for (const file of files) {
        if (!file.buffer) {
          throw new Error(`Invalid file object: missing buffer for ${file.originalname || 'unknown'}`);
        }
        
        // Determine file type based on fieldname or filename
        let fileType = 'unknown';
        if (file.fieldname === 'figmaScreenshot' || (file.originalname && file.originalname.toLowerCase().includes('figma'))) {
          fileType = 'figma';
        } else if (file.fieldname === 'developedScreenshot' || (file.originalname && file.originalname.toLowerCase().includes('developed'))) {
          fileType = 'developed';
        }
        
        // Save file with proper extension
        const extension = path.extname(file.originalname) || '.png';
        const filename = `${fileType}-original${extension}`;
        const filepath = path.join(uploadDir, filename);
        
        await fsPromises.writeFile(filepath, file.buffer);
        processedFiles[fileType] = filepath;
        
        console.log(`📸 Saved ${fileType} screenshot: ${filename}`);
      }
      
      // Validate we have both required files
      if (!processedFiles.figma || !processedFiles.developed) {
        throw new Error('Both Figma and developed screenshots are required');
      }
      
      // Save metadata
      const uploadMetadata = {
        uploadId,
        uploadedAt: new Date().toISOString(),
        figmaPath: processedFiles.figma,
        developedPath: processedFiles.developed,
        metadata: metadata || {},
        files: files.map(f => ({
          originalName: f.originalname,
          size: f.size,
          mimetype: f.mimetype
        }))
      };
      
      await fsPromises.writeFile(
        path.join(uploadDir, 'metadata.json'),
        JSON.stringify(uploadMetadata, null, 2)
      );
      
      console.log(`✅ Upload processed successfully: ${uploadId}`);
      return uploadId;
      
    } catch (error) {
      console.error('❌ Upload processing failed:', error);
      // Cleanup on failure
      try {
        await fsPromises.rmdir(uploadDir, { recursive: true });
      } catch (cleanupError) {
        console.error('Failed to cleanup failed upload:', cleanupError);
      }
      throw error;
    }
  }

  /**
   * Compare uploaded screenshots with comprehensive analysis
   * @param {string} uploadId - Upload ID
   * @param {Object} settings - Comparison settings
   * @returns {Promise<Object>} Comparison result matching frontend ScreenshotComparisonResult interface
   */
  async compareScreenshots(uploadId, settings = {}) {
    const startTime = Date.now();
    const comparisonId = `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const uploadDir = path.join(this.uploadsDir, uploadId);
    const resultDir = path.join(this.comparisonsDir, comparisonId);
    
    try {
      console.log(`📸 Starting screenshot comparison: ${comparisonId}`);
      
      // Create result directory
      await fsPromises.mkdir(resultDir, { recursive: true });
      
      // Load upload metadata
      const metadataPath = path.join(uploadDir, 'metadata.json');
      if (!fs.existsSync(metadataPath)) {
        throw new Error(`Upload metadata not found: ${uploadId}`);
      }
      
      const metadata = JSON.parse(await fsPromises.readFile(metadataPath, 'utf8'));
      
      // Validate uploaded files exist
      await this.validateUploadedFiles(metadata);

      // Set default settings
      const comparisonSettings = {
        threshold: 0.1,
        colorTolerance: 30,
        ignoreAntiAliasing: false,
        includeTextAnalysis: true,
        layoutAnalysis: true,
        colorAnalysis: true,
        spacingAnalysis: true,
        ...settings
      };

      // Preprocess images (resize, normalize)
      console.log('🔧 Preprocessing images...');
      const processedImages = await this.preprocessImages(
        metadata.figmaPath,
        metadata.developedPath,
        resultDir,
        comparisonSettings
      );

      // Perform pixel-level comparison
      console.log('🔍 Performing pixel-level comparison...');
      const pixelComparison = await this.performPixelComparison(
        processedImages.figmaProcessed,
        processedImages.developedProcessed,
        resultDir,
        comparisonSettings
      );

      // Extract color palettes from both images
      console.log('🎨 Extracting color palettes...');
      const figmaColors = await this.extractDominantColors(
        processedImages.figmaProcessed,
        'figma'
      );
      const developedColors = await this.extractDominantColors(
        processedImages.developedProcessed,
        'developed'
      );

      // Analyze design discrepancies (simplified for macOS)
      console.log('🎨 Analyzing design discrepancies...');
      const discrepancies = await this.analyzeDiscrepancies(
        processedImages.figmaProcessed,
        processedImages.developedProcessed,
        pixelComparison,
        comparisonSettings
      );

      // Generate side-by-side comparison
      console.log('📋 Generating side-by-side comparison...');
      const sideBySidePath = await this.generateSideBySideComparison(
        processedImages.figmaProcessed,
        processedImages.developedProcessed,
        path.join(resultDir, 'pixel-diff.png'),
        resultDir
      );

      // Calculate comprehensive metrics
      const metrics = await this.calculateComprehensiveMetrics(
        pixelComparison,
        discrepancies,
        processedImages
      );

      // Generate detailed report
      console.log('📄 Generating detailed report...');
      const reportPath = await this.generateDetailedReport({
        comparisonId,
        uploadId,
        metadata,
        pixelComparison,
        discrepancies,
        metrics,
        settings: comparisonSettings,
        imagePaths: {
          figmaOriginal: metadata.figmaPath,
          developedOriginal: metadata.developedPath,
          figmaProcessed: processedImages.figmaProcessed,
          developedProcessed: processedImages.developedProcessed,
          diff: path.join(resultDir, 'pixel-diff.png'),
          sideBySide: sideBySidePath
        }
      }, resultDir);

      const processingTime = Date.now() - startTime;
      
      // Create result matching frontend ScreenshotComparisonResult interface
      const result = {
        id: comparisonId,
        status: 'completed',
        figmaScreenshotPath: metadata.figmaPath,
        developedScreenshotPath: metadata.developedPath,
        diffImagePath: path.join(resultDir, 'pixel-diff.png'),
        sideBySidePath: sideBySidePath || path.join(resultDir, 'side-by-side.png'),
        metrics,
        discrepancies,
        enhancedAnalysis: this.createBasicEnhancedAnalysis(metrics, discrepancies),
        colorPalettes: {
          figma: figmaColors,
          developed: developedColors,
          comparison: this.generateColorComparison(figmaColors, developedColors)
        },
        reportPath: `/api/screenshots/reports/${comparisonId}`,
        createdAt: new Date().toISOString(),
        processingTime
      };

      // Save result metadata
      await fsPromises.writeFile(
        path.join(resultDir, 'result.json'),
        JSON.stringify(result, null, 2)
      );

      console.log(`✅ Screenshot comparison completed in ${processingTime}ms`);
      return result;

    } catch (error) {
      console.error('❌ Screenshot comparison failed:', error);
      
      // Save error result
      const errorResult = {
        id: comparisonId,
        status: 'failed',
        error: error.message,
        createdAt: new Date().toISOString(),
        processingTime: Date.now() - startTime
      };
      
      try {
        await fsPromises.writeFile(
          path.join(resultDir, 'error.json'),
          JSON.stringify(errorResult, null, 2)
        );
      } catch (saveError) {
        console.error('Failed to save error result:', saveError);
      }
      
      throw new Error(`Comparison failed: ${error.message}`);
    }
  }

  /**
   * Validate that uploaded files exist and are accessible
   */
  async validateUploadedFiles(metadata) {
    if (!fs.existsSync(metadata.figmaPath)) {
      throw new Error(`Figma image not found: ${metadata.figmaPath}`);
    }
    
    if (!fs.existsSync(metadata.developedPath)) {
      throw new Error(`Developed image not found: ${metadata.developedPath}`);
    }
  }

  /**
   * Preprocess images for comparison (resize, normalize)
   */
  async preprocessImages(figmaPath, developedPath, outputDir, settings) {
    try {
      // Load images and get dimensions
      const figmaImage = sharp(figmaPath);
      const developedImage = sharp(developedPath);
      
      const figmaMetadata = await figmaImage.metadata();
      const developedMetadata = await developedImage.metadata();

      // Calculate target dimensions (use larger dimensions)
      const targetWidth = Math.max(figmaMetadata.width, developedMetadata.width);
      const targetHeight = Math.max(figmaMetadata.height, developedMetadata.height);

      console.log(`Resizing images to ${targetWidth}x${targetHeight}`);

      // Process Figma image
      const figmaProcessedPath = path.join(outputDir, 'figma-processed.png');
      await figmaImage
        .resize(targetWidth, targetHeight, { 
          fit: 'contain', 
          background: { r: 255, g: 255, b: 255, alpha: 1 } 
        })
        .png()
        .toFile(figmaProcessedPath);

      // Process developed image
      const developedProcessedPath = path.join(outputDir, 'developed-processed.png');
      await developedImage
        .resize(targetWidth, targetHeight, { 
          fit: 'contain', 
          background: { r: 255, g: 255, b: 255, alpha: 1 } 
        })
        .png()
        .toFile(developedProcessedPath);

      return {
        figmaProcessed: figmaProcessedPath,
        developedProcessed: developedProcessedPath,
        dimensions: { width: targetWidth, height: targetHeight }
      };
    } catch (error) {
      throw new Error(`Image preprocessing failed: ${error.message}`);
    }
  }

  /**
   * Perform pixel-level comparison using Sharp
   */
  async performPixelComparison(figmaPath, developedPath, outputDir, settings) {
    try {
      const diffPath = path.join(outputDir, 'pixel-diff.png');
      
      // Check if images exist
      if (!fs.existsSync(figmaPath)) {
        throw new Error(`Figma image not found: ${figmaPath}`);
      }
      
      if (!fs.existsSync(developedPath)) {
        throw new Error(`Developed image not found: ${developedPath}`);
      }
      
      // Load images as raw buffers for pixel comparison
      const figmaBuffer = await sharp(figmaPath).raw().toBuffer();
      const developedBuffer = await sharp(developedPath).raw().toBuffer();
      const figmaMetadata = await sharp(figmaPath).metadata();
      
      const { width, height, channels } = figmaMetadata;
      const totalPixels = width * height;
      
      // Simple pixel-by-pixel comparison
      let diffPixels = 0;
      const threshold = Math.floor(settings.colorTolerance * 255 / 100);
      
      // Create diff buffer
      const diffBuffer = Buffer.alloc(figmaBuffer.length);
      
      for (let i = 0; i < figmaBuffer.length; i += channels) {
        const rDiff = Math.abs(figmaBuffer[i] - developedBuffer[i]);
        const gDiff = Math.abs(figmaBuffer[i + 1] - developedBuffer[i + 1]);
        const bDiff = Math.abs(figmaBuffer[i + 2] - developedBuffer[i + 2]);
        
        const maxDiff = Math.max(rDiff, gDiff, bDiff);
        
        if (maxDiff > threshold) {
          // Mark as different (red)
          diffBuffer[i] = 255;     // R
          diffBuffer[i + 1] = 0;   // G
          diffBuffer[i + 2] = 0;   // B
          if (channels === 4) diffBuffer[i + 3] = 255; // A
          diffPixels++;
        } else {
          // Mark as same (white)
          diffBuffer[i] = 255;     // R
          diffBuffer[i + 1] = 255; // G
          diffBuffer[i + 2] = 255; // B
          if (channels === 4) diffBuffer[i + 3] = 255; // A
        }
      }
      
      // Save diff image
      await sharp(diffBuffer, {
        raw: {
          width,
          height,
          channels
        }
      }).png().toFile(diffPath);
      
      const similarity = ((totalPixels - diffPixels) / totalPixels) * 100;
      
      return {
        image1: figmaPath,
        image2: developedPath,
        diffImage: diffPath,
        metrics: {
          totalPixels,
          diffPixels,
          diffPercentage: (diffPixels / totalPixels) * 100,
          similarity,
          width,
          height
        },
        threshold: settings.threshold || 0.1,
        comparedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Pixel comparison error:', error);
      throw new Error(`Pixel comparison failed: ${error.message}`);
    }
  }

  /**
   * Analyze design discrepancies (simplified version for macOS)
   */
  async analyzeDiscrepancies(figmaPath, developedPath, pixelComparison, settings) {
    const discrepancies = [];
    
    // Basic discrepancy analysis based on pixel differences
    const diffPercentage = pixelComparison.metrics.diffPercentage;
    
    if (diffPercentage > 5) {
      discrepancies.push({
        id: `disc_${Date.now()}_1`,
        type: 'color',
        severity: diffPercentage > 15 ? 'high' : diffPercentage > 8 ? 'medium' : 'low',
        description: `Significant color differences detected (${diffPercentage.toFixed(1)}% of pixels differ)`,
        location: {
          x: 0,
          y: 0,
          width: pixelComparison.metrics.width,
          height: pixelComparison.metrics.height
        },
        recommendation: 'Review color values and ensure design specifications match implementation'
      });
    }
    
    if (diffPercentage > 10) {
      discrepancies.push({
        id: `disc_${Date.now()}_2`,
        type: 'layout',
        severity: diffPercentage > 20 ? 'high' : 'medium',
        description: `Major layout differences detected`,
        location: {
          x: 0,
          y: 0,
          width: pixelComparison.metrics.width,
          height: pixelComparison.metrics.height
        },
        recommendation: 'Check element positioning, sizing, and alignment'
      });
    }
    
    return discrepancies;
  }

  /**
   * Generate side-by-side comparison image
   */
  async generateSideBySideComparison(figmaPath, developedPath, diffPath, outputDir) {
    try {
      const sideBySidePath = path.join(outputDir, 'side-by-side.png');
      
      // Check if all images exist
      if (!fs.existsSync(figmaPath) || !fs.existsSync(developedPath) || !fs.existsSync(diffPath)) {
        console.warn('Some images missing for side-by-side generation');
        return null;
      }
      
      // Load images
      const figmaImage = sharp(figmaPath);
      const developedImage = sharp(developedPath);
      const diffImage = sharp(diffPath);
      
      const metadata = await figmaImage.metadata();
      const { width, height } = metadata;
      
      // Create canvas for side-by-side layout
      const canvasWidth = width * 3 + 40; // 3 images + spacing
      const canvasHeight = height + 60; // Image height + labels
      
      // Create base canvas
      const canvas = sharp({
        create: {
          width: canvasWidth,
          height: canvasHeight,
          channels: 3,
          background: { r: 255, g: 255, b: 255 }
        }
      });

      // Composite images side by side
      await canvas
        .composite([
          { input: figmaPath, left: 10, top: 30 },
          { input: developedPath, left: width + 20, top: 30 },
          { input: diffPath, left: (width * 2) + 30, top: 30 }
        ])
        .png()
        .toFile(sideBySidePath);

      return sideBySidePath;
    } catch (error) {
      console.error('Side-by-side generation failed:', error);
      return null;
    }
  }

  /**
   * Calculate comprehensive comparison metrics
   */
  async calculateComprehensiveMetrics(pixelComparison, discrepancies, processedImages) {
    const totalDiscrepancies = discrepancies.length;
    const highSeverityCount = discrepancies.filter(d => d.severity === 'high').length;
    const mediumSeverityCount = discrepancies.filter(d => d.severity === 'medium').length;
    const lowSeverityCount = discrepancies.filter(d => d.severity === 'low').length;

    // Calculate discrepancy type breakdown
    const discrepancyTypes = {
      color: discrepancies.filter(d => d.type === 'color').length,
      layout: discrepancies.filter(d => d.type === 'layout').length,
      text: discrepancies.filter(d => d.type === 'text').length,
      spacing: discrepancies.filter(d => d.type === 'spacing').length,
      missingElement: discrepancies.filter(d => d.type === 'missing-element').length,
      extraElement: discrepancies.filter(d => d.type === 'extra-element').length
    };

    return {
      overallSimilarity: pixelComparison.metrics?.similarity || 0,
      pixelDifferences: pixelComparison.metrics?.diffPixels || 0,
      totalPixels: pixelComparison.metrics?.totalPixels || 0,
      totalDiscrepancies,
      severityBreakdown: {
        high: highSeverityCount,
        medium: mediumSeverityCount,
        low: lowSeverityCount
      },
      discrepancyTypes,
      qualityScore: this.calculateQualityScore(pixelComparison.metrics?.similarity || 0, totalDiscrepancies, highSeverityCount)
    };
  }

  /**
   * Calculate overall quality score (0-100)
   */
  calculateQualityScore(similarity, totalDiscrepancies, highSeverityCount) {
    let score = similarity; // Start with pixel similarity
    
    // Reduce score based on discrepancies
    score -= (totalDiscrepancies * 2); // -2 points per discrepancy
    score -= (highSeverityCount * 5); // Additional -5 points for high severity
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Create basic enhanced analysis (simplified for macOS)
   */
  createBasicEnhancedAnalysis(metrics, discrepancies) {
    return {
      timestamp: new Date().toISOString(),
      overallScore: metrics.qualityScore,
      insights: discrepancies.map((d, index) => ({
        type: d.type,
        severity: d.severity,
        category: d.type,
        title: `${d.type.charAt(0).toUpperCase() + d.type.slice(1)} Issue`,
        description: d.description,
        suggestion: d.recommendation || 'Review and adjust implementation to match design',
        confidence: 85,
        impact: d.severity === 'high' ? 'High' : d.severity === 'medium' ? 'Medium' : 'Low'
      })),
      recommendations: discrepancies.filter(d => d.severity === 'high').map(d => ({
        priority: d.severity,
        category: d.type,
        title: `Fix ${d.type} discrepancy`,
        description: d.description,
        action: d.recommendation || 'Adjust implementation to match design specifications',
        estimatedTime: d.severity === 'high' ? '30-60 minutes' : '15-30 minutes',
        impact: d.severity === 'high' ? 'High' : 'Medium',
        effort: d.severity === 'high' ? 'Medium' : 'Low'
      })),
      issueBreakdown: {
        bySeverity: metrics.severityBreakdown,
        byCategory: metrics.discrepancyTypes,
        total: metrics.totalDiscrepancies
      },
      aiSummary: `Screenshot comparison completed with ${metrics.qualityScore.toFixed(0)}% quality score. ${metrics.totalDiscrepancies} discrepancies found.`,
      actionItems: discrepancies.slice(0, 5).map((d, index) => ({
        id: index + 1,
        priority: d.severity,
        title: `Address ${d.type} issue`,
        description: d.description,
        category: d.type,
        estimatedTime: '15-45 minutes',
        confidence: 80
      })),
      quickWins: discrepancies.filter(d => d.severity === 'low').slice(0, 3).map(d => ({
        title: `Quick fix: ${d.type}`,
        description: d.description,
        action: d.recommendation || 'Minor adjustment needed',
        estimatedTime: '5-15 minutes',
        impact: 'Low',
        confidence: 90,
        category: d.type
      }))
    };
  }

  /**
   * Generate detailed HTML report
   */
  async generateDetailedReport(data, outputDir) {
    try {
      const reportPath = path.join(outputDir, 'detailed-report.html');
      
      const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Screenshot Comparison Report - ${data.comparisonId}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f9fafb; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .header { border-bottom: 1px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 24px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin: 24px 0; }
        .metric-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; }
        .metric-value { font-size: 24px; font-weight: bold; color: #1f2937; }
        .metric-label { font-size: 14px; color: #6b7280; margin-top: 4px; }
        .images-section { margin: 32px 0; }
        .image-comparison { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin: 16px 0; }
        .image-container { text-align: center; }
        .image-container img { max-width: 100%; border: 1px solid #e5e7eb; border-radius: 4px; }
        .image-label { font-weight: medium; margin-bottom: 8px; }
        .discrepancies-section { margin: 32px 0; }
        .discrepancy-item { border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 8px 0; }
        .severity-high { border-left: 4px solid #dc2626; }
        .severity-medium { border-left: 4px solid #f59e0b; }
        .severity-low { border-left: 4px solid #10b981; }
        .discrepancy-type { display: inline-block; background: #f3f4f6; color: #374151; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: medium; }
        .recommendation { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 4px; padding: 12px; margin-top: 8px; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Screenshot Comparison Report</h1>
            <p>Comparison ID: <strong>${data.comparisonId}</strong></p>
            <p>Generated: ${new Date().toLocaleString()}</p>
            <p>Processing Time: ${data.processingTime || 0}ms</p>
        </div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">${data.metrics.overallSimilarity.toFixed(1)}%</div>
                <div class="metric-label">Overall Similarity</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.metrics.qualityScore.toFixed(0)}</div>
                <div class="metric-label">Quality Score</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.metrics.totalDiscrepancies}</div>
                <div class="metric-label">Total Discrepancies</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.metrics.severityBreakdown.high}</div>
                <div class="metric-label">High Severity Issues</div>
            </div>
        </div>

        <div class="images-section">
            <h2>Image Comparison</h2>
            <div class="image-comparison">
                <div class="image-container">
                    <div class="image-label">Figma Design</div>
                    <img src="figma-processed.png" alt="Figma Design">
                </div>
                <div class="image-container">
                    <div class="image-label">Developed Implementation</div>
                    <img src="developed-processed.png" alt="Developed Implementation">
                </div>
                <div class="image-container">
                    <div class="image-label">Pixel Differences</div>
                    <img src="pixel-diff.png" alt="Pixel Differences">
                </div>
            </div>
        </div>

        <div class="discrepancies-section">
            <h2>Detailed Discrepancies (${data.discrepancies.length})</h2>
            ${data.discrepancies.map(d => `
                <div class="discrepancy-item severity-${d.severity}">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span class="discrepancy-type">${d.type.toUpperCase()}</span>
                        <span style="color: ${d.severity === 'high' ? '#dc2626' : d.severity === 'medium' ? '#f59e0b' : '#10b981'}; font-weight: medium;">${d.severity.toUpperCase()}</span>
                    </div>
                    <p><strong>${d.description}</strong></p>
                    ${d.recommendation ? `<div class="recommendation"><strong>Recommendation:</strong> ${d.recommendation}</div>` : ''}
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;

      await fsPromises.writeFile(reportPath, htmlTemplate);
      return reportPath;
    } catch (error) {
      console.error('Report generation failed:', error);
      return null;
    }
  }

  /**
   * List all screenshot comparisons
   */
  async listComparisons(options = {}) {
    try {
      const { limit = 50, offset = 0, sortBy = 'createdAt', sortOrder = 'desc' } = options;
      
      const comparisons = [];
      const comparisonDirs = await fsPromises.readdir(this.comparisonsDir);
      
      for (const dir of comparisonDirs) {
        const resultPath = path.join(this.comparisonsDir, dir, 'result.json');
        if (fs.existsSync(resultPath)) {
          try {
            const result = JSON.parse(await fsPromises.readFile(resultPath, 'utf8'));
            comparisons.push({
              id: result.id,
              status: result.status,
              createdAt: result.createdAt,
              metrics: result.metrics ? {
                overallSimilarity: result.metrics.overallSimilarity,
                totalDiscrepancies: result.metrics.totalDiscrepancies,
                qualityScore: result.metrics.qualityScore
              } : null
            });
          } catch (error) {
            console.warn(`Failed to read comparison result: ${dir}`, error);
          }
        }
      }
      
      // Sort comparisons
      comparisons.sort((a, b) => {
        if (sortOrder === 'desc') {
          return new Date(b[sortBy]) - new Date(a[sortBy]);
        } else {
          return new Date(a[sortBy]) - new Date(b[sortBy]);
        }
      });
      
      // Apply pagination
      const paginatedResults = comparisons.slice(offset, offset + limit);
      
      return {
        comparisons: paginatedResults,
        total: comparisons.length,
        limit,
        offset
      };
    } catch (error) {
      console.error('Failed to list comparisons:', error);
      throw error;
    }
  }

  /**
   * Get comparison result by ID
   */
  async getComparisonResult(comparisonId) {
    try {
      const resultPath = path.join(this.comparisonsDir, comparisonId, 'result.json');
      
      if (!fs.existsSync(resultPath)) {
        throw new Error(`Comparison not found: ${comparisonId}`);
      }
      
      const result = JSON.parse(await fsPromises.readFile(resultPath, 'utf8'));
      return result;
    } catch (error) {
      console.error(`Failed to get comparison result: ${comparisonId}`, error);
      throw error;
    }
  }

  /**
   * Delete comparison by ID
   */
  async deleteComparison(comparisonId) {
    try {
      const comparisonDir = path.join(this.comparisonsDir, comparisonId);
      
      if (!fs.existsSync(comparisonDir)) {
        throw new Error(`Comparison not found: ${comparisonId}`);
      }
      
      await fsPromises.rmdir(comparisonDir, { recursive: true });
      console.log(`🗑️ Deleted comparison: ${comparisonId}`);
    } catch (error) {
      console.error(`Failed to delete comparison: ${comparisonId}`, error);
      throw error;
    }
  }

  /**
   * Extract dominant colors from an image with better sampling
   */
  async extractDominantColors(imagePath, source) {
    try {
      const image = sharp(imagePath);
      const { data, info } = await image
        .resize(200, 200, { fit: 'inside' })
        .raw()
        .toBuffer({ resolveWithObject: true });

      const colors = new Map();
      const colorClusters = new Map();
      
      // Sample colors from the image with better clustering
      for (let i = 0; i < data.length; i += 3) {
        const r = data[i] || 0;
        const g = data[i + 1] || 0;
        const b = data[i + 2] || 0;
        
        // Skip near-white and near-black colors (likely background/text)
        if ((r > 245 && g > 245 && b > 245) || (r < 10 && g < 10 && b < 10)) continue;
        
        // Group similar colors together (tolerance of 20)
        const tolerance = 20;
        let foundCluster = false;
        
        for (const [clusterColor, clusterData] of colorClusters) {
          const [cr, cg, cb] = clusterColor.split(',').map(Number);
          if (Math.abs(r - cr) < tolerance && Math.abs(g - cg) < tolerance && Math.abs(b - cb) < tolerance) {
            clusterData.count++;
            clusterData.totalR += r;
            clusterData.totalG += g;
            clusterData.totalB += b;
            foundCluster = true;
            break;
          }
        }
        
        if (!foundCluster) {
          colorClusters.set(`${r},${g},${b}`, {
            count: 1,
            totalR: r,
            totalG: g,
            totalB: b
          });
        }
      }

      // Convert clusters to colors and sort by frequency
      const dominantColors = Array.from(colorClusters.entries())
        .map(([key, data]) => {
          const avgR = Math.round(data.totalR / data.count);
          const avgG = Math.round(data.totalG / data.count);
          const avgB = Math.round(data.totalB / data.count);
          
          const hex = `#${avgR.toString(16).padStart(2, '0')}${avgG.toString(16).padStart(2, '0')}${avgB.toString(16).padStart(2, '0')}`;
          
          return {
            hex,
            rgb: { r: avgR, g: avgG, b: avgB },
            count: data.count,
            frequency: (data.count / (data.length / 3)) * 100,
            source,
            location: { x: 0, y: 0, width: info.width, height: info.height }
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 15); // Get top 15 colors

      return dominantColors;
    } catch (error) {
      console.error(`Failed to extract colors from ${imagePath}:`, error);
      return [];
    }
  }

  /**
   * Find the closest color in a color array
   */
  findClosestColor(targetColor, colors) {
    if (colors.length === 0) {
      return { hex: '#000000', count: 0, source: 'unknown', location: { x: 0, y: 0, width: 0, height: 0 } };
    }

    let closestColor = colors[0];
    let smallestDistance = this.calculateColorDistance(targetColor, colors[0]);

    for (const color of colors.slice(1)) {
      const distance = this.calculateColorDistance(targetColor, color);
      if (distance < smallestDistance) {
        smallestDistance = distance;
        closestColor = color;
      }
    }

    return closestColor;
  }

  /**
   * Calculate distance between two colors
   */
  calculateColorDistance(color1, color2) {
    const rgb1 = color1.rgb || this.hexToRgb(color1.hex);
    const rgb2 = color2.rgb || this.hexToRgb(color2.hex);
    
    if (!rgb1 || !rgb2) return 100; // Max distance if conversion fails
    
    // Use weighted Euclidean distance (more perceptually accurate)
    const rDiff = rgb1.r - rgb2.r;
    const gDiff = rgb1.g - rgb2.g;
    const bDiff = rgb1.b - rgb2.b;
    
    return Math.sqrt(0.3 * rDiff * rDiff + 0.59 * gDiff * gDiff + 0.11 * bDiff * bDiff);
  }

  /**
   * Convert hex color to RGB
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * Generate color comparison analysis between two color palettes
   */
  generateColorComparison(figmaColors, developedColors) {
    const comparison = {
      totalFigmaColors: figmaColors.length,
      totalDevelopedColors: developedColors.length,
      matchedColors: [],
      missingColors: [],
      extraColors: [],
      colorSimilarity: 0
    };

    // Find matched and missing colors
    for (const figmaColor of figmaColors.slice(0, 10)) { // Compare top 10 colors
      const closestMatch = this.findClosestColor(figmaColor, developedColors);
      const distance = this.calculateColorDistance(figmaColor, closestMatch);
      
      if (distance < 30) { // Colors are similar enough
        comparison.matchedColors.push({
          figmaColor: figmaColor.hex,
          developedColor: closestMatch.hex,
          similarity: Math.max(0, 100 - distance),
          figmaFrequency: figmaColor.frequency || 0,
          developedFrequency: closestMatch.frequency || 0
        });
      } else {
        comparison.missingColors.push({
          color: figmaColor.hex,
          frequency: figmaColor.frequency || 0,
          closestMatch: closestMatch.hex,
          distance
        });
      }
    }

    // Find extra colors in developed that don't exist in Figma
    for (const devColor of developedColors.slice(0, 10)) {
      const closestFigmaMatch = this.findClosestColor(devColor, figmaColors);
      const distance = this.calculateColorDistance(devColor, closestFigmaMatch);
      
      if (distance >= 30) { // This color doesn't exist in Figma
        comparison.extraColors.push({
          color: devColor.hex,
          frequency: devColor.frequency || 0,
          closestFigmaMatch: closestFigmaMatch.hex,
          distance
        });
      }
    }

    // Calculate overall color similarity
    const totalColors = Math.max(figmaColors.length, developedColors.length);
    comparison.colorSimilarity = totalColors > 0 
      ? Math.round((comparison.matchedColors.length / totalColors) * 100)
      : 0;

    return comparison;
  }
}

export default ScreenshotComparisonService;
