/**
 * Enhanced Comparison Engine
 * Matches individual Figma components with individual web elements
 * Goal: Component-to-component comparison (button vs button, text vs text)
 * Focus: Specialized color extraction and typography analysis
 */
class EnhancedComparisonEngine {
  constructor(config) {
    this.config = config || {};
    this.thresholds = {
      colorDifference: config?.thresholds?.colorDifference || 10,
      sizeDifference: config?.thresholds?.sizeDifference || 5,
      spacingDifference: config?.thresholds?.spacingDifference || 3,
      fontSizeDifference: config?.thresholds?.fontSizeDifference || 2,
      positionTolerance: config?.thresholds?.positionTolerance || 50,
      ...config?.thresholds
    };
  }

  /**
   * Compare Figma design data with web implementation data
   * Focus on individual component matching and detailed property comparison
   */
  async compareDesigns(figmaData, webData) {
    try {
      console.log('🔍 Starting enhanced design comparison...');
      console.log(`📐 Figma components: ${figmaData.components.length}`);
      console.log(`🌐 Web components: ${webData.elements.length}`);

      const comparisons = [];
      const colorAnalysis = this.analyzeColors(figmaData, webData);
      const typographyAnalysis = this.analyzeTypography(figmaData, webData);

      // Match each Figma component with web elements
      for (const figmaComponent of figmaData.components) {
        const comparison = await this.compareComponent(figmaComponent, webData.elements);
        if (comparison) {
          comparisons.push(comparison);
        }
      }

      // Generate summary
      const summary = this.generateSummary(comparisons, colorAnalysis, typographyAnalysis);

      console.log(`✅ Enhanced comparison complete: ${summary.totalMatches} matches, ${summary.totalDeviations} deviations`);

      return {
        metadata: {
          figma: {
            fileId: figmaData.fileId,
            fileName: figmaData.fileName,
            extractedAt: figmaData.extractedAt,
            totalComponents: figmaData.components.length
          },
          web: {
            url: webData.url,
            extractedAt: webData.extractedAt,
            totalElements: webData.elements.length
          },
          comparedAt: new Date().toISOString(),
          summary
        },
        comparisons,
        colorAnalysis,
        typographyAnalysis,
        summary
      };

    } catch (error) {
      console.error('❌ Error in enhanced design comparison:', error);
      throw error;
    }
  }

  /**
   * Compare a single Figma component with web elements
   * Find best match and perform detailed comparison
   */
  async compareComponent(figmaComponent, webElements) {
    // Find potential matches
    const potentialMatches = this.findPotentialMatches(figmaComponent, webElements);
    
    if (potentialMatches.length === 0) {
      return {
        figmaComponent: {
          id: figmaComponent.id,
          name: figmaComponent.name,
          type: figmaComponent.type
        },
        webComponent: null,
        matchType: 'no_match',
        confidence: 0,
        deviations: [{
          category: 'existence',
          property: 'component',
          figmaValue: 'exists',
          webValue: 'not found',
          severity: 'high',
          message: `${figmaComponent.type} component "${figmaComponent.name}" not found in web implementation`
        }],
        matches: [],
        unfetched: []
      };
    }

    // Get best match
    const bestMatch = potentialMatches[0];
    const webComponent = bestMatch.webComponent;

    // Perform detailed property comparison
    const deviations = [];
    const matches = [];
    const unfetched = [];

    // Compare colors
    const colorComparison = this.compareComponentColors(figmaComponent, webComponent);
    deviations.push(...colorComparison.deviations);
    matches.push(...colorComparison.matches);
    unfetched.push(...colorComparison.unfetched);

    // Compare typography
    const typographyComparison = this.compareComponentTypography(figmaComponent, webComponent);
    deviations.push(...typographyComparison.deviations);
    matches.push(...typographyComparison.matches);
    unfetched.push(...typographyComparison.unfetched);

    return {
      figmaComponent: {
        id: figmaComponent.id,
        name: figmaComponent.name,
        type: figmaComponent.type,
        properties: figmaComponent.properties
      },
      webComponent: {
        id: webComponent.id,
        type: webComponent.type,
        selector: webComponent.selector,
        properties: webComponent.properties
      },
      matchType: bestMatch.matchType,
      confidence: bestMatch.confidence,
      deviations,
      matches,
      unfetched
    };
  }

  /**
   * Find potential matches for a Figma component among web elements
   */
  findPotentialMatches(figmaComponent, webElements) {
    const matches = [];

    for (const webElement of webElements) {
      const matchScore = this.calculateMatchScore(figmaComponent, webElement);
      
      if (matchScore.score > 0.3) { // Minimum threshold for consideration
        matches.push({
          webComponent: webElement,
          matchType: matchScore.type,
          confidence: matchScore.score,
          reasons: matchScore.reasons
        });
      }
    }

    // Sort by confidence (highest first)
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate match score between Figma component and web element
   */
  calculateMatchScore(figmaComponent, webElement) {
    let score = 0;
    const reasons = [];
    let matchType = 'unknown';

    // 1. Type-based matching
    const typeScore = this.getTypeMatchScore(figmaComponent, webElement);
    score += typeScore.score;
    if (typeScore.score > 0) {
      reasons.push(typeScore.reason);
      matchType = 'type';
    }

    // 2. Text content matching
    const textScore = this.getTextMatchScore(figmaComponent, webElement);
    score += textScore.score;
    if (textScore.score > 0) {
      reasons.push(textScore.reason);
      if (textScore.score > 0.7) matchType = 'text';
    }

    return {
      score: Math.min(score, 1.0), // Cap at 1.0
      type: matchType,
      reasons
    };
  }

  /**
   * Get type-based match score
   */
  getTypeMatchScore(figmaComponent, webElement) {
    // Direct type matching
    if (figmaComponent.type === 'TEXT' && webElement.type === 'text') {
      return { score: 0.8, reason: 'Both are text components' };
    }

    if (figmaComponent.type === 'RECTANGLE' && webElement.type === 'buttons') {
      return { score: 0.6, reason: 'Rectangle likely represents button' };
    }

    // Name-based type inference
    const figmaName = figmaComponent.name.toLowerCase();
    if (figmaName.includes('button') && webElement.type === 'buttons') {
      return { score: 0.9, reason: 'Name indicates button component' };
    }

    return { score: 0, reason: 'No type match found' };
  }

  /**
   * Get text content match score
   */
  getTextMatchScore(figmaComponent, webElement) {
    const figmaText = figmaComponent.properties?.typography?.text?.trim().toLowerCase();
    const webText = webElement.text?.trim().toLowerCase();

    if (!figmaText || !webText) {
      return { score: 0, reason: 'No text content to compare' };
    }

    if (figmaText === webText) {
      return { score: 1.0, reason: 'Exact text match' };
    }

    // Calculate similarity
    const similarity = this.calculateStringSimilarity(figmaText, webText);
    if (similarity > 0.8) {
      return { score: 0.8, reason: `High text similarity (${Math.round(similarity * 100)}%)` };
    }

    return { score: 0, reason: 'Low text similarity' };
  }

  /**
   * Compare colors between Figma component and web element
   */
  compareComponentColors(figmaComponent, webComponent) {
    const deviations = [];
    const matches = [];
    const unfetched = [];

    const figmaColors = figmaComponent.properties?.colors || {};
    const webColors = webComponent.properties?.colors || {};

    // Compare background color
    if (figmaColors.backgroundColor && webColors.backgroundColor) {
      const comparison = this.compareSpecificColors(
        figmaColors.backgroundColor,
        webColors.backgroundColor,
        'backgroundColor'
      );
      
      if (comparison.isMatch) {
        matches.push(comparison.result);
      } else {
        deviations.push(comparison.result);
      }
    } else if (figmaColors.backgroundColor && !webColors.backgroundColor) {
      unfetched.push({
        category: 'colors',
        property: 'backgroundColor',
        figmaValue: figmaColors.backgroundColor,
        webValue: 'not found',
        message: 'Background color specified in Figma but not found in web implementation'
      });
    }

    return { deviations, matches, unfetched };
  }

  /**
   * Compare specific color values
   */
  compareSpecificColors(figmaColor, webColor, property) {
    const colorDifference = this.calculateColorDifference(
      this.hexToRgb(figmaColor),
      this.hexToRgb(webColor)
    );

    const isMatch = colorDifference <= this.thresholds.colorDifference;
    const severity = colorDifference > 50 ? 'high' : colorDifference > 20 ? 'medium' : 'low';

    const result = {
      category: 'colors',
      property,
      figmaValue: figmaColor,
      webValue: webColor,
      difference: `${Math.round(colorDifference)} color units`,
      severity,
      message: isMatch 
        ? `${property} matches (${figmaColor})`
        : `${property} mismatch: expected ${figmaColor} but found ${webColor} (difference: ${Math.round(colorDifference)} units)`
    };

    return { isMatch, result };
  }

  /**
   * Compare typography between Figma component and web element
   */
  compareComponentTypography(figmaComponent, webComponent) {
    const deviations = [];
    const matches = [];
    const unfetched = [];

    const figmaTypo = figmaComponent.properties?.typography || {};
    const webTypo = webComponent.properties?.typography || {};

    // Only compare if both have text content
    if (!figmaTypo.text && !webTypo.fontFamily) {
      return { deviations, matches, unfetched };
    }

    // Compare font family
    if (figmaTypo.fontFamily && webTypo.fontFamily) {
      const figmaFont = this.normalizeFontFamily(figmaTypo.fontFamily);
      const webFont = this.normalizeFontFamily(webTypo.fontFamily);
      
      if (figmaFont === webFont) {
        matches.push({
          category: 'typography',
          property: 'fontFamily',
          value: figmaFont,
          message: `Font family matches: ${figmaFont}`
        });
      } else {
        deviations.push({
          category: 'typography',
          property: 'fontFamily',
          figmaValue: figmaFont,
          webValue: webFont,
          severity: 'medium',
          message: `Font family mismatch: expected "${figmaFont}" but found "${webFont}"`
        });
      }
    }

    return { deviations, matches, unfetched };
  }

  /**
   * Analyze colors across all components
   */
  analyzeColors(figmaData, webData) {
    const figmaColors = new Set();
    const webColors = new Set();

    // Extract all colors from Figma
    figmaData.components.forEach(component => {
      const colors = component.properties?.colors || {};
      Object.values(colors).forEach(color => {
        if (color && typeof color === 'string') {
          figmaColors.add(color);
        }
      });
    });

    // Extract all colors from web
    webData.elements.forEach(element => {
      const colors = element.properties?.colors || {};
      Object.values(colors).forEach(color => {
        if (color && typeof color === 'string') {
          webColors.add(color);
        }
      });
    });

    return {
      figmaColors: Array.from(figmaColors),
      webColors: Array.from(webColors),
      commonColors: Array.from(figmaColors).filter(color => webColors.has(color)),
      figmaOnlyColors: Array.from(figmaColors).filter(color => !webColors.has(color)),
      webOnlyColors: Array.from(webColors).filter(color => !figmaColors.has(color))
    };
  }

  /**
   * Analyze typography across all components
   */
  analyzeTypography(figmaData, webData) {
    const figmaFonts = new Set();
    const webFonts = new Set();

    // Extract fonts from Figma
    figmaData.components.forEach(component => {
      const typography = component.properties?.typography || {};
      if (typography.fontFamily) {
        figmaFonts.add(this.normalizeFontFamily(typography.fontFamily));
      }
    });

    // Extract fonts from web
    webData.elements.forEach(element => {
      const typography = element.properties?.typography || {};
      if (typography.fontFamily) {
        webFonts.add(this.normalizeFontFamily(typography.fontFamily));
      }
    });

    return {
      figmaFonts: Array.from(figmaFonts),
      webFonts: Array.from(webFonts),
      commonFonts: Array.from(figmaFonts).filter(font => webFonts.has(font)),
      figmaOnlyFonts: Array.from(figmaFonts).filter(font => !webFonts.has(font)),
      webOnlyFonts: Array.from(webFonts).filter(font => !figmaFonts.has(font))
    };
  }

  /**
   * Generate comprehensive summary
   */
  generateSummary(comparisons, colorAnalysis, typographyAnalysis) {
    const totalMatches = comparisons.reduce((sum, comp) => sum + comp.matches.length, 0);
    const totalDeviations = comparisons.reduce((sum, comp) => sum + comp.deviations.length, 0);
    const totalUnfetched = comparisons.reduce((sum, comp) => sum + comp.unfetched.length, 0);

    const severityCounts = { high: 0, medium: 0, low: 0 };
    comparisons.forEach(comp => {
      comp.deviations.forEach(dev => {
        severityCounts[dev.severity]++;
      });
    });

    const matchedComponents = comparisons.filter(comp => comp.matchType !== 'no_match').length;
    const unmatchedComponents = comparisons.filter(comp => comp.matchType === 'no_match').length;

    return {
      totalComponents: comparisons.length,
      matchedComponents,
      unmatchedComponents,
      totalMatches,
      totalDeviations,
      totalUnfetched,
      severity: severityCounts,
      colorAnalysis: {
        figmaColorsCount: colorAnalysis.figmaColors.length,
        webColorsCount: colorAnalysis.webColors.length,
        commonColorsCount: colorAnalysis.commonColors.length,
        colorMatchRate: colorAnalysis.figmaColors.length > 0 
          ? (colorAnalysis.commonColors.length / colorAnalysis.figmaColors.length) * 100 
          : 0
      },
      typographyAnalysis: {
        figmaFontsCount: typographyAnalysis.figmaFonts.length,
        webFontsCount: typographyAnalysis.webFonts.length,
        commonFontsCount: typographyAnalysis.commonFonts.length,
        fontMatchRate: typographyAnalysis.figmaFonts.length > 0 
          ? (typographyAnalysis.commonFonts.length / typographyAnalysis.figmaFonts.length) * 100 
          : 0
      }
    };
  }

  // Helper methods
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

  calculateColorDifference(rgb1, rgb2) {
    return Math.sqrt(
      Math.pow(rgb1.r - rgb2.r, 2) +
      Math.pow(rgb1.g - rgb2.g, 2) +
      Math.pow(rgb1.b - rgb2.b, 2)
    );
  }

  hexToRgb(hex) {
    if (!hex || !hex.startsWith('#')) return null;
    
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  normalizeFontFamily(fontFamily) {
    if (!fontFamily) return '';
    return fontFamily.split(',')[0].trim().replace(/['"]/g, '');
  }
}

export default EnhancedComparisonEngine; 