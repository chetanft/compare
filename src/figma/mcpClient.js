/**
 * Clean Figma Dev Mode MCP Client
 * Handles JSON-RPC 2.0 over Server-Sent Events (SSE)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Singleton MCP client to maintain session state
let globalMCPClient = null;

export class FigmaMCPClient {
  constructor() {
    if (globalMCPClient) {
      return globalMCPClient;
    }
    
    this.baseUrl = 'http://127.0.0.1:3845';
    this.endpoint = '/mcp';
    this.sessionId = null;
    this.isConnected = false;
    this.requestId = 0;
    this.configPath = path.join(__dirname, '../../config.json');
    
    globalMCPClient = this;
  }

  /**
   * Load Figma API key from config file
   */
  loadFigmaApiKey() {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        return configData.figmaApiKey || '';
      }
    } catch (error) {
    }
    return '';
  }

  /**
   * Check if MCP server is available and initialize
   */
  async connect() {
    try {
      
      // Initialize session
      this.requestId = 1;
      
      const initRequest = {
        jsonrpc: '2.0',
        id: this.requestId,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {
            roots: {
              listChanged: true
            }
          },
          clientInfo: {
            name: 'figma-comparison-tool',
            version: '1.0.0'
          }
        }
      };
      
      const response = await fetch(`${this.baseUrl}${this.endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream'
        },
        body: JSON.stringify(initRequest)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Parse SSE response
      const responseText = await response.text();
      const result = this.parseSSEResponse(responseText);
      
      if (result.error) {
        throw new Error(`MCP Error: ${result.error.message}`);
      }

      this.sessionId = result.result?.sessionId;
      this.isConnected = true;
      
      return true;
    } catch (error) {
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Parse Server-Sent Events response
   */
  parseSSEResponse(text) {
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const jsonData = JSON.parse(line.substring(6));
          return jsonData;
        } catch (e) {
          console.warn('Failed to parse SSE data line:', line);
          continue;
        }
      }
    }
    throw new Error('No valid JSON data found in SSE response');
  }

  /**
   * Call MCP method
   */
  async callMethod(method, params = {}) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      this.requestId++;
      
      const requestBody = {
        jsonrpc: '2.0',
        id: this.requestId,
        method,
        params
      };

      const response = await fetch(`${this.baseUrl}${this.endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();
      
      // Handle both SSE and direct JSON responses
      let result;
      if (responseText.includes('event: message')) {
        result = this.parseSSEResponse(responseText);
      } else {
        try {
          result = JSON.parse(responseText);
        } catch (e) {
          throw new Error(`Invalid JSON response: ${responseText}`);
        }
      }

      if (result.error) {
        throw new Error(`MCP Error: ${result.error.message}`);
      }

      return result.result;
    } catch (error) {
      console.error(`❌ MCP method ${method} failed:`, error.message);
      throw error;
    }
  }

  /**
   * Get available MCP tools
   */
  async getTools() {
    return await this.callMethod('tools/list');
  }

  /**
   * Extract Figma data using MCP tools
   */
  async extractFigmaData(figmaUrl) {
    try {
      
      // Ensure we're connected
      if (!this.isConnected) {
        await this.connect();
      }
      
      // Parse Figma URL to get fileKey
      const match = figmaUrl.match(/(?:file|design)\/([a-zA-Z0-9]+)/);
      if (!match) {
        throw new Error('Invalid Figma URL format');
      }
      const fileKey = match[1];

      // Extract node ID if present and convert format (URL: 2-22260 -> API: 2:22260)
      const nodeMatch = figmaUrl.match(/node-id=([^&]+)/);
      const nodeId = nodeMatch ? decodeURIComponent(nodeMatch[1]).replace(/-/g, ':') : null;

      // Check if Figma API token is available - prefer config file over environment variable
      const figmaApiKey = this.loadFigmaApiKey() || process.env.FIGMA_API_KEY;
      
      if (figmaApiKey) {
        
        try {
          // Get both node data and styles
          let nodeUrl, nodeData;
          
          if (nodeId) {
            nodeUrl = `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${nodeId}`;
          } else {
            nodeUrl = `https://api.figma.com/v1/files/${fileKey}`;
          }
          
          // Get node data and local styles
          const nodeResponse = await fetch(nodeUrl, { 
            headers: { 'X-Figma-Token': figmaApiKey }
          });
          
          if (!nodeResponse.ok) {
            throw new Error(`Figma API error (nodes): ${nodeResponse.status} ${nodeResponse.statusText}`);
          }
          
          const nodeJson = await nodeResponse.json();
          
          // Get local styles
          const stylesUrl = `https://api.figma.com/v1/files/${fileKey}/styles`;
          const stylesResponse = await fetch(stylesUrl, {
            headers: { 'X-Figma-Token': figmaApiKey }
          });
          
          // Create style lookup map
          const styleMap = {};
          if (stylesResponse.ok) {
            const stylesJson = await stylesResponse.json();
            if (stylesJson.meta?.styles) {
              Object.values(stylesJson.meta.styles).forEach(style => {
                if (style.style_type === 'FILL') {
                  styleMap[style.node_id] = style.name;
                }
              });
            }
          } else {
          }
          
          // Combine node and styles data
          const variableData = {
            ...nodeJson,
            styleMap
          };
          
          // Process the data into our expected format
          const processedData = this.processVariableData(variableData, fileKey, nodeId);
          
          return processedData;
          
        } catch (apiError) {
          throw new Error(`Figma API extraction failed: ${apiError.message}`);
        }
      }
      
      // No API key available - try MCP tools
      
      try {
        // Try to get actual tools list
        const tools = await this.callMethod('tools/list');
        
        // Try to get resources
        const resources = await this.callMethod('resources/list');
        
        // If we get here, tools are working - extract real data
        throw new Error('MCP tools are available but data extraction not yet implemented');
        
      } catch (toolError) {
        throw new Error(`No Figma API key provided and MCP tools not working. Please provide FIGMA_API_KEY environment variable or fix MCP server.`);
      }

      // Process the data into our expected format
      const processedData = this.processVariableData(variableData, fileKey);
      
      return processedData;
    } catch (error) {
      console.error('❌ MCP Figma extraction failed:', error.message);
      throw error;
    }
  }

  /**
   * Process variable data into our expected format
   */
  processVariableData(data, fileKey, nodeId = null) {
    // This method should only be called with REAL data from Figma
    // No mock data - extract actual design tokens from the provided data
    
    const colors = [];
    const typography = [];
    const components = [];
    
    let documentData;
    let fileName;
    
    if (nodeId && data.nodes && data.nodes[nodeId]) {
      // Node-specific extraction
      documentData = data.nodes[nodeId].document;
      fileName = documentData.name || 'Figma Frame';
    } else if (data.document) {
      // Entire file extraction
      documentData = data.document;
      fileName = data.name || 'Figma Design';
    } else {
      console.warn('⚠️ No valid document data found');
      documentData = null;
      fileName = 'Unknown';
    }
    
    // Process real Figma data structure
    if (documentData?.children) {
      this.extractColors(documentData.children, colors);
      this.extractTypography(documentData.children, typography);
      this.extractComponents(documentData.children, components);
    } else if (documentData && !documentData.children) {
      // Handle case where the node itself has no children but has properties
      this.extractColors([documentData], colors);
      this.extractTypography([documentData], typography);
      this.extractComponents([documentData], components);
    }

    return {
      colors,
      typography,
      components,
      styles: data.styles || {},
      tokens: {
        colors,
        typography,
        spacing: [], // Real spacing would be extracted from data
        borderRadius: [], // Real border radius would be extracted from data
        shadows: [] // Real shadows would be extracted from data
      },
      metadata: {
        fileName: fileName,
        extractedAt: new Date().toISOString(),
        extractionMethod: 'figma-dev-mode-mcp',
        fileKey,
        nodeId: nodeId || null,
        componentCount: components.length,
        colorCount: colors.length,
        typographyCount: typography.length,
        version: '1.0.0'
      }
    };
  }

  /**
   * Extract colors from Figma data
   */
  extractColors(nodes, colors, uniqueColors = new Set()) {
    for (const node of nodes) {
      if (node.fills) {
        for (const fill of node.fills) {
          if (fill.type === 'SOLID' && fill.color) {
            const { r, g, b } = fill.color;
            const alpha = fill.opacity || 1;
            const hex = this.rgbToHex(r * 255, g * 255, b * 255);
            
            // Only add if we haven't seen this color before
            if (!uniqueColors.has(hex)) {
              uniqueColors.add(hex);
              
              // Try to get style name if this fill has a style
              let colorName = node.name || 'Unnamed Color';
              if (node.styles?.fills) {
                const styleId = node.styles.fills;
                colorName = node.styleMap?.[styleId] || colorName;
              }
              
              colors.push({
                name: colorName,
                value: `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha})`,
                hex: hex,
                source: 'figma',
                nodeId: node.id,
                styleId: node.styles?.fills || null
              });
            }
          }
        }
      }
      
      if (node.children) {
        this.extractColors(node.children, colors, uniqueColors);
      }
    }
  }

  /**
   * Extract typography from Figma data
   */
  extractTypography(nodes, typography, uniqueStyles = new Set()) {
    for (const node of nodes) {
      if (node.type === 'TEXT' && node.style) {
        const fontFamily = node.style.fontFamily || 'Inter';
        const fontSize = node.style.fontSize || 16;
        const fontWeight = node.style.fontWeight || 400;
        const lineHeight = node.style.lineHeightPx || fontSize * 1.2;
        const letterSpacing = node.style.letterSpacing || 0;
        
        // Create unique key for this typography style
        const styleKey = `${fontFamily}-${fontSize}-${fontWeight}-${lineHeight}-${letterSpacing}`;
        
        // Only add if we haven't seen this style before
        if (!uniqueStyles.has(styleKey)) {
          uniqueStyles.add(styleKey);
          typography.push({
            name: node.name || 'Unnamed Text',
            fontFamily: fontFamily,
            fontSize: fontSize,
            fontWeight: fontWeight,
            lineHeight: lineHeight,
            letterSpacing: letterSpacing,
            source: 'figma',
            nodeId: node.id
          });
        }
      }
      
      if (node.children) {
        this.extractTypography(node.children, typography, uniqueStyles);
      }
    }
  }

  /**
   * Extract components from Figma data
   */
  extractComponents(nodes, components, seenIds = new Set(), parentComponent = null) {
    for (const node of nodes) {
      // Skip if we've already processed this node
      if (seenIds.has(node.id)) {
        continue;
      }
      seenIds.add(node.id);
      
      // Check if this is a top-level component or instance
      const isTopLevel = !parentComponent && (
        node.type === 'COMPONENT' || 
        node.type === 'COMPONENT_SET' || 
        (node.type === 'INSTANCE' && node.componentId)
      );
      
      if (isTopLevel) {
        // Get component name - for instances, try to get the main component name
        let componentName = node.name;
        let componentType = node.type;
        let componentProps = {};
        
        // For instances, get the component properties and overrides
        if (node.type === 'INSTANCE') {
          // Get component properties if available
          if (node.componentProperties) {
            Object.entries(node.componentProperties).forEach(([key, prop]) => {
              if (prop && typeof prop === 'object') {
                componentProps[key] = {
                  type: prop.type,
                  value: prop.value,
                  defaultValue: prop.defaultValue
                };
              }
            });
          }
          
          // Get property references if available
          if (node.componentPropertyReferences) {
            Object.entries(node.componentPropertyReferences).forEach(([key, ref]) => {
              if (!componentProps[key]) {
                componentProps[key] = {};
              }
              componentProps[key].reference = ref;
            });
          }
          
          // Get overrides if available
          if (node.overrides) {
            componentProps.overrides = node.overrides.map(override => ({
              id: override.id,
              fields: override.overriddenFields
            }));
          }
        }
        
        // Process component properties into a more useful format
        const processedProps = {
          variants: {},  // Variant properties like Size, State, etc.
          text: {},     // Text content overrides
          styles: {},   // Style overrides (fills, strokes)
          layout: {},   // Layout properties
          variables: {} // Design token variables
        };
        
        // Process variant properties
        if (componentProps) {
          Object.entries(componentProps).forEach(([key, prop]) => {
            if (prop && prop.type === 'VARIANT') {
              processedProps.variants[key] = prop.value;
            }
          });
        }
        
        // Process overrides
        if (componentProps.overrides) {
          componentProps.overrides.forEach(override => {
            if (override.fields.includes('characters')) {
              processedProps.text[override.id] = 'Text content override';
            }
            if (override.fields.includes('fills') || override.fields.includes('strokes')) {
              processedProps.styles[override.id] = override.fields.join(', ');
            }
          });
        }
        
        // Process styles
        if (node.styles) {
          processedProps.styles = {
            ...processedProps.styles,
            ...node.styles
          };
        }
        
        // Process bound variables (design tokens)
        if (node.boundVariables) {
          Object.entries(node.boundVariables).forEach(([key, value]) => {
            if (value && typeof value === 'object') {
              if (Array.isArray(value)) {
                processedProps.variables[key] = value.map(v => v.id || v);
              } else {
                processedProps.variables[key] = value.id || value;
              }
            }
          });
        }
        
        // Add layout properties
        if (node.layoutMode) {
          processedProps.layout = {
            mode: node.layoutMode,
            padding: {
              left: node.paddingLeft || 0,
              right: node.paddingRight || 0,
              top: node.paddingTop || 0,
              bottom: node.paddingBottom || 0
            },
            spacing: node.itemSpacing || 0,
            width: node.width || 0,
            height: node.height || 0
          };
        }
        
        // Add the component to our list with processed properties
        components.push({
          id: node.id,
          name: componentName,
          type: componentType,
          description: node.description || '',
          source: 'figma',
          componentId: node.componentId || null,
          mainComponentId: node.mainComponent?.id || null,
          properties: processedProps
        });
        
        // Process children with this component as parent
        if (node.children) {
          this.extractComponents(node.children, components, seenIds, node);
        }
      } else {
        // Not a top-level component, just process children
        if (node.children) {
          this.extractComponents(node.children, components, seenIds, parentComponent);
        }
      }
    }
  }

  /**
   * Convert RGB to hex
   */
  rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1);
  }
} 