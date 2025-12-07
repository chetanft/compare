import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { extractFigmaOnly, extractWebOnly, FigmaOnlyResponse, WebOnlyResponse } from '../../services/api';
import { AuthenticationConfig } from '../../types';
import {
  DocumentTextIcon,
  GlobeAltIcon,
  ArrowPathIcon,
  LockClosedIcon,
  InformationCircleIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { PAGE_CONTENT, FORM_CONTENT, EXTRACTION_MODES, BUTTON_LABELS } from '../../constants/content';
import { toast } from '../../utils/toast';
import { cn } from '@/lib/utils';

interface SingleSourceFormProps {
  onFigmaSuccess?: (data: FigmaOnlyResponse['data']) => void;
  onWebSuccess?: (data: WebOnlyResponse['data']) => void;
}

interface SingleSourceRequest {
  extractionType: 'figma' | 'web';
  figmaUrl: string;
  extractionMode: 'frame-only' | 'global-styles' | 'both';
  webUrl: string;
  webSelector?: string;
  authentication?: AuthenticationConfig;
}

export default function SingleSourceForm({ onFigmaSuccess, onWebSuccess }: SingleSourceFormProps) {
  const [extractionType, setExtractionType] = useState<'figma' | 'web'>('figma');
  const [showAuth, setShowAuth] = useState(false);
  const [authType, setAuthType] = useState<'none' | 'credentials'>('none');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const { control, handleSubmit, watch, formState: { errors }, reset } = useForm<SingleSourceRequest>({
    defaultValues: {
      extractionType: 'figma',
      figmaUrl: '',
      extractionMode: 'both',
      webUrl: '',
      webSelector: '',
      authentication: {
        type: 'credentials',
        loginUrl: '',
        username: '',
        password: '',
        waitTime: 3000,
        successIndicator: ''
      }
    }
  });

  const describeRequestError = (error: unknown): string => {
    if (!error) return 'Extraction failed for an unknown reason.';

    if (typeof error === 'string') return error;

    if (error instanceof Error) {
      if (/network error/i.test(error.message)) {
        return 'Unable to reach the extraction server. Ensure the backend on port 3847 is running.';
      }
      if (/timeout/i.test(error.message) || /timed out/i.test(error.message)) {
        return 'The extraction request timed out. Try again after increasing the timeout in Settings.';
      }
      return error.message;
    }

    const apiError = error as { message?: string; status?: number; code?: string; details?: string };

    switch (apiError.status) {
      case 401:
      case 403:
        return 'Authentication failed. Verify your Figma token or provided web credentials.';
      case 404:
        return 'Requested endpoint not found. Update to the latest server build and retry.';
      case 429:
        return 'Too many extraction requests. Wait a few moments before retrying.';
      case 500:
        return 'The server encountered an error during extraction. Check server logs for details.';
      default:
        break;
    }

    if (apiError.message) {
      return apiError.message;
    }

    return 'Extraction failed due to an unexpected server response.';
  };
  
  const figmaMutation = useMutation({
    mutationFn: async (data: { figmaUrl: string, extractionMode: 'frame-only' | 'global-styles' | 'both' }) => {
      console.log('Submitting Figma extraction request:', data.figmaUrl, 'Mode:', data.extractionMode);
      
      return await extractFigmaOnly({
        figmaUrl: data.figmaUrl,
        extractionMode: data.extractionMode
      });
    },
    onSuccess: (data) => {
      console.log('Figma extraction successful, data received:', {
        componentCount: data.metadata?.totalComponents || data.components?.length || 0,
        colorCount: data.metadata?.colorCount || data.colors?.length || 0,
        typographyCount: data.metadata?.typographyCount || data.typography?.length || 0,
        actualColorsCount: data.colors?.length || 0,
        dataStructure: Object.keys(data || {})
      });
      setErrorMessage(null);
      
      // Validate data before passing to parent
      if (!data || typeof data !== 'object') {
        console.error('Invalid Figma data structure received:', data);
        toast({
          title: 'Data Error',
          description: 'Received invalid data structure from server',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        setErrorMessage('Received invalid data structure from server.');
        return;
      }
      
      // Pass the data to parent component
      onFigmaSuccess?.(data);
      
      // Don't reset form after success to keep the URL visible
      // User can manually clear if needed
    },
    onError: (error: any) => {
      console.error('Figma extraction failed:', error);
      const friendlyMessage = describeRequestError(error);
      setErrorMessage(friendlyMessage);

      toast({
        title: 'Extraction Failed',
        description: friendlyMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  });
  
  const webMutation = useMutation({
    mutationFn: async (data: { 
      webUrl: string, 
      webSelector?: string,
      authentication?: AuthenticationConfig 
    }) => {
      return await extractWebOnly(
        data.webUrl, 
        data.webSelector,
        data.authentication
      );
    },
    onSuccess: (data) => {
      setErrorMessage(null);
      onWebSuccess?.(data);
    },
    onError: (error: any) => {
      console.error('Web extraction failed:', error);
      const friendlyMessage = describeRequestError(error);
      setErrorMessage(friendlyMessage);
      toast({
        title: 'Extraction Failed',
        description: friendlyMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  });
  
  // Handle extraction type change
  const handleExtractionTypeChange = (type: 'figma' | 'web') => {
    // Clear previous form state
    reset({
      extractionType: type,
      figmaUrl: '',
      extractionMode: 'both',
      webUrl: '',
      webSelector: '',
      authentication: {
        type: 'credentials',
        loginUrl: '',
        username: '',
        password: '',
        waitTime: 3000,
        successIndicator: ''
      }
    });
    
    setExtractionType(type);
    setShowAuth(false);
    setAuthType('none');
    setErrorMessage(null);
  };
  
  const onSubmit = (data: SingleSourceRequest) => {
    setErrorMessage(null);
    if (extractionType === 'figma' && data.figmaUrl) {
      figmaMutation.mutate({ 
        figmaUrl: data.figmaUrl,
        extractionMode: data.extractionMode
      });
    } else if (extractionType === 'web' && data.webUrl) {
      // Only include authentication if it's enabled
      const auth: AuthenticationConfig | undefined = authType === 'none' ? undefined : {
        ...data.authentication,
        type: authType as AuthenticationConfig['type'] // Use the selected auth type
      };
      
      webMutation.mutate({ 
        webUrl: data.webUrl,
        webSelector: data.webSelector,
        authentication: auth
      });
    }
  };
  
  const isLoading = figmaMutation.isPending || webMutation.isPending;
  
  return (
    <div className="w-full">
      {errorMessage && (
        <Alert variant="destructive" className="mb-6">
          <InformationCircleIcon className="h-4 w-4" />
          <AlertDescription>
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}
      
      <Tabs value={extractionType} onValueChange={(value) => handleExtractionTypeChange(value as 'figma' | 'web')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="figma" className="flex items-center space-x-2">
            <DocumentTextIcon className="w-4 h-4" />
            <span>{PAGE_CONTENT.SINGLE_SOURCE.figma.title}</span>
          </TabsTrigger>
          <TabsTrigger value="web" className="flex items-center space-x-2">
            <GlobeAltIcon className="w-4 h-4" />
            <span>{PAGE_CONTENT.SINGLE_SOURCE.web.title}</span>
          </TabsTrigger>
        </TabsList>
        
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6">
        
        {/* Figma Form */}
        {extractionType === 'figma' && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Figma Design</h3>
            <Controller
              name="figmaUrl"
              control={control}
              rules={{
                required: 'Figma URL is required',
                pattern: {
                  value: /^https:\/\/www\.figma\.com\/(file|design)\/[a-zA-Z0-9-]+\//,
                  message: 'Please enter a valid Figma URL'
                }
              }}
              render={({ field }) => (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Figma URL
                  </label>
                  <input
                    {...field}
                    type="url"
                    placeholder="Enter Figma URL"
                    className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${errors.figmaUrl ? 'border-destructive focus-visible:ring-destructive' : 'border-input bg-background'}`}
                    disabled={isLoading}
                  />
                  {errors.figmaUrl && (
                    <p className="mt-1 text-sm text-red-600">{errors.figmaUrl.message}</p>
                  )}
                </div>
              )}
            />
            
            {/* Extraction Mode Selection */}
            <div className="mt-4">
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
                        className={`p-3 border rounded-lg cursor-pointer ${field.value === 'frame-only' ? 'bg-purple-50 border-purple-300' : 'bg-card border-gray-200'}`}
                        onClick={() => field.onChange('frame-only')}
                      >
                        <div className="flex items-center">
                          <input
                            type="radio"
                            id="frame-only"
                            checked={field.value === 'frame-only'}
                            onChange={() => field.onChange('frame-only')}
                            className="h-4 w-4 text-purple-600 border-gray-300"
                          />
                          <label htmlFor="frame-only" className="ml-2 block text-sm font-medium text-gray-700 cursor-pointer">
                            Frame Only
                          </label>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Extract only elements from the selected frame
                        </p>
                      </div>
                      
                      <div 
                        className={`p-3 border rounded-lg cursor-pointer ${field.value === 'global-styles' ? 'bg-purple-50 border-purple-300' : 'bg-card border-gray-200'}`}
                        onClick={() => field.onChange('global-styles')}
                      >
                        <div className="flex items-center">
                          <input
                            type="radio"
                            id="global-styles"
                            checked={field.value === 'global-styles'}
                            onChange={() => field.onChange('global-styles')}
                            className="h-4 w-4 text-purple-600 border-gray-300"
                          />
                          <label htmlFor="global-styles" className="ml-2 block text-sm font-medium text-gray-700 cursor-pointer">
                            Global Styles
                          </label>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Extract all global styles from the file
                        </p>
                      </div>
                      
                      <div 
                        className={`p-3 border rounded-lg cursor-pointer ${field.value === 'both' ? 'bg-purple-50 border-purple-300' : 'bg-card border-gray-200'}`}
                        onClick={() => field.onChange('both')}
                      >
                        <div className="flex items-center">
                          <input
                            type="radio"
                            id="both"
                            checked={field.value === 'both'}
                            onChange={() => field.onChange('both')}
                            className="h-4 w-4 text-purple-600 border-gray-300"
                          />
                          <label htmlFor="both" className="ml-2 block text-sm font-medium text-gray-700 cursor-pointer">
                            Both
                          </label>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Extract both frame elements and global styles
                        </p>
                      </div>
                    </>
                  )}
                />
              </div>
            </div>
            
            {!figmaMutation.isSuccess && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-700">
                  <InformationCircleIcon className="inline-block w-5 h-5 mr-1 -mt-0.5" />
                  Make sure your Figma file is accessible with your API token.
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* Web Form */}
        {extractionType === 'web' && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Web Implementation</h3>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Web URL
                  </label>
                  <input
                    {...field}
                    type="url"
                    placeholder="Enter website URL"
                    className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${errors.webUrl ? 'border-destructive focus-visible:ring-destructive' : 'border-input bg-background'}`}
                    disabled={isLoading}
                  />
                  {errors.webUrl && (
                    <p className="mt-1 text-sm text-red-600">{errors.webUrl.message}</p>
                  )}
                </div>
              )}
            />
            
            <div className="mt-4">
              <Controller
                name="webSelector"
                control={control}
                render={({ field }) => (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CSS Selector (Optional)
                    </label>
                    <input
                      {...field}
                      type="text"
                      placeholder="Enter CSS selectors"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isLoading}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Specify CSS selectors to focus on specific elements
                    </p>
                  </div>
                )}
              />
            </div>
            
            {/* Authentication Toggle */}
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 rounded"
                    checked={showAuth}
                    onChange={() => setShowAuth(!showAuth)}
                    disabled={isLoading}
                  />
                  <span className="ml-2 text-sm">Authentication Required</span>
                </label>
                
                {showAuth && (
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      className={`px-3 py-1 text-xs rounded ${
                        authType === 'credentials' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'
                      }`}
                      onClick={() => setAuthType('credentials')}
                      disabled={isLoading}
                    >
                      <LockClosedIcon className="w-3 h-3 inline-block mr-1" />
                      Login Credentials
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-1 text-xs rounded ${
                        authType === 'none' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'
                      }`}
                      onClick={() => setAuthType('none')}
                      disabled={isLoading}
                    >
                      None
                    </button>
                  </div>
                )}
              </div>
              
              {/* Authentication Fields */}
              {showAuth && authType === 'credentials' && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-4">
                  <Controller
                    name="authentication.loginUrl"
                    control={control}
                    rules={{
                      required: showAuth ? 'Login URL is required' : false,
                    }}
                    render={({ field }) => (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Login URL
                        </label>
                        <input
                          {...field}
                          type="url"
                          placeholder="Enter login page URL"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={isLoading}
                        />
                      </div>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Controller
                      name="authentication.username"
                      control={control}
                      rules={{
                        required: showAuth ? 'Username is required' : false,
                      }}
                      render={({ field }) => (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Username
                          </label>
                          <input
                            {...field}
                            type="text"
                            placeholder="Username"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={isLoading}
                          />
                        </div>
                      )}
                    />
                    
                    <Controller
                      name="authentication.password"
                      control={control}
                      rules={{
                        required: showAuth ? 'Password is required' : false,
                      }}
                      render={({ field }) => (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Password
                          </label>
                          <input
                            {...field}
                            type="password"
                            placeholder="••••••••"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={isLoading}
                          />
                        </div>
                      )}
                    />
                  </div>
                  
                  <Controller
                    name="authentication.successIndicator"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Success Indicator (Optional)
                        </label>
                        <input
                          {...field}
                          type="text"
                          placeholder="CSS selector for successful login"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={isLoading}
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          CSS selector that indicates successful login
                        </p>
                      </div>
                    )}
                  />
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Submit Button */}
        <div className="flex justify-center pt-6 border-t">
          <Button
            type="submit"
            disabled={isLoading}
            className="px-8 py-3 flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                <span>Extracting...</span>
              </>
            ) : (
              <span>{BUTTON_LABELS.extractData}</span>
            )}
          </Button>
        </div>
        </form>
      </Tabs>
    </div>
  );
}