/**
 * Advanced Comparison Algorithms
 * Intelligent matching for colors, typography, and components
 * Following frontend-developer agent methodology
 */

import { logger } from '../utils/logger.js';

export class AdvancedAlgorithms {
  constructor() {
    this.colorThreshold = 10; // Delta E threshold for color similarity
    this.fontSizeThreshold = 2; // px threshold for font size matching
    this.spacingThreshold = 4; // px threshold for spacing matching
  }

  /**
   * Advanced color matching using Delta E algorithm
   * More accurate than simple hex comparison
   */
  matchColors(figmaColors, webColors) {
    const startTime = Date.now();
    const matches = [];
    const figmaOnly = [];
    const webOnly = [...webColors];
    const confidenceScores = [];

    figmaColors.forEach(figmaColor => {
      let bestMatch = null;
      let bestScore = Infinity;
      let bestIndex = -1;

      webColors.forEach((webColor, index) => {
        const deltaE = this.calculateDeltaE(
          this.hexToLab(figmaColor.hex || figmaColor.value),
          this.hexToLab(webColor.value || webColor.hex)
        );

        if (deltaE < this.colorThreshold && deltaE < bestScore) {
          bestMatch = webColor;
          bestScore = deltaE;
          bestIndex = index;
        }
      });

      if (bestMatch) {
        const confidence = Math.max(0, (this.colorThreshold - bestScore) / this.colorThreshold);
        matches.push({
          figma: figmaColor,
          web: bestMatch,
          deltaE: bestScore,
          confidence: confidence,
          type: 'color',
          algorithm: 'deltaE'
        });
        
        confidenceScores.push(confidence);
        webOnly.splice(webOnly.indexOf(bestMatch), 1);
      } else {
        figmaOnly.push(figmaColor);
      }
    });

    const duration = Date.now() - startTime;
    logger.performance('Advanced color matching', duration, {
      figmaColors: figmaColors.length,
      matches: matches.length,
      avgConfidence: confidenceScores.length > 0 
        ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length 
        : 0
    });

    return {
      matches,
      figmaOnly,
      webOnly,
      algorithm: 'deltaE',
      averageConfidence: confidenceScores.length > 0 
        ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length 
        : 0,
      score: matches.length / (figmaColors.length || 1)
    };
  }

  /**
   * Advanced typography matching with fuzzy string matching
   */
  matchTypography(figmaTypography, webTypography) {
    const startTime = Date.now();
    const matches = [];
    const figmaOnly = [];
    const webOnly = [...webTypography];
    const confidenceScores = [];

    figmaTypography.forEach(figmaType => {
      let bestMatch = null;
      let bestScore = 0;
      let bestIndex = -1;

      webTypography.forEach((webType, index) => {
        const score = this.calculateTypographyScore(figmaType, webType);

        if (score > 0.6 && score > bestScore) { // 60% similarity threshold
          bestMatch = webType;
          bestScore = score;
          bestIndex = index;
        }
      });

      if (bestMatch) {
        matches.push({
          figma: figmaType,
          web: bestMatch,
          confidence: bestScore,
          type: 'typography',
          algorithm: 'fuzzyMatch',
          details: {
            fontMatch: this.calculateFontSimilarity(figmaType.fontFamily, bestMatch.fontFamily),
            sizeMatch: this.calculateSizeSimilarity(figmaType.fontSize, bestMatch.fontSize),
            weightMatch: this.calculateWeightSimilarity(figmaType.fontWeight, bestMatch.fontWeight)
          }
        });
        
        confidenceScores.push(bestScore);
        webOnly.splice(webOnly.indexOf(bestMatch), 1);
      } else {
        figmaOnly.push(figmaType);
      }
    });

    const duration = Date.now() - startTime;
    logger.performance('Advanced typography matching', duration, {
      figmaTypography: figmaTypography.length,
      matches: matches.length,
      avgConfidence: confidenceScores.length > 0 
        ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length 
        : 0
    });

    return {
      matches,
      figmaOnly,
      webOnly,
      algorithm: 'fuzzyMatch',
      averageConfidence: confidenceScores.length > 0 
        ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length 
        : 0,
      score: matches.length / (figmaTypography.length || 1)
    };
  }

  /**
   * Intelligent component matching based on structure and properties
   */
  matchComponents(figmaComponents, webElements) {
    const startTime = Date.now();
    const matches = [];
    const figmaOnly = [];
    const webOnly = [...webElements];

    figmaComponents.forEach(figmaComp => {
      let bestMatch = null;
      let bestScore = 0;

      webElements.forEach(webElem => {
        const score = this.calculateComponentSimilarity(figmaComp, webElem);

        if (score > 0.7 && score > bestScore) { // 70% similarity threshold
          bestMatch = webElem;
          bestScore = score;
        }
      });

      if (bestMatch) {
        matches.push({
          figma: figmaComp,
          web: bestMatch,
          confidence: bestScore,
          type: 'component',
          algorithm: 'structuralSimilarity',
          details: this.analyzeComponentDifferences(figmaComp, bestMatch)
        });
        
        webOnly.splice(webOnly.indexOf(bestMatch), 1);
      } else {
        figmaOnly.push(figmaComp);
      }
    });

    const duration = Date.now() - startTime;
    logger.performance('Advanced component matching', duration, {
      figmaComponents: figmaComponents.length,
      matches: matches.length
    });

    return {
      matches,
      figmaOnly,
      webOnly,
      algorithm: 'structuralSimilarity',
      score: matches.length / (figmaComponents.length || 1)
    };
  }

  // Helper methods for color calculations
  hexToLab(hex) {
    // Convert hex to RGB first
    const rgb = this.hexToRgb(hex);
    if (!rgb) return { l: 0, a: 0, b: 0 };
    
    // Convert RGB to XYZ then to LAB
    return this.rgbToLab(rgb.r, rgb.g, rgb.b);
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  rgbToLab(r, g, b) {
    // Simplified LAB conversion (Delta E calculations)
    r = r / 255;
    g = g / 255;
    b = b / 255;

    const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
    const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
    const z = r * 0.0193 + g * 0.1192 + b * 0.9505;

    const fx = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x + 16/116);
    const fy = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y + 16/116);
    const fz = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z + 16/116);

    const l = 116 * fy - 16;
    const a = 500 * (fx - fy);
    const bVal = 200 * (fy - fz);

    return { l, a, b: bVal };
  }

  calculateDeltaE(lab1, lab2) {
    const deltaL = lab1.l - lab2.l;
    const deltaA = lab1.a - lab2.a;
    const deltaB = lab1.b - lab2.b;
    
    return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
  }

  // Typography similarity calculations
  calculateTypographyScore(figmaType, webType) {
    const fontScore = this.calculateFontSimilarity(figmaType.fontFamily, webType.fontFamily);
    const sizeScore = this.calculateSizeSimilarity(figmaType.fontSize, webType.fontSize);
    const weightScore = this.calculateWeightSimilarity(figmaType.fontWeight, webType.fontWeight);

    // Weighted average (font family is most important)
    return (fontScore * 0.5) + (sizeScore * 0.3) + (weightScore * 0.2);
  }

  calculateFontSimilarity(font1, font2) {
    if (!font1 || !font2) return 0;
    
    const f1 = font1.toLowerCase().replace(/[^a-z]/g, '');
    const f2 = font2.toLowerCase().replace(/[^a-z]/g, '');
    
    if (f1 === f2) return 1;
    
    // Check for font family keywords
    const genericFonts = ['serif', 'sansserif', 'monospace', 'cursive', 'fantasy'];
    const f1Generic = genericFonts.find(gf => f1.includes(gf.replace('-', '')));
    const f2Generic = genericFonts.find(gf => f2.includes(gf.replace('-', '')));
    
    if (f1Generic && f2Generic && f1Generic === f2Generic) return 0.8;
    
    // Levenshtein distance for similarity
    return this.calculateLevenshteinSimilarity(f1, f2);
  }

  calculateSizeSimilarity(size1, size2) {
    if (!size1 || !size2) return 0;
    
    const s1 = parseFloat(size1);
    const s2 = parseFloat(size2);
    const diff = Math.abs(s1 - s2);
    
    if (diff <= this.fontSizeThreshold) return 1;
    return Math.max(0, 1 - (diff / Math.max(s1, s2)));
  }

  calculateWeightSimilarity(weight1, weight2) {
    const weights = {
      'thin': 100, 'light': 300, 'normal': 400, 'medium': 500,
      'semibold': 600, 'bold': 700, 'extrabold': 800, 'black': 900
    };

    const w1 = weights[weight1?.toLowerCase()] || parseInt(weight1) || 400;
    const w2 = weights[weight2?.toLowerCase()] || parseInt(weight2) || 400;
    
    const diff = Math.abs(w1 - w2);
    return Math.max(0, 1 - (diff / 500)); // Max difference is 500
  }

  // Component similarity calculations
  calculateComponentSimilarity(figmaComp, webElem) {
    const typeScore = this.calculateTypeMatch(figmaComp.type, webElem.tagName);
    const sizeScore = this.calculateSizeMatch(figmaComp, webElem);
    const positionScore = this.calculatePositionMatch(figmaComp, webElem);

    return (typeScore * 0.4) + (sizeScore * 0.3) + (positionScore * 0.3);
  }

  calculateTypeMatch(figmaType, webType) {
    const typeMapping = {
      'FRAME': ['div', 'section', 'article'],
      'TEXT': ['p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      'RECTANGLE': ['div', 'button'],
      'BUTTON': ['button', 'a'],
      'INPUT': ['input', 'textarea']
    };

    const mappedTypes = typeMapping[figmaType?.toUpperCase()] || [];
    return mappedTypes.includes(webType?.toLowerCase()) ? 1 : 0.5;
  }

  calculateSizeMatch(figmaComp, webElem) {
    const figmaWidth = figmaComp.width || 0;
    const figmaHeight = figmaComp.height || 0;
    const webWidth = webElem.width || 0;
    const webHeight = webElem.height || 0;

    if (!figmaWidth || !webWidth) return 0.5;

    const widthDiff = Math.abs(figmaWidth - webWidth) / Math.max(figmaWidth, webWidth);
    const heightDiff = Math.abs(figmaHeight - webHeight) / Math.max(figmaHeight, webHeight);

    return Math.max(0, 1 - ((widthDiff + heightDiff) / 2));
  }

  calculatePositionMatch(figmaComp, webElem) {
    // Simplified position matching (could be enhanced with layout analysis)
    return 0.7; // Default moderate match for position
  }

  analyzeComponentDifferences(figmaComp, webElem) {
    return {
      sizeDifference: {
        width: (figmaComp.width || 0) - (webElem.width || 0),
        height: (figmaComp.height || 0) - (webElem.height || 0)
      },
      typeDifference: {
        figma: figmaComp.type,
        web: webElem.tagName
      }
    };
  }

  calculateLevenshteinSimilarity(str1, str2) {
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;

    for (let i = 0; i <= len2; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
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

    const distance = matrix[len2][len1];
    return 1 - (distance / Math.max(len1, len2));
  }
} 