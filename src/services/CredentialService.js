/**
 * Credential Service
 * Business logic for credential operations with encryption
 */

import { CredentialRepository } from '../database/repositories/CredentialRepository.js';
import { CredentialManager } from './CredentialEncryption.js';
import { getSupabaseClient } from '../config/supabase.js';

export class CredentialService {
  constructor(adapter, encryptionKey = null) {
    this.repository = new CredentialRepository(adapter);
    this.encryptionKey = encryptionKey || process.env.CREDENTIAL_ENCRYPTION_KEY || 
                        process.env.LOCAL_CREDENTIAL_KEY ||
                        'local-credential-encryption-key-change-in-production';
    this.credentialManager = new CredentialManager(this.encryptionKey);
    this.supabase = getSupabaseClient(false);
  }

  /**
   * Create a new credential
   * @param {Object} data - Credential data (plaintext)
   * @returns {Promise<Object>} Created credential (without password)
   */
  async createCredential(data) {
    const { name, url, loginUrl, username, password, notes, userId } = data;

    // Prepare encrypted credentials
    let encryptedData;
    if (this.supabase && userId) {
      // Use Supabase Vault for password
      encryptedData = await this.credentialManager.prepareForStorage(
        { username, password },
        this.supabase
      );
    } else {
      // Local encryption
      const encrypted = this.credentialManager.encryptCredentials({ username, password });
      encryptedData = {
        usernameEncrypted: encrypted.username_encrypted,
        passwordVaultId: `encrypted:${encrypted.password_encrypted}`
      };
    }

    // Save to repository
    const credential = await this.repository.create({
      userId: userId || null,
      name,
      url,
      loginUrl: loginUrl || null,
      usernameEncrypted: encryptedData.username_encrypted,
      passwordVaultId: encryptedData.password_vault_id || encryptedData.passwordVaultId,
      notes: notes || null
    });

    // Return without sensitive data
    return {
      id: credential.id,
      name: credential.name,
      url: credential.url,
      loginUrl: credential.loginUrl,
      notes: credential.notes,
      lastUsedAt: credential.lastUsedAt,
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt
    };
  }

  /**
   * Update a credential
   * @param {string} id - Credential ID
   * @param {Object} data - Update data (may include plaintext username/password)
   * @returns {Promise<Object>} Updated credential (without password)
   */
  async updateCredential(id, data) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error(`Credential not found: ${id}`);
    }

    const updateData = { ...data };

    // If username/password provided, encrypt them
    if (data.username || data.password) {
      // Get existing values if not provided
      const decrypted = await this.decryptCredential(id);
      
      const username = data.username || decrypted.username;
      const password = data.password || decrypted.password;

      // Prepare encrypted credentials
      let encryptedData;
      if (this.supabase && existing.userId) {
        encryptedData = await this.credentialManager.prepareForStorage(
          { username, password },
          this.supabase
        );
      } else {
        const encrypted = this.credentialManager.encryptCredentials({ username, password });
        encryptedData = {
          usernameEncrypted: encrypted.username_encrypted,
          passwordVaultId: `encrypted:${encrypted.password_encrypted}`
        };
      }

      updateData.usernameEncrypted = encryptedData.username_encrypted;
      updateData.passwordVaultId = encryptedData.password_vault_id || encryptedData.passwordVaultId;
      
      // Remove plaintext fields
      delete updateData.username;
      delete updateData.password;
    }

    const updated = await this.repository.update(id, updateData);

    // Return without sensitive data
    return {
      id: updated.id,
      name: updated.name,
      url: updated.url,
      loginUrl: updated.loginUrl,
      notes: updated.notes,
      lastUsedAt: updated.lastUsedAt,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    };
  }

  /**
   * Get credential by ID (without password)
   * @param {string} id - Credential ID
   * @returns {Promise<Object|null>} Credential or null
   */
  async getCredential(id) {
    const credential = await this.repository.findById(id);
    if (!credential) {
      return null;
    }

    // Return without sensitive data
    return {
      id: credential.id,
      name: credential.name,
      url: credential.url,
      loginUrl: credential.loginUrl,
      notes: credential.notes,
      lastUsedAt: credential.lastUsedAt,
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt
    };
  }

  /**
   * Decrypt credential (server-side only)
   * @param {string} id - Credential ID
   * @returns {Promise<Object>} Decrypted credential with username and password
   */
  async decryptCredential(id) {
    const credential = await this.repository.findById(id);
    if (!credential) {
      throw new Error(`Credential not found: ${id}`);
    }

    // Update last used timestamp
    await this.repository.updateLastUsed(id);

    // Decrypt credentials
    if (this.supabase && credential.userId) {
      // Use Supabase Vault
      return await this.credentialManager.retrieveFromStorage(credential, this.supabase);
    } else {
      // Local decryption
      const username = this.credentialManager.decryptCredentials({
        username_encrypted: credential.usernameEncrypted,
        password_encrypted: credential.passwordVaultId.replace('encrypted:', '')
      }).username;

      const password = this.credentialManager.decryptCredentials({
        username_encrypted: credential.usernameEncrypted,
        password_encrypted: credential.passwordVaultId.replace('encrypted:', '')
      }).password;

      return {
        id: credential.id,
        name: credential.name,
        url: credential.url,
        loginUrl: credential.loginUrl,
        username,
        password
      };
    }
  }

  /**
   * List credentials
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of credentials (without passwords)
   */
  async listCredentials(filters = {}) {
    const credentials = await this.repository.list(filters);
    
    // Return without sensitive data
    return credentials.map(cred => ({
      id: cred.id,
      name: cred.name,
      url: cred.url,
      loginUrl: cred.loginUrl,
      notes: cred.notes,
      lastUsedAt: cred.lastUsedAt,
      createdAt: cred.createdAt,
      updatedAt: cred.updatedAt
    }));
  }

  /**
   * Delete credential
   * @param {string} id - Credential ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteCredential(id) {
    return await this.repository.delete(id);
  }
}

