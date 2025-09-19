# Feature Development SOP: End-to-End Design Approach

## 🎯 LESSONS LEARNED FROM MCP INTEGRATION

### **The Problem**
When we added MCP support, we experienced multiple data format mismatches because we didn't follow end-to-end design principles. We had:
- 5+ services handling the same data
- No clear data contracts between layers
- Each layer expecting different formats
- No integration testing

### **Root Cause**
**Over-modularization without clear contracts leads to integration hell.**

---

## 📋 STANDARD OPERATING PROCEDURE

### **PHASE 1: DESIGN FIRST (Before Writing Code)**

#### 1.1 Data Flow Mapping
```
Source → Transformer → Service → API → UI
  ↓        ↓           ↓       ↓      ↓
Define exact data structure at each step
```

#### 1.2 Create Data Contracts
```typescript
// Example: MCP Feature Contracts
interface MCPRawData {
  metadata: { content: string | object }
  code: { content: string | object }
  variables: { content: string | object, isError: boolean }
}

interface StandardizedFigmaData {
  components: Component[]
  colors: Color[]
  typography: Typography[]
  extractionMethod: string
  componentCount: number
}

interface APIResponse<T> {
  success: boolean
  data: T
  error?: string
}
```

#### 1.3 Service Responsibility Matrix
| Service | Input | Output | Responsibility |
|---------|-------|--------|----------------|
| MCPClient | URL | MCPRawData | MCP communication only |
| MCPXMLAdapter | MCPRawData | StandardizedFigmaData | Data transformation only |
| UnifiedExtractor | URL | APIResponse<StandardizedFigmaData> | Orchestration only |
| API Server | Request | APIResponse<StandardizedFigmaData> | HTTP handling only |

### **PHASE 2: CONTRACT-FIRST DEVELOPMENT**

#### 2.1 Write Integration Tests First
```javascript
describe('MCP End-to-End Flow', () => {
  it('should extract design tokens from MCP to UI display', async () => {
    const figmaUrl = 'test-url'
    const result = await fullPipeline.extract(figmaUrl)
    
    expect(result.success).toBe(true)
    expect(result.data.colors).toHaveLength(2)
    expect(result.data.colors[0].value).toBe('#1890FF')
  })
})
```

#### 2.2 Implement Services with Contracts
- Each service MUST implement its interface exactly
- Add runtime validation at boundaries
- Log data transformations

#### 2.3 Single Responsibility Principle
```
❌ BAD: UnifiedFigmaExtractor does MCP calls + transformation + error handling + response formatting
✅ GOOD: 
  - MCPClient: MCP communication
  - MCPAdapter: Data transformation  
  - UnifiedExtractor: Orchestration
  - API: HTTP handling
```

### **PHASE 3: VALIDATION & MONITORING**

#### 3.1 Data Validation
```javascript
function validateStandardizedData(data) {
  if (!data.components || !Array.isArray(data.components)) {
    throw new Error('Invalid components format')
  }
  if (!data.extractionMethod) {
    throw new Error('Missing extraction method')
  }
}
```

#### 3.2 Comprehensive Logging
```javascript
console.log('🔄 MCP Raw Data:', { 
  metadataType: typeof metadata.content,
  variablesError: variables.isError 
})
console.log('🎨 Adapter Output:', { 
  componentsCount: data.components.length,
  colorsCount: data.colors.length 
})
```

---

## 🚫 ANTI-PATTERNS TO AVOID

### **1. Service Proliferation**
- Don't create services for every small function
- Combine related operations in single services
- Use composition over inheritance

### **2. Implicit Data Contracts**
- Never assume data format without validation
- Always define interfaces/types
- Document expected data at each boundary

### **3. Mixed Responsibilities**
- Don't mix HTTP handling with business logic
- Don't mix data transformation with orchestration
- Keep each layer focused

### **4. No Integration Testing**
- Don't test services in isolation only
- Always test the full data flow
- Mock external dependencies, not internal ones

---

## ✅ SUCCESS METRICS

### **For Each New Feature:**
1. **Clear Data Flow**: Can trace data from source to UI in <5 steps
2. **Type Safety**: All data transformations are typed
3. **Single Responsibility**: Each service has one clear purpose
4. **Integration Tests**: Full pipeline is tested end-to-end
5. **Error Boundaries**: Clear error handling at each layer
6. **Performance**: No redundant data transformations

### **Architecture Health Check:**
- Can a new developer understand data flow in <30 minutes?
- Are there <3 services between data source and UI?
- Do integration tests cover happy path + error cases?
- Is each service <200 lines of focused code?

---

## 🎯 IMPLEMENTATION CHECKLIST

For every new feature:

- [ ] Map complete data flow (source → UI)
- [ ] Define TypeScript interfaces for all data
- [ ] Write integration test first
- [ ] Implement services with single responsibility
- [ ] Add data validation at boundaries
- [ ] Add comprehensive logging
- [ ] Test end-to-end before UI integration
- [ ] Document data contracts
- [ ] Performance test with real data
- [ ] Error handling for all failure modes

**Remember: Modular doesn't mean complex. Keep it simple, keep it focused, keep it tested.**
