/**
 * Direct MCP Framelink Figma Extractor
 * Uses mcp_Framelink_Figma_MCP tools directly for superior Figma extraction
 */

class MCPDirectFigmaExtractor {
  constructor(config) {
    this.config = config;
    console.log('🔧 MCP Direct Figma Extractor initialized');
  }

  /**
   * Extract Figma components using MCP Framelink tools
   * @param {string} fileKey - Figma file key
   * @param {string} nodeId - Optional node ID for specific component
   * @returns {Object} Extracted components data
   */
  async extractComponents(fileKey, nodeId = null) {
    try {
      console.log(`🎨 Extracting Figma components using MCP Framelink tools...`);
      console.log(`📋 File: ${fileKey}, Node: ${nodeId || 'entire file'}`);

      // Use MCP Framelink tools to get Figma data
      const params = { fileKey };
      if (nodeId) params.nodeId = nodeId;

      console.log(`📤 Calling mcp_Framelink_Figma_MCP_get_figma_data...`);
      const figmaData = await mcp_Framelink_Figma_MCP_get_figma_data(params);

      if (!figmaData) {
        throw new Error('No data received from MCP Framelink tools');
      }

      console.log(`✅ MCP Framelink data received: ${figmaData.metadata?.name || 'Unknown file'}`);
      console.log(`📊 Raw data structure: ${Object.keys(figmaData).join(', ')}`);

      // Transform MCP data to our component format
      const components = this.transformMCPDataToComponents(figmaData, nodeId);

      console.log(`🔄 Transformed ${components.length} components from MCP data`);
      
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
      console.log('🔄 Transforming MCP data to component format...');

      // Handle different MCP data structures
      if (figmaData.nodes && Array.isArray(figmaData.nodes)) {
        console.log(`📊 Processing ${figmaData.nodes.length} nodes from MCP data`);
        
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
        console.log(`📊 Processing ${Object.keys(figmaData.metadata.components).length} component metadata entries`);
        
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

      console.log(`✅ Successfully transformed ${components.length} components`);
      
      // Log component summary
      const componentTypes = components.reduce((acc, comp) => {
        acc[comp.type] = (acc[comp.type] || 0) + 1;
        return acc;
      }, {});
      
      console.log(`📊 Component types: ${Object.entries(componentTypes).map(([type, count]) => `${type}: ${count}`).join(', ')}`);

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

      // Extract fill properties (colors)
      if (node.fills && globalVars?.styles?.[node.fills]) {
        const fillStyle = globalVars.styles[node.fills];
        if (Array.isArray(fillStyle) && fillStyle.length > 0) {
          component.properties.fill = fillStyle[0]; // Use first fill
          component.properties.backgroundColor = fillStyle[0];
        }
      }

      // Extract text properties for text nodes
      if (node.type === 'TEXT') {
        component.properties.fontSize = node.fontSize || 'inherit';
        component.properties.fontFamily = node.fontFamily || 'inherit';
        component.properties.fontWeight = node.fontWeight || 'normal';
        component.properties.textContent = node.characters || node.name;
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
        component.properties.textContent) {
      return true;
    }

    // Include specific types that are usually meaningful
    if (['TEXT', 'FRAME', 'COMPONENT', 'INSTANCE', 'RECTANGLE', 'ELLIPSE', 'POLYGON', 'STAR', 'VECTOR', 'IMAGE'].includes(component.type)) {
      return true;
    }

    return false;
  }

  /**
   * Test MCP connectivity and functionality
   */
  async testMCPConnection() {
    try {
      console.log('🧪 Testing MCP Framelink connection...');
      
      // Test with a simple file
      const testResult = await mcp_Framelink_Figma_MCP_get_figma_data({
        fileKey: 'xfMsPmqaYwrjxl4fog2o7X', // Test file
        nodeId: '1516-36' // Test node
      });

      console.log('✅ MCP connection test successful');
      return {
        success: true,
        testResult: {
          fileName: testResult.metadata?.name || 'Unknown',
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
      console.log('🧪 Testing MCP Framelink connection...');
      
      // We can't actually test without a real file, so we'll check if the functions exist
      if (typeof mcp_Framelink_Figma_MCP_get_figma_data === 'function' &&
          typeof mcp_Framelink_Figma_MCP_download_figma_images === 'function') {
        
        console.log('✅ MCP Framelink tools are available');
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