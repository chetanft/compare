/**
 * Credentials Manager Component
 * Manages saved credentials in Settings
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Trash2, Edit2, Eye, EyeOff, Globe, Cloud, HardDrive } from 'lucide-react';
import { getApiBaseUrl } from '../../config/ports';
import { supabase } from '../../lib/supabase';

interface Credential {
  id: string;
  name: string;
  url: string;
  loginUrl?: string;
  notes?: string;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

export default function CredentialsManager() {
  const { user } = useAuth();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [storageMode, setStorageMode] = useState<'local' | 'supabase'>('local');
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    loginUrl: '',
    username: '',
    password: '',
    notes: ''
  });

  useEffect(() => {
    // Detect storage mode
    const mode = supabase && user ? 'supabase' : 'local';
    setStorageMode(mode);
    loadCredentials(mode);
  }, [user, supabase]);

  const loadCredentials = async (mode?: 'local' | 'supabase') => {
    const currentMode = mode || storageMode;
    try {
      setLoading(true);
      setError(null);
      const apiBaseUrl = getApiBaseUrl();
      
      if (currentMode === 'supabase' && user && supabase) {
        // Load from Supabase via API
        const session = await supabase.auth.getSession();
        const token = session?.data.session?.access_token;
        
        if (!token) {
          throw new Error('Not authenticated');
        }
        
        const response = await fetch(`${apiBaseUrl}/api/credentials`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to load credentials from Supabase');
        }
        
        const result = await response.json();
        setCredentials(result.data || []);
      } else {
        // Load from local storage via API (backend handles LocalStorageProvider)
        const response = await fetch(`${apiBaseUrl}/api/credentials`);
        
        if (!response.ok) {
          // If API fails, return empty array for local mode
          setCredentials([]);
          return;
        }
        
        const result = await response.json();
        setCredentials(result.data || []);
      }
    } catch (err) {
      console.error('Failed to load credentials:', err);
      setError(err instanceof Error ? err.message : 'Failed to load credentials');
      setCredentials([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate required fields
    if (!formData.name || !formData.name.trim()) {
      setError('Credential name is required');
      return;
    }
    if (!formData.url || !formData.url.trim()) {
      setError('Credential URL is required');
      return;
    }
    if (!editingId) {
      // Only require username/password for new credentials
      if (!formData.username || !formData.username.trim()) {
        setError('Username is required');
        return;
      }
      if (!formData.password || !formData.password.trim()) {
        setError('Password is required');
        return;
      }
    }

    const currentMode = supabase && user ? 'supabase' : 'local';
    if (currentMode === 'supabase' && !user) {
      setError('Please sign in to save credentials to Supabase');
      return;
    }

    try {
      const apiBaseUrl = getApiBaseUrl();
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (currentMode === 'supabase' && user && supabase) {
        const session = await supabase.auth.getSession();
        const token = session?.data.session?.access_token;
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }
      
      let url = `${apiBaseUrl}/api/credentials`;
      let method = 'POST';
      
      if (editingId) {
        url = `${apiBaseUrl}/api/credentials/${editingId}`;
        method = 'PUT';
      }

      // Prepare payload with trimmed values
      const payload = {
        name: formData.name.trim(),
        url: formData.url.trim(),
        loginUrl: formData.loginUrl?.trim() || undefined,
        username: formData.username.trim(),
        password: formData.password.trim(),
        notes: formData.notes?.trim() || undefined
      };

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save credential');
      }

      await loadCredentials();
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', url: '', loginUrl: '', username: '', password: '', notes: '' });
    } catch (err) {
      console.error('Failed to save credential:', err);
      setError(err instanceof Error ? err.message : 'Failed to save credential');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this credential?')) {
      return;
    }

    const currentMode = supabase && user ? 'supabase' : 'local';
    if (currentMode === 'supabase' && !user) {
      setError('Please sign in to delete credentials');
      return;
    }

    try {
      const apiBaseUrl = getApiBaseUrl();
      const headers: HeadersInit = {};
      
      if (currentMode === 'supabase' && user && supabase) {
        const session = await supabase.auth.getSession();
        const token = session?.data.session?.access_token;
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }
      
      const response = await fetch(`${apiBaseUrl}/api/credentials/${id}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        throw new Error('Failed to delete credential');
      }

      await loadCredentials();
    } catch (err) {
      console.error('Failed to delete credential:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete credential');
    }
  };

  const handleEdit = (credential: Credential) => {
    setEditingId(credential.id);
    setFormData({
      name: credential.name,
      url: credential.url,
      loginUrl: credential.loginUrl || '',
      username: '', // Don't show username/password in edit form for security
      password: '',
      notes: credential.notes || ''
    });
    setShowForm(true);
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading credentials...</span>
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
            {user ? (
              <>
                <Cloud className="h-4 w-4" />
                <AlertDescription>
                  Using Supabase cloud storage. Credentials are encrypted and synced across devices.
                </AlertDescription>
              </>
            ) : (
              <>
                <HardDrive className="h-4 w-4" />
                <AlertDescription>
                  Supabase configured but not signed in. Credentials will be stored locally until you sign in.
                </AlertDescription>
              </>
            )}
          </div>
        </Alert>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Saved Credentials</h3>
          <p className="text-sm text-muted-foreground">
            Store and reuse authentication credentials for web extractions
          </p>
        </div>
        <Button onClick={() => {
          setShowForm(!showForm);
          setEditingId(null);
          setFormData({ name: '', url: '', loginUrl: '', username: '', password: '', notes: '' });
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Credential
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit' : 'Create'} Credential</CardTitle>
            <CardDescription>
              {editingId && 'Leave username/password blank to keep existing values'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Production Site"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">URL *</Label>
                <Input
                  id="url"
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="loginUrl">Login URL</Label>
                <Input
                  id="loginUrl"
                  type="url"
                  value={formData.loginUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, loginUrl: e.target.value }))}
                  placeholder="https://example.com/login"
                />
                <p className="text-xs text-muted-foreground">
                  Optional: URL where login form is located (if different from main URL)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  required={!editingId}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    required={!editingId}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  className="w-full min-h-[80px] p-2 border rounded-md"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Optional notes about this credential..."
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  {editingId ? 'Update' : 'Create'} Credential
                </Button>
                <Button type="button" variant="outline" onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({ name: '', url: '', loginUrl: '', username: '', password: '', notes: '' });
                }}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {credentials.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No saved credentials yet. Create one to reuse authentication for comparisons.
            </CardContent>
          </Card>
        ) : (
          credentials.map((credential) => (
            <Card key={credential.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{credential.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      {credential.url}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(credential)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(credential.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-1">
                  {credential.notes && <p>{credential.notes}</p>}
                  {credential.last_used_at && (
                    <p>Last used: {new Date(credential.last_used_at).toLocaleDateString()}</p>
                  )}
                  <p>Created: {new Date(credential.created_at).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
