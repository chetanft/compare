/**
 * Supabase Database Adapter
 * Implements DatabaseAdapter interface for Supabase Postgres
 */

import { DatabaseAdapter } from './DatabaseAdapter.js';
import { getSupabaseClient } from '../../config/supabase.js';
import { randomUUID } from 'crypto';

export class SupabaseAdapter extends DatabaseAdapter {
  constructor(userId = null) {
    super();
    this.userId = userId;
    this.supabase = null;
    this.connected = false;
  }

  async connect() {
    try {
      this.supabase = getSupabaseClient(false); // Use public client with RLS
      if (!this.supabase) {
        throw new Error('Supabase client not configured');
      }
      
      // Test connection
      const { error } = await this.supabase.from('profiles').select('id').limit(1);
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned, which is OK
        throw error;
      }
      
      this.connected = true;
      return true;
    } catch (error) {
      this.connected = false;
      throw new Error(`Failed to connect to Supabase: ${error.message}`);
    }
  }

  async disconnect() {
    this.connected = false;
    this.supabase = null;
  }

  async query(query, params = []) {
    if (!this.connected) {
      throw new Error('Not connected to database');
    }
    // Supabase uses its own query builder, so raw SQL queries are limited
    // This is a placeholder - most operations should use select/insert/update/delete
    throw new Error('Raw SQL queries not supported in Supabase adapter. Use select/insert/update/delete methods.');
  }

  async queryOne(query, params = []) {
    const results = await this.query(query, params);
    return results.length > 0 ? results[0] : null;
  }

  async transaction(callback) {
    // Supabase doesn't support transactions via JS client in the same way
    // For now, execute callback without transaction wrapper
    // In production, use Supabase RPC functions for transactions
    return await callback(this);
  }

  async insert(table, data) {
    if (!this.connected) {
      throw new Error('Not connected to database');
    }

    const { data: result, error } = await this.supabase
      .from(table)
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`Insert failed: ${error.message}`);
    }

    return this.toCamelCase(result);
  }

  async update(table, data, where) {
    if (!this.connected) {
      throw new Error('Not connected to database');
    }

    let query = this.supabase.from(table).update(data);

    // Apply where conditions
    for (const [key, value] of Object.entries(where)) {
      if (Array.isArray(value)) {
        query = query.in(key, value);
      } else if (typeof value === 'object' && value !== null) {
        if (value.$like) query = query.like(key, value.$like);
        if (value.$gte) query = query.gte(key, value.$gte);
        if (value.$lte) query = query.lte(key, value.$lte);
        if (value.$gt) query = query.gt(key, value.$gt);
        if (value.$lt) query = query.lt(key, value.$lt);
      } else {
        query = query.eq(key, value);
      }
    }

    const { data: result, error } = await query.select();

    if (error) {
      throw new Error(`Update failed: ${error.message}`);
    }

    return result.map(row => this.toCamelCase(row));
  }

  async delete(table, where) {
    if (!this.connected) {
      throw new Error('Not connected to database');
    }

    let query = this.supabase.from(table).delete();

    // Apply where conditions
    for (const [key, value] of Object.entries(where)) {
      if (Array.isArray(value)) {
        query = query.in(key, value);
      } else {
        query = query.eq(key, value);
      }
    }

    const { error, count } = await query;

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }

    return count || 0;
  }

  async select(table, options = {}) {
    if (!this.connected) {
      throw new Error('Not connected to database');
    }

    const {
      where = {},
      orderBy = [],
      limit = null,
      offset = null,
      select = '*'
    } = options;

    let query = this.supabase.from(table).select(select);

    // Apply where conditions
    for (const [key, value] of Object.entries(where)) {
      if (value === null || value === undefined) {
        query = query.is(key, null);
      } else if (Array.isArray(value)) {
        query = query.in(key, value);
      } else if (typeof value === 'object') {
        if (value.$like) query = query.like(key, value.$like);
        if (value.$ilike) query = query.ilike(key, value.$ilike);
        if (value.$gte) query = query.gte(key, value.$gte);
        if (value.$lte) query = query.lte(key, value.$lte);
        if (value.$gt) query = query.gt(key, value.$gt);
        if (value.$lt) query = query.lt(key, value.$lt);
        if (value.$neq) query = query.neq(key, value.$neq);
        if (value.$is) query = query.is(key, value.$is);
      } else {
        query = query.eq(key, value);
      }
    }

    // Apply ordering
    for (const order of orderBy) {
      const column = typeof order === 'string' ? order : order.column;
      const ascending = typeof order === 'string' ? true : (order.ascending !== false);
      query = query.order(column, { ascending });
    }

    // Apply limit and offset
    if (limit !== null) {
      const start = offset || 0;
      const end = start + limit - 1;
      query = query.range(start, end);
    } else if (offset !== null) {
      query = query.range(offset, offset + 1000); // Default limit if only offset provided
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Select failed: ${error.message}`);
    }

    return (data || []).map(row => this.toCamelCase(row));
  }

  getType() {
    return 'supabase';
  }

  isConnected() {
    return this.connected && this.supabase !== null;
  }

  generateUUID() {
    return randomUUID();
  }
}

