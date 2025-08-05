/**
 * Categorized Report Generator
 * Generates organized, user-friendly reports from categorized component data
 */

export class CategorizedReportGenerator {
  constructor() {
    this.priorityOrder = {
      // Design System (Most Important)
      designTokens: 1,
      
      // Atomic Design (Primary Navigation)
      atoms: 2,
      molecules: 3,
      organisms: 4,
      
      // Technical Categories (Secondary)
      layout: 5,
      spacing: 6,
      dimensions: 7,
      visual: 8,
      
      // Functional Categories (Tertiary)
      interactive: 9,
      semantic: 10
    };
  }

  /**
   * Generate comprehensive categorized report
   * @param {Object} categorizedData - Output from ComponentCategorizer
   * @param {Object} comparisonResults - Original comparison results
   * @returns {Object} Structured report data
   */
  generateCategorizedReport(categorizedData, comparisonResults) {

    const report = {
      metadata: {
        reportType: 'categorized-component-analysis',
        generatedAt: new Date().toISOString(),
        totalFigmaComponents: categorizedData.summary.figma.totalComponents,
        totalWebComponents: categorizedData.summary.web.totalComponents,
        categoriesAnalyzed: categorizedData.metadata?.totalCategories || 0,
        approach: categorizedData.metadata?.approach || 'fixed-schema',
        emptyCategories: categorizedData.metadata?.emptyCategories || 0
      },

      // Executive Summary
      summary: this.generateExecutiveSummary(categorizedData),

      // Design System Analysis
      designTokens: this.generateDesignTokensReport(categorizedData.designTokens),

      // Atomic Design Categories
      atomicDesign: this.generateAtomicDesignReport(categorizedData),

      // Technical Analysis
      technicalAnalysis: this.generateTechnicalAnalysis(categorizedData),

      // Gaps and Recommendations
      insights: this.generateInsights(categorizedData, comparisonResults),

      // Detailed Component Inventories
      inventories: this.generateComponentInventories(categorizedData),

      // Navigation structure for UI
      navigation: categorizedData.navigation || this.generateNavigationStructure(categorizedData)
    };

    return report;
  }

  /**
   * Generate executive summary with key metrics
   */
  generateExecutiveSummary(categorizedData) {
    const figmaSummary = categorizedData.summary.figma;
    const webSummary = categorizedData.summary.web;

    const designTokenMetrics = {
      colors: categorizedData.designTokens.colors.length,
      typography: categorizedData.designTokens.typography.length,
      spacing: categorizedData.designTokens.spacing.length,
      shadows: categorizedData.designTokens.shadows.length,
      borderRadius: categorizedData.designTokens.borderRadius.length
    };

    const atomicDistribution = {
      figma: {
        atoms: figmaSummary.atoms,
        molecules: figmaSummary.molecules,
        organisms: figmaSummary.organisms
      },
      web: {
        atoms: webSummary.atoms,
        molecules: webSummary.molecules,
        organisms: webSummary.organisms
      }
    };

    const coverage = this.calculateCoverage(categorizedData);

    return {
      designSystemHealth: this.assessDesignSystemHealth(designTokenMetrics),
      componentDistribution: atomicDistribution,
      designTokens: designTokenMetrics,
      coverage,
      recommendations: this.generateHighLevelRecommendations(categorizedData)
    };
  }

  /**
   * Generate design tokens report
   */
  generateDesignTokensReport(designTokens) {
    return {
      colors: {
        total: designTokens.colors.length,
        mostUsed: designTokens.colors.slice(0, 10),
        consistency: this.analyzeColorConsistency(designTokens.colors),
        recommendations: this.generateColorRecommendations(designTokens.colors)
      },
      
      typography: {
        total: designTokens.typography.length,
        fontFamilies: this.extractFontFamilies(designTokens.typography),
        fontSizes: this.extractFontSizes(designTokens.typography),
        scale: this.analyzeTypographicScale(designTokens.typography),
        recommendations: this.generateTypographyRecommendations(designTokens.typography)
      },
      
      spacing: {
        total: designTokens.spacing.length,
        mostUsed: designTokens.spacing.slice(0, 15),
        scale: this.analyzeSpacingScale(designTokens.spacing),
        inconsistencies: this.findSpacingInconsistencies(designTokens.spacing),
        recommendations: this.generateSpacingRecommendations(designTokens.spacing)
      },
      
      shadows: {
        total: designTokens.shadows.length,
        mostUsed: designTokens.shadows.slice(0, 5),
        elevationLevels: this.analyzeShadowElevations(designTokens.shadows)
      },
      
      borderRadius: {
        total: designTokens.borderRadius.length,
        mostUsed: designTokens.borderRadius.slice(0, 8),
        scale: this.analyzeBorderRadiusScale(designTokens.borderRadius)
      }
    };
  }

  /**
   * Generate atomic design report
   */
  generateAtomicDesignReport(categorizedData) {
    const schema = categorizedData.schema || {};
    return {
      atoms: this.generateAtomicLevelReport(schema.atoms || {}, 'Atoms'),
      molecules: this.generateAtomicLevelReport(schema.molecules || {}, 'Molecules'),
      organisms: this.generateAtomicLevelReport(schema.organisms || {}, 'Organisms')
    };
  }

  /**
   * Generate report for a specific atomic design level (Fixed Schema)
   */
  generateAtomicLevelReport(schemaLevel, levelName) {
    const analysis = {};
    
    // Process each subcategory in the fixed schema
    Object.keys(schemaLevel).forEach(subcategory => {
      const categoryData = schemaLevel[subcategory];
      const figmaComponents = categoryData.figmaColumn || [];
      const webComponents = categoryData.webColumn || [];
      
      analysis[subcategory] = {
        label: categoryData.label,
        description: categoryData.description,
        icon: categoryData.icon,
        figmaCount: figmaComponents.length,
        webCount: webComponents.length,
        coverage: webComponents.length > 0 && figmaComponents.length > 0 ? 'implemented' : 
                 figmaComponents.length > 0 ? 'design-only' : 
                 webComponents.length > 0 ? 'implementation-only' : 'empty',
        gap: Math.abs(figmaComponents.length - webComponents.length),
        examples: {
          figma: figmaComponents.slice(0, 5).map(c => ({
            name: c.name,
            type: c.type,
            complexity: c.classification?.complexity
          })),
          web: webComponents.slice(0, 5).map(c => ({
            selector: c.selector,
            tagName: c.tagName,
            type: c.type,
            complexity: c.classification?.complexity
          }))
        },
        isEmpty: figmaComponents.length === 0 && webComponents.length === 0
      };
    });

    const totalFigmaComponents = Object.values(analysis).reduce((sum, cat) => sum + cat.figmaCount, 0);
    const totalWebComponents = Object.values(analysis).reduce((sum, cat) => sum + cat.webCount, 0);
    const emptyCategories = Object.values(analysis).filter(cat => cat.isEmpty).length;

    return {
      overview: {
        totalSubcategories: Object.keys(analysis).length,
        totalFigmaComponents,
        totalWebComponents,
        emptyCategories,
        coverage: totalFigmaComponents > 0 && totalWebComponents > 0 ? 'partial' : 
                 totalFigmaComponents > 0 ? 'design-only' : 'implementation-only'
      },
      subcategories: analysis,
      recommendations: this.generateAtomicLevelRecommendations(levelName, analysis)
    };
  }

  /**
   * Generate technical analysis report
   */
  generateTechnicalAnalysis(categorizedData) {
    const schema = categorizedData.schema || {};
    return {
      layout: this.analyzeTechnicalCategory(schema.layout || {}, 'Layout Systems'),
      designTokens: this.analyzeDesignTokensCategory(categorizedData.designTokens || {}),
      responsive: this.analyzeResponsiveness(categorizedData)
    };
  }

  /**
   * Analyze a technical category
   */
  /**
   * Analyze technical category using fixed schema
   */
  analyzeTechnicalCategory(schemaCategory, categoryName) {
    const analysis = {};
    
    Object.keys(schemaCategory).forEach(subcategory => {
      const categoryData = schemaCategory[subcategory];
      const figmaComponents = categoryData.figmaColumn || [];
      const webComponents = categoryData.webColumn || [];
      
      analysis[subcategory] = {
        label: categoryData.label,
        description: categoryData.description,
        figmaCount: figmaComponents.length,
        webCount: webComponents.length,
        coverage: webComponents.length > 0 && figmaComponents.length > 0 ? 'implemented' : 
                 figmaComponents.length > 0 ? 'design-only' : 
                 webComponents.length > 0 ? 'implementation-only' : 'empty'
      };
    });
    
    return {
      name: categoryName,
      subcategories: analysis,
      maturity: this.assessCategoryMaturity(analysis),
      recommendations: this.generateTechnicalRecommendations(categoryName, analysis)
    };
  }

  /**
   * Analyze design tokens category
   */
  analyzeDesignTokensCategory(designTokens) {
    return {
      colors: {
        total: designTokens.colors?.length || 0,
        figmaTokens: designTokens.colors?.filter(t => t.sources.some(s => s.source === 'figma')).length || 0,
        webTokens: designTokens.colors?.filter(t => t.sources.some(s => s.source === 'web')).length || 0
      },
      typography: {
        total: designTokens.typography?.length || 0,
        figmaTokens: designTokens.typography?.filter(t => t.sources.some(s => s.source === 'figma')).length || 0,
        webTokens: designTokens.typography?.filter(t => t.sources.some(s => s.source === 'web')).length || 0
      },
      spacing: {
        total: designTokens.spacing?.length || 0,
        figmaTokens: designTokens.spacing?.filter(t => t.sources.some(s => s.source === 'figma')).length || 0,
        webTokens: designTokens.spacing?.filter(t => t.sources.some(s => s.source === 'web')).length || 0
      }
    };
  }

  /**
   * Generate insights and recommendations
   */
  generateInsights(categorizedData, comparisonResults) {
    return {
      designSystemGaps: this.identifyDesignSystemGaps(categorizedData),
      implementationGaps: this.identifyImplementationGaps(categorizedData),
      consistencyIssues: this.identifyConsistencyIssues(categorizedData),
      quickWins: this.identifyQuickWins(categorizedData),
      strategicRecommendations: this.generateStrategicRecommendations(categorizedData),
      actionPlan: this.generateActionPlan(categorizedData)
    };
  }

  /**
   * Generate component inventories for detailed exploration
   */
  generateComponentInventories(categorizedData) {
    return {
      figma: this.generateInventoryFromSchema(categorizedData.schema, 'figma'),
      web: this.generateInventoryFromSchema(categorizedData.schema, 'web'),
      crossReference: this.generateCrossReference(categorizedData)
    };
  }

  /**
   * Generate inventory for a platform using fixed schema
   */
  generateInventoryFromSchema(schema, platform) {
    const inventory = {};
    
    Object.keys(schema).forEach(categoryKey => {
      const category = schema[categoryKey];
      
      Object.keys(category).forEach(subcategoryKey => {
        const subcategory = category[subcategoryKey];
        const components = platform === 'figma' ? subcategory.figmaColumn : subcategory.webColumn;
        
        if (components && components.length > 0) {
          const categoryPath = `${categoryKey}.${subcategoryKey}`;
          inventory[categoryPath] = {
            count: components.length,
            label: subcategory.label,
            description: subcategory.description,
            components: components.map(component => ({
              id: component.id,
              name: component.name || component.selector,
              type: component.type,
              complexity: component.classification?.complexity,
              properties: this.extractKeyProperties(component, platform)
            }))
          };
        }
      });
    });

    return inventory;
  }

  /**
   * Generate inventory for a platform (legacy method)
   */
  generateInventory(platformData, platform) {
    const inventory = {};
    
    const processCategory = (categoryData, categoryPath = '') => {
      Object.keys(categoryData).forEach(key => {
        const currentPath = categoryPath ? `${categoryPath}.${key}` : key;
        
        if (Array.isArray(categoryData[key])) {
          if (categoryData[key].length > 0) {
            inventory[currentPath] = {
              count: categoryData[key].length,
              components: categoryData[key].map(component => ({
                id: component.id,
                name: component.name || component.selector,
                type: component.type,
                complexity: component.classification?.complexity,
                category: component.category,
                properties: this.extractKeyProperties(component, platform)
              }))
            };
          }
        } else if (typeof categoryData[key] === 'object') {
          processCategory(categoryData[key], currentPath);
        }
      });
    };

    processCategory(platformData);
    return inventory;
  }

  /**
   * Generate navigation structure for UI
   */
  generateNavigationStructure(categorizedData) {
    const navigation = {
      primary: [
        {
          id: 'summary',
          label: 'Executive Summary',
          icon: '📊',
          description: 'High-level metrics and health assessment'
        },
        {
          id: 'design-tokens',
          label: 'Design Tokens',
          icon: '🎨',
          description: 'Colors, typography, spacing, and other design primitives',
          subcategories: [
            { id: 'colors', label: 'Colors', count: categorizedData.designTokens.colors.length },
            { id: 'typography', label: 'Typography', count: categorizedData.designTokens.typography.length },
            { id: 'spacing', label: 'Spacing', count: categorizedData.designTokens.spacing.length },
            { id: 'shadows', label: 'Shadows', count: categorizedData.designTokens.shadows.length },
            { id: 'border-radius', label: 'Border Radius', count: categorizedData.designTokens.borderRadius.length }
          ]
        },
        {
          id: 'atomic-design',
          label: 'Atomic Design',
          icon: '⚛️',
          description: 'Components organized by atomic design methodology',
          subcategories: [
            { id: 'atoms', label: 'Atoms', count: categorizedData.summary.figma.atoms + categorizedData.summary.web.atoms },
            { id: 'molecules', label: 'Molecules', count: categorizedData.summary.figma.molecules + categorizedData.summary.web.molecules },
            { id: 'organisms', label: 'Organisms', count: categorizedData.summary.figma.organisms + categorizedData.summary.web.organisms }
          ]
        }
      ],
      
      secondary: [
        {
          id: 'technical',
          label: 'Technical Analysis',
          icon: '⚙️',
          subcategories: [
            { id: 'layout', label: 'Layout Systems' },
            { id: 'spacing', label: 'Spacing Patterns' },
            { id: 'visual', label: 'Visual Effects' },
            { id: 'interactions', label: 'Interactions' }
          ]
        },
        {
          id: 'insights',
          label: 'Insights & Gaps',
          icon: '💡',
          subcategories: [
            { id: 'design-gaps', label: 'Design System Gaps' },
            { id: 'implementation-gaps', label: 'Implementation Gaps' },
            { id: 'quick-wins', label: 'Quick Wins' },
            { id: 'action-plan', label: 'Action Plan' }
          ]
        }
      ],
      
      utility: [
        {
          id: 'inventories',
          label: 'Component Inventories',
          icon: '📋',
          description: 'Detailed component lists and cross-references'
        },
        {
          id: 'export',
          label: 'Export Data',
          icon: '💾',
          description: 'Download categorized data in various formats'
        }
      ]
    };

    return navigation;
  }

  // Helper Methods

  calculateCoverage(categorizedData) {
    const figmaTotal = categorizedData.summary.figma.totalComponents;
    const webTotal = categorizedData.summary.web.totalComponents;
    
    return {
      implementationCoverage: figmaTotal > 0 ? Math.round((webTotal / figmaTotal) * 100) : 0,
      designCoverage: webTotal > 0 ? Math.round((figmaTotal / webTotal) * 100) : 0,
      totalComponents: figmaTotal + webTotal
    };
  }

  assessDesignSystemHealth(designTokenMetrics) {
    const scores = {
      colors: this.scoreTokenHealth(designTokenMetrics.colors, 15, 50),
      typography: this.scoreTokenHealth(designTokenMetrics.typography, 8, 25),
      spacing: this.scoreTokenHealth(designTokenMetrics.spacing, 10, 30),
      shadows: this.scoreTokenHealth(designTokenMetrics.shadows, 3, 8),
      borderRadius: this.scoreTokenHealth(designTokenMetrics.borderRadius, 4, 12)
    };

    const overallScore = Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.keys(scores).length;
    
    return {
      overall: overallScore,
      scores,
      level: overallScore >= 80 ? 'excellent' : overallScore >= 60 ? 'good' : overallScore >= 40 ? 'fair' : 'needs-improvement'
    };
  }

  scoreTokenHealth(count, optimal, excessive) {
    if (count === 0) return 0;
    if (count <= optimal) return 100;
    if (count <= excessive) return Math.max(60, 100 - ((count - optimal) / (excessive - optimal)) * 40);
    return Math.max(20, 60 - ((count - excessive) * 2));
  }

  extractKeyProperties(component, platform) {
    if (platform === 'figma') {
      return {
        type: component.type,
        hasColors: !!(component.properties?.color || component.properties?.backgroundColor),
        hasSpacing: !!component.properties?.spacing,
        hasLayout: !!component.properties?.layout,
        dimensions: component.properties?.dimensions
      };
    } else {
      return {
        tagName: component.tagName,
        hasColors: !!(component.styles?.color || component.styles?.backgroundColor),
        hasSpacing: !!(component.detailedStyles?.spacing),
        hasLayout: component.detailedStyles?.layout?.display !== 'static',
        interactive: ['button', 'a', 'input'].includes(component.tagName)
      };
    }
  }

  mergeSubcategories(figmaCategory, webCategory) {
    const merged = {};
    
    // Add Figma subcategories
    if (figmaCategory) {
      Object.keys(figmaCategory).forEach(key => {
        merged[key] = { figma: figmaCategory[key] || [], web: [] };
      });
    }
    
    // Add Web subcategories
    if (webCategory) {
      Object.keys(webCategory).forEach(key => {
        if (!merged[key]) {
          merged[key] = { figma: [], web: [] };
        }
        merged[key].web = webCategory[key] || [];
      });
    }
    
    return merged;
  }

  // Analysis Methods - Implemented with real functionality
  analyzeColorConsistency(colors) {
    if (!colors || colors.length === 0) {
      return { score: 0, issues: ['No colors found'], suggestions: ['Add color tokens to design system'] };
    }

    const issues = [];
    const suggestions = [];
    let score = 100;

    // Check for too many colors
    if (colors.length > 50) {
      issues.push(`Excessive color count: ${colors.length} colors found`);
      suggestions.push('Consider consolidating similar colors');
      score -= 20;
    }

    // Check for color naming consistency
    const namedColors = colors.filter(color => color.name && !color.name.startsWith('#'));
    const consistencyRatio = namedColors.length / colors.length;
    if (consistencyRatio < 0.7) {
      issues.push('Inconsistent color naming');
      suggestions.push('Establish consistent color naming convention');
      score -= 15;
    }

    // Check for duplicate colors
    const colorValues = new Set();
    const duplicates = [];
    colors.forEach(color => {
      if (colorValues.has(color.value)) {
        duplicates.push(color.value);
      } else {
        colorValues.add(color.value);
      }
    });

    if (duplicates.length > 0) {
      issues.push(`${duplicates.length} duplicate color values found`);
      suggestions.push('Remove duplicate colors and consolidate tokens');
      score -= 10;
    }

    return { 
      score: Math.max(0, score), 
      issues, 
      suggestions,
      metrics: {
        total: colors.length,
        named: namedColors.length,
        duplicates: duplicates.length
      }
    };
  }

  generateColorRecommendations(colors) {
    const recommendations = [];
    
    if (!colors || colors.length === 0) {
      return ['Create a foundational color palette with primary, secondary, and neutral colors'];
    }

    if (colors.length < 10) {
      recommendations.push('Expand color palette to include semantic colors (success, warning, error)');
    } else if (colors.length > 50) {
      recommendations.push('Reduce color token count by consolidating similar shades');
    }

    // Check for semantic colors
    const semanticColors = colors.filter(color => 
      color.name && /success|error|warning|info|danger/i.test(color.name)
    );
    if (semanticColors.length < 3) {
      recommendations.push('Add semantic color tokens for success, warning, and error states');
    }

    // Check for accessibility
    recommendations.push('Ensure color contrast ratios meet WCAG AA standards');
    recommendations.push('Document color usage guidelines and accessibility requirements');

    return recommendations;
  }

  extractFontFamilies(typography) {
    if (!typography || typography.length === 0) return [];
    
    const families = new Set();
    typography.forEach(token => {
      if (token.sources) {
      token.sources.forEach(source => {
          if (source.fontFamily) {
            // Clean font family name
            const cleanName = source.fontFamily.replace(/['"]/g, '').split(',')[0].trim();
            families.add(cleanName);
          }
      });
      }
    });
    return Array.from(families);
  }

  extractFontSizes(typography) {
    if (!typography || typography.length === 0) return [];
    
    const sizes = new Set();
    typography.forEach(token => {
      if (token.sources) {
      token.sources.forEach(source => {
          if (source.fontSize) {
            // Normalize font size to pixels
            let size = source.fontSize;
            if (typeof size === 'string') {
              size = parseFloat(size.replace(/[^\d.]/g, ''));
            }
            if (!isNaN(size) && size > 0) {
              sizes.add(size);
            }
          }
        });
      }
    });
    return Array.from(sizes).sort((a, b) => a - b);
  }

  analyzeTypographicScale(typography) {
    const sizes = this.extractFontSizes(typography);
    if (sizes.length < 2) {
      return { ratio: null, consistency: 'insufficient-data', scale: sizes };
    }

    // Calculate ratios between consecutive sizes
    const ratios = [];
    for (let i = 1; i < sizes.length; i++) {
      ratios.push(sizes[i] / sizes[i - 1]);
  }

    // Find most common ratio
    const avgRatio = ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
    const variance = ratios.reduce((sum, ratio) => sum + Math.pow(ratio - avgRatio, 2), 0) / ratios.length;
    
    let consistency = 'poor';
    if (variance < 0.1) consistency = 'excellent';
    else if (variance < 0.3) consistency = 'good';
    else if (variance < 0.5) consistency = 'fair';

    return { 
      ratio: Math.round(avgRatio * 100) / 100, 
      consistency, 
      scale: sizes,
      variance: Math.round(variance * 1000) / 1000
    };
  }

  generateTypographyRecommendations(typography) {
    const recommendations = [];
    const families = this.extractFontFamilies(typography);
    const sizes = this.extractFontSizes(typography);
    const scale = this.analyzeTypographicScale(typography);

    if (families.length === 0) {
      recommendations.push('Establish primary and secondary font families');
    } else if (families.length > 3) {
      recommendations.push('Limit font families to 2-3 maximum for consistency');
    }

    if (sizes.length < 5) {
      recommendations.push('Expand type scale to include more size variations');
    } else if (sizes.length > 12) {
      recommendations.push('Consolidate font sizes to create a more manageable type scale');
    }

    if (scale.consistency === 'poor') {
      recommendations.push('Establish consistent typographic scale ratio (recommended: 1.2-1.618)');
    }

    recommendations.push('Define clear hierarchy with headings, body, and caption styles');
    recommendations.push('Ensure typography tokens include line-height and letter-spacing');

    return recommendations;
  }

  analyzeSpacingScale(spacing) {
    if (!spacing || spacing.length === 0) {
      return { base: null, ratio: null, scale: [], consistency: 'no-data' };
    }

    // Extract numeric values
    const values = spacing.map(token => {
      if (typeof token.value === 'string') {
        return parseFloat(token.value.replace(/[^\d.]/g, ''));
      }
      return parseFloat(token.value);
    }).filter(val => !isNaN(val) && val > 0).sort((a, b) => a - b);

    if (values.length < 2) {
      return { base: values[0] || null, ratio: null, scale: values, consistency: 'insufficient-data' };
    }

    // Find potential base unit (GCD or smallest value)
    const base = Math.min(...values);
    
    // Check if values follow a consistent pattern
    const ratios = [];
    for (let i = 1; i < values.length; i++) {
      ratios.push(values[i] / values[i - 1]);
    }

    const avgRatio = ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
    const variance = ratios.reduce((sum, ratio) => sum + Math.pow(ratio - avgRatio, 2), 0) / ratios.length;

    let consistency = 'poor';
    if (variance < 0.1) consistency = 'excellent';
    else if (variance < 0.3) consistency = 'good';
    else if (variance < 0.5) consistency = 'fair';

    return {
      base,
      ratio: Math.round(avgRatio * 100) / 100,
      scale: values,
      consistency,
      variance: Math.round(variance * 1000) / 1000
    };
  }

  findSpacingInconsistencies(spacing) {
    if (!spacing || spacing.length === 0) return [];

    const inconsistencies = [];
    const scale = this.analyzeSpacingScale(spacing);

    if (scale.base && scale.base % 4 !== 0 && scale.base % 8 !== 0) {
      inconsistencies.push({
        type: 'non-standard-base',
        message: `Base spacing ${scale.base}px doesn't follow 4px or 8px grid`,
        severity: 'medium'
      });
    }

    if (scale.consistency === 'poor') {
      inconsistencies.push({
        type: 'inconsistent-scale',
        message: 'Spacing values don\'t follow a consistent scale',
        severity: 'high'
      });
    }

    // Check for very close values that could be consolidated
    const values = scale.scale;
    for (let i = 1; i < values.length; i++) {
      const diff = values[i] - values[i - 1];
      if (diff < 2 && diff > 0) {
        inconsistencies.push({
          type: 'too-close-values',
          message: `Values ${values[i - 1]}px and ${values[i]}px are too close`,
          severity: 'low'
        });
      }
    }

    return inconsistencies;
  }

  generateSpacingRecommendations(spacing) {
    const recommendations = [];
    const scale = this.analyzeSpacingScale(spacing);
    const inconsistencies = this.findSpacingInconsistencies(spacing);

    if (!spacing || spacing.length === 0) {
      recommendations.push('Establish spacing scale based on 8px grid system');
      recommendations.push('Create tokens for common spacing values (4, 8, 16, 24, 32, 48, 64px)');
      return recommendations;
    }

    if (scale.base && scale.base !== 8 && scale.base !== 4) {
      recommendations.push('Consider using 8px base grid system for better consistency');
    }

    if (scale.consistency === 'poor') {
      recommendations.push('Establish consistent spacing scale with clear ratios');
    }

    if (inconsistencies.length > 0) {
      recommendations.push('Consolidate similar spacing values to reduce token count');
    }

    if (spacing.length < 6) {
      recommendations.push('Expand spacing scale to cover more use cases');
    } else if (spacing.length > 15) {
      recommendations.push('Reduce spacing tokens by consolidating similar values');
    }

    recommendations.push('Document spacing usage guidelines for different component types');

    return recommendations;
  }

  analyzeShadowElevations(shadows) {
    if (!shadows || shadows.length === 0) {
      return { levels: 0, elevations: [], consistency: 'no-data' };
    }

    // Extract shadow properties and group by elevation level
    const elevations = shadows.map(shadow => {
      const blur = shadow.blur || 0;
      const spread = shadow.spread || 0;
      const offsetY = Math.abs(shadow.offsetY || 0);
      
      // Calculate elevation level based on blur and offset
      const level = Math.max(blur, offsetY);
      
      return {
        level,
        blur,
        spread,
        offsetY,
        color: shadow.color
      };
    }).sort((a, b) => a.level - b.level);

    return {
      levels: elevations.length,
      elevations,
      consistency: elevations.length > 0 ? 'defined' : 'no-data'
    };
  }

  analyzeBorderRadiusScale(borderRadius) {
    if (!borderRadius || borderRadius.length === 0) {
      return { base: null, variants: [], scale: [] };
    }

    const values = borderRadius.map(token => {
      if (typeof token.value === 'string') {
        return parseFloat(token.value.replace(/[^\d.]/g, ''));
      }
      return parseFloat(token.value);
    }).filter(val => !isNaN(val) && val >= 0).sort((a, b) => a - b);

    const base = Math.min(...values.filter(v => v > 0)) || 0;
    
    return {
      base,
      variants: values,
      scale: values
    };
  }

  // Additional implemented methods
  generateAtomicLevelRecommendations(levelData, levelName) {
    const recommendations = [];
    
    if (!levelData || Object.keys(levelData).length === 0) {
      recommendations.push(`Define ${levelName} components for the design system`);
      return recommendations;
    }

    Object.keys(levelData).forEach(category => {
      const components = levelData[category];
      if (!components || components.length === 0) {
        recommendations.push(`Add ${category} components to ${levelName} level`);
      }
    });

    return recommendations;
  }

  assessCategoryMaturity(categoryData) {
    if (!categoryData) return 'undefined';
    
    const componentCount = Object.values(categoryData).reduce((sum, components) => {
      return sum + (Array.isArray(components) ? components.length : 0);
    }, 0);

    if (componentCount === 0) return 'undefined';
    if (componentCount < 3) return 'emerging';
    if (componentCount < 8) return 'developing';
    if (componentCount < 15) return 'mature';
    return 'comprehensive';
  }

  generateTechnicalRecommendations(technicalData) {
    const recommendations = [];
    
    if (technicalData.layout && technicalData.layout.analysis) {
      if (technicalData.layout.analysis.flexboxUsage < 0.5) {
        recommendations.push('Increase use of Flexbox for better responsive layouts');
      }
      if (technicalData.layout.analysis.gridUsage < 0.3) {
        recommendations.push('Consider CSS Grid for complex layout patterns');
      }
    }

    recommendations.push('Implement consistent responsive breakpoints');
    recommendations.push('Establish CSS custom properties for design tokens');
    recommendations.push('Use semantic HTML elements for better accessibility');

    return recommendations;
  }

  analyzeResponsiveness(componentData) {
    // Analyze responsive patterns in components
    let responsiveScore = 60; // Default score
    const recommendations = [];

    if (componentData && componentData.length > 0) {
      const responsiveComponents = componentData.filter(comp => 
        comp.styles && (comp.styles.includes('responsive') || comp.styles.includes('mobile'))
      );
      
      responsiveScore = Math.min(100, (responsiveComponents.length / componentData.length) * 100);
    }

    if (responsiveScore < 70) {
      recommendations.push('Implement responsive design patterns');
      recommendations.push('Add mobile-first CSS approach');
    }

    return { score: Math.round(responsiveScore), recommendations };
  }

  identifyDesignSystemGaps(categorizedData) {
    const gaps = [];
    
    // Check for missing design tokens
    if (!categorizedData.designTokens.colors.length) {
      gaps.push({ type: 'design-tokens', category: 'colors', severity: 'high' });
    }
    if (!categorizedData.designTokens.typography.length) {
      gaps.push({ type: 'design-tokens', category: 'typography', severity: 'high' });
    }
    if (!categorizedData.designTokens.spacing.length) {
      gaps.push({ type: 'design-tokens', category: 'spacing', severity: 'medium' });
    }

    return gaps;
  }

  identifyImplementationGaps(figmaData, webData) {
    const gaps = [];
    
    // Compare Figma components with web implementation
    if (figmaData && webData) {
      const figmaComponents = figmaData.components || [];
      const webComponents = webData.elements || [];
      
      if (figmaComponents.length > webComponents.length) {
        gaps.push({
          type: 'missing-implementation',
          count: figmaComponents.length - webComponents.length,
          severity: 'medium'
        });
      }
    }

    return gaps;
  }

  identifyConsistencyIssues(categorizedData) {
    const issues = [];
    
    // Check color consistency
    const colorAnalysis = this.analyzeColorConsistency(categorizedData.designTokens.colors);
    if (colorAnalysis.score < 70) {
      issues.push({ type: 'color-consistency', score: colorAnalysis.score, issues: colorAnalysis.issues });
    }

    return issues;
  }

  identifyQuickWins(categorizedData) {
    const quickWins = [];
    
    // Easy improvements that can be made quickly
    if (categorizedData.designTokens.colors.length > 50) {
      quickWins.push('Consolidate similar color tokens');
    }
    
    if (categorizedData.designTokens.spacing.length < 5) {
      quickWins.push('Add basic spacing scale (8, 16, 24, 32px)');
    }

    return quickWins;
  }

  generateStrategicRecommendations(categorizedData) {
    const recommendations = [];
    
    // High-level strategic recommendations
    recommendations.push('Establish design system governance and maintenance process');
    recommendations.push('Create component documentation and usage guidelines');
    recommendations.push('Implement design token automation pipeline');
    recommendations.push('Set up regular design-development sync meetings');

    return recommendations;
  }

  generateActionPlan(categorizedData) {
    return {
      immediate: this.identifyQuickWins(categorizedData),
      shortTerm: ['Standardize spacing scale', 'Consolidate color palette'],
      longTerm: ['Implement comprehensive component library', 'Establish design ops workflow']
    };
  }

  generateCrossReference(categorizedData) {
    const crossRef = {};
    
    // Create cross-references between Figma and Web components
    if (categorizedData.figma && categorizedData.web) {
      crossRef.componentMapping = {};
      crossRef.unmatchedFigma = [];
      crossRef.unmatchedWeb = [];
    }

    return crossRef;
  }

  generateHighLevelRecommendations(categorizedData) {
    const recommendations = [];
    
    const coverage = this.calculateCoverage(categorizedData);
    
    if (coverage.implementationCoverage < 70) {
      recommendations.push('Prioritize implementing missing Figma components');
    }
    
    if (coverage.designCoverage < 70) {
      recommendations.push('Update Figma designs to match web implementation');
    }

    recommendations.push('Establish regular design-development review process');
    recommendations.push('Create shared component library documentation');

    return recommendations;
  }
}

export default CategorizedReportGenerator; 