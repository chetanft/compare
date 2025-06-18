import { promises as fs } from 'fs';

/**
 * Real Comparison Engine
 * Compares extracted Figma design data with live web implementation data
 */
class ComparisonEngine {
  constructor(config = {}) {
    this.config = config;
    this.thresholds = {
      ...config.thresholds,
      colorDifference: 10,
      sizeDifference: 5,
      spacingDifference: 3,
      fontSizeDifference: 2
    };
    
    // Add memory management settings
    this.maxComponentsPerChunk = 10;
    this.maxArrayLength = 1000;
    this.maxStringLength = 1000;
  }

  /**
   * Compare Figma design data with web implementation data
   * Now supports pagination and streaming for large datasets
   */
  async compareDesigns(figmaData, webData, options = {}) {
    try {
      console.log('🔍 Starting design comparison...');
      
      // Initialize results
      const comparisons = [];
      const summary = {
        totalComponents: 0,
        totalDeviations: 0,
        totalMatches: 0,
        severity: { high: 0, medium: 0, low: 0 }
      };

      // Validate and sanitize input data
      const figmaComponents = this.sanitizeArray(figmaData.components || []);
      const webElements = this.sanitizeArray(webData.elements || []);

      // Process components in smaller chunks
      const chunks = this.chunkArray(figmaComponents, this.maxComponentsPerChunk);
      const totalChunks = chunks.length;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`Processing chunk ${i + 1}/${totalChunks} (${chunk.length} components)`);

        // Process each component in the chunk
        const chunkResults = await Promise.all(
          chunk.map(component => this.compareComponent(component, webElements))
        );

        // Filter out null results and add valid ones
        const validResults = chunkResults.filter(result => result !== null);
        comparisons.push(...validResults);

        // Update summary
        for (const result of validResults) {
          summary.totalComponents++;
          summary.totalDeviations += result.deviations.length;
          summary.totalMatches += result.matches.length;

          // Update severity counts
          result.deviations.forEach(deviation => {
            if (deviation.severity) {
              summary.severity[deviation.severity]++;
            }
          });
        }
      }

      // Create sanitized metadata
      const metadata = {
        figma: this.sanitizeObject({
          fileId: figmaData.fileId,
          fileName: figmaData.fileName,
          extractedAt: figmaData.extractedAt,
          totalComponents: figmaComponents.length
        }),
        web: this.sanitizeObject({
          url: webData.url,
          extractedAt: webData.extractedAt,
          totalElements: webElements.length
        }),
        comparedAt: new Date().toISOString(),
        processingStats: {
          chunksProcessed: totalChunks,
          componentsProcessed: summary.totalComponents,
          originalComponentCount: figmaComponents.length,
          originalElementCount: webElements.length
        }
      };

      return { metadata, comparisons, summary };

    } catch (error) {
      console.error('❌ Error in design comparison:', error);
      throw new Error(`Comparison failed: ${error.message}`);
    }
  }

  /**
   * Compare a single component with web elements
   */
  async compareComponent(figmaComponent, webElements) {
    try {
      // Sanitize input component
      const sanitizedComponent = this.sanitizeObject(figmaComponent);
      
      // Find the best matching web element
      const matchedElement = await this.findBestMatch(sanitizedComponent, webElements);
      
      if (!matchedElement) {
        return {
          componentId: sanitizedComponent.id,
          componentName: this.trimString(sanitizedComponent.name, 100),
          componentType: sanitizedComponent.type,
          status: 'no_match',
          deviations: [{
            property: 'existence',
            figmaValue: 'exists',
            webValue: 'not found',
            difference: 'missing',
            severity: 'high',
            message: 'Component not found in web implementation'
          }],
          matches: []
        };
      }

      // Compare properties with sanitized data
      const { deviations, matches } = await this.compareProperties(sanitizedComponent, matchedElement);

      return {
        componentId: sanitizedComponent.id,
        componentName: this.trimString(sanitizedComponent.name, 100),
        componentType: sanitizedComponent.type,
        selector: this.trimString(matchedElement.selector, 200),
        status: deviations.length > 0 ? 'has_deviations' : 'matches',
        deviations: this.sanitizeArray(deviations),
        matches: this.sanitizeArray(matches),
        matchScore: matchedElement.matchScore
      };

    } catch (error) {
      console.error(`Error comparing component ${figmaComponent.id}:`, error);
      return null;
    }
  }

  /**
   * Trim string to prevent memory issues
   */
  trimString(str, maxLength) {
    if (typeof str === 'string' && str.length > maxLength) {
      return str.substring(0, maxLength) + '...';
    }
    return str;
  }

  /**
   * Find the best matching web element for a Figma component
   * @param {Object} figmaComponent - Figma component
   * @param {Array} webElements - Web elements
   * @returns {Object} Best matching web element
   */
  findBestMatch(figmaComponent, webElements) {
    let bestMatch = null;
    let bestScore = 0;

    for (const webElement of webElements) {
      const score = this.calculateMatchScore(figmaComponent, webElement);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = { ...webElement, matchScore: score };
      }
    }

    // Only return matches above a minimum threshold
    return bestScore > 0.3 ? bestMatch : null;
  }

  /**
   * Calculate match score between Figma component and web element
   * @param {Object} figmaComponent - Figma component
   * @param {Object} webElement - Web element
   * @returns {number} Match score (0-1)
   */
  calculateMatchScore(figmaComponent, webElement) {
    let score = 0;
    let factors = 0;

    // Name similarity
    if (figmaComponent.name && webElement.text) {
      const nameSimilarity = this.calculateStringSimilarity(
        figmaComponent.name.toLowerCase(),
        webElement.text.toLowerCase()
      );
      score += nameSimilarity * 0.3;
      factors += 0.3;
    }

    // Type similarity
    const typeSimilarity = this.getTypeSimilarity(figmaComponent.type, webElement.tagName);
    score += typeSimilarity * 0.2;
    factors += 0.2;

    // Dimension similarity - check both possible locations for dimensions
    const figmaDimensions = figmaComponent.dimensions || figmaComponent.properties?.dimensions;
    const webDimensions = webElement.dimensions || webElement.boundingRect;
    
    if (figmaDimensions && webDimensions) {
      const dimensionSimilarity = this.calculateDimensionSimilarity(
        figmaDimensions,
        webDimensions
      );
      score += dimensionSimilarity * 0.3;
      factors += 0.3;
    }

    // Color similarity - check both possible locations for backgroundColor
    const figmaColor = figmaComponent.backgroundColor || figmaComponent.properties?.backgroundColor;
    
    if (figmaColor && webElement.styles?.backgroundColor) {
      const colorSimilarity = this.calculateColorSimilarity(
        figmaColor,
        webElement.styles.backgroundColor
      );
      score += colorSimilarity * 0.2;
      factors += 0.2;
    }

    return factors > 0 ? score / factors : 0;
  }

  /**
   * Compare typography properties
   * @param {Object} figmaTypography - Figma typography data
   * @param {Object} webStyles - Web element styles
   * @returns {Object} Typography comparison result
   */
  compareTypography(figmaTypography, webStyles) {
    const deviations = [];
    const matches = [];

    // Font family
    if (figmaTypography.fontFamily && webStyles.fontFamily) {
      if (this.normalizeFontFamily(figmaTypography.fontFamily) !== 
          this.normalizeFontFamily(webStyles.fontFamily)) {
        deviations.push({
          property: 'fontFamily',
          figmaValue: figmaTypography.fontFamily,
          webValue: webStyles.fontFamily,
          difference: 'different',
          severity: 'medium',
          message: 'Font family differs between design and implementation'
        });
      } else {
        matches.push({
          property: 'fontFamily',
          value: figmaTypography.fontFamily,
          message: 'Font family matches'
        });
      }
    }

    // Font size
    if (figmaTypography.fontSize && webStyles.fontSize) {
      const figmaSize = parseFloat(figmaTypography.fontSize);
      const webSize = parseFloat(webStyles.fontSize);
      const difference = Math.abs(figmaSize - webSize);
      
      if (difference > this.thresholds.fontSizeDifference) {
        deviations.push({
          property: 'fontSize',
          figmaValue: `${figmaSize}px`,
          webValue: `${webSize}px`,
          difference: `${difference}px`,
          severity: this.getSeverity('fontSize', difference),
          message: `Font size differs by ${difference}px`
        });
      } else {
        matches.push({
          property: 'fontSize',
          value: `${figmaSize}px`,
          message: 'Font size matches within tolerance'
        });
      }
    }

    // Font weight
    if (figmaTypography.fontWeight && webStyles.fontWeight) {
      const figmaWeight = this.normalizeFontWeight(figmaTypography.fontWeight);
      const webWeight = this.normalizeFontWeight(webStyles.fontWeight);
      
      if (figmaWeight !== webWeight) {
        deviations.push({
          property: 'fontWeight',
          figmaValue: figmaTypography.fontWeight,
          webValue: webStyles.fontWeight,
          difference: 'different',
          severity: 'low',
          message: 'Font weight differs between design and implementation'
        });
      } else {
        matches.push({
          property: 'fontWeight',
          value: figmaTypography.fontWeight,
          message: 'Font weight matches'
        });
      }
    }

    return { deviations, matches };
  }

  /**
   * Compare color properties
   * @param {string} figmaColor - Figma color (hex)
   * @param {string} webColor - Web color (various formats)
   * @param {string} property - Property name
   * @returns {Object} Color comparison result
   */
  compareColors(figmaColor, webColor, property) {
    const figmaRgb = this.hexToRgb(figmaColor);
    const webRgb = this.parseWebColor(webColor);
    
    if (!figmaRgb || !webRgb) {
      return {
        deviation: {
          property,
          figmaValue: figmaColor,
          webValue: webColor,
          difference: 'unable to compare',
          severity: 'low',
          message: 'Color format could not be compared'
        }
      };
    }

    const difference = this.calculateColorDifference(figmaRgb, webRgb);
    
    if (difference > this.thresholds.colorDifference) {
      return {
        deviation: {
          property,
          figmaValue: figmaColor,
          webValue: webColor,
          difference: `${Math.round(difference)} units`,
          severity: this.getSeverity('color', difference),
          message: `${property} differs by ${Math.round(difference)} color units`
        }
      };
    } else {
      return {
        match: {
          property,
          value: figmaColor,
          message: `${property} matches within tolerance`
        }
      };
    }
  }

  /**
   * Compare spacing properties
   * @param {Object} figmaSpacing - Figma spacing data
   * @param {Object} webStyles - Web element styles
   * @returns {Object} Spacing comparison result
   */
  compareSpacing(figmaSpacing, webStyles) {
    const deviations = [];
    const matches = [];

    const spacingProps = [
      { figma: 'paddingTop', web: 'paddingTop' },
      { figma: 'paddingRight', web: 'paddingRight' },
      { figma: 'paddingBottom', web: 'paddingBottom' },
      { figma: 'paddingLeft', web: 'paddingLeft' }
    ];

    for (const prop of spacingProps) {
      if (figmaSpacing[prop.figma] !== undefined && webStyles[prop.web] !== undefined) {
        const figmaValue = parseFloat(figmaSpacing[prop.figma]);
        const webValue = parseFloat(webStyles[prop.web]);
        const difference = Math.abs(figmaValue - webValue);

        if (difference > this.thresholds.spacingDifference) {
          deviations.push({
            property: prop.figma,
            figmaValue: `${figmaValue}px`,
            webValue: `${webValue}px`,
            difference: `${difference}px`,
            severity: this.getSeverity('spacing', difference),
            message: `${prop.figma} differs by ${difference}px`
          });
        } else {
          matches.push({
            property: prop.figma,
            value: `${figmaValue}px`,
            message: `${prop.figma} matches within tolerance`
          });
        }
      }
    }

    return { deviations, matches };
  }

  /**
   * Compare border properties
   * @param {Object} figmaBorders - Figma border data
   * @param {Object} webBorders - Web border data
   * @returns {Object} Border comparison result
   */
  compareBorders(figmaBorders, webBorders) {
    const deviations = [];
    const matches = [];

    // Border radius
    if (figmaBorders.borderRadius !== undefined && webBorders.borderRadius !== undefined) {
      const figmaValue = parseFloat(figmaBorders.borderRadius);
      const webValue = parseFloat(webBorders.borderRadius);
      const difference = Math.abs(figmaValue - webValue);

      if (difference > this.thresholds.sizeDifference) {
        deviations.push({
          property: 'borderRadius',
          figmaValue: `${figmaValue}px`,
          webValue: `${webValue}px`,
          difference: `${difference}px`,
          severity: this.getSeverity('size', difference),
          message: `Border radius differs by ${difference}px`
        });
      } else {
        matches.push({
          property: 'borderRadius',
          value: `${figmaValue}px`,
          message: 'Border radius matches within tolerance'
        });
      }
    }

    return { deviations, matches };
  }

  /**
   * Compare dimension properties
   * @param {Object} figmaDimensions - Figma dimensions
   * @param {Object} webDimensions - Web element dimensions
   * @returns {Object} Dimension comparison result
   */
  compareDimensions(figmaDimensions, webDimensions) {
    const deviations = [];
    const matches = [];

    // Width
    if (figmaDimensions.width !== undefined && webDimensions.width !== undefined) {
      const difference = Math.abs(figmaDimensions.width - webDimensions.width);
      if (difference > this.thresholds.sizeDifference) {
        deviations.push({
          property: 'width',
          figmaValue: `${figmaDimensions.width}px`,
          webValue: `${webDimensions.width}px`,
          difference: `${difference}px`,
          severity: this.getSeverity('size', difference),
          message: `Width differs by ${difference}px`
        });
      } else {
        matches.push({
          property: 'width',
          value: `${figmaDimensions.width}px`,
          message: 'Width matches within tolerance'
        });
      }
    }

    // Height
    if (figmaDimensions.height !== undefined && webDimensions.height !== undefined) {
      const difference = Math.abs(figmaDimensions.height - webDimensions.height);
      if (difference > this.thresholds.sizeDifference) {
        deviations.push({
          property: 'height',
          figmaValue: `${figmaDimensions.height}px`,
          webValue: `${webDimensions.height}px`,
          difference: `${difference}px`,
          severity: this.getSeverity('size', difference),
          message: `Height differs by ${difference}px`
        });
      } else {
        matches.push({
          property: 'height',
          value: `${figmaDimensions.height}px`,
          message: 'Height matches within tolerance'
        });
      }
    }

    return { deviations, matches };
  }

  /**
   * Compare various properties of a Figma component and its matched web element
   * @param {Object} figmaComponent
   * @param {Object} webElement
   * @returns {{ deviations: Array, matches: Array }}
   */
  async compareProperties(figmaComponent, webElement) {
    const deviations = [];
    const matches = [];

    // 1. Typography
    if (figmaComponent.style && webElement.styles) {
      const { deviations: typoDev, matches: typoMatch } = this.compareTypography(
        figmaComponent.style,
        webElement.styles
      );
      deviations.push(...typoDev);
      matches.push(...typoMatch);
    }

    // 2. Background color (using first solid fill if available)
    let figmaBg = null;
    if (Array.isArray(figmaComponent.fills) && figmaComponent.fills.length > 0) {
      const solidFill = figmaComponent.fills.find(f => f.type === 'SOLID' && f.color);
      if (solidFill) {
        const { r, g, b } = solidFill.color;
        figmaBg = this.rgbToHex({ r, g, b });
      }
    }
    if (figmaBg && webElement.styles?.backgroundColor) {
      const { deviation, match } = this.compareColors(
        figmaBg,
        webElement.styles.backgroundColor,
        'backgroundColor'
      );
      if (deviation) deviations.push(deviation);
      if (match) matches.push(match);
    }

    // 3. Spacing (padding) – build spacing object from figma component
    const figmaSpacing = {
      paddingTop: figmaComponent.paddingTop,
      paddingRight: figmaComponent.paddingRight,
      paddingBottom: figmaComponent.paddingBottom,
      paddingLeft: figmaComponent.paddingLeft
    };
    if (Object.values(figmaSpacing).some(v => v !== undefined) && webElement.styles) {
      const { deviations: spacingDev, matches: spacingMatch } = this.compareSpacing(
        figmaSpacing,
        webElement.styles
      );
      deviations.push(...spacingDev);
      matches.push(...spacingMatch);
    }

    // 4. Borders (radius)
    const figmaBorders = {
      borderRadius: figmaComponent.cornerRadius
    };
    const webBorders = {
      borderRadius: webElement.styles?.borderRadius
    };
    if (figmaBorders.borderRadius !== undefined && webBorders.borderRadius !== undefined) {
      const { deviations: borderDev, matches: borderMatch } = this.compareBorders(
        figmaBorders,
        webBorders
      );
      deviations.push(...borderDev);
      matches.push(...borderMatch);
    }

    // 5. Dimensions
    if (figmaComponent.dimensions && webElement.boundingRect) {
      const { deviations: dimDev, matches: dimMatch } = this.compareDimensions(
        figmaComponent.dimensions,
        webElement.boundingRect
      );
      deviations.push(...dimDev);
      matches.push(...dimMatch);
    }

    return { deviations, matches };
  }

  // Helper methods for calculations and normalization

  calculateStringSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  }

  getTypeSimilarity(figmaType, webTagName) {
    const typeMap = {
      'TEXT': ['p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'label'],
      'FRAME': ['div', 'section', 'article', 'main'],
      'RECTANGLE': ['div', 'span'],
      'INSTANCE': ['div', 'section']
    };

    const webTag = webTagName.toLowerCase();
    const expectedTags = typeMap[figmaType] || [];
    
    return expectedTags.includes(webTag) ? 1 : 0.3;
  }

  calculateDimensionSimilarity(figmaDim, webDim) {
    const widthDiff = Math.abs(figmaDim.width - webDim.width) / Math.max(figmaDim.width, webDim.width);
    const heightDiff = Math.abs(figmaDim.height - webDim.height) / Math.max(figmaDim.height, webDim.height);
    
    return 1 - (widthDiff + heightDiff) / 2;
  }

  calculateColorSimilarity(color1, color2) {
    const rgb1 = this.hexToRgb(color1);
    const rgb2 = this.parseWebColor(color2);
    
    if (!rgb1 || !rgb2) return 0;
    
    const difference = this.calculateColorDifference(rgb1, rgb2);
    return Math.max(0, 1 - difference / 255);
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  parseWebColor(color) {
    // Handle rgb(), rgba(), hex, and named colors
    if (color.startsWith('#')) {
      return this.hexToRgb(color);
    } else if (color.startsWith('rgb')) {
      const matches = color.match(/\d+/g);
      if (matches && matches.length >= 3) {
        return {
          r: parseInt(matches[0]),
          g: parseInt(matches[1]),
          b: parseInt(matches[2])
        };
      }
    }
    return null;
  }

  calculateColorDifference(rgb1, rgb2) {
    return Math.sqrt(
      Math.pow(rgb1.r - rgb2.r, 2) +
      Math.pow(rgb1.g - rgb2.g, 2) +
      Math.pow(rgb1.b - rgb2.b, 2)
    );
  }

  normalizeFontFamily(fontFamily) {
    return fontFamily.toLowerCase().replace(/['"]/g, '').split(',')[0].trim();
  }

  normalizeFontWeight(fontWeight) {
    const weightMap = {
      'thin': '100',
      'extralight': '200',
      'light': '300',
      'normal': '400',
      'medium': '500',
      'semibold': '600',
      'bold': '700',
      'extrabold': '800',
      'black': '900'
    };
    
    const normalized = fontWeight.toString().toLowerCase();
    return weightMap[normalized] || normalized;
  }

  getSeverity(propertyType, difference) {
    const severityThresholds = {
      color: { high: 50, medium: 20 },
      fontSize: { high: 6, medium: 3 },
      spacing: { high: 10, medium: 5 },
      size: { high: 20, medium: 10 }
    };

    const thresholds = severityThresholds[propertyType] || { high: 20, medium: 10 };
    
    if (difference >= thresholds.high) return 'high';
    if (difference >= thresholds.medium) return 'medium';
    return 'low';
  }

  /**
   * Convert RGB object { r, g, b } with 0-1 or 0-255 values to hex string
   * @param {Object} rgb - RGB values
   * @returns {string} Hex color string (e.g., #ff00aa)
   */
  rgbToHex(rgb) {
    if (!rgb || typeof rgb !== 'object') return null;
    let { r, g, b } = rgb;
    // If values are 0-1 floats, convert to 0-255
    if (r <= 1 && g <= 1 && b <= 1) {
      r = Math.round(r * 255);
      g = Math.round(g * 255);
      b = Math.round(b * 255);
    }
    const toHex = (v) => v.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  async saveReport(report, outputPath) {
    await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
    console.log(`Comparison report saved to: ${outputPath}`);
    return report;
  }

  // Helper methods for data sanitization and chunking
  
  sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) continue;
      if (typeof value === 'string') {
        sanitized[key] = this.trimString(value, this.maxStringLength);
      } else if (Array.isArray(value)) {
        sanitized[key] = this.sanitizeArray(value);
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  sanitizeArray(arr) {
    if (!Array.isArray(arr)) return arr;
    return arr.slice(0, this.maxArrayLength).map(item => {
      if (typeof item === 'string') {
        return this.trimString(item, this.maxStringLength);
      }
      if (typeof item === 'object') {
        return this.sanitizeObject(item);
      }
      return item;
    });
  }

  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// Export the ComparisonEngine class
export default ComparisonEngine; 