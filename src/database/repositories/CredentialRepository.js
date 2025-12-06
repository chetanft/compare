/**
 * Credential Repository
 * Handles CRUD operations for saved credentials
 * Note: Encryption/decryption is handled by CredentialService, not repository
 */

export class CredentialRepository {
  constructor(adapter) {
    this.adapter = adapter;
    this.table = 'saved_credentials';
  }

  /**
   * Create a new credential
   * @param {Object} data - Credential data (already encrypted)
   * @returns {Promise<Object>} Created credential
   */
  async create(data) {
    const credentialData = {
      id: data.id || this.adapter.generateUUID(),
      userId: data.userId || null,
      name: data.name,
      url: data.url,
      loginUrl: data.loginUrl || null,
      usernameEncrypted: data.usernameEncrypted,
      passwordVaultId: data.passwordVaultId,
      notes: data.notes || null,
      lastUsedAt: data.lastUsedAt || null,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };

    return await this.adapter.insert(this.table, credentialData);
  }

  /**
   * Get credential by ID
   * @param {string} id - Credential ID
   * @returns {Promise<Object|null>} Credential or null
   */
  async findById(id) {
    const results = await this.adapter.select(this.table, {
      where: { id },
      limit: 1
    });

    return results.length > 0 ? results[0] : null;
  }

  /**
   * Update credential
   * @param {string} id - Credential ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated credential
   */
  async update(id, data) {
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString()
    };

    const updated = await this.adapter.update(this.table, updateData, { id });
    return updated.length > 0 ? updated[0] : null;
  }

  /**
   * Delete credential
   * @param {string} id - Credential ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    const count = await this.adapter.delete(this.table, { id });
    return count > 0;
  }

  /**
   * List credentials with filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of credentials
   */
  async list(filters = {}) {
    const {
      userId = null,
      limit = 100,
      offset = 0,
      orderBy = [{ column: 'lastUsedAt', ascending: false }, { column: 'createdAt', ascending: false }]
    } = filters;

    const where = {};
    if (userId) where.userId = userId;

    return await this.adapter.select(this.table, {
      where,
      orderBy,
      limit,
      offset
    });
  }

  /**
   * Update last used timestamp
   * @param {string} id - Credential ID
   * @returns {Promise<void>}
   */
  async updateLastUsed(id) {
    await this.update(id, {
      lastUsedAt: new Date().toISOString()
    });
  }
}

