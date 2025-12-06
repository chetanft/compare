/**
 * SQLite Database Adapter
 * Implements DatabaseAdapter interface for SQLite (local desktop mode)
 */

import { DatabaseAdapter } from './DatabaseAdapter.js';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';

export class SQLiteAdapter extends DatabaseAdapter {
  constructor(dbPath = null) {
    super();
    this.dbPath = dbPath || this.getDefaultDbPath();
    this.db = null;
    this.connected = false;
  }

  getDefaultDbPath() {
    // Default to data/app.db in project root
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    return path.join(dataDir, 'app.db');
  }

  async connect() {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      this.db = new Database(this.dbPath);
      
      // Enable foreign keys
      this.db.pragma('foreign_keys = ON');
      
      // Enable WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL');
      
      this.connected = true;
      return true;
    } catch (error) {
      this.connected = false;
      throw new Error(`Failed to connect to SQLite: ${error.message}`);
    }
  }

  async disconnect() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.connected = false;
  }

  async query(query, params = []) {
    if (!this.connected || !this.db) {
      throw new Error('Not connected to database');
    }

    try {
      const stmt = this.db.prepare(query);
      const results = stmt.all(...params);
      return results.map(row => this.toCamelCase(row));
    } catch (error) {
      throw new Error(`Query failed: ${error.message}`);
    }
  }

  async queryOne(query, params = []) {
    if (!this.connected || !this.db) {
      throw new Error('Not connected to database');
    }

    try {
      const stmt = this.db.prepare(query);
      const row = stmt.get(...params);
      return row ? this.toCamelCase(row) : null;
    } catch (error) {
      throw new Error(`Query failed: ${error.message}`);
    }
  }

  async transaction(callback) {
    if (!this.connected || !this.db) {
      throw new Error('Not connected to database');
    }

    const transaction = this.db.transaction(callback);
    return transaction(this);
  }

  async insert(table, data) {
    if (!this.connected || !this.db) {
      throw new Error('Not connected to database');
    }

    const snakeData = this.toSnakeCase(data);
    const columns = Object.keys(snakeData);
    const values = Object.values(snakeData);
    const placeholders = columns.map(() => '?').join(', ');
    
    // SQLite doesn't support RETURNING in older versions
    const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    
    try {
      const stmt = this.db.prepare(query);
      const result = stmt.run(...values);
      
      // Fetch the inserted row using last_insert_rowid()
      const idColumn = snakeData.id || (result.lastInsertRowid ? result.lastInsertRowid.toString() : null);
      if (!idColumn) {
        // Try to get last inserted rowid
        const lastIdResult = this.db.prepare(`SELECT last_insert_rowid() as id`).get();
        const lastId = lastIdResult?.id || result.lastInsertRowid;
        
        if (lastId) {
          const selectStmt = this.db.prepare(`SELECT * FROM ${table} WHERE rowid = ?`);
          const inserted = selectStmt.get(lastId);
          return inserted ? this.toCamelCase(inserted) : snakeData;
        }
      } else {
        // Use provided ID
        const selectStmt = this.db.prepare(`SELECT * FROM ${table} WHERE id = ?`);
        const inserted = selectStmt.get(idColumn);
        return inserted ? this.toCamelCase(inserted) : this.toCamelCase(snakeData);
      }
      
      return this.toCamelCase(snakeData);
    } catch (error) {
      throw new Error(`Insert failed: ${error.message}`);
    }
  }

  async update(table, data, where) {
    if (!this.connected || !this.db) {
      throw new Error('Not connected to database');
    }

    const snakeData = this.toSnakeCase(data);
    const setClause = Object.keys(snakeData).map(key => `${key} = ?`).join(', ');
    const setValues = Object.values(snakeData);

    const whereClause = this.buildWhereClause(where);
    const whereValues = whereClause.values;

    const query = `UPDATE ${table} SET ${setClause} ${whereClause.clause}`;
    
    try {
      const stmt = this.db.prepare(query);
      const result = stmt.run(...setValues, ...whereValues);
      
      // Fetch updated rows
      const selectQuery = `SELECT * FROM ${table} ${whereClause.clause}`;
      const selectStmt = this.db.prepare(selectQuery);
      const rows = selectStmt.all(...whereValues);
      
      return rows.map(row => this.toCamelCase(row));
    } catch (error) {
      throw new Error(`Update failed: ${error.message}`);
    }
  }

  async delete(table, where) {
    if (!this.connected || !this.db) {
      throw new Error('Not connected to database');
    }

    const whereClause = this.buildWhereClause(where);
    const query = `DELETE FROM ${table} ${whereClause.clause}`;
    
    try {
      const stmt = this.db.prepare(query);
      const result = stmt.run(...whereClause.values);
      return result.changes;
    } catch (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  async select(table, options = {}) {
    if (!this.connected || !this.db) {
      throw new Error('Not connected to database');
    }

    const {
      where = {},
      orderBy = [],
      limit = null,
      offset = null,
      select = '*'
    } = options;

    let query = `SELECT ${select} FROM ${table}`;

    // Build WHERE clause
    const whereClause = this.buildWhereClause(where);
    if (whereClause.clause) {
      query += ` ${whereClause.clause}`;
    }

    // Build ORDER BY clause
    if (orderBy.length > 0) {
      const orderParts = orderBy.map(order => {
        const column = typeof order === 'string' ? order : order.column;
        // Convert camelCase to snake_case for database columns
        const snakeObj = this.toSnakeCase({ [column]: null });
        const dbColumn = Object.keys(snakeObj)[0] || column;
        const ascending = typeof order === 'string' ? true : (order.ascending !== false);
        return `${dbColumn} ${ascending ? 'ASC' : 'DESC'}`;
      });
      query += ` ORDER BY ${orderParts.join(', ')}`;
    }

    // Build LIMIT and OFFSET
    if (limit !== null) {
      query += ` LIMIT ${limit}`;
      if (offset !== null) {
        query += ` OFFSET ${offset}`;
      }
    } else if (offset !== null) {
      query += ` LIMIT 1000 OFFSET ${offset}`;
    }

    try {
      const stmt = this.db.prepare(query);
      const rows = stmt.all(...whereClause.values);
      return rows.map(row => this.toCamelCase(row));
    } catch (error) {
      throw new Error(`Select failed: ${error.message}`);
    }
  }

  buildWhereClause(where) {
    if (!where || Object.keys(where).length === 0) {
      return { clause: '', values: [] };
    }

    const conditions = [];
    const values = [];

    for (const [key, value] of Object.entries(where)) {
      // Convert camelCase to snake_case for database columns
      const snakeObj = this.toSnakeCase({ [key]: value });
      const dbKey = Object.keys(snakeObj)[0] || key;
      if (value === null || value === undefined) {
        conditions.push(`${dbKey} IS NULL`);
      } else if (Array.isArray(value)) {
        const placeholders = value.map(() => '?').join(', ');
        conditions.push(`${dbKey} IN (${placeholders})`);
        values.push(...value);
      } else if (typeof value === 'object') {
        if (value.$like) {
          conditions.push(`${dbKey} LIKE ?`);
          values.push(value.$like);
        } else if (value.$ilike) {
          conditions.push(`${dbKey} LIKE ?`);
          values.push(value.$ilike.toLowerCase());
        } else if (value.$gte) {
          conditions.push(`${dbKey} >= ?`);
          values.push(value.$gte);
        } else if (value.$lte) {
          conditions.push(`${dbKey} <= ?`);
          values.push(value.$lte);
        } else if (value.$gt) {
          conditions.push(`${dbKey} > ?`);
          values.push(value.$gt);
        } else if (value.$lt) {
          conditions.push(`${dbKey} < ?`);
          values.push(value.$lt);
        } else if (value.$neq) {
          conditions.push(`${dbKey} != ?`);
          values.push(value.$neq);
        } else if (value.$is) {
          conditions.push(`${dbKey} IS ?`);
          values.push(value.$is);
        }
      } else {
        conditions.push(`${dbKey} = ?`);
        values.push(value);
      }
    }

    return {
      clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
      values
    };
  }

  getType() {
    return 'sqlite';
  }

  isConnected() {
    return this.connected && this.db !== null;
  }

  generateUUID() {
    return randomUUID();
  }

  /**
   * Execute raw SQL (for migrations)
   * @param {string} sql - SQL statement
   */
  exec(sql) {
    if (!this.connected || !this.db) {
      throw new Error('Not connected to database');
    }
    this.db.exec(sql);
  }
}

