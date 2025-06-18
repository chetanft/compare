import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const config = {
  timeout: 300000, // 5 minutes
  retries: 2,
  testFile: './tests/integration/comparison-service.test.js'
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

/**
 * Run tests with retries
 */
async function runTests() {
  console.log(`${colors.bright}🧪 Running Comparison Service Tests${colors.reset}\n`);

  for (let attempt = 1; attempt <= config.retries + 1; attempt++) {
    if (attempt > 1) {
      console.log(`\n${colors.yellow}Retry attempt ${attempt - 1}${colors.reset}\n`);
    }

    try {
      await new Promise((resolve, reject) => {
        const testProcess = spawn('node', ['--test', config.testFile], {
          stdio: 'inherit',
          env: {
            ...process.env,
            NODE_ENV: 'test',
            TEST_TIMEOUT: config.timeout.toString()
          }
        });

        testProcess.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Tests failed with code ${code}`));
          }
        });

        // Handle process termination
        testProcess.on('error', (error) => {
          reject(new Error(`Test process error: ${error.message}`));
        });

        // Set timeout
        const timeoutId = setTimeout(() => {
          testProcess.kill();
          reject(new Error('Tests timed out'));
        }, config.timeout);

        // Clear timeout on success
        testProcess.on('close', () => clearTimeout(timeoutId));
      });

      console.log(`\n${colors.green}✅ All tests passed!${colors.reset}`);
      process.exit(0);
    } catch (error) {
      if (attempt <= config.retries) {
        console.log(`\n${colors.yellow}⚠️ Tests failed, retrying...${colors.reset}`);
        console.log(`Error: ${error.message}\n`);
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        console.log(`\n${colors.red}❌ Tests failed after ${config.retries} retries${colors.reset}`);
        console.log(`Final error: ${error.message}`);
        process.exit(1);
      }
    }
  }
}

// Run tests
runTests().catch(error => {
  console.error(`\n${colors.red}❌ Fatal error:${colors.reset}`, error);
  process.exit(1);
}); 