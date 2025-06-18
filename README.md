# Figma-Web Comparison Tool

A powerful tool to compare UI designs in Figma with live web implementations, automatically finding and reporting design deviations.

## ✨ Features

- **🎨 Figma Design Extraction**: Supports both Official Figma Dev Mode MCP Server and third-party MCP tools
- **🌐 Live Web Scraping**: Extracts computed CSS styles from live webpages using Puppeteer
- **🔍 Intelligent Comparison**: Smart component matching and comprehensive property comparison
- **📊 Professional Reports**: Generates detailed HTML and JSON reports with severity classification
- **🔐 Authentication Support**: Multiple authentication methods for login-protected pages
- **📱 URL-Based Input**: Parse complete Figma URLs for easy integration

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- **For Official Figma MCP Integration**: Figma Desktop App with Dev Mode (Professional/Organization/Enterprise plan)

### Installation

```bash
npm install
```

### Setup

1. **Configure Figma MCP Integration**:
   
   **Option A: Official Figma Dev Mode MCP Server (Recommended)**
   - Install [Figma Desktop App](https://www.figma.com/downloads/)
   - Enable Dev Mode MCP Server: `Figma menu → Preferences → Enable Dev Mode MCP Server`
   - Server runs automatically at `http://127.0.0.1:3845/sse`
   - Requires Professional/Organization/Enterprise plan
   
   **Option B: Third-party MCP Tools**
   - Install MCP Figma tools in your environment
   - Tools will be auto-detected if available
   
   **Option C: Simulation Mode**
   - No setup required - uses mock data for development/testing

2. **Start the Server**:
   ```bash
   npm start
   # or
   node server.js
   ```

3. **Open Web Interface**:
   ```
   http://localhost:3003
   ```

## 📖 Using Official Figma Dev Mode MCP Server

The tool automatically detects and uses Figma's official MCP server when available. Here's how to set it up:

### Step 1: Enable in Figma Desktop

1. Open Figma Desktop App (latest version)
2. Go to **Figma menu → Preferences**
3. Check **"Enable Dev Mode MCP Server"**
4. Confirm the server is running at `http://127.0.0.1:3845/sse`

### Step 2: Use Selection-Based Workflow

1. **Select Frame in Figma**: Select the frame/component you want to compare
2. **Copy Figma URL**: Right-click and copy the link
3. **Run Comparison**: Paste the URL in the web interface

### Step 3: Advanced Integration

For AI coding assistants (VS Code, Cursor, Windsurf, Claude Code), configure the MCP server:

```json
{
  "mcp": {
    "servers": {
      "Figma Dev Mode MCP": {
        "type": "sse",
        "url": "http://127.0.0.1:3845/sse"
      }
    }
  }
}
```

*Reference: [Official Figma MCP Documentation](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Dev-Mode-MCP-Server)*

## 🔧 Configuration

Edit `config.json` to customize comparison thresholds:

```json
{
  "thresholds": {
    "colorDifference": 10,
    "sizeDifference": 5,
    "spacingDifference": 3,
    "fontSizeDifference": 2
  }
}
```

## 🌐 Web Authentication

Support for login-protected pages:

### Credentials Authentication
```json
{
  "type": "credentials",
  "loginUrl": "https://example.com/login",
  "username": "user@example.com",
  "password": "password123"
}
```

### Session Cookies
```json
{
  "type": "cookies",
  "cookies": [
    {
      "name": "session_token",
      "value": "abc123...",
      "domain": "example.com"
    }
  ]
}
```

### Authorization Headers
```json
{
  "type": "headers",
  "headers": {
    "Authorization": "Bearer your-token-here"
  }
}
```

## 📋 API Reference

### POST /api/compare
Compare Figma design with web implementation

**Request:**
```json
{
  "figmaUrl": "https://www.figma.com/design/abc123/My-Design?node-id=1-2",
  "webUrl": "https://example.com/component",
  "authentication": {
    "type": "credentials",
    "loginUrl": "https://example.com/login",
    "username": "user@example.com",
    "password": "password"
  }
}
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "figma": {
      "fileId": "abc123",
      "fileName": "My Design",
      "componentsExtracted": 5
    },
    "web": {
      "url": "https://example.com/component",
      "elementsExtracted": 12,
      "authenticationUsed": "credentials"
    },
    "comparison": {
      "componentsAnalyzed": 5,
      "totalDeviations": 3,
      "totalMatches": 8,
      "severity": { "high": 0, "medium": 2, "low": 1 }
    }
  },
  "reports": {
    "html": "/reports/comparison-2024-01-01T12-00-00-000Z.html",
    "json": "/reports/comparison-2024-01-01T12-00-00-000Z.json"
  }
}
```

### GET /api/health
Check system health and MCP integration status

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "components": {
    "figmaExtractor": "initialized",
    "webExtractor": "initialized",
    "comparisonEngine": "initialized",
    "reportGenerator": "initialized"
  },
  "mcp": {
    "type": "official",
    "officialFigmaAvailable": true,
    "thirdPartyAvailable": false
  },
  "config": {
    "loaded": true,
    "thresholds": {
      "colorDifference": 10,
      "sizeDifference": 5,
      "spacingDifference": 3,
      "fontSizeDifference": 2
    }
  }
}
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Figma MCP     │    │   Web Scraper    │    │   Comparison    │
│   Integration   │    │   (Puppeteer)    │    │     Engine      │
│                 │    │                  │    │                 │
│ • Official MCP  │    │ • Live CSS       │    │ • Smart         │
│ • Third-party   │    │ • Authentication │    │   Matching      │
│ • Simulation    │    │ • Screenshots    │    │ • Property      │
│                 │    │                  │    │   Analysis      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │ Report Generator│
                    │                 │
                    │ • HTML Reports  │
                    │ • JSON Data     │
                    │ • Severity      │
                    │   Classification│
                    └─────────────────┘
```

## 🔍 Comparison Features

### Property Analysis
- **Typography**: Font family, size, weight, line height, letter spacing
- **Colors**: Text color, background color, border color
- **Spacing**: Padding, margins (top, right, bottom, left)
- **Borders**: Border radius, width, style, color
- **Dimensions**: Width, height, position
- **Effects**: Box shadows, opacity, transforms

### Smart Matching Algorithm
- **Component Name Similarity**: Matches based on text content and naming
- **Type Similarity**: Matches Figma types with HTML elements
- **Dimensional Similarity**: Considers size and position
- **Color Similarity**: Analyzes color relationships
- **Configurable Thresholds**: Adjustable sensitivity levels

### Severity Classification
- **High**: Critical deviations affecting user experience
- **Medium**: Notable differences requiring attention  
- **Low**: Minor variations within acceptable ranges

## 📁 Project Structure

```
Comparison tool/
├── src/
│   ├── figma/
│   │   ├── extractor.js          # Figma design data extraction
│   │   ├── mcpIntegration.js     # Official & third-party MCP support
│   │   └── urlParser.js          # Figma URL parsing
│   ├── scraper/
│   │   └── webExtractor.js       # Web scraping with Puppeteer
│   ├── compare/
│   │   └── comparisonEngine.js   # Design comparison logic
│   ├── report/
│   │   └── reportGenerator.js    # HTML/JSON report generation
│   └── visual/
│       └── visualDiff.js         # Image comparison (Pixelmatch)
├── public/                       # Web interface
├── output/
│   ├── reports/                  # Generated reports
│   └── images/                   # Downloaded images
├── config.json                   # Configuration
├── server.js                     # Express server
└── index.js                      # CLI interface
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Issues**: Report bugs and request features via GitHub Issues
- **Documentation**: [Official Figma MCP Guide](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Dev-Mode-MCP-Server)
- **Community**: Join discussions in GitHub Discussions

---

Built with ❤️ for designers and developers working together
