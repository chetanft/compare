import EnhancedVisualComparison from '../visual/enhancedVisualComparison.js';
import DesignDiscrepancyAnalyzer from '../ai/DesignDiscrepancyAnalyzer.js';
import ComparisonAnalyzer from '../ai/ComparisonAnalyzer.js';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';

/**
 * Screenshot Comparison Service
 * Handles uploaded screenshot comparison with detailed discrepancy analysis
 */
export class ScreenshotComparisonService {
  constructor(config, storageProvider = null) {
    this.config = config;
    this.visualComparison = new EnhancedVisualComparison(config);
    this.discrepancyAnalyzer = new DesignDiscrepancyAnalyzer(config);
    this.comparisonAnalyzer = new ComparisonAnalyzer();
    this.uploadsDir = path.join(process.cwd(), 'output/screenshots/uploads');
    this.comparisonsDir = path.join(process.cwd(), 'output/screenshots/comparisons');
    this.storageProvider = storageProvider; // Optional StorageProvider for SaaS mode
  }

  /**
   * Compare uploaded screenshots with comprehensive analysis
   */
  async compareScreenshots(uploadId, settings) {
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
      const metadata = JSON.parse(await fsPromises.readFile(metadataPath, 'utf8'));

      // Validate uploaded files exist
      await this.validateUploadedFiles(metadata);

      // Preprocess images (resize, normalize)
      console.log('🔧 Preprocessing images...');
      const processedImages = await this.preprocessImages(
        metadata.figmaPath,
        metadata.developedPath,
        resultDir,
        settings
      );

      // Perform pixel-level comparison
      console.log('🔍 Performing pixel-level comparison...');
      const pixelComparison = await this.performPixelComparison(
        processedImages.figmaProcessed,
        processedImages.developedProcessed,
        resultDir,
        settings
      );

      // Extract color palettes from both images
      console.log('🎨 Extracting color palettes...');
      const figmaColors = await this.discrepancyAnalyzer.extractDominantColors(
        processedImages.figmaProcessed,
        'figma'
      );
      const developedColors = await this.discrepancyAnalyzer.extractDominantColors(
        processedImages.developedProcessed,
        'developed'
      );

      // Analyze design discrepancies
      console.log('🎨 Analyzing design discrepancies...');
      const discrepancies = await this.discrepancyAnalyzer.analyzeScreenshots(
        processedImages.figmaProcessed,
        processedImages.developedProcessed,
        settings
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

      // Perform enhanced AI analysis
      console.log('🧠 Performing enhanced AI analysis...');
      const enhancedAnalysis = await this.performEnhancedAnalysis(
        pixelComparison,
        discrepancies,
        processedImages,
        settings
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
        settings,
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
      
      const result = {
        id: comparisonId,
        status: 'completed',
        figmaScreenshotPath: metadata.figmaPath,
        developedScreenshotPath: metadata.developedPath,
        diffImagePath: path.join(resultDir, 'pixel-diff.png'),
        sideBySidePath,
        metrics,
        discrepancies,
        enhancedAnalysis,
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
   * Perform pixel-level comparison using existing visual diff engine
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
      
      // For identical images, create a blank diff image
      if (figmaPath === developedPath) {
        // Create a blank diff image (all white)
        const imageInfo = await sharp(figmaPath).metadata();
        await sharp({
          create: {
            width: imageInfo.width,
            height: imageInfo.height,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          }
        }).png().toFile(diffPath);
        
        // Return a mock result for identical images
        return {
          image1: figmaPath,
          image2: developedPath,
          diffImage: diffPath,
          metrics: {
            totalPixels: imageInfo.width * imageInfo.height,
            diffPixels: 0,
            diffPercentage: 0,
            similarity: 100,
            width: imageInfo.width,
            height: imageInfo.height
          },
          threshold: settings.threshold || 0.1,
          comparedAt: new Date().toISOString()
        };
      }
      
      // Use existing visual comparison infrastructure
      const result = await this.visualComparison.visualDiff.compareImages(
        figmaPath,
        developedPath,
        {
          threshold: settings.threshold || 0.1,
          includeAA: !settings.ignoreAntiAliasing,
          diffColor: [255, 0, 0],
          outputPath: diffPath
        }
      );

      return result;
    } catch (error) {
      console.error('Pixel comparison error:', error);
      throw new Error(`Pixel comparison failed: ${error.message}`);
    }
  }

  /**
   * Generate side-by-side comparison image
   */
  async generateSideBySideComparison(figmaPath, developedPath, diffPath, outputDir) {
    try {
      const sideBySidePath = path.join(outputDir, 'side-by-side.png');
      
      // Check if all images exist
      if (!fs.existsSync(figmaPath)) {
        throw new Error(`Input file is missing: ${figmaPath}`);
      }
      
      if (!fs.existsSync(developedPath)) {
        throw new Error(`Input file is missing: ${developedPath}`);
      }
      
      if (!fs.existsSync(diffPath)) {
        throw new Error(`Input file is missing: ${diffPath}`);
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
      // Return null if generation fails - not critical
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
        body { font-family: Inter, sans-serif; margin: 0; padding: 20px; background: #f9fafb; }
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
            <p>Generated: ${new Date(data.metadata.uploadedAt).toLocaleString()}</p>
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
                    <img src="${path.relative(outputDir, data.imagePaths.figmaProcessed)}" alt="Figma Design">
                </div>
                <div class="image-container">
                    <div class="image-label">Developed Implementation</div>
                    <img src="${path.relative(outputDir, data.imagePaths.developedProcessed)}" alt="Developed Implementation">
                </div>
                <div class="image-container">
                    <div class="image-label">Pixel Differences</div>
                    <img src="${path.relative(outputDir, data.imagePaths.diff)}" alt="Pixel Differences">
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
                    ${d.figmaValue ? `<p>Design Value: <code>${d.figmaValue}</code></p>` : ''}
                    ${d.developedValue ? `<p>Implementation Value: <code>${d.developedValue}</code></p>` : ''}
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
   * Perform enhanced AI analysis on comparison results
   */
  async performEnhancedAnalysis(pixelComparison, discrepancies, processedImages, settings) {
    try {
      // Prepare comparison data for AI analysis
      const comparisonData = {
        pixelComparison,
        discrepancies,
        visualDifferences: {
          comparisons: [{
            similarity: pixelComparison.metrics?.similarity || 0,
            colorDifference: this.calculateColorDifference(pixelComparison),
            location: { x: 0, y: 0, width: 100, height: 100 }
          }],
          pixelDifference: {
            percentage: ((pixelComparison.metrics?.diffPixels || 0) / (pixelComparison.metrics?.totalPixels || 1)) * 100
          }
        },
        structuralDifferences: {
          missingElements: discrepancies.filter(d => d.type === 'missing-element'),
          extraElements: discrepancies.filter(d => d.type === 'extra-element')
        },
        cssDifferences: {
          typography: this.extractTypographyDifferences(discrepancies),
          spacing: this.extractSpacingDifferences(discrepancies),
          layout: this.extractLayoutDifferences(discrepancies)
        },
        settings
      };

      // Run enhanced AI analysis
      const analysis = await this.comparisonAnalyzer.analyzeComparison(comparisonData);
      
      return analysis;
    } catch (error) {
      console.error('Enhanced analysis failed:', error);
      return {
        timestamp: new Date().toISOString(),
        overallScore: 0,
        insights: [],
        recommendations: [],
        issueBreakdown: { bySeverity: { critical: 0, high: 0, medium: 0, low: 0 }, byCategory: {}, total: 0 },
        aiSummary: 'Enhanced analysis unavailable',
        actionItems: [],
        quickWins: [],
        error: error.message
      };
    }
  }

  /**
   * Calculate color difference from pixel comparison
   */
  calculateColorDifference(pixelComparison) {
    // Simple heuristic based on pixel differences
    const diffPercentage = ((pixelComparison.metrics?.diffPixels || 0) / (pixelComparison.metrics?.totalPixels || 1)) * 100;
    return Math.min(diffPercentage * 3, 100); // Scale up for color sensitivity
  }

  /**
   * Extract typography differences from discrepancies
   */
  extractTypographyDifferences(discrepancies) {
    const typographyDiscrepancies = discrepancies.filter(d => 
      d.type === 'font-size' || d.type === 'font-weight' || d.type === 'text'
    );

    const typography = {};

    typographyDiscrepancies.forEach(d => {
      if (d.type === 'font-size') {
        typography.fontSize = {
          differs: true,
          difference: this.extractNumericDifference(d.description),
          expected: d.figmaValue,
          actual: d.developedValue
        };
      }
      
      if (d.type === 'font-weight') {
        typography.fontFamily = {
          differs: true,
          expected: d.figmaValue,
          actual: d.developedValue
        };
      }
    });

    return typography;
  }

  /**
   * Extract spacing differences from discrepancies
   */
  extractSpacingDifferences(discrepancies) {
    const spacingDiscrepancies = discrepancies.filter(d => 
      d.type === 'spacing' || d.type === 'line-spacing'
    );

    const spacing = {};

    spacingDiscrepancies.forEach(d => {
      const difference = this.extractNumericDifference(d.description);
      
      if (d.description.toLowerCase().includes('margin')) {
        spacing.margin = { difference };
      } else if (d.description.toLowerCase().includes('padding')) {
        spacing.padding = { difference };
      }
    });

    return spacing;
  }

  /**
   * Extract layout differences from discrepancies
   */
  extractLayoutDifferences(discrepancies) {
    const layoutDiscrepancies = discrepancies.filter(d => 
      d.type === 'layout' || d.type === 'missing-element' || d.type === 'extra-element'
    );

    const layout = {};

    layoutDiscrepancies.forEach(d => {
      if (d.description.toLowerCase().includes('display')) {
        layout.display = {
          differs: true,
          expected: d.figmaValue,
          actual: d.developedValue
        };
      }
      
      if (d.description.toLowerCase().includes('position')) {
        layout.position = {
          differs: true,
          expected: d.figmaValue,
          actual: d.developedValue
        };
      }
    });

    return layout;
  }

  /**
   * Extract numeric difference from description text
   */
  extractNumericDifference(description) {
    const match = description.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
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
      const closestMatch = this.discrepancyAnalyzer.findClosestColor(figmaColor, developedColors);
      const distance = this.discrepancyAnalyzer.calculateColorDistance(figmaColor, closestMatch);
      
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
      const closestFigmaMatch = this.discrepancyAnalyzer.findClosestColor(devColor, figmaColors);
      const distance = this.discrepancyAnalyzer.calculateColorDistance(devColor, closestFigmaMatch);
      
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
