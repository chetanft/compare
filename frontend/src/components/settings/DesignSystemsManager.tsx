/**
 * Design Systems Manager Component
 * Manages design systems in Settings
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Trash2, Edit2, Upload, FileText, Code, Cloud, HardDrive } from 'lucide-react';
import { getApiBaseUrl } from '../../config/ports';
import { supabase } from '../../lib/supabase';

interface DesignSystem {
  id: string;
  name: string;
  slug: string;
  tokens: any;
  cssUrl?: string;
  cssText?: string;
  figmaFileKey?: string;
  figmaNodeId?: string;
  isGlobal: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function DesignSystemsManager() {
  const { user } = useAuth();
  const [systems, setSystems] = useState<DesignSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [storageMode, setStorageMode] = useState<'local' | 'supabase'>('local');
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    cssText: '',
    cssFile: null as File | null,
    tokens: '{}'
  });

  useEffect(() => {
    // Detect storage mode
    const mode = supabase ? 'supabase' : 'local';
    setStorageMode(mode);
    loadSystems(mode);
  }, [user, supabase]);

  const loadSystems = async (mode?: 'local' | 'supabase') => {
    const currentMode = mode || storageMode;
    try {
      setLoading(true);
      setError(null);
      
      if (currentMode === 'supabase' && supabase) {
        // Load from Supabase via API
        const apiBaseUrl = getApiBaseUrl();
        const headers: HeadersInit = {};
        
        if (user) {
          const session = await supabase.auth.getSession();
          if (session?.data.session?.access_token) {
            headers['Authorization'] = `Bearer ${session.data.session.access_token}`;
          }
        }
        
        const response = await fetch(`${apiBaseUrl}/api/design-systems`, { headers });
        
        if (!response.ok) {
          throw new Error('Failed to load design systems from Supabase');
        }
        
        const result = await response.json();
        setSystems(result.data || []);
      } else {
        // Load from local storage via API (backend handles LocalStorageProvider)
        const apiBaseUrl = getApiBaseUrl();
        const response = await fetch(`${apiBaseUrl}/api/design-systems`);
        
        if (!response.ok) {
          // If API fails, try to load from localStorage as fallback
          const localData = localStorage.getItem('design-systems');
          if (localData) {
            setSystems(JSON.parse(localData));
          } else {
            setSystems([]);
          }
          return;
        }
        
        const result = await response.json();
        setSystems(result.data || []);
      }
    } catch (err) {
      console.error('Failed to load design systems:', err);
      setError(err instanceof Error ? err.message : 'Failed to load design systems');
      // Fallback to empty array
      setSystems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      // Validate required fields
      if (!formData.name || !formData.name.trim()) {
        setError('Design system name is required');
        return;
      }

      // Parse and validate JSON tokens
      let tokens;
      try {
        tokens = JSON.parse(formData.tokens || '{}');
        if (typeof tokens !== 'object' || Array.isArray(tokens)) {
          throw new Error('Tokens must be a valid JSON object');
        }
      } catch (parseError) {
        setError(`Invalid JSON in tokens field: ${parseError instanceof Error ? parseError.message : 'Invalid JSON format'}`);
        return;
      }

      const apiBaseUrl = getApiBaseUrl();
      
      const payload: any = {
        name: formData.name.trim(),
        slug: formData.slug?.trim() || formData.name.toLowerCase().replace(/\s+/g, '-'),
        tokens,
        cssText: formData.cssText?.trim() || undefined
      };

      let url = `${apiBaseUrl}/api/design-systems`;
      let method = 'POST';
      
      if (editingId) {
        url = `${apiBaseUrl}/api/design-systems/${editingId}`;
        method = 'PUT';
        payload.id = editingId;
      }

      const currentMode = supabase ? 'supabase' : 'local';
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (currentMode === 'supabase' && user && supabase) {
        const session = await supabase.auth.getSession();
        if (session?.data.session?.access_token) {
          headers['Authorization'] = `Bearer ${session.data.session.access_token}`;
        }
      }
      
      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save design system');
      }

      await loadSystems();
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', slug: '', cssText: '', cssFile: null, tokens: '{}' });
    } catch (err) {
      console.error('Failed to save design system:', err);
      setError(err instanceof Error ? err.message : 'Failed to save design system');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this design system?')) {
      return;
    }

    try {
      const apiBaseUrl = getApiBaseUrl();
      const currentMode = supabase ? 'supabase' : 'local';
      const headers: HeadersInit = {};
      if (currentMode === 'supabase' && user && supabase) {
        const session = await supabase.auth.getSession();
        if (session?.data.session?.access_token) {
          headers['Authorization'] = `Bearer ${session.data.session.access_token}`;
        }
      }
      
      const response = await fetch(`${apiBaseUrl}/api/design-systems/${id}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        throw new Error('Failed to delete design system');
      }

      await loadSystems();
    } catch (err) {
      console.error('Failed to delete design system:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete design system');
    }
  };

  const handleEdit = (system: DesignSystem) => {
    setEditingId(system.id);
    setFormData({
      name: system.name,
      slug: system.slug,
      cssText: system.cssText || '',
      cssFile: null,
      tokens: JSON.stringify(system.tokens || {}, null, 2)
    });
    setShowForm(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({
          ...prev,
          cssText: event.target?.result as string
        }));
      };
      reader.readAsText(file);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading design systems...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Storage Mode Indicator */}
      {supabase && (
        <Alert>
          <div className="flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            <AlertDescription>
              Using Supabase cloud storage. Data will sync across devices.
            </AlertDescription>
          </div>
        </Alert>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Design Systems</h3>
          <p className="text-sm text-muted-foreground">
            Manage design tokens and CSS for your comparisons
          </p>
        </div>
        <Button onClick={() => {
          setShowForm(!showForm);
          setEditingId(null);
          setFormData({ name: '', slug: '', cssText: '', cssFile: null, tokens: '{}' });
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Design System
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit' : 'Create'} Design System</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="auto-generated-from-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tokens">Design Tokens (JSON) *</Label>
                <textarea
                  id="tokens"
                  className="w-full min-h-[200px] p-2 border rounded-md font-mono text-sm"
                  value={formData.tokens}
                  onChange={(e) => setFormData(prev => ({ ...prev, tokens: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="css">CSS</Label>
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept=".css"
                    onChange={handleFileUpload}
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" onClick={() => setFormData(prev => ({ ...prev, cssText: '' }))}>
                    Clear
                  </Button>
                </div>
                {formData.cssText && (
                  <textarea
                    className="w-full min-h-[150px] p-2 border rounded-md font-mono text-sm"
                    value={formData.cssText}
                    onChange={(e) => setFormData(prev => ({ ...prev, cssText: e.target.value }))}
                    placeholder="Or paste CSS here..."
                  />
                )}
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  {editingId ? 'Update' : 'Create'} Design System
                </Button>
                <Button type="button" variant="outline" onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({ name: '', slug: '', cssText: '', cssFile: null, tokens: '{}' });
                }}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {systems.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No design systems yet. Create one to get started.
            </CardContent>
          </Card>
        ) : (
          systems.map((system) => (
            <Card key={system.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{system.name}</CardTitle>
                    <CardDescription>
                      {system.isGlobal && <span className="text-primary">Global</span>}
                      {system.cssText && <span className="ml-2"><FileText className="inline h-4 w-4" /> CSS</span>}
                      {system.cssUrl && <span className="ml-2"><Code className="inline h-4 w-4" /> External CSS</span>}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(system)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    {!system.isGlobal && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(system.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  <p>Slug: <code className="bg-muted px-1 rounded">{system.slug}</code></p>
                  <p>Updated: {new Date(system.updatedAt).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
