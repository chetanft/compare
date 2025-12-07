import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { compareUrls } from '../../services/api'
import { getApiBaseUrl } from '../../utils/environment'
import ProgressIndicator, { ProgressStage } from '../ui/ProgressIndicator'
import { useAuth } from '../../contexts/AuthContext'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DocumentTextIcon,
  GlobeAltIcon,
  CogIcon,
  PlayIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  InformationCircleIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline'
import { ComparisonRequest, ComparisonResult } from '../../types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

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
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null)
  const [savedCredentials, setSavedCredentials] = useState<Array<{ id: string; name: string; url: string }>>([])
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>('')
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()

  const { control, handleSubmit, watch, formState: { errors }, reset, setValue } = useForm<ComparisonRequest & { extractionMode: 'frame-only' | 'global-styles' | 'both' }>({
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

  // Load saved credentials when credentials auth type is selected or user changes
  useEffect(() => {
    if (authType === 'credentials') {
      loadCredentials()
    }
  }, [authType, user])

  const loadCredentials = async () => {
    try {
      const apiBaseUrl = getApiBaseUrl()
      const headers: HeadersInit = {}
      
      // Try to get auth token if user is signed in and Supabase is available
      if (user) {
        try {
          const { supabase } = await import('../../lib/supabase')
          if (supabase) {
            const session = await supabase.auth.getSession()
            if (session?.data.session?.access_token) {
              headers['Authorization'] = `Bearer ${session.data.session.access_token}`
            }
          }
        } catch (e) {
          // Supabase not available, continue without auth header
        }
      }
      
      // Load credentials (works with or without auth for local storage)
      const response = await fetch(`${apiBaseUrl}/api/credentials`, { headers })
      
      if (response.ok) {
        const result = await response.json()
        setSavedCredentials(result.data || [])
      }
    } catch (error) {
      console.error('Failed to load credentials:', error)
      // Silently fail - local mode may not have credentials yet
    }
  }

  const handleCredentialSelect = async (credentialId: string) => {
    setSelectedCredentialId(credentialId)
    
    if (!credentialId) {
      // Clear form if "None" selected
      setValue('authentication.username', '')
      setValue('authentication.password', '')
      return
    }
    
    try {
      const apiBaseUrl = getApiBaseUrl()
      const headers: HeadersInit = {}
      
      // Try to get auth token if user is signed in (optional for local mode)
      if (user) {
        try {
          const { supabase } = await import('../../lib/supabase')
          if (supabase) {
            const session = await supabase.auth.getSession()
            if (session?.data.session?.access_token) {
              headers['Authorization'] = `Bearer ${session.data.session.access_token}`
            }
          }
        } catch (e) {
          // Supabase not available, continue without auth (local mode)
        }
      }
      
      const response = await fetch(`${apiBaseUrl}/api/credentials/${credentialId}/decrypt`, {
        headers
      })
      
      if (response.ok) {
        const result = await response.json()
        const credential = result.data
        
        // Auto-fill form fields
        setValue('authentication.username', credential.username || '')
        setValue('authentication.password', credential.password || '')
        if (credential.loginUrl) {
          setValue('authentication.loginUrl', credential.loginUrl)
        }
        if (credential.url) {
          setValue('webUrl', credential.url)
        }
        
        toast({
          title: 'Credential loaded',
          description: `Loaded credentials for ${credential.name || credential.id || 'selected credential'}`
        })
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to load credential')
      }
    } catch (error) {
      toast({
        title: 'Failed to load credential',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    }
  }

  const describeError = (error: unknown): string => {
    if (!error) {
      return 'Extraction failed for an unknown reason.'
    }

    if (typeof error === 'string') {
      return error
    }

    if (error instanceof Error) {
      if (/network error/i.test(error.message)) {
        return 'Unable to reach the comparison server. Confirm it is running on port 3847 and retry.'
      }
      if (/timeout/i.test(error.message) || /timed out/i.test(error.message)) {
        return 'The comparison request timed out. Increase the timeout in Settings or try again with a smaller scope.'
      }
      return error.message
    }

    const apiError = error as { message?: string; status?: number; code?: string; details?: string }

    if (apiError.code === 'ABORT_TIMEOUT') {
      return 'The request was aborted after the configured timeout. Adjust timeout settings or retry with fewer steps.'
    }

    switch (apiError.status) {
      case 401:
      case 403:
        return 'Authentication failed. Check your Figma token and any web credentials configured in Settings.'
      case 404:
        return 'The /api/compare endpoint is unavailable. Verify the backend is running the latest build.'
      case 429:
        return 'Too many requests in a short period. Wait a moment before running another comparison.'
      case 500:
        return 'The server encountered an error while processing the comparison. Review server logs for details.'
      default:
        break
    }

    if (apiError.message) {
      if (/network/i.test(apiError.message)) {
        return 'Network connection failed while contacting the comparison server.'
      }
      return apiError.message
    }

    return 'Extraction failed due to an unexpected server response.'
  }

  const comparisonMutation = useMutation({
    mutationFn: async (data: ComparisonRequest & { extractionMode: 'frame-only' | 'global-styles' | 'both' }) => {
      try {
        // Initialize progress stages
        setProgressStages([
          { stage: 'validation', label: 'Validating URLs', progress: 0 },
          { stage: 'figma-extraction', label: 'Extracting Figma Data', progress: 0 },
          { stage: 'web-extraction', label: 'Extracting Web Data', progress: 0 },
          { stage: 'comparison', label: 'Comparing Data', progress: 0 }
        ]);
        setCurrentStage('validation');

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
        
        // Update progress: validation complete
        setProgressStages(prev => prev.map(stage => 
          stage.stage === 'validation' 
            ? { ...stage, progress: 100 }
            : stage
        ));
        setCurrentStage('figma-extraction');
        
        // Use the compareUrls function from the API service
        const result = await compareUrls(payload);
        
        // Update progress: extraction complete
        setProgressStages(prev => prev.map(stage => 
          stage.stage === 'comparison' 
            ? { ...stage, progress: 100 }
            : stage
        ));
        
        // The API now returns the comparison result directly
        const comparisonResult = result as ComparisonResult;
        
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
      
      // Debug the result structure before passing to parent
      console.log('🔍 ComparisonForm: Raw result structure:', JSON.stringify(result, null, 2));
      console.log('🔍 ComparisonForm: result.data exists?', !!result.data);
      console.log('🔍 ComparisonForm: result.extractionDetails exists?', !!result.extractionDetails);
      console.log('🔍 ComparisonForm: result.data?.extractionDetails exists?', !!result.data?.extractionDetails);
      
      onSuccess?.(result);
      setLastErrorMessage(null)
    },
    onError: (error: unknown) => {
      console.error('❌ Comparison mutation failed:', error);

      const errorMessage = describeError(error);
      const comparisonError = error as ComparisonError;

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
                details: comparisonError?.code ? `Error code: ${comparisonError.code}` : undefined
              }
            : stage
        );
      });

      setLastErrorMessage(errorMessage);

      toast({
        title: 'Extraction failed',
        description: errorMessage,
        variant: 'destructive'
      });

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
    setLastErrorMessage(null)
    comparisonMutation.mutate(data);
  }

  const figmaUrl = watch('figmaUrl')
  const webUrl = watch('webUrl')
  const isSubmitDisabled =
    comparisonMutation.isPending || !figmaUrl?.trim() || !webUrl?.trim()

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

  const handleConfirmReset = () => {
    reset()
    setShowAdvanced(false)
    setAuthType('none')
    setProgressStages([])
    setCurrentStage('')
    setReportUrls({})
    setReportOpenAttempts(0)
    setFigmaUrlError(null)
    comparisonMutation.reset()
    setResetDialogOpen(false)
  }

  return (
    <div className="w-full">
      <div className="mb-8 text-center">
        <Alert className="max-w-2xl mx-auto">
          <InformationCircleIcon className="h-4 w-4" />
          <AlertDescription>
            Comparison feature is disabled in this version. Only extraction data will be shown.
          </AlertDescription>
        </Alert>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="form-standard">
        
        {/* Main Form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
          {/* Figma Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                    <DocumentTextIcon className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Figma Design</CardTitle>
                    <CardDescription>Paste your Figma file or frame URL</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* Figma URL Input */}
                <div className="space-y-2">
                  <Label htmlFor="figmaUrl">Figma URL</Label>
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
                      <Input
                        {...field}
                        type="url"
                        id="figmaUrl"
                        placeholder="https://www.figma.com/file/..."
                        className={cn(errors.figmaUrl && 'border-destructive focus-visible:ring-destructive')}
                        disabled={comparisonMutation.isPending}
                      />
                    )}
                  />
                  {errors.figmaUrl && (
                    <p className="text-xs text-destructive">{errors.figmaUrl.message}</p>
                  )}
                  {figmaUrlError && (
                    <p className="text-xs text-destructive">{figmaUrlError}</p>
                  )}
                </div>

                {/* Figma Extraction Mode */}
                <div className="space-y-3">
                  <Label className="flex items-center text-sm font-medium">
                    <AdjustmentsHorizontalIcon className="w-5 h-5 mr-1" />
                    Extraction Mode
                  </Label>
                  <Controller
                    name="extractionMode"
                    control={control}
                    render={({ field }) => (
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={comparisonMutation.isPending}
                        className="grid grid-cols-1 gap-4"
                      >
                        <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                          <RadioGroupItem value="frame-only" id="frame-only" className="mt-1" />
                          <div className="flex-1 space-y-1">
                            <Label htmlFor="frame-only" className="text-base font-medium cursor-pointer">
                              Frame Only
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              Extract only elements from the selected frame
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                          <RadioGroupItem value="global-styles" id="global-styles" className="mt-1" />
                          <div className="flex-1 space-y-1">
                            <Label htmlFor="global-styles" className="text-base font-medium cursor-pointer">
                              Global Styles
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              Extract all global styles from the file
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                          <RadioGroupItem value="both" id="both" className="mt-1" />
                          <div className="flex-1 space-y-1">
                            <Label htmlFor="both" className="text-base font-medium cursor-pointer">
                              Both
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              Extract both frame elements and global styles
                            </p>
                          </div>
                        </div>
                      </RadioGroup>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Web Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <GlobeAltIcon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Web Implementation</CardTitle>
                    <CardDescription>Enter the live website URL</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="webUrl">Web URL</Label>
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
                      <Input
                        {...field}
                        type="url"
                        id="webUrl"
                        placeholder="https://example.com"
                        className={cn(errors.webUrl && 'border-destructive focus-visible:ring-destructive')}
                        disabled={comparisonMutation.isPending}
                      />
                    )}
                  />
                  {errors.webUrl && (
                    <p className="text-xs text-destructive">{errors.webUrl.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="webSelector">CSS Selector (Optional)</Label>
                  <Controller
                    name="webSelector"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="text"
                        id="webSelector"
                        placeholder="e.g., .main-content, #hero-section"
                        disabled={comparisonMutation.isPending}
                      />
                    )}
                  />
                  <p className="text-xs text-muted-foreground">
                    Specify a CSS selector to focus on specific elements
                  </p>
                </div>

                {webUrl && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                  >
                    <Alert>
                      <CheckCircleIcon className="h-4 w-4" />
                      <AlertDescription>
                        Valid web URL detected
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Advanced Options */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="rounded-xl border bg-card text-card-foreground shadow p-6"
        >
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full text-left p-4 rounded-lg border bg-background hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                <CogIcon className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Advanced Options</h3>
                <p className="text-sm text-muted-foreground">Authentication, visual comparison settings</p>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
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
                        className={`p-3 rounded-lg border text-left transition-colors w-full ${
                          authType === option.value
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-border hover:border-border/80'
                        }`}
                      >
                        <div className="font-medium text-sm">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Authentication Details */}
                {authType === 'credentials' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {/* Saved Credentials Selector */}
                    {savedCredentials.length > 0 && (
                      <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                        <Label>Use Saved Credential</Label>
                        <Select value={selectedCredentialId} onValueChange={handleCredentialSelect}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a saved credential (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">None (enter manually)</SelectItem>
                            {savedCredentials.map((cred) => (
                              <SelectItem key={cred.id} value={cred.id}>
                                {cred.name} - {cred.url}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Selecting a credential will auto-fill the fields below
                        </p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
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
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        )}
                      />
                    </div>
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
                      <p className="text-xs text-muted-foreground">
                        Generate pixel-perfect visual diff images
                      </p>
                    </div>
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Submit Section */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6 border-t">
          <Button
            type="button"
            onClick={() => setResetDialogOpen(true)}
            variant="outline"
            disabled={comparisonMutation.isPending}
            className="flex items-center space-x-2"
          >
            <XMarkIcon className="w-5 h-5" />
            <span>Reset Form</span>
          </Button>

          <Button
            type="submit"
            disabled={isSubmitDisabled}
            className="flex items-center space-x-2 min-w-[200px]"
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
          </Button>
        </div>

        {isSubmitDisabled && !comparisonMutation.isPending && (
          <p className="text-center text-xs text-muted-foreground mt-2">
            Enter both a Figma URL and a Web URL to enable extraction.
          </p>
        )}

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

        {/* Final Status Messages */}
        <AnimatePresence>
          {comparisonMutation.isError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg"
            >
              <ExclamationTriangleIcon className="w-6 h-6 text-destructive flex-shrink-0" />
              <div>
                <h4 className="font-medium text-destructive">Extraction Failed</h4>
                <p className="text-sm text-destructive/80">
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
              className="flex items-center space-x-3 p-4 bg-accent/10 border border-accent/20 rounded-lg"
            >
              <CheckCircleIcon className="w-6 h-6 text-accent-foreground flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium text-accent-foreground">Extraction Complete!</h4>
                <p className="text-sm text-accent-foreground/80">
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
                <Button
                  type="button"
                  onClick={openReportInNewTab}
                  size="sm"
                >
                  View Report
                </Button>
                <Button
                  type="button"
                  onClick={downloadReport}
                  variant="outline"
                  size="sm"
                >
                  Download
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset form?</DialogTitle>
            <DialogDescription>
              This will clear all entered URLs, authentication details, and progress.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmReset}>
              Reset Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 