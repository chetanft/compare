/**
 * ColorElementMapping Service
 * Provides bidirectional mapping between colors and elements/components
 * Enables color-based element discovery and analytics
 */

export class ColorElementMappingService {
  constructor() {
    this.colorToElements = new Map(); // color -> Set of element references
    this.elementToColors = new Map(); // elementId -> Set of colors
    this.colorStats = new Map(); // color -> usage statistics
    this.elementDetails = new Map(); // elementId -> element details
  }

  /**
   * Add a color-element association
   * @param {string} color - Hex color value (e.g., "#ffffff")
   * @param {Object} element - Element details
   * @param {string} colorType - Type of color usage (fill, stroke, background, text, border)
   * @param {string} source - Source of extraction (figma, web)
   */
  addColorElementAssociation(color, element, colorType, source) {
    const normalizedColor = this.normalizeColor(color);
    const elementId = element.id || `${source}-${element.name || 'unnamed'}-${Date.now()}`;
    
    // Store element details
    this.elementDetails.set(elementId, {
      ...element,
      id: elementId,
      source,
      extractedAt: new Date().toISOString()
    });

    // Color to elements mapping
    if (!this.colorToElements.has(normalizedColor)) {
      this.colorToElements.set(normalizedColor, new Set());
    }
    
    const elementRef = {
      elementId,
      colorType,
      source,
      elementName: element.name,
      elementType: element.type,
      timestamp: new Date().toISOString()
    };
    
    this.colorToElements.get(normalizedColor).add(JSON.stringify(elementRef));

    // Element to colors mapping
    if (!this.elementToColors.has(elementId)) {
      this.elementToColors.set(elementId, new Set());
    }
    this.elementToColors.get(elementId).add(normalizedColor);

    // Update color statistics
    this.updateColorStats(normalizedColor, colorType, source);
  }

  /**
   * Get all elements using a specific color
   * @param {string} color - Hex color value
   * @returns {Array} Array of element references with details
   */
  getElementsByColor(color) {
    const normalizedColor = this.normalizeColor(color);
    const elementRefs = this.colorToElements.get(normalizedColor);
    
    if (!elementRefs) return [];

    return Array.from(elementRefs).map(refStr => {
      const ref = JSON.parse(refStr);
      const elementDetails = this.elementDetails.get(ref.elementId);
      
      return {
        ...ref,
        elementDetails,
        colorUsage: {
          type: ref.colorType,
          color: normalizedColor
        }
      };
    });
  }

  /**
   * Get all colors used by a specific element
   * @param {string} elementId - Element identifier
   * @returns {Array} Array of colors with usage details
   */
  getColorsByElement(elementId) {
    const colors = this.elementToColors.get(elementId);
    const elementDetails = this.elementDetails.get(elementId);
    
    if (!colors || !elementDetails) return [];

    return Array.from(colors).map(color => {
      const stats = this.colorStats.get(color);
      return {
        color,
        elementId,
        elementName: elementDetails.name,
        elementType: elementDetails.type,
        source: elementDetails.source,
        stats: stats ? {
          totalUsage: stats.totalUsage,
          firstSeen: stats.firstSeen,
          lastSeen: stats.lastSeen,
          sources: Array.from(stats.sources || []),
          colorTypes: Array.from(stats.colorTypes || [])
        } : null
      };
    });
  }

  /**
   * Get comprehensive color analytics
   * @param {string} color - Optional specific color to analyze
   * @returns {Object} Color analytics data
   */
  getColorAnalytics(color = null) {
    if (color) {
      return this.getSingleColorAnalytics(this.normalizeColor(color));
    }

    // Get all colors analytics
    const allColors = Array.from(this.colorToElements.keys());
    
    return {
      totalColors: allColors.length,
      totalElements: this.elementDetails.size,
      totalAssociations: Array.from(this.colorToElements.values())
        .reduce((sum, elements) => sum + elements.size, 0),
      
      colorBreakdown: allColors.map(color => {
        const stats = this.colorStats.get(color);
        return {
          color,
          elementCount: this.colorToElements.get(color).size,
          stats: stats ? {
            totalUsage: stats.totalUsage,
            firstSeen: stats.firstSeen,
            lastSeen: stats.lastSeen,
            sources: Array.from(stats.sources || []),
            colorTypes: Array.from(stats.colorTypes || [])
          } : null,
          elements: this.getElementsByColor(color)
        };
      }).sort((a, b) => b.elementCount - a.elementCount),
      
      sourceBreakdown: this.getSourceBreakdown(),
      colorTypeBreakdown: this.getColorTypeBreakdown()
    };
  }

  /**
   * Get analytics for a single color
   * @param {string} color - Normalized hex color
   * @returns {Object} Single color analytics
   */
  getSingleColorAnalytics(color) {
    const elements = this.getElementsByColor(color);
    const stats = this.colorStats.get(color) || {};
    
    return {
      color,
      totalElements: elements.length,
      stats: {
        totalUsage: stats.totalUsage,
        firstSeen: stats.firstSeen,
        lastSeen: stats.lastSeen,
        sources: Array.from(stats.sources || []),
        colorTypes: Array.from(stats.colorTypes || [])
      },
      elements,
      usageBreakdown: {
        bySource: this.groupBy(elements, 'source'),
        byColorType: this.groupBy(elements, 'colorType'),
        byElementType: this.groupBy(elements, 'elementType')
      }
    };
  }

  /**
   * Search colors by criteria
   * @param {Object} criteria - Search criteria
   * @returns {Array} Matching colors with analytics
   */
  searchColors(criteria = {}) {
    const {
      colorRange, // { from: "#000000", to: "#ffffff" }
      minElementCount = 0,
      maxElementCount = Infinity,
      source = null, // 'figma' | 'web'
      colorType = null, // 'fill' | 'stroke' | 'background' | 'text' | 'border'
      elementType = null // specific element types
    } = criteria;

    let colors = Array.from(this.colorToElements.keys());

    // Filter by color range
    if (colorRange) {
      colors = colors.filter(color => 
        this.isColorInRange(color, colorRange.from, colorRange.to)
      );
    }

    // Filter by element count
    colors = colors.filter(color => {
      const elementCount = this.colorToElements.get(color).size;
      return elementCount >= minElementCount && elementCount <= maxElementCount;
    });

    // Filter by source, colorType, elementType
    if (source || colorType || elementType) {
      colors = colors.filter(color => {
        const elements = this.getElementsByColor(color);
        return elements.some(element => {
          return (!source || element.source === source) &&
                 (!colorType || element.colorType === colorType) &&
                 (!elementType || element.elementType === elementType);
        });
      });
    }

    return colors.map(color => this.getSingleColorAnalytics(color));
  }

  /**
   * Get color usage recommendations
   * @returns {Object} Recommendations for color usage optimization
   */
  getColorRecommendations() {
    const analytics = this.getColorAnalytics();
    const recommendations = [];

    // Find overused colors
    const overusedColors = analytics.colorBreakdown
      .filter(item => item.elementCount > 10)
      .slice(0, 5);

    if (overusedColors.length > 0) {
      recommendations.push({
        type: 'overuse',
        severity: 'medium',
        title: 'Colors Used Extensively',
        description: `${overusedColors.length} colors are used in more than 10 elements`,
        colors: overusedColors.map(item => item.color),
        suggestion: 'Consider creating design tokens for these frequently used colors'
      });
    }

    // Find similar colors that could be consolidated
    const similarColors = this.findSimilarColors();
    if (similarColors.length > 0) {
      recommendations.push({
        type: 'consolidation',
        severity: 'low',
        title: 'Similar Colors Detected',
        description: `Found ${similarColors.length} groups of similar colors`,
        colorGroups: similarColors,
        suggestion: 'Consider consolidating similar colors to reduce design complexity'
      });
    }

    // Find single-use colors
    const singleUseColors = analytics.colorBreakdown
      .filter(item => item.elementCount === 1);

    if (singleUseColors.length > analytics.totalColors * 0.3) {
      recommendations.push({
        type: 'single-use',
        severity: 'low',
        title: 'Many Single-Use Colors',
        description: `${singleUseColors.length} colors are used only once`,
        suggestion: 'Review if these unique colors are necessary or can be replaced with existing palette colors'
      });
    }

    return {
      recommendations,
      summary: {
        totalRecommendations: recommendations.length,
        highSeverity: recommendations.filter(r => r.severity === 'high').length,
        mediumSeverity: recommendations.filter(r => r.severity === 'medium').length,
        lowSeverity: recommendations.filter(r => r.severity === 'low').length
      }
    };
  }

  /**
   * Export color-element mapping data
   * @param {string} format - Export format ('json' | 'csv')
   * @returns {string} Exported data
   */
  exportData(format = 'json') {
    const data = {
      metadata: {
        exportedAt: new Date().toISOString(),
        totalColors: this.colorToElements.size,
        totalElements: this.elementDetails.size,
        version: '1.0.0'
      },
      analytics: this.getColorAnalytics(),
      recommendations: this.getColorRecommendations()
    };

    if (format === 'csv') {
      return this.convertToCSV(data);
    }

    return JSON.stringify(data, null, 2);
  }

  // Private helper methods
  normalizeColor(color) {
    if (!color) return '#000000';
    
    // Handle different color formats
    if (color.startsWith('rgb')) {
      return this.rgbToHex(color);
    }
    
    // Ensure hex format with #
    return color.startsWith('#') ? color.toLowerCase() : `#${color.toLowerCase()}`;
  }

  rgbToHex(rgb) {
    const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!match) return '#000000';
    
    const [, r, g, b] = match;
    return `#${[r, g, b].map(x => parseInt(x).toString(16).padStart(2, '0')).join('')}`;
  }

  updateColorStats(color, colorType, source) {
    if (!this.colorStats.has(color)) {
      this.colorStats.set(color, {
        totalUsage: 0,
        sources: new Set(),
        colorTypes: new Set(),
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString()
      });
    }

    const stats = this.colorStats.get(color);
    stats.totalUsage++;
    
    // Ensure sources and colorTypes are Sets (restore from Array if needed)
    if (!stats.sources || !stats.sources.add) {
      stats.sources = new Set(Array.isArray(stats.sources) ? stats.sources : []);
    }
    if (!stats.colorTypes || !stats.colorTypes.add) {
      stats.colorTypes = new Set(Array.isArray(stats.colorTypes) ? stats.colorTypes : []);
    }
    
    try {
      stats.sources.add(source);
      stats.colorTypes.add(colorType);
      stats.lastSeen = new Date().toISOString();
    } catch (error) {
      console.error('⚠️ Error updating color stats:', error.message);
      // Recreate the stats object if it's corrupted
      this.colorStats.set(color, {
        totalUsage: stats.totalUsage || 1,
        sources: new Set([source]),
        colorTypes: new Set([colorType]),
        firstSeen: stats.firstSeen || new Date().toISOString(),
        lastSeen: new Date().toISOString()
      });
    }

    // No need to set the stats back - it's already a reference to the Map object
  }

  getSourceBreakdown() {
    const breakdown = { figma: 0, web: 0 };
    
    for (const [, elements] of this.colorToElements) {
      for (const elementRefStr of elements) {
        const ref = JSON.parse(elementRefStr);
        breakdown[ref.source] = (breakdown[ref.source] || 0) + 1;
      }
    }
    
    return breakdown;
  }

  getColorTypeBreakdown() {
    const breakdown = {};
    
    for (const [, elements] of this.colorToElements) {
      for (const elementRefStr of elements) {
        const ref = JSON.parse(elementRefStr);
        breakdown[ref.colorType] = (breakdown[ref.colorType] || 0) + 1;
      }
    }
    
    return breakdown;
  }

  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const group = item[key];
      groups[group] = (groups[group] || 0) + 1;
      return groups;
    }, {});
  }

  isColorInRange(color, fromColor, toColor) {
    // Simple hex color range comparison
    const colorVal = parseInt(color.replace('#', ''), 16);
    const fromVal = parseInt(fromColor.replace('#', ''), 16);
    const toVal = parseInt(toColor.replace('#', ''), 16);
    
    return colorVal >= fromVal && colorVal <= toVal;
  }

  findSimilarColors(threshold = 30) {
    const colors = Array.from(this.colorToElements.keys());
    const similarGroups = [];
    const processed = new Set();

    for (const color1 of colors) {
      if (processed.has(color1)) continue;
      
      const similarColors = [color1];
      
      for (const color2 of colors) {
        if (color1 !== color2 && !processed.has(color2)) {
          if (this.getColorDistance(color1, color2) < threshold) {
            similarColors.push(color2);
            processed.add(color2);
          }
        }
      }
      
      if (similarColors.length > 1) {
        similarGroups.push(similarColors);
      }
      
      processed.add(color1);
    }

    return similarGroups;
  }

  getColorDistance(color1, color2) {
    const rgb1 = this.hexToRgb(color1);
    const rgb2 = this.hexToRgb(color2);
    
    return Math.sqrt(
      Math.pow(rgb1.r - rgb2.r, 2) +
      Math.pow(rgb1.g - rgb2.g, 2) +
      Math.pow(rgb1.b - rgb2.b, 2)
    );
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  convertToCSV(data) {
    const headers = ['Color', 'Element Count', 'Sources', 'Color Types', 'Elements'];
    const rows = data.analytics.colorBreakdown.map(item => [
      item.color,
      item.elementCount,
      item.stats.sources?.join(';') || '',
      item.stats.colorTypes?.join(';') || '',
      item.elements.map(e => `${e.elementName}(${e.source})`).join(';')
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Clear all mappings (useful for testing or reset)
   */
  clear() {
    this.colorToElements.clear();
    this.elementToColors.clear();
    this.colorStats.clear();
    this.elementDetails.clear();
  }

  /**
   * Reset service state - useful for clearing corrupted data
   */
  reset() {
    this.clear();
    console.log('🔄 ColorElementMappingService reset - all data cleared');
  }

  /**
   * Get service statistics
   * @returns {Object} Service statistics
   */
  getStats() {
    return {
      totalColors: this.colorToElements.size,
      totalElements: this.elementDetails.size,
      totalColorAssociations: Array.from(this.colorToElements.values())
        .reduce((sum, elements) => sum + elements.size, 0),
      memoryUsage: {
        colorToElements: this.colorToElements.size,
        elementToColors: this.elementToColors.size,
        colorStats: this.colorStats.size,
        elementDetails: this.elementDetails.size
      }
    };
  }
}

// Export singleton instance
export const colorElementMapping = new ColorElementMappingService();
