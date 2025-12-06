/**
 * Database Adapter Interface
 * Abstract interface for database operations supporting both Supabase and SQLite
 */

/**
 * Abstract Database Adapter
 * All database adapters must implement these methods
 */
export class DatabaseAdapter {
  /**
   * Connect to the database
   * @returns {Promise<void>}
   */
  async connect() {
    throw new Error('connect must be implemented by subclass');
  }

  /**
   * Disconnect from the database
   * @returns {Promise<void>}
   */
  async disconnect() {
    throw new Error('disconnect must be implemented by subclass');
  }

  /**
   * Execute a query
   * @param {string} query - SQL query string
   * @param {Array} params - Query parameters
   * @returns {Promise<Array>} Query results
   */
  async query(query, params = []) {
    throw new Error('query must be implemented by subclass');
  }

  /**
   * Execute a query and return a single row
   * @param {string} query - SQL query string
   * @param {Array} params - Query parameters
   * @returns {Promise<Object|null>} Single row or null
   */
  async queryOne(query, params = []) {
    const results = await this.query(query, params);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Execute a transaction
   * @param {Function} callback - Transaction callback
   * @returns {Promise<any>} Transaction result
   */
  async transaction(callback) {
    throw new Error('transaction must be implemented by subclass');
  }

  /**
   * Insert a row and return the inserted row
   * @param {string} table - Table name
   * @param {Object} data - Row data
   * @returns {Promise<Object>} Inserted row
   */
  async insert(table, data) {
    throw new Error('insert must be implemented by subclass');
  }

  /**
   * Update rows and return updated rows
   * @param {string} table - Table name
   * @param {Object} data - Update data
   * @param {Object} where - Where conditions
   * @returns {Promise<Array>} Updated rows
   */
  async update(table, data, where) {
    throw new Error('update must be implemented by subclass');
  }

  /**
   * Delete rows
   * @param {string} table - Table name
   * @param {Object} where - Where conditions
   * @returns {Promise<number>} Number of deleted rows
   */
  async delete(table, where) {
    throw new Error('delete must be implemented by subclass');
  }

  /**
   * Select rows
   * @param {string} table - Table name
   * @param {Object} options - Query options (where, orderBy, limit, offset, select)
   * @returns {Promise<Array>} Selected rows
   */
  async select(table, options = {}) {
    throw new Error('select must be implemented by subclass');
  }

  /**
   * Get database type
   * @returns {string} Database type ('supabase' or 'sqlite')
   */
  getType() {
    throw new Error('getType must be implemented by subclass');
  }

  /**
   * Check if connected
   * @returns {boolean} Connection status
   */
  isConnected() {
    throw new Error('isConnected must be implemented by subclass');
  }

  /**
   * Generate UUID (database-specific)
   * @returns {string} UUID
   */
  generateUUID() {
    throw new Error('generateUUID must be implemented by subclass');
  }

  /**
   * Convert database row to camelCase
   * @param {Object} row - Database row
   * @returns {Object} CamelCase row
   */
  toCamelCase(row) {
    if (!row || typeof row !== 'object') return row;
    
    const camelCase = {};
    for (const [key, value] of Object.entries(row)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      camelCase[camelKey] = value;
    }
    return camelCase;
  }

  /**
   * Convert camelCase object to snake_case for database
   * @param {Object} obj - CamelCase object
   * @returns {Object} Snake_case object
   */
  toSnakeCase(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    
    const snakeCase = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      snakeCase[snakeKey] = value;
    }
    return snakeCase;
  }
}

