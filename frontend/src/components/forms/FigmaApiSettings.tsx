import React, { useState } from 'react';
import { KeyIcon, CheckCircleIcon, XCircleIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { testConnection } from '../../services/api';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';interface FigmaApiSettingsProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
}

interface ConnectionStatus {
  status: 'idle' | 'testing' | 'success' | 'error';
  message?: string;
  user?: {
    id: string;
    email: string;
    handle: string;
  };
}

const FigmaApiSettings: React.FC<FigmaApiSettingsProps> = ({ value, onChange, onBlur }) => {
  const [isMasked, setIsMasked] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ status: 'idle' });
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleMask = () => {
    setIsMasked(!isMasked);
  };

  const handleTestConnection = async () => {
    if (!value || value === '••••••••') {
      setConnectionStatus({
        status: 'error',
        message: 'Please enter a valid Figma API token'
      });
      return;
    }

    setIsLoading(true);
    setConnectionStatus({ status: 'testing' });

    try {
      const result = await testConnection({ figmaPersonalAccessToken: value });
      
      if (result.success) {
        setConnectionStatus({
          status: 'success',
          message: result.message,
          user: result.user
        });
      } else {
        setConnectionStatus({
          status: 'error',
          message: result.error
        });
      }
    } catch (error) {
      setConnectionStatus({
        status: 'error',
        message: error instanceof Error ? error.message : 'Connection test failed'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-2">
        <label htmlFor="figmaApiToken" className="block text-sm font-medium text-gray-700">
          Figma Personal Access Token
        </label>
        
        <div className="relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <KeyIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
          
          <input
            type={isMasked ? 'password' : 'text'}
            id="figmaApiToken"
            className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-12 sm:text-sm border-gray-300 rounded-md"
            placeholder="figd_..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
          />
          
          <div className="absolute inset-y-0 right-0 flex items-center">
            <button
              type="button"
              onClick={handleToggleMask}
              className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {isMasked ? 'Show' : 'Hide'}
            </button>
          </div>
        </div>
        
        <p className="mt-1 text-sm text-muted-foreground">
          Create a personal access token in your Figma account settings with all required scopes.
          <a 
            href="/FIGMA_API_SETUP_GUIDE.md" 
            target="_blank" 
            rel="noopener noreferrer"
            className="ml-1 text-indigo-600 hover:text-indigo-500 inline-flex items-center"
          >
            <DocumentTextIcon className="h-4 w-4 mr-1" />
            View Setup Guide
          </a>
        </p>
      </div>

      <div className="flex items-center space-x-4">
        <button
          type="button"
          onClick={handleTestConnection}
          disabled={isLoading || !value || value === '••••••••'}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Testing...
            </>
          ) : (
            'Test Connection'
          )}
        </button>

        {connectionStatus.status === 'success' && (
          <div className="flex items-center text-green-600">
            <CheckCircleIcon className="h-5 w-5 mr-1" />
            <span>Connected</span>
          </div>
        )}

        {connectionStatus.status === 'error' && (
          <div className="flex items-center text-red-600">
            <XCircleIcon className="h-5 w-5 mr-1" />
            <span>Failed</span>
          </div>
        )}
      </div>

      {connectionStatus.status !== 'idle' && (
        <div className={`mt-2 p-3 rounded-md ${
          connectionStatus.status === 'success' ? 'bg-green-50 text-green-800' : 
          connectionStatus.status === 'error' ? 'bg-red-50 text-red-800' : 
          'bg-muted/50 text-gray-800'
        }`}>
          {connectionStatus.message && (
            <p className="text-sm font-medium">{connectionStatus.message}</p>
          )}
          
          {connectionStatus.status === 'success' && connectionStatus.user && (
            <div className="mt-2 text-sm">
              <p>Connected as: <strong>{connectionStatus.user.handle}</strong></p>
              <p className="text-xs text-muted-foreground">{connectionStatus.user.email}</p>
            </div>
          )}
          
          {connectionStatus.status === 'error' && connectionStatus.message?.includes('Invalid token') && (
            <div className="mt-2 text-sm">
              <p>The most common cause is missing required scopes. Make sure your token has <strong>ALL</strong> of the scopes listed below.</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 p-4 bg-yellow-50 rounded-md border border-yellow-200">
        <h4 className="font-medium text-yellow-800">Required Scopes:</h4>
        <ul className="list-disc list-inside mt-1 space-y-1 text-sm text-yellow-700">
          <li><strong>file_content:read</strong> - Read design files</li>
          <li><strong>file_dev_resources:read</strong> - Access development resources</li>
          <li><strong>library_assets:read</strong> - Read library usage</li>
          <li><strong>library_content:read</strong> - Access library content</li>
          <li><strong>current_user:read</strong> - Access user information</li>
        </ul>
        <p className="mt-2 text-sm text-yellow-700">
          <strong>Important:</strong> All scopes must be selected when creating your token. If any are missing, you'll need to create a new token.
        </p>
      </div>
    </div>
  );
};

export default FigmaApiSettings; 