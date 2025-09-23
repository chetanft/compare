/**
 * Figma API Service for macOS App
 * Handles direct Figma API interactions
 */

import fetch from 'node-fetch';
import { colorElementMapping } from '../../src/services/ColorElementMappingService.js';

export class FigmaApiService {
  constructor(configService) {
    this.configService = configService;
  }

  /**
   * Get current API key
   * @returns {string|null} Figma API key
   */
  getApiKey() {
    return this.configService.getFigmaApiKey();
  }

  /**
   * Test Figma API connection
   * @param {string} apiKey - Optional API key to test (if not provided, uses config)
   * @returns {Object} Test result
   */
  async testConnection(apiKey = null) {
    const keyToTest = apiKey || this.getApiKey();
    
    if (!keyToTest) {
      return {
        success: false,
        error: 'No Figma API key provided. Please enter your Figma Personal Access Token.',
        type: 'no-token'
      };
    }

    try {
      console.log('🔍 Testing Figma API connection...');
      const testResponse = await fetch('https://api.figma.com/v1/me', {
        headers: { 'X-Figma-Token': keyToTest }
      });

      if (testResponse.ok) {
        const userData = await testResponse.json();
        console.log('✅ Figma API connection successful');

        // Save the API key if it was provided and is different
        if (apiKey && apiKey !== this.getApiKey()) {
          this.configService.saveFigmaApiKey(apiKey);
          console.log('💾 Figma API key saved to config');
        }

        return {
          success: true,
          message: `Connected to Figma API as ${userData.email || 'user'}`,
          type: 'figma-api',
          user: userData.email
        };
      } else {
        console.log('❌ Figma API connection failed:', testResponse.status);
        const errorData = await testResponse.json();
        return {
          success: false,
          error: `Figma API error: ${errorData.err || testResponse.statusText}`,
          type: 'invalid-token'
        };
      }
    } catch (error) {
      console.log('❌ Figma API connection error:', error.message);
      return {
        success: false,
        error: `Figma API connection failed: ${error.message}`,
        type: 'api-error'
      };
    }
  }

  /**
   * Validate Figma file access
   * @param {string} fileKey - Figma file key
   * @returns {Object} Validation result with user info and access status
   */
  async validateFileAccess(fileKey) {
    const apiKey = this.getApiKey();
    
    if (!apiKey) {
      return {
        success: false,
        error: 'Figma API key not configured. Please add your token in settings.',
        type: 'no-token'
      };
    }

    try {
      // First, get user info to provide helpful error messages
      console.log('🔍 Validating Figma API token...');
      const userResponse = await fetch('https://api.figma.com/v1/me', {
        headers: { 'X-Figma-Token': apiKey }
      });

      if (!userResponse.ok) {
        return {
          success: false,
          error: `Invalid Figma API token: ${userResponse.status} ${userResponse.statusText}`,
          type: 'invalid-token'
        };
      }

      const userData = await userResponse.json();
      console.log(`✅ Token valid for user: ${userData.email}`);

      // Now check file access with a lightweight request
      console.log(`🔍 Checking access to file: ${fileKey}...`);
      const fileResponse = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
        method: 'HEAD',
        headers: { 'X-Figma-Token': apiKey }
      });

      if (fileResponse.ok) {
        console.log('✅ File access confirmed');
        return {
          success: true,
          user: userData.email,
          fileKey: fileKey
        };
      } else if (fileResponse.status === 403) {
        return {
          success: false,
          error: `Access denied to Figma file. The file owner needs to share it with ${userData.email} (View permission required).`,
          type: 'access-denied',
          user: userData.email,
          fileKey: fileKey
        };
      } else if (fileResponse.status === 404) {
        return {
          success: false,
          error: `Figma file not found. Please verify the file key: ${fileKey}`,
          type: 'file-not-found',
          fileKey: fileKey
        };
      } else {
        return {
          success: false,
          error: `Figma API error: ${fileResponse.status} ${fileResponse.statusText}`,
          type: 'api-error'
        };
      }

    } catch (error) {
      if (error.name === 'TimeoutError') {
        return {
          success: false,
          error: 'Figma API timeout. Please check your connection and try again.',
          type: 'timeout'
        };
      }
      return {
        success: false,
        error: `Figma API validation failed: ${error.message}`,
        type: 'network-error'
      };
    }
  }

  /**
   * Extract components from Figma file
   * @param {string} fileKey - Figma file key
   * @param {string} nodeId - Optional node ID
   * @returns {Object} Extracted components data
   */
  async extractComponents(fileKey, nodeId = null) {
    const apiKey = this.getApiKey();
    
    if (!apiKey) {
      throw new Error('Figma API key not configured. Please add your token in settings.');
    }

    // Validate access first
    const validation = await this.validateFileAccess(fileKey);
    if (!validation.success) {
      throw new Error(validation.error);
    }

    try {
      // Build API URL
      let apiUrl = `https://api.figma.com/v1/files/${fileKey}`;
      if (nodeId) {
        apiUrl = `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${nodeId}`;
      }

      console.log('🎯 Fetching Figma data from API...');
      const response = await fetch(apiUrl, {
        headers: { 'X-Figma-Token': apiKey }
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error(`Access denied to Figma file. The file owner needs to share it with ${validation.user} (View permission required).`);
        } else if (response.status === 404) {
          throw new Error(`Figma file not found. Please verify the file key: ${fileKey}`);
        }
        throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Transform API response to component format
      return this.transformApiDataToComponents(data, fileKey, nodeId);

    } catch (error) {
      console.error('❌ Figma API extraction failed:', error);
      throw error;
    }
  }

  /**
   * Transform Figma API data to component format
   * @param {Object} apiData - Raw Figma API data
   * @param {string} fileKey - File key
   * @param {string} nodeId - Node ID
   * @returns {Object} Transformed component data
   */
  transformApiDataToComponents(apiData, fileKey, nodeId) {
    const components = [];
    // Collections to aggregate design properties
    const colorSet = new Set();
    const fontFamilySet = new Set();
    const fontSizeSet = new Set();
    const fontWeightSet = new Set();
    const spacingSet = new Set();
    const borderRadiusSet = new Set();

    try {
      // Handle different API response structures
      let nodesToProcess = [];
      
      if (apiData.nodes) {
        // Node-specific request
        Object.values(apiData.nodes).forEach(nodeData => {
          if (nodeData.document) {
            nodesToProcess.push(nodeData.document);
          }
        });
      } else if (apiData.document) {
        // Full file request
        nodesToProcess = [apiData.document];
      }

      // Process each node recursively and collect design properties
      for (const node of nodesToProcess) {
        this.extractNodeComponents(node, components, {
          colorSet,
          fontFamilySet,
          fontSizeSet,
          fontWeightSet,
          spacingSet,
          borderRadiusSet
        });
      }

      return {
        elements: components,
        // Aggregate design properties like web extractor
        colorPalette: Array.from(colorSet).slice(0, 50),
        typography: {
          fontFamilies: Array.from(fontFamilySet).slice(0, 20),
          fontSizes: Array.from(fontSizeSet).slice(0, 20),
          fontWeights: Array.from(fontWeightSet).slice(0, 10)
        },
        spacing: Array.from(spacingSet).slice(0, 30),
        borderRadius: Array.from(borderRadiusSet).slice(0, 20),
        metadata: {
          fileName: apiData.name || 'Unknown',
          fileKey: fileKey,
          nodeId: nodeId,
          extractionMethod: 'Direct Figma API',
          extractedAt: new Date().toISOString(),
          totalElements: components.length
        }
      };

    } catch (error) {
      console.error('❌ Error transforming Figma API data:', error);
      return {
        elements: [],
        metadata: {
          fileName: 'Error',
          fileKey: fileKey,
          extractionMethod: 'Direct Figma API',
          error: error.message
        }
      };
    }
  }

  /**
   * Extract components from a node recursively
   * @param {Object} node - Figma node
   * @param {Array} components - Array to add components to
   * @param {Object} collections - Collections to aggregate design properties
   */
  extractNodeComponents(node, components, collections = {}) {
    if (!node) return;

    const {
      colorSet = new Set(),
      fontFamilySet = new Set(),
      fontSizeSet = new Set(),
      fontWeightSet = new Set(),
      spacingSet = new Set(),
      borderRadiusSet = new Set()
    } = collections;

    // Transform node to component format
    const component = {
      id: node.id,
      name: node.name || `Node ${node.id}`,
      type: node.type || 'UNKNOWN',
      properties: {}
    };

    // Extract dimensions and position
    if (node.absoluteBoundingBox) {
      component.properties.width = node.absoluteBoundingBox.width;
      component.properties.height = node.absoluteBoundingBox.height;
      component.properties.x = node.absoluteBoundingBox.x;
      component.properties.y = node.absoluteBoundingBox.y;
    }

    // Extract fills/colors
    if (node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
      const validFills = node.fills.filter(fill => fill.visible !== false && fill.color);
      if (validFills.length > 0) {
        component.properties.fills = validFills.map(fill => {
          const hexColor = this.rgbaToHex(fill.color);
          // Add to color palette
          colorSet.add(hexColor);
          
          // Add to color-element mapping
            colorElementMapping.addColorElementAssociation(
              hexColor,
              component,
              'fill',
              'figma'
            );
          
          return {
            type: fill.type,
            color: hexColor,
            opacity: fill.opacity || 1
          };
        });
        component.properties.backgroundColor = this.rgbaToHex(validFills[0].color);
      }
    }

    // Extract stroke/border colors
    if (node.strokes && Array.isArray(node.strokes) && node.strokes.length > 0) {
      const validStrokes = node.strokes.filter(stroke => stroke.visible !== false && stroke.color);
      if (validStrokes.length > 0) {
        validStrokes.forEach(stroke => {
          const hexColor = this.rgbaToHex(stroke.color);
          colorSet.add(hexColor);
          
          // Add to color-element mapping
          colorElementMapping.addColorElementAssociation(
            hexColor,
            component,
            'stroke',
            'figma'
          );
        });
        component.properties.borderColor = this.rgbaToHex(validStrokes[0].color);
      }
    }

    // Extract text properties
    if (node.type === 'TEXT') {
      component.properties.textContent = node.characters || node.name;
      if (node.style) {
        component.properties.fontSize = node.style.fontSize;
        component.properties.fontFamily = node.style.fontFamily;
        component.properties.fontWeight = node.style.fontWeight;
        
        // Extract text color if available
        if (node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
          const textFill = node.fills.find(fill => fill.visible !== false && fill.color);
          if (textFill) {
            const hexColor = this.rgbaToHex(textFill.color);
            component.properties.color = hexColor;
            colorSet.add(hexColor);
            
            // Add to color-element mapping
            colorElementMapping.addColorElementAssociation(
              hexColor,
              component,
              'text',
              'figma'
            );
          }
        }
        
        // Add to typography collections
        if (node.style.fontFamily) {
          fontFamilySet.add(node.style.fontFamily);
        }
        if (node.style.fontSize) {
          fontSizeSet.add(`${node.style.fontSize}px`);
        }
        if (node.style.fontWeight) {
          fontWeightSet.add(node.style.fontWeight.toString());
        }
      }
    }

    // Extract spacing properties
    if (node.paddingLeft !== undefined || node.paddingTop !== undefined || 
        node.paddingRight !== undefined || node.paddingBottom !== undefined) {
      const padding = [
        node.paddingTop || 0,
        node.paddingRight || 0,
        node.paddingBottom || 0,
        node.paddingLeft || 0
      ];
      if (padding.some(p => p > 0)) {
        spacingSet.add(`padding: ${padding.join('px ')}px`);
      }
    }

    // Extract border radius
    if (node.cornerRadius !== undefined) {
      component.properties.borderRadius = node.cornerRadius;
      if (node.cornerRadius > 0) {
        borderRadiusSet.add(`${node.cornerRadius}px`);
      }
    }

    // Extract individual corner radii
    if (node.rectangleCornerRadii && Array.isArray(node.rectangleCornerRadii)) {
      node.rectangleCornerRadii.forEach(radius => {
        if (radius > 0) {
          borderRadiusSet.add(`${radius}px`);
        }
      });
    }

    // Add component if it has meaningful properties
    if (this.isMeaningfulComponent(component)) {
      components.push(component);
    }

    // Process children recursively
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        this.extractNodeComponents(child, components, collections);
      }
    }
  }

  /**
   * Check if component is meaningful for comparison
   * @param {Object} component - Component to check
   * @returns {boolean} True if meaningful
   */
  isMeaningfulComponent(component) {
    return component.properties.width || component.properties.height ||
           component.properties.textContent || component.properties.fills ||
           component.properties.backgroundColor || component.type === 'TEXT' ||
           ['FRAME', 'COMPONENT', 'INSTANCE', 'RECTANGLE', 'ELLIPSE'].includes(component.type);
  }

  /**
   * Convert RGBA to hex color
   * @param {Object} rgba - RGBA color object
   * @returns {string} Hex color string
   */
  rgbaToHex(rgba) {
    if (!rgba || typeof rgba !== 'object') return '#000000';
    
    const r = Math.round((rgba.r || 0) * 255);
    const g = Math.round((rgba.g || 0) * 255);
    const b = Math.round((rgba.b || 0) * 255);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}
