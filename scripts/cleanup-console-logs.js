#!/usr/bin/env node

/**
 * Production Console.log Cleanup Script
 * Removes console.log statements while preserving console.error and console.warn
 * Following test-writer-fixer agent methodology
 */

import { promises as fs } from 'fs';
import { glob } from 'glob';
import path from 'path';

class ConsoleCleanup {
  constructor() {
    this.stats = {
      filesProcessed: 0,
      linesRemoved: 0,
      errors: 0
    };
  }

  async cleanupProject() {
    console.log('🧹 Starting console.log cleanup...');
    
    try {
      // Find all JavaScript files in src directory
      const files = await glob('src/**/*.js', { 
        ignore: ['**/node_modules/**', '**/test/**', '**/*.test.js'] 
      });
      
      console.log(`📁 Found ${files.length} JavaScript files to process`);
      
      for (const file of files) {
        await this.cleanupFile(file);
      }
      
      this.printSummary();
      
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      process.exit(1);
    }
  }

  async cleanupFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const originalLines = content.split('\n');
      
      // Remove console.log lines but preserve console.error, console.warn
      const cleanedLines = originalLines.filter(line => {
        const trimmed = line.trim();
        
        // Skip if it's a console.error or console.warn
        if (trimmed.includes('console.error') || trimmed.includes('console.warn')) {
          return true;
        }
        
        // Remove console.log lines
        if (trimmed.includes('console.log')) {
          this.stats.linesRemoved++;
          return false;
        }
        
        return true;
      });
      
      // Only write if changes were made
      if (cleanedLines.length !== originalLines.length) {
        await fs.writeFile(filePath, cleanedLines.join('\n'));
        console.log(`✅ Cleaned ${filePath}: ${originalLines.length - cleanedLines.length} lines removed`);
      }
      
      this.stats.filesProcessed++;
      
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error);
      this.stats.errors++;
    }
  }

  printSummary() {
    console.log('\n📊 Cleanup Summary:');
    console.log(`   Files processed: ${this.stats.filesProcessed}`);
    console.log(`   Console.log lines removed: ${this.stats.linesRemoved}`);
    console.log(`   Errors: ${this.stats.errors}`);
    
    if (this.stats.linesRemoved > 0) {
      console.log('✅ Production code is now clean of console.log statements!');
    } else {
      console.log('✅ No console.log statements found to remove');
    }
  }
}

// Run cleanup
const cleanup = new ConsoleCleanup();
cleanup.cleanupProject().catch(console.error); 