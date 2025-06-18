/**
 * Robust Figma Extractor - MCP-like functionality using direct Figma API
 * This provides the same capabilities as MCP tools but works directly in Node.js
 */

import { promises as fs } from 'fs';
import path from 'path';

export class RobustFigmaExtractor {
  constructor(config) {
    this.config = config;
    this.apiKey = config?.accessToken || config?.figma?.accessToken || process.env.FIGMA_API_KEY;
    this.baseUrl = 'https://api.figma.com/v1';
    this.mcpIntegration = config?.mcpIntegration || null;
    
    if (!this.apiKey && !this.mcpIntegration) {
      throw new Error('Either Figma API key or MCP integration is required.');
    }
    
    console.log('🎨 Robust Figma Extractor initialized');
    
    if (this.apiKey) {
      console.log(`🔑 API Key: ${this.apiKey.substring(0, 10)}...`);
    }
    
    if (this.mcpIntegration) {
      console.log(`🔌 MCP Integration: ${this.mcpIntegration.getMCPType() || 'initialized'}`);
    }
  }

  /**
   * Extract complete Figma design data (equivalent to mcp_Framelink_Figma_MCP_get_figma_data)
   * @param {string} fileKey - Figma file key
   * @param {string} nodeId - Optional specific node ID
   * @param {number} depth - Traversal depth (default: 5)
   * @returns {Object} Complete Figma design data
   */
  async getFigmaData(fileKey, nodeId = null, depth = 5) {
    try {
      console.log(`🎯 Extracting Figma data: ${fileKey}${nodeId ? ` (node: ${nodeId})` : ''}`);
      
      // Try MCP integration first if available
      if (this.mcpIntegration) {
        try {
          console.log('🔌 Attempting extraction via MCP integration...');
          const mcpData = await this.mcpIntegration.getFigmaData(fileKey, nodeId, depth);
          
          if (mcpData) {
            console.log('✅ Successfully extracted data via MCP integration');
            return mcpData;
          }
        } catch (mcpError) {
          console.warn(`⚠️ MCP extraction failed: ${mcpError.message}`);
          console.log('🔄 Falling back to direct API...');
        }
      }
      
      // Fallback to direct API
      console.log('🔑 Using direct Figma API for extraction...');
      
      // Get the complete file data
      const fileData = await this.fetchFigmaFile(fileKey);
      
      if (!fileData) {
        throw new Error('Failed to fetch Figma file data');
      }
      
      // If nodeId is specified, validate it first
      if (nodeId) {
        console.log('🔍 Validating node ID:', nodeId);
        const targetNode = this.findNodeById(fileData.document, nodeId);
        
        if (!targetNode) {
          throw new Error(`Node not found: ${nodeId}`);
        }
        
        if (targetNode.type === 'FRAME' && targetNode.parent === null) {
          throw new Error(`Attempted to use detached Frame '${nodeId}'. Please ensure the frame is properly attached to a page.`);
        }
        
        console.log('✅ Node validation successful:', targetNode.name);
      }
      
      // Process and structure the data similar to MCP output
      const processedData = this.processFigmaData(fileData, nodeId, depth);
      
      console.log(`✅ Successfully extracted Figma data: ${processedData.name}`);
      console.log(`📊 Components found: ${processedData.components?.length || 0}`);
      console.log(`📊 Pages found: ${processedData.document?.children?.length || 0}`);
      
      return processedData;
      
    } catch (error) {
      console.error('❌ Error extracting Figma data:', error.message);
      throw new Error(`Figma extraction failed: ${error.message}`);
    }
  }

  /**
   * Alias for getFigmaData to maintain compatibility with ComparisonService
   */
  async extract(fileKey, nodeId, options = {}) {
    return this.getFigmaData(fileKey, nodeId, options.depth || 5);
  }

  /**
   * Download Figma images (equivalent to mcp_Framelink_Figma_MCP_download_figma_images)
   * @param {string} fileKey - Figma file key
   * @param {Array} nodes - Array of {nodeId, fileName, imageRef?}
   * @param {string} localPath - Local directory path
   * @param {Object} options - Export options
   * @returns {Object} Download results
   */
  async downloadFigmaImages(fileKey, nodes, localPath, options = {}) {
    try {
      console.log(`📥 Downloading ${nodes.length} images from Figma...`);
      
      // Ensure directory exists
      await fs.mkdir(localPath, { recursive: true });
      
      // Try MCP integration first if available
      if (this.mcpIntegration) {
        try {
          console.log('🔌 Attempting image download via MCP integration...');
          const mcpResult = await this.mcpIntegration.downloadFigmaImages(fileKey, nodes, localPath);
          
          if (mcpResult && mcpResult.success) {
            console.log('✅ Successfully downloaded images via MCP integration');
            return mcpResult;
          }
        } catch (mcpError) {
          console.warn(`⚠️ MCP image download failed: ${mcpError.message}`);
          console.log('🔄 Falling back to direct API...');
        }
      }
      
      // Continue with direct API implementation
      const {
        format = 'png',
        scale = 2,
        svgOptions = {
          includeId: false,
          outlineText: true,
          simplifyStroke: true
        }
      } = options;
      
      const results = [];
      
      // Process in batches to avoid rate limiting
      const batchSize = 10;
      const batches = [];
      
      for (let i = 0; i < nodes.length; i += batchSize) {
        batches.push(nodes.slice(i, i + batchSize));
      }
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`📦 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} images)`);
        
        try {
          const batchResults = await this.downloadImageBatch(fileKey, batch, localPath, {
            format,
            scale,
            svgOptions
          });
          
          results.push(...batchResults);
          
          // Rate limiting delay
          if (batchIndex < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
        } catch (batchError) {
          console.warn(`⚠️ Batch ${batchIndex + 1} partially failed:`, batchError.message);
          
          // Try individual downloads for this batch
          for (const node of batch) {
            try {
              const individualResult = await this.downloadSingleImage(fileKey, node, localPath, {
                format,
                scale,
                svgOptions
              });
              results.push(individualResult);
            } catch (individualError) {
              results.push({
                nodeId: node.nodeId,
                fileName: node.fileName,
                success: false,
                error: individualError.message
              });
            }
          }
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      console.log(`✅ Downloaded ${successCount}/${nodes.length} images successfully`);
      
      return {
        success: successCount > 0,
        downloaded: successCount,
        total: nodes.length,
        results: results
      };
      
    } catch (error) {
      console.error('❌ Error downloading Figma images:', error.message);
      throw new Error(`Image download failed: ${error.message}`);
    }
  }

  /**
   * Fetch complete Figma file data
   * @param {string} fileKey - Figma file key
   * @returns {Object} Raw Figma file data
   */
  async fetchFigmaFile(fileKey) {
    try {
      const response = await fetch(`${this.baseUrl}/files/${fileKey}`, {
        headers: {
          'X-Figma-Token': this.apiKey
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Figma API error ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      return data;
      
    } catch (error) {
      console.error('❌ Error fetching Figma file:', error.message);
      throw error;
    }
  }

  /**
   * Process raw Figma data into structured format similar to MCP output
   * @param {Object} fileData - Raw Figma file data
   * @param {string} nodeId - Optional specific node ID
   * @param {number} depth - Traversal depth
   * @returns {Object} Processed Figma data
   */
  processFigmaData(fileData, nodeId = null, depth = 5) {
    const components = [];
    const styles = [];
    
    // Extract components recursively
    if (nodeId) {
      // Find specific node
      console.log('🔍 Looking for node:', nodeId);
      const targetNode = this.findNodeById(fileData.document, nodeId);
      if (targetNode) {
        console.log('✅ Found target node:', targetNode.name);
        this.extractComponents(targetNode, components, 0, depth);
      } else {
        console.warn('⚠️ Target node not found:', nodeId);
        // If node not found, extract from root as fallback
        this.extractComponents(fileData.document, components, 0, depth);
      }
    } else {
      // No specific node, extract from root
      this.extractComponents(fileData.document, components, 0, depth);
    }
    
    // Extract styles
    this.extractStyles(fileData, styles);
    
    return {
      name: fileData.name,
      lastModified: fileData.lastModified,
      version: fileData.version,
      document: fileData.document,
      components,
      styles,
      schemaVersion: "2.0.0"
    };
  }

  /**
   * Extract components from Figma node tree
   * @param {Object} node - Figma node
   * @param {Array} components - Components array to populate
   * @param {number} currentDepth - Current traversal depth
   * @param {number} maxDepth - Maximum traversal depth
   */
  extractComponents(node, components, currentDepth = 0, maxDepth = 5) {
    if (currentDepth > maxDepth) return;
    
    // Extract component data based on node type
    if (this.isExtractableNode(node)) {
      const component = this.transformNodeToComponent(node);
      components.push(component);
    }
    
    // Recursively process children
    if (node.children && currentDepth < maxDepth) {
      node.children.forEach(child => {
        this.extractComponents(child, components, currentDepth + 1, maxDepth);
      });
    }
  }

  /**
   * Check if node should be extracted as a component
   * @param {Object} node - Figma node
   * @returns {boolean} Should extract
   */
  isExtractableNode(node) {
    const extractableTypes = [
      'COMPONENT',
      'INSTANCE', 
      'FRAME',
      'GROUP',
      'TEXT',
      'RECTANGLE',
      'ELLIPSE',
      'VECTOR',
      'STAR',
      'POLYGON',
      'BOOLEAN_OPERATION',
      'LINE'
    ];
    
    return extractableTypes.includes(node.type);
  }

  /**
   * Transform Figma node to component format
   * @param {Object} node - Figma node
   * @returns {Object} Component data
   */
  transformNodeToComponent(node) {
    return {
      id: node.id,
      name: node.name,
      type: node.type,
      visible: node.visible !== false,
      
      // Layout properties
      absoluteBoundingBox: node.absoluteBoundingBox,
      dimensions: node.absoluteBoundingBox ? {
        width: node.absoluteBoundingBox.width,
        height: node.absoluteBoundingBox.height,
        x: node.absoluteBoundingBox.x,
        y: node.absoluteBoundingBox.y
      } : null,
      size: node.size,
      relativeTransform: node.relativeTransform,
      constraints: node.constraints,
      
      // Style properties
      fills: node.fills || [],
      strokes: node.strokes || [],
      strokeWeight: node.strokeWeight,
      strokeAlign: node.strokeAlign,
      cornerRadius: node.cornerRadius,
      effects: node.effects || [],
      blendMode: node.blendMode,
      opacity: node.opacity,
      
      // Text properties (if text node)
      characters: node.characters,
      style: node.style,
      characterStyleOverrides: node.characterStyleOverrides,
      styleOverrideTable: node.styleOverrideTable,
      
      // Component/Instance properties
      componentId: node.componentId,
      componentProperties: node.componentProperties,
      
      // Layout properties
      layoutMode: node.layoutMode,
      itemSpacing: node.itemSpacing,
      paddingLeft: node.paddingLeft,
      paddingRight: node.paddingRight,
      paddingTop: node.paddingTop,
      paddingBottom: node.paddingBottom,
      
      // Children count
      childrenCount: node.children ? node.children.length : 0,
      
      // Additional metadata
      exportSettings: node.exportSettings,
      isMask: node.isMask,
      overflowDirection: node.overflowDirection,
      
      // Original node reference for advanced use cases
      _originalNode: node
    };
  }

  /**
   * Extract styles and design tokens from Figma file
   * @param {Object} fileData - Figma file data
   * @param {Array} styles - Styles array to populate
   */
  extractStyles(fileData, styles) {
    // Extract text styles
    if (fileData.styles) {
      Object.entries(fileData.styles).forEach(([styleId, style]) => {
        styles.push({
          id: styleId,
          type: 'STYLE',
          ...style
        });
      });
    }
    
    // Extract design tokens from components
    this.extractDesignTokensFromComponents(fileData, styles);
  }

  /**
   * Extract design tokens from Figma components
   * @param {Object} fileData - Figma file data
   * @param {Array} styles - Styles array to populate
   */
  extractDesignTokensFromComponents(fileData, styles) {
    const designTokens = {
      colors: new Set(),
      typography: new Set(),
      spacing: new Set(),
      borderRadius: new Set(),
      shadows: new Set()
    };

    // Recursively extract tokens from all nodes
    const extractFromNode = (node) => {
      if (!node) return;

      // Extract colors
      if (node.fills) {
        node.fills.forEach(fill => {
          if (fill.type === 'SOLID' && fill.color) {
            const color = this.rgbToHex(fill.color);
            designTokens.colors.add(color);
          }
        });
      }

      if (node.strokes) {
        node.strokes.forEach(stroke => {
          if (stroke.type === 'SOLID' && stroke.color) {
            const color = this.rgbToHex(stroke.color);
            designTokens.colors.add(color);
          }
        });
      }

      // Extract typography
      if (node.style) {
        const fontKey = `${node.style.fontFamily}-${node.style.fontSize}px-${node.style.fontWeight}`;
        designTokens.typography.add(fontKey);
      }

      // Extract spacing (padding, margins from auto-layout)
      if (node.paddingLeft !== undefined) {
        designTokens.spacing.add(`padding-left-${node.paddingLeft}`);
      }
      if (node.paddingRight !== undefined) {
        designTokens.spacing.add(`padding-right-${node.paddingRight}`);
      }
      if (node.paddingTop !== undefined) {
        designTokens.spacing.add(`padding-top-${node.paddingTop}`);
      }
      if (node.paddingBottom !== undefined) {
        designTokens.spacing.add(`padding-bottom-${node.paddingBottom}`);
      }
      if (node.itemSpacing !== undefined) {
        designTokens.spacing.add(`gap-${node.itemSpacing}`);
      }

      // Extract border radius
      if (node.cornerRadius !== undefined) {
        designTokens.borderRadius.add(`${node.cornerRadius}px`);
      }
      if (node.rectangleCornerRadii) {
        node.rectangleCornerRadii.forEach((radius, index) => {
          designTokens.borderRadius.add(`corner-${index}-${radius}px`);
        });
      }

      // Extract shadows
      if (node.effects) {
        node.effects.forEach(effect => {
          if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
            const shadow = `${effect.type.toLowerCase()}-${effect.offset?.x || 0}-${effect.offset?.y || 0}-${effect.radius || 0}`;
            designTokens.shadows.add(shadow);
          }
        });
      }

      // Recursively process children
      if (node.children) {
        node.children.forEach(child => extractFromNode(child));
      }
    };

    // Start extraction from document root
    extractFromNode(fileData.document);

    // Add extracted tokens to styles array
    Object.entries(designTokens).forEach(([tokenType, tokenSet]) => {
      Array.from(tokenSet).forEach(token => {
        styles.push({
          id: `${tokenType}-${token}`,
          type: 'DESIGN_TOKEN',
          category: tokenType,
          value: token,
          source: 'figma'
        });
      });
    });

    console.log(`🎨 Extracted design tokens from Figma:`, {
      colors: designTokens.colors.size,
      typography: designTokens.typography.size,
      spacing: designTokens.spacing.size,
      borderRadius: designTokens.borderRadius.size,
      shadows: designTokens.shadows.size
    });
  }

  /**
   * Convert RGB color object to hex string
   * @param {Object} color - Figma color object {r, g, b, a?}
   * @returns {string} Hex color string
   */
  rgbToHex(color) {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    
    if (color.a !== undefined && color.a < 1) {
      const a = Math.round(color.a * 255);
      return `rgba(${r}, ${g}, ${b}, ${color.a})`;
    }
    
    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * Find a node by its ID in the Figma document tree
   * @param {Object} node - Current node to search
   * @param {string} targetId - ID to find
   * @returns {Object|null} Found node or null
   */
  findNodeById(node, targetId) {
    if (!node) return null;
    
    // Convert node ID to match Figma's format (e.g., "2:22260" or "2-22260")
    const normalizedTargetId = targetId.includes(':') ? targetId : targetId.replace('-', ':');
    const normalizedNodeId = node.id?.includes(':') ? node.id : node.id?.replace('-', ':');
    
    // Check if current node matches
    if (normalizedNodeId === normalizedTargetId) {
      return node;
    }
    
    // Search children
    if (node.children) {
      for (const child of node.children) {
        const found = this.findNodeById(child, targetId);
        if (found) return found;
      }
    }
    
    return null;
  }

  /**
   * Download a batch of images
   * @param {string} fileKey - Figma file key
   * @param {Array} nodes - Batch of nodes to download
   * @param {string} localPath - Local directory path
   * @param {Object} options - Export options
   * @returns {Array} Batch results
   */
  async downloadImageBatch(fileKey, nodes, localPath, options) {
    const { format, scale, svgOptions } = options;
    const nodeIds = nodes.map(n => n.nodeId);
    
    // Build export URL
    let exportUrl = `${this.baseUrl}/images/${fileKey}?ids=${nodeIds.join(',')}`;
    exportUrl += `&format=${format}`;
    
    if (format === 'png') {
      exportUrl += `&scale=${scale}`;
    } else if (format === 'svg') {
      if (svgOptions.includeId) exportUrl += '&svg_include_id=true';
      if (svgOptions.outlineText) exportUrl += '&svg_outline_text=true';
      if (svgOptions.simplifyStroke) exportUrl += '&svg_simplify_stroke=true';
    }
    
    // Get image URLs
    const response = await fetch(exportUrl, {
      headers: {
        'X-Figma-Token': this.apiKey
      }
    });
    
    if (!response.ok) {
      throw new Error(`Image export failed: ${response.status} ${response.statusText}`);
    }
    
    const imageData = await response.json();
    
    if (!imageData.images) {
      throw new Error('No image URLs received from Figma API');
    }
    
    // Download each image
    const results = [];
    
    for (const node of nodes) {
      try {
        const imageUrl = imageData.images[node.nodeId];
        
        if (!imageUrl) {
          throw new Error(`No image URL for node ${node.nodeId}`);
        }
        
        const result = await this.downloadImageFromUrl(imageUrl, node.fileName, localPath);
        results.push({
          nodeId: node.nodeId,
          fileName: node.fileName,
          localPath: result.localPath,
          success: true,
          size: result.size
        });
        
      } catch (error) {
        results.push({
          nodeId: node.nodeId,
          fileName: node.fileName,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * Download single image from URL
   * @param {string} imageUrl - Image URL
   * @param {string} fileName - Local file name
   * @param {string} localPath - Local directory path
   * @returns {Object} Download result
   */
  async downloadImageFromUrl(imageUrl, fileName, localPath) {
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }
    
    const imageBuffer = await response.arrayBuffer();
    const filePath = path.join(localPath, fileName);
    
    await fs.writeFile(filePath, Buffer.from(imageBuffer));
    
    return {
      localPath: filePath,
      size: imageBuffer.byteLength
    };
  }

  /**
   * Download single image (fallback method)
   * @param {string} fileKey - Figma file key
   * @param {Object} node - Node to download
   * @param {string} localPath - Local directory path
   * @param {Object} options - Export options
   * @returns {Object} Download result
   */
  async downloadSingleImage(fileKey, node, localPath, options) {
    const batch = await this.downloadImageBatch(fileKey, [node], localPath, options);
    return batch[0];
  }

  /**
   * Test the extractor functionality
   * @param {string} fileKey - Test file key
   * @returns {Object} Test results
   */
  async test(fileKey = 'xfMsPmqaYwrjxl4fog2o7X') {
    try {
      console.log('🧪 Testing Robust Figma Extractor...');
      
      // Test data extraction
      const data = await this.getFigmaData(fileKey);
      
      // Test image download (first 2 components)
      const testNodes = data.components.slice(0, 2).map((comp, index) => ({
        nodeId: comp.id,
        fileName: `test-${index + 1}-${comp.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`
      }));
      
      if (testNodes.length > 0) {
        const testOutputDir = './output/test-figma-extraction';
        const downloadResult = await this.downloadFigmaImages(fileKey, testNodes, testOutputDir);
        
        return {
          success: true,
          dataExtraction: {
            componentsFound: data.components.length,
            fileName: data.name
          },
          imageDownload: downloadResult
        };
      }
      
      return {
        success: true,
        dataExtraction: {
          componentsFound: data.components.length,
          fileName: data.name
        },
        imageDownload: { message: 'No components to test image download' }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Alias for downloadFigmaImages to match visual comparison interface
   * @param {string} fileKey - Figma file key
   * @param {Array} nodes - Array of {nodeId, fileName, imageRef?}
   * @param {string} localPath - Local directory path
   * @param {Object} options - Export options
   * @returns {Object} Download results
   */
  async downloadImages(fileKey, nodes, localPath, options = {}) {
    return await this.downloadFigmaImages(fileKey, nodes, localPath, options);
  }
} 