# Figma-Web Comparison Tool - Complete API Documentation

## 📋 Overview

This document provides comprehensive documentation for all API endpoints in the Figma-Web Comparison Tool project. The project has two main applications:

1. **Web Application** - Browser-based version running on Node.js/Express
2. **macOS Application** - Electron-based desktop app with embedded Express server

Both applications share the same API structure for consistency and feature parity.

## 🏗️ Architecture

### Base URLs
- **Web App**: `http://localhost:3001` (development) / `https://your-domain.com` (production)
- **macOS App**: `http://localhost:3847` (embedded server)

### Response Format
All API endpoints return responses in the following standardized format:

```json
{
  "success": boolean,
  "data": any,
  "error": string,
  "message": string,
  "timestamp": "ISO 8601 string"
}
```

## 🔍 API Endpoints Reference

### 1. Health & Status Endpoints

#### `GET /api/health`
**Purpose**: Check server health and configuration status

**Parameters**: None

**Response**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "platform": "web" | "electron",
    "timestamp": "2025-09-06T17:49:00.000Z",
    "uptime": 12345.678,
    "memory": {
      "rss": 76611584,
      "heapTotal": 22102016,
      "heapUsed": 20029284,
      "external": 3130333,
      "arrayBuffers": 0
    },
    "config": {
      "configPath": "/path/to/config.json",
      "platform": "web" | "electron",
      "version": "2.0.0",
      "figmaConfigured": true,
      "lastUpdated": "2025-09-06T17:31:03.557Z",
      "validation": {
        "isValid": true,
        "errors": []
      }
    }
  }
}
```

**Usage**: Frontend uses this to verify server connectivity and configuration status.

---

#### `GET /api/status`
**Purpose**: Get basic server status

**Parameters**: None

**Response**:
```json
{
  "success": true,
  "data": {
    "status": "running",
    "timestamp": "2025-09-06T17:49:00.000Z"
  }
}
```

---

#### `GET /api/test`
**Purpose**: Debug endpoint for testing server functionality

**Parameters**: None

**Response**:
```json
{
  "success": true,
  "message": "Backend is working!",
  "timestamp": "2025-09-06T17:49:00.000Z",
  "config": {
    "figmaApiKeyConfigured": true,
    "figmaTimeout": 30000
  }
}
```

---

### 2. Configuration & Settings Endpoints

#### `POST /api/settings/save`
**Purpose**: Save application configuration (Figma API key, etc.)

**Parameters**:
```json
{
  "figmaApiKey": "string",
  "timeout": number,
  "other_settings": "any"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Settings saved successfully"
}
```

**Usage**: Frontend settings page uses this to persist user configuration.

---

#### `POST /api/settings/test-connection`
**Purpose**: Test Figma API connection with provided credentials

**Parameters**:
```json
{
  "figmaApiKey": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "handle": "username"
    }
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Invalid API key or connection failed"
}
```

---

### 3. Figma Extraction Endpoints

#### `POST /api/figma/extract`
**Purpose**: Extract design data from Figma files

**Parameters**:
```json
{
  "figmaUrl": "https://www.figma.com/design/fileId/filename?node-id=x-y",
  "lightMode": true,
  "skipAnalysis": false,
  "extractionMode": "frame-only" | "global-styles" | "both"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "nodeAnalysis": [
      {
        "nodeId": "2:22260",
        "name": "Component Name",
        "visible": true,
        "bounds": {
          "x": 0,
          "y": 0,
          "width": 100,
          "height": 50
        },
        "hasChildren": false,
        "childCount": 0,
        "styles": {
          "fills": [],
          "strokes": [],
          "effects": []
        }
      }
    ],
    "metadata": {
      "fileId": "fb5Yc1aKJv9YWsMLnNlWeK",
      "nodeId": "2:22260",
      "extractedAt": "2025-09-06T17:49:23.685Z",
      "source": "figma-api",
      "lightMode": true,
      "skipAnalysis": false,
      "processingTime": 1918
    }
  }
}
```

**Usage**: Core extraction functionality for analyzing Figma designs.

---

#### `POST /api/figma-only/extract`
**Purpose**: Figma-only extraction (alternative endpoint)

**Parameters**: Same as `/api/figma/extract`

**Response**: Same as `/api/figma/extract`

---

#### `GET /api/figma/metadata`
**Purpose**: Get metadata about a Figma file without full extraction

**Parameters**: 
- Query: `fileId=string&nodeId=string`

**Response**:
```json
{
  "success": true,
  "data": {
    "fileId": "string",
    "fileName": "string",
    "lastModified": "ISO 8601 string",
    "nodeCount": number,
    "version": "string"
  }
}
```

---

#### `POST /api/figma/parse`
**Purpose**: Parse Figma URL to extract file ID and node ID

**Parameters**:
```json
{
  "url": "https://www.figma.com/design/fileId/filename?node-id=x-y"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "fileId": "fb5Yc1aKJv9YWsMLnNlWeK",
    "nodeId": "2:22260",
    "fileName": "My Design",
    "isValid": true
  }
}
```

---

### 4. Web Extraction Endpoints

#### `POST /api/web/extract`
**Purpose**: Extract design elements from web pages

**Parameters**:
```json
{
  "url": "https://example.com",
  "authentication": {
    "type": "basic" | "form" | "oauth",
    "credentials": {
      "username": "string",
      "password": "string"
    }
  },
  "options": {
    "timeout": 30000,
    "includeScreenshot": true,
    "viewport": {
      "width": 1920,
      "height": 1080
    },
    "stabilityTimeout": 5000
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "url": "https://example.com",
    "extractedAt": "2025-09-06T17:49:00.000Z",
    "duration": 4259,
    "screenshot": "base64_string",
    "elements": [
      {
        "id": "element-0-0",
        "type": "h1",
        "text": "Example Domain",
        "className": "",
        "rect": {
          "x": 660,
          "y": 133,
          "width": 600,
          "height": 38
        },
        "styles": {
          "color": "rgb(0, 0, 0)",
          "backgroundColor": "rgba(0, 0, 0, 0)",
          "fontSize": "32px",
          "fontFamily": "Arial, sans-serif",
          "fontWeight": "700"
        },
        "attributes": {
          "href": "",
          "alt": "",
          "src": "",
          "role": ""
        },
        "source": "unified-extractor"
      }
    ],
    "colorPalette": ["#000000", "#ffffff"],
    "typography": {
      "fonts": ["Arial", "Helvetica"],
      "sizes": ["16px", "32px"]
    },
    "spacing": {
      "margins": ["0px", "16px"],
      "paddings": ["0px", "8px"]
    },
    "borderRadius": ["0px", "4px"],
    "metadata": {
      "elementsCount": 4,
      "extractorVersion": "unified-v3"
    }
  }
}
```

---

#### `POST /api/web/extract-v2`
**Purpose**: Legacy web extraction endpoint (V2)

**Parameters**: Same as `/api/web/extract`

**Response**: Same as `/api/web/extract` with `"extractor": "v2"` in metadata

---

#### `POST /api/web/extract-v3`
**Purpose**: Latest web extraction endpoint (V3 - Recommended)

**Parameters**: Same as `/api/web/extract`

**Response**: Same as `/api/web/extract` with enhanced performance tracking

---

#### `POST /api/web-only/extract`
**Purpose**: Web-only extraction without comparison

**Parameters**: Same as `/api/web/extract`

**Response**: Same as `/api/web/extract`

---

### 5. Comparison Endpoints

#### `POST /api/compare`
**Purpose**: Compare Figma design with web implementation

**Parameters**:
```json
{
  "figmaUrl": "https://www.figma.com/design/fileId/filename?node-id=x-y",
  "webUrl": "https://example.com",
  "extractionMode": "frame-only" | "global-styles" | "both",
  "includeVisual": false
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "figmaComponentCount": 1,
    "webElementCount": 4,
    "figmaData": {
      "fileId": "fb5Yc1aKJv9YWsMLnNlWeK",
      "fileName": "Figma Design",
      "componentsCount": 1,
      "components": [...]
    },
    "webData": {
      "url": "https://example.com",
      "elementsCount": 4,
      "elements": [...]
    },
    "extractionDetails": {
      "figma": {
        "componentCount": 1,
        "extractionTime": 1918,
        "fileInfo": {...}
      },
      "web": {
        "elementCount": 4,
        "extractionTime": 4259,
        "urlInfo": {...}
      }
    },
    "comparison": {
      "matches": [],
      "differences": [],
      "similarity": 0.85
    },
    "timestamp": "2025-09-06T17:41:41.703Z",
    "status": "completed",
    "figmaUrl": "...",
    "webUrl": "...",
    "includeVisual": false
  }
}
```

**Usage**: Main comparison functionality used by the frontend comparison form.

---

### 6. Screenshot Comparison Endpoints

#### `POST /api/screenshots/upload`
**Purpose**: Upload screenshots for comparison

**Parameters**: 
- Content-Type: `multipart/form-data`
- File field: `screenshot`
- Additional fields: `metadata` (JSON string)

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "screenshot_id",
    "filename": "screenshot.png",
    "size": 1024000,
    "uploadedAt": "2025-09-06T17:49:00.000Z"
  }
}
```

---

#### `POST /api/screenshots/compare`
**Purpose**: Compare two uploaded screenshots

**Parameters**:
```json
{
  "screenshot1Id": "string",
  "screenshot2Id": "string",
  "options": {
    "threshold": 0.1,
    "includePixelDiff": true
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "comparisonId": "string",
    "similarity": 0.95,
    "differences": {
      "pixelCount": 1234,
      "percentage": 5.2
    },
    "diffImage": "base64_string"
  }
}
```

---

#### `GET /api/screenshots/list`
**Purpose**: List all uploaded screenshots

**Parameters**: 
- Query: `page=number&limit=number`

**Response**:
```json
{
  "success": true,
  "data": {
    "screenshots": [
      {
        "id": "string",
        "filename": "string",
        "size": number,
        "uploadedAt": "ISO 8601 string"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

---

#### `GET /api/screenshots/:id`
**Purpose**: Get screenshot metadata

**Parameters**: 
- Path: `id` (screenshot ID)

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "filename": "string",
    "size": number,
    "uploadedAt": "ISO 8601 string",
    "metadata": {...}
  }
}
```

---

#### `DELETE /api/screenshots/:id`
**Purpose**: Delete a screenshot

**Parameters**: 
- Path: `id` (screenshot ID)

**Response**:
```json
{
  "success": true,
  "message": "Screenshot deleted successfully"
}
```

---

#### `GET /api/screenshots/images/:comparisonId/:imageType`
**Purpose**: Serve screenshot images

**Parameters**: 
- Path: `comparisonId`, `imageType` (original|diff|overlay)

**Response**: Binary image data (PNG/JPEG)

---

#### `GET /api/screenshots/reports/:comparisonId`
**Purpose**: Get screenshot comparison report

**Parameters**: 
- Path: `comparisonId`

**Response**: HTML report or JSON data

---

#### `GET /api/screenshots/compare/:comparisonId`
**Purpose**: Get screenshot comparison results

**Parameters**: 
- Path: `comparisonId`

**Response**:
```json
{
  "success": true,
  "data": {
    "comparisonId": "string",
    "similarity": 0.95,
    "differences": {...},
    "createdAt": "ISO 8601 string"
  }
}
```

---

### 7. Report Management Endpoints

#### `GET /api/reports/list`
**Purpose**: List all generated reports

**Parameters**: 
- Query: `page=number&limit=number&type=string`

**Response**:
```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "id": "string",
        "type": "comparison" | "screenshot",
        "title": "string",
        "createdAt": "ISO 8601 string",
        "size": number,
        "url": "/api/reports/report_id"
      }
    ],
    "pagination": {...}
  }
}
```

---

#### `GET /api/reports/:id`
**Purpose**: Get specific report

**Parameters**: 
- Path: `id` (report ID)

**Response**: HTML report or JSON data

---

#### `DELETE /api/reports/:id`
**Purpose**: Delete a report

**Parameters**: 
- Path: `id` (report ID)

**Response**:
```json
{
  "success": true,
  "message": "Report deleted successfully"
}
```

---

#### `POST /api/reports/export`
**Purpose**: Export reports in various formats

**Parameters**:
```json
{
  "reportIds": ["string"],
  "format": "pdf" | "html" | "json",
  "options": {...}
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "exportId": "string",
    "downloadUrl": "/api/reports/exports/export_id",
    "format": "pdf",
    "size": 1024000
  }
}
```

---

### 8. Performance & Monitoring Endpoints

#### `GET /api/performance/summary`
**Purpose**: Get performance metrics summary

**Parameters**: 
- Query: `period=hour|day|week`

**Response**:
```json
{
  "success": true,
  "data": {
    "extractions": {
      "total": 150,
      "successful": 145,
      "failed": 5,
      "averageTime": 5234
    },
    "comparisons": {
      "total": 75,
      "averageTime": 8456
    },
    "resources": {
      "memoryUsage": 123456789,
      "cpuUsage": 45.2
    }
  }
}
```

---

#### `GET /api/performance/realtime`
**Purpose**: Get real-time performance metrics

**Parameters**: None

**Response**:
```json
{
  "success": true,
  "data": {
    "activeExtractions": 3,
    "queueLength": 2,
    "memoryUsage": 123456789,
    "cpuUsage": 45.2,
    "browserInstances": 2
  }
}
```

---

#### `GET /api/browser/stats`
**Purpose**: Get browser pool statistics

**Parameters**: None

**Response**:
```json
{
  "success": true,
  "data": {
    "browserPool": {
      "active": 2,
      "idle": 1,
      "total": 3,
      "maxInstances": 5
    },
    "resourceManager": {
      "tracked": 15,
      "cleaned": 142
    },
    "activeExtractions": {
      "v2": 1,
      "v3": 2
    },
    "platform": {
      "os": "darwin",
      "arch": "arm64",
      "nodeVersion": "v18.17.0"
    }
  }
}
```

---

### 9. Advanced Features

#### `POST /api/extractions/:id/cancel`
**Purpose**: Cancel an ongoing extraction

**Parameters**: 
- Path: `id` (extraction ID)

**Response**:
```json
{
  "success": true,
  "message": "Extraction cancelled successfully"
}
```

---

#### `GET /api/health/detailed`
**Purpose**: Get detailed health information

**Parameters**: None

**Response**:
```json
{
  "success": true,
  "data": {
    "services": {
      "figmaApi": "healthy",
      "browserPool": "healthy",
      "database": "healthy"
    },
    "dependencies": {
      "figmaMcp": "connected",
      "chrome": "available"
    },
    "performance": {
      "responseTime": 45,
      "throughput": 12.5
    }
  }
}
```

---

#### `GET /api/health/circuit-breakers`
**Purpose**: Get circuit breaker status

**Parameters**: None

**Response**:
```json
{
  "success": true,
  "data": {
    "figmaApi": {
      "state": "closed",
      "failures": 0,
      "lastFailure": null
    },
    "webExtraction": {
      "state": "open",
      "failures": 5,
      "lastFailure": "2025-09-06T17:30:00.000Z"
    }
  }
}
```

---

### 10. MCP (Model Context Protocol) Endpoints

#### `GET /api/mcp/status`
**Purpose**: Check MCP server connection status

**Parameters**: None

**Response**:
```json
{
  "success": true,
  "data": {
    "connected": true,
    "serverUrl": "http://127.0.0.1:3845",
    "lastPing": "2025-09-06T17:49:00.000Z"
  }
}
```

---

## 🔧 Error Handling

### Standard Error Response
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional error details",
  "timestamp": "2025-09-06T17:49:00.000Z"
}
```

### Common Error Codes
- `INVALID_API_KEY` - Figma API key is invalid
- `EXTRACTION_TIMEOUT` - Extraction process timed out
- `INVALID_URL` - Provided URL is malformed
- `RATE_LIMITED` - Too many requests
- `SERVER_ERROR` - Internal server error
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Request validation failed

---

## 🚀 Usage Examples

### Frontend Integration
```typescript
import { compareUrls } from '../services/api';

const result = await compareUrls({
  figmaUrl: 'https://www.figma.com/design/...',
  webUrl: 'https://example.com',
  extractionMode: 'both'
});

console.log('Comparison result:', result);
```

### Direct API Calls
```bash
# Test server health
curl http://localhost:3847/api/health

# Compare designs
curl -X POST http://localhost:3847/api/compare \
  -H "Content-Type: application/json" \
  -d '{
    "figmaUrl": "https://www.figma.com/design/...",
    "webUrl": "https://example.com"
  }'
```

---

## 📊 Platform Differences

### Web App Specific Features
- WebSocket support for real-time updates
- Enhanced performance monitoring
- Circuit breaker patterns
- Advanced rate limiting

### macOS App Specific Features
- Embedded Express server
- Local file system access
- Native OS integration
- Offline capability

### Shared Features
- All core API endpoints
- Same request/response formats
- Unified error handling
- Cross-platform compatibility

---

## 🔒 Security & Rate Limiting

### Rate Limits
- **General**: 100 requests per minute
- **Extraction**: 10 requests per minute
- **Upload**: 5 requests per minute

### Security Headers
- CORS enabled for cross-origin requests
- Helmet.js for security headers
- Content Security Policy (CSP)
- Request validation and sanitization

### Authentication
- Figma API key validation
- Optional basic authentication for web extraction
- Session-based authentication (future feature)

---

## 📈 Performance Considerations

### Timeouts
- **Frontend**: 45 seconds
- **Figma API**: 30 seconds (light mode: 10 seconds)
- **Web Extraction**: 30 seconds (FreightTiger: 180 seconds)

### Optimization Features
- Request retry logic (3 attempts)
- Browser pool management
- Resource cleanup
- Memory monitoring
- Performance tracking

---

This documentation covers all API endpoints currently implemented in the Figma-Web Comparison Tool. Both web and macOS applications maintain feature parity with identical API contracts for seamless cross-platform compatibility.
