import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { PhotoIcon, PlayIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import FileUploadZone from '../ui/FileUploadZone';
import ComparisonSettings from '../ui/ComparisonSettings';
import ProgressIndicator from '../ui/ProgressIndicator';
import { uploadScreenshots, startScreenshotComparison } from '../../services/api';
import { ComparisonSettings as IComparisonSettings, ScreenshotComparisonResult } from '../../types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ScreenshotComparisonFormProps {
  onSuccess?: (result: ScreenshotComparisonResult) => void;
  onError?: (error: any) => void;
}

export default function ScreenshotComparisonForm({ 
  onSuccess, 
  onError 
}: ScreenshotComparisonFormProps) {
  const [figmaScreenshot, setFigmaScreenshot] = useState<File | null>(null);
  const [developedScreenshot, setDevelopedScreenshot] = useState<File | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [metadata, setMetadata] = useState({
    projectName: '',
    componentName: '',
    description: ''
  });

  const [settings, setSettings] = useState<IComparisonSettings>({
    threshold: 0.1,
    colorTolerance: 30,
    ignoreAntiAliasing: false,
    includeTextAnalysis: true,
    layoutAnalysis: true,
    colorAnalysis: true,
    spacingAnalysis: true
  });

  const describeComparisonError = (error: unknown): string => {
    if (!error) return 'Comparison failed for an unknown reason.';

    if (typeof error === 'string') return error;

    if (error instanceof Error) {
      if (/network/i.test(error.message)) {
        return 'Unable to reach the comparison server. Check your network connection and server status.';
      }
      if (/timeout/i.test(error.message)) {
        return 'The comparison timed out before finishing. Try again with smaller images or adjust timeout settings.';
      }
      return error.message;
    }

    const apiError = error as { message?: string; status?: number };

    switch (apiError.status) {
      case 400:
        return 'The server rejected the uploaded files. Confirm both screenshots are valid JPG, PNG, or WebP images.';
      case 401:
      case 403:
        return 'Authentication failed while processing the comparison. Update your credentials and try again.';
      case 404:
        return 'Comparison service endpoint was not found. Ensure the backend build is up to date.';
      case 429:
        return 'Too many comparison requests in a short time. Wait a moment and try again.';
      case 500:
        return 'The server encountered an error while analyzing screenshots. Check server logs for details.';
      default:
        break;
    }

    return apiError.message || 'Comparison failed due to an unexpected server response.';
  };

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const uploadResult = await uploadScreenshots(formData);
      return await startScreenshotComparison(uploadResult.uploadId, settings);
    },
    onSuccess: (result) => {
      console.log('Screenshot comparison completed:', result);
      onSuccess?.(result);
    },
    onError: (error) => {
      console.error('Screenshot comparison failed:', error);
      const friendlyMessage = describeComparisonError(error);
      onError?.(new Error(friendlyMessage));
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!figmaScreenshot || !developedScreenshot) {
      onError?.(new Error('Please upload both screenshots'));
      return;
    }

    // Critical debugging - check File object integrity
    console.log('🔍 File state check:', {
      figmaScreenshot: {
        name: figmaScreenshot?.name,
        type: figmaScreenshot?.type,
        size: figmaScreenshot?.size,
        isFile: figmaScreenshot instanceof File,
        isBlob: figmaScreenshot instanceof Blob,
        constructor: figmaScreenshot?.constructor?.name,
        toString: typeof figmaScreenshot?.toString,
        hasPath: 'path' in (figmaScreenshot || {}),
        hasRelativePath: 'relativePath' in (figmaScreenshot || {}),
        actualValue: figmaScreenshot
      },
      developedScreenshot: {
        name: developedScreenshot?.name,
        type: developedScreenshot?.type,
        size: developedScreenshot?.size,
        isFile: developedScreenshot instanceof File,
        isBlob: developedScreenshot instanceof Blob,
        constructor: developedScreenshot?.constructor?.name,
        toString: typeof developedScreenshot?.toString,
        hasPath: 'path' in (developedScreenshot || {}),
        hasRelativePath: 'relativePath' in (developedScreenshot || {}),
        actualValue: developedScreenshot
      }
    });

    // Only proceed if we have real File objects
    if (!(figmaScreenshot instanceof File) || !(developedScreenshot instanceof File)) {
      console.error('❌ Invalid file objects detected!');
      onError?.(new Error('Invalid file objects - please refresh the page and try again'));
      return;
    }

    const formData = new FormData();
    formData.append('figmaScreenshot', figmaScreenshot);
    formData.append('developedScreenshot', developedScreenshot);
    formData.append('metadata', JSON.stringify(metadata));

    // Debug FormData contents
    console.log('📝 FormData debug:');
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`  ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
      } else {
        console.log(`  ${key}:`, value);
      }
    }

    uploadMutation.mutate(formData);
  };

  const hasBothScreenshots = Boolean(figmaScreenshot && developedScreenshot);
  const canSubmit = hasBothScreenshots && !uploadMutation.isPending;

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Upload Section */}
        <div className="grid md:grid-cols-2 gap-6 items-start">
          <FileUploadZone
            title="Figma Design Screenshot"
            description="Upload your design file screenshot from Figma"
            selectedFile={figmaScreenshot}
            onFileSelect={setFigmaScreenshot}
            onFileRemove={() => setFigmaScreenshot(null)}
          />
          
          <FileUploadZone
            title="Developed Implementation Screenshot"
            description="Upload your developed website/app screenshot"
            selectedFile={developedScreenshot}
            onFileSelect={setDevelopedScreenshot}
            onFileRemove={() => setDevelopedScreenshot(null)}
          />
        </div>

        {/* Metadata Section */}
        <Card className="border-gray-200">
          <CardHeader>
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <PhotoIcon className="w-5 h-5 mr-2 text-indigo-600" />
              Project Information (Optional)
            </h3>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Name
              </label>
              <Input
                type="text"
                value={metadata.projectName}
                onChange={(e) => setMetadata({ ...metadata, projectName: e.target.value })}
                className="border-2 border-gray-300 focus-visible:border-primary-500"
                placeholder="My Project"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Component Name
              </label>
              <Input
                type="text"
                value={metadata.componentName}
                onChange={(e) => setMetadata({ ...metadata, componentName: e.target.value })}
                className="border-2 border-gray-300 focus-visible:border-primary-500"
                placeholder="Header Component"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <Input
                type="text"
                value={metadata.description}
                onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
                className="border-2 border-gray-300 focus-visible:border-primary-500"
                placeholder="Landing page header section"
              />
            </div>
          </div>
          </CardContent>
        </Card>

        {/* Settings Toggle */}
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center space-x-2">
                  <Cog6ToothIcon className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-medium text-gray-900">
                    Advanced Settings
                  </h3>
                </div>
                <motion.div
                  animate={{ rotate: showSettings ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </motion.div>
              </button>
            </div>
            
            <motion.div
              initial={false}
              animate={{ height: showSettings ? 'auto' : 0, opacity: showSettings ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              {showSettings && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <ComparisonSettings
                    settings={settings}
                    onChange={setSettings}
                  />
                </div>
              )}
            </motion.div>
          </CardContent>
        </Card>

        {/* Progress Indicator */}
        {uploadMutation.isPending && (
          <Card className="border-gray-200">
            <CardContent>
              <ProgressIndicator
              stages={[
                { id: 'upload', name: 'Uploading Screenshots', status: 'in_progress' },
                { id: 'preprocessing', name: 'Preprocessing Images', status: 'pending' },
                { id: 'comparison', name: 'Performing Comparison', status: 'pending' },
                { id: 'analysis', name: 'Analyzing Discrepancies', status: 'pending' },
                { id: 'report', name: 'Generating Report', status: 'pending' }
              ]}
              currentStage="upload"
            />
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <div className="flex flex-col items-center space-y-2">
          <motion.button
            type="submit"
            disabled={!canSubmit}
            className={`
              inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 flex items-center space-x-2 px-8 py-3 text-lg
              ${!canSubmit ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700'}
            `}
            whileHover={canSubmit ? { scale: 1.02 } : {}}
            whileTap={canSubmit ? { scale: 0.98 } : {}}
          >
            <PlayIcon className="w-5 h-5" />
            <span>
              {uploadMutation.isPending ? 'Comparing Screenshots...' : 'Start Comparison'}
            </span>
          </motion.button>
          {!hasBothScreenshots && (
            <p className="text-xs text-muted-foreground text-center">
              Upload both Figma and developed screenshots to enable comparison.
            </p>
          )}
        </div>

        {/* Error Display */}
        {uploadMutation.error && (
          <Card className="border-2 border-red-400 bg-red-50">
            <CardContent>
              <div className="text-red-600 text-sm">
                <strong>Error:</strong> {(uploadMutation.error as any)?.message || 'An unexpected error occurred'}
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  );
}
