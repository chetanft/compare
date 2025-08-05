/**
 * Load Testing Script
 * Tests performance and stability under concurrent load
 */

import { performance } from 'perf_hooks';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import fetch from 'node-fetch';

class LoadTester {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:3007';
    this.concurrency = options.concurrency || 10;
    this.duration = options.duration || 30000; // 30 seconds
    this.scenarios = options.scenarios || this.getDefaultScenarios();
    this.results = {
      requests: [],
      errors: [],
      startTime: null,
      endTime: null
    };
  }

  getDefaultScenarios() {
    return [
      {
        name: 'health-check',
        weight: 40,
        url: '/api/health',
        method: 'GET'
      },
      {
        name: 'browser-stats',
        weight: 20,
        url: '/api/browser/stats',
        method: 'GET'
      },
      {
        name: 'figma-extraction',
        weight: 20,
        url: '/api/figma-only/extract',
        method: 'POST',
        body: { figmaUrl: 'https://www.figma.com/file/example' }
      },
      {
        name: 'web-extraction',
        weight: 20,
        url: '/api/web/extract-v2',
        method: 'POST',
        body: { url: 'https://example.com' }
      }
    ];
  }

  async makeRequest(scenario) {
    const startTime = performance.now();
    const url = `${this.baseUrl}${scenario.url}`;
    
    try {
      const options = {
        method: scenario.method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'LoadTester/1.0'
        }
      };

      if (scenario.body) {
        options.body = JSON.stringify(scenario.body);
      }

      const response = await fetch(url, options);
      const endTime = performance.now();
      
      return {
        scenario: scenario.name,
        status: response.status,
        duration: endTime - startTime,
        size: parseInt(response.headers.get('content-length') || '0'),
        timestamp: Date.now()
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        scenario: scenario.name,
        status: 0,
        duration: endTime - startTime,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  selectScenario() {
    const random = Math.random() * 100;
    let cumulative = 0;
    
    for (const scenario of this.scenarios) {
      cumulative += scenario.weight;
      if (random <= cumulative) {
        return scenario;
      }
    }
    
    return this.scenarios[0];
  }

  async runWorker(workerId) {
    const results = [];
    const errors = [];
    const startTime = Date.now();
    const endTime = startTime + this.duration;

    console.log(`Worker ${workerId} starting load test...`);

    while (Date.now() < endTime) {
      const scenario = this.selectScenario();
      const result = await this.makeRequest(scenario);
      
      if (result.error) {
        errors.push(result);
      } else {
        results.push(result);
      }

      // Small delay to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    return { results, errors, workerId };
  }

  async runLoadTest() {
    console.log(`🚀 Starting load test:`);
    console.log(`   Base URL: ${this.baseUrl}`);
    console.log(`   Concurrency: ${this.concurrency}`);
    console.log(`   Duration: ${this.duration}ms`);
    console.log(`   Scenarios: ${this.scenarios.map(s => s.name).join(', ')}`);

    this.results.startTime = Date.now();

    // Create workers for concurrent testing
    const workers = [];
    const workerPromises = [];

    for (let i = 0; i < this.concurrency; i++) {
      const worker = new Worker(__filename, {
        workerData: {
          workerId: i,
          baseUrl: this.baseUrl,
          duration: this.duration,
          scenarios: this.scenarios
        }
      });

      workers.push(worker);
      
      workerPromises.push(new Promise((resolve, reject) => {
        worker.on('message', resolve);
        worker.on('error', reject);
        worker.on('exit', (code) => {
          if (code !== 0) {
            reject(new Error(`Worker ${i} exited with code ${code}`));
          }
        });
      }));
    }

    try {
      const workerResults = await Promise.all(workerPromises);
      
      // Aggregate results
      for (const { results, errors } of workerResults) {
        this.results.requests.push(...results);
        this.results.errors.push(...errors);
      }

      this.results.endTime = Date.now();
      
      // Clean up workers
      workers.forEach(worker => worker.terminate());

      return this.generateReport();
    } catch (error) {
      workers.forEach(worker => worker.terminate());
      throw error;
    }
  }

  generateReport() {
    const { requests, errors, startTime, endTime } = this.results;
    const totalRequests = requests.length + errors.length;
    const duration = endTime - startTime;
    
    // Calculate statistics
    const durations = requests.map(r => r.duration);
    const successful = requests.filter(r => r.status >= 200 && r.status < 400);
    const failed = requests.filter(r => r.status >= 400) || errors;

    const stats = {
      duration: duration,
      totalRequests: totalRequests,
      successfulRequests: successful.length,
      failedRequests: failed.length,
      errorRate: (failed.length / totalRequests * 100).toFixed(2),
      requestsPerSecond: (totalRequests / (duration / 1000)).toFixed(2),
      
      responseTimes: {
        min: Math.min(...durations).toFixed(2),
        max: Math.max(...durations).toFixed(2),
        avg: (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2),
        p95: this.percentile(durations, 95).toFixed(2),
        p99: this.percentile(durations, 99).toFixed(2)
      },

      byScenario: this.groupByScenario(requests),
      statusCodes: this.groupByStatus(requests),
      errors: this.groupErrors(errors)
    };

    this.printReport(stats);
    return stats;
  }

  percentile(arr, p) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * (p / 100)) - 1;
    return sorted[index] || 0;
  }

  groupByScenario(requests) {
    const grouped = {};
    for (const req of requests) {
      if (!grouped[req.scenario]) {
        grouped[req.scenario] = { count: 0, totalDuration: 0 };
      }
      grouped[req.scenario].count++;
      grouped[req.scenario].totalDuration += req.duration;
    }

    for (const scenario in grouped) {
      grouped[scenario].avgDuration = (grouped[scenario].totalDuration / grouped[scenario].count).toFixed(2);
    }

    return grouped;
  }

  groupByStatus(requests) {
    const grouped = {};
    for (const req of requests) {
      grouped[req.status] = (grouped[req.status] || 0) + 1;
    }
    return grouped;
  }

  groupErrors(errors) {
    const grouped = {};
    for (const error of errors) {
      const key = error.error || 'Unknown error';
      grouped[key] = (grouped[key] || 0) + 1;
    }
    return grouped;
  }

  printReport(stats) {
    console.log('\n📊 Load Test Results:');
    console.log('═'.repeat(50));
    
    console.log(`Duration: ${stats.duration}ms`);
    console.log(`Total Requests: ${stats.totalRequests}`);
    console.log(`Successful: ${stats.successfulRequests} (${(100 - parseFloat(stats.errorRate)).toFixed(2)}%)`);
    console.log(`Failed: ${stats.failedRequests} (${stats.errorRate}%)`);
    console.log(`Requests/sec: ${stats.requestsPerSecond}`);

    console.log('\n⏱️  Response Times (ms):');
    console.log(`   Min: ${stats.responseTimes.min}`);
    console.log(`   Max: ${stats.responseTimes.max}`);
    console.log(`   Avg: ${stats.responseTimes.avg}`);
    console.log(`   95th percentile: ${stats.responseTimes.p95}`);
    console.log(`   99th percentile: ${stats.responseTimes.p99}`);

    console.log('\n📈 By Scenario:');
    for (const [scenario, data] of Object.entries(stats.byScenario)) {
      console.log(`   ${scenario}: ${data.count} requests, ${data.avgDuration}ms avg`);
    }

    console.log('\n📊 Status Codes:');
    for (const [status, count] of Object.entries(stats.statusCodes)) {
      console.log(`   ${status}: ${count}`);
    }

    if (Object.keys(stats.errors).length > 0) {
      console.log('\n❌ Errors:');
      for (const [error, count] of Object.entries(stats.errors)) {
        console.log(`   ${error}: ${count}`);
      }
    }

    // Performance assessment
    console.log('\n🎯 Performance Assessment:');
    const avgResponseTime = parseFloat(stats.responseTimes.avg);
    const errorRate = parseFloat(stats.errorRate);
    const rps = parseFloat(stats.requestsPerSecond);

    if (avgResponseTime < 100 && errorRate < 1 && rps > 10) {
      console.log('   ✅ EXCELLENT - Low latency, minimal errors, good throughput');
    } else if (avgResponseTime < 500 && errorRate < 5 && rps > 5) {
      console.log('   🟡 GOOD - Acceptable performance');
    } else {
      console.log('   ❌ NEEDS IMPROVEMENT - High latency or error rate');
    }
  }
}

// Worker thread execution
if (!isMainThread) {
  const { workerId, baseUrl, duration, scenarios } = workerData;
  
  const tester = new LoadTester({ baseUrl, duration, scenarios });
  tester.runWorker(workerId).then(result => {
    parentPort.postMessage(result);
  }).catch(error => {
    parentPort.postMessage({ error: error.message, workerId });
  });
}

// CLI usage
if (isMainThread && import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    
    if (key === 'concurrency' || key === 'duration') {
      options[key] = parseInt(value);
    } else {
      options[key] = value;
    }
  }

  const tester = new LoadTester(options);
  
  // Check if server is running
  fetch(`${tester.baseUrl}/api/health`)
    .then(() => {
      console.log('✅ Server is running, starting load test...');
      return tester.runLoadTest();
    })
    .then(() => {
      console.log('\n✅ Load test completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Load test failed:', error.message);
      process.exit(1);
    });
}

export default LoadTester; 