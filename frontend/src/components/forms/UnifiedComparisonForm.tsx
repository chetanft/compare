/**
 * Unified Comparison Form
 * Simplified, robust form with proper error handling and loading states
 */

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { ComparisonRequest, ComparisonResult } from '../../types';
import { unifiedApiService } from '../../services/unified-api';
import { parseFigmaUrl } from '../../utils/figmaParser';

interface UnifiedComparisonFormProps {
  onSuccess: (result: ComparisonResult) => void;
  onError?: (error: Error) => void;
}

export default function UnifiedComparisonForm({ onSuccess, onError }: UnifiedComparisonFormProps) {
  // Form state
  const [figmaUrl, setFigmaUrl] = useState('');
  const [webUrl, setWebUrl] = useState('');
  const [includeVisual, setIncludeVisual] = useState(false);
  
  // Validation state
  const [figmaUrlError, setFigmaUrlError] = useState('');
  const [webUrlError, setWebUrlError] = useState('');

  // Comparison mutation
  const comparisonMutation = useMutation({
    mutationFn: async (request: ComparisonRequest) => {
      console.log('🚀 Starting comparison request:', request);
      return await unifiedApiService.compareUrls(request);
    },
    onSuccess: (result) => {
      console.log('✅ Comparison successful:', result);
      onSuccess(result);
    },
    onError: (error: Error) => {
      console.error('❌ Comparison failed:', error);
      onError?.(error);
    }
  });

  // Form validation
  const validateForm = (): boolean => {
    let isValid = true;
    
    // Reset errors
    setFigmaUrlError('');
    setWebUrlError('');

    // Validate Figma URL
    if (!figmaUrl.trim()) {
      setFigmaUrlError('Figma URL is required');
      isValid = false;
    } else if (!figmaUrl.includes('figma.com')) {
      setFigmaUrlError('Please enter a valid Figma URL');
      isValid = false;
    } else {
      try {
        parseFigmaUrl(figmaUrl);
      } catch (error: any) {
        setFigmaUrlError(error.message);
        isValid = false;
      }
    }

    // Validate Web URL
    if (!webUrl.trim()) {
      setWebUrlError('Web URL is required');
      isValid = false;
    } else if (!webUrl.startsWith('http')) {
      setWebUrlError('Please enter a valid HTTP/HTTPS URL');
      isValid = false;
    }

    return isValid;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Parse Figma URL to extract nodeId
    let nodeId: string | null = null;
    try {
      const parsed = parseFigmaUrl(figmaUrl);
      nodeId = parsed.nodeId;
    } catch (error) {
      console.warn('Could not parse Figma URL for nodeId:', error);
    }

    // Create comparison request
    const request: ComparisonRequest = {
      figmaUrl: figmaUrl.trim(),
      webUrl: webUrl.trim(),
      nodeId,
      includeVisual
    };

    // Execute comparison
    comparisonMutation.mutate(request);
  };

  const isLoading = comparisonMutation.isPending;
  const error = comparisonMutation.error;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5" />
            Compare Figma Design with Web Implementation
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Figma URL Input */}
            <div className="space-y-2">
              <Label htmlFor="figmaUrl">Figma URL *</Label>
              <Input
                id="figmaUrl"
                type="url"
                placeholder="https://www.figma.com/design/..."
                value={figmaUrl}
                onChange={(e) => setFigmaUrl(e.target.value)}
                className={figmaUrlError ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {figmaUrlError && (
                <p className="text-sm text-red-600">{figmaUrlError}</p>
              )}
            </div>

            {/* Web URL Input */}
            <div className="space-y-2">
              <Label htmlFor="webUrl">Web URL *</Label>
              <Input
                id="webUrl"
                type="url"
                placeholder="https://example.com"
                value={webUrl}
                onChange={(e) => setWebUrl(e.target.value)}
                className={webUrlError ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {webUrlError && (
                <p className="text-sm text-red-600">{webUrlError}</p>
              )}
            </div>

            {/* Options */}
            <div className="space-y-3">
              <Label>Comparison Options</Label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="includeVisual"
                  checked={includeVisual}
                  onChange={(e) => setIncludeVisual(e.target.checked)}
                  disabled={isLoading}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="includeVisual" className="text-sm font-normal">
                  Include visual comparison (experimental)
                </Label>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error.message || 'An error occurred during comparison'}
                </AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Comparing Design & Implementation...
                </>
              ) : (
                'Start Comparison'
              )}
            </Button>

            {/* Loading Progress */}
            {isLoading && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground text-center">
                  This may take up to 2 minutes...
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full animate-pulse"
                    style={{ width: '60%' }}
                  ></div>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Helper component for form field errors
const FieldError: React.FC<{ error?: string }> = ({ error }) => {
  if (!error) return null;
  
  return (
    <motion.p
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="text-sm text-red-600 mt-1"
    >
      {error}
    </motion.p>
  );
};
