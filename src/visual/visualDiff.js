import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

/**
 * Visual Diff Module
 * Compares screenshots using Pixelmatch for pixel-level differences
 */
class VisualDiff {
  constructor(config) {
    this.config = config;
    this.outputDir = config.output?.screenshotDir || './output/screenshots';
  }

  /**
   * Compare two images and generate diff
   * @param {string} image1Path - Path to first image (Figma)
   * @param {string} image2Path - Path to second image (Web)
   * @param {Object} options - Comparison options
   * @returns {Object} Comparison result with diff metrics
   */
  async compareImages(image1Path, image2Path, options = {}) {
    try {

      // Read and prepare images
      const img1Buffer = await fs.readFile(image1Path);
      const img2Buffer = await fs.readFile(image2Path);

      // Resize images to same dimensions if needed
      const { img1, img2, width, height } = await this.prepareImages(img1Buffer, img2Buffer);

      // Create diff image buffer
      const diffBuffer = Buffer.alloc(width * height * 4);

      // Configure pixelmatch options
      const pixelmatchOptions = {
        threshold: options.threshold || 0.1,
        includeAA: options.includeAA !== false,
        alpha: options.alpha || 0.1,
        aaColor: options.aaColor || [255, 255, 0],
        diffColor: options.diffColor || [255, 0, 0],
        diffColorAlt: options.diffColorAlt || null
      };

      // Perform pixel comparison
      const diffPixels = pixelmatch(
        img1.data,
        img2.data,
        diffBuffer,
        width,
        height,
        pixelmatchOptions
      );

      // Calculate difference percentage
      const totalPixels = width * height;
      const diffPercentage = (diffPixels / totalPixels) * 100;

      // Save diff image
      const diffImagePath = await this.saveDiffImage(diffBuffer, width, height, options);

      // Generate comparison result
      const result = {
        image1: image1Path,
        image2: image2Path,
        diffImage: diffImagePath,
        metrics: {
          totalPixels,
          diffPixels,
          diffPercentage: parseFloat(diffPercentage.toFixed(2)),
          similarity: parseFloat((100 - diffPercentage).toFixed(2)),
          width,
          height
        },
        threshold: pixelmatchOptions.threshold,
        comparedAt: new Date().toISOString()
      };

      return result;

    } catch (error) {
      console.error('Error comparing images:', error);
      throw new Error(`Visual comparison failed: ${error.message}`);
    }
  }

  /**
   * Prepare images for comparison by resizing to same dimensions
   * @param {Buffer} img1Buffer - First image buffer
   * @param {Buffer} img2Buffer - Second image buffer
   * @returns {Object} Prepared images and dimensions
   */
  async prepareImages(img1Buffer, img2Buffer) {
    // Get image metadata
    const img1Meta = await sharp(img1Buffer).metadata();
    const img2Meta = await sharp(img2Buffer).metadata();

    // Determine target dimensions (use larger dimensions)
    const width = Math.max(img1Meta.width, img2Meta.width);
    const height = Math.max(img1Meta.height, img2Meta.height);


    // Resize both images to same dimensions
    const img1Resized = await sharp(img1Buffer)
      .resize(width, height, { 
        fit: 'contain', 
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toBuffer();

    const img2Resized = await sharp(img2Buffer)
      .resize(width, height, { 
        fit: 'contain', 
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toBuffer();

    // Convert to PNG objects for pixelmatch
    const img1 = PNG.sync.read(img1Resized);
    const img2 = PNG.sync.read(img2Resized);

    return { img1, img2, width, height };
  }

  /**
   * Save diff image to file
   * @param {Buffer} diffBuffer - Diff image buffer
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {Object} options - Save options
   * @returns {string} Saved file path
   */
  async saveDiffImage(diffBuffer, width, height, options = {}) {
    try {
      // Use provided output path or generate default
      let diffImagePath;
      if (options.outputPath) {
        diffImagePath = options.outputPath;
        // Ensure output directory exists
        await fs.mkdir(path.dirname(diffImagePath), { recursive: true });
      } else {
        // Ensure output directory exists
        await fs.mkdir(this.outputDir, { recursive: true });
        // Generate filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = options.diffFilename || `visual-diff-${timestamp}.png`;
        diffImagePath = path.join(this.outputDir, filename);
      }

      // Create PNG from diff buffer
      const diffPng = new PNG({ width, height });
      diffPng.data = diffBuffer;

      // Save to file
      const buffer = PNG.sync.write(diffPng);
      await fs.writeFile(diffImagePath, buffer);

      return diffImagePath;

    } catch (error) {
      console.error('Error saving diff image:', error);
      return null;
    }
  }

  /**
   * Compare multiple image pairs
   * @param {Array} imagePairs - Array of {figma, web, name} objects
   * @param {Object} options - Comparison options
   * @returns {Array} Array of comparison results
   */
  async compareMultipleImages(imagePairs, options = {}) {
    const results = [];

    for (let i = 0; i < imagePairs.length; i++) {
      const pair = imagePairs[i];

      try {
        const pairOptions = {
          ...options,
          diffFilename: `diff-${pair.name || i + 1}-${Date.now()}.png`
        };

        const result = await this.compareImages(pair.figma, pair.web, pairOptions);
        result.name = pair.name || `Component ${i + 1}`;
        results.push(result);

      } catch (error) {
        console.error(`Failed to compare image pair ${i + 1}:`, error);
        results.push({
          name: pair.name || `Component ${i + 1}`,
          error: error.message,
          image1: pair.figma,
          image2: pair.web,
          comparedAt: new Date().toISOString()
        });
      }
    }

    return results;
  }

  /**
   * Generate visual diff summary
   * @param {Array} results - Array of comparison results
   * @returns {Object} Summary statistics
   */
  generateSummary(results) {
    const validResults = results.filter(r => !r.error && r.metrics);
    
    if (validResults.length === 0) {
      return {
        totalComparisons: results.length,
        validComparisons: 0,
        avgSimilarity: 0,
        minSimilarity: 0,
        maxSimilarity: 0,
        recommendations: ['No valid comparisons completed']
      };
    }

    const similarities = validResults.map(r => r.metrics.similarity);
    const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
    const minSimilarity = Math.min(...similarities);
    const maxSimilarity = Math.max(...similarities);

    const summary = {
      totalComparisons: results.length,
      validComparisons: validResults.length,
      avgSimilarity: parseFloat(avgSimilarity.toFixed(2)),
      minSimilarity,
      maxSimilarity,
      recommendations: []
    };

    // Generate recommendations
    if (avgSimilarity < 80) {
      summary.recommendations.push('Significant visual differences detected - review implementation');
    }
    if (minSimilarity < 60) {
      summary.recommendations.push('Some components have major visual discrepancies');
    }
    if (avgSimilarity > 95) {
      summary.recommendations.push('Excellent visual consistency maintained');
    }

    return summary;
  }

  /**
   * Create side-by-side comparison image
   * @param {string} image1Path - Path to first image
   * @param {string} image2Path - Path to second image
   * @param {string} diffImagePath - Path to diff image
   * @param {Object} options - Creation options
   * @returns {string} Path to created comparison image
   */
  async createSideBySideComparison(image1Path, image2Path, diffImagePath, options = {}) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = options.filename || `comparison-${timestamp}.png`;
      const outputPath = path.join(this.outputDir, filename);

      // Load images
      const img1 = sharp(image1Path);
      const img2 = sharp(image2Path);
      const diffImg = diffImagePath ? sharp(diffImagePath) : null;

      // Get metadata
      const img1Meta = await img1.metadata();
      const img2Meta = await img2.metadata();

      // Calculate dimensions
      const maxHeight = Math.max(img1Meta.height, img2Meta.height);
      const totalWidth = diffImg ? 
        img1Meta.width + img2Meta.width + (await diffImg.metadata()).width :
        img1Meta.width + img2Meta.width;

      // Create comparison image
      const images = [
        { input: image1Path, top: 0, left: 0 },
        { input: image2Path, top: 0, left: img1Meta.width }
      ];

      if (diffImg) {
        images.push({ 
          input: diffImagePath, 
          top: 0, 
          left: img1Meta.width + img2Meta.width 
        });
      }

      await sharp({
        create: {
          width: totalWidth,
          height: maxHeight,
          channels: 3,
          background: { r: 255, g: 255, b: 255 }
        }
      })
      .composite(images)
      .png()
      .toFile(outputPath);

      return outputPath;

    } catch (error) {
      console.error('Error creating side-by-side comparison:', error);
      return null;
    }
  }

  /**
   * Analyze regions of difference
   * @param {Object} comparisonResult - Result from compareImages
   * @returns {Object} Analysis of difference regions
   */
  async analyzeRegions(comparisonResult) {
    if (!comparisonResult.diffImage) {
      return { regions: [], analysis: 'No diff image available' };
    }

    try {
      // This is a simplified region analysis
      // In a more advanced implementation, you could use computer vision
      // to identify and categorize different regions
      
      const analysis = {
        diffPercentage: comparisonResult.metrics.diffPercentage,
        severity: this.categorizeDifference(comparisonResult.metrics.diffPercentage),
        regions: [
          {
            type: 'overall',
            area: comparisonResult.metrics.diffPixels,
            percentage: comparisonResult.metrics.diffPercentage,
            description: `${comparisonResult.metrics.diffPixels} pixels differ out of ${comparisonResult.metrics.totalPixels} total`
          }
        ]
      };

      return analysis;

    } catch (error) {
      console.error('Error analyzing regions:', error);
      return { regions: [], analysis: 'Analysis failed', error: error.message };
    }
  }

  /**
   * Categorize difference severity
   * @param {number} diffPercentage - Difference percentage
   * @returns {string} Severity category
   */
  categorizeDifference(diffPercentage) {
    if (diffPercentage < 1) return 'minimal';
    if (diffPercentage < 5) return 'low';
    if (diffPercentage < 15) return 'medium';
    if (diffPercentage < 30) return 'high';
    return 'critical';
  }

  /**
   * Save visual diff report
   * @param {Array} results - Array of comparison results
   * @param {string} outputPath - Output file path
   */
  async saveVisualReport(results, outputPath) {
    const report = {
      summary: this.generateSummary(results),
      comparisons: results,
      generatedAt: new Date().toISOString()
    };

    await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
    return report;
  }
}

export default VisualDiff; 