/**
 * Figma MCP Connector for macOS App
 * Handles communication with the shared Figma MCP server
 */

import Foundation

// MARK: - MCP Request/Response Types
struct MCPRequest: Codable {
    let jsonrpc: String = "2.0"
    let id: Int
    let method: String
    let params: MCPParams
}

struct MCPParams: Codable {
    let name: String?
    let arguments: [String: Any]?
    
    enum CodingKeys: String, CodingKey {
        case name, arguments
    }
    
    init(name: String? = nil, arguments: [String: Any]? = nil) {
        self.name = name
        self.arguments = arguments
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encodeIfPresent(name, forKey: .name)
        if let arguments = arguments {
            let data = try JSONSerialization.data(withJSONObject: arguments)
            let jsonObject = try JSONSerialization.jsonObject(with: data)
            try container.encode(jsonObject as? [String: Any], forKey: .arguments)
        }
    }
}

struct MCPResponse: Codable {
    let jsonrpc: String
    let id: Int
    let result: MCPResult?
    let error: MCPError?
}

struct MCPResult: Codable {
    let content: [MCPContent]
    let isError: Bool?
}

struct MCPContent: Codable {
    let type: String
    let text: String
}

struct MCPError: Codable {
    let code: Int
    let message: String
}

// MARK: - Figma MCP Connector
class FigmaMCPConnector: ObservableObject {
    private var mcpProcess: Process?
    private var inputPipe: Pipe?
    private var outputPipe: Pipe?
    private var requestId: Int = 0
    private var isConnected: Bool = false
    
    // MARK: - Connection Management
    
    func startMCPServer() throws {
        guard mcpProcess == nil else {
            print("⚠️ MCP Server already running")
            return
        }
        
        let mcpProcess = Process()
        let projectPath = Bundle.main.bundlePath
            .replacingOccurrences(of: "/Contents/MacOS", with: "")
            .replacingOccurrences(of: ".app", with: "")
        let serverPath = "\(projectPath)/figma-mcp-server.js"
        
        // Configure process
        mcpProcess.executableURL = URL(fileURLWithPath: "/usr/local/bin/node")
        mcpProcess.arguments = [serverPath]
        
        // Setup pipes for communication
        let inputPipe = Pipe()
        let outputPipe = Pipe()
        
        mcpProcess.standardInput = inputPipe
        mcpProcess.standardOutput = outputPipe
        mcpProcess.standardError = Pipe() // Capture errors
        
        // Store references
        self.mcpProcess = mcpProcess
        self.inputPipe = inputPipe
        self.outputPipe = outputPipe
        
        // Start process
        try mcpProcess.run()
        self.isConnected = true
        
        print("✅ Figma MCP Server started successfully")
    }
    
    func stopMCPServer() {
        mcpProcess?.terminate()
        mcpProcess = nil
        inputPipe = nil
        outputPipe = nil
        isConnected = false
        
        print("🛑 Figma MCP Server stopped")
    }
    
    // MARK: - Tool Calls
    
    func getFigmaFile(fileId: String, nodeId: String? = nil) async throws -> [String: Any] {
        var arguments: [String: Any] = ["fileId": fileId]
        if let nodeId = nodeId {
            arguments["nodeId"] = nodeId
        }
        
        let response = try await callMCPTool(name: "get_figma_file", arguments: arguments)
        return try parseJSONResponse(response)
    }
    
    func exportAssets(fileId: String, nodeIds: [String], format: String = "png", scale: Double = 2.0) async throws -> [String: Any] {
        let arguments: [String: Any] = [
            "fileId": fileId,
            "nodeIds": nodeIds,
            "format": format,
            "scale": scale
        ]
        
        let response = try await callMCPTool(name: "export_assets", arguments: arguments)
        return try parseJSONResponse(response)
    }
    
    func analyzeComponents(fileId: String) async throws -> [String: Any] {
        let arguments: [String: Any] = ["fileId": fileId]
        
        let response = try await callMCPTool(name: "analyze_components", arguments: arguments)
        return try parseJSONResponse(response)
    }
    
    // MARK: - Private Methods
    
    private func callMCPTool(name: String, arguments: [String: Any]) async throws -> MCPResponse {
        guard isConnected, let inputPipe = inputPipe, let outputPipe = outputPipe else {
            throw MCPError(code: -1, message: "MCP Server not connected")
        }
        
        requestId += 1
        
        let request = MCPRequest(
            id: requestId,
            method: "tools/call",
            params: MCPParams(name: name, arguments: arguments)
        )
        
        // Send request
        let requestData = try JSONEncoder().encode(request)
        let requestString = String(data: requestData, encoding: .utf8)! + "\n"
        
        inputPipe.fileHandleForWriting.write(requestString.data(using: .utf8)!)
        
        // Read response
        let responseData = outputPipe.fileHandleForReading.availableData
        let responseString = String(data: responseData, encoding: .utf8) ?? ""
        
        // Parse response
        guard let responseData = responseString.data(using: .utf8) else {
            throw MCPError(code: -2, message: "Invalid response format")
        }
        
        let response = try JSONDecoder().decode(MCPResponse.self, from: responseData)
        
        if let error = response.error {
            throw error
        }
        
        return response
    }
    
    private func parseJSONResponse(_ response: MCPResponse) throws -> [String: Any] {
        guard let result = response.result,
              let content = result.content.first,
              content.type == "text" else {
            throw MCPError(code: -3, message: "Invalid response content")
        }
        
        guard let data = content.text.data(using: .utf8),
              let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw MCPError(code: -4, message: "Failed to parse JSON response")
        }
        
        return json
    }
}

// MARK: - Error Extension
extension MCPError: Error {
    var localizedDescription: String {
        return "MCP Error \(code): \(message)"
    }
}
