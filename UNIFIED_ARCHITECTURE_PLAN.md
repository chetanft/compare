# UNIFIED ARCHITECTURE IMPLEMENTATION PLAN

## 🎯 OBJECTIVE
Create complete feature parity between web app and macOS app with automatic synchronization for future updates.

## 📋 IMPLEMENTATION PHASES

### PHASE 1: ARCHITECTURE UNIFICATION (Days 1-2)

#### 1.1 Shared Module Structure
```
src/
├── shared/                    # NEW: Core shared modules
│   ├── api/
│   │   ├── routes/           # Unified route definitions
│   │   ├── middleware/       # Common middleware
│   │   └── handlers/         # Shared request handlers
│   ├── services/
│   │   ├── FigmaService.js   # Unified Figma service
│   │   ├── WebService.js     # Unified web extraction
│   │   ├── ComparisonService.js
│   │   ├── ScreenshotService.js
│   │   ├── ReportService.js
│   │   └── PerformanceService.js
│   ├── config/
│   │   └── unified-config.js # Shared configuration
│   └── types/
│       └── api-types.ts      # TypeScript definitions
├── web/                      # Web-specific implementations
│   └── server/
│       └── web-server.js     # Web Express server
├── macos/                    # macOS-specific implementations
│   └── server/
│       └── electron-server.js # Electron Express server
└── platforms/                # Platform-specific adapters
    ├── web-adapter.js
    └── electron-adapter.js
```

#### 1.2 Express.js Migration for macOS
- Replace custom HTTP server in electron/main.js with Express.js
- Use identical middleware stack as web app
- Maintain Electron-specific file serving

#### 1.3 Unified API Definition
- Single source of truth for all API endpoints
- Shared route handlers
- Common validation and error handling

### PHASE 2: MISSING FEATURES IMPLEMENTATION (Days 3-5)

#### 2.1 Screenshot Comparison System
**Endpoints to implement:**
- `POST /api/screenshots/upload`
- `POST /api/screenshots/compare` 
- `GET /api/screenshots/images/:comparisonId/:imageType`
- `GET /api/screenshots/reports/:comparisonId`
- `GET /api/screenshots/compare/:comparisonId`
- `GET /api/screenshots/list`

#### 2.2 Report Management System
**Endpoints to implement:**
- `GET /api/reports/list`
- `GET /api/reports/:id`
- `DELETE /api/reports/:id`
- `POST /api/reports/export`

#### 2.3 Performance Monitoring
**Endpoints to implement:**
- `GET /api/performance/summary`
- `GET /api/performance/realtime`
- `GET /api/browser/stats`

#### 2.4 Advanced Features
**Endpoints to implement:**
- `POST /api/extractions/:id/cancel`
- `GET /api/health/detailed`
- `GET /api/health/circuit-breakers`
- `POST /api/web/extract-v2` (legacy support)

### PHASE 3: AUTO-SYNCHRONIZATION SYSTEM (Days 6-7)

#### 3.1 Shared Module System
- Symbolic links or module references
- Automatic dependency resolution
- Build-time validation

#### 3.2 Development Workflow
- Single command to update both apps
- Automated testing across platforms
- CI/CD pipeline for consistency

#### 3.3 Configuration Management
- Unified configuration schema
- Platform-specific overrides
- Environment-based settings

## 🔧 TECHNICAL SPECIFICATIONS

### Unified API Handler Pattern
```javascript
// shared/api/handlers/figma-handler.js
export class FigmaHandler {
  static async testConnection(req, res) {
    // Shared logic for both platforms
  }
  
  static async extract(req, res) {
    // Shared extraction logic
  }
}

// web/server/web-server.js
import { FigmaHandler } from '../../shared/api/handlers/figma-handler.js';
app.post('/api/settings/test-connection', FigmaHandler.testConnection);

// macos/server/electron-server.js  
import { FigmaHandler } from '../../shared/api/handlers/figma-handler.js';
app.post('/api/settings/test-connection', FigmaHandler.testConnection);
```

### Platform Adapter Pattern
```javascript
// platforms/web-adapter.js
export class WebAdapter {
  static getConfigPath() {
    return path.join(process.cwd(), 'config.json');
  }
}

// platforms/electron-adapter.js
export class ElectronAdapter {
  static getConfigPath() {
    return path.join(app.getPath('userData'), 'config.json');
  }
}
```

## 📊 SUCCESS METRICS

### Feature Parity Checklist
- [ ] All 15+ API endpoints implemented
- [ ] Screenshot comparison system
- [ ] Report management
- [ ] Performance monitoring
- [ ] Error handling consistency
- [ ] Configuration synchronization

### Quality Assurance
- [ ] Automated tests for all shared modules
- [ ] Cross-platform compatibility tests
- [ ] Performance benchmarks
- [ ] Memory usage optimization

## 🚀 IMPLEMENTATION TIMELINE

**Day 1-2:** Architecture foundation and Express migration
**Day 3-4:** Core missing features (screenshots, reports)
**Day 5:** Performance monitoring and advanced features  
**Day 6-7:** Auto-sync system and testing

## 🔄 MAINTENANCE WORKFLOW

### Adding New Features
1. Implement in `shared/` modules
2. Add platform adapters if needed
3. Update both web and macOS servers
4. Run cross-platform tests
5. Deploy simultaneously

### Configuration Changes
1. Update unified config schema
2. Migrate existing configurations
3. Test on both platforms
4. Document breaking changes

This plan ensures **zero feature gaps** and **automatic synchronization** for all future updates.
