/**
 * Local Storage Provider
 * Filesystem-based storage implementation for desktop/offline mode
 */

import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';
import { StorageProvider } from './StorageProvider.js';
import { getOutputBaseDir, getReportsDir, getScreenshotsDir } from '../utils/outputPaths.js';

export class LocalStorageProvider extends StorageProvider {
  constructor() {
    super();
    this.baseDir = getOutputBaseDir();
    this.reportsDir = getReportsDir();
    this.screenshotsDir = getScreenshotsDir();
    this.designSystemsDir = path.join(this.baseDir, 'design-systems');
    
    // Ensure directories exist
    this.ensureDirectories();
  }

  ensureDirectories() {
    const dirs = [
      this.reportsDir,
      this.screenshotsDir,
      this.designSystemsDir,
      path.join(this.baseDir, 'credentials'),
      path.join(this.screenshotsDir, 'uploads'),
      path.join(this.screenshotsDir, 'comparisons')
    ];
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  getStorageMode() {
    return 'local';
  }

  async isAvailable() {
    try {
      // Check if we can write to the base directory
      const testFile = path.join(this.baseDir, '.storage-test');
      await fsPromises.writeFile(testFile, 'test');
      await fsPromises.unlink(testFile);
      return true;
    } catch (error) {
      return false;
    }
  }

  async saveReport(reportData, metadata) {
    const { comparisonId, title, format = 'html' } = metadata;
    const reportId = metadata.id || `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Generate filename
    const filename = `${reportId}.${format}`;
    const filePath = path.join(this.reportsDir, filename);
    
    // Write report file
    const data = typeof reportData === 'string' ? reportData : reportData.toString();
    await fsPromises.writeFile(filePath, data, 'utf8');
    
    // Get file stats
    const stats = await fsPromises.stat(filePath);
    
    return {
      id: reportId,
      title: title || `Report ${reportId}`,
      comparisonId,
      format,
      url: `/reports/${filename}`,
      fileSize: stats.size,
      createdAt: new Date().toISOString()
    };
  }

  async getReport(reportId) {
    // Try to find report file
    const files = await fsPromises.readdir(this.reportsDir);
    const reportFile = files.find(file => file.startsWith(reportId) && /\.(html|json|pdf|csv)$/.test(file));
    
    if (!reportFile) {
      throw new Error(`Report not found: ${reportId}`);
    }
    
    const filePath = path.join(this.reportsDir, reportFile);
    const data = await fsPromises.readFile(filePath, 'utf8');
    const stats = await fsPromises.stat(filePath);
    
    const format = path.extname(reportFile).slice(1);
    
    return {
      data,
      metadata: {
        id: reportId,
        title: `Report ${reportId}`,
        format,
        url: `/reports/${reportFile}`,
        fileSize: stats.size,
        createdAt: stats.birthtime.toISOString()
      }
    };
  }

  async listReports(filters = {}) {
    const files = await fsPromises.readdir(this.reportsDir);
    const reports = [];
    
    for (const file of files) {
      if (!/\.(html|json|pdf|csv)$/.test(file)) continue;
      
      const filePath = path.join(this.reportsDir, file);
      const stats = await fsPromises.stat(filePath);
      const format = path.extname(file).slice(1);
      const reportId = path.basename(file, `.${format}`);
      
      // Apply filters
      if (filters.format && format !== filters.format) continue;
      if (filters.comparisonId && !file.includes(filters.comparisonId)) continue;
      
      reports.push({
        id: reportId,
        title: `Report ${reportId}`,
        format,
        url: `/reports/${file}`,
        fileSize: stats.size,
        createdAt: stats.birthtime.toISOString()
      });
    }
    
    // Sort by creation date (newest first)
    reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return reports;
  }

  async deleteReport(reportId) {
    const files = await fsPromises.readdir(this.reportsDir);
    const reportFile = files.find(file => file.startsWith(reportId));
    
    if (!reportFile) {
      return false;
    }
    
    const filePath = path.join(this.reportsDir, reportFile);
    await fsPromises.unlink(filePath);
    return true;
  }

  async saveScreenshot(fileData, metadata) {
    const { comparisonId, uploadId, imageType = 'pixel-diff' } = metadata;
    
    // Determine save location
    const comparisonDir = path.join(this.screenshotsDir, 'comparisons', comparisonId);
    await fsPromises.mkdir(comparisonDir, { recursive: true });
    
    // Save screenshot file
    const filename = `${imageType}.png`;
    const filePath = path.join(comparisonDir, filename);
    
    const buffer = Buffer.isBuffer(fileData) ? fileData : Buffer.from(fileData, 'base64');
    await fsPromises.writeFile(filePath, buffer);
    
    return {
      comparisonId,
      uploadId,
      url: `/screenshots/comparisons/${comparisonId}/${filename}`,
      createdAt: new Date().toISOString()
    };
  }

  async getScreenshotUrl(comparisonId, imageType = 'pixel-diff') {
    const filePath = path.join(this.screenshotsDir, 'comparisons', comparisonId, `${imageType}.png`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Screenshot not found: ${comparisonId}/${imageType}`);
    }
    
    return `/screenshots/comparisons/${comparisonId}/${imageType}.png`;
  }

  async saveDesignSystem(systemData) {
    const { id, name, slug, tokens, cssUrl, cssText, figmaFileKey, figmaNodeId, isGlobal = false } = systemData;
    
    // Validate required fields
    if (!name) {
      throw new Error('Design system name is required');
    }
    
    // Ensure directory exists before writing
    if (!fs.existsSync(this.designSystemsDir)) {
      fs.mkdirSync(this.designSystemsDir, { recursive: true });
    }
    
    const systemId = id || `ds_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Save design system JSON
    const filename = `${systemId}.json`;
    const filePath = path.join(this.designSystemsDir, filename);
    
    const systemDataToSave = {
      id: systemId,
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      tokens,
      cssUrl,
      cssText,
      figmaFileKey,
      figmaNodeId,
      isGlobal,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    try {
      await fsPromises.writeFile(filePath, JSON.stringify(systemDataToSave, null, 2), 'utf8');
    } catch (error) {
      throw new Error(`Failed to save design system file: ${error.message}`);
    }
    
    // If CSS text provided (even without cssUrl), save it
    if (cssText) {
      const cssPath = path.join(this.designSystemsDir, `${systemId}.css`);
      try {
        await fsPromises.writeFile(cssPath, cssText, 'utf8');
        systemDataToSave.cssUrl = `/design-systems/${systemId}.css`;
      } catch (error) {
        console.warn(`Failed to save CSS file: ${error.message}`);
        // Don't fail the whole operation if CSS save fails
      }
    }
    
    return systemDataToSave;
  }

  async getDesignSystem(systemId) {
    const filePath = path.join(this.designSystemsDir, `${systemId}.json`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Design system not found: ${systemId}`);
    }
    
    const data = await fsPromises.readFile(filePath, 'utf8');
    return JSON.parse(data);
  }

  async listDesignSystems(filters = {}) {
    if (!fs.existsSync(this.designSystemsDir)) {
      return [];
    }
    
    const files = await fsPromises.readdir(this.designSystemsDir);
    const systems = [];
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      const filePath = path.join(this.designSystemsDir, file);
      const data = await fsPromises.readFile(filePath, 'utf8');
      const system = JSON.parse(data);
      
      // Apply filters
      if (filters.isGlobal !== undefined && system.isGlobal !== filters.isGlobal) continue;
      if (filters.userId && system.userId !== filters.userId) continue;
      
      systems.push(system);
    }
    
    return systems;
  }

  async deleteDesignSystem(systemId) {
    const jsonPath = path.join(this.designSystemsDir, `${systemId}.json`);
    const cssPath = path.join(this.designSystemsDir, `${systemId}.css`);
    
    let deleted = false;
    
    if (fs.existsSync(jsonPath)) {
      await fsPromises.unlink(jsonPath);
      deleted = true;
    }
    
    if (fs.existsSync(cssPath)) {
      await fsPromises.unlink(cssPath);
    }
    
    return deleted;
  }

  async getDesignSystemCSS(systemId) {
    const system = await this.getDesignSystem(systemId);
    
    if (system.cssText) {
      return system.cssText;
    }
    
    if (system.cssUrl) {
      // If it's a local path, read the file
      if (system.cssUrl.startsWith('/design-systems/')) {
        const cssPath = path.join(this.designSystemsDir, `${systemId}.css`);
        if (fs.existsSync(cssPath)) {
          return await fsPromises.readFile(cssPath, 'utf8');
        }
      }
      // Otherwise return the URL (external)
      return system.cssUrl;
    }
    
    return null;
  }

  // Credential storage methods for local mode
  async saveCredential(credentialData, metadata) {
    const { name, url, loginUrl, username, password, notes } = credentialData;
    
    // Validate required fields
    if (!name || !name.trim()) {
      throw new Error('Credential name is required');
    }
    if (!url || !url.trim()) {
      throw new Error('Credential URL is required');
    }
    
    // Ensure credentials directory exists
    const credentialsDir = path.join(this.baseDir, 'credentials');
    if (!fs.existsSync(credentialsDir)) {
      fs.mkdirSync(credentialsDir, { recursive: true });
    }
    
    const credentialId = metadata?.id || `cred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Encrypt credentials
    const { encrypt } = await import('../../services/CredentialEncryption.js');
    // Use a consistent encryption key for local storage
    // In production, this should be stored securely (e.g., keychain on macOS)
    const encryptionKey = process.env.CREDENTIAL_ENCRYPTION_KEY || 
                         process.env.LOCAL_CREDENTIAL_KEY ||
                         'local-credential-encryption-key-change-in-production';
    
    let encryptedData;
    
    // If updating existing credential and username/password not provided, keep existing encrypted values
    if (metadata?.id) {
      try {
        const existing = await this.getCredential(credentialId);
        encryptedData = {
          id: credentialId,
          name: name.trim() || existing.name,
          url: url.trim() || existing.url,
          loginUrl: loginUrl !== undefined ? (loginUrl?.trim() || null) : existing.loginUrl,
          username_encrypted: (username !== undefined && username !== '') ? encrypt(username, encryptionKey) : existing.username_encrypted,
          password_encrypted: (password !== undefined && password !== '') ? encrypt(password, encryptionKey) : existing.password_encrypted,
          notes: notes !== undefined ? (notes?.trim() || null) : existing.notes,
          created_at: existing.created_at,
          updated_at: new Date().toISOString(),
          last_used_at: existing.last_used_at
        };
      } catch (e) {
        // If existing not found, create new
        if (!username || !password) {
          throw new Error('Username and password are required for new credentials');
        }
        encryptedData = {
          id: credentialId,
          name: name.trim(),
          url: url.trim(),
          loginUrl: loginUrl?.trim() || null,
          username_encrypted: encrypt(username, encryptionKey),
          password_encrypted: encrypt(password, encryptionKey),
          notes: notes?.trim() || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_used_at: null
        };
      }
    } else {
      // Create new credential
      if (!username || !username.trim()) {
        throw new Error('Username is required');
      }
      if (!password || !password.trim()) {
        throw new Error('Password is required');
      }
      encryptedData = {
        id: credentialId,
        name: name.trim(),
        url: url.trim(),
        loginUrl: loginUrl?.trim() || null,
        username_encrypted: encrypt(username, encryptionKey),
        password_encrypted: encrypt(password, encryptionKey),
        notes: notes?.trim() || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_used_at: null
      };
    }
    
    // Save to local file
    const filePath = path.join(credentialsDir, `${credentialId}.json`);
    try {
      await fsPromises.writeFile(filePath, JSON.stringify(encryptedData, null, 2), 'utf8');
    } catch (error) {
      throw new Error(`Failed to save credential file: ${error.message}`);
    }
    
    return {
      id: credentialId,
      name: encryptedData.name,
      url: encryptedData.url,
      loginUrl: encryptedData.loginUrl,
      notes: encryptedData.notes,
      created_at: encryptedData.created_at,
      updated_at: encryptedData.updated_at,
      last_used_at: encryptedData.last_used_at
    };
  }

  async listCredentials(filters = {}) {
    const credentialsDir = path.join(this.baseDir, 'credentials');
    
    if (!fs.existsSync(credentialsDir)) {
      return [];
    }
    
    const files = await fsPromises.readdir(credentialsDir);
    const credentials = [];
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      const filePath = path.join(credentialsDir, file);
      const data = await fsPromises.readFile(filePath, 'utf8');
      const credential = JSON.parse(data);
      
      credentials.push({
        id: credential.id,
        name: credential.name,
        url: credential.url,
        loginUrl: credential.loginUrl,
        notes: credential.notes,
        last_used_at: credential.last_used_at,
        created_at: credential.created_at,
        updated_at: credential.updated_at
      });
    }
    
    // Sort by last used or created date
    credentials.sort((a, b) => {
      const aDate = a.last_used_at || a.created_at;
      const bDate = b.last_used_at || b.created_at;
      return new Date(bDate) - new Date(aDate);
    });
    
    return credentials;
  }

  async getCredential(credentialId) {
    const credentialsDir = path.join(this.baseDir, 'credentials');
    const filePath = path.join(credentialsDir, `${credentialId}.json`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Credential not found: ${credentialId}`);
    }
    
    const data = await fsPromises.readFile(filePath, 'utf8');
    return JSON.parse(data);
  }

  async deleteCredential(credentialId) {
    const credentialsDir = path.join(this.baseDir, 'credentials');
    const filePath = path.join(credentialsDir, `${credentialId}.json`);
    
    if (!fs.existsSync(filePath)) {
      return false;
    }
    
    await fsPromises.unlink(filePath);
    return true;
  }

  async decryptCredential(credentialId) {
    const credential = await this.getCredential(credentialId);
    
    // Decrypt credentials
    const { decrypt } = await import('../../services/CredentialEncryption.js');
    // Use same encryption key as saveCredential
    const encryptionKey = process.env.CREDENTIAL_ENCRYPTION_KEY || 
                         process.env.LOCAL_CREDENTIAL_KEY ||
                         'local-credential-encryption-key-change-in-production';
    
    const username = decrypt(credential.username_encrypted, encryptionKey);
    const password = decrypt(credential.password_encrypted, encryptionKey);
    
    // Update last_used_at
    credential.last_used_at = new Date().toISOString();
    const filePath = path.join(this.baseDir, 'credentials', `${credentialId}.json`);
    await fsPromises.writeFile(filePath, JSON.stringify(credential, null, 2), 'utf8');
    
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
