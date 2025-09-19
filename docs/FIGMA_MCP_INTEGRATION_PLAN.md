# 🎨 **Figma MCP Integration - Complete Implementation Plan**

## 🎯 **Architecture Overview**

Based on your hybrid setup (macOS app + local web app), here's the comprehensive MCP integration strategy:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   macOS App     │    │   Web App       │    │  Figma MCP      │
│   (Swift/ObjC)  │◄──►│  (Node.js +     │◄──►│   Server        │◄──► Figma API
│                 │    │   React)        │    │  (Node.js)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🏗️ **Implementation Strategy**

### **Option 1: Shared MCP Server (Recommended)**
- Single Node.js MCP server handles all Figma operations
- Both macOS and web apps communicate with same server
- Centralized logic, easier maintenance

### **Option 2: Embedded MCP Clients**
- Each app has its own MCP client
- Direct communication with Figma API
- More complex but potentially better performance

## 🔧 **Core Implementation**

### **1. Figma MCP Server (Node.js)**

```typescript
// figma-mcp-server.js
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

class FigmaMCPServer {
    private server: Server;
    private figmaToken: string;
    
    constructor() {
        this.server = new Server({
            name: "figma-connector",
            version: "1.0.0",
        });
        
        this.figmaToken = process.env.FIGMA_TOKEN || '';
        this.setupHandlers();
    }
    
    private setupHandlers() {
        // List available tools
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: "get_figma_file",
                    description: "Retrieve Figma file data including components, frames, and styles",
                    inputSchema: {
                        type: "object",
                        properties: {
                            fileId: { type: "string", description: "Figma file ID" },
                            includeComponents: { type: "boolean", default: true },
                            includeStyles: { type: "boolean", default: true }
                        },
                        required: ["fileId"]
                    }
                },
                {
                    name: "export_figma_assets",
                    description: "Export assets from Figma file as images",
                    inputSchema: {
                        type: "object",
                        properties: {
                            fileId: { type: "string", description: "Figma file ID" },
                            nodeIds: { type: "array", items: { type: "string" } },
                            format: { type: "string", enum: ["png", "jpg", "svg", "pdf"], default: "png" },
                            scale: { type: "number", default: 1 }
                        },
                        required: ["fileId", "nodeIds"]
                    }
                },
                {
                    name: "get_figma_components",
                    description: "Get all components from a Figma file",
                    inputSchema: {
                        type: "object",
                        properties: {
                            fileId: { type: "string", description: "Figma file ID" }
                        },
                        required: ["fileId"]
                    }
                },
                {
                    name: "analyze_figma_design_tokens",
                    description: "Extract design tokens (colors, typography, spacing) from Figma",
                    inputSchema: {
                        type: "object",
                        properties: {
                            fileId: { type: "string", description: "Figma file ID" }
                        },
                        required: ["fileId"]
                    }
                },
                {
                    name: "get_figma_version_history",
                    description: "Get version history of a Figma file",
                    inputSchema: {
                        type: "object",
                        properties: {
                            fileId: { type: "string", description: "Figma file ID" }
                        },
                        required: ["fileId"]
                    }
                }
            ]
        }));
        
        // Handle tool calls
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            
            try {
                switch (name) {
                    case "get_figma_file":
                        return await this.getFigmaFile(args);
                    case "export_figma_assets":
                        return await this.exportFigmaAssets(args);
                    case "get_figma_components":
                        return await this.getFigmaComponents(args);
                    case "analyze_figma_design_tokens":
                        return await this.analyzeFigmaDesignTokens(args);
                    case "get_figma_version_history":
                        return await this.getFigmaVersionHistory(args);
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
    }
    
    private async getFigmaFile(args: any) {
        const { fileId, includeComponents = true, includeStyles = true } = args;
        
        const response = await fetch(`https://api.figma.com/v1/files/${fileId}`, {
            headers: {
                'X-Figma-Token': this.figmaToken
            }
        });
        
        if (!response.ok) {
            throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Process and enhance the data
        const processedData = {
            ...data,
            metadata: {
                extractedAt: new Date().toISOString(),
                fileId,
                includeComponents,
                includeStyles
            },
            analysis: {
                totalNodes: this.countNodes(data.document),
                componentCount: this.countComponents(data.document),
                frameCount: this.countFrames(data.document),
                textNodes: this.extractTextNodes(data.document),
                colorPalette: this.extractColors(data.document)
            }
        };
        
        return {
            content: [{
                type: "text",
                text: JSON.stringify(processedData, null, 2)
            }]
        };
    }
    
    private async exportFigmaAssets(args: any) {
        const { fileId, nodeIds, format = 'png', scale = 1 } = args;
        
        const response = await fetch(`https://api.figma.com/v1/images/${fileId}?ids=${nodeIds.join(',')}&format=${format}&scale=${scale}`, {
            headers: {
                'X-Figma-Token': this.figmaToken
            }
        });
        
        if (!response.ok) {
            throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    exports: data.images,
                    metadata: {
                        fileId,
                        nodeIds,
                        format,
                        scale,
                        exportedAt: new Date().toISOString()
                    }
                }, null, 2)
            }]
        };
    }
    
    private async getFigmaComponents(args: any) {
        const { fileId } = args;
        
        const response = await fetch(`https://api.figma.com/v1/files/${fileId}/components`, {
            headers: {
                'X-Figma-Token': this.figmaToken
            }
        });
        
        if (!response.ok) {
            throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Enhance component data with analysis
        const enhancedComponents = Object.entries(data.meta.components).map(([id, component]: [string, any]) => ({
            id,
            ...component,
            analysis: {
                complexity: this.calculateComponentComplexity(component),
                variants: this.extractVariants(component),
                dependencies: this.findComponentDependencies(component)
            }
        }));
        
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    components: enhancedComponents,
                    metadata: {
                        fileId,
                        totalComponents: enhancedComponents.length,
                        extractedAt: new Date().toISOString()
                    }
                }, null, 2)
            }]
        };
    }
    
    private async analyzeFigmaDesignTokens(args: any) {
        const { fileId } = args;
        
        // Get file data first
        const fileResponse = await fetch(`https://api.figma.com/v1/files/${fileId}`, {
            headers: {
                'X-Figma-Token': this.figmaToken
            }
        });
        
        const fileData = await fileResponse.json();
        
        // Get styles
        const stylesResponse = await fetch(`https://api.figma.com/v1/files/${fileId}/styles`, {
            headers: {
                'X-Figma-Token': this.figmaToken
            }
        });
        
        const stylesData = await stylesResponse.json();
        
        // Extract design tokens
        const designTokens = {
            colors: this.extractColorTokens(fileData, stylesData),
            typography: this.extractTypographyTokens(fileData, stylesData),
            spacing: this.extractSpacingTokens(fileData),
            effects: this.extractEffectTokens(stylesData),
            grids: this.extractGridTokens(fileData)
        };
        
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    designTokens,
                    metadata: {
                        fileId,
                        extractedAt: new Date().toISOString(),
                        tokenCounts: {
                            colors: designTokens.colors.length,
                            typography: designTokens.typography.length,
                            spacing: designTokens.spacing.length,
                            effects: designTokens.effects.length,
                            grids: designTokens.grids.length
                        }
                    }
                }, null, 2)
            }]
        };
    }
    
    private async getFigmaVersionHistory(args: any) {
        const { fileId } = args;
        
        const response = await fetch(`https://api.figma.com/v1/files/${fileId}/versions`, {
            headers: {
                'X-Figma-Token': this.figmaToken
            }
        });
        
        if (!response.ok) {
            throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    versions: data.versions,
                    metadata: {
                        fileId,
                        totalVersions: data.versions.length,
                        extractedAt: new Date().toISOString()
                    }
                }, null, 2)
            }]
        };
    }
    
    // Helper methods for data analysis
    private countNodes(node: any): number {
        let count = 1;
        if (node.children) {
            for (const child of node.children) {
                count += this.countNodes(child);
            }
        }
        return count;
    }
    
    private countComponents(node: any): number {
        let count = 0;
        if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
            count = 1;
        }
        if (node.children) {
            for (const child of node.children) {
                count += this.countComponents(child);
            }
        }
        return count;
    }
    
    private countFrames(node: any): number {
        let count = 0;
        if (node.type === 'FRAME') {
            count = 1;
        }
        if (node.children) {
            for (const child of node.children) {
                count += this.countFrames(child);
            }
        }
        return count;
    }
    
    private extractTextNodes(node: any): any[] {
        let textNodes: any[] = [];
        if (node.type === 'TEXT') {
            textNodes.push({
                id: node.id,
                name: node.name,
                characters: node.characters,
                style: node.style
            });
        }
        if (node.children) {
            for (const child of node.children) {
                textNodes = textNodes.concat(this.extractTextNodes(child));
            }
        }
        return textNodes;
    }
    
    private extractColors(node: any): string[] {
        let colors: string[] = [];
        
        if (node.fills) {
            for (const fill of node.fills) {
                if (fill.type === 'SOLID' && fill.color) {
                    const { r, g, b } = fill.color;
                    const hex = `#${Math.round(r * 255).toString(16).padStart(2, '0')}${Math.round(g * 255).toString(16).padStart(2, '0')}${Math.round(b * 255).toString(16).padStart(2, '0')}`;
                    if (!colors.includes(hex)) {
                        colors.push(hex);
                    }
                }
            }
        }
        
        if (node.children) {
            for (const child of node.children) {
                colors = colors.concat(this.extractColors(child));
            }
        }
        
        return colors;
    }
    
    private extractColorTokens(fileData: any, stylesData: any): any[] {
        const colorTokens: any[] = [];
        
        // Extract from styles
        if (stylesData.meta && stylesData.meta.styles) {
            for (const [styleId, style] of Object.entries(stylesData.meta.styles)) {
                if ((style as any).styleType === 'FILL') {
                    colorTokens.push({
                        id: styleId,
                        name: (style as any).name,
                        description: (style as any).description,
                        type: 'color',
                        value: this.extractColorValue(style)
                    });
                }
            }
        }
        
        return colorTokens;
    }
    
    private extractTypographyTokens(fileData: any, stylesData: any): any[] {
        const typographyTokens: any[] = [];
        
        if (stylesData.meta && stylesData.meta.styles) {
            for (const [styleId, style] of Object.entries(stylesData.meta.styles)) {
                if ((style as any).styleType === 'TEXT') {
                    typographyTokens.push({
                        id: styleId,
                        name: (style as any).name,
                        description: (style as any).description,
                        type: 'typography',
                        value: this.extractTypographyValue(style)
                    });
                }
            }
        }
        
        return typographyTokens;
    }
    
    private extractSpacingTokens(fileData: any): any[] {
        // Extract common spacing values from the design
        const spacingValues = new Set<number>();
        this.collectSpacingValues(fileData.document, spacingValues);
        
        return Array.from(spacingValues).sort((a, b) => a - b).map((value, index) => ({
            id: `spacing-${index}`,
            name: `Spacing ${value}`,
            type: 'spacing',
            value: value
        }));
    }
    
    private extractEffectTokens(stylesData: any): any[] {
        const effectTokens: any[] = [];
        
        if (stylesData.meta && stylesData.meta.styles) {
            for (const [styleId, style] of Object.entries(stylesData.meta.styles)) {
                if ((style as any).styleType === 'EFFECT') {
                    effectTokens.push({
                        id: styleId,
                        name: (style as any).name,
                        description: (style as any).description,
                        type: 'effect',
                        value: this.extractEffectValue(style)
                    });
                }
            }
        }
        
        return effectTokens;
    }
    
    private extractGridTokens(fileData: any): any[] {
        const gridTokens: any[] = [];
        this.collectGridTokens(fileData.document, gridTokens);
        return gridTokens;
    }
    
    // Additional helper methods would be implemented here...
    
    async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error("Figma MCP Server running on stdio");
    }
}

// Start the server
const server = new FigmaMCPServer();
server.start().catch(console.error);
```

### **2. macOS App Integration (Swift)**

```swift
// FigmaMCPConnector.swift
import Foundation

class FigmaMCPConnector: ObservableObject {
    private var mcpProcess: Process?
    private var inputPipe: Pipe?
    private var outputPipe: Pipe?
    private var errorPipe: Pipe?
    
    @Published var isConnected = false
    @Published var lastError: String?
    
    func startMCPServer() {
        guard mcpProcess == nil else { return }
        
        mcpProcess = Process()
        inputPipe = Pipe()
        outputPipe = Pipe()
        errorPipe = Pipe()
        
        // Configure process
        mcpProcess?.executableURL = URL(fileURLWithPath: "/usr/local/bin/node")
        mcpProcess?.arguments = [Bundle.main.path(forResource: "figma-mcp-server", ofType: "js")!]
        mcpProcess?.standardInput = inputPipe
        mcpProcess?.standardOutput = outputPipe
        mcpProcess?.standardError = errorPipe
        
        // Set up output monitoring
        outputPipe?.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let data = handle.availableData
            if !data.isEmpty {
                self?.handleMCPResponse(data)
            }
        }
        
        errorPipe?.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let data = handle.availableData
            if !data.isEmpty, let errorString = String(data: data, encoding: .utf8) {
                DispatchQueue.main.async {
                    self?.lastError = errorString
                }
            }
        }
        
        do {
            try mcpProcess?.run()
            isConnected = true
        } catch {
            lastError = "Failed to start MCP server: \(error.localizedDescription)"
        }
    }
    
    func stopMCPServer() {
        mcpProcess?.terminate()
        mcpProcess = nil
        inputPipe = nil
        outputPipe = nil
        errorPipe = nil
        isConnected = false
    }
    
    func callMCPTool(name: String, arguments: [String: Any]) async -> MCPResponse? {
        guard isConnected else { return nil }
        
        let request = MCPRequest(
            jsonrpc: "2.0",
            id: UUID().uuidString,
            method: "tools/call",
            params: MCPToolCallParams(name: name, arguments: arguments)
        )
        
        do {
            let requestData = try JSONEncoder().encode(request)
            inputPipe?.fileHandleForWriting.write(requestData)
            inputPipe?.fileHandleForWriting.write("\n".data(using: .utf8)!)
            
            // Wait for response (implement proper async handling)
            return await waitForResponse(requestId: request.id)
        } catch {
            lastError = "Failed to send MCP request: \(error.localizedDescription)"
            return nil
        }
    }
    
    private func handleMCPResponse(_ data: Data) {
        // Parse JSON-RPC response and handle accordingly
        do {
            let response = try JSONDecoder().decode(MCPResponse.self, from: data)
            // Store response for async retrieval
            responseCache[response.id] = response
        } catch {
            print("Failed to parse MCP response: \(error)")
        }
    }
    
    private var responseCache: [String: MCPResponse] = [:]
    
    private func waitForResponse(requestId: String) async -> MCPResponse? {
        // Implement proper async waiting mechanism
        for _ in 0..<100 { // 10 second timeout
            if let response = responseCache[requestId] {
                responseCache.removeValue(forKey: requestId)
                return response
            }
            try? await Task.sleep(nanoseconds: 100_000_000) // 100ms
        }
        return nil
    }
}

// MARK: - Figma-specific methods
extension FigmaMCPConnector {
    func getFigmaFile(fileId: String) async -> FigmaFileData? {
        let response = await callMCPTool(name: "get_figma_file", arguments: ["fileId": fileId])
        
        guard let content = response?.result.content.first?.text,
              let data = content.data(using: .utf8),
              let figmaData = try? JSONDecoder().decode(FigmaFileData.self, from: data) else {
            return nil
        }
        
        return figmaData
    }
    
    func exportFigmaAssets(fileId: String, nodeIds: [String], format: String = "png") async -> FigmaExportData? {
        let response = await callMCPTool(name: "export_figma_assets", arguments: [
            "fileId": fileId,
            "nodeIds": nodeIds,
            "format": format
        ])
        
        guard let content = response?.result.content.first?.text,
              let data = content.data(using: .utf8),
              let exportData = try? JSONDecoder().decode(FigmaExportData.self, from: data) else {
            return nil
        }
        
        return exportData
    }
    
    func analyzeFigmaDesignTokens(fileId: String) async -> FigmaDesignTokens? {
        let response = await callMCPTool(name: "analyze_figma_design_tokens", arguments: ["fileId": fileId])
        
        guard let content = response?.result.content.first?.text,
              let data = content.data(using: .utf8),
              let tokens = try? JSONDecoder().decode(FigmaDesignTokens.self, from: data) else {
            return nil
        }
        
        return tokens
    }
}

// MARK: - Data Models
struct MCPRequest: Codable {
    let jsonrpc: String
    let id: String
    let method: String
    let params: MCPToolCallParams
}

struct MCPToolCallParams: Codable {
    let name: String
    let arguments: [String: Any]
    
    private enum CodingKeys: String, CodingKey {
        case name, arguments
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(name, forKey: .name)
        
        let jsonData = try JSONSerialization.data(withJSONObject: arguments)
        let jsonObject = try JSONSerialization.jsonObject(with: jsonData)
        try container.encode(AnyCodable(jsonObject), forKey: .arguments)
    }
}

struct MCPResponse: Codable {
    let jsonrpc: String
    let id: String
    let result: MCPResult
}

struct MCPResult: Codable {
    let content: [MCPContent]
}

struct MCPContent: Codable {
    let type: String
    let text: String
}
```

### **3. Web App Integration (Node.js + React)**

**Backend (Node.js):**
```typescript
// server/figma-mcp-client.js
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import path from 'path';

class FigmaMCPClient {
    private client: Client;
    private transport: StdioClientTransport;
    private connected = false;
    
    async connect() {
        if (this.connected) return;
        
        // Start MCP server process
        const serverPath = path.join(__dirname, '../figma-mcp-server.js');
        
        this.transport = new StdioClientTransport({
            command: 'node',
            args: [serverPath],
            env: {
                ...process.env,
                FIGMA_TOKEN: process.env.FIGMA_TOKEN
            }
        });
        
        this.client = new Client({
            name: "web-figma-client",
            version: "1.0.0"
        });
        
        await this.client.connect(this.transport);
        this.connected = true;
        
        console.log('Connected to Figma MCP server');
    }
    
    async disconnect() {
        if (this.client) {
            await this.client.close();
        }
        this.connected = false;
    }
    
    async getFigmaFile(fileId: string, options: any = {}) {
        await this.connect();
        
        const result = await this.client.callTool({
            name: "get_figma_file",
            arguments: { fileId, ...options }
        });
        
        return JSON.parse(result.content[0].text);
    }
    
    async exportFigmaAssets(fileId: string, nodeIds: string[], format = 'png', scale = 1) {
        await this.connect();
        
        const result = await this.client.callTool({
            name: "export_figma_assets",
            arguments: { fileId, nodeIds, format, scale }
        });
        
        return JSON.parse(result.content[0].text);
    }
    
    async getFigmaComponents(fileId: string) {
        await this.connect();
        
        const result = await this.client.callTool({
            name: "get_figma_components",
            arguments: { fileId }
        });
        
        return JSON.parse(result.content[0].text);
    }
    
    async analyzeFigmaDesignTokens(fileId: string) {
        await this.connect();
        
        const result = await this.client.callTool({
            name: "analyze_figma_design_tokens",
            arguments: { fileId }
        });
        
        return JSON.parse(result.content[0].text);
    }
}

// Singleton instance
export const figmaMCPClient = new FigmaMCPClient();

// Express routes
import express from 'express';
const router = express.Router();

router.get('/figma/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        const { includeComponents, includeStyles } = req.query;
        
        const result = await figmaMCPClient.getFigmaFile(fileId, {
            includeComponents: includeComponents === 'true',
            includeStyles: includeStyles === 'true'
        });
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/figma/:fileId/export', async (req, res) => {
    try {
        const { fileId } = req.params;
        const { nodeIds, format, scale } = req.body;
        
        const result = await figmaMCPClient.exportFigmaAssets(fileId, nodeIds, format, scale);
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/figma/:fileId/components', async (req, res) => {
    try {
        const { fileId } = req.params;
        const result = await figmaMCPClient.getFigmaComponents(fileId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/figma/:fileId/design-tokens', async (req, res) => {
    try {
        const { fileId } = req.params;
        const result = await figmaMCPClient.analyzeFigmaDesignTokens(fileId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
```

**Frontend (React):**
```typescript
// frontend/src/services/figma-service.ts
class FigmaService {
    private baseURL = '/api/figma';
    
    async getFigmaFile(fileId: string, options: {
        includeComponents?: boolean;
        includeStyles?: boolean;
    } = {}) {
        const params = new URLSearchParams();
        if (options.includeComponents !== undefined) {
            params.set('includeComponents', options.includeComponents.toString());
        }
        if (options.includeStyles !== undefined) {
            params.set('includeStyles', options.includeStyles.toString());
        }
        
        const response = await fetch(`${this.baseURL}/${fileId}?${params}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch Figma file: ${response.statusText}`);
        }
        
        return response.json();
    }
    
    async exportAssets(fileId: string, nodeIds: string[], format = 'png', scale = 1) {
        const response = await fetch(`${this.baseURL}/${fileId}/export`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nodeIds, format, scale })
        });
        
        if (!response.ok) {
            throw new Error(`Failed to export assets: ${response.statusText}`);
        }
        
        return response.json();
    }
    
    async getComponents(fileId: string) {
        const response = await fetch(`${this.baseURL}/${fileId}/components`);
        if (!response.ok) {
            throw new Error(`Failed to fetch components: ${response.statusText}`);
        }
        
        return response.json();
    }
    
    async getDesignTokens(fileId: string) {
        const response = await fetch(`${this.baseURL}/${fileId}/design-tokens`);
        if (!response.ok) {
            throw new Error(`Failed to fetch design tokens: ${response.statusText}`);
        }
        
        return response.json();
    }
}

export const figmaService = new FigmaService();

// React hook for Figma data
import { useState, useEffect } from 'react';

export function useFigmaFile(fileId: string | null) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
        if (!fileId) return;
        
        setLoading(true);
        setError(null);
        
        figmaService.getFigmaFile(fileId)
            .then(setData)
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [fileId]);
    
    return { data, loading, error };
}
```

## 🚀 **Deployment Structure**

```
Project/
├── figma-mcp-server.js           # Shared MCP server
├── package.json                  # MCP server dependencies
├── macos-app/                    # macOS app
│   ├── FigmaMCPConnector.swift
│   ├── Models/
│   │   ├── FigmaModels.swift
│   │   └── MCPModels.swift
│   └── Resources/
│       └── figma-mcp-server.js   # Bundled server
├── web-app/
│   ├── server/
│   │   ├── figma-mcp-client.js   # Node.js MCP client
│   │   └── routes/
│   │       └── figma.js          # API routes
│   └── frontend/
│       └── src/
│           └── services/
│               └── figma-service.ts
└── shared/
    ├── types/
    │   └── figma-types.ts        # Shared TypeScript types
    └── utils/
        └── figma-utils.js        # Shared utilities
```

## 🔧 **Configuration & Setup**

### **Environment Variables**
```bash
# .env
FIGMA_TOKEN=your_figma_personal_access_token
MCP_SERVER_PORT=3002
FIGMA_RATE_LIMIT=100
CACHE_DURATION=3600
```

### **Package Dependencies**
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "node-fetch": "^3.0.0"
  }
}
```

## 🎯 **Benefits of This Architecture**

1. **Code Reuse**: Same MCP server for both apps
2. **Consistent API**: Identical Figma integration across platforms
3. **Centralized Logic**: All Figma processing in one place
4. **Easy Maintenance**: Single codebase for Figma operations
5. **Scalable**: Can add more tools easily
6. **Type Safety**: Shared TypeScript definitions

## 📈 **Implementation Timeline**

### **Week 1-2: Core MCP Server**
- Basic Figma API integration
- Essential tools (get file, export assets)
- Error handling and validation

### **Week 3-4: Platform Integration**
- macOS Swift connector
- Web app Node.js client
- API route setup

### **Week 5-6: Advanced Features**
- Design token analysis
- Component extraction
- Performance optimization

### **Week 7-8: Testing & Polish**
- End-to-end testing
- Error handling refinement
- Documentation

This comprehensive MCP integration provides a robust, scalable foundation for both your macOS and web applications while maintaining consistency and code reuse.
