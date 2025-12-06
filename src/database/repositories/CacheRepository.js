/**
 * Cache Repository
 * Handles CRUD operations for extraction cache
 */

export class CacheRepository {
  constructor(adapter) {
    this.adapter = adapter;
    this.table = 'extraction_cache';
  }

  /**
   * Create or update cache entry
   * @param {Object} data - Cache data
   * @returns {Promise<Object>} Cache entry
   */
  async set(data) {
    const cacheData = {
      id: data.id || this.adapter.generateUUID(),
      sourceUrl: data.sourceUrl,
      sourceType: data.sourceType,
      data: typeof data.data === 'string' ? data.data : JSON.stringify(data.data),
      hash: data.hash,
      expiresAt: data.expiresAt,
      createdAt: data.createdAt || new Date().toISOString()
    };

    // Check if entry exists
    const existing = await this.findByUrlAndType(cacheData.sourceUrl, cacheData.sourceType);
    
    if (existing) {
      // Update existing entry
      return await this.adapter.update(this.table, cacheData, { id: existing.id });
    } else {
      // Create new entry
      return await this.adapter.insert(this.table, cacheData);
    }
  }

  /**
   * Get cache entry by URL and type
   * @param {string} sourceUrl - Source URL
   * @param {string} sourceType - Source type ('figma' or 'web')
   * @returns {Promise<Object|null>} Cache entry or null
   */
  async findByUrlAndType(sourceUrl, sourceType) {
    const results = await this.adapter.select(this.table, {
      where: {
        sourceUrl,
        sourceType
      },
      limit: 1
    });

    if (results.length === 0) {
      return null;
    }

    const entry = results[0];
    
    // Parse JSON data
    if (entry.data && typeof entry.data === 'string') {
      try {
        entry.data = JSON.parse(entry.data);
      } catch (e) {
        // Invalid JSON, keep as string
      }
    }

    // Check if expired
    if (new Date(entry.expiresAt) < new Date()) {
      // Delete expired entry
      await this.delete(entry.id);
      return null;
    }

    return entry;
  }

  /**
   * Get cache entry by ID
   * @param {string} id - Cache entry ID
   * @returns {Promise<Object|null>} Cache entry or null
   */
  async findById(id) {
    const results = await this.adapter.select(this.table, {
      where: { id },
      limit: 1
    });

    if (results.length === 0) {
      return null;
    }

    const entry = results[0];
    
    // Parse JSON data
    if (entry.data && typeof entry.data === 'string') {
      try {
        entry.data = JSON.parse(entry.data);
      } catch (e) {
        // Invalid JSON, keep as string
      }
    }

    return entry;
  }

  /**
   * Delete cache entry
   * @param {string} id - Cache entry ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    const count = await this.adapter.delete(this.table, { id });
    return count > 0;
  }

  /**
   * Delete expired cache entries
   * @returns {Promise<number>} Number of deleted entries
   */
  async deleteExpired() {
    const now = new Date().toISOString();
    const count = await this.adapter.delete(this.table, {
      expiresAt: { $lt: now }
    });
    return count;
  }

  /**
   * Clear all cache entries
   * @returns {Promise<number>} Number of deleted entries
   */
  async clear() {
    // Get all entries and delete them
    const allEntries = await this.adapter.select(this.table, { limit: 10000 });
    let deleted = 0;
    
    for (const entry of allEntries) {
      const count = await this.delete(entry.id);
      deleted += count;
    }
    
    return deleted;
  }
}

