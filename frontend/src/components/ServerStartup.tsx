import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Loader2, Server, CheckCircle, XCircle, Play } from 'lucide-react';
import { getServerPort } from '../config/ports';
import TerminalProgress from './ui/TerminalProgress';

interface ServerStartupProps {
  onServerReady: () => void;
}

export const ServerStartup: React.FC<ServerStartupProps> = ({ onServerReady }) => {
  const [serverStatus, setServerStatus] = useState<'stopped' | 'starting' | 'running' | 'error'>('stopped');
  const [serverPort] = useState(getServerPort());
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showTerminal, setShowTerminal] = useState(false);

  const checkServerHealth = async (): Promise<boolean> => {
    try {
      const response = await fetch(`http://localhost:${serverPort}/api/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  const startServer = async () => {
    setServerStatus('starting');
    setErrorMessage('');
    setShowTerminal(true);
    
    try {
      // In a real implementation, this would trigger server startup
      // For now, we'll simulate the startup process
      
      // Wait for server to start (polling approach)
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout
      
      while (attempts < maxAttempts) {
        const isHealthy = await checkServerHealth();
        if (isHealthy) {
          setServerStatus('running');
          // Keep terminal visible for a moment before transitioning
          setTimeout(() => {
            setShowTerminal(false);
            onServerReady();
          }, 2000);
          return;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
      
      throw new Error('Server failed to start within timeout period');
      
    } catch (error) {
      setServerStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
      setShowTerminal(false);
    }
  };

  // Check if server is already running on component mount
  useEffect(() => {
    checkServerHealth().then(isRunning => {
      if (isRunning) {
        setServerStatus('running');
        // Always show terminal UI for better UX, even when server is already running
        setShowTerminal(true);
        // Keep terminal visible longer to show startup sequence
        setTimeout(() => {
          setShowTerminal(false);
          onServerReady();
        }, 3500); // Show terminal for 3.5 seconds
      } else {
        // Server not running, show stopped state initially
        setServerStatus('stopped');
      }
    });
  }, [onServerReady]);

  const getStatusBadge = () => {
    switch (serverStatus) {
      case 'stopped':
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Stopped</Badge>;
      case 'starting':
        return <Badge variant="outline"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Starting...</Badge>;
      case 'running':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Running</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Error</Badge>;
    }
  };

  if (serverStatus === 'running' && !showTerminal) {
    return null; // Only hide when server is running AND terminal is not showing
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      {showTerminal ? (
        <TerminalProgress 
          isVisible={showTerminal} 
          onComplete={() => {
            // Auto-transition to main app after terminal completes
            setTimeout(() => {
              setShowTerminal(false);
              onServerReady();
            }, 1500);
          }} 
        />
      ) : (
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
              <Server className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Figma Comparison Tool</CardTitle>
            <CardDescription>
              Start the local server to begin using the application
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-sm">Server Status</p>
                <p className="text-xs text-gray-500">Port: {serverPort}</p>
              </div>
              {getStatusBadge()}
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{errorMessage}</p>
              </div>
            )}

            <div className="space-y-3">
              <Button 
                onClick={startServer}
                disabled={serverStatus === 'starting'}
                className="w-full"
                size="lg"
              >
                {serverStatus === 'starting' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Starting Server...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Server
                  </>
                )}
              </Button>
              
              <p className="text-xs text-center text-gray-500">
                This will start the local server on port {serverPort}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
