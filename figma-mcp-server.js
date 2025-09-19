/**
 * Shared Figma MCP Server
 * Handles Figma API integration for both macOS and web apps
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const server = new Server({
  name: "figma-connector",
  version: "1.0.0",
});

// Figma API configuration
const FIGMA_TOKEN = process.env.FIGMA_TOKEN || process.env.FIGMA_API_KEY;

if (!FIGMA_TOKEN) {
  console.error('❌ FIGMA_TOKEN environment variable is required');
  process.exit(1);
}

// Tool definitions
const tools = [
  {
    name: "get_figma_file",
    description: "Retrieve Figma file data including components and design tokens",
    inputSchema: {
      type: "object",
      properties: {
        fileId: {
          type: "string",
          description: "The Figma file ID"
        },
        nodeId: {
          type: "string",
          description: "Optional specific node ID to fetch",
          optional: true
        }
      },
      required: ["fileId"]
    }
  },
  {
    name: "export_assets",
    description: "Export assets from Figma file as images",
    inputSchema: {
      type: "object",
      properties: {
        fileId: {
          type: "string",
          description: "The Figma file ID"
        },
        nodeIds: {
          type: "array",
          items: { type: "string" },
          description: "Array of node IDs to export"
        },
        format: {
          type: "string",
          enum: ["png", "svg", "jpg"],
          description: "Export format",
          default: "png"
        },
        scale: {
          type: "number",
          description: "Export scale factor",
          default: 2
        }
      },
      required: ["fileId", "nodeIds"]
    }
  },
  {
    name: "analyze_components",
    description: "Analyze Figma components and extract design system information",
    inputSchema: {
      type: "object",
      properties: {
        fileId: {
          type: "string",
          description: "The Figma file ID"
        }
      },
      required: ["fileId"]
    }
  }
];

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "get_figma_file":
        return await getFigmaFile(args.fileId, args.nodeId);
        
      case "export_assets":
        return await exportAssets(args.fileId, args.nodeIds, args.format, args.scale);
        
      case "analyze_components":
        return await analyzeComponents(args.fileId);
        
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: ${error.message}`
      }],
      isError: true
    };
  }
});

/**
 * Get Figma file data
 */
async function getFigmaFile(fileId, nodeId = null) {
  const url = nodeId 
    ? `https://api.figma.com/v1/files/${fileId}/nodes?ids=${nodeId}`
    : `https://api.figma.com/v1/files/${fileId}`;

  const response = await fetch(url, {
    headers: {
      'X-Figma-Token': FIGMA_TOKEN
    }
  });

  if (!response.ok) {
    throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  return {
    content: [{
      type: "text",
      text: JSON.stringify(data, null, 2)
    }]
  };
}

/**
 * Export assets from Figma
 */
async function exportAssets(fileId, nodeIds, format = 'png', scale = 2) {
  const nodeIdsParam = nodeIds.join(',');
  const url = `https://api.figma.com/v1/images/${fileId}?ids=${nodeIdsParam}&format=${format}&scale=${scale}`;

  const response = await fetch(url, {
    headers: {
      'X-Figma-Token': FIGMA_TOKEN
    }
  });

  if (!response.ok) {
    throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  return {
    content: [{
      type: "text",
      text: JSON.stringify(data, null, 2)
    }]
  };
}

/**
 * Analyze Figma components and design system
 */
async function analyzeComponents(fileId) {
  // Get the full file data
  const fileResponse = await getFigmaFile(fileId);
  const fileData = JSON.parse(fileResponse.content[0].text);
  
  // Extract components and design tokens
  const analysis = {
    components: extractComponents(fileData.document),
    designTokens: extractDesignTokens(fileData.document),
    styles: fileData.styles || {},
    componentSets: fileData.componentSets || {}
  };
  
  return {
    content: [{
      type: "text",
      text: JSON.stringify(analysis, null, 2)
    }]
  };
}

/**
 * Extract components from Figma document
 */
function extractComponents(node, components = []) {
  if (node.type === 'COMPONENT') {
    components.push({
      id: node.id,
      name: node.name,
      description: node.description || '',
      properties: node.componentPropertyDefinitions || {},
      constraints: node.constraints || {},
      effects: node.effects || [],
      fills: node.fills || [],
      strokes: node.strokes || []
    });
  }
  
  if (node.children) {
    node.children.forEach(child => extractComponents(child, components));
  }
  
  return components;
}

/**
 * Extract design tokens from Figma document
 */
function extractDesignTokens(node, tokens = { colors: [], typography: [], spacing: [] }) {
  if (node.fills) {
    node.fills.forEach(fill => {
      if (fill.type === 'SOLID') {
        tokens.colors.push({
          name: node.name || 'Unnamed',
          color: fill.color,
          opacity: fill.opacity || 1
        });
      }
    });
  }
  
  if (node.style && node.style.fontFamily) {
    tokens.typography.push({
      name: node.name || 'Unnamed',
      fontFamily: node.style.fontFamily,
      fontSize: node.style.fontSize,
      fontWeight: node.style.fontWeight,
      lineHeight: node.style.lineHeightPx
    });
  }
  
  if (node.children) {
    node.children.forEach(child => extractDesignTokens(child, tokens));
  }
  
  return tokens;
}

// Start the MCP server
async function main() {
  console.log('🚀 Starting Figma MCP Server...');
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.log('✅ Figma MCP Server connected and ready');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down Figma MCP Server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Shutting down Figma MCP Server...');
  process.exit(0);
});

main().catch(console.error);
