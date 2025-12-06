/**
 * Repository Integration Tests
 * Tests repositories against both SQLite and Supabase adapters
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { SQLiteAdapter } from '../../../src/database/adapters/SQLiteAdapter.js';
import { SupabaseAdapter } from '../../../src/database/adapters/SupabaseAdapter.js';
import { createRepositories } from '../../../src/database/repositories/index.js';
import fs from 'fs';
import path from 'path';

// Test database path
const TEST_DB_PATH = path.join(process.cwd(), 'test.db');

/**
 * Test repository against an adapter
 */
async function testRepositories(adapter, adapterName) {
  describe(`${adapterName} Adapter`, () => {
    let repositories;

    beforeAll(async () => {
      await adapter.connect();
      repositories = createRepositories(adapter);
    });

    afterAll(async () => {
      await adapter.disconnect();
      if (adapterName === 'SQLite' && fs.existsSync(TEST_DB_PATH)) {
        fs.unlinkSync(TEST_DB_PATH);
      }
    });

    describe('ComparisonRepository', () => {
      it('should create a comparison', async () => {
        const comparison = await repositories.comparisons.create({
          figmaUrl: 'https://figma.com/file/test',
          webUrl: 'https://example.com',
          status: 'pending'
        });

        expect(comparison).toBeDefined();
        expect(comparison.id).toBeDefined();
        expect(comparison.figmaUrl).toBe('https://figma.com/file/test');
        expect(comparison.webUrl).toBe('https://example.com');
      });

      it('should find comparison by ID', async () => {
        const created = await repositories.comparisons.create({
          figmaUrl: 'https://figma.com/file/test2',
          webUrl: 'https://example.com/test'
        });

        const found = await repositories.comparisons.findById(created.id);
        expect(found).toBeDefined();
        expect(found.id).toBe(created.id);
      });

      it('should update comparison', async () => {
        const created = await repositories.comparisons.create({
          figmaUrl: 'https://figma.com/file/test3',
          webUrl: 'https://example.com/test3'
        });

        const updated = await repositories.comparisons.update(created.id, {
          status: 'completed',
          progress: 100
        });

        expect(updated).toBeDefined();
        expect(updated.status).toBe('completed');
        expect(updated.progress).toBe(100);
      });

      it('should list comparisons', async () => {
        const comparisons = await repositories.comparisons.list({ limit: 10 });
        expect(Array.isArray(comparisons)).toBe(true);
      });
    });

    describe('ReportRepository', () => {
      it('should create a report', async () => {
        const report = await repositories.reports.create({
          title: 'Test Report',
          format: 'html',
          storagePath: '/reports/test.html',
          fileSize: 1024
        });

        expect(report).toBeDefined();
        expect(report.id).toBeDefined();
        expect(report.title).toBe('Test Report');
      });
    });

    describe('DesignSystemRepository', () => {
      it('should create a design system', async () => {
        const system = await repositories.designSystems.create({
          name: 'Test Design System',
          slug: 'test-design-system',
          tokens: { colors: { primary: '#000' } }
        });

        expect(system).toBeDefined();
        expect(system.id).toBeDefined();
        expect(system.name).toBe('Test Design System');
      });

      it('should find design system by slug', async () => {
        const created = await repositories.designSystems.create({
          name: 'Test System 2',
          slug: 'test-system-2',
          tokens: {}
        });

        const found = await repositories.designSystems.findBySlug('test-system-2');
        expect(found).toBeDefined();
        expect(found.id).toBe(created.id);
      });
    });
  });
}

// Run tests for SQLite adapter
describe('Repository Integration Tests', () => {
  const sqliteAdapter = new SQLiteAdapter(TEST_DB_PATH);
  testRepositories(sqliteAdapter, 'SQLite');

  // Uncomment to test against Supabase (requires SUPABASE_URL env var)
  // if (process.env.SUPABASE_URL) {
  //   const supabaseAdapter = new SupabaseAdapter();
  //   testRepositories(supabaseAdapter, 'Supabase');
  // }
});

