import React, { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import apiService, { compareUrls } from '../../services/api'
import { getApiBaseUrl, isProduction, getEnvVar } from '../../utils/environment'
import ProgressIndicator, { ProgressStage } from '../ui/ProgressIndicator'
import {
  DocumentTextIcon,
  GlobeAltIcon,
  CogIcon,
  PlayIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
  InformationCircleIcon,
  LockClosedIcon,
  ArrowPathIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline'
import { ComparisonRequest, ComparisonResult, AuthenticationConfig } from '../../types'

// Add error type definition
interface ComparisonError {
  message: string | { message: string };
  code?: string;
}

// No hardcoded placeholders

// Using the updated AuthenticationConfig interface from types

// Using the updated ComparisonResult interface from types

interface ComparisonFormProps {
  onSuccess?: (result: ComparisonResult) => void
  onComparisonStart?: (comparisonId: string) => void
}

export default function ComparisonForm({ onSuccess, onComparisonStart }: ComparisonFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [authType, setAuthType] = useState<'none' | 'credentials' | 'cookies' | 'headers'>('none')
  const [progressStages, setProgressStages] = useState<ProgressStage[]>([])
  const [currentStage, setCurrentStage] = useState<string>('')
  const [reportUrls, setReportUrls] = useState<{ directUrl?: string; downloadUrl?: string; hasError?: boolean }>({})
  const [reportOpenAttempts, setReportOpenAttempts] = useState<number>(0)
  const [figmaUrlError, setFigmaUrlError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { control, handleSubmit, watch, formState: { errors }, reset } = useForm<ComparisonRequest & { extractionMode: 'frame-only' | 'global-styles' | 'both' }>({
    defaultValues: {
      figmaUrl: '',
      webUrl: '',
      webSelector: '',
      includeVisual: true,
      extractionMode: 'both',
      authentication: {
        type: 'credentials',
        loginUrl: '',
        username: '',
        password: '',
        waitTime: 3000,
        successIndicator: ''
      }
    }
  })

  const comparisonMutation = useMutation({
    mutationFn: async (data: ComparisonRequest & { extractionMode: 'frame-only' | 'global-styles' | 'both' }) => {
      try {
        // Parse and validate Figma URL
        let figmaUrl = data.figmaUrl;
        let nodeId: string | null = null;
        
        try {
          // Validate Figma URL format
          if (!figmaUrl.match(/^https:\/\/www\.figma\.com\/(file|design|proto)\/[a-zA-Z0-9-]+\//)) {
            throw new Error('Invalid Figma URL format. Expected format: https://www.figma.com/file/... or https://www.figma.com/design/...');
          }
          
          // Extract nodeId from URL if present
          const nodeIdMatch = figmaUrl.match(/[?&]node-id=([^&]+)/);
          if (nodeIdMatch) {
            nodeId = nodeIdMatch[1].replace('-', ':');
          }
          
          // Ensure URL is in file format for API compatibility
          if (figmaUrl.includes('/design/')) {
            figmaUrl = figmaUrl.replace('/design/', '/file/');
          } else if (figmaUrl.includes('/proto/')) {
            figmaUrl = figmaUrl.replace('/proto/', '/file/');
          }
          
          setFigmaUrlError(null);
        } catch (urlError: any) {
          setFigmaUrlError(urlError.message);
          throw urlError;
        }

        // Create the request payload with the expected format
        const payload = {
          figmaUrl: figmaUrl,
          webUrl: data.webUrl,
          includeVisual: data.includeVisual,
          nodeId: nodeId, // Use extracted nodeId
          extractionMode: data.extractionMode, // Add extraction mode
          authentication: authType === 'none' ? null : {
            type: authType,
            loginUrl: data.authentication?.loginUrl,
            username: data.authentication?.username,
            password: data.authentication?.password,
            waitTime: data.authentication?.waitTime || 3000,
            successIndicator: data.authentication?.successIndicator,
            figmaToken: data.authentication?.figmaToken,
            webAuth: {
              username: data.authentication?.username,
              password: data.authentication?.password
            }
          }
        };
        
        console.log('🚀 Sending comparison request:', payload);
        
        // Use the compareUrls function from the API service
        const result = await compareUrls(payload);
        
        // Handle Netlify function response format
        const comparisonResult = (result.data || result) as ComparisonResult;
        
        // If the result contains a comparisonId, notify the parent component
        if ((comparisonResult.comparisonId) && onComparisonStart) {
          onComparisonStart(comparisonResult.comparisonId);
        }
        
        return comparisonResult;
      } catch (error) {
        console.error('❌ Request failed:', error);
        throw error;
      }
    },
    onSuccess: (result) => {
      console.log('🔥 COMPARISON FORM onSuccess CALLED!');
      console.log('✅ Comparison mutation successful:', result);
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      
      // Store report URLs for UI access
      const resultData = result as any;
      const reports = resultData.reports;
      
      if (reports?.directUrl) {
        setReportUrls({
          directUrl: reports.directUrl,
          downloadUrl: reports.downloadUrl,
          hasError: reports.hasError || false
        });
        
        // Open the report in a new tab
        const apiBaseUrl = getApiBaseUrl();
        const fullDirectUrl = `${apiBaseUrl}${reports.directUrl}`;
        
        // Reset report open attempts counter
        setReportOpenAttempts(0);
        
        // Open the report in a new tab
        try {
          const newWindow = window.open(fullDirectUrl, '_blank');
          
          // Check if popup was blocked
          if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
            console.warn('⚠️ Popup blocked or failed to open');
            setReportOpenAttempts(prev => prev + 1);
          } else {
            // Success, reset attempts counter
            setReportOpenAttempts(0);
          }
        } catch (windowError) {
          console.error('❌ Failed to open report in new tab:', windowError);
          setReportOpenAttempts(prev => prev + 1);
        }
      }
      
      onSuccess?.(result);
    },
    onError: (error: unknown) => {
      console.error('❌ Comparison mutation failed:', error);
      
      // Extract error message from various error formats
      let errorMessage = 'An unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        const comparisonError = error as ComparisonError;
        errorMessage = typeof comparisonError.message === 'object' 
          ? comparisonError.message.message 
          : comparisonError.message || JSON.stringify(error);
      }

      // Update progress stages with error
      setProgressStages(prevStages => {
        const newStages = prevStages.length > 0 ? prevStages : [{
          stage: 'comparison',
          label: 'Comparison',
          progress: 0
        }];

        return newStages.map(stage => 
          stage.stage === currentStage 
            ? { 
                ...stage, 
                error: true, 
                message: errorMessage,
                details: (error as ComparisonError).code ? `Error code: ${(error as ComparisonError).code}` : undefined
              }
            : stage
        );
      });

      // Show error toast or notification
      if (window.Notification && Notification.permission === 'granted') {
        new Notification('Comparison Failed', {
          body: errorMessage,
          icon: '/error-icon.png'
        });
      }
    },
    retry: 2,
    retryDelay: attempt => Math.min(1000 * 2 ** attempt, 10000)
  });

  const onSubmit = (data: ComparisonRequest & { extractionMode: 'frame-only' | 'global-styles' | 'both' }) => {
    comparisonMutation.mutate(data);
  }

  const figmaUrl = watch('figmaUrl')
  const webUrl = watch('webUrl')

  // Reset progress when starting new comparison
  useEffect(() => {
    if (comparisonMutation.isIdle) {
      setProgressStages([])
      setCurrentStage('')
      setReportUrls({})
      setReportOpenAttempts(0)
    }
  }, [comparisonMutation.isIdle])

  // Function to open report in new tab
  const openReportInNewTab = () => {
    if (reportUrls.directUrl) {
      const apiBaseUrl = getApiBaseUrl();
      try {
        const newWindow = window.open(`${apiBaseUrl}${reportUrls.directUrl}`, '_blank');
        
        // Check if popup was blocked
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
          console.warn('⚠️ Popup blocked or failed to open');
          setReportOpenAttempts(prev => prev + 1);
        } else {
          // Success, reset attempts counter
          setReportOpenAttempts(0);
        }
      } catch (error) {
        console.error('❌ Failed to open report:', error);
        setReportOpenAttempts(prev => prev + 1);
      }
    }
  }

  // Function to download report
  const downloadReport = () => {
    if (reportUrls.downloadUrl) {
      const apiBaseUrl = getApiBaseUrl();
      try {
        window.open(`${apiBaseUrl}${reportUrls.downloadUrl}`, '_blank');
      } catch (error) {
        console.error('❌ Failed to download report:', error);
        
        // Create a direct link as fallback
        const link = document.createElement('a');
        link.href = `${apiBaseUrl}${reportUrls.downloadUrl}`;
        link.download = `comparison-report.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Design & Web Extraction</h2>
          <p className="text-gray-600">Extract design elements from Figma and web implementations</p>
          <div className="mt-2 p-3 bg-yellow-50 rounded-lg inline-block">
            <p className="text-sm text-yellow-700">
              <InformationCircleIcon className="inline-block w-5 h-5 mr-1 -mt-0.5" />
              Comparison feature is disabled in this version. Only extraction data will be shown.
            </p>
          </div>
        </div>
        
        {/* Main Form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Figma Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="card"
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <DocumentTextIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Figma Design</h3>
                <p className="text-sm text-gray-500">Paste your Figma file or frame URL</p>
              </div>
            </div>

            {/* Figma URL Input */}
            <div className="mb-4">
              <label htmlFor="figmaUrl" className="block text-sm font-medium text-gray-700 mb-1">
                Figma URL
              </label>
              <Controller
                name="figmaUrl"
                control={control}
                rules={{ 
                  required: 'Figma URL is required',
                  pattern: {
                    value: /^https:\/\/www\.figma\.com\/(file|design|proto)\/[a-zA-Z0-9-]+\//,
                    message: 'Please enter a valid Figma URL'
                  }
                }}
                render={({ field }) => (
                  <input
                    {...field}
                    type="url"
                    id="figmaUrl"
                    placeholder="https://www.figma.com/file/..."
                    className={`input-field ${errors.figmaUrl ? 'border-red-300' : ''}`}
                    disabled={comparisonMutation.isPending}
                  />
                )}
              />
              {errors.figmaUrl && (
                <p className="mt-1 text-xs text-red-600">{errors.figmaUrl.message}</p>
              )}
              {figmaUrlError && (
                <p className="mt-1 text-xs text-red-600">{figmaUrlError}</p>
              )}
            </div>

            {/* Figma Extraction Mode */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <AdjustmentsHorizontalIcon className="w-5 h-5 mr-1" />
                Extraction Mode
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Controller
                  name="extractionMode"
                  control={control}
                  render={({ field }) => (
                    <>
                      <div 
                        className={`p-3 border rounded-lg cursor-pointer ${field.value === 'frame-only' ? 'bg-purple-50 border-purple-300' : 'bg-white border-gray-200'}`}
                        onClick={() => field.onChange('frame-only')}
                      >
                        <div className="flex items-center">
                          <input
                            type="radio"
                            id="frame-only"
                            checked={field.value === 'frame-only'}
                            onChange={() => field.onChange('frame-only')}
                            className="h-4 w-4 text-purple-600 border-gray-300"
                            disabled={comparisonMutation.isPending}
                          />
                          <label htmlFor="frame-only" className="ml-2 block text-sm font-medium text-gray-700 cursor-pointer">
                            Frame Only
                          </label>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Extract only elements from the selected frame
                        </p>
                      </div>
                      
                      <div 
                        className={`p-3 border rounded-lg cursor-pointer ${field.value === 'global-styles' ? 'bg-purple-50 border-purple-300' : 'bg-white border-gray-200'}`}
                        onClick={() => field.onChange('global-styles')}
                      >
                        <div className="flex items-center">
                          <input
                            type="radio"
                            id="global-styles"
                            checked={field.value === 'global-styles'}
                            onChange={() => field.onChange('global-styles')}
                            className="h-4 w-4 text-purple-600 border-gray-300"
                            disabled={comparisonMutation.isPending}
                          />
                          <label htmlFor="global-styles" className="ml-2 block text-sm font-medium text-gray-700 cursor-pointer">
                            Global Styles
                          </label>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Extract all global styles from the file
                        </p>
                      </div>
                      
                      <div 
                        className={`p-3 border rounded-lg cursor-pointer ${field.value === 'both' ? 'bg-purple-50 border-purple-300' : 'bg-white border-gray-200'}`}
                        onClick={() => field.onChange('both')}
                      >
                        <div className="flex items-center">
                          <input
                            type="radio"
                            id="both"
                            checked={field.value === 'both'}
                            onChange={() => field.onChange('both')}
                            className="h-4 w-4 text-purple-600 border-gray-300"
                            disabled={comparisonMutation.isPending}
                          />
                          <label htmlFor="both" className="ml-2 block text-sm font-medium text-gray-700 cursor-pointer">
                            Both
                          </label>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Extract both frame elements and global styles
                        </p>
                      </div>
                    </>
                  )}
                />
              </div>
            </div>
          </motion.div>

          {/* Web Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="card"
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <GlobeAltIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Web Implementation</h3>
                <p className="text-sm text-gray-500">Enter the live website URL</p>
              </div>
            </div>

            <Controller
              name="webUrl"
              control={control}
              rules={{
                required: 'Web URL is required',
                pattern: {
                  value: /^https?:\/\/.+/,
                  message: 'Please enter a valid URL'
                }
              }}
              render={({ field }) => (
                <div>
                  <input
                    {...field}
                    type="url"
                    placeholder=""
                    className={`input-field ${errors.webUrl ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                  />
                  {errors.webUrl && (
                    <p className="mt-1 text-sm text-red-600">{errors.webUrl.message}</p>
                  )}
                </div>
              )}
            />

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CSS Selector (Optional)
              </label>
              <Controller
                name="webSelector"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    placeholder=""
                    className="input-field"
                  />
                )}
              />
              <p className="mt-1 text-xs text-gray-500">
                Specify a CSS selector to focus on specific elements
              </p>
            </div>

            {webUrl && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 p-3 bg-blue-50 rounded-lg"
              >
                <p className="text-sm text-blue-700">
                  ✓ Valid web URL detected
                </p>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Advanced Options */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="card"
        >
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <CogIcon className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Advanced Options</h3>
                <p className="text-sm text-gray-500">Authentication, visual comparison settings</p>
              </div>
            </div>
            <motion.div
              animate={{ rotate: showAdvanced ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </motion.div>
          </button>

          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-6 space-y-6"
              >
                {/* Authentication */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Authentication Required?
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { value: 'none', label: 'None', desc: 'Public page' },
                      { value: 'credentials', label: 'Login', desc: 'Username/Password' },
                      { value: 'cookies', label: 'Cookies', desc: 'Session cookies' },
                      { value: 'headers', label: 'Headers', desc: 'Custom headers' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setAuthType(option.value as any)}
                        className={`p-3 rounded-lg border text-left transition-colors ${
                          authType === option.value
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium text-sm">{option.label}</div>
                        <div className="text-xs text-gray-500">{option.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Authentication Details */}
                {authType === 'credentials' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Login URL
                      </label>
                      <Controller
                        name="authentication.loginUrl"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="url"
                            placeholder=""
                            className="input-field"
                          />
                        )}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Success Indicator
                      </label>
                      <Controller
                        name="authentication.successIndicator"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="text"
                            placeholder=""
                            className="input-field"
                          />
                        )}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Username
                      </label>
                      <Controller
                        name="authentication.username"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="text"
                            placeholder=""
                            className="input-field"
                          />
                        )}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password
                      </label>
                      <Controller
                        name="authentication.password"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="password"
                            placeholder=""
                            className="input-field"
                          />
                        )}
                      />
                    </div>
                  </motion.div>
                )}

                {/* Visual Comparison Options */}
                <div>
                  <label className="flex items-center space-x-3">
                    <Controller
                      name="includeVisual"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                      )}
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">
                        Include Visual Comparison
                      </span>
                      <p className="text-xs text-gray-500">
                        Generate pixel-perfect visual diff images
                      </p>
                    </div>
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Progress Indicator */}
        <AnimatePresence>
          {progressStages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="card"
            >
              <ProgressIndicator
                stages={progressStages}
                currentStage={currentStage}
                error={comparisonMutation.isError}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <button
            type="button"
            onClick={() => reset()}
            className="btn-secondary flex items-center justify-center space-x-2"
            disabled={comparisonMutation.isPending}
          >
            <XMarkIcon className="w-5 h-5" />
            <span>Reset Form</span>
          </button>

          <button
            type="submit"
            disabled={comparisonMutation.isPending || !figmaUrl || !webUrl}
            className="btn-primary flex items-center justify-center space-x-2 min-w-[200px]"
          >
            {comparisonMutation.isPending ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Extracting Data...</span>
              </>
            ) : (
              <>
                <PlayIcon className="w-5 h-5" />
                <span>Extract Design & Web Data</span>
              </>
            )}
          </button>
        </motion.div>

        {/* Final Status Messages */}
        <AnimatePresence>
          {comparisonMutation.isError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg"
            >
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-red-800">Extraction Failed</h4>
                <p className="text-sm text-red-600">
                  {comparisonMutation.error instanceof Error 
                    ? comparisonMutation.error.message 
                    : 'An unexpected error occurred'}
                </p>
              </div>
            </motion.div>
          )}

          {comparisonMutation.isSuccess && !progressStages.some(stage => stage.error) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg"
            >
              <CheckCircleIcon className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium text-green-800">Extraction Complete!</h4>
                <p className="text-sm text-green-600">
                  Your design and web data has been extracted successfully.
                  {reportOpenAttempts > 0 && (
                    <span className="block mt-1 text-amber-600">
                      <InformationCircleIcon className="inline-block w-4 h-4 mr-1 -mt-0.5" />
                      The report may have been blocked by your browser's popup blocker.
                    </span>
                  )}
                  {reportUrls.hasError && (
                    <span className="block mt-1 text-amber-600">
                      <ExclamationTriangleIcon className="inline-block w-4 h-4 mr-1 -mt-0.5" />
                      The report was generated with some errors. Please check the report for details.
                    </span>
                  )}
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={openReportInNewTab}
                  className="btn-primary btn-sm"
                >
                  View Report
                </button>
                <button
                  type="button"
                  onClick={downloadReport}
                  className="btn-secondary btn-sm"
                >
                  Download
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  )
} 