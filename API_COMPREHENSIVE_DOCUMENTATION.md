# Comprehensive API Documentation

## API Endpoints Overview

This document provides a complete list of all API endpoints in the Figma-Web Comparison Tool, including input/output specifications, call frequency, and usage patterns.

---

## 1. Health & Status APIs

### `/api/health`
- **Method**: `GET`
- **Input**: None
- **Input Type**: N/A
- **Output**: 
  ```json
  {
    "status": "healthy",
    "timestamp": "2024-09-24T...",
    "platform": "darwin",
    "version": "1.0.0",
    "services": {
      "figmaExtractor": "available",
      "webExtractor": "available",
      "comparisonEngine": "available"
    }
  }
  ```
- **Output Type**: `HealthStatus`
- **Call Frequency**: Every 5 seconds (frontend polling)
- **Reason**: Monitor server health and service availability

### `/api/version`
- **Method**: `GET`
- **Input**: None
- **Input Type**: N/A
- **Output**:
  ```json
  {
    "version": "1.0.0",
    "buildTimestamp": "2024-09-24T...",
    "gitCommit": "9a66aa37",
    "environment": "development"
  }
  ```
- **Output Type**: `VersionInfo`
- **Call Frequency**: Once on app startup
- **Reason**: Version verification and build validation

### `/api/health/detailed`
- **Method**: `GET`
- **Input**: None
- **Input Type**: N/A
- **Output**: Extended health information with service details
- **Output Type**: `DetailedHealthStatus`
- **Call Frequency**: On-demand (debugging)
- **Reason**: Detailed system diagnostics

---

## 2. Server Control APIs

### `/api/server/status`
- **Method**: `GET`
- **Input**: None
- **Input Type**: N/A
- **Output**:
  ```json
  {
    "success": true,
    "data": {
      "status": "running",
      "healthy": true,
      "lastHealthCheck": "2024-09-24T...",
      "uptime": 12345,
      "pid": 98765
    }
  }
  ```
- **Output Type**: `ServerControlResult`
- **Call Frequency**: Every 5 seconds (status polling)
- **Reason**: Monitor server lifecycle and operational status

### `/api/server/start`
- **Method**: `POST`
- **Input**: None
- **Input Type**: N/A
- **Output**: Server start confirmation
- **Output Type**: `ServerControlResult`
- **Call Frequency**: User-triggered (start button)
- **Reason**: Start server process

### `/api/server/stop`
- **Method**: `POST`
- **Input**: None
- **Input Type**: N/A
- **Output**: Server stop confirmation
- **Output Type**: `ServerControlResult`
- **Call Frequency**: User-triggered (stop button)
- **Reason**: Stop server process

### `/api/server/restart`
- **Method**: `POST`
- **Input**: None
- **Input Type**: N/A
- **Output**: Server restart confirmation
- **Output Type**: `ServerControlResult`
- **Call Frequency**: User-triggered (restart button)
- **Reason**: Restart server process

### `/api/server/health`
- **Method**: `GET`
- **Input**: None
- **Input Type**: N/A
- **Output**: Server health check
- **Output Type**: `HealthCheck`
- **Call Frequency**: Every 10 seconds (health monitoring)
- **Reason**: Continuous health monitoring

### `/api/server/status-stream`
- **Method**: `GET` (Server-Sent Events)
- **Input**: None
- **Input Type**: N/A
- **Output**: Real-time status updates stream
- **Output Type**: `EventSource`
- **Call Frequency**: Continuous (SSE connection)
- **Reason**: Real-time server status updates

---

## 3. Extraction APIs

### `/api/figma-only/extract` ⭐ **Primary Figma Endpoint**
- **Method**: `POST`
- **Input**:
  ```json
  {
    "figmaUrl": "https://figma.com/design/...",
    "extractionMode": "both" | "frame-only" | "global-styles"
  }
  ```
- **Input Type**: `FigmaExtractionRequest`
- **Output**:
  ```json
  {
    "success": true,
    "data": {
      "components": [...],
      "colors": [...],
      "typography": [...],
      "spacing": [...],
      "borderRadius": [...],
      "metadata": {
        "componentCount": 15,
        "colorCount": 8,
        "typographyCount": 12,
        "extractedAt": "2024-09-24T...",
        "source": "figma-mcp"
      }
    }
  }
  ```
- **Output Type**: `FigmaExtractionResponse`
- **Call Frequency**: User-triggered (Extract button for Figma-only)
- **Reason**: Extract design tokens and components from Figma files
- **Rate Limited**: ✅ Yes (external Figma API protection)

### `/api/web/extract-v3` ⭐ **Primary Web Endpoint**
- **Method**: `POST`
- **Input**:
  ```json
  {
    "url": "https://example.com",
    "authentication": {
      "type": "credentials",
      "loginUrl": "https://example.com/login",
      "username": "user",
      "password": "pass",
      "waitTime": 3000,
      "successIndicator": ".dashboard"
    },
    "options": {
      "includeScreenshot": false,
      "viewport": { "width": 1920, "height": 1080 },
      "timeout": 60000
    }
  }
  ```
- **Input Type**: `WebExtractionRequest`
- **Output**:
  ```json
  {
    "success": true,
    "data": {
      "elements": [...],
      "colors": ["#ff0000", "#00ff00"],
      "typography": {
        "fontFamilies": ["Arial", "Helvetica"],
        "fontSizes": ["16px", "18px"],
        "fontWeights": ["400", "600"]
      },
      "spacing": ["8px", "16px"],
      "borderRadius": ["4px", "8px"],
      "metadata": {
        "url": "https://example.com",
        "elementCount": 25,
        "extractorVersion": "3.0.0"
      }
    }
  }
  ```
- **Output Type**: `WebExtractionResponse`
- **Call Frequency**: User-triggered (Extract button for Web-only)
- **Reason**: Extract design tokens and elements from web pages
- **Rate Limited**: ❌ No (internal scraping operation)

### `/api/compare` ⭐ **Primary Comparison Endpoint**
- **Method**: `POST`
- **Input**:
  ```json
  {
    "figmaUrl": "https://figma.com/design/...",
    "webUrl": "https://example.com",
    "extractionMode": "both",
    "includeVisual": true,
    "nodeId": "1:2",
    "authentication": {
      "figmaToken": "figd_...",
      "webAuth": {
        "username": "user",
        "password": "pass"
      }
    }
  }
  ```
- **Input Type**: `ComparisonRequest`
- **Output**:
  ```json
  {
    "success": true,
    "data": {
      "comparison": {
        "overallSimilarity": 0.85,
        "totalComparisons": 40,
        "matchedElements": 34,
        "discrepancies": 6
      },
      "extractionDetails": {
        "figma": {
          "componentCount": 15,
          "colors": [...],
          "typography": {
            "fontFamilies": [...],
            "fontSizes": [...],
            "fontWeights": [...]
          }
        },
        "web": {
          "elementCount": 25,
          "colors": ["#ff0000", "#00ff00"],
          "typography": {...}
        },
        "comparison": {
          "matchPercentage": 85,
          "totalComparisons": 40,
          "matches": 34,
          "deviations": 6
        }
      },
      "figmaData": {...},
      "webData": {...}
    }
  }
  ```
- **Output Type**: `ComparisonResult`
- **Call Frequency**: User-triggered (Compare button)
- **Reason**: Perform full comparison between Figma and web implementations
- **Rate Limited**: ❌ No (internal comparison operation)

---

## 4. Legacy/Deprecated Extraction APIs

### `/api/web/extract` ⚠️ **Deprecated**
- **Status**: Legacy endpoint with deprecation warnings
- **Replacement**: Use `/api/web/extract-v3`
- **Call Frequency**: Minimal (legacy compatibility)

### `/api/web/extract-v2` ⚠️ **Deprecated**
- **Status**: Legacy endpoint with deprecation warnings
- **Replacement**: Use `/api/web/extract-v3`
- **Call Frequency**: Minimal (legacy compatibility)

---

## 5. MCP (Model Context Protocol) APIs

### `/api/mcp/status`
- **Method**: `GET`
- **Input**: None
- **Input Type**: N/A
- **Output**:
  ```json
  {
    "success": true,
    "status": "connected",
    "available": true,
    "message": "Figma Dev Mode MCP Server connected successfully",
    "data": {
      "connected": true,
      "serverUrl": "http://127.0.0.1:3845/mcp",
      "tools": ["get_code", "get_metadata", "get_variable_defs"],
      "toolsCount": 3
    }
  }
  ```
- **Output Type**: `MCPStatusResponse`
- **Call Frequency**: Every 30 seconds (MCP health monitoring)
- **Reason**: Monitor Figma Dev Mode MCP server connectivity

### `/api/mcp/figma/file`
- **Method**: `POST`
- **Input**:
  ```json
  {
    "fileKey": "abc123",
    "nodeId": "1:2"
  }
  ```
- **Input Type**: `MCPFigmaRequest`
- **Output**: Figma file data via MCP
- **Output Type**: `MCPFigmaResponse`
- **Call Frequency**: On-demand (Figma extraction via MCP)
- **Reason**: Extract Figma data using MCP tools

### `/api/mcp/test-connection`
- **Method**: `POST`
- **Input**:
  ```json
  {
    "method": "mcp_server" | "direct_api" | "mcp_tools",
    "serverUrl": "http://127.0.0.1:3845/mcp",
    "endpoint": "/api/...",
    "environment": "development"
  }
  ```
- **Input Type**: `MCPTestRequest`
- **Output**: Connection test results
- **Output Type**: `MCPTestResponse`
- **Call Frequency**: User-triggered (test connection)
- **Reason**: Validate MCP server connectivity

---

## 6. Screenshot Comparison APIs

### `/api/screenshots/upload`
- **Method**: `POST`
- **Input**: `FormData` with files
  - `figmaScreenshot`: File
  - `developedScreenshot`: File
  - `metadata`: JSON string
- **Input Type**: `FormData`
- **Output**:
  ```json
  {
    "success": true,
    "data": {
      "uploadId": "upload_123456",
      "figmaPath": "/uploads/figma_123.png",
      "developedPath": "/uploads/dev_123.png"
    }
  }
  ```
- **Output Type**: `ScreenshotUploadResponse`
- **Call Frequency**: User-triggered (screenshot upload)
- **Reason**: Upload screenshots for visual comparison

### `/api/screenshots/compare`
- **Method**: `POST`
- **Input**:
  ```json
  {
    "uploadId": "upload_123456",
    "settings": {
      "threshold": 0.1,
      "includePixelDiff": true
    }
  }
  ```
- **Input Type**: `ScreenshotCompareRequest`
- **Output**: Comparison results with visual differences
- **Output Type**: `ScreenshotCompareResponse`
- **Call Frequency**: User-triggered (after upload)
- **Reason**: Perform visual screenshot comparison

### `/api/screenshots/images/:comparisonId/:imageType`
- **Method**: `GET`
- **Input**: URL parameters (comparisonId, imageType)
- **Input Type**: URL params
- **Output**: Image file (PNG/JPEG)
- **Output Type**: Binary image data
- **Call Frequency**: On-demand (image display)
- **Reason**: Serve comparison result images

### `/api/screenshots/list`
- **Method**: `GET`
- **Input**: None
- **Input Type**: N/A
- **Output**: List of screenshot comparisons
- **Output Type**: `ScreenshotComparisonList`
- **Call Frequency**: Page load (comparison history)
- **Reason**: Display comparison history

---

## 7. Settings & Configuration APIs

### `/api/settings`
- **Method**: `GET`
- **Input**: None
- **Input Type**: N/A
- **Output**: Current application settings
- **Output Type**: `AppSettings`
- **Call Frequency**: App startup, settings page load
- **Reason**: Load current configuration

### `/api/settings/save`
- **Method**: `POST`
- **Input**:
  ```json
  {
    "figmaPersonalAccessToken": "figd_...",
    "defaultExtractionMode": "both",
    "timeout": 60000
  }
  ```
- **Input Type**: `SettingsUpdateRequest`
- **Output**: Save confirmation
- **Output Type**: `SettingsUpdateResponse`
- **Call Frequency**: User-triggered (save settings)
- **Reason**: Persist user configuration

### `/api/settings/test-connection`
- **Method**: `POST`
- **Input**:
  ```json
  {
    "figmaPersonalAccessToken": "figd_..."
  }
  ```
- **Input Type**: `ConnectionTestRequest`
- **Output**: Connection test results
- **Output Type**: `ConnectionTestResponse`
- **Call Frequency**: User-triggered (test connection)
- **Reason**: Validate API credentials

---

## 8. Reports & Data APIs

### `/api/reports/list`
- **Method**: `GET`
- **Input**: None
- **Input Type**: N/A
- **Output**: List of generated reports
- **Output Type**: `ReportList`
- **Call Frequency**: Reports page load
- **Reason**: Display available reports

### `/api/reports/:id`
- **Method**: `DELETE`
- **Input**: Report ID (URL parameter)
- **Input Type**: String
- **Output**: Deletion confirmation
- **Output Type**: `DeleteResponse`
- **Call Frequency**: User-triggered (delete report)
- **Reason**: Clean up old reports

---

## 9. Performance & Analytics APIs

### `/api/performance/summary`
- **Method**: `GET`
- **Input**: None
- **Input Type**: N/A
- **Output**: Performance metrics summary
- **Output Type**: `PerformanceSummary`
- **Call Frequency**: Dashboard load
- **Reason**: Display system performance

### `/api/performance/realtime`
- **Method**: `GET`
- **Input**: None
- **Input Type**: N/A
- **Output**: Real-time performance data
- **Output Type**: `RealtimeMetrics`
- **Call Frequency**: Every 10 seconds (performance monitoring)
- **Reason**: Live performance tracking

### `/api/health/circuit-breakers`
- **Method**: `GET`
- **Input**: None
- **Input Type**: N/A
- **Output**: Circuit breaker status
- **Output Type**: `CircuitBreakerStatus`
- **Call Frequency**: Health monitoring
- **Reason**: Service reliability monitoring

---

## 10. Color Analytics APIs

### `/api/colors/analytics`
- **Method**: `GET`
- **Input**: None
- **Input Type**: N/A
- **Output**: Color usage analytics
- **Output Type**: `ColorAnalytics`
- **Call Frequency**: Analytics page load
- **Reason**: Color usage insights

### `/api/colors/:color/elements`
- **Method**: `GET`
- **Input**: Color value (URL parameter)
- **Input Type**: String (hex color)
- **Output**: Elements using the color
- **Output Type**: `ColorElementMapping`
- **Call Frequency**: On-demand (color drill-down)
- **Reason**: Find elements using specific colors

### `/api/colors/search`
- **Method**: `POST`
- **Input**:
  ```json
  {
    "query": "#ff0000",
    "tolerance": 10
  }
  ```
- **Input Type**: `ColorSearchRequest`
- **Output**: Matching colors
- **Output Type**: `ColorSearchResponse`
- **Call Frequency**: User-triggered (color search)
- **Reason**: Find similar colors

---

## 11. Browser & System APIs

### `/api/browser/stats`
- **Method**: `GET`
- **Input**: None
- **Input Type**: N/A
- **Output**: Browser pool statistics
- **Output Type**: `BrowserStats`
- **Call Frequency**: System monitoring
- **Reason**: Browser resource management

### `/api/extractions/:id/cancel`
- **Method**: `POST`
- **Input**: Extraction ID (URL parameter)
- **Input Type**: String
- **Output**: Cancellation confirmation
- **Output Type**: `CancelResponse`
- **Call Frequency**: User-triggered (cancel operation)
- **Reason**: Stop long-running extractions

---

## Usage Patterns Summary

### High-Frequency APIs (Called Regularly)
1. `/api/health` - Every 5 seconds
2. `/api/server/status` - Every 5 seconds  
3. `/api/mcp/status` - Every 30 seconds
4. `/api/performance/realtime` - Every 10 seconds

### User-Triggered APIs (On-Demand)
1. `/api/figma-only/extract` - Extract button
2. `/api/web/extract-v3` - Extract button
3. `/api/compare` - Compare button
4. `/api/screenshots/upload` - Screenshot upload
5. `/api/settings/save` - Save settings

### Startup APIs (Once per Session)
1. `/api/version` - App startup
2. `/api/settings` - Settings load
3. `/api/reports/list` - Reports page

### Rate Limited APIs
- **Only** `/api/figma-only/extract` is rate limited (protects external Figma API)
- All other endpoints are unlimited (internal operations)

---

## Error Handling

All APIs return standardized error responses:
```json
{
  "success": false,
  "error": "Error message",
  "details": "Detailed error information",
  "timestamp": "2024-09-24T...",
  "code": "ERROR_CODE"
}
```

## Authentication

- **Figma APIs**: Require personal access token
- **Web Extraction**: Optional authentication for protected sites
- **Server Control**: No authentication (local server)
- **Screenshots**: No authentication (file upload)

This comprehensive documentation covers all 40+ API endpoints in the system with their complete specifications and usage patterns.


