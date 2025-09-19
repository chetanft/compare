/**
 * Figma API Data Adapter
 * Transforms Figma REST API JSON data to standardized format
 */

import { BaseDataAdapter } from './interfaces.js';

export class FigmaAPIAdapter extends BaseDataAdapter {
  constructor() {
    super('figma-api');
  }

  /**
   * Validate Figma API response structure
   * @param {any} rawData - Raw Figma API response
   * @returns {boolean}
   */
  validate(rawData) {
    return rawData && 
           typeof rawData === 'object' && 
           (rawData.document || rawData.nodes || rawData.name);
  }

  /**
   * Transform Figma API data to standardized format
   * @param {Object} rawData - Raw Figma API response
   * @param {Object} context - Context with figmaUrl, fileId, nodeId
   * @returns {StandardizedFigmaData}
   */
  transform(rawData, context = {}) {
    if (!this.validate(rawData)) {
      throw new Error('Invalid Figma API data structure');
    }

    const baseMetadata = this.extractBaseMetadata(context);
    const components = this.extractComponents(rawData, context);
    const colors = this.extractColors(rawData);
    const typography = this.extractTypography(rawData);

    return {
      ...baseMetadata,
      metadata: {
        fileName: rawData.name || 'Unknown File',
        componentCount: components.length,
        colorCount: colors.length,
        typographyCount: typography.length,
        source: 'figma-api',
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
   * Extract components from Figma API data
   * @param {Object} rawData - Raw Figma API response
   * @param {Object} context - Context object
   * @returns {StandardizedComponent[]}
   */
  extractComponents(rawData, context) {
    const components = [];

    // Handle document structure
    if (rawData.document) {
      this.traverseNode(rawData.document, components, 0);
    }

    // Handle nodes structure (when specific nodes are requested)
    if (rawData.nodes) {
      Object.values(rawData.nodes).forEach(nodeData => {
        if (nodeData.document) {
          this.traverseNode(nodeData.document, components, 0);
        }
      });
    }

    // If we have a specific node ID, filter to that subtree
    if (context.nodeId) {
      const targetComponent = this.findComponentById(components, context.nodeId);
      if (targetComponent) {
        return this.flattenComponentTree(targetComponent);
      }
    }

    return components;
  }

  /**
   * Recursively traverse Figma node tree
   * @param {Object} node - Figma node
   * @param {StandardizedComponent[]} components - Components array to populate
   * @param {number} depth - Current depth in tree
   */
  traverseNode(node, components, depth = 0) {
    if (!node) return;

    const component = {
      id: node.id,
      name: node.name || `Unnamed ${node.type}`,
      type: node.type || 'UNKNOWN',
      properties: {
        visible: node.visible !== false,
        locked: node.locked || false,
        depth,
        ...this.extractNodeProperties(node)
      },
      metadata: {
        absoluteBoundingBox: node.absoluteBoundingBox,
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
        this.traverseNode(child, component.children, depth + 1);
      });
    }
  }

  /**
   * Extract node-specific properties
   * @param {Object} node - Figma node
   * @returns {Object}
   */
  extractNodeProperties(node) {
    const properties = {};

    // Geometry
    if (node.absoluteBoundingBox) {
      properties.width = node.absoluteBoundingBox.width;
      properties.height = node.absoluteBoundingBox.height;
      properties.x = node.absoluteBoundingBox.x;
      properties.y = node.absoluteBoundingBox.y;
    }

    // Text properties
    if (node.type === 'TEXT') {
      properties.characters = node.characters;
      properties.style = node.style;
    }

    // Component properties
    if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
      properties.componentPropertyDefinitions = node.componentPropertyDefinitions;
    }

    // Instance properties
    if (node.type === 'INSTANCE') {
      properties.componentId = node.componentId;
      properties.componentProperties = node.componentProperties;
    }

    return properties;
  }

  /**
   * Extract colors from Figma API data
   * @param {Object} rawData - Raw Figma API response
   * @returns {StandardizedColor[]}
   */
  extractColors(rawData) {
    const colors = new Map(); // Use Map to avoid duplicates
    
    this.traverseForColors(rawData.document || rawData, colors);
    
    return Array.from(colors.values());
  }

  /**
   * Recursively traverse nodes to extract colors
   * @param {Object} node - Figma node
   * @param {Map} colors - Colors map
   */
  traverseForColors(node, colors) {
    if (!node) return;

    // Extract fills
    if (node.fills && Array.isArray(node.fills)) {
      node.fills.forEach((fill, index) => {
        if (fill.type === 'SOLID' && fill.color) {
          const colorId = this.colorToHex(fill.color);
          if (!colors.has(colorId)) {
            colors.set(colorId, {
              id: `${node.id}-fill-${index}`,
              name: `Fill Color`,
              value: colorId,
              type: 'fill',
              source: 'figma-api',
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
              name: `Stroke Color`,
              value: colorId,
              type: 'stroke',
              source: 'figma-api',
              opacity: stroke.opacity || 1
            });
          }
        }
      });
    }

    // Traverse children
    if (node.children) {
      node.children.forEach(child => this.traverseForColors(child, colors));
    }
  }

  /**
   * Extract typography from Figma API data
   * @param {Object} rawData - Raw Figma API response
   * @returns {StandardizedTypography[]}
   */
  extractTypography(rawData) {
    const typography = [];
    
    this.traverseForTypography(rawData.document || rawData, typography);
    
    return typography;
  }

  /**
   * Recursively traverse nodes to extract typography
   * @param {Object} node - Figma node
   * @param {StandardizedTypography[]} typography - Typography array
   */
  traverseForTypography(node, typography) {
    if (!node) return;

    if (node.type === 'TEXT' && node.style) {
      typography.push({
        id: node.id,
        name: node.name || 'Text Element',
        fontFamily: node.style.fontFamily || 'Unknown',
        fontSize: node.style.fontSize || 12,
        fontWeight: node.style.fontWeight || 400,
        text: node.characters || '',
        source: 'figma-api',
        properties: {
          lineHeight: node.style.lineHeightPx,
          letterSpacing: node.style.letterSpacing,
          textAlign: node.style.textAlignHorizontal
        }
      });
    }

    // Traverse children
    if (node.children) {
      node.children.forEach(child => this.traverseForTypography(child, typography));
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

  /**
   * Find component by ID in component tree
   * @param {StandardizedComponent[]} components - Components array
   * @param {string} targetId - Target component ID
   * @returns {StandardizedComponent|null}
   */
  findComponentById(components, targetId) {
    for (const component of components) {
      if (component.id === targetId) {
        return component;
      }
      if (component.children) {
        const found = this.findComponentById(component.children, targetId);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * Flatten component tree to array
   * @param {StandardizedComponent} rootComponent - Root component
   * @returns {StandardizedComponent[]}
   */
  flattenComponentTree(rootComponent) {
    const flattened = [rootComponent];
    
    if (rootComponent.children) {
      rootComponent.children.forEach(child => {
        flattened.push(...this.flattenComponentTree(child));
      });
    }
    
    return flattened;
  }
}
