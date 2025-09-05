import sharp from 'sharp';
import { createCanvas, loadImage } from 'canvas';
import path from 'path';

/**
 * Design Discrepancy Analyzer
 * Analyzes screenshots to detect specific design implementation issues
 */
export class DesignDiscrepancyAnalyzer {
  constructor(config) {
    this.config = config;
  }

  /**
   * Extract typography information from screenshots using OCR-like analysis
   */
  async analyzeTypography(figmaPath, developedPath, settings) {
    const discrepancies = [];
    
    try {
      console.log('📝 Analyzing typography differences...');
      
      // Extract text regions and analyze font characteristics
      const figmaTypography = await this.extractTypographyData(figmaPath, 'figma');
      const developedTypography = await this.extractTypographyData(developedPath, 'developed');
      
      // Compare font sizes
      const fontSizeDiscrepancies = this.compareFontSizes(figmaTypography, developedTypography);
      discrepancies.push(...fontSizeDiscrepancies);
      
      // Compare font weights
      const fontWeightDiscrepancies = this.compareFontWeights(figmaTypography, developedTypography);
      discrepancies.push(...fontWeightDiscrepancies);
      
      // Compare line heights and spacing
      const spacingDiscrepancies = this.compareTextSpacing(figmaTypography, developedTypography);
      discrepancies.push(...spacingDiscrepancies);
      
      return discrepancies;
    } catch (error) {
      console.error('Typography analysis failed:', error);
      return [];
    }
  }

  /**
   * Extract typography data from an image
   */
  async extractTypographyData(imagePath, source) {
    try {
      const image = sharp(imagePath);
      const { data, info } = await image.grayscale().raw().toBuffer({ resolveWithObject: true });
      
      // Analyze image for text characteristics
      const textRegions = await this.detectTextRegions(data, info);
      const fontSizes = this.estimateFontSizes(textRegions, info);
      const fontWeights = this.estimateFontWeights(textRegions, data, info);
      const lineSpacing = this.estimateLineSpacing(textRegions, info);
      
      return {
        source,
        textRegions,
        fontSizes,
        fontWeights,
        lineSpacing,
        imageDimensions: { width: info.width, height: info.height }
      };
    } catch (error) {
      console.error(`Failed to extract typography from ${imagePath}:`, error);
      return {
        source,
        textRegions: [],
        fontSizes: [],
        fontWeights: [],
        lineSpacing: [],
        imageDimensions: { width: 0, height: 0 }
      };
    }
  }

  /**
   * Detect text regions in the image using edge detection and clustering
   */
  async detectTextRegions(data, info) {
    const textRegions = [];
    const { width, height } = info;
    
    // Simple text detection using horizontal line analysis
    for (let y = 0; y < height - 10; y += 5) {
      for (let x = 0; x < width - 50; x += 10) {
        const regionIntensity = this.analyzeRegionIntensity(data, x, y, 50, 20, width);
        
        if (regionIntensity.hasTextLikePattern) {
          textRegions.push({
            x,
            y,
            width: 50,
            height: 20,
            intensity: regionIntensity.averageIntensity,
            textLikelihood: regionIntensity.textScore
          });
        }
      }
    }
    
    return this.mergeOverlappingRegions(textRegions);
  }

  /**
   * Analyze a region for text-like patterns
   */
  analyzeRegionIntensity(data, startX, startY, regionWidth, regionHeight, imageWidth) {
    let totalIntensity = 0;
    let pixelCount = 0;
    let edgeCount = 0;
    const intensityVariations = [];
    
    for (let y = startY; y < startY + regionHeight; y++) {
      let rowIntensity = 0;
      let rowPixels = 0;
      
      for (let x = startX; x < startX + regionWidth; x++) {
        const index = y * imageWidth + x;
        if (index < data.length) {
          const intensity = data[index];
          totalIntensity += intensity;
          rowIntensity += intensity;
          pixelCount++;
          rowPixels++;
          
          // Check for edges (text usually has sharp transitions)
          if (x > startX && Math.abs(intensity - data[y * imageWidth + (x - 1)]) > 50) {
            edgeCount++;
          }
        }
      }
      
      if (rowPixels > 0) {
        intensityVariations.push(rowIntensity / rowPixels);
      }
    }
    
    const averageIntensity = pixelCount > 0 ? totalIntensity / pixelCount : 0;
    const intensityVariance = this.calculateVariance(intensityVariations);
    
    // Text regions typically have moderate variance and multiple edges
    const hasTextLikePattern = intensityVariance > 500 && edgeCount > 5 && 
                              averageIntensity > 50 && averageIntensity < 200;
    
    return {
      averageIntensity,
      hasTextLikePattern,
      textScore: (edgeCount * intensityVariance) / 10000,
      edgeCount,
      intensityVariance
    };
  }

  /**
   * Estimate font sizes based on text region heights
   */
  estimateFontSizes(textRegions, imageInfo) {
    const fontSizes = [];
    
    // Group regions by similar heights (likely same font size)
    const heightGroups = new Map();
    
    textRegions.forEach(region => {
      const heightKey = Math.round(region.height / 2) * 2; // Round to nearest 2
      if (!heightGroups.has(heightKey)) {
        heightGroups.set(heightKey, []);
      }
      heightGroups.get(heightKey).push(region);
    });
    
    // Convert heights to estimated font sizes
    heightGroups.forEach((regions, height) => {
      if (regions.length >= 2) { // Only consider heights that appear multiple times
        const estimatedFontSize = Math.round(height * 0.75); // Rough conversion
        fontSizes.push({
          estimatedSize: estimatedFontSize,
          height,
          regionCount: regions.length,
          confidence: Math.min(regions.length / 5, 1) // More regions = higher confidence
        });
      }
    });
    
    return fontSizes.sort((a, b) => b.regionCount - a.regionCount);
  }

  /**
   * Estimate font weights based on text intensity
   */
  estimateFontWeights(textRegions, data, imageInfo) {
    const fontWeights = [];
    
    textRegions.forEach(region => {
      const regionData = this.extractRegionData(data, region, imageInfo.width);
      const avgIntensity = regionData.reduce((sum, val) => sum + val, 0) / regionData.length;
      
      // Lower intensity typically means bolder text (more ink)
      let estimatedWeight;
      if (avgIntensity < 80) {
        estimatedWeight = 'bold';
      } else if (avgIntensity < 120) {
        estimatedWeight = 'medium';
      } else {
        estimatedWeight = 'regular';
      }
      
      fontWeights.push({
        region,
        estimatedWeight,
        intensity: avgIntensity,
        confidence: region.textLikelihood
      });
    });
    
    return fontWeights;
  }

  /**
   * Estimate line spacing by analyzing vertical gaps between text regions
   */
  estimateLineSpacing(textRegions, imageInfo) {
    const lineSpacing = [];
    
    // Sort regions by y position
    const sortedRegions = textRegions.sort((a, b) => a.y - b.y);
    
    for (let i = 0; i < sortedRegions.length - 1; i++) {
      const currentRegion = sortedRegions[i];
      const nextRegion = sortedRegions[i + 1];
      
      // Check if regions are horizontally aligned (same text block)
      const horizontalOverlap = Math.max(0, Math.min(currentRegion.x + currentRegion.width, nextRegion.x + nextRegion.width) - 
                                         Math.max(currentRegion.x, nextRegion.x));
      
      if (horizontalOverlap > 20) { // Regions are part of the same text block
        const gap = nextRegion.y - (currentRegion.y + currentRegion.height);
        if (gap > 0 && gap < 50) { // Reasonable line spacing
          lineSpacing.push({
            gap,
            fromRegion: currentRegion,
            toRegion: nextRegion,
            confidence: Math.min(horizontalOverlap / 50, 1)
          });
        }
      }
    }
    
    return lineSpacing;
  }

  /**
   * Compare font sizes between figma and developed versions
   */
  compareFontSizes(figmaTypography, developedTypography) {
    const discrepancies = [];
    
    // Compare the most common font sizes
    const figmaMainSizes = figmaTypography.fontSizes.slice(0, 3);
    const developedMainSizes = developedTypography.fontSizes.slice(0, 3);
    
    figmaMainSizes.forEach((figmaSize, index) => {
      const developedSize = developedMainSizes[index];
      
      if (developedSize && Math.abs(figmaSize.estimatedSize - developedSize.estimatedSize) > 2) {
        discrepancies.push({
          type: 'font-size',
          severity: Math.abs(figmaSize.estimatedSize - developedSize.estimatedSize) > 4 ? 'high' : 'medium',
          description: `Font size mismatch detected`,
          figmaValue: `${figmaSize.estimatedSize}px (estimated)`,
          developedValue: `${developedSize.estimatedSize}px (estimated)`,
          location: { x: 0, y: 0, width: 100, height: 20 },
          recommendation: `Adjust font size to match design. Expected: ${figmaSize.estimatedSize}px, Found: ${developedSize.estimatedSize}px`
        });
      }
    });
    
    return discrepancies;
  }

  /**
   * Compare font weights between versions
   */
  compareFontWeights(figmaTypography, developedTypography) {
    const discrepancies = [];
    
    // Group font weights by type
    const figmaWeights = this.groupByWeight(figmaTypography.fontWeights);
    const developedWeights = this.groupByWeight(developedTypography.fontWeights);
    
    ['bold', 'medium', 'regular'].forEach(weight => {
      const figmaCount = figmaWeights[weight] || 0;
      const developedCount = developedWeights[weight] || 0;
      
      const difference = Math.abs(figmaCount - developedCount);
      if (difference > 2) {
        discrepancies.push({
          type: 'font-weight',
          severity: difference > 5 ? 'high' : 'medium',
          description: `Font weight distribution mismatch`,
          figmaValue: `${figmaCount} ${weight} text regions`,
          developedValue: `${developedCount} ${weight} text regions`,
          location: { x: 0, y: 0, width: 100, height: 20 },
          recommendation: `Review font-weight usage. Expected ${figmaCount} ${weight} elements, found ${developedCount}`
        });
      }
    });
    
    return discrepancies;
  }

  /**
   * Compare text spacing between versions
   */
  compareTextSpacing(figmaTypography, developedTypography) {
    const discrepancies = [];
    
    if (figmaTypography.lineSpacing.length > 0 && developedTypography.lineSpacing.length > 0) {
      const figmaAvgSpacing = figmaTypography.lineSpacing.reduce((sum, spacing) => sum + spacing.gap, 0) / 
                             figmaTypography.lineSpacing.length;
      const developedAvgSpacing = developedTypography.lineSpacing.reduce((sum, spacing) => sum + spacing.gap, 0) / 
                                 developedTypography.lineSpacing.length;
      
      const spacingDifference = Math.abs(figmaAvgSpacing - developedAvgSpacing);
      
      if (spacingDifference > 3) {
        discrepancies.push({
          type: 'line-spacing',
          severity: spacingDifference > 8 ? 'high' : 'medium',
          description: `Line spacing mismatch detected`,
          figmaValue: `${figmaAvgSpacing.toFixed(1)}px average`,
          developedValue: `${developedAvgSpacing.toFixed(1)}px average`,
          location: { x: 0, y: 0, width: 100, height: 20 },
          recommendation: `Adjust line-height to match design spacing. Expected: ${figmaAvgSpacing.toFixed(1)}px, Found: ${developedAvgSpacing.toFixed(1)}px`
        });
      }
    }
    
    return discrepancies;
  }

  /**
   * Helper methods
   */
  mergeOverlappingRegions(regions) {
    // Simple merge algorithm for overlapping text regions
    const merged = [];
    const used = new Set();
    
    regions.forEach((region, index) => {
      if (used.has(index)) return;
      
      let mergedRegion = { ...region };
      used.add(index);
      
      regions.forEach((otherRegion, otherIndex) => {
        if (used.has(otherIndex) || index === otherIndex) return;
        
        if (this.regionsOverlap(mergedRegion, otherRegion)) {
          mergedRegion = this.mergeRegions(mergedRegion, otherRegion);
          used.add(otherIndex);
        }
      });
      
      merged.push(mergedRegion);
    });
    
    return merged;
  }

  regionsOverlap(region1, region2) {
    return !(region1.x + region1.width < region2.x || 
             region2.x + region2.width < region1.x || 
             region1.y + region1.height < region2.y || 
             region2.y + region2.height < region1.y);
  }

  mergeRegions(region1, region2) {
    const x = Math.min(region1.x, region2.x);
    const y = Math.min(region1.y, region2.y);
    const width = Math.max(region1.x + region1.width, region2.x + region2.width) - x;
    const height = Math.max(region1.y + region1.height, region2.y + region2.height) - y;
    
    return {
      x, y, width, height,
      intensity: (region1.intensity + region2.intensity) / 2,
      textLikelihood: Math.max(region1.textLikelihood, region2.textLikelihood)
    };
  }

  extractRegionData(data, region, imageWidth) {
    const regionData = [];
    for (let y = region.y; y < region.y + region.height; y++) {
      for (let x = region.x; x < region.x + region.width; x++) {
        const index = y * imageWidth + x;
        if (index < data.length) {
          regionData.push(data[index]);
        }
      }
    }
    return regionData;
  }

  groupByWeight(fontWeights) {
    const grouped = { bold: 0, medium: 0, regular: 0 };
    fontWeights.forEach(fw => {
      grouped[fw.estimatedWeight] = (grouped[fw.estimatedWeight] || 0) + 1;
    });
    return grouped;
  }

  /**
   * Analyze screenshots for design discrepancies
   */
  async analyzeScreenshots(figmaPath, developedPath, settings) {
    console.log('🔍 Starting design discrepancy analysis...');
    const discrepancies = [];

    try {
      // Typography analysis (fonts, sizes, weights)
      if (settings.includeTextAnalysis) {
        const typographyDiscrepancies = await this.analyzeTypography(figmaPath, developedPath, settings);
        discrepancies.push(...typographyDiscrepancies);
      }

      if (settings.colorAnalysis) {
        console.log('🎨 Analyzing color differences...');
        const colorDiscrepancies = await this.analyzeColorDifferences(figmaPath, developedPath);
        discrepancies.push(...colorDiscrepancies);
      }

      if (settings.layoutAnalysis) {
        console.log('📐 Analyzing layout differences...');
        const layoutDiscrepancies = await this.analyzeLayoutDifferences(figmaPath, developedPath);
        discrepancies.push(...layoutDiscrepancies);
      }

      if (settings.spacingAnalysis) {
        console.log('📏 Analyzing spacing differences...');
        const spacingDiscrepancies = await this.analyzeSpacingDifferences(figmaPath, developedPath);
        discrepancies.push(...spacingDiscrepancies);
      }

      console.log(`✅ Found ${discrepancies.length} discrepancies`);
      return discrepancies;
    } catch (error) {
      console.error('❌ Discrepancy analysis failed:', error);
      return [];
    }
  }

  /**
   * Analyze color differences between images
   */
  async analyzeColorDifferences(figmaPath, developedPath) {
    try {
      // Extract dominant colors from both images
      const figmaColors = await this.extractDominantColors(figmaPath, 'figma');
      const developedColors = await this.extractDominantColors(developedPath, 'developed');
      
      const discrepancies = [];
      
      // Compare color palettes
      for (const figmaColor of figmaColors.slice(0, 5)) { // Check top 5 colors
        const closestDevelopedColor = this.findClosestColor(figmaColor, developedColors);
        const colorDistance = this.calculateColorDistance(figmaColor, closestDevelopedColor);
        
        if (colorDistance > 30) { // Threshold for noticeable color difference
          const severity = colorDistance > 60 ? 'high' : colorDistance > 45 ? 'medium' : 'low';
          
          discrepancies.push({
            id: `color_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'color',
            severity,
            description: `Color mismatch detected: Expected ${figmaColor.hex}, found ${closestDevelopedColor.hex}`,
            location: figmaColor.location,
            figmaValue: figmaColor.hex,
            developedValue: closestDevelopedColor.hex,
            recommendation: `Update color to match design specification: ${figmaColor.hex}`
          });
        }
      }

      return discrepancies;
    } catch (error) {
      console.error('Color analysis failed:', error);
      return [];
    }
  }

  /**
   * Analyze layout and structural differences
   */
  async analyzeLayoutDifferences(figmaPath, developedPath) {
    try {
      const discrepancies = [];
      
      // Get image dimensions and basic structure analysis
      const figmaMetadata = await sharp(figmaPath).metadata();
      const developedMetadata = await sharp(developedPath).metadata();
      
      // Check for significant dimension differences
      const widthDiff = Math.abs(figmaMetadata.width - developedMetadata.width);
      const heightDiff = Math.abs(figmaMetadata.height - developedMetadata.height);
      
      if (widthDiff > 50 || heightDiff > 50) {
        discrepancies.push({
          id: `layout_dimensions_${Date.now()}`,
          type: 'layout',
          severity: 'high',
          description: `Significant dimension differences detected`,
          location: { x: 0, y: 0, width: figmaMetadata.width, height: figmaMetadata.height },
          figmaValue: `${figmaMetadata.width}x${figmaMetadata.height}`,
          developedValue: `${developedMetadata.width}x${developedMetadata.height}`,
          recommendation: 'Ensure the implementation matches the design dimensions'
        });
      }

      // Analyze edge density for layout structure comparison
      const figmaEdges = await this.detectEdges(figmaPath);
      const developedEdges = await this.detectEdges(developedPath);
      
      const edgeDifference = Math.abs(figmaEdges.density - developedEdges.density);
      
      if (edgeDifference > 0.3) { // Significant structural difference
        discrepancies.push({
          id: `layout_structure_${Date.now()}`,
          type: 'layout',
          severity: edgeDifference > 0.5 ? 'high' : 'medium',
          description: `Structural layout differences detected`,
          location: { x: 0, y: 0, width: figmaMetadata.width, height: figmaMetadata.height },
          figmaValue: `Edge density: ${figmaEdges.density.toFixed(2)}`,
          developedValue: `Edge density: ${developedEdges.density.toFixed(2)}`,
          recommendation: 'Review component structure and layout implementation'
        });
      }

      return discrepancies;
    } catch (error) {
      console.error('Layout analysis failed:', error);
      return [];
    }
  }

  /**
   * Analyze spacing and alignment differences
   */
  async analyzeSpacingDifferences(figmaPath, developedPath) {
    try {
      const discrepancies = [];
      
      // Simple spacing analysis using content distribution
      const figmaSpacing = await this.analyzeContentDistribution(figmaPath);
      const developedSpacing = await this.analyzeContentDistribution(developedPath);
      
      // Compare spacing patterns
      const spacingDifference = Math.abs(figmaSpacing.uniformity - developedSpacing.uniformity);
      
      if (spacingDifference > 0.2) {
        discrepancies.push({
          id: `spacing_${Date.now()}`,
          type: 'spacing',
          severity: spacingDifference > 0.4 ? 'high' : 'medium',
          description: `Spacing inconsistencies detected`,
          location: { x: 0, y: 0, width: 200, height: 200 }, // Generic location
          figmaValue: `Spacing uniformity: ${figmaSpacing.uniformity.toFixed(2)}`,
          developedValue: `Spacing uniformity: ${developedSpacing.uniformity.toFixed(2)}`,
          recommendation: 'Review spacing and alignment to match design specifications'
        });
      }

      return discrepancies;
    } catch (error) {
      console.error('Spacing analysis failed:', error);
      return [];
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

    for (const color of colors) {
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
    const rgb1 = this.hexToRgb(color1.hex);
    const rgb2 = this.hexToRgb(color2.hex);

    if (!rgb1 || !rgb2) return 255; // Max distance if conversion fails

    // Use Euclidean distance in RGB space
    const rDiff = rgb1.r - rgb2.r;
    const gDiff = rgb1.g - rgb2.g;
    const bDiff = rgb1.b - rgb2.b;

    return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
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
   * Detect edges in an image for structural analysis
   */
  async detectEdges(imagePath) {
    try {
      // Convert to grayscale and apply edge detection
      const { data, info } = await sharp(imagePath)
        .resize(200, 200, { fit: 'inside' })
        .grayscale()
        .convolve({
          width: 3,
          height: 3,
          kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1] // Edge detection kernel
        })
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Calculate edge density
      let edgePixels = 0;
      const threshold = 50;

      for (let i = 0; i < data.length; i++) {
        if (data[i] > threshold) {
          edgePixels++;
        }
      }

      const density = edgePixels / data.length;

      return { density, totalPixels: data.length, edgePixels };
    } catch (error) {
      console.error('Edge detection failed:', error);
      return { density: 0, totalPixels: 0, edgePixels: 0 };
    }
  }

  /**
   * Analyze content distribution for spacing analysis
   */
  async analyzeContentDistribution(imagePath) {
    try {
      // Get image as grayscale for content analysis
      const { data, info } = await sharp(imagePath)
        .resize(100, 100, { fit: 'inside' })
        .grayscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Calculate row and column sums to find content distribution
      const rowSums = new Array(info.height).fill(0);
      const colSums = new Array(info.width).fill(0);

      for (let y = 0; y < info.height; y++) {
        for (let x = 0; x < info.width; x++) {
          const pixel = data[y * info.width + x];
          rowSums[y] += pixel;
          colSums[x] += pixel;
        }
      }

      // Calculate uniformity (how evenly distributed the content is)
      const rowVariance = this.calculateVariance(rowSums);
      const colVariance = this.calculateVariance(colSums);
      const uniformity = 1 / (1 + (rowVariance + colVariance) / 1000000); // Normalize

      return { uniformity, rowVariance, colVariance };
    } catch (error) {
      console.error('Content distribution analysis failed:', error);
      return { uniformity: 0, rowVariance: 0, colVariance: 0 };
    }
  }

  /**
   * Calculate variance of an array
   */
  calculateVariance(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }
}

export default DesignDiscrepancyAnalyzer;
