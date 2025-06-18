import fs from 'fs/promises';
import path from 'path';
import FigmaMCPIntegration from './mcpIntegration.js';

/**
 * Figma Design Data Extractor
 * Extracts design properties from Figma files using MCP integration
 */
class FigmaExtractor {
  constructor(config) {
    this.config = config;
    this.mcpIntegration = FigmaMCPIntegration.createIntegration(config);
  }

  /**
   * Initialize the extractor and MCP connection
   */
  async initialize() {
    try {
      await this.mcpIntegration.initialize();
      console.log('✅ Figma Extractor initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Figma Extractor:', error);
      throw error;
    }
  }

  /**
   * Reinitialize the extractor with new config
   */
  async reinitialize(newConfig) {
    try {
      this.config = newConfig;
      this.mcpIntegration = FigmaMCPIntegration.createIntegration(newConfig);
      await this.mcpIntegration.initialize();
      console.log('✅ Figma Extractor reinitialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to reinitialize Figma Extractor:', error);
      throw error;
    }
  }

  /**
   * Extract design data from Figma file
   * @param {string} fileKey - Figma file key
   * @param {string} nodeId - Optional specific node ID
   * @param {number} depth - Traversal depth (default: 2)
   * @returns {Object} Extracted design data
   */
  async extractDesignData(fileKey, nodeId = null, depth = 5) {
    try {
      console.log(`🎨 Extracting design data from Figma file: ${fileKey}`);
      if (nodeId) {
        console.log(`🎯 Targeting specific node: ${nodeId} with depth: ${depth}`);
        
        // For specific nodes, we need to fetch the entire file first to find which canvas contains the node
        // This is because Figma API doesn't return detailed children when requesting specific nodes
        console.log(`🔍 Fetching entire file to locate target node and its canvas...`);
        const figmaData = await this.mcpIntegration.getFigmaData(fileKey, null, depth);
        
        // Process with the target nodeId for filtering
        const processedData = await this.processDesignData(figmaData, fileKey, nodeId);
        console.log(`✅ Successfully extracted ${processedData.components.length} components`);
        return processedData;
      } else {
        // For full file extraction, proceed normally
        const figmaData = await this.mcpIntegration.getFigmaData(fileKey, nodeId, depth);
        const processedData = await this.processDesignData(figmaData, fileKey, nodeId);
        console.log(`✅ Successfully extracted ${processedData.components.length} components`);
        return processedData;
             }
      
    } catch (error) {
      console.error('❌ Error extracting design data:', error);
      throw error;
    }
  }

  /**
   * Process and normalize Figma design data into a standardized format
   * @param {Object} figmaData - Raw Figma API response
   * @param {string} fileKey - Figma file key
   * @param {string} nodeId - Optional specific node ID that was requested
   * @returns {Object} Processed design data
   */
  async processDesignData(figmaData, fileKey = null, nodeId = null) {
    const components = [];
    
    console.log(`🔍 Processing design data. NodeId: ${nodeId}`);
    console.log(`📋 Figma data keys:`, Object.keys(figmaData));
    
    // If a specific nodeId was requested, find the canvas containing it and extract that canvas
    if (nodeId) {
      console.log(`🎯 Looking for specific node ${nodeId} in the entire file...`);
      console.log(`🔍 Document has ${figmaData.document?.children?.length || 0} top-level children`);
      
      let foundComponents = false;
      
      // Strategy 1: Find the canvas that contains the target node
      const canvasWithNode = this.findCanvasContainingNode(figmaData.document, nodeId);
      console.log(`🔍 Canvas search result:`, canvasWithNode ? `Found "${canvasWithNode.name}"` : 'Not found');
      
      if (canvasWithNode) {
        console.log(`📦 Found canvas containing target node: ${canvasWithNode.name}`);
        console.log(`🎯 Canvas has ${canvasWithNode.children?.length || 0} children`);
        console.log(`🎯 Extracting all components from canvas: ${canvasWithNode.name}`);
        
        // Extract all components from this canvas (this will include the target node and all its siblings and children)
        await this.processCanvasComponents(canvasWithNode, components);
        foundComponents = components.length > 0;
        
        console.log(`✅ Extracted ${components.length} components from canvas`);
      } else {
        console.log(`❌ Could not find canvas containing node ${nodeId}`);
        console.log(`🔍 Available top-level children:`, figmaData.document?.children?.map(c => `${c.name} (${c.type})`) || []);
      }
      
      // Strategy 2: Fallback to checking figmaData.nodes
      if (!foundComponents && figmaData.nodes && figmaData.nodes[nodeId]) {
        const specificNode = figmaData.nodes[nodeId];
        console.log(`📦 Raw specific node keys:`, Object.keys(specificNode));
        
        // The node structure might be different - check both document and direct access
        const targetNode = specificNode.document || specificNode;
        
        console.log(`📦 Found specific node: ${targetNode.name} (${targetNode.type})`);
        console.log(`👶 Node has ${targetNode.children ? targetNode.children.length : 0} children`);
        
        // Process the target node and ALL its children (entire frame)
        const component = await this.processNode(targetNode);
        if (component) {
          // Add componentName for easier identification
          component.componentName = component.name || `${component.type}_${component.id}`;
          components.push(component);
          console.log(`✅ Added main component: ${component.componentName}`);
          
          // Also add all child components as separate components for comparison
          console.log(`🔄 Starting to flatten components...`);
          await this.flattenComponents(targetNode, components);
          console.log(`📊 Total components after flattening: ${components.length}`);
          foundComponents = true;
        } else {
          console.warn(`⚠️ processNode returned null for ${targetNode.name}`);
        }
      }
      
      // Strategy 3: Search through document tree if not found yet  
      if (!foundComponents && (!figmaData.nodes || !figmaData.nodes[nodeId])) {
        console.warn(`⚠️ Node ${nodeId} not found in figmaData.nodes`);
        console.log(`Available nodes:`, figmaData.nodes ? Object.keys(figmaData.nodes) : 'none');
        
        // Search through the document tree to find the target node
        const targetNode = this.findNodeById(figmaData.document, nodeId);
        if (targetNode) {
          console.log(`📦 Found node via search: ${targetNode.name} (${targetNode.type})`);
          console.log(`👶 Node has ${targetNode.children ? targetNode.children.length : 0} children`);
          
          const component = await this.processNode(targetNode);
          if (component) {
            // Add componentName for easier identification
            component.componentName = component.name || `${component.type}_${component.id}`;
            components.push(component);
            
            // Also add all child components as separate components for comparison
            await this.flattenComponents(targetNode, components);
            foundComponents = true;
          }
        } else {
          console.log(`❌ Node ${nodeId} not found in document tree either`);
        }
      }
      
      // Strategy 4: If specific node still not found, extract from the first meaningful canvas
      if (!foundComponents) {
        console.log(`🔍 Specific node ${nodeId} not found anywhere, falling back to first meaningful canvas...`);
        
        if (figmaData.document && figmaData.document.children) {
          // Find the first canvas that has meaningful content
          for (const canvas of figmaData.document.children) {
            if (canvas.type === 'CANVAS' && canvas.children && canvas.children.length > 0) {
              console.log(`📦 Using fallback canvas: ${canvas.name} with ${canvas.children.length} children`);
              await this.processCanvasComponents(canvas, components);
              
              if (components.length > 0) {
                console.log(`✅ Extracted ${components.length} components from fallback canvas`);
                foundComponents = true;
                break;
              }
            }
          }
        }
      }
      
      // Strategy 5: Last resort - extract everything from the document
      if (!foundComponents) {
        console.log(`🔍 No components found with specific strategies, extracting entire document...`);
        if (figmaData.document && figmaData.document.children) {
          for (const node of figmaData.document.children) {
            const component = await this.processNode(node);
            if (component) {
              components.push(component);
            }
          }
          foundComponents = components.length > 0;
        }
      }
      
      if (!foundComponents) {
        console.warn(`⚠️ No components could be extracted for node ${nodeId}. This might indicate the node doesn't exist or the file structure is unexpected.`);
      }
      
    } else {
      // Process all document children (original behavior for full file extraction)
      if (figmaData.document && figmaData.document.children) {
        for (const node of figmaData.document.children) {
          const component = await this.processNode(node);
          if (component) {
            components.push(component);
          }
        }
      }
    }

    console.log(`🎯 Final component count: ${components.length}`);
    return {
      fileId: fileKey || figmaData.fileKey || 'unknown',
      fileName: figmaData.name || figmaData.document?.name,
      documentId: figmaData.document?.id,
      components,
      extractedAt: new Date().toISOString(),
      // Add metadata about extraction
      metadata: {
        requestedNodeId: nodeId,
        totalCanvases: figmaData.document?.children?.length || 0,
        extractionStrategy: nodeId ? (components.length > 0 ? 'node-specific' : 'fallback') : 'full-document'
      }
    };
  }

  /**
   * Flatten a component tree to extract all child components as separate components
   * This allows each element in the frame to be compared individually
   * @param {Object} component - Component with potential children
   * @param {Array} components - Array to add flattened components to
   */
  async flattenComponents(component, components) {
    if (component.children && component.children.length > 0) {
      console.log(`🔍 Flattening ${component.name} with ${component.children.length} children`);
      
      for (const child of component.children) {
        // Check if this child is meaningful before processing
        const isMeaningful = this.isMeaningfulComponent(child);
        console.log(`  📝 Child: ${child.name} (${child.type}) - Meaningful: ${isMeaningful}`);
        console.log(`    🔍 Child properties: fills=${child.fills?.length || 0}, strokes=${child.strokes?.length || 0}, children=${child.children?.length || 0}`);
        
        if (isMeaningful) {
          // Process the child component
          const processedChild = await this.processNode(child);
          
          if (processedChild) {
            // Add componentName for easier identification
            processedChild.componentName = processedChild.name || `${processedChild.type}_${processedChild.id}`;
            components.push(processedChild);
            console.log(`    ✅ Added: ${processedChild.componentName}`);
          } else {
            console.log(`    ⚠️ processNode returned null for ${child.name}`);
          }
        }
        
        // Recursively flatten children regardless of whether we added the parent
        await this.flattenComponents(child, components);
      }
    } else {
      console.log(`🔍 ${component.name} has no children to flatten`);
    }
  }

  /**
   * Check if a component is meaningful for comparison
   * @param {Object} component - Component to check
   * @returns {boolean} True if component should be included in comparison
   */
  isMeaningfulComponent(component) {
    // Include components that have visual properties or are interactive elements
    const meaningfulTypes = ['TEXT', 'RECTANGLE', 'ELLIPSE', 'COMPONENT', 'INSTANCE', 'BUTTON', 'FRAME', 'GROUP'];
    
    // Always include these specific types (made more inclusive)
    if (meaningfulTypes.includes(component.type)) {
      // For TEXT elements, always include
      if (component.type === 'TEXT') {
        return true;
      }
      
      // For visual elements, always include
      if (['RECTANGLE', 'ELLIPSE', 'COMPONENT', 'INSTANCE', 'BUTTON'].includes(component.type)) {
        return true;
      }
      
      // For FRAME and GROUP types, be more inclusive
      if (component.type === 'FRAME' || component.type === 'GROUP') {
        // Include if it has any visual properties
        if (component.fills && component.fills.length > 0) {
          return true;
        }
        
        if (component.strokes && component.strokes.length > 0) {
          return true;
        }
        
        if (component.effects && component.effects.length > 0) {
          return true;
        }
        
        if (component.componentProperties && Object.keys(component.componentProperties).length > 0) {
          return true;
        }
        
        // Include if it has a meaningful name (not generic)
        if (component.name && !this.isGenericName(component.name)) {
          return true;
        }
        
        // Include if it has children (containers are meaningful)
        if (component.children && component.children.length > 0) {
          return true;
        }
        
        // Include if it has any positioning or sizing (layout elements)
        if (component.absoluteBoundingBox) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Check if a component name is generic/meaningless
   * @param {string} name - Component name
   * @returns {boolean} True if the name is generic
   */
  isGenericName(name) {
    const genericNames = [
      'Frame', 'Group', 'Rectangle', 'Ellipse', 'Vector', 'Union', 'Subtract',
      'Container', 'Wrapper', 'Content', 'Layout', 'Spacer', 'Divider'
    ];
    
    // Check if name is exactly a generic name or starts with generic name + number
    return genericNames.some(generic => 
      name === generic || 
      name.startsWith(generic + ' ') ||
      /^(Frame|Group|Rectangle|Ellipse|Vector|Union|Subtract)\s*\d*$/.test(name)
    );
  }

  /**
   * Recursively find a node by its ID in the Figma document tree
   * @param {Object} node - Current node to search
   * @param {string} targetId - ID to find
   * @returns {Object|null} Found node or null
   */
  findNodeById(node, targetId) {
    if (!node) return null;
    
    // Check if current node matches
    if (node.id === targetId) {
      return node;
    }
    
    // Search in children
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        const found = this.findNodeById(child, targetId);
        if (found) {
          return found;
        }
      }
    }
    
    return null;
  }

  /**
   * Find the canvas that contains a specific node
   * @param {Object} document - Figma document
   * @param {string} targetId - ID to find
   * @returns {Object|null} Canvas containing the node or null
   */
  findCanvasContainingNode(document, targetId) {
    if (!document || !document.children) return null;
    
    for (const canvas of document.children) {
      if (canvas.type === 'CANVAS') {
        const found = this.findNodeById(canvas, targetId);
        if (found) {
          return canvas;
        }
      }
    }
    
    return null;
  }

  /**
   * Process all components in a canvas
   * @param {Object} canvas - Canvas to process
   * @param {Array} components - Array to add components to
   */
  async processCanvasComponents(canvas, components) {
    if (!canvas || !canvas.children) return;
    
    console.log(`🎨 Processing canvas: ${canvas.name} with ${canvas.children.length} children`);
    
    for (const child of canvas.children) {
      const component = await this.processNode(child);
      if (component) {
        component.componentName = component.name || `${component.type}_${component.id}`;
        components.push(component);
        console.log(`✅ Added canvas component: ${component.componentName}`);
        
        // Also flatten this component to get all its children
        await this.flattenComponents(child, components);
      }
    }
  }

  /**
   * Process individual Figma node and extract design properties
   * @param {Object} node - Figma node object
   * @returns {Object} Processed component data
   */
  async processNode(node) {
    const component = {
      id: node.id,
      name: node.name,
      type: node.type,
      properties: {},
      children: []
    };

    // Extract typography properties - only if they exist
    if (node.style) {
      const typography = {};
      if (node.style.fontFamily) typography.fontFamily = node.style.fontFamily;
      if (node.style.fontSize) typography.fontSize = node.style.fontSize;
      if (node.style.fontWeight) typography.fontWeight = node.style.fontWeight;
      if (node.style.letterSpacing) typography.letterSpacing = node.style.letterSpacing;
      if (node.style.lineHeightPx) typography.lineHeight = node.style.lineHeightPx;
      if (node.style.textAlignHorizontal) typography.textAlign = node.style.textAlignHorizontal;
      
      if (Object.keys(typography).length > 0) {
        component.properties.typography = typography;
      }
    }

    // Extract color properties - only if they exist and are valid
    if (node.fills && node.fills.length > 0) {
      const fill = node.fills[0];
      if (fill.type === 'SOLID' && fill.color) {
        const colorHex = this.rgbaToHex(fill.color);
        if (colorHex && colorHex !== '#000000') { // Don't use fallback black
          component.properties.color = colorHex;
        }
      }
    }

    // Only set backgroundColor if it actually exists in the node and is not a default/fallback value
    if (node.backgroundColor && this.isValidColor(node.backgroundColor)) {
      // Check for common default/fallback RGBA values that Figma sets
      const isDefaultColor = this.isDefaultFigmaColor(node.backgroundColor);
      
      if (!isDefaultColor) {
        const bgColorHex = this.rgbaToHex(node.backgroundColor);
        if (bgColorHex) {
          component.properties.backgroundColor = bgColorHex;
        }
      }
    }

    // Extract spacing properties - only set non-zero values or explicitly defined ones
    const spacing = {};
    if (node.paddingTop !== undefined && node.paddingTop !== null) spacing.paddingTop = node.paddingTop;
    if (node.paddingRight !== undefined && node.paddingRight !== null) spacing.paddingRight = node.paddingRight;
    if (node.paddingBottom !== undefined && node.paddingBottom !== null) spacing.paddingBottom = node.paddingBottom;
    if (node.paddingLeft !== undefined && node.paddingLeft !== null) spacing.paddingLeft = node.paddingLeft;
    
    if (Object.keys(spacing).length > 0) {
      component.properties.spacing = spacing;
    }

    // Extract border properties - only if they exist
    if (node.cornerRadius !== undefined && node.cornerRadius !== null) {
      component.properties.borderRadius = node.cornerRadius;
    }

    if (node.strokes && node.strokes.length > 0) {
      const stroke = node.strokes[0];
      if (stroke.color && this.isValidColor(stroke.color)) {
        component.properties.border = {
          width: node.strokeWeight || 1,
          color: this.rgbaToHex(stroke.color),
          style: 'solid'
        };
      }
    }

    // Extract shadow properties - only if they exist
    if (node.effects && node.effects.length > 0) {
      const shadows = node.effects
        .filter(effect => effect.color && this.isValidColor(effect.color))
        .map(effect => ({
          type: effect.type,
          color: this.rgbaToHex(effect.color),
          offset: effect.offset,
          radius: effect.radius,
          spread: effect.spread || 0
        }));
      
      if (shadows.length > 0) {
        component.properties.shadows = shadows;
      }
    }

    // Extract dimensions - only if they exist
    if (node.absoluteBoundingBox) {
      component.properties.dimensions = {
        width: node.absoluteBoundingBox.width,
        height: node.absoluteBoundingBox.height,
        x: node.absoluteBoundingBox.x,
        y: node.absoluteBoundingBox.y
      };
    }

    // Extract layout properties - only if they exist
    if (node.layoutMode) {
      const layout = {
        mode: node.layoutMode
      };
      
      if (node.primaryAxisAlignItems) layout.direction = node.primaryAxisAlignItems;
      if (node.itemSpacing !== undefined) layout.gap = node.itemSpacing;
      
      const layoutPadding = {};
      if (node.paddingTop !== undefined) layoutPadding.top = node.paddingTop;
      if (node.paddingRight !== undefined) layoutPadding.right = node.paddingRight;
      if (node.paddingBottom !== undefined) layoutPadding.bottom = node.paddingBottom;
      if (node.paddingLeft !== undefined) layoutPadding.left = node.paddingLeft;
      
      if (Object.keys(layoutPadding).length > 0) {
        layout.padding = layoutPadding;
      }
      
      component.properties.layout = layout;
    }

    // Extract constraints - only if they exist
    if (node.constraints) {
      component.properties.constraints = node.constraints;
    }

    // Process children recursively
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        const childComponent = await this.processNode(child);
        if (childComponent) {
          component.children.push(childComponent);
        }
      }
    }

    return component;
  }

  /**
   * Check if a color object is valid and not a fallback
   * @param {Object} color - RGBA color object
   * @returns {boolean} True if color is valid
   */
  isValidColor(color) {
    if (!color || typeof color !== 'object') return false;
    
    // Check if all RGB values are defined and are numbers
    if (typeof color.r !== 'number' || typeof color.g !== 'number' || typeof color.b !== 'number') {
      return false;
    }
    
    // Check if values are in valid range (0-1 for Figma)
    if (color.r < 0 || color.r > 1 || color.g < 0 || color.g > 1 || color.b < 0 || color.b > 1) {
      return false;
    }
    
    return true;
  }

  /**
   * Check if a color is a default/fallback color that Figma sets automatically
   * @param {Object} color - RGBA color object
   * @returns {boolean} True if this is a default color that should be ignored
   */
  isDefaultFigmaColor(color) {
    if (!color || typeof color !== 'object') return true;
    
    // Common default colors that Figma sets for CANVAS and other nodes
    const defaultColors = [
      // #000000 - pure black
      { r: 0, g: 0, b: 0 },
      // #1e1e1e - dark gray (30, 30, 30)
      { r: 0.11764705882352941, g: 0.11764705882352941, b: 0.11764705882352941 },
      // #ffffff - pure white
      { r: 1, g: 1, b: 1 },
      // Common gray variations
      { r: 0.5, g: 0.5, b: 0.5 }, // #808080
      { r: 0.2, g: 0.2, b: 0.2 }, // #333333
    ];
    
    // Check if the color matches any default color (with small tolerance for floating point precision)
    const tolerance = 0.001;
    return defaultColors.some(defaultColor => 
      Math.abs(color.r - defaultColor.r) < tolerance &&
      Math.abs(color.g - defaultColor.g) < tolerance &&
      Math.abs(color.b - defaultColor.b) < tolerance
    );
  }

  /**
   * Convert RGBA color object to hex string
   * @param {Object} rgba - RGBA color object {r, g, b, a}
   * @returns {string|null} Hex color string or null if invalid
   */
  rgbaToHex(rgba) {
    if (!this.isValidColor(rgba)) return null;
    
    const r = Math.round(rgba.r * 255);
    const g = Math.round(rgba.g * 255);
    const b = Math.round(rgba.b * 255);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * Save extracted data to file
   * @param {Object} data - Extracted design data
   * @param {string} outputPath - Output file path
   */
  async saveToFile(data, outputPath) {
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(data, null, 2));
    console.log(`💾 Design data saved to: ${outputPath}`);
  }

  /**
   * Download images from Figma for visual comparison
   * @param {string} fileKey - Figma file key
   * @param {Array} nodes - Array of node objects with {nodeId, fileName}
   * @param {string} localPath - Local directory to save images
   */
  async downloadImages(fileKey, nodes, localPath) {
    try {
      // Ensure directory exists
      await fs.mkdir(localPath, { recursive: true });
      
      console.log(`🖼️ Downloading ${nodes.length} images from Figma...`);
      
      // Use MCP integration to download images
      const result = await this.mcpIntegration.downloadFigmaImages(fileKey, nodes, localPath);
      
      console.log(`✅ Successfully downloaded ${result.downloaded || nodes.length} images`);
      return result;
      
    } catch (error) {
      console.error('❌ Error downloading images:', error);
      throw error;
    }
  }

  /**
   * Extract all components from a Figma file and prepare for comparison
   * @param {string} fileKey - Figma file key
   * @param {string} nodeId - Optional specific node ID
   * @returns {Object} Complete extraction data with images
   */
  async extractCompleteDesign(fileKey, nodeId = null) {
    try {
      // Extract design data
      const designData = await this.extractDesignData(fileKey, nodeId);
      
      // Prepare nodes for image download
      const imageNodes = this.collectImageNodes(designData.components);
      
      if (imageNodes.length > 0) {
        // Create images directory
        const imagesPath = path.join(process.cwd(), 'output', 'images', fileKey);
        
        // Download images
        const imageResults = await this.downloadImages(fileKey, imageNodes, imagesPath);
        
        // Add image paths to design data
        designData.images = imageResults;
      }
      
      return designData;
      
    } catch (error) {
      console.error('❌ Error in complete design extraction:', error);
      throw error;
    }
  }

  /**
   * Collect all nodes that should be downloaded as images
   * @param {Array} components - Array of processed components
   * @returns {Array} Array of image node objects
   */
  collectImageNodes(components) {
    const imageNodes = [];
    
    // Node types that can be exported as images
    const exportableTypes = ['CANVAS', 'FRAME', 'COMPONENT', 'INSTANCE', 'GROUP', 'RECTANGLE', 'ELLIPSE'];
    
    const processComponent = (component) => {
      // Only add nodes that can be exported as images
      if (exportableTypes.includes(component.type)) {
        imageNodes.push({
          nodeId: component.id,
          fileName: `${component.name.replace(/[^a-zA-Z0-9]/g, '_')}_${component.id}.png`
        });
      }
      
      // Process children selectively - only for container types
      if (component.children && component.children.length > 0 && 
          ['CANVAS', 'FRAME', 'COMPONENT', 'INSTANCE', 'GROUP'].includes(component.type)) {
        component.children.forEach(processComponent);
      }
    };
    
    components.forEach(processComponent);
    return imageNodes;
  }

  /**
   * Get specific node data for targeted extraction
   * @param {string} fileKey - Figma file key
   * @param {string} nodeId - Specific node ID
   * @returns {Object} Node-specific design data
   */
  async getNodeData(fileKey, nodeId) {
    try {
      console.log(`🎯 Extracting specific node: ${nodeId} from file: ${fileKey}`);
      
      const designData = await this.extractDesignData(fileKey, nodeId, 1);
      
      if (designData.components.length === 0) {
        throw new Error(`No components found for node: ${nodeId}`);
      }
      
      return designData.components[0]; // Return the specific node data
      
    } catch (error) {
      console.error('❌ Error extracting node data:', error);
      throw error;
    }
  }
}

export default FigmaExtractor; 