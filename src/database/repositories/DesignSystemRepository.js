/**
 * Design System Repository
 * Handles CRUD operations for design systems
 */

export class DesignSystemRepository {
  constructor(adapter) {
    this.adapter = adapter;
    this.table = 'design_systems';
  }

  /**
   * Create a new design system
   * @param {Object} data - Design system data
   * @returns {Promise<Object>} Created design system
   */
  async create(data) {
    const systemData = {
      id: data.id || this.adapter.generateUUID(),
      userId: data.userId || null,
      name: data.name,
      slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-'),
      isGlobal: data.isGlobal || false,
      tokens: typeof data.tokens === 'string' ? data.tokens : JSON.stringify(data.tokens),
      cssUrl: data.cssUrl || null,
      cssText: data.cssText || null,
      figmaFileKey: data.figmaFileKey || null,
      figmaNodeId: data.figmaNodeId || null,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };

    // Convert boolean for SQLite
    if (this.adapter.getType() === 'sqlite') {
      systemData.isGlobal = systemData.isGlobal ? 1 : 0;
    }

    return await this.adapter.insert(this.table, systemData);
  }

  /**
   * Get design system by ID
   * @param {string} id - Design system ID
   * @returns {Promise<Object|null>} Design system or null
   */
  async findById(id) {
    const results = await this.adapter.select(this.table, {
      where: { id },
      limit: 1
    });

    if (results.length === 0) {
      return null;
    }

    const system = results[0];
    
    // Parse JSON fields
    if (system.tokens && typeof system.tokens === 'string') {
      try {
        system.tokens = JSON.parse(system.tokens);
      } catch (e) {
        // Invalid JSON, keep as string
      }
    }

    // Convert boolean from SQLite
    if (this.adapter.getType() === 'sqlite' && typeof system.isGlobal === 'number') {
      system.isGlobal = system.isGlobal === 1;
    }

    return system;
  }

  /**
   * Get design system by slug
   * @param {string} slug - Design system slug
   * @returns {Promise<Object|null>} Design system or null
   */
  async findBySlug(slug) {
    const results = await this.adapter.select(this.table, {
      where: { slug },
      limit: 1
    });

    if (results.length === 0) {
      return null;
    }

    const system = results[0];
    
    // Parse JSON fields
    if (system.tokens && typeof system.tokens === 'string') {
      try {
        system.tokens = JSON.parse(system.tokens);
      } catch (e) {
        // Invalid JSON, keep as string
      }
    }

    // Convert boolean from SQLite
    if (this.adapter.getType() === 'sqlite' && typeof system.isGlobal === 'number') {
      system.isGlobal = system.isGlobal === 1;
    }

    return system;
  }

  /**
   * Update design system
   * @param {string} id - Design system ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated design system
   */
  async update(id, data) {
    const updateData = { ...data };

    // Convert JSON fields
    if (updateData.tokens && typeof updateData.tokens === 'object') {
      updateData.tokens = JSON.stringify(updateData.tokens);
    }

    // Convert boolean for SQLite
    if (this.adapter.getType() === 'sqlite' && updateData.isGlobal !== undefined) {
      updateData.isGlobal = updateData.isGlobal ? 1 : 0;
    }

    // Add updated timestamp
    if (!updateData.updatedAt) {
      updateData.updatedAt = new Date().toISOString();
    }

    const updated = await this.adapter.update(this.table, updateData, { id });
    
    if (updated.length === 0) {
      return null;
    }

    const system = updated[0];
    
    // Parse JSON fields
    if (system.tokens && typeof system.tokens === 'string') {
      try {
        system.tokens = JSON.parse(system.tokens);
      } catch (e) {
        // Invalid JSON, keep as string
      }
    }

    // Convert boolean from SQLite
    if (this.adapter.getType() === 'sqlite' && typeof system.isGlobal === 'number') {
      system.isGlobal = system.isGlobal === 1;
    }

    return system;
  }

  /**
   * Delete design system
   * @param {string} id - Design system ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    const count = await this.adapter.delete(this.table, { id });
    return count > 0;
  }

  /**
   * List design systems with filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of design systems
   */
  async list(filters = {}) {
    const {
      userId = null,
      isGlobal = null,
      limit = 100,
      offset = 0,
      orderBy = [{ column: 'createdAt', ascending: false }]
    } = filters;

    const where = {};
    if (userId !== null) {
      // Include global systems and user's systems
      if (isGlobal === true) {
        where.isGlobal = this.adapter.getType() === 'sqlite' ? 1 : true;
      } else if (isGlobal === false) {
        where.isGlobal = this.adapter.getType() === 'sqlite' ? 0 : false;
        if (userId) where.userId = userId;
      } else {
        // Include both global and user's systems
        // This requires a more complex query - for now, fetch all and filter
        // In production, use OR conditions
      }
    } else if (isGlobal !== null) {
      where.isGlobal = this.adapter.getType() === 'sqlite' ? (isGlobal ? 1 : 0) : isGlobal;
    }

    const results = await this.adapter.select(this.table, {
      where,
      orderBy,
      limit,
      offset
    });

    // Parse JSON fields and convert booleans
    return results.map(system => {
      if (system.tokens && typeof system.tokens === 'string') {
        try {
          system.tokens = JSON.parse(system.tokens);
        } catch (e) {
          // Invalid JSON, keep as string
        }
      }

      if (this.adapter.getType() === 'sqlite' && typeof system.isGlobal === 'number') {
        system.isGlobal = system.isGlobal === 1;
      }

      return system;
    });
  }
}

