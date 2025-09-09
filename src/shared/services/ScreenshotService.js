/**
 * Unified Screenshot Service
 * Handles screenshot upload, comparison, and management for both platforms
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

export class ScreenshotService {
  constructor(platformAdapter, config) {
    this.platformAdapter = platformAdapter;
    this.config = config;
    this.screenshotsPath = path.join(platformAdapter.getOutputPath(), 'screenshots');
    this.reportsPath = path.join(platformAdapter.getOutputPath(), 'reports', 'screenshots');
    
    // Ensure directories exist
    this.ensureDirectories();
  }

  /**
   * Ensure required directories exist
   */
  ensureDirectories() {
    const directories = [this.screenshotsPath, this.reportsPath];
    
    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    });
  }

  /**
   * Upload and process screenshot
   */
  async uploadScreenshot(file, metadata = {}) {
    try {
      const comparisonId = uuidv4();
      const timestamp = new Date().toISOString();
      
      // Validate file
      if (!file || !file.buffer) {
        throw new Error('Invalid file data');
      }

      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
      if (!allowedTypes.includes(file.mimetype)) {
        throw new Error(`Unsupported file type: ${file.mimetype}`);
      }

      // Check file size
      const maxSize = this.config.get('maxScreenshotSize', 10485760); // 10MB default
      if (file.size > maxSize) {
        throw new Error(`File too large: ${file.size} bytes (max: ${maxSize})`);
      }

      // Process image with Sharp
      const imageInfo = await sharp(file.buffer).metadata();
      
      // Convert to PNG for consistency
      const pngBuffer = await sharp(file.buffer)
        .png({
          quality: this.config.get('screenshotQuality', 90),
          compressionLevel: 6
        })
        .toBuffer();

      // Generate filename
      const filename = `${comparisonId}.png`;
      const filePath = path.join(this.screenshotsPath, filename);

      // Save file
      fs.writeFileSync(filePath, pngBuffer);

      // Create metadata
      const screenshotData = {
        id: comparisonId,
        filename,
        originalName: file.originalname,
        filePath,
        size: pngBuffer.length,
        dimensions: {
          width: imageInfo.width,
          height: imageInfo.height
        },
        format: 'png',
        uploadedAt: timestamp,
        metadata: {
          ...metadata,
          originalFormat: imageInfo.format,
          originalSize: file.size
        }
      };

      // Save metadata
      const metadataPath = path.join(this.screenshotsPath, `${comparisonId}.json`);
      fs.writeFileSync(metadataPath, JSON.stringify(screenshotData, null, 2));

      console.log(`✅ Screenshot uploaded: ${filename}`);
      return screenshotData;

    } catch (error) {
      console.error('❌ Screenshot upload error:', error);
      throw error;
    }
  }

  /**
   * Compare two screenshots
   */
  async compareScreenshots(screenshot1Id, screenshot2Id, options = {}) {
    try {
      const comparison = {
        id: uuidv4(),
        screenshot1Id,
        screenshot2Id,
        comparedAt: new Date().toISOString(),
        options
      };

      // Load screenshot metadata
      const screenshot1 = this.getScreenshotMetadata(screenshot1Id);
      const screenshot2 = this.getScreenshotMetadata(screenshot2Id);

      if (!screenshot1 || !screenshot2) {
        throw new Error('One or both screenshots not found');
      }

      // Load images
      const image1Path = screenshot1.filePath;
      const image2Path = screenshot2.filePath;

      if (!fs.existsSync(image1Path) || !fs.existsSync(image2Path)) {
        throw new Error('Screenshot files not found');
      }

      // Read PNG files
      const img1 = PNG.sync.read(fs.readFileSync(image1Path));
      const img2 = PNG.sync.read(fs.readFileSync(image2Path));

      // Ensure images have same dimensions
      const { width, height } = this.normalizeImageDimensions(img1, img2);

      // Resize images if needed
      let processedImg1 = img1;
      let processedImg2 = img2;

      if (img1.width !== width || img1.height !== height) {
        const resized1 = await sharp(image1Path)
          .resize(width, height, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
          .png()
          .toBuffer();
        processedImg1 = PNG.sync.read(resized1);
      }

      if (img2.width !== width || img2.height !== height) {
        const resized2 = await sharp(image2Path)
          .resize(width, height, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
          .png()
          .toBuffer();
        processedImg2 = PNG.sync.read(resized2);
      }

      // Create diff image
      const diff = new PNG({ width, height });

      // Compare images
      const threshold = options.threshold || 0.1;
      const numDiffPixels = pixelmatch(
        processedImg1.data,
        processedImg2.data,
        diff.data,
        width,
        height,
        { threshold }
      );

      // Calculate similarity percentage
      const totalPixels = width * height;
      const similarity = ((totalPixels - numDiffPixels) / totalPixels) * 100;

      // Save diff image
      const diffFilename = `diff_${comparison.id}.png`;
      const diffPath = path.join(this.screenshotsPath, diffFilename);
      fs.writeFileSync(diffPath, PNG.sync.write(diff));

      // Create comparison result
      const result = {
        ...comparison,
        result: {
          similarity: Math.round(similarity * 100) / 100,
          diffPixels: numDiffPixels,
          totalPixels,
          threshold,
          dimensions: { width, height },
          diffImagePath: diffPath,
          diffFilename,
          passed: similarity >= (options.passThreshold || 95)
        },
        screenshots: {
          screenshot1,
          screenshot2
        }
      };

      // Save comparison result
      const resultPath = path.join(this.reportsPath, `comparison_${comparison.id}.json`);
      fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));

      console.log(`✅ Screenshot comparison completed: ${similarity.toFixed(2)}% similarity`);
      return result;

    } catch (error) {
      console.error('❌ Screenshot comparison error:', error);
      throw error;
    }
  }

  /**
   * Normalize image dimensions for comparison
   */
  normalizeImageDimensions(img1, img2) {
    // Use the larger dimensions to avoid cropping
    const width = Math.max(img1.width, img2.width);
    const height = Math.max(img1.height, img2.height);
    
    return { width, height };
  }

  /**
   * Get screenshot metadata
   */
  getScreenshotMetadata(screenshotId) {
    try {
      const metadataPath = path.join(this.screenshotsPath, `${screenshotId}.json`);
      
      if (!fs.existsSync(metadataPath)) {
        return null;
      }

      return JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    } catch (error) {
      console.error('❌ Error reading screenshot metadata:', error);
      return null;
    }
  }

  /**
   * List all screenshots
   */
  listScreenshots(options = {}) {
    try {
      const { limit = 50, offset = 0, sortBy = 'uploadedAt', sortOrder = 'desc' } = options;

      // Get all JSON metadata files
      const files = fs.readdirSync(this.screenshotsPath)
        .filter(file => file.endsWith('.json'))
        .map(file => {
          try {
            const metadata = JSON.parse(fs.readFileSync(path.join(this.screenshotsPath, file), 'utf8'));
            return metadata;
          } catch (error) {
            console.error(`❌ Error reading metadata file ${file}:`, error);
            return null;
          }
        })
        .filter(Boolean);

      // Sort files
      files.sort((a, b) => {
        const aValue = a[sortBy];
        const bValue = b[sortBy];
        
        if (sortOrder === 'desc') {
          return bValue > aValue ? 1 : -1;
        } else {
          return aValue > bValue ? 1 : -1;
        }
      });

      // Apply pagination
      const paginatedFiles = files.slice(offset, offset + limit);

      return {
        screenshots: paginatedFiles,
        total: files.length,
        limit,
        offset,
        hasMore: offset + limit < files.length
      };

    } catch (error) {
      console.error('❌ Error listing screenshots:', error);
      throw error;
    }
  }

  /**
   * List all comparisons
   */
  listComparisons(options = {}) {
    try {
      const { limit = 50, offset = 0, sortBy = 'comparedAt', sortOrder = 'desc' } = options;

      // Get all comparison JSON files
      const files = fs.readdirSync(this.reportsPath)
        .filter(file => file.startsWith('comparison_') && file.endsWith('.json'))
        .map(file => {
          try {
            const comparison = JSON.parse(fs.readFileSync(path.join(this.reportsPath, file), 'utf8'));
            return comparison;
          } catch (error) {
            console.error(`❌ Error reading comparison file ${file}:`, error);
            return null;
          }
        })
        .filter(Boolean);

      // Sort files
      files.sort((a, b) => {
        const aValue = a[sortBy];
        const bValue = b[sortBy];
        
        if (sortOrder === 'desc') {
          return bValue > aValue ? 1 : -1;
        } else {
          return aValue > bValue ? 1 : -1;
        }
      });

      // Apply pagination
      const paginatedFiles = files.slice(offset, offset + limit);

      return {
        comparisons: paginatedFiles,
        total: files.length,
        limit,
        offset,
        hasMore: offset + limit < files.length
      };

    } catch (error) {
      console.error('❌ Error listing comparisons:', error);
      throw error;
    }
  }

  /**
   * Get comparison by ID
   */
  getComparison(comparisonId) {
    try {
      const comparisonPath = path.join(this.reportsPath, `comparison_${comparisonId}.json`);
      
      if (!fs.existsSync(comparisonPath)) {
        return null;
      }

      return JSON.parse(fs.readFileSync(comparisonPath, 'utf8'));
    } catch (error) {
      console.error('❌ Error reading comparison:', error);
      return null;
    }
  }

  /**
   * Delete screenshot and related files
   */
  deleteScreenshot(screenshotId) {
    try {
      const metadata = this.getScreenshotMetadata(screenshotId);
      
      if (!metadata) {
        throw new Error('Screenshot not found');
      }

      // Delete image file
      if (fs.existsSync(metadata.filePath)) {
        fs.unlinkSync(metadata.filePath);
      }

      // Delete metadata file
      const metadataPath = path.join(this.screenshotsPath, `${screenshotId}.json`);
      if (fs.existsSync(metadataPath)) {
        fs.unlinkSync(metadataPath);
      }

      console.log(`✅ Screenshot deleted: ${screenshotId}`);
      return true;

    } catch (error) {
      console.error('❌ Error deleting screenshot:', error);
      throw error;
    }
  }

  /**
   * Delete comparison and related files
   */
  deleteComparison(comparisonId) {
    try {
      const comparison = this.getComparison(comparisonId);
      
      if (!comparison) {
        throw new Error('Comparison not found');
      }

      // Delete diff image
      if (comparison.result && comparison.result.diffImagePath) {
        if (fs.existsSync(comparison.result.diffImagePath)) {
          fs.unlinkSync(comparison.result.diffImagePath);
        }
      }

      // Delete comparison file
      const comparisonPath = path.join(this.reportsPath, `comparison_${comparisonId}.json`);
      if (fs.existsSync(comparisonPath)) {
        fs.unlinkSync(comparisonPath);
      }

      console.log(`✅ Comparison deleted: ${comparisonId}`);
      return true;

    } catch (error) {
      console.error('❌ Error deleting comparison:', error);
      throw error;
    }
  }

  /**
   * Get service statistics
   */
  getStatistics() {
    try {
      const screenshots = this.listScreenshots({ limit: 1000 });
      const comparisons = this.listComparisons({ limit: 1000 });

      // Calculate storage usage
      let totalStorage = 0;
      screenshots.screenshots.forEach(screenshot => {
        totalStorage += screenshot.size || 0;
      });

      return {
        screenshots: {
          total: screenshots.total,
          totalStorage,
          averageSize: screenshots.total > 0 ? Math.round(totalStorage / screenshots.total) : 0
        },
        comparisons: {
          total: comparisons.total,
          passed: comparisons.comparisons.filter(c => c.result?.passed).length,
          failed: comparisons.comparisons.filter(c => !c.result?.passed).length
        },
        storage: {
          screenshotsPath: this.screenshotsPath,
          reportsPath: this.reportsPath,
          totalSize: totalStorage
        }
      };

    } catch (error) {
      console.error('❌ Error getting statistics:', error);
      throw error;
    }
  }

  /**
   * Cleanup old files based on retention policy
   */
  cleanup() {
    try {
      const retentionDays = this.config.get('maxReportsRetention', 30);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      let deletedCount = 0;

      // Cleanup old screenshots
      const screenshots = this.listScreenshots({ limit: 1000 });
      screenshots.screenshots.forEach(screenshot => {
        const uploadDate = new Date(screenshot.uploadedAt);
        if (uploadDate < cutoffDate) {
          try {
            this.deleteScreenshot(screenshot.id);
            deletedCount++;
          } catch (error) {
            console.error(`❌ Error deleting old screenshot ${screenshot.id}:`, error);
          }
        }
      });

      // Cleanup old comparisons
      const comparisons = this.listComparisons({ limit: 1000 });
      comparisons.comparisons.forEach(comparison => {
        const comparisonDate = new Date(comparison.comparedAt);
        if (comparisonDate < cutoffDate) {
          try {
            this.deleteComparison(comparison.id);
            deletedCount++;
          } catch (error) {
            console.error(`❌ Error deleting old comparison ${comparison.id}:`, error);
          }
        }
      });

      console.log(`✅ Cleanup completed: ${deletedCount} files deleted`);
      return { deletedCount, retentionDays };

    } catch (error) {
      console.error('❌ Cleanup error:', error);
      throw error;
    }
  }
}

export default ScreenshotService;
