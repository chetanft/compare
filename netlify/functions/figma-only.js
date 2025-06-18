import 'dotenv/config';
import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import axios from 'axios';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Simple Figma URL parser (inline to avoid dependencies)
function parseFigmaUrl(url) {
  const patterns = [
    /figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/,
    /figma\.com\/proto\/([a-zA-Z0-9]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      const fileId = match[1];
      const nodeMatch = url.match(/node-id=([^&]+)/);
      const nodeId = nodeMatch ? decodeURIComponent(nodeMatch[1]) : null;
      return { fileId, nodeId };
    }
  }
  
  return { fileId: null, nodeId: null };
}

// Simplified Figma extractor (inline to avoid module dependencies)
class SimpleFigmaExtractor {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.figma.com/v1';
  }

  async getFigmaData(fileId, nodeId = null) {
    if (!this.apiKey) {
      throw new Error('Figma API key not configured');
    }

    try {
      const url = nodeId 
        ? `${this.baseUrl}/files/${fileId}/nodes?ids=${encodeURIComponent(nodeId)}`
        : `${this.baseUrl}/files/${fileId}`;

      const response = await axios.get(url, {
        headers: {
          'X-Figma-Token': this.apiKey
        }
      });

      const data = response.data;
      const components = this.extractComponents(data, nodeId);

      return {
        fileId,
        nodeId,
        components,
        metadata: {
          fileName: data.name || 'Unknown',
          extractedAt: new Date().toISOString(),
          extractionMethod: 'Simple Figma Extractor',
          componentCount: components.length,
          version: data.version || 'unknown'
        }
      };
    } catch (error) {
      throw new Error(`Figma API error: ${error.message}`);
    }
  }

  extractComponents(data, nodeId = null) {
    const components = [];
    
    function traverse(node, depth = 0) {
      if (!node) return;

      // Extract component information
      const component = {
        id: node.id,
        name: node.name || 'Unnamed',
        type: node.type || 'UNKNOWN',
        depth,
        visible: node.visible !== false,
        absoluteBoundingBox: node.absoluteBoundingBox || null,
        fills: node.fills || [],
        strokes: node.strokes || [],
        effects: node.effects || [],
        opacity: node.opacity || 1,
        constraints: node.constraints || {},
        layoutMode: node.layoutMode || null,
        primaryAxisSizingMode: node.primaryAxisSizingMode || null,
        counterAxisSizingMode: node.counterAxisSizingMode || null,
        paddingLeft: node.paddingLeft || 0,
        paddingRight: node.paddingRight || 0,
        paddingTop: node.paddingTop || 0,
        paddingBottom: node.paddingBottom || 0,
        itemSpacing: node.itemSpacing || 0
      };

      // Add text-specific properties
      if (node.type === 'TEXT' && node.characters) {
        component.text = node.characters;
        component.style = node.style || {};
        component.characterStyleOverrides = node.characterStyleOverrides || [];
        component.styleOverrideTable = node.styleOverrideTable || {};
      }

      // Add vector-specific properties
      if (node.type === 'VECTOR' || node.type === 'BOOLEAN_OPERATION') {
        component.strokeWeight = node.strokeWeight || 0;
        component.strokeCap = node.strokeCap || 'NONE';
        component.strokeJoin = node.strokeJoin || 'MITER';
        component.fillGeometry = node.fillGeometry || [];
        component.strokeGeometry = node.strokeGeometry || [];
      }

      // Add frame/group-specific properties
      if (node.type === 'FRAME' || node.type === 'GROUP' || node.type === 'COMPONENT') {
        component.clipsContent = node.clipsContent || false;
        component.background = node.background || [];
        component.backgroundColor = node.backgroundColor || null;
        component.layoutGrids = node.layoutGrids || [];
        component.exportSettings = node.exportSettings || [];
      }

      components.push(component);

      // Recursively process children
      if (node.children && Array.isArray(node.children)) {
        for (const child of node.children) {
          traverse(child, depth + 1);
        }
      }
    }

    // Start traversal from the appropriate node
    if (nodeId && data.nodes && data.nodes[nodeId]) {
      traverse(data.nodes[nodeId].document);
    } else if (data.document) {
      traverse(data.document);
    } else {
      console.warn('No document or node found in Figma data');
    }

    return components;
  }

  async downloadImages(fileId, nodes, format = 'png', scale = 2) {
    if (!this.apiKey) {
      throw new Error('Figma API key not configured');
    }

    try {
      const nodeIds = nodes.map(n => n.nodeId).join(',');
      const url = `${this.baseUrl}/images/${fileId}?ids=${nodeIds}&format=${format}&scale=${scale}`;

      const response = await axios.get(url, {
        headers: {
          'X-Figma-Token': this.apiKey
        }
      });

      return {
        images: response.data.images || {},
        format,
        scale,
        extractedAt: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Figma images API error: ${error.message}`);
    }
  }
}

// Initialize extractor
const figmaExtractor = new SimpleFigmaExtractor(process.env.FIGMA_API_KEY);

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: 'netlify-functions-figma-only',
    services: {
      figmaExtractor: !!process.env.FIGMA_API_KEY,
      webExtractor: false,
      puppeteer: false
    },
    note: 'Figma-only lightweight function without any heavy dependencies'
  });
});

app.post('/api/figma/extract', async (req, res) => {
  try {
    const { url, fileId, nodeId } = req.body;
    
    let extractFileId = fileId;
    let extractNodeId = nodeId;
    
    if (url && !fileId) {
      const figmaData = parseFigmaUrl(url);
      extractFileId = figmaData.fileId;
      extractNodeId = figmaData.nodeId;
    }
    
    if (!extractFileId) {
      return res.status(400).json({ 
        error: 'Missing fileId or valid Figma URL' 
      });
    }

    const result = await figmaExtractor.getFigmaData(extractFileId, extractNodeId);
    
    res.json({
      success: true,
      data: result,
      metadata: {
        components: result.components?.length || 0,
        extractionMethod: result.metadata.extractionMethod
      }
    });

  } catch (error) {
    console.error('❌ Figma extraction failed:', error);
    res.status(500).json({ 
      error: 'Figma extraction failed', 
      details: error.message 
    });
  }
});

app.post('/api/figma/images', async (req, res) => {
  try {
    const { fileId, nodes, format = 'png', scale = 2 } = req.body;
    
    if (!fileId || !nodes || !Array.isArray(nodes)) {
      return res.status(400).json({ 
        error: 'Missing required parameters: fileId and nodes array' 
      });
    }

    const result = await figmaExtractor.downloadImages(fileId, nodes, format, scale);
    
    res.json({
      success: true,
      data: result,
      metadata: {
        imageCount: Object.keys(result.images || {}).length,
        format,
        scale
      }
    });

  } catch (error) {
    console.error('❌ Image download failed:', error);
    res.status(500).json({ 
      error: 'Image download failed', 
      details: error.message 
    });
  }
});

app.get('/api/info', (req, res) => {
  res.json({
    version: 'figma-only',
    capabilities: {
      figmaExtraction: true,
      figmaImages: true,
      webScraping: false,
      comparison: false,
      reporting: false
    },
    dependencies: ['axios'],
    noDependencies: ['puppeteer', 'sharp', 'complex modules'],
    endpoints: [
      'GET /api/health',
      'GET /api/info',
      'POST /api/figma/extract',
      'POST /api/figma/images'
    ],
    recommendation: 'Ultra-lightweight function for Figma operations only'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'API endpoint not found',
    path: req.originalUrl,
    availableEndpoints: [
      'GET /api/health',
      'GET /api/info', 
      'POST /api/figma/extract',
      'POST /api/figma/images'
    ]
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    details: error.message
  });
});

// Export handler for Netlify Functions
export const handler = serverless(app); 