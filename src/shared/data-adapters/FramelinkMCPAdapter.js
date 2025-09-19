/**
 * Framelink MCP Data Adapter
 * Transforms Framelink MCP JSON data to standardized format
 */

import { BaseDataAdapter } from './interfaces.js';

export class FramelinkMCPAdapter extends BaseDataAdapter {
  constructor() {
    super('framelink-mcp');
  }

  /**
   * Validate Framelink MCP data structure
   * @param {any} rawData - Raw Framelink MCP response
   * @returns {boolean}
   */
  validate(rawData) {
    return rawData && 
           typeof rawData === 'object' && 
           (rawData.document || rawData.nodes || rawData.metadata);
  }

  /**
   * Transform Framelink MCP data to standardized format
   * @param {Object} rawData - Raw Framelink MCP response
   * @param {Object} context - Context with figmaUrl, fileId, nodeId
   * @returns {StandardizedFigmaData}
   */
  transform(rawData, context = {}) {
    if (!this.validate(rawData)) {
      throw new Error('Invalid Framelink MCP data structure');
    }

    const baseMetadata = this.extractBaseMetadata(context);
    const components = this.extractComponents(rawData);
    const colors = this.extractColors(rawData);
    const typography = this.extractTypography(rawData);

    return {
      ...baseMetadata,
      metadata: {
        fileName: rawData.metadata?.name || rawData.name || 'Unknown File',
        componentCount: components.length,
        colorCount: colors.length,
        typographyCount: typography.length,
        source: 'framelink-mcp',
        version: rawData.version || null,
        lastModified: rawData.lastModified || null
      },
      components,
      colors,
      typography,
      rawData: process.env.NODE_ENV === 'development' ? rawData : undefined
    };
  }

  /**
   * Extract components from Framelink MCP data
   * @param {Object} rawData - Raw Framelink MCP response
   * @returns {StandardizedComponent[]}
   */
  extractComponents(rawData) {
    const components = [];

    // Handle document structure
    if (rawData.document && rawData.document.children) {
      rawData.document.children.forEach(child => {
        this.traverseFramelinkNode(child, components, 0);
      });
    }

    // Handle direct nodes array
    if (rawData.nodes && Array.isArray(rawData.nodes)) {
      rawData.nodes.forEach(node => {
        this.traverseFramelinkNode(node, components, 0);
      });
    }

    // Handle metadata components
    if (rawData.metadata && rawData.metadata.components) {
      Object.entries(rawData.metadata.components).forEach(([id, componentData]) => {
        components.push({
          id,
          name: componentData.name || `Component ${id}`,
          type: 'COMPONENT',
          properties: {
            ...componentData,
            extractionMethod: 'framelink-mcp',
            fromMetadata: true
          },
          children: []
        });
      });
    }

    return components;
  }

  /**
   * Recursively traverse Framelink node structure
   * @param {Object} node - Framelink node
   * @param {StandardizedComponent[]} components - Components array to populate
   * @param {number} depth - Current depth in tree
   */
  traverseFramelinkNode(node, components, depth = 0) {
    if (!node) return;

    const component = {
      id: node.id || `framelink-${Date.now()}-${Math.random()}`,
      name: node.name || `Unnamed ${node.type || 'Node'}`,
      type: this.mapFramelinkType(node.type),
      properties: {
        visible: node.visible !== false,
        locked: node.locked || false,
        depth,
        ...this.extractFramelinkProperties(node)
      },
      metadata: {
        originalType: node.type,
        boundingBox: node.absoluteBoundingBox || node.relativeTransform,
        constraints: node.constraints,
        effects: node.effects,
        fills: node.fills,
        strokes: node.strokes
      },
      children: []
    };

    components.push(component);

    // Process children
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(child => {
        this.traverseFramelinkNode(child, component.children, depth + 1);
      });
    }
  }

  /**
   * Map Framelink node types to standardized types
   * @param {string} framelinkType - Framelink node type
   * @returns {string}
   */
  mapFramelinkType(framelinkType) {
    const typeMapping = {
      'CANVAS': 'CANVAS',
      'FRAME': 'FRAME',
      'GROUP': 'GROUP',
      'VECTOR': 'VECTOR',
      'BOOLEAN_OPERATION': 'BOOLEAN',
      'STAR': 'STAR',
      'LINE': 'LINE',
      'ELLIPSE': 'ELLIPSE',
      'REGULAR_POLYGON': 'POLYGON',
      'RECTANGLE': 'RECTANGLE',
      'TEXT': 'TEXT',
      'SLICE': 'SLICE',
      'COMPONENT': 'COMPONENT',
      'COMPONENT_SET': 'COMPONENT_SET',
      'INSTANCE': 'INSTANCE'
    };

    return typeMapping[framelinkType] || framelinkType || 'UNKNOWN';
  }

  /**
   * Extract Framelink-specific properties
   * @param {Object} node - Framelink node
   * @returns {Object}
   */
  extractFramelinkProperties(node) {
    const properties = {};

    // Geometry
    if (node.absoluteBoundingBox) {
      properties.width = node.absoluteBoundingBox.width;
      properties.height = node.absoluteBoundingBox.height;
      properties.x = node.absoluteBoundingBox.x;
      properties.y = node.absoluteBoundingBox.y;
    }

    // Transform
    if (node.relativeTransform) {
      properties.transform = node.relativeTransform;
    }

    // Text properties
    if (node.type === 'TEXT') {
      properties.characters = node.characters;
      properties.style = node.style;
      properties.characterStyleOverrides = node.characterStyleOverrides;
      properties.styleOverrideTable = node.styleOverrideTable;
    }

    // Component properties
    if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
      properties.componentPropertyDefinitions = node.componentPropertyDefinitions;
      properties.description = node.description;
    }

    // Instance properties
    if (node.type === 'INSTANCE') {
      properties.componentId = node.componentId;
      properties.componentProperties = node.componentProperties;
      properties.overrides = node.overrides;
    }

    // Vector properties
    if (node.type === 'VECTOR' || node.type === 'BOOLEAN_OPERATION') {
      properties.vectorPaths = node.vectorPaths;
      properties.vectorNetwork = node.vectorNetwork;
    }

    return properties;
  }

  /**
   * Extract colors from Framelink MCP data
   * @param {Object} rawData - Raw Framelink MCP response
   * @returns {StandardizedColor[]}
   */
  extractColors(rawData) {
    const colors = new Map();
    
    // Extract from document structure
    if (rawData.document) {
      this.traverseForFramelinkColors(rawData.document, colors);
    }

    // Extract from nodes array
    if (rawData.nodes) {
      rawData.nodes.forEach(node => {
        this.traverseForFramelinkColors(node, colors);
      });
    }

    // Extract from global styles if available
    if (rawData.styles) {
      Object.entries(rawData.styles).forEach(([styleId, style]) => {
        if (style.styleType === 'FILL' && style.fills) {
          style.fills.forEach((fill, index) => {
            if (fill.type === 'SOLID' && fill.color) {
              const colorId = this.colorToHex(fill.color);
              colors.set(colorId, {
                id: `style-${styleId}-${index}`,
                name: style.name || 'Style Color',
                value: colorId,
                type: 'style',
                source: 'framelink-mcp',
                opacity: fill.opacity || 1
              });
            }
          });
        }
      });
    }
    
    return Array.from(colors.values());
  }

  /**
   * Recursively traverse nodes to extract colors
   * @param {Object} node - Framelink node
   * @param {Map} colors - Colors map
   */
  traverseForFramelinkColors(node, colors) {
    if (!node) return;

    // Extract fills
    if (node.fills && Array.isArray(node.fills)) {
      node.fills.forEach((fill, index) => {
        if (fill.type === 'SOLID' && fill.color) {
          const colorId = this.colorToHex(fill.color);
          if (!colors.has(colorId)) {
            colors.set(colorId, {
              id: `${node.id}-fill-${index}`,
              name: `${node.name || 'Node'} Fill`,
              value: colorId,
              type: 'fill',
              source: 'framelink-mcp',
              opacity: fill.opacity || 1
            });
          }
        }
      });
    }

    // Extract strokes
    if (node.strokes && Array.isArray(node.strokes)) {
      node.strokes.forEach((stroke, index) => {
        if (stroke.type === 'SOLID' && stroke.color) {
          const colorId = this.colorToHex(stroke.color);
          if (!colors.has(colorId)) {
            colors.set(colorId, {
              id: `${node.id}-stroke-${index}`,
              name: `${node.name || 'Node'} Stroke`,
              value: colorId,
              type: 'stroke',
              source: 'framelink-mcp',
              opacity: stroke.opacity || 1
            });
          }
        }
      });
    }

    // Traverse children
    if (node.children) {
      node.children.forEach(child => this.traverseForFramelinkColors(child, colors));
    }
  }

  /**
   * Extract typography from Framelink MCP data
   * @param {Object} rawData - Raw Framelink MCP response
   * @returns {StandardizedTypography[]}
   */
  extractTypography(rawData) {
    const typography = [];
    
    // Extract from document structure
    if (rawData.document) {
      this.traverseForFramelinkTypography(rawData.document, typography);
    }

    // Extract from nodes array
    if (rawData.nodes) {
      rawData.nodes.forEach(node => {
        this.traverseForFramelinkTypography(node, typography);
      });
    }

    // Extract from text styles if available
    if (rawData.styles) {
      Object.entries(rawData.styles).forEach(([styleId, style]) => {
        if (style.styleType === 'TEXT' && style.style) {
          typography.push({
            id: `style-${styleId}`,
            name: style.name || 'Text Style',
            fontFamily: style.style.fontFamily || 'Unknown',
            fontSize: style.style.fontSize || 12,
            fontWeight: style.style.fontWeight || 400,
            text: '',
            source: 'framelink-mcp',
            properties: {
              isTextStyle: true,
              lineHeight: style.style.lineHeightPx,
              letterSpacing: style.style.letterSpacing,
              textAlign: style.style.textAlignHorizontal
            }
          });
        }
      });
    }
    
    return typography;
  }

  /**
   * Recursively traverse nodes to extract typography
   * @param {Object} node - Framelink node
   * @param {StandardizedTypography[]} typography - Typography array
   */
  traverseForFramelinkTypography(node, typography) {
    if (!node) return;

    if (node.type === 'TEXT' && node.style) {
      typography.push({
        id: node.id,
        name: node.name || 'Text Element',
        fontFamily: node.style.fontFamily || 'Unknown',
        fontSize: node.style.fontSize || 12,
        fontWeight: node.style.fontWeight || 400,
        text: node.characters || '',
        source: 'framelink-mcp',
        properties: {
          lineHeight: node.style.lineHeightPx,
          letterSpacing: node.style.letterSpacing,
          textAlign: node.style.textAlignHorizontal,
          characterStyleOverrides: node.characterStyleOverrides,
          styleOverrideTable: node.styleOverrideTable
        }
      });
    }

    // Traverse children
    if (node.children) {
      node.children.forEach(child => this.traverseForFramelinkTypography(child, typography));
    }
  }

  /**
   * Convert Figma color object to hex string
   * @param {Object} color - Figma color object {r, g, b, a?}
   * @returns {string}
   */
  colorToHex(color) {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}
