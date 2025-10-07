# Figma-Web Comparison Tool

A tool for comparing Figma designs with web implementations.

## Features

- Extract design data from Figma using the Figma API and MCP
- Extract web implementation data using Puppeteer
- Compare design data with web implementation data
- Generate detailed HTML reports of comparison results
- RESTful API for integration with other tools

## Architecture

The project follows a modular architecture:

- `src/core/` - Core utilities and server setup
  - `config/` - Configuration loading and management
  - `server/` - Express server setup, middleware, and routes
  - `utils/` - Utility functions for logging, file system operations, etc.
- `src/extractors/` - Data extraction modules
  - `base/` - Base extractor class
  - `figma/` - Figma data extraction
  - `web/` - Web implementation data extraction
- `src/comparison/` - Comparison engine
- `src/reporting/` - Report generation
- `src/mcp/` - Figma MCP integration

## API Endpoints

- `GET /api/figma/file/:fileId` - Get Figma file data
- `GET /api/figma/file/:fileId/node/:nodeId` - Get Figma node data
- `GET /api/figma/mcp/status` - Check MCP status
- `POST /api/web/extract` - Extract web data
- `POST /api/compare` - Compare Figma and web data
- `POST /api/report` - Generate HTML report
- `POST /api/analyze` - Extract, compare, and generate report in one step

## Getting Started

### Prerequisites

- Node.js 18 or later
- Figma API key

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file with the following variables:

```
FIGMA_API_KEY=your_figma_api_key
```

### Usage

Start the server:

```bash
npm start
```

The server will run on port 3847 by default.

> **Note:** Default server is now 'main'; run `node start-server.js` to start the modular server implementation.

## Development

Run the server in development mode:

```bash
npm run dev
```

## License

MIT
