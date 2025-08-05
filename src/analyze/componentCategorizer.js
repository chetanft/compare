/**
 * Advanced Component Categorization System
 * Uses fixed schema to ensure consistent reporting structure
 */

import { getFixedCategorySchema, generateFixedNavigation } from './fixedCategorySchema.js';

export class ComponentCategorizer {
  constructor() {
    // Use fixed schema instead of dynamic categories
    this.fixedSchema = getFixedCategorySchema();
    
    this.thresholds = {
      // Size thresholds for categorization
      small: { width: 50, height: 50 },
      medium: { width: 200, height: 100 },
      large: { width: 500, height: 300 },
      
      // Color similarity threshold
      colorSimilarity: 20,
      
      // Typography similarity
      fontSizeSimilarity: 2,
      
      // Spacing patterns
      spacingTolerance: 4
    };
  }

  /**
   * Categorize all components using fixed schema
   * @param {Object} figmaData - Figma components data
   * @param {Object} webData - Web components data
   * @returns {Object} Categorized components with fixed structure
   */
  categorizeComponents(figmaData, webData) {
    
    // Start with fresh fixed schema
    const categorizedData = getFixedCategorySchema();
    
    // Extract design tokens first (they inform other categorizations)
    const designTokens = this.extractDesignTokens(figmaData, webData);
    
    // Fill the fixed schema with actual data
    this.populateFixedSchema(categorizedData, figmaData.components, webData.elements || [], designTokens);
    
    // Generate summary statistics
    const summary = this.generateSummary(categorizedData);
    
    
    return {
      schema: categorizedData,
      designTokens,
      summary,
      navigation: generateFixedNavigation(),
      categorizedAt: new Date().toISOString(),
      metadata: {
        approach: 'fixed-schema',
        totalCategories: this.countCategories(categorizedData),
        emptyCategories: this.countEmptyCategories(categorizedData)
      }
    };
  }

  /**
   * Populate the fixed schema with actual component data
   * @param {Object} schema - Fixed category schema
   * @param {Array} figmaComponents - Figma components
   * @param {Array} webElements - Web elements
   * @param {Object} designTokens - Extracted design tokens
   */
  populateFixedSchema(schema, figmaComponents, webElements, designTokens) {

    // Populate design tokens
    this.populateDesignTokens(schema.designTokens, designTokens);

    // Populate atomic design categories
    this.populateAtomicDesign(schema, figmaComponents, webElements);

    // Populate layout categories
    this.populateLayoutCategories(schema.layout, figmaComponents, webElements);

  }

  /**
   * Populate design tokens in fixed schema
   */
  populateDesignTokens(tokenSchema, extractedTokens) {
    // Colors
    tokenSchema.colors.analysis.total = extractedTokens.colors.length;
    tokenSchema.colors.analysis.mostUsed = extractedTokens.colors.slice(0, 10);
    tokenSchema.colors.figmaColumn = extractedTokens.colors.filter(t => 
      t.sources.some(s => s.source === 'figma')
    );
    tokenSchema.colors.webColumn = extractedTokens.colors.filter(t => 
      t.sources.some(s => s.source === 'web')
    );

    // Typography
    tokenSchema.typography.analysis.total = extractedTokens.typography.length;
    tokenSchema.typography.analysis.fontFamilies = this.extractFontFamilies(extractedTokens.typography);
    tokenSchema.typography.analysis.fontSizes = this.extractFontSizes(extractedTokens.typography);
    tokenSchema.typography.figmaColumn = extractedTokens.typography.filter(t => 
      t.sources.some(s => s.source === 'figma')
    );
    tokenSchema.typography.webColumn = extractedTokens.typography.filter(t => 
      t.sources.some(s => s.source === 'web')
    );

    // Spacing
    tokenSchema.spacing.analysis.total = extractedTokens.spacing.length;
    tokenSchema.spacing.analysis.mostUsed = extractedTokens.spacing.slice(0, 15);
    tokenSchema.spacing.figmaColumn = extractedTokens.spacing.filter(t => 
      t.sources.some(s => s.source === 'figma')
    );
    tokenSchema.spacing.webColumn = extractedTokens.spacing.filter(t => 
      t.sources.some(s => s.source === 'web')
    );

    // Shadows
    tokenSchema.shadows.analysis.total = extractedTokens.shadows.length;
    tokenSchema.shadows.analysis.mostUsed = extractedTokens.shadows.slice(0, 5);
    tokenSchema.shadows.figmaColumn = extractedTokens.shadows.filter(t => 
      t.sources.some(s => s.source === 'figma')
    );
    tokenSchema.shadows.webColumn = extractedTokens.shadows.filter(t => 
      t.sources.some(s => s.source === 'web')
    );

    // Border Radius
    tokenSchema.borderRadius.analysis.total = extractedTokens.borderRadius.length;
    tokenSchema.borderRadius.analysis.mostUsed = extractedTokens.borderRadius.slice(0, 8);
    tokenSchema.borderRadius.figmaColumn = extractedTokens.borderRadius.filter(t => 
      t.sources.some(s => s.source === 'figma')
    );
    tokenSchema.borderRadius.webColumn = extractedTokens.borderRadius.filter(t => 
      t.sources.some(s => s.source === 'web')
    );
  }

  /**
   * Populate atomic design categories in fixed schema
   */
  populateAtomicDesign(schema, figmaComponents, webElements) {
    // Process Figma components
    figmaComponents.forEach(component => {
      const categories = this.classifyFigmaComponent(component);
      
      categories.forEach(categoryPath => {
        const [level, subcategory] = categoryPath.split('.');
        
        if (schema[level] && schema[level][subcategory]) {
          schema[level][subcategory].figmaColumn.push({
            ...component,
            classification: this.getComponentClassification(component)
          });
        }
      });
    });

    // Process Web components
    webElements.forEach(component => {
      const categories = this.classifyWebComponent(component);
      
      categories.forEach(categoryPath => {
        const [level, subcategory] = categoryPath.split('.');
        
        if (schema[level] && schema[level][subcategory]) {
          schema[level][subcategory].webColumn.push({
            ...component,
            classification: this.getWebComponentClassification(component)
          });
        }
      });
    });
  }

  /**
   * Populate layout categories in fixed schema
   */
  populateLayoutCategories(layoutSchema, figmaComponents, webElements) {
    // Process Figma layout components
    figmaComponents.forEach(component => {
      if (component.properties?.layout) {
        const layoutType = this.getLayoutType(component.properties.layout);
        if (layoutSchema[layoutType]) {
          layoutSchema[layoutType].figmaColumn.push(component);
        }
      }
    });

    // Process Web layout components
    webElements.forEach(component => {
      const layoutType = this.getWebLayoutType(component);
      if (layoutSchema[layoutType]) {
        layoutSchema[layoutType].webColumn.push(component);
      }
    });
  }

  /**
   * Extract design tokens with source tracking
   */
  extractDesignTokens(figmaData, webData) {
    
    const tokens = {
      colors: new Map(),
      typography: new Map(),
      spacing: new Map(),
      shadows: new Map(),
      borderRadius: new Map()
    };

    // Extract from Figma components
    figmaData.components.forEach(component => {
      this.extractFigmaTokens(component, tokens);
    });

    // Extract from web components
    (webData.elements || []).forEach(component => {
      this.extractWebTokens(component, tokens);
    });

    // Convert Maps to sorted arrays
    const sortedTokens = {
      colors: this.sortTokensByUsage(tokens.colors),
      typography: this.sortTokensByUsage(tokens.typography),
      spacing: this.sortTokensByUsage(tokens.spacing),
      shadows: this.sortTokensByUsage(tokens.shadows),
      borderRadius: this.sortTokensByUsage(tokens.borderRadius)
    };

      colors: sortedTokens.colors.length,
      typography: sortedTokens.typography.length,
      spacing: sortedTokens.spacing.length,
      shadows: sortedTokens.shadows.length,
      borderRadius: sortedTokens.borderRadius.length
    });

    return sortedTokens;
  }

  /**
   * Extract tokens from Figma component
   */
  extractFigmaTokens(component, tokens) {
    // Extract colors
    if (component.properties?.color) {
      this.addToTokenMap(tokens.colors, component.properties.color, {
        source: 'figma',
        component: component.name,
        type: 'text'
      });
    }
    
    if (component.properties?.backgroundColor) {
      this.addToTokenMap(tokens.colors, component.properties.backgroundColor, {
        source: 'figma',
        component: component.name,
        type: 'background'
      });
    }

    // Extract typography
    if (component.properties?.typography) {
      const typo = component.properties.typography;
      const fontKey = `${typo.fontFamily}-${typo.fontSize}-${typo.fontWeight}`;
      this.addToTokenMap(tokens.typography, fontKey, {
        source: 'figma',
        component: component.name,
        ...typo
      });
    }

    // Extract spacing
    if (component.properties?.spacing) {
      Object.entries(component.properties.spacing).forEach(([prop, value]) => {
        this.addToTokenMap(tokens.spacing, value, {
          source: 'figma',
          component: component.name,
          property: prop
        });
      });
    }

    // Extract border radius
    if (component.properties?.borderRadius) {
      this.addToTokenMap(tokens.borderRadius, component.properties.borderRadius, {
        source: 'figma',
        component: component.name
      });
    }

    // Extract shadows
    if (component.properties?.shadows) {
      component.properties.shadows.forEach(shadow => {
        const shadowKey = `${shadow.radius}-${shadow.offset?.x || 0}-${shadow.offset?.y || 0}`;
        this.addToTokenMap(tokens.shadows, shadowKey, {
          source: 'figma',
          component: component.name,
          ...shadow
        });
      });
    }
  }

  /**
   * Extract tokens from web component
   */
  extractWebTokens(component, tokens) {
    // Extract colors
    if (component.styles?.color) {
      this.addToTokenMap(tokens.colors, component.styles.color, {
        source: 'web',
        component: component.selector,
        type: 'text'
      });
    }
    
    if (component.styles?.backgroundColor && component.styles.backgroundColor !== 'rgba(0, 0, 0, 0)') {
      this.addToTokenMap(tokens.colors, component.styles.backgroundColor, {
        source: 'web',
        component: component.selector,
        type: 'background'
      });
    }

    // Extract typography
    if (component.styles?.fontSize && component.styles?.fontFamily) {
      const fontKey = `${component.styles.fontFamily}-${component.styles.fontSize}-${component.styles.fontWeight}`;
      this.addToTokenMap(tokens.typography, fontKey, {
        source: 'web',
        component: component.selector,
        fontFamily: component.styles.fontFamily,
        fontSize: component.styles.fontSize,
        fontWeight: component.styles.fontWeight
      });
    }

    // Extract spacing
    ['marginTop', 'marginRight', 'marginBottom', 'marginLeft', 
     'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'].forEach(prop => {
      if (component.styles?.[prop] && parseFloat(component.styles[prop]) > 0) {
        this.addToTokenMap(tokens.spacing, component.styles[prop], {
          source: 'web',
          component: component.selector,
          property: prop
        });
      }
    });

    // Extract border radius
    if (component.styles?.borderRadius && component.styles.borderRadius !== '0px') {
      this.addToTokenMap(tokens.borderRadius, component.styles.borderRadius, {
        source: 'web',
        component: component.selector
      });
    }

    // Extract shadows
    if (component.styles?.boxShadow && component.styles.boxShadow !== 'none') {
      this.addToTokenMap(tokens.shadows, component.styles.boxShadow, {
        source: 'web',
        component: component.selector,
        value: component.styles.boxShadow
      });
    }
  }

  /**
   * Classify Figma component into fixed categories
   */
  classifyFigmaComponent(component) {
    const categories = [];
    const name = component.name?.toLowerCase() || '';
    const type = component.type?.toLowerCase() || '';
    
    // Atomic design classification based on fixed schema
    if (this.isAtom(component)) {
      if (type === 'text' || name.includes('text') || name.includes('label')) {
        categories.push('atoms.typography');
      } else if (name.includes('button') || name.includes('btn')) {
        categories.push('atoms.buttons');
      } else if (name.includes('icon') || type === 'vector') {
        categories.push('atoms.icons');
      } else if (name.includes('input') || name.includes('field')) {
        categories.push('atoms.inputs');
      } else if (name.includes('badge') || name.includes('tag')) {
        categories.push('atoms.badges');
      } else if (name.includes('divider') || name.includes('line')) {
        categories.push('atoms.dividers');
      } else if (name.includes('loader') || name.includes('spinner')) {
        categories.push('atoms.loaders');
      } else {
        categories.push('atoms.typography'); // Default for simple elements
      }
    }
    
    // Molecule classification
    else if (this.isMolecule(component)) {
      if (name.includes('card') || name.includes('panel')) {
        categories.push('molecules.cards');
      } else if (name.includes('nav') || name.includes('menu')) {
        categories.push('molecules.navigation');
      } else if (name.includes('form') && !name.includes('button')) {
        categories.push('molecules.formGroups');
      } else if (name.includes('search')) {
        categories.push('molecules.searchBoxes');
      } else if (name.includes('tab')) {
        categories.push('molecules.tabs');
      } else if (name.includes('dropdown') || name.includes('select')) {
        categories.push('molecules.dropdowns');
      } else if (name.includes('modal') || name.includes('dialog')) {
        categories.push('molecules.modals');
      } else if (name.includes('pagination')) {
        categories.push('molecules.pagination');
      } else if (name.includes('accordion')) {
        categories.push('molecules.accordions');
      } else {
        categories.push('molecules.cards'); // Default for complex elements
      }
    }
    
    // Organism classification
    else if (this.isOrganism(component)) {
      if (name.includes('header') || name.includes('navbar')) {
        categories.push('organisms.headers');
      } else if (name.includes('footer')) {
        categories.push('organisms.footers');
      } else if (name.includes('sidebar') || name.includes('aside')) {
        categories.push('organisms.sidebars');
      } else if (name.includes('table') || name.includes('list')) {
        categories.push('organisms.tables');
      } else if (name.includes('form')) {
        categories.push('organisms.forms');
      } else if (name.includes('gallery') || name.includes('carousel')) {
        categories.push('organisms.galleries');
      } else if (name.includes('dashboard')) {
        categories.push('organisms.dashboards');
      } else if (name.includes('article') || name.includes('content')) {
        categories.push('organisms.articles');
      } else {
        categories.push('organisms.dashboards'); // Default for large components
      }
    }

    return categories.length > 0 ? categories : ['atoms.typography']; // Default category
  }

  /**
   * Classify web component into fixed categories
   */
  classifyWebComponent(component) {
    const categories = [];
    const tagName = component.tagName?.toLowerCase() || '';
    const type = component.type?.toLowerCase() || '';
    const selector = component.selector?.toLowerCase() || '';
    
    // Atomic design classification based on web semantics
    if (this.isWebAtom(component)) {
      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'label'].includes(tagName)) {
        categories.push('atoms.typography');
      } else if (tagName === 'button' || type === 'button' || selector.includes('btn')) {
        categories.push('atoms.buttons');
      } else if (['input', 'select', 'textarea'].includes(tagName)) {
        categories.push('atoms.inputs');
      } else if (tagName === 'img' || tagName === 'svg') {
        categories.push('atoms.icons');
      } else if (tagName === 'hr' || selector.includes('divider')) {
        categories.push('atoms.dividers');
      } else if (selector.includes('badge') || selector.includes('tag')) {
        categories.push('atoms.badges');
      } else if (selector.includes('loader') || selector.includes('spinner')) {
        categories.push('atoms.loaders');
      } else {
        categories.push('atoms.typography');
      }
    }
    
    // Molecule classification
    else if (this.isWebMolecule(component)) {
      if (type === 'card' || selector.includes('card')) {
        categories.push('molecules.cards');
      } else if (type === 'navigation' || selector.includes('nav')) {
        categories.push('molecules.navigation');
      } else if (type === 'form' || selector.includes('form')) {
        categories.push('molecules.formGroups');
      } else if (selector.includes('search')) {
        categories.push('molecules.searchBoxes');
      } else if (selector.includes('tab')) {
        categories.push('molecules.tabs');
      } else if (type === 'modal' || selector.includes('modal')) {
        categories.push('molecules.modals');
      } else if (selector.includes('dropdown')) {
        categories.push('molecules.dropdowns');
      } else if (selector.includes('pagination')) {
        categories.push('molecules.pagination');
      } else if (selector.includes('accordion')) {
        categories.push('molecules.accordions');
      } else {
        categories.push('molecules.cards');
      }
    }

    // Organism classification
    else if (this.isWebOrganism(component)) {
      if (tagName === 'header' || selector.includes('header')) {
        categories.push('organisms.headers');
      } else if (tagName === 'footer' || selector.includes('footer')) {
        categories.push('organisms.footers');
      } else if (selector.includes('sidebar')) {
        categories.push('organisms.sidebars');
      } else if (tagName === 'form' || selector.includes('form')) {
        categories.push('organisms.forms');
      } else if (tagName === 'table' || selector.includes('table')) {
        categories.push('organisms.tables');
      } else if (selector.includes('gallery') || selector.includes('carousel')) {
        categories.push('organisms.galleries');
      } else if (selector.includes('dashboard')) {
        categories.push('organisms.dashboards');
      } else if (tagName === 'article' || selector.includes('article')) {
        categories.push('organisms.articles');
      } else {
        categories.push('organisms.articles');
      }
    }

    return categories.length > 0 ? categories : ['atoms.typography']; // Default category
  }

  // Helper methods
  isAtom(component) {
    return !component.children || component.children.length === 0;
  }

  isMolecule(component) {
    return component.children && component.children.length > 0 && component.children.length <= 5;
  }

  isOrganism(component) {
    return component.children && component.children.length > 5;
  }

  isWebAtom(component) {
    return component.childCount === 0 || component.childCount <= 1;
  }

  isWebMolecule(component) {
    return component.childCount > 1 && component.childCount <= 10;
  }

  isWebOrganism(component) {
    return component.childCount > 10;
  }

  getLayoutType(layout) {
    if (layout.mode === 'FLEX') return 'flexbox';
    return 'containers';
  }

  getWebLayoutType(component) {
    const display = component.detailedStyles?.layout?.display;
    if (display === 'flex') return 'flexbox';
    if (display === 'grid') return 'grids';
    if (['absolute', 'fixed', 'sticky'].includes(component.detailedStyles?.layout?.position)) return 'positioning';
    return 'containers';
  }

  // Utility methods
  addToTokenMap(map, key, data) {
    if (!map.has(key)) {
      map.set(key, { value: key, usage: 0, sources: [] });
    }
    const existing = map.get(key);
    existing.usage++;
    existing.sources.push(data);
  }

  sortTokensByUsage(tokenMap) {
    return Array.from(tokenMap.values())
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 50); // Top 50 most used tokens
  }

  getComponentClassification(component) {
    return {
      complexity: this.getComplexity(component),
      hasInteraction: this.hasInteraction(component),
      hasLayout: !!component.properties?.layout,
      hasSpacing: !!component.properties?.spacing,
      hasColors: !!(component.properties?.color || component.properties?.backgroundColor)
    };
  }

  getWebComponentClassification(component) {
    return {
      complexity: this.getWebComplexity(component),
      hasInteraction: ['button', 'a', 'input', 'select', 'textarea'].includes(component.tagName),
      hasLayout: ['flex', 'grid'].includes(component.detailedStyles?.layout?.display),
      hasSpacing: this.hasSignificantSpacing(component.detailedStyles?.spacing, 'margin') || 
                  this.hasSignificantSpacing(component.detailedStyles?.spacing, 'padding'),
      hasColors: !!(component.styles?.color || component.styles?.backgroundColor)
    };
  }

  getComplexity(component) {
    const childCount = component.children?.length || 0;
    const propertyCount = Object.keys(component.properties || {}).length;
    
    if (childCount === 0 && propertyCount <= 2) return 'simple';
    if (childCount <= 3 && propertyCount <= 5) return 'medium';
    return 'complex';
  }

  getWebComplexity(component) {
    const childCount = component.childCount || 0;
    const styleCount = Object.keys(component.detailedStyles || {}).length;
    
    if (childCount === 0 && styleCount <= 3) return 'simple';
    if (childCount <= 5 && styleCount <= 6) return 'medium';
    return 'complex';
  }

  hasInteraction(component) {
    const name = component.name?.toLowerCase() || '';
    return name.includes('button') || name.includes('click') || name.includes('hover');
  }

  hasSignificantSpacing(spacing, type) {
    if (!spacing) return false;
    
    const properties = type === 'margin' 
      ? ['marginTop', 'marginRight', 'marginBottom', 'marginLeft']
      : ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'];
    
    return properties.some(prop => {
      const value = parseFloat(spacing[prop] || '0');
      return value > 4; // More than 4px is considered significant
    });
  }

  extractFontFamilies(typography) {
    const families = new Set();
    typography.forEach(token => {
      token.sources.forEach(source => {
        if (source.fontFamily) families.add(source.fontFamily);
      });
    });
    return Array.from(families);
  }

  extractFontSizes(typography) {
    const sizes = new Set();
    typography.forEach(token => {
      token.sources.forEach(source => {
        if (source.fontSize) sizes.add(source.fontSize);
      });
    });
    return Array.from(sizes).sort((a, b) => parseFloat(a) - parseFloat(b));
  }

  generateSummary(categorizedData) {
    return {
      figma: {
        totalComponents: this.countFigmaComponents(categorizedData),
        atoms: this.countFigmaInLevel(categorizedData.atoms),
        molecules: this.countFigmaInLevel(categorizedData.molecules),
        organisms: this.countFigmaInLevel(categorizedData.organisms)
      },
      web: {
        totalComponents: this.countWebComponents(categorizedData),
        atoms: this.countWebInLevel(categorizedData.atoms),
        molecules: this.countWebInLevel(categorizedData.molecules),
        organisms: this.countWebInLevel(categorizedData.organisms)
      }
    };
  }

  countFigmaComponents(schema) {
    let count = 0;
    Object.values(schema).forEach(category => {
      if (typeof category === 'object') {
        Object.values(category).forEach(subcategory => {
          if (subcategory.figmaColumn) {
            count += subcategory.figmaColumn.length;
          }
        });
      }
    });
    return count;
  }

  countWebComponents(schema) {
    let count = 0;
    Object.values(schema).forEach(category => {
      if (typeof category === 'object') {
        Object.values(category).forEach(subcategory => {
          if (subcategory.webColumn) {
            count += subcategory.webColumn.length;
          }
        });
      }
    });
    return count;
  }

  countFigmaInLevel(level) {
    return Object.values(level).reduce((sum, subcategory) => {
      return sum + (subcategory.figmaColumn?.length || 0);
    }, 0);
  }

  countWebInLevel(level) {
    return Object.values(level).reduce((sum, subcategory) => {
      return sum + (subcategory.webColumn?.length || 0);
    }, 0);
  }

  countCategories(schema) {
    let count = 0;
    Object.values(schema).forEach(category => {
      if (typeof category === 'object') {
        count += Object.keys(category).length;
      }
    });
    return count;
  }

  countEmptyCategories(schema) {
    let count = 0;
    Object.values(schema).forEach(category => {
      if (typeof category === 'object') {
        Object.values(category).forEach(subcategory => {
          if (subcategory.figmaColumn?.length === 0 && subcategory.webColumn?.length === 0) {
            count++;
          }
        });
      }
    });
    return count;
  }
}

export default ComponentCategorizer; 