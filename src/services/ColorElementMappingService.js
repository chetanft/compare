/**
 * ColorElementMapping Service (Array-Based Implementation)
 * Provides bidirectional mapping between colors and elements/components
 * Enables color-based element discovery and analytics
 * 
 * REDESIGNED: Uses Arrays consistently to prevent JSON serialization corruption
 * No more Set objects that get corrupted to Arrays through JSON.stringify()
 */

export class ColorElementMappingService {
  constructor() {
    // All data structures use Arrays to prevent JSON serialization issues
    this.colorToElements = new Map(); // color -> Array of element references
    this.elementToColors = new Map(); // elementId -> Array of colors
    this.colorStats = new Map(); // color -> { sources: Array, colorTypes: Array, ... }
    this.elementDetails = new Map(); // elementId -> element details
  }

  /**
   * Utility method to add unique items to array (prevents duplicates)
   */
  addUniqueToArray(array, item) {
    if (!array.includes(item)) {
      array.push(item);
    }
  }

  /**
   * Utility method to remove duplicates from array
   */
  deduplicateArray(array) {
    return [...new Set(array)];
  }

  /**
   * Add a color-element association
   * @param {string} color - Hex color value (e.g., "#ffffff")
   * @param {Object} element - Element details
   * @param {string} colorType - Type of color usage (fill, stroke, background, text, border)
   * @param {string} source - Source of extraction (figma, web)
   */
  addColorElementAssociation(color, element, colorType, source) {
    try {
      const normalizedColor = this.normalizeColor(color);
      const elementId = element.id || `${source}-${element.name || 'unnamed'}-${Date.now()}`;
      
      // Store element details
      this.elementDetails.set(elementId, {
        ...element,
        id: elementId,
        source,
        extractedAt: new Date().toISOString()
      });

      // Color to elements mapping (Array-based)
      if (!this.colorToElements.has(normalizedColor)) {
        this.colorToElements.set(normalizedColor, []);
      }
      
      const elementRef = {
        elementId,
        colorType,
        source,
        elementName: element.name,
        elementType: element.type,
        timestamp: new Date().toISOString()
      };
      
      // Add to array if not already present (prevent duplicates)
      const elementsArray = this.colorToElements.get(normalizedColor);
      const refString = JSON.stringify(elementRef);
      if (!elementsArray.find(ref => JSON.stringify(ref) === refString)) {
        elementsArray.push(elementRef);
      }

      // Element to colors mapping (Array-based)
      if (!this.elementToColors.has(elementId)) {
        this.elementToColors.set(elementId, []);
      }
      
      const colorsArray = this.elementToColors.get(elementId);
      const colorEntry = {
        color: normalizedColor,
        colorType,
        source,
        timestamp: new Date().toISOString()
      };
      
      // Add to array if not already present
      const colorString = JSON.stringify(colorEntry);
      if (!colorsArray.find(entry => JSON.stringify(entry) === colorString)) {
        colorsArray.push(colorEntry);
      }

      // Update color statistics (Array-based)
      this.updateColorStats(normalizedColor, colorType, source);
      
    } catch (error) {
      console.error('⚠️ Error adding color-element association:', error.message);
      // Graceful degradation - don't crash the entire extraction
    }
  }

  /**
   * Update color usage statistics (Array-based implementation)
   */
  updateColorStats(color, colorType, source) {
    if (!this.colorStats.has(color)) {
      this.colorStats.set(color, {
        totalUsage: 0,
        sources: [],      // Array instead of Set
        colorTypes: [],   // Array instead of Set
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString()
      });
    }

    const stats = this.colorStats.get(color);
    stats.totalUsage++;
    
    // Add to arrays if not already present (Array-based deduplication)
    this.addUniqueToArray(stats.sources, source);
    this.addUniqueToArray(stats.colorTypes, colorType);
    stats.lastSeen = new Date().toISOString();

    // No need to set back - stats is already a reference to the Map object
  }

  /**
   * Get all colors used by a specific element (returns Array)
   */
  getColorsByElement(elementId) {
    const colors = this.elementToColors.get(elementId);
    const elementDetails = this.elementDetails.get(elementId);
    
    if (!colors || !elementDetails) return [];

    return colors.map(colorEntry => {
      const stats = this.colorStats.get(colorEntry.color);
      return {
        color: colorEntry.color,
        colorType: colorEntry.colorType,
        elementId,
        elementName: elementDetails.name,
        elementType: elementDetails.type,
        source: elementDetails.source,
        stats: stats ? {
          totalUsage: stats.totalUsage,
          sources: [...stats.sources],      // Return copy of Array
          colorTypes: [...stats.colorTypes], // Return copy of Array
          firstSeen: stats.firstSeen,
          lastSeen: stats.lastSeen
        } : null
      };
    });
  }

  /**
   * Get all elements using a specific color (returns Array)
   */
  getElementsByColor(color) {
    const normalizedColor = this.normalizeColor(color);
    const elementRefs = this.colorToElements.get(normalizedColor);
    
    if (!elementRefs) return [];

    return elementRefs.map(ref => {
      const elementDetails = this.elementDetails.get(ref.elementId);
      return {
        ...ref,
        elementDetails: elementDetails || null
      };
    });
  }

  /**
   * Get comprehensive color analytics (Array-based)
   */
  getColorAnalytics() {
    const allColors = Array.from(this.colorToElements.keys());
    
    return {
      totalColors: allColors.length,
      totalElements: this.elementDetails.size,
      totalAssociations: Array.from(this.colorToElements.values())
        .reduce((sum, elements) => sum + elements.length, 0),
      
      colorBreakdown: allColors.map(color => {
        const elements = this.colorToElements.get(color);
        const stats = this.colorStats.get(color);
        return {
          color,
          elementCount: elements ? elements.length : 0,
          stats: stats ? {
            totalUsage: stats.totalUsage,
            sources: [...stats.sources],      // Return copy of Array
            colorTypes: [...stats.colorTypes], // Return copy of Array
            firstSeen: stats.firstSeen,
            lastSeen: stats.lastSeen
          } : null,
          elements: this.getElementsByColor(color)
        };
      }).sort((a, b) => b.elementCount - a.elementCount),
      
      sourceBreakdown: this.getSourceBreakdown(),
      colorTypeBreakdown: this.getColorTypeBreakdown()
    };
  }

  /**
   * Get analytics for a single color (Array-based)
   */
  getSingleColorAnalytics(color) {
    const elements = this.getElementsByColor(color);
    const stats = this.colorStats.get(color) || {};
    
    return {
      color,
      totalElements: elements.length,
      stats: {
        totalUsage: stats.totalUsage || 0,
        sources: stats.sources ? [...stats.sources] : [],      // Return copy of Array
        colorTypes: stats.colorTypes ? [...stats.colorTypes] : [], // Return copy of Array
        firstSeen: stats.firstSeen || null,
        lastSeen: stats.lastSeen || null
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
   * Get source breakdown (Array-based)
   */
  getSourceBreakdown() {
    const breakdown = { figma: 0, web: 0 };
    
    for (const [, elements] of this.colorToElements) {
      for (const element of elements) {
        if (element.source === 'figma') breakdown.figma++;
        else if (element.source === 'web') breakdown.web++;
      }
    }
    
    return breakdown;
  }

  /**
   * Get color type breakdown (Array-based)
   */
  getColorTypeBreakdown() {
    const breakdown = {};
    
    for (const [, elements] of this.colorToElements) {
      for (const element of elements) {
        breakdown[element.colorType] = (breakdown[element.colorType] || 0) + 1;
      }
    }
    
    return breakdown;
  }

  /**
   * Search colors by criteria (Array-based)
   */
  searchColors(criteria) {
    const { source, colorType, elementType } = criteria;
    const allColors = Array.from(this.colorToElements.keys());
    
    return allColors.filter(color => {
      const elements = this.getElementsByColor(color);
      return elements.some(element => {
        return (!source || element.source === source) &&
               (!colorType || element.colorType === colorType) &&
               (!elementType || element.elementType === elementType);
      });
    }).map(color => ({
      color,
      elements: this.getElementsByColor(color).filter(element => {
        return (!source || element.source === source) &&
               (!colorType || element.colorType === colorType) &&
               (!elementType || element.elementType === elementType);
      })
    }));
  }

  /**
   * Get color palette with usage counts (Array-based)
   */
  getColorPalette(options = {}) {
    const { limit = 50, sortBy = 'usage' } = options;
    const allColors = Array.from(this.colorToElements.keys());
    
    let palette = allColors.map(color => {
      const elements = this.colorToElements.get(color);
      const stats = this.colorStats.get(color);
      
      return {
        color,
        usageCount: elements ? elements.length : 0,
        stats: stats ? {
          totalUsage: stats.totalUsage,
          sources: [...stats.sources],      // Return copy of Array
          colorTypes: [...stats.colorTypes] // Return copy of Array
        } : null
      };
    });
    
    // Sort palette
    if (sortBy === 'usage') {
      palette.sort((a, b) => b.usageCount - a.usageCount);
    } else if (sortBy === 'color') {
      palette.sort((a, b) => a.color.localeCompare(b.color));
    }
    
    return palette.slice(0, limit);
  }

  /**
   * Get service statistics (Array-based)
   */
  getStats() {
    return {
      totalColors: this.colorToElements.size,
      totalElements: this.elementDetails.size,
      totalAssociations: Array.from(this.colorToElements.values())
        .reduce((sum, elements) => sum + elements.length, 0),
      colorStats: this.colorStats.size,
      
      // Memory usage approximation
      memoryUsage: {
        colorToElements: this.colorToElements.size,
        elementToColors: this.elementToColors.size,
        colorStats: this.colorStats.size,
        elementDetails: this.elementDetails.size
      }
    };
  }

  /**
   * Clear all mappings (Array-based)
   */
  clear() {
    this.colorToElements.clear();
    this.elementToColors.clear();
    this.colorStats.clear();
    this.elementDetails.clear();
  }

  /**
   * Reset service state - useful for clearing corrupted data (Array-based)
   */
  reset() {
    this.clear();
    console.log('🔄 ColorElementMappingService reset - all data cleared (Array-based)');
  }

  /**
   * Normalize color to consistent format
   */
  normalizeColor(color) {
    if (!color) return '#000000';
    
    // Handle different color formats
    if (color.startsWith('rgb')) {
      return this.rgbToHex(color);
    }
    
    if (color.startsWith('#')) {
      return color.toLowerCase();
    }
    
    // Default fallback
    return color.toLowerCase();
  }

  /**
   * Convert RGB to hex
   */
  rgbToHex(rgb) {
    const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
    if (!match) return rgb;
    
    const [, r, g, b] = match;
    return `#${((1 << 24) + (parseInt(r) << 16) + (parseInt(g) << 8) + parseInt(b)).toString(16).slice(1)}`;
  }

  /**
   * Group array by property (utility method)
   */
  groupBy(array, property) {
    return array.reduce((groups, item) => {
      const key = item[property] || 'unknown';
      groups[key] = (groups[key] || 0) + 1;
      return groups;
    }, {});
  }

  /**
   * Export data for backup/migration (Array-based)
   */
  exportData() {
    return {
      version: '2.0-array-based',
      timestamp: new Date().toISOString(),
      data: {
        colorToElements: Array.from(this.colorToElements.entries()),
        elementToColors: Array.from(this.elementToColors.entries()),
        colorStats: Array.from(this.colorStats.entries()),
        elementDetails: Array.from(this.elementDetails.entries())
      }
    };
  }

  /**
   * Import data from backup (Array-based)
   */
  importData(exportedData) {
    try {
      if (exportedData.version !== '2.0-array-based') {
        throw new Error(`Unsupported data version: ${exportedData.version}`);
      }

      this.clear();
      
      this.colorToElements = new Map(exportedData.data.colorToElements);
      this.elementToColors = new Map(exportedData.data.elementToColors);
      this.colorStats = new Map(exportedData.data.colorStats);
      this.elementDetails = new Map(exportedData.data.elementDetails);
      
      console.log('✅ ColorElementMappingService data imported successfully (Array-based)');
    } catch (error) {
      console.error('❌ Failed to import ColorElementMappingService data:', error.message);
      throw error;
    }
  }
}

// Create and export singleton instance
export const colorElementMapping = new ColorElementMappingService();