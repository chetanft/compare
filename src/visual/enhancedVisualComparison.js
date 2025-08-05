import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import VisualDiff from './visualDiff.js';

/**
 * Enhanced Visual Comparison Service
 * Extracts images from both Figma and web, creates side-by-side comparisons with highlights
 */
class EnhancedVisualComparison {
  constructor(config) {
    this.config = config;
    this.visualDiff = new VisualDiff(config);
    this.outputDir = config.output?.screenshotDir || './output/screenshots';
    this.imagesDir = './output/images';
  }

  /**
   * Perform complete visual comparison with Figma and web screenshots
   * @param {Object} figmaData - Figma design data
   * @param {Object} webData - Web implementation data
   * @param {Object} webExtractor - Web extractor instance for screenshots
   * @param {Object} figmaExtractor - Figma extractor instance for images
   * @returns {Object} Complete visual comparison results
   */
  async performVisualComparison(figmaData, webData, webExtractor, figmaExtractor) {
    try {

      // Step 1: Extract Figma images
      const figmaImages = await this.extractFigmaImages(figmaData, figmaExtractor);
      
      // Step 2: Take web screenshots
      const webScreenshots = await this.takeWebScreenshots(webData, webExtractor);
      
      // Check if we have images to compare
      if (figmaImages.length === 0 && webScreenshots.length === 0) {
        console.warn('⚠️ No images available for visual comparison');
        return {
          summary: { totalComparisons: 0, avgSimilarity: 0, status: 'no_images' },
          comparisons: [],
          sideBySide: [],
          figmaImages: [],
          webScreenshots: [],
          generatedAt: new Date().toISOString()
        };
      }
      
      // Step 3: Create image pairs for comparison
      const imagePairs = await this.createImagePairs(figmaImages, webScreenshots, figmaData, webData);
      
      if (imagePairs.length === 0) {
        console.warn('⚠️ No image pairs could be created for comparison');
        return {
          summary: { totalComparisons: 0, avgSimilarity: 0, status: 'no_pairs' },
          comparisons: [],
          sideBySide: [],
          figmaImages,
          webScreenshots,
          generatedAt: new Date().toISOString()
        };
      }
      
      // Step 4: Perform visual diff on each pair
      const visualComparisons = await this.compareImagePairs(imagePairs);
      
      // Step 5: Create side-by-side comparisons with highlights
      const sideBySideComparisons = await this.createSideBySideComparisons(visualComparisons);
      
      // Step 6: Generate visual summary
      const visualSummary = this.generateVisualSummary(visualComparisons);


      return {
        summary: visualSummary,
        comparisons: visualComparisons,
        sideBySide: sideBySideComparisons,
        figmaImages,
        webScreenshots,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Enhanced visual comparison failed:', error);
      return {
        summary: { totalComparisons: 0, avgSimilarity: 0, status: 'error', error: error.message },
        comparisons: [],
        sideBySide: [],
        figmaImages: [],
        webScreenshots: [],
        generatedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Extract images from Figma using MCP integration
   */
  async extractFigmaImages(figmaData, figmaExtractor) {
    try {
      
      // Create images directory
      const figmaImagesDir = path.join(this.imagesDir, 'figma', figmaData.fileId);
      await fs.mkdir(figmaImagesDir, { recursive: true });

      // Collect all components that need images
      const imageNodes = this.collectImageNodes(figmaData.components);
      
      if (imageNodes.length === 0) {
        return [];
      }

      // Download images from Figma
      try {
        const downloadResult = await figmaExtractor.downloadImages(
          figmaData.fileId, 
          imageNodes, 
          figmaImagesDir
        );

        
        // Map results to include proper file paths
        return imageNodes.map(node => {
          const resultItem = downloadResult.results?.find(r => r.nodeId === node.nodeId);
          return {
            nodeId: node.nodeId,
            fileName: node.fileName,
            path: resultItem?.localPath || path.join(figmaImagesDir, node.fileName),
            componentName: this.getComponentNameById(figmaData.components, node.nodeId),
            success: resultItem?.success !== false
          };
        }).filter(item => item.success); // Only return successful downloads
      } catch (downloadError) {
        console.warn('⚠️ Failed to download Figma images, continuing without visual comparison:', downloadError.message);
        return [];
      }

    } catch (error) {
      console.error('❌ Error extracting Figma images:', error);
      return [];
    }
  }

  /**
   * Take screenshots of web elements
   */
  async takeWebScreenshots(webData, webExtractor) {
    try {
      
      // Create screenshots directory
      const webScreenshotsDir = path.join(this.imagesDir, 'web', this.sanitizeUrl(webData.url));
      await fs.mkdir(webScreenshotsDir, { recursive: true });

      const screenshots = [];

      // Add extra wait time for page to fully load
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
      
      // Wait for loading indicators to disappear (common loading patterns)
      try {
        await webExtractor.page.waitForFunction(() => {
          // Check for common loading indicators
          const loadingSelectors = [
            '[class*="loading"]',
            '[class*="spinner"]',
            '[class*="loader"]',
            '.loading',
            '.spinner',
            '.loader'
          ];
          
          for (const selector of loadingSelectors) {
            const loadingElement = document.querySelector(selector);
            if (loadingElement && getComputedStyle(loadingElement).display !== 'none') {
              return false; // Still loading
            }
          }
          return true; // No loading indicators found
        }, { timeout: 5000 }).catch(() => {
          // Timeout is OK, continue anyway
        });
      } catch (error) {
      }

      // Take full page screenshot
      const fullPageScreenshot = await webExtractor.takeScreenshot();
      if (fullPageScreenshot) {
        const fullPagePath = path.join(webScreenshotsDir, 'full-page.png');
        await fs.writeFile(fullPagePath, fullPageScreenshot.buffer);
        screenshots.push({
          type: 'full-page',
          path: fullPagePath,
          selector: null,
          name: 'Full Page'
        });
      }

      // Take screenshots of individual elements
      for (let i = 0; i < Math.min(webData.elements.length, 10); i++) {
        const element = webData.elements[i];
        try {
          const elementScreenshot = await webExtractor.takeComponentScreenshot(element.selector);
          if (elementScreenshot && elementScreenshot.buffer) {
            const elementPath = path.join(webScreenshotsDir, `element-${i}.png`);
            await fs.writeFile(elementPath, elementScreenshot.buffer);
            screenshots.push({
              type: 'element',
              path: elementPath,
              selector: element.selector,
              name: element.tagName || `Element ${i + 1}`,
              index: i
            });
          }
        } catch (error) {
          console.warn(`Failed to screenshot element ${i}:`, error.message);
        }
      }

      return screenshots;

    } catch (error) {
      console.error('❌ Error taking web screenshots:', error);
      return [];
    }
  }

  /**
   * Create image pairs for comparison based on component matching
   */
  async createImagePairs(figmaImages, webScreenshots, figmaData, webData) {
    const pairs = [];

    // Try to match Figma components with web elements
    for (const figmaImage of figmaImages) {
      // Find best matching web screenshot
      const matchingWebScreenshot = this.findBestWebMatch(figmaImage, webScreenshots, figmaData, webData);
      
      if (matchingWebScreenshot) {
        pairs.push({
          figma: figmaImage,
          web: matchingWebScreenshot,
          name: figmaImage.componentName || figmaImage.nodeId
        });
      }
    }

    // Also create a full page comparison if available
    const fullPageScreenshot = webScreenshots.find(s => s.type === 'full-page');
    if (fullPageScreenshot && figmaImages.length > 0) {
      pairs.push({
        figma: figmaImages[0], // Use first Figma image as representative
        web: fullPageScreenshot,
        name: 'Full Page Comparison'
      });
    }

    return pairs;
  }

  /**
   * Compare all image pairs using visual diff
   */
  async compareImagePairs(imagePairs) {
    const comparisons = [];

    for (const pair of imagePairs) {
      try {
        
        const comparison = await this.visualDiff.compareImages(
          pair.figma.path,
          pair.web.path,
          {
            threshold: 0.1,
            diffFilename: `diff-${this.sanitizeFilename(pair.name)}-${Date.now()}.png`
          }
        );

        comparison.pair = pair;
        comparison.name = pair.name;
        comparisons.push(comparison);

      } catch (error) {
        console.error(`Failed to compare ${pair.name}:`, error);
        comparisons.push({
          pair,
          name: pair.name,
          error: error.message,
          comparedAt: new Date().toISOString()
        });
      }
    }

    return comparisons;
  }

  /**
   * Create side-by-side comparisons with highlighted differences
   */
  async createSideBySideComparisons(visualComparisons) {
    const sideBySideComparisons = [];

    for (const comparison of visualComparisons) {
      if (comparison.error) continue;

      try {
        // Create enhanced side-by-side with annotations
        const sideBySidePath = await this.createEnhancedSideBySide(comparison);
        
        if (sideBySidePath) {
          sideBySideComparisons.push({
            name: comparison.name,
            path: sideBySidePath,
            diffPercentage: comparison.metrics.diffPercentage,
            similarity: comparison.metrics.similarity
          });
        }

      } catch (error) {
        console.error(`Failed to create side-by-side for ${comparison.name}:`, error);
      }
    }

    return sideBySideComparisons;
  }

  /**
   * Create enhanced side-by-side comparison with labels and highlights
   */
  async createEnhancedSideBySide(comparison) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `sidebyside-${this.sanitizeFilename(comparison.name)}-${timestamp}.png`;
      const outputPath = path.join(this.outputDir, filename);

      // Load images
      const figmaImg = sharp(comparison.image1);
      const webImg = sharp(comparison.image2);
      const diffImg = comparison.diffImage ? sharp(comparison.diffImage) : null;

      // Get metadata
      const figmaMeta = await figmaImg.metadata();
      const webMeta = await webImg.metadata();

      // Calculate dimensions
      const maxHeight = Math.max(figmaMeta.height, webMeta.height);
      const headerHeight = 60; // Space for labels
      const totalHeight = maxHeight + headerHeight;
      const gap = 10;
      const totalWidth = figmaMeta.width + webMeta.width + gap + (diffImg ? (await diffImg.metadata()).width + gap : 0);

      // Create labels
      const figmaLabel = await this.createLabel('FIGMA DESIGN', figmaMeta.width, 50, '#4285F4');
      const webLabel = await this.createLabel('WEB IMPLEMENTATION', webMeta.width, 50, '#34A853');
      const diffLabel = diffImg ? await this.createLabel('DIFFERENCES', (await diffImg.metadata()).width, 50, '#EA4335') : null;

      // Create comparison canvas
      const images = [
        // Labels
        { input: figmaLabel, top: 5, left: 0 },
        { input: webLabel, top: 5, left: figmaMeta.width + gap },
        
        // Images
        { input: comparison.image1, top: headerHeight, left: 0 },
        { input: comparison.image2, top: headerHeight, left: figmaMeta.width + gap }
      ];

      if (diffImg && diffLabel) {
        const diffLeft = figmaMeta.width + webMeta.width + gap * 2;
        images.push(
          { input: diffLabel, top: 5, left: diffLeft },
          { input: comparison.diffImage, top: headerHeight, left: diffLeft }
        );
      }

      await sharp({
        create: {
          width: totalWidth,
          height: totalHeight,
          channels: 3,
          background: { r: 248, g: 249, b: 250 }
        }
      })
      .composite(images)
      .png()
      .toFile(outputPath);

      return outputPath;

    } catch (error) {
      console.error('Error creating enhanced side-by-side:', error);
      return null;
    }
  }

  /**
   * Create a text label image
   */
  async createLabel(text, width, height, color) {
    return await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    })
    .composite([{
      input: Buffer.from(`
        <svg width="${width}" height="${height}">
          <rect width="${width}" height="${height}" fill="${color}" opacity="0.1"/>
          <text x="${width/2}" y="${height/2 + 5}" text-anchor="middle" 
                font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="${color}">
            ${text}
          </text>
        </svg>
      `),
      top: 0,
      left: 0
    }])
    .png()
    .toBuffer();
  }

  // Helper methods
  collectImageNodes(components) {
    const nodes = [];
    const processComponent = (component) => {
      nodes.push({
        nodeId: component.id,
        fileName: `${component.name.replace(/[^a-zA-Z0-9]/g, '_')}_${component.id}.png`
      });
      if (component.children) {
        component.children.forEach(processComponent);
      }
    };
    components.forEach(processComponent);
    return nodes;
  }

  getComponentNameById(components, nodeId) {
    const findComponent = (comps) => {
      for (const comp of comps) {
        if (comp.id === nodeId) return comp.name;
        if (comp.children) {
          const found = findComponent(comp.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findComponent(components) || nodeId;
  }

  findBestWebMatch(figmaImage, webScreenshots, figmaData, webData) {
    // Simple matching logic - can be enhanced
    return webScreenshots.find(s => s.type === 'element') || webScreenshots[0];
  }

  sanitizeUrl(url) {
    return url.replace(/[^a-zA-Z0-9]/g, '_');
  }

  sanitizeFilename(name) {
    return name.replace(/[^a-zA-Z0-9]/g, '_');
  }

  generateVisualSummary(comparisons) {
    const validComparisons = comparisons.filter(c => !c.error);
    if (validComparisons.length === 0) {
      return { totalComparisons: 0, avgSimilarity: 0, status: 'no_valid_comparisons' };
    }

    const similarities = validComparisons.map(c => c.metrics.similarity);
    const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;

    return {
      totalComparisons: comparisons.length,
      validComparisons: validComparisons.length,
      avgSimilarity: parseFloat(avgSimilarity.toFixed(2)),
      minSimilarity: Math.min(...similarities),
      maxSimilarity: Math.max(...similarities),
      status: avgSimilarity > 90 ? 'excellent' : avgSimilarity > 75 ? 'good' : 'needs_attention'
    };
  }
}

export default EnhancedVisualComparison; 