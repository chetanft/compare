import FigmaMCPIntegration from './mcpIntegration.js';

/**
 * Enhanced Figma Extractor
 * Recursively extracts ALL child components from Figma frames
 * Goal: Get 10-20+ individual components (buttons, text, icons, etc.)
 */
class EnhancedFigmaExtractor {
  constructor(config) {
    this.config = config || {};
    this.mcpIntegration = FigmaMCPIntegration.createIntegration(config);
  }

  async initialize() {
    try {
      await this.mcpIntegration.initialize();
      console.log('✅ Enhanced Figma Extractor initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Enhanced Figma Extractor:', error);
      throw error;
    }
  }

  /**
   * Extract design data with ALL child components flattened
   * @param {string} fileId - Figma file ID
   * @param {string} nodeId - Optional specific node ID
   * @returns {Object} Design data with flattened components
   */
  async extractDesignData(fileId, nodeId = null) {
    try {
      console.log(`🎨 Extracting Figma design data: ${fileId}${nodeId ? ` (node: ${nodeId})` : ''}`);

      // Get Figma data using available MCP tools
      const figmaData = await this.getFigmaDataViaMCP(fileId, nodeId);
      
      if (!figmaData) {
        throw new Error('Failed to fetch Figma data');
      }

      // Process and flatten all components
      const components = await this.processAndFlattenComponents(figmaData, fileId, nodeId);

      console.log(`✅ Extracted ${components.length} individual components from Figma`);

      return {
        fileId,
        fileName: figmaData.name || 'Unknown',
        nodeId,
        extractedAt: new Date().toISOString(),
        components,
        summary: {
          totalComponents: components.length,
          componentTypes: this.getComponentTypeSummary(components),
          hasColors: components.some(c => c.properties.colors && Object.keys(c.properties.colors).length > 0),
          hasTypography: components.some(c => c.properties.typography && Object.keys(c.properties.typography).length > 0)
        }
      };

    } catch (error) {
      console.error('❌ Error extracting Figma design data:', error);
      throw error;
    }
  }

  /**
   * Get Figma data using MCP integration
   */
  async getFigmaDataViaMCP(fileId, nodeId = null) {
    try {
      console.log('🔧 Using MCP integration to fetch Figma data');
      
      // Use the same approach as the original extractor with maximum depth
      const figmaData = await this.mcpIntegration.getFigmaData(fileId, nodeId, 10); // depth 10 for deep component extraction
      
      if (!figmaData) {
        throw new Error('Failed to fetch Figma data via MCP integration');
      }
      
      return figmaData;
      
    } catch (error) {
      console.error('❌ Error fetching Figma data via MCP:', error);
      throw error;
    }
  }

  /**
   * Process Figma data and recursively flatten ALL child components
   */
  async processAndFlattenComponents(figmaData, fileId, nodeId) {
    const allComponents = [];

    if (nodeId && figmaData.nodes && figmaData.nodes[nodeId]) {
      // Extract specific node and all its children
      const targetNode = figmaData.nodes[nodeId];
      const rootNode = targetNode.document || targetNode;
      
      console.log(`📋 Processing specific node: ${rootNode.name} (${rootNode.type})`);
      await this.recursivelyExtractComponents(rootNode, allComponents, 0, fileId);
      
    } else if (figmaData.document) {
      // Extract from entire document
      console.log(`📋 Processing entire document: ${figmaData.document.name}`);
      await this.recursivelyExtractComponents(figmaData.document, allComponents, 0, fileId);
      
    } else {
      throw new Error('No valid Figma data structure found');
    }

    // Filter out container-only components and keep meaningful UI elements
    const meaningfulComponents = allComponents.filter(component => 
      this.isMeaningfulUIComponent(component)
    );

    console.log(`🔍 Filtered ${allComponents.length} total nodes → ${meaningfulComponents.length} meaningful UI components`);
    
    return meaningfulComponents;
  }

  /**
   * Recursively extract components from Figma node tree
   */
  async recursivelyExtractComponents(node, components, depth = 0, fileId, parentPath = '') {
    if (depth > 15) {
      console.warn(`⚠️ Max depth reached for node: ${node.name}`);
      return;
    }

    // Process current node
    const component = await this.processNode(node, depth, parentPath, fileId);
    if (component) {
      components.push(component);
    }

    // Recursively process children
    if (node.children && node.children.length > 0) {
      const currentPath = parentPath ? `${parentPath} > ${node.name}` : node.name;
      
      for (const child of node.children) {
        await this.recursivelyExtractComponents(
          child, 
          components, 
          depth + 1, 
          fileId, 
          currentPath
        );
      }
    }
  }

  /**
   * Process individual Figma node into component data
   */
  async processNode(node, depth, parentPath, fileId) {
    try {
      const component = {
        id: node.id,
        name: node.name,
        type: node.type,
        depth,
        parentPath,
        fileId,
        properties: {
          colors: {},
          typography: {},
          layout: {},
          effects: {}
        },
        metadata: {
          visible: node.visible !== false,
          locked: node.locked || false,
          hasChildren: !!(node.children && node.children.length > 0),
          childrenCount: node.children ? node.children.length : 0
        }
      };

      // Extract colors
      await this.extractColors(node, component.properties.colors);
      
      // Extract typography
      await this.extractTypography(node, component.properties.typography);
      
      // Extract layout properties
      await this.extractLayout(node, component.properties.layout);
      
      // Extract effects
      await this.extractEffects(node, component.properties.effects);

      return component;

    } catch (error) {
      console.warn(`⚠️ Failed to process node ${node.name}:`, error.message);
      return null;
    }
  }

  /**
   * Extract color properties from node
   */
  async extractColors(node, colors) {
    // Background color
    if (node.backgroundColor && this.isValidColor(node.backgroundColor)) {
      if (!this.isDefaultFigmaColor(node.backgroundColor)) {
        colors.backgroundColor = this.rgbaToHex(node.backgroundColor);
      }
    }

    // Fill colors
    if (node.fills && node.fills.length > 0) {
      const validFills = node.fills.filter(fill => 
        fill.type === 'SOLID' && 
        fill.visible !== false && 
        fill.color && 
        this.isValidColor(fill.color)
      );

      if (validFills.length > 0) {
        colors.fills = validFills.map(fill => ({
          type: fill.type,
          color: this.rgbaToHex(fill.color),
          opacity: fill.opacity || 1
        }));
        
        // Set primary fill as main color
        if (validFills[0]) {
          colors.color = this.rgbaToHex(validFills[0].color);
        }
      }
    }

    // Stroke colors
    if (node.strokes && node.strokes.length > 0) {
      const validStrokes = node.strokes.filter(stroke => 
        stroke.color && this.isValidColor(stroke.color)
      );

      if (validStrokes.length > 0) {
        colors.strokes = validStrokes.map(stroke => ({
          color: this.rgbaToHex(stroke.color),
          weight: node.strokeWeight || 1
        }));
        
        colors.borderColor = this.rgbaToHex(validStrokes[0].color);
      }
    }
  }

  /**
   * Extract typography properties from node
   */
  async extractTypography(node, typography) {
    // Text content
    if (node.characters) {
      typography.text = node.characters.substring(0, 200); // Limit text length
    }

    // Style properties
    if (node.style) {
      if (node.style.fontFamily) typography.fontFamily = node.style.fontFamily;
      if (node.style.fontSize) typography.fontSize = node.style.fontSize;
      if (node.style.fontWeight) typography.fontWeight = node.style.fontWeight;
      if (node.style.letterSpacing) typography.letterSpacing = node.style.letterSpacing;
      if (node.style.lineHeightPx) typography.lineHeight = node.style.lineHeightPx;
      if (node.style.lineHeightPercent) typography.lineHeightPercent = node.style.lineHeightPercent;
      if (node.style.textAlignHorizontal) typography.textAlign = node.style.textAlignHorizontal;
      if (node.style.textAlignVertical) typography.verticalAlign = node.style.textAlignVertical;
      if (node.style.textDecoration) typography.textDecoration = node.style.textDecoration;
      if (node.style.textCase) typography.textTransform = node.style.textCase;
    }
  }

  /**
   * Extract layout properties from node
   */
  async extractLayout(node, layout) {
    // Dimensions
    if (node.absoluteBoundingBox) {
      layout.dimensions = {
        width: node.absoluteBoundingBox.width,
        height: node.absoluteBoundingBox.height,
        x: node.absoluteBoundingBox.x,
        y: node.absoluteBoundingBox.y
      };
    }

    // Constraints
    if (node.constraints) {
      layout.constraints = node.constraints;
    }

    // Layout properties
    if (node.layoutMode) layout.layoutMode = node.layoutMode; // AUTO_LAYOUT
    if (node.primaryAxisSizingMode) layout.primaryAxisSizing = node.primaryAxisSizingMode;
    if (node.counterAxisSizingMode) layout.counterAxisSizing = node.counterAxisSizingMode;
    if (node.primaryAxisAlignItems) layout.justifyContent = node.primaryAxisAlignItems;
    if (node.counterAxisAlignItems) layout.alignItems = node.counterAxisAlignItems;
    if (node.itemSpacing) layout.gap = node.itemSpacing;

    // Padding
    if (node.paddingTop !== undefined) layout.paddingTop = node.paddingTop;
    if (node.paddingRight !== undefined) layout.paddingRight = node.paddingRight;
    if (node.paddingBottom !== undefined) layout.paddingBottom = node.paddingBottom;
    if (node.paddingLeft !== undefined) layout.paddingLeft = node.paddingLeft;
  }

  /**
   * Extract effects (shadows, blur, etc.)
   */
  async extractEffects(node, effects) {
    if (node.effects && node.effects.length > 0) {
      const validEffects = node.effects.filter(effect => effect.visible !== false);
      
      if (validEffects.length > 0) {
        effects.shadows = validEffects
          .filter(effect => effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW')
          .map(effect => ({
            type: effect.type,
            color: effect.color ? this.rgbaToHex(effect.color) : null,
            offset: effect.offset,
            radius: effect.radius,
            spread: effect.spread || 0
          }));

        effects.blur = validEffects
          .filter(effect => effect.type === 'LAYER_BLUR')
          .map(effect => ({
            type: effect.type,
            radius: effect.radius
          }));
      }
    }

    // Border radius
    if (node.cornerRadius !== undefined) {
      effects.borderRadius = node.cornerRadius;
    }

    // Individual corner radius
    if (node.rectangleCornerRadii) {
      effects.borderRadius = {
        topLeft: node.rectangleCornerRadii[0],
        topRight: node.rectangleCornerRadii[1],
        bottomRight: node.rectangleCornerRadii[2],
        bottomLeft: node.rectangleCornerRadii[3]
      };
    }
  }

  /**
   * Determine if a component is a meaningful UI element worth comparing
   * Made much more inclusive to capture all UI components
   */
  isMeaningfulUIComponent(component) {
    // Skip only very generic container frames at shallow depths
    if (component.type === 'FRAME' && component.depth <= 2) {
      const name = component.name.toLowerCase();
      const genericNames = ['document', 'page', 'canvas', 'artboard'];
      if (genericNames.some(generic => name.includes(generic))) {
        return false;
      }
    }

    // Always include text components
    if (component.type === 'TEXT') {
      return true;
    }

    // Include ALL component instances and components (these are reusable UI elements)
    if (['COMPONENT', 'COMPONENT_SET', 'INSTANCE'].includes(component.type)) {
      return true;
    }

    // Include ALL shape elements (buttons, icons, dividers, etc.)
    const shapeTypes = [
      'RECTANGLE', 'ELLIPSE', 'POLYGON', 'STAR', 'VECTOR',
      'BOOLEAN_OPERATION', 'LINE'
    ];
    if (shapeTypes.includes(component.type)) {
      return true;
    }

    // Include frames and groups that are likely UI components
    if (component.type === 'FRAME' || component.type === 'GROUP') {
      const name = component.name.toLowerCase();
      
      // Include frames with UI-related names
      const uiKeywords = [
        'button', 'btn', 'input', 'field', 'dropdown', 'select', 'option',
        'card', 'item', 'row', 'cell', 'column', 'table', 'list',
        'modal', 'dialog', 'popup', 'tooltip', 'badge', 'tag', 'chip',
        'header', 'footer', 'nav', 'menu', 'tab', 'panel', 'section',
        'icon', 'logo', 'image', 'avatar', 'thumbnail',
        'search', 'filter', 'sort', 'action', 'control',
        'status', 'alert', 'notification', 'message',
        'form', 'checkbox', 'radio', 'switch', 'slider'
      ];
      
      if (uiKeywords.some(keyword => name.includes(keyword))) {
        return true;
      }

      // Include frames at deeper levels (likely to be specific UI components)
      if (component.depth >= 4) {
        return true;
      }

      // Include frames with visual properties
      const hasColors = Object.keys(component.properties.colors).length > 0;
      const hasTypography = Object.keys(component.properties.typography).length > 0;
      const hasEffects = Object.keys(component.properties.effects).length > 0;
      
      if (hasColors || hasTypography || hasEffects) {
        return true;
      }

      // Include frames with layout properties (auto-layout components)
      if (component.properties.layout.layoutMode) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get summary of component types
   */
  getComponentTypeSummary(components) {
    const summary = {};
    components.forEach(component => {
      summary[component.type] = (summary[component.type] || 0) + 1;
    });
    return summary;
  }

  /**
   * Check if color is valid and not a default
   */
  isValidColor(color) {
    if (!color || typeof color !== 'object') return false;
    return typeof color.r === 'number' && typeof color.g === 'number' && typeof color.b === 'number';
  }

  /**
   * Check if color is a default Figma color that should be ignored
   */
  isDefaultFigmaColor(color) {
    if (!this.isValidColor(color)) return true;
    
    const defaultColors = [
      { r: 0, g: 0, b: 0 }, // #000000
      { r: 1, g: 1, b: 1 }, // #ffffff
      { r: 0.11764705882352941, g: 0.11764705882352941, b: 0.11764705882352941 }, // #1e1e1e
    ];
    
    const tolerance = 0.001;
    return defaultColors.some(defaultColor => 
      Math.abs(color.r - defaultColor.r) < tolerance &&
      Math.abs(color.g - defaultColor.g) < tolerance &&
      Math.abs(color.b - defaultColor.b) < tolerance
    );
  }

  /**
   * Convert RGBA color to hex
   */
  rgbaToHex(color) {
    if (!this.isValidColor(color)) return null;
    
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * Download images for components (if needed for visual comparison)
   */
  async downloadImages(fileId, imageNodes, outputDir) {
    // Use MCP tools if available
    if (typeof mcp_Framelink_Figma_MCP_download_figma_images !== 'undefined') {
      return await mcp_Framelink_Figma_MCP_download_figma_images({
        fileKey: fileId,
        nodes: imageNodes,
        localPath: outputDir
      });
    }
    
    console.warn('⚠️ Image download not available - MCP tools not found');
    return null;
  }
}

export default EnhancedFigmaExtractor; 