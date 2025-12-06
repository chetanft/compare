/**
 * Supabase Storage Provider
 * Supabase-based storage implementation for SaaS/online mode
 */

import { randomUUID } from 'crypto';
import { StorageProvider } from './StorageProvider.js';
import { getSupabaseClient } from '../config/supabase.js';

export class SupabaseStorageProvider extends StorageProvider {
  constructor(userId = null) {
    super();
    this.userId = userId;
    this.supabase = getSupabaseClient(false); // Use public client with RLS
    this.serviceSupabase = getSupabaseClient(true); // Use service client for admin operations
    
    if (!this.supabase) {
      throw new Error('Supabase not configured. Cannot use SupabaseStorageProvider.');
    }
  }

  getStorageMode() {
    return 'supabase';
  }

  async isAvailable() {
    try {
      // Test Supabase connection
      const { data, error } = await this.supabase.from('profiles').select('id').limit(1);
      return !error;
    } catch (error) {
      return false;
    }
  }

  async saveReport(reportData, metadata) {
    const { comparisonId, title, format = 'html' } = metadata;
    
    if (!this.userId) {
      throw new Error('User ID required for Supabase storage');
    }
    
    // Generate report ID
    const reportId = metadata.id || randomUUID();
    
    // Convert report data to buffer if needed
    const buffer = typeof reportData === 'string' 
      ? Buffer.from(reportData, 'utf8')
      : Buffer.isBuffer(reportData)
      ? reportData
      : Buffer.from(String(reportData));
    
    // Upload to Supabase Storage
    const storagePath = `reports/${this.userId}/${reportId}.${format}`;
    const { data: uploadData, error: uploadError } = await this.supabase.storage
      .from('reports')
      .upload(storagePath, buffer, {
        contentType: format === 'html' ? 'text/html' : format === 'json' ? 'application/json' : 'application/octet-stream',
        upsert: true
      });
    
    if (uploadError) {
      throw new Error(`Failed to upload report: ${uploadError.message}`);
    }
    
    // Get public URL
    const { data: urlData } = this.supabase.storage
      .from('reports')
      .getPublicUrl(storagePath);
    
    // Create report entry in database
    const { data: reportEntry, error: dbError } = await this.supabase
      .from('reports')
      .insert({
        id: reportId,
        user_id: this.userId,
        comparison_id: comparisonId || null,
        title: title || `Report ${reportId}`,
        format,
        storage_path: storagePath,
        file_size: buffer.length
      })
      .select()
      .single();
    
    if (dbError) {
      // Clean up uploaded file if DB insert fails
      await this.supabase.storage.from('reports').remove([storagePath]);
      throw new Error(`Failed to create report entry: ${dbError.message}`);
    }
    
    return {
      id: reportEntry.id,
      title: reportEntry.title,
      comparisonId: reportEntry.comparison_id,
      format: reportEntry.format,
      url: urlData.publicUrl,
      fileSize: reportEntry.file_size,
      createdAt: reportEntry.created_at
    };
  }

  async getReport(reportId) {
    // Get report metadata from database
    const { data: reportEntry, error: dbError } = await this.supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single();
    
    if (dbError || !reportEntry) {
      throw new Error(`Report not found: ${reportId}`);
    }
    
    // Download report file from storage
    const { data: fileData, error: downloadError } = await this.supabase.storage
      .from('reports')
      .download(reportEntry.storage_path);
    
    if (downloadError) {
      throw new Error(`Failed to download report: ${downloadError.message}`);
    }
    
    // Convert blob to string
    const text = await fileData.text();
    
    return {
      data: text,
      metadata: {
        id: reportEntry.id,
        title: reportEntry.title,
        comparisonId: reportEntry.comparison_id,
        format: reportEntry.format,
        url: reportEntry.storage_path,
        fileSize: reportEntry.file_size,
        createdAt: reportEntry.created_at
      }
    };
  }

  async listReports(filters = {}) {
    let query = this.supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Apply filters
    if (filters.userId || this.userId) {
      query = query.eq('user_id', filters.userId || this.userId);
    }
    if (filters.comparisonId) {
      query = query.eq('comparison_id', filters.comparisonId);
    }
    if (filters.format) {
      query = query.eq('format', filters.format);
    }
    
    const { data: reports, error } = await query;
    
    if (error) {
      throw new Error(`Failed to list reports: ${error.message}`);
    }
    
    // Generate signed URLs for each report
    const reportsWithUrls = await Promise.all(
      (reports || []).map(async (report) => {
        const { data: urlData } = this.supabase.storage
          .from('reports')
          .getPublicUrl(report.storage_path);
        
        return {
          id: report.id,
          title: report.title,
          comparisonId: report.comparison_id,
          format: report.format,
          url: urlData.publicUrl,
          fileSize: report.file_size,
          createdAt: report.created_at
        };
      })
    );
    
    return reportsWithUrls;
  }

  async deleteReport(reportId) {
    // Get report metadata
    const { data: reportEntry, error: fetchError } = await this.supabase
      .from('reports')
      .select('storage_path')
      .eq('id', reportId)
      .single();
    
    if (fetchError || !reportEntry) {
      return false;
    }
    
    // Delete from storage
    await this.supabase.storage.from('reports').remove([reportEntry.storage_path]);
    
    // Delete from database
    const { error: deleteError } = await this.supabase
      .from('reports')
      .delete()
      .eq('id', reportId);
    
    return !deleteError;
  }

  async saveScreenshot(fileData, metadata) {
    const { comparisonId, uploadId, imageType = 'pixel-diff' } = metadata;
    
    if (!this.userId) {
      throw new Error('User ID required for Supabase storage');
    }
    
    // Convert to buffer
    const buffer = Buffer.isBuffer(fileData) 
      ? fileData 
      : Buffer.from(fileData, 'base64');
    
    // Upload to Supabase Storage
    const storagePath = `screenshots/${this.userId}/${comparisonId}/${imageType}.png`;
    const { data: uploadData, error: uploadError } = await this.supabase.storage
      .from('screenshots')
      .upload(storagePath, buffer, {
        contentType: 'image/png',
        upsert: true
      });
    
    if (uploadError) {
      throw new Error(`Failed to upload screenshot: ${uploadError.message}`);
    }
    
    // Get signed URL (valid for 1 hour)
    const { data: urlData } = this.supabase.storage
      .from('screenshots')
      .createSignedUrl(storagePath, 3600);
    
    return {
      comparisonId,
      uploadId,
      url: urlData.signedUrl,
      createdAt: new Date().toISOString()
    };
  }

  async getScreenshotUrl(comparisonId, imageType = 'pixel-diff') {
    if (!this.userId) {
      throw new Error('User ID required for Supabase storage');
    }
    
    const storagePath = `screenshots/${this.userId}/${comparisonId}/${imageType}.png`;
    
    // Generate signed URL (valid for 1 hour)
    const { data: urlData, error } = await this.supabase.storage
      .from('screenshots')
      .createSignedUrl(storagePath, 3600);
    
    if (error) {
      throw new Error(`Failed to generate screenshot URL: ${error.message}`);
    }
    
    return urlData.signedUrl;
  }

  async saveDesignSystem(systemData) {
    const { id, name, slug, tokens, cssUrl, cssText, figmaFileKey, figmaNodeId, isGlobal = false } = systemData;
    
    if (!this.userId && !isGlobal) {
      throw new Error('User ID required for non-global design systems');
    }
    
    const systemId = id || randomUUID();
    
    // If CSS text provided and no URL, upload to storage
    let finalCssUrl = cssUrl;
    if (cssText && !cssUrl) {
      const cssBuffer = Buffer.from(cssText, 'utf8');
      const cssPath = `design-systems/${this.userId || 'global'}/${systemId}.css`;
      
      const { error: cssError } = await this.supabase.storage
        .from('design-systems')
        .upload(cssPath, cssBuffer, {
          contentType: 'text/css',
          upsert: true
        });
      
      if (!cssError) {
        const { data: cssUrlData } = this.supabase.storage
          .from('design-systems')
          .getPublicUrl(cssPath);
        finalCssUrl = cssUrlData.publicUrl;
      }
    }
    
    // Save to database
    const { data: savedSystem, error: dbError } = await this.supabase
      .from('design_systems')
      .upsert({
        id: systemId,
        user_id: isGlobal ? null : this.userId,
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
        is_global: isGlobal,
        tokens,
        css_url: finalCssUrl,
        css_text: cssText && !finalCssUrl ? cssText : null, // Only store inline if no URL
        figma_file_key: figmaFileKey,
        figma_node_id: figmaNodeId
      }, {
        onConflict: 'id'
      })
      .select()
      .single();
    
    if (dbError) {
      throw new Error(`Failed to save design system: ${dbError.message}`);
    }
    
    return {
      id: savedSystem.id,
      name: savedSystem.name,
      slug: savedSystem.slug,
      tokens: savedSystem.tokens,
      cssUrl: savedSystem.css_url,
      cssText: savedSystem.css_text,
      figmaFileKey: savedSystem.figma_file_key,
      figmaNodeId: savedSystem.figma_node_id,
      isGlobal: savedSystem.is_global,
      userId: savedSystem.user_id,
      createdAt: savedSystem.created_at,
      updatedAt: savedSystem.updated_at
    };
  }

  async getDesignSystem(systemId) {
    const { data: system, error } = await this.supabase
      .from('design_systems')
      .select('*')
      .eq('id', systemId)
      .single();
    
    if (error || !system) {
      throw new Error(`Design system not found: ${systemId}`);
    }
    
    return {
      id: system.id,
      name: system.name,
      slug: system.slug,
      tokens: system.tokens,
      cssUrl: system.css_url,
      cssText: system.css_text,
      figmaFileKey: system.figma_file_key,
      figmaNodeId: system.figma_node_id,
      isGlobal: system.is_global,
      userId: system.user_id,
      createdAt: system.created_at,
      updatedAt: system.updated_at
    };
  }

  async listDesignSystems(filters = {}) {
    let query = this.supabase
      .from('design_systems')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Apply filters
    if (filters.isGlobal !== undefined) {
      query = query.eq('is_global', filters.isGlobal);
    }
    if (filters.userId || this.userId) {
      // Include global systems and user's systems
      query = query.or(`is_global.eq.true,user_id.eq.${filters.userId || this.userId}`);
    }
    
    const { data: systems, error } = await query;
    
    if (error) {
      throw new Error(`Failed to list design systems: ${error.message}`);
    }
    
    return (systems || []).map(system => ({
      id: system.id,
      name: system.name,
      slug: system.slug,
      tokens: system.tokens,
      cssUrl: system.css_url,
      cssText: system.css_text,
      figmaFileKey: system.figma_file_key,
      figmaNodeId: system.figma_node_id,
      isGlobal: system.is_global,
      userId: system.user_id,
      createdAt: system.created_at,
      updatedAt: system.updated_at
    }));
  }

  async deleteDesignSystem(systemId) {
    // Get system to check for CSS file
    const system = await this.getDesignSystem(systemId);
    
    // Delete CSS file from storage if exists
    if (system.cssUrl && system.cssUrl.includes('/design-systems/')) {
      const cssPath = system.cssUrl.split('/design-systems/')[1];
      await this.supabase.storage.from('design-systems').remove([`design-systems/${cssPath}`]);
    }
    
    // Delete from database
    const { error } = await this.supabase
      .from('design_systems')
      .delete()
      .eq('id', systemId);
    
    return !error;
  }

  async getDesignSystemCSS(systemId) {
    const system = await this.getDesignSystem(systemId);
    
    if (system.cssText) {
      return system.cssText;
    }
    
    if (system.cssUrl) {
      // If it's a Supabase Storage URL, download it
      if (system.cssUrl.includes('supabase.co/storage')) {
        const pathMatch = system.cssUrl.match(/\/storage\/v1\/object\/public\/design-systems\/(.+)/);
        if (pathMatch) {
          const { data: cssData, error } = await this.supabase.storage
            .from('design-systems')
            .download(`design-systems/${pathMatch[1]}`);
          
          if (!error && cssData) {
            return await cssData.text();
          }
        }
      }
      // Otherwise return the URL (external)
      return system.cssUrl;
    }
    
    return null;
  }

  async saveCredential(credentialData, metadata) {
    // Credentials are handled via direct Supabase API calls in server
    // This method exists for interface compliance but shouldn't be called directly
    throw new Error('Use Supabase API endpoints for credential management');
  }

  async listCredentials(filters = {}) {
    // Credentials are handled via direct Supabase API calls in server
    throw new Error('Use Supabase API endpoints for credential management');
  }

  async getCredential(credentialId) {
    // Credentials are handled via direct Supabase API calls in server
    throw new Error('Use Supabase API endpoints for credential management');
  }

  async deleteCredential(credentialId) {
    // Credentials are handled via direct Supabase API calls in server
    throw new Error('Use Supabase API endpoints for credential management');
  }

  async decryptCredential(credentialId) {
    // Credentials are handled via direct Supabase API calls in server
    throw new Error('Use Supabase API endpoints for credential management');
  }
}
