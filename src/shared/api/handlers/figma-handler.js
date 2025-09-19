/**
 * Unified Figma API Handler
 * Shared between web and macOS apps
 */

import fetch from 'node-fetch';

export class FigmaHandler {
  constructor(config, platformAdapter) {
    this.config = config;
    this.platformAdapter = platformAdapter;
  }

  /**
   * Test Figma API connection
   * Unified handler for both platforms
   */
  static async testConnection(req, res, config) {
    try {
      const { figmaPersonalAccessToken } = req.body || {};
      
      // Use provided token or load from config
      const apiKey = figmaPersonalAccessToken || config.get('figmaApiKey');
      
      if (!apiKey) {
        return res.json({
          success: false,
          error: 'No Figma API key provided. Please enter your Figma Personal Access Token.',
          type: 'no-token'
        });
      }
      
      // Test Figma API connection
      try {
        const testResponse = await fetch('https://api.figma.com/v1/me', {
          headers: {
            'X-Figma-Token': apiKey
          },
          timeout: config.get('figmaTimeout', 30000)
        });
        
        if (testResponse.ok) {
          const userData = await testResponse.json();
          
          // Save the API key if it was provided in the request
          if (figmaPersonalAccessToken) {
            config.set('figmaApiKey', figmaPersonalAccessToken);
          }
          
          return res.json({
            success: true,
            message: `Connected to Figma API as ${userData.email || 'user'}`,
            type: 'figma-api',
            user: userData.email,
            id: userData.id,
            handle: userData.handle
          });
        } else {
          const errorData = await testResponse.json().catch(() => ({}));
          return res.json({
            success: false,
            error: `Figma API error: ${errorData.err || testResponse.statusText}`,
            type: 'invalid-token',
            status: testResponse.status
          });
        }
      } catch (apiError) {
        console.error('❌ Figma API connection error:', apiError);
        return res.json({
          success: false,
          error: `Figma API connection failed: ${apiError.message}`,
          type: 'api-error'
        });
      }
      
    } catch (error) {
      console.error('❌ Connection test error:', error);
      return res.status(500).json({
        success: false,
        error: `Connection test failed: ${error.message}`,
        type: 'server-error'
      });
    }
  }

  /**
   * Test endpoint to verify backend connectivity
   */
  static async testEndpoint(req, res, config) {
    console.log('🧪 Test endpoint called');
    return res.json({
      success: true,
      message: 'Backend is working!',
      timestamp: new Date().toISOString(),
      config: {
        figmaApiKeyConfigured: !!config.get('figmaApiKey'),
        figmaTimeout: config.get('figmaTimeout', 30000)
      }
    });
  }

  /**
   * Extract Figma file data (OPTIMIZED)
   * Unified handler for both platforms with performance improvements
   */
  static async extract(req, res, config, services) {
    const startTime = Date.now();
    
    try {
      console.log('🚀 Figma extract endpoint called');
      console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
      
      // Handle both web app format (figmaUrl) and direct format (url)
      const { 
        figmaUrl,           // Web app format
        url,                // Direct format
        extractionMode,     // Web app format
        nodeId, 
        figmaPersonalAccessToken,
        skipAnalysis = false,  
        lightMode = true       
      } = req.body || {};
      
      // Use figmaUrl if provided (web app format), otherwise use url
      const figmaUrlToUse = figmaUrl || url;
      
      if (!figmaUrlToUse) {
        console.error('❌ No Figma URL provided in request');
        return res.status(400).json({
          success: false,
          error: 'Figma URL is required (provide either figmaUrl or url)'
        });
      }

      console.log(`🚀 Starting Figma extraction for: ${figmaUrlToUse}`);

      // Parse Figma URL to extract file ID and node ID
      const fileId = FigmaHandler.parseFileId(figmaUrlToUse);
      const parsedNodeId = nodeId || FigmaHandler.parseNodeId(figmaUrlToUse);
      
      console.log(`📋 Parsed file ID: ${fileId}`);
      console.log(`📋 Parsed node ID: ${parsedNodeId}`);
      
      if (!fileId) {
        console.error(`❌ Failed to parse file ID from URL: ${figmaUrlToUse}`);
        return res.status(400).json({
          success: false,
          error: 'Invalid Figma URL format. Expected format: https://figma.com/design/FILE_ID or https://figma.com/file/FILE_ID'
        });
      }

      // Get API key
      const apiKey = figmaPersonalAccessToken || config.get('figmaApiKey');
      if (!apiKey) {
        return res.status(400).json({
          success: false,
          error: 'Figma API key is required'
        });
      }

      // Build optimized API URL
      let apiUrl = `https://api.figma.com/v1/files/${fileId}`;
      
      // If we have a specific node, use the nodes endpoint for faster response
      if (parsedNodeId && lightMode) {
        apiUrl += `/nodes?ids=${parsedNodeId}`;
        console.log(`⚡ Using optimized nodes endpoint for node: ${parsedNodeId}`);
      } else if (lightMode) {
        // Add query parameters to reduce response size
        apiUrl += '?depth=2&geometry=paths'; // Limit depth and geometry for faster response
        console.log('⚡ Using light mode with limited depth');
      }

      console.log(`📡 Making Figma API request: ${apiUrl}`);

      // Make API request with robust timeout handling
      const timeout = lightMode ? 10000 : config.get('figmaTimeout', 20000); // Reduced timeouts
      
      console.log(`⏰ Setting timeout to ${timeout}ms (lightMode: ${lightMode})`);
      console.log(`🔑 API key configured: ${apiKey ? 'Yes (length: ' + apiKey.length + ')' : 'No'}`);
      
      // Test API key first with a simple request
      console.log('🧪 Testing API key with /v1/me endpoint...');
      
      try {
        const testResponse = await fetch('https://api.figma.com/v1/me', {
          headers: { 'X-Figma-Token': apiKey },
          signal: AbortSignal.timeout(5000) // 5 second timeout for test
        });
        
        if (!testResponse.ok) {
          const errorData = await testResponse.json().catch(() => ({}));
          console.error('❌ API key test failed:', testResponse.status, errorData);
          return res.status(401).json({
            success: false,
            error: `Invalid Figma API key: ${errorData.err || testResponse.statusText}`,
            type: 'invalid-token'
          });
        }
        
        const userData = await testResponse.json();
        console.log(`✅ API key valid for user: ${userData.email}`);
        
      } catch (testError) {
        console.error('❌ API key test error:', testError.message);
        return res.status(401).json({
          success: false,
          error: `Figma API key test failed: ${testError.message}`,
          type: 'api-error'
        });
      }
      
      console.log(`📡 Making Figma API request to: ${apiUrl}`);
      
      try {
        // Use AbortSignal.timeout for better reliability
        const response = await fetch(apiUrl, {
          headers: {
            'X-Figma-Token': apiKey
          },
          signal: AbortSignal.timeout(timeout)
        });

        console.log(`✅ Figma API response received (${Date.now() - startTime}ms)`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error(`❌ Figma API error: ${response.status} - ${errorData.err || response.statusText}`);
          return res.status(response.status).json({
            success: false,
            error: `Figma API error: ${errorData.err || response.statusText}`,
            status: response.status
          });
        }

        const figmaData = await response.json();
        console.log(`📊 Figma data received, processing...`);
        
        // Process data with performance options
        const processedData = await FigmaHandler.processFigmaDataOptimized(
          figmaData, 
          { url: figmaUrlToUse, fileId, nodeId: parsedNodeId, lightMode, skipAnalysis }
        );

        const totalTime = Date.now() - startTime;
        console.log(`🎉 Figma extraction completed in ${totalTime}ms`);

        return res.json({
          success: true,
          data: processedData,
          metadata: {
            fileId,
            nodeId: parsedNodeId,
            extractedAt: new Date().toISOString(),
            source: 'figma-api',
            lightMode,
            skipAnalysis,
            processingTime: totalTime
          }
        });

      } catch (fetchError) {
        const totalTime = Date.now() - startTime;
        console.error(`❌ Figma API request failed after ${totalTime}ms:`, fetchError.message);
        
        if (fetchError.name === 'TimeoutError' || fetchError.message.includes('timed out') || fetchError.message.includes('aborted')) {
          return res.status(408).json({
            success: false,
            error: `Figma extraction timed out after ${timeout}ms. The file might be too large or the API is slow.`,
            type: 'timeout',
            processingTime: totalTime,
            suggestions: [
              'Use a specific node URL (with ?node-id=)',
              'Try the "Frame Only" extraction mode',
              'Check your internet connection',
              'Verify the Figma file is accessible'
            ]
          });
        }
        
        if (fetchError.message.includes('network') || fetchError.message.includes('ENOTFOUND')) {
          return res.status(503).json({
            success: false,
            error: 'Network error: Unable to connect to Figma API. Please check your internet connection.',
            type: 'network-error',
            processingTime: totalTime
          });
        }
        
        throw fetchError;
      }

    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ Figma extraction error after ${totalTime}ms:`, error);
      
      return res.status(500).json({
        success: false,
        error: `Figma extraction failed: ${error.message}`,
        processingTime: totalTime
      });
    }
  }

  /**
   * Parse Figma file ID from URL
   */
  static parseFileId(url) {
    try {
      const urlObj = new URL(url);
      
      // Handle different Figma URL formats
      const pathMatch = urlObj.pathname.match(/\/(?:file|design)\/([a-zA-Z0-9]+)/);
      if (pathMatch) {
        return pathMatch[1];
      }
      
      return null;
    } catch (error) {
      console.error('❌ URL parsing error:', error);
      return null;
    }
  }

  /**
   * Parse node ID from URL (FIXED - handles multiple formats)
   */
  static parseNodeId(url) {
    try {
      const urlObj = new URL(url);
      let nodeId = urlObj.searchParams.get('node-id');
      
      if (nodeId) {
        console.log(`🔍 Raw node-id from URL: ${nodeId}`);
        
        // Handle different node ID formats:
        // 1. URL-encoded colons: "123%3A456" -> "123:456"
        nodeId = nodeId.replace(/%3A/g, ':');
        
        // 2. Dash format: "123-456" -> "123:456" (common in newer Figma URLs)
        if (!nodeId.includes(':') && nodeId.includes('-')) {
          // Only convert first dash to colon, preserve other dashes
          nodeId = nodeId.replace('-', ':');
          console.log(`🔄 Converted dash format to: ${nodeId}`);
        }
        
        console.log(`✅ Final parsed node-id: ${nodeId}`);
        return nodeId;
      }
      
      console.log('⚠️ No node-id found in URL');
      return null;
    } catch (error) {
      console.error('❌ Node ID parsing error:', error);
      return null;
    }
  }

  /**
   * Process and enhance Figma data (OPTIMIZED)
   */
  static async processFigmaDataOptimized(figmaData, options = {}) {
    const { lightMode = true, skipAnalysis = false } = options;
    const startTime = Date.now();
    
    try {
      const processed = {
        ...figmaData,
        metadata: {
          ...options,
          processedAt: new Date().toISOString(),
          lightMode,
          skipAnalysis
        }
      };

      // Skip heavy analysis if requested
      if (skipAnalysis) {
        console.log('⚡ Skipping analysis for faster response');
        return processed;
      }

      // Light analysis for better performance
      if (lightMode) {
        console.log('⚡ Running light analysis...');
        
        // Quick analysis without deep traversal
        if (figmaData.document) {
          processed.analysis = FigmaHandler.analyzeFigmaComponentsLight(figmaData.document);
        }

        // Quick node analysis with standardized fields
        if (figmaData.nodes) {
          const nodeAnalysis = Object.keys(figmaData.nodes).map(nodeId => ({
            nodeId,
            ...FigmaHandler.analyzeNodeLight(figmaData.nodes[nodeId])
          }));
          
          // STANDARDIZED FIELDS (preferred)
          processed.components = nodeAnalysis; // Standard field name
          processed.componentCount = nodeAnalysis.length; // Standard count
          
          // LEGACY FIELDS (maintained for backward compatibility)
          processed.nodeAnalysis = nodeAnalysis; // Keep original field
        }
      } else {
        console.log('🔍 Running full analysis...');
        
        // Full analysis (original behavior)
        if (figmaData.document) {
          processed.analysis = FigmaHandler.analyzeFigmaComponents(figmaData.document);
        }

        if (figmaData.nodes) {
          const nodeAnalysis = Object.keys(figmaData.nodes).map(nodeId => ({
            nodeId,
            ...FigmaHandler.analyzeNode(figmaData.nodes[nodeId])
          }));
          
          // STANDARDIZED FIELDS (preferred)
          processed.components = nodeAnalysis; // Standard field name
          processed.componentCount = nodeAnalysis.length; // Standard count
          
          // LEGACY FIELDS (maintained for backward compatibility)
          processed.nodeAnalysis = nodeAnalysis; // Keep original field
        }
      }

      const processingTime = Date.now() - startTime;
      processed.metadata.dataProcessingTime = processingTime;
      console.log(`✅ Data processing completed in ${processingTime}ms`);

      return processed;
    } catch (error) {
      console.error('❌ Data processing error:', error);
      return {
        ...figmaData,
        metadata: {
          ...options,
          processedAt: new Date().toISOString(),
          processingError: error.message
        }
      };
    }
  }

  /**
   * Process and enhance Figma data (LEGACY - kept for compatibility)
   */
  static processFigmaData(figmaData, metadata) {
    // Use the optimized version with full analysis
    return FigmaHandler.processFigmaDataOptimized(figmaData, { 
      ...metadata, 
      lightMode: false, 
      skipAnalysis: false 
    });
  }

  /**
   * Analyze Figma components
   */
  static analyzeFigmaComponents(document) {
    const analysis = {
      totalNodes: 0,
      nodeTypes: {},
      components: [],
      textNodes: [],
      imageNodes: []
    };

    function traverseNode(node) {
      analysis.totalNodes++;
      
      // Count node types
      analysis.nodeTypes[node.type] = (analysis.nodeTypes[node.type] || 0) + 1;
      
      // Collect components
      if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
        analysis.components.push({
          id: node.id,
          name: node.name,
          type: node.type
        });
      }
      
      // Collect text nodes
      if (node.type === 'TEXT') {
        analysis.textNodes.push({
          id: node.id,
          name: node.name,
          characters: node.characters
        });
      }
      
      // Collect image nodes
      if (node.type === 'RECTANGLE' && node.fills && node.fills.some(fill => fill.type === 'IMAGE')) {
        analysis.imageNodes.push({
          id: node.id,
          name: node.name
        });
      }
      
      // Traverse children
      if (node.children) {
        node.children.forEach(traverseNode);
      }
    }

    traverseNode(document);
    return analysis;
  }

  /**
   * Analyze Figma components (LIGHT VERSION - faster)
   */
  static analyzeFigmaComponentsLight(document) {
    const analysis = {
      totalNodes: 0,
      nodeTypes: {},
      components: [],
      textNodes: [],
      imageNodes: [],
      maxDepth: 3 // Limit traversal depth
    };

    function traverseNodeLight(node, depth = 0) {
      // Stop traversal if we've gone too deep
      if (depth > analysis.maxDepth) {
        return;
      }

      analysis.totalNodes++;
      
      // Count node types
      analysis.nodeTypes[node.type] = (analysis.nodeTypes[node.type] || 0) + 1;
      
      // Only collect key components (limit to first 50 of each type)
      if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
        if (analysis.components.length < 50) {
          analysis.components.push({
            id: node.id,
            name: node.name,
            type: node.type
          });
        }
      }
      
      if (node.type === 'TEXT' && analysis.textNodes.length < 50) {
        analysis.textNodes.push({
          id: node.id,
          name: node.name,
          characters: node.characters ? node.characters.substring(0, 100) : '' // Limit text length
        });
      }
      
      if (node.type === 'RECTANGLE' && node.fills && node.fills.some(fill => fill.type === 'IMAGE')) {
        if (analysis.imageNodes.length < 50) {
          analysis.imageNodes.push({
            id: node.id,
            name: node.name
          });
        }
      }
      
      // Traverse children with depth limit
      if (node.children && depth < analysis.maxDepth) {
        // Only traverse first 20 children at each level for performance
        const childrenToProcess = node.children.slice(0, 20);
        childrenToProcess.forEach(child => traverseNodeLight(child, depth + 1));
      }
    }

    traverseNodeLight(document);
    return analysis;
  }

  /**
   * Analyze individual node (LIGHT VERSION)
   */
  static analyzeNodeLight(node) {
    return {
      type: node.type,
      name: node.name ? node.name.substring(0, 100) : '', // Limit name length
      visible: node.visible !== false,
      bounds: node.absoluteBoundingBox ? {
        x: Math.round(node.absoluteBoundingBox.x),
        y: Math.round(node.absoluteBoundingBox.y),
        width: Math.round(node.absoluteBoundingBox.width),
        height: Math.round(node.absoluteBoundingBox.height)
      } : null,
      hasChildren: !!(node.children && node.children.length > 0),
      childCount: node.children ? node.children.length : 0
    };
  }

  /**
   * Analyze individual node (FULL VERSION - original)
   */
  static analyzeNode(node) {
    return {
      type: node.type,
      name: node.name,
      visible: node.visible !== false,
      bounds: node.absoluteBoundingBox,
      hasChildren: !!(node.children && node.children.length > 0)
    };
  }

  /**
   * Get Figma file metadata
   */
  static async getFileMetadata(req, res, config) {
    try {
      const { fileId, apiKey } = req.query;
      
      if (!fileId) {
        return res.status(400).json({
          success: false,
          error: 'File ID is required'
        });
      }

      const token = apiKey || config.get('figmaApiKey');
      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'Figma API key is required'
        });
      }

      const response = await fetch(`https://api.figma.com/v1/files/${fileId}`, {
        headers: {
          'X-Figma-Token': token
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return res.status(response.status).json({
          success: false,
          error: errorData.err || response.statusText
        });
      }

      const data = await response.json();
      
      return res.json({
        success: true,
        metadata: {
          name: data.name,
          lastModified: data.lastModified,
          version: data.version,
          thumbnailUrl: data.thumbnailUrl,
          role: data.role
        }
      });

    } catch (error) {
      console.error('❌ File metadata error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export default FigmaHandler;
