/**
 * Direct MCP Framelink Figma Extractor
 * Uses mcp_Framelink_Figma_MCP tools directly for superior Figma extraction
 */

// Check if MCP tools are available in global scope
const isMCPToolsAvailable = () => {
  return typeof globalThis.mcp_Framelink_Figma_MCP_get_figma_data === 'function';
};

class MCPDirectFigmaExtractor {
  constructor(config) {
    this.config = config;
  }

  /**
   * Extract Figma components using MCP Framelink tools
   * @param {string} fileKey - Figma file key
   * @param {string} nodeId - Optional node ID for specific component
   * @returns {Object} Extracted components data
   */
  async extractComponents(fileKey, nodeId = null) {
    try {

      // Use MCP Framelink tools to get Figma data
      const params = { fileKey };
      if (nodeId) params.nodeId = nodeId;

      const figmaData = await mcp_Framelink_Figma_MCP_get_figma_data(params);

      if (!figmaData) {
        throw new Error('No data received from MCP Framelink tools');
      }


      // Transform MCP data to our component format
      const components = this.transformMCPDataToComponents(figmaData, nodeId);

      
      return {
        components,
        metadata: {
          fileName: figmaData.metadata?.name || 'Unknown',
          fileKey: fileKey,
          nodeId: nodeId,
          extractionMethod: 'MCP Framelink',
          extractedAt: new Date().toISOString(),
          totalComponents: components.length
        }
      };

    } catch (error) {
      console.error('❌ MCP Direct extraction failed:', error);
      throw new Error(`MCP extraction failed: ${error.message}`);
    }
  }

  /**
   * Transform MCP Framelink data structure to our component format
   * @param {Object} figmaData - Raw data from MCP tools
   * @param {string} nodeId - Target node ID if any
   * @returns {Array} Array of component objects
   */
  transformMCPDataToComponents(figmaData, nodeId = null) {
    const components = [];

    try {

      // Handle different MCP data structures
      if (figmaData.nodes && Array.isArray(figmaData.nodes)) {
        
        for (const node of figmaData.nodes) {
          const component = this.transformNodeToComponent(node, figmaData.globalVars);
          if (component) {
            components.push(component);
            // Also process children recursively and add them as separate components
            this.extractChildComponents(node, figmaData.globalVars, components);
          }
        }
      }

      // If we have components metadata, add that too
      if (figmaData.metadata?.components) {
        
        for (const [componentId, componentMeta] of Object.entries(figmaData.metadata.components)) {
          // Find matching node or create component from metadata
          const existingComponent = components.find(c => c.id === componentId);
          if (existingComponent) {
            existingComponent.metadata = componentMeta;
          } else {
            // Create component from metadata if no matching node
            components.push({
              id: componentId,
              name: componentMeta.name || `Component ${componentId}`,
              type: 'COMPONENT',
              metadata: componentMeta,
              properties: {},
              extractionSource: 'MCP-metadata'
            });
          }
        }
      }

      
      // Log component summary
      const componentTypes = components.reduce((acc, comp) => {
        acc[comp.type] = (acc[comp.type] || 0) + 1;
        return acc;
      }, {});
      

      return components;

    } catch (error) {
      console.error('❌ Error transforming MCP data:', error);
      return components; // Return what we have so far
    }
  }

  /**
   * Recursively extract child components and add them to the components array
   * @param {Object} node - Parent node
   * @param {Object} globalVars - Global variables
   * @param {Array} components - Components array to add to
   */
  extractChildComponents(node, globalVars, components) {
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        const childComponent = this.transformNodeToComponent(child, globalVars);
        if (childComponent) {
          components.push(childComponent);
          // Recursively process grandchildren
          this.extractChildComponents(child, globalVars, components);
        }
      }
    }
  }

  /**
   * Transform a single MCP node to our component format
   * @param {Object} node - MCP node object
   * @param {Object} globalVars - Global variables from MCP data
   * @returns {Object|null} Component object or null if not processable
   */
  transformNodeToComponent(node, globalVars = {}) {
    try {
      if (!node || !node.id) {
        return null;
      }

      const component = {
        id: node.id,
        name: node.name || `Node ${node.id}`,
        type: node.type || 'UNKNOWN',
        properties: {},
        extractionSource: 'MCP-node'
      };

      // Extract layout properties
      if (node.layout && globalVars?.styles?.[node.layout]) {
        const layoutStyle = globalVars.styles[node.layout];
        
        if (layoutStyle.dimensions) {
          component.properties.width = layoutStyle.dimensions.width;
          component.properties.height = layoutStyle.dimensions.height;
        }

        if (layoutStyle.locationRelativeToParent) {
          component.properties.x = layoutStyle.locationRelativeToParent.x;
          component.properties.y = layoutStyle.locationRelativeToParent.y;
        }
      }

      // Enhanced color extraction from fills
      if (node.fills) {
        if (globalVars?.styles?.[node.fills]) {
          const fillStyle = globalVars.styles[node.fills];
          if (Array.isArray(fillStyle) && fillStyle.length > 0) {
            component.properties.fill = fillStyle[0];
            component.properties.backgroundColor = fillStyle[0];
          }
        } else if (Array.isArray(node.fills) && node.fills.length > 0) {
          // Direct fills array
          const validFills = node.fills.filter(fill => 
            fill.type === 'SOLID' && fill.visible !== false && fill.color
          );
          
          if (validFills.length > 0) {
            component.properties.fills = validFills.map(fill => ({
              type: fill.type,
              color: this.rgbaToHex(fill.color),
              opacity: fill.opacity || 1
            }));
            component.properties.color = this.rgbaToHex(validFills[0].color);
          }
        }
      }

      // Extract background color
      if (node.backgroundColor) {
        component.properties.backgroundColor = this.rgbaToHex(node.backgroundColor);
      }

      // Extract stroke/border properties
      if (node.strokes && Array.isArray(node.strokes) && node.strokes.length > 0) {
        const validStrokes = node.strokes.filter(stroke => stroke.color);
        if (validStrokes.length > 0) {
          component.properties.strokes = validStrokes.map(stroke => ({
            color: this.rgbaToHex(stroke.color),
            weight: node.strokeWeight || 1
          }));
          component.properties.borderColor = this.rgbaToHex(validStrokes[0].color);
          component.properties.borderWidth = node.strokeWeight || 1;
        }
      }

      // Enhanced text and typography properties
      if (node.type === 'TEXT') {
        const typography = {};
        typography.fontSize = node.fontSize || node.style?.fontSize || 'inherit';
        typography.fontFamily = node.fontFamily || node.style?.fontFamily || 'inherit';
        typography.fontWeight = node.fontWeight || node.style?.fontWeight || 'normal';
        typography.textContent = node.characters || node.name;
        
        if (node.style) {
          if (node.style.letterSpacing) typography.letterSpacing = node.style.letterSpacing;
          if (node.style.lineHeightPx) typography.lineHeight = node.style.lineHeightPx;
          if (node.style.lineHeightPercent) typography.lineHeightPercent = node.style.lineHeightPercent;
          if (node.style.textAlignHorizontal) typography.textAlign = node.style.textAlignHorizontal;
          if (node.style.textDecoration) typography.textDecoration = node.style.textDecoration;
          if (node.style.textCase) typography.textTransform = node.style.textCase;
        }
        
        component.properties.typography = typography;
        // Also set individual properties for backward compatibility
        component.properties.fontSize = typography.fontSize;
        component.properties.fontFamily = typography.fontFamily;
        component.properties.fontWeight = typography.fontWeight;
        component.properties.textContent = typography.textContent;
      }

      // Enhanced spacing and layout properties
      const layout = {};
      
      // Dimensions from absoluteBoundingBox
      if (node.absoluteBoundingBox) {
        layout.width = node.absoluteBoundingBox.width;
        layout.height = node.absoluteBoundingBox.height;
        layout.x = node.absoluteBoundingBox.x;
        layout.y = node.absoluteBoundingBox.y;
      }

      // Padding properties
      if (node.paddingLeft !== undefined) layout.paddingLeft = node.paddingLeft;
      if (node.paddingRight !== undefined) layout.paddingRight = node.paddingRight;
      if (node.paddingTop !== undefined) layout.paddingTop = node.paddingTop;
      if (node.paddingBottom !== undefined) layout.paddingBottom = node.paddingBottom;

      // Auto-layout spacing
      if (node.itemSpacing !== undefined) layout.itemSpacing = node.itemSpacing;
      if (node.counterAxisSpacing !== undefined) layout.counterAxisSpacing = node.counterAxisSpacing;

      // Border radius properties
      if (node.cornerRadius !== undefined) {
        layout.borderRadius = node.cornerRadius;
        component.properties.borderRadius = node.cornerRadius;
      }
      
      if (node.rectangleCornerRadii && Array.isArray(node.rectangleCornerRadii)) {
        layout.borderRadii = {
          topLeft: node.rectangleCornerRadii[0] || 0,
          topRight: node.rectangleCornerRadii[1] || 0,
          bottomRight: node.rectangleCornerRadii[2] || 0,
          bottomLeft: node.rectangleCornerRadii[3] || 0
        };
        component.properties.borderRadii = layout.borderRadii;
      }

      if (Object.keys(layout).length > 0) {
        component.properties.layout = layout;
      }

      // Add meaningful properties for filtering
      component.isMeaningful = this.isMeaningfulComponent(component);

      return component;

    } catch (error) {
      console.warn(`⚠️ Failed to transform node ${node?.id || 'unknown'}:`, error.message);
      return null;
    }
  }

  /**
   * Determine if a component is meaningful for comparison
   * @param {Object} component - Component to check
   * @returns {boolean} True if component is meaningful
   */
  isMeaningfulComponent(component) {
    // Skip certain non-visual types
    if (['BOOLEAN_OPERATION', 'SLICE'].includes(component.type)) {
      return false;
    }

    // Include components with visual properties
    if (component.properties.fill || component.properties.backgroundColor || 
        component.properties.width || component.properties.height ||
        component.properties.textContent || component.properties.fills ||
        component.properties.strokes || component.properties.color ||
        component.properties.typography || component.properties.layout) {
      return true;
    }

    // Include specific types that are usually meaningful
    if (['TEXT', 'FRAME', 'COMPONENT', 'INSTANCE', 'RECTANGLE', 'ELLIPSE', 'POLYGON', 'STAR', 'VECTOR', 'IMAGE'].includes(component.type)) {
      return true;
    }

    return false;
  }

  /**
   * Convert RGBA color object to hex string
   */
  rgbaToHex(rgba) {
    if (!rgba || typeof rgba !== 'object') return null;
    
    const r = Math.round((rgba.r || 0) * 255);
    const g = Math.round((rgba.g || 0) * 255);
    const b = Math.round((rgba.b || 0) * 255);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * Check if a color is valid (not default/transparent)
   */
  isValidColor(color) {
    if (!color || typeof color !== 'object') return false;
    
    // Check if it's not completely transparent
    if (color.a !== undefined && color.a === 0) return false;
    
    // Check if it's not default black (0,0,0)
    if (color.r === 0 && color.g === 0 && color.b === 0) return false;
    
    return true;
  }

  /**
   * Test MCP connectivity and functionality
   */
  async testMCPConnection() {
    try {
      
      // Test with a simple file
      const testResult = await mcp_Framelink_Figma_MCP_get_figma_data({
        fileKey: 'xfMsPmqaYwrjxl4fog2o7X', // Test file
        nodeId: '1516-36' // Test node
      });

      return {
        success: true,
        testResult: {
          fileName: testResult.metadata?.name || null,
          hasNodes: !!(testResult.nodes && testResult.nodes.length > 0),
          nodeCount: testResult.nodes?.length || 0
        }
      };

    } catch (error) {
      console.error('❌ MCP connection test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test MCP connection to verify tools are available
   * @returns {Object} Test result with success status
   */
  async testMCPConnection() {
    try {
      // Test with a simple file call (no actual extraction)
      
      // We can't actually test without a real file, so we'll check if the functions exist
      if (typeof mcp_Framelink_Figma_MCP_get_figma_data === 'function' &&
          typeof mcp_Framelink_Figma_MCP_download_figma_images === 'function') {
        
        return {
          success: true,
          message: 'MCP Framelink tools are available and ready'
        };
      } else {
        throw new Error('MCP Framelink tools not found in environment');
      }
    } catch (error) {
      console.error('❌ MCP connection test failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default MCPDirectFigmaExtractor;