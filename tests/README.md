# Test Suite Documentation

## Overview

This comprehensive test suite covers all aspects of the Figma-Web Comparison Tool, ensuring reliability, performance, and maintainability.

## Test Structure

```
tests/
├── unit/                    # Unit tests for individual modules
│   ├── figma/              # Figma integration tests
│   ├── scraper/            # Web scraping tests
│   ├── compare/            # Comparison engine tests
│   ├── visual/             # Visual comparison tests
│   └── report/             # Report generation tests
├── integration/            # Integration tests
├── api/                    # API endpoint tests
├── e2e/                    # End-to-end tests
├── performance/            # Performance tests
├── fixtures/               # Test data and mock responses
├── helpers/                # Test utilities and helpers
└── config/                 # Test configurations
```

## Test Categories

### 🧪 Unit Tests (`tests/unit/`)
Tests individual modules in isolation with mocked dependencies.

**Coverage:**
- FigmaExtractor: API integration, data extraction, error handling
- WebExtractor: Browser automation, style extraction, authentication
- ComparisonEngine: Design comparison, color/typography analysis
- VisualDiff: Image comparison, similarity calculation
- ReportGenerator: HTML/JSON report generation

### 🔗 Integration Tests (`tests/integration/`)
Tests module interactions and data flow between components.

**Coverage:**
- Figma → Comparison Engine workflow
- Web Scraper → Comparison Engine workflow
- Complete comparison pipeline
- Error propagation and recovery
- Configuration integration

### 🌐 API Tests (`tests/api/`)
Tests REST API endpoints using supertest.

**Coverage:**
- Health and configuration endpoints
- Comparison endpoints (single and batch)
- Reports listing endpoint
- Error handling and validation
- Authentication and security
- Performance and rate limiting

### 🎯 End-to-End Tests (`tests/e2e/`)
Tests complete user workflows from start to finish.

**Coverage:**
- Full comparison workflows
- CLI command execution
- Report generation and access
- Authentication flows
- Error scenarios

### ⚡ Performance Tests (`tests/performance/`)
Tests system performance under various loads.

**Coverage:**
- Large dataset processing
- Concurrent request handling
- Memory usage monitoring
- Response time validation
- Resource cleanup

## Running Tests

### Install Dependencies

```bash
npm install
```

### Run All Tests

```bash
npm test
# or
npm run test:coverage
```

### Run Specific Test Categories

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# API tests only
npm run test:api

# End-to-end tests only
npm run test:e2e

# Performance tests only
npm run test:performance
```

### Run Tests with Watch Mode

```bash
npm run test:watch
```

### Using the Test Runner

```bash
# Run all tests
node tests/run-tests.js

# Run specific categories
node tests/run-tests.js unit integration

# Get help
node tests/run-tests.js --help
```

## Test Configuration

### Jest Configuration

The Jest configuration is defined in `package.json`:

```json
{
  "jest": {
    "testEnvironment": "node",
    "setupFilesAfterEnv": ["<rootDir>/tests/setup.js"],
    "testMatch": ["<rootDir>/tests/**/*.test.js"],
    "collectCoverageFrom": [
      "src/**/*.js",
      "!src/**/*.test.js",
      "!**/node_modules/**"
    ],
    "coverageDirectory": "coverage",
    "coverageReporters": ["text", "lcov", "html"],
    "testTimeout": 30000
  }
}
```

### Global Test Setup

The `tests/setup.js` file provides:
- Global test utilities
- Mock data generators
- Common test configurations
- Cleanup functions

### Mock Services

The `tests/helpers/mockServices.js` provides:
- MockFigmaAPI: Mocks Figma API responses
- MockPuppeteer: Mocks browser automation
- MockFileSystem: Mocks file operations
- MockMCPServer: Mocks MCP server integration

## Writing Tests

### Test File Naming

- Unit tests: `*.test.js` in appropriate module directory
- Integration tests: `*.test.js` in `tests/integration/`
- API tests: `*.test.js` in `tests/api/`

### Test Structure

```javascript
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { MockFigmaAPI, resetAllMocks } from '../helpers/mockServices.js';

describe('ModuleName', () => {
  beforeEach(() => {
    // Setup for each test
    MockFigmaAPI.setup();
  });

  afterEach(() => {
    // Cleanup after each test
    resetAllMocks();
  });

  describe('Feature Group', () => {
    test('should do something specific', async () => {
      // Arrange
      const input = 'test-input';
      
      // Act
      const result = await moduleFunction(input);
      
      // Assert
      expect(result).toHaveProperty('expectedProperty');
      expect(result.expectedProperty).toBe('expectedValue');
    });
  });
});
```

### Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Mocking**: Mock external dependencies to ensure tests are fast and reliable
3. **Descriptive Names**: Use clear, descriptive test names that explain what is being tested
4. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and verification phases
5. **Error Testing**: Include tests for error conditions and edge cases
6. **Performance**: Keep tests fast by mocking expensive operations

### Mock Data

Use the global test utilities for consistent mock data:

```javascript
// Generate test configuration
const config = global.testUtils.generateTestConfig();

// Generate mock Figma data
const figmaData = global.testUtils.generateMockFigmaData();

// Generate mock web data
const webData = global.testUtils.generateMockWebData();
```

## Coverage Goals

- **Unit Tests**: 90%+ line coverage
- **Integration Tests**: 80%+ feature coverage
- **API Tests**: 100% endpoint coverage
- **E2E Tests**: Critical user journey coverage

## Continuous Integration

The test suite is designed to run in CI/CD environments:

```yaml
# Example GitHub Actions workflow
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v1
```

## Debugging Tests

### Running Individual Tests

```bash
# Run a specific test file
npx jest tests/unit/figma/extractor.test.js

# Run tests matching a pattern
npx jest --testNamePattern="should extract design data"

# Run with verbose output
npx jest --verbose
```

### Debug Mode

```bash
# Run with Node.js debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Run with increased timeout for debugging
npx jest --testTimeout=60000
```

### Common Issues

1. **Timeout Errors**: Increase timeout in Jest config or specific tests
2. **Mock Issues**: Ensure mocks are properly reset between tests
3. **Async Issues**: Use proper async/await or return promises
4. **Memory Leaks**: Ensure proper cleanup in afterEach hooks

## Test Data Management

### Fixtures

Test fixtures are stored in `tests/fixtures/`:
- `screenshots/`: Sample images for visual comparison tests
- `reports/`: Sample report files
- `test-config.json`: Test configuration file

### Dynamic Data

Use factories for generating test data:

```javascript
// Generate realistic test data
const generateTestComponent = (overrides = {}) => ({
  id: 'test-component-id',
  name: 'Test Component',
  type: 'TEXT',
  properties: {
    fontSize: 16,
    fontFamily: 'Inter',
    color: { r: 0, g: 0, b: 0, a: 1 }
  },
  ...overrides
});
```

## Performance Testing

### Load Testing

Performance tests validate system behavior under load:

```javascript
test('should handle concurrent requests', async () => {
  const requests = Array.from({ length: 10 }, () => 
    performComparison(testData)
  );
  
  const results = await Promise.all(requests);
  
  expect(results).toHaveLength(10);
  results.forEach(result => {
    expect(result).toBeDefined();
  });
});
```

### Memory Testing

Monitor memory usage during tests:

```javascript
test('should not leak memory', async () => {
  const initialMemory = process.memoryUsage().heapUsed;
  
  // Perform operations
  for (let i = 0; i < 100; i++) {
    await performOperation();
  }
  
  // Force garbage collection
  if (global.gc) global.gc();
  
  const finalMemory = process.memoryUsage().heapUsed;
  const memoryIncrease = finalMemory - initialMemory;
  
  expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB threshold
});
```

## Contributing

When adding new features:

1. Write tests first (TDD approach)
2. Ensure all existing tests pass
3. Add appropriate test coverage
4. Update this documentation if needed
5. Run the full test suite before submitting

## Troubleshooting

### Common Test Failures

1. **Network Issues**: Ensure mocks are properly configured
2. **File System Issues**: Check permissions and cleanup
3. **Browser Issues**: Verify Puppeteer configuration
4. **Timing Issues**: Add appropriate waits or increase timeouts

### Getting Help

- Check test logs for detailed error messages
- Review mock configurations in `tests/helpers/`
- Ensure test environment is properly set up
- Run tests individually to isolate issues 