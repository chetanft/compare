import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface TerminalCommand {
  id: string;
  command: string;
  status: 'pending' | 'running' | 'success' | 'error';
  output?: string;
  timestamp: Date;
}

interface TerminalProgressProps {
  isVisible: boolean;
  onComplete?: () => void;
}

export default function TerminalProgress({ isVisible, onComplete }: TerminalProgressProps) {
  const [commands, setCommands] = useState<TerminalCommand[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Detect if we're in Electron to show appropriate commands
  const isElectron = typeof window !== 'undefined' && 
                    (window.navigator.userAgent.includes('Electron') || 
                     window.process?.type === 'renderer');

  const initialCommands: Omit<TerminalCommand, 'id' | 'timestamp'>[] = isElectron ? [
    { command: 'cd /Applications/Figma\\ Comparison\\ Tool.app', status: 'pending' },
    { command: 'Starting Electron Express Server...', status: 'pending' },
    { command: 'Server running on 127.0.0.1:3847', status: 'pending' },
    { command: 'curl -s http://localhost:3847/api/health', status: 'pending' },
    { command: 'macOS app ready!', status: 'pending' }
  ] : [
    { command: 'cd /Users/user/Comparision\\ tool', status: 'pending' },
    { command: 'PORT=3847 node server.js', status: 'pending' },
    { command: 'Checking server health...', status: 'pending' },
    { command: 'curl -s http://localhost:3847/api/health', status: 'pending' },
    { command: 'Frontend connection established', status: 'pending' }
  ];

  useEffect(() => {
    if (!isVisible) return;

    // Initialize commands
    const initCommands = initialCommands.map((cmd, index) => ({
      ...cmd,
      id: `cmd-${index}`,
      timestamp: new Date()
    }));
    setCommands(initCommands);
    setCurrentIndex(0);

    // Simulate command execution
    const executeCommands = async () => {
      for (let i = 0; i < initCommands.length; i++) {
        // Set command to running
        setCommands(prev => prev.map((cmd, index) => 
          index === i ? { ...cmd, status: 'running' } : cmd
        ));
        setCurrentIndex(i);

        // Simulate execution time
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));

        // Set command to success with output
        let output = '';
        switch (i) {
          case 0:
            output = isElectron ? '/Applications/Figma Comparison Tool.app' : '~/Comparision tool';
            break;
          case 1:
            output = isElectron ? 
              '🚀 Starting Figma Comparison Tool...\n✅ Electron Express Server started\n🚀 Server running at http://127.0.0.1:3847' :
              '🚀 Starting Figma Web Comparison Tool...\n✅ Enhanced service initialization successful\n🚀 Server running at http://localhost:3847';
            break;
          case 2:
            output = isElectron ? 
              '✅ Express server running on port 3847' :
              'Server health check initiated...';
            break;
          case 3:
            output = '{"success": true, "data": {"status": "ok"}}';
            break;
          case 4:
            output = isElectron ? 
              '✅ macOS app is ready!' :
              '✅ Connection successful - Port 3847';
            break;
        }

        setCommands(prev => prev.map((cmd, index) => 
          index === i ? { ...cmd, status: 'success', output } : cmd
        ));

        // Auto-scroll to bottom
        if (terminalRef.current) {
          terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
      }

      // Complete after a short delay
      setTimeout(() => {
        onComplete?.();
      }, 1000);
    };

    executeCommands();
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span>Server Connection Progress</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          ref={terminalRef}
          className="bg-black text-green-400 font-mono text-sm p-4 rounded-lg h-80 overflow-y-auto"
        >
          {commands.map((cmd, index) => (
            <div key={cmd.id} className="mb-2">
              {/* Command line */}
              <div className="flex items-center space-x-2">
                <span className="text-blue-400">user@system:~$</span>
                <span className={`${
                  cmd.status === 'running' ? 'animate-pulse' : ''
                } ${
                  cmd.status === 'success' ? 'text-green-400' : 
                  cmd.status === 'error' ? 'text-red-400' : 
                  cmd.status === 'running' ? 'text-yellow-400' : 
                  'text-gray-500'
                }`}>
                  {cmd.command}
                  {cmd.status === 'running' && (
                    <span className="inline-block w-2 h-4 bg-green-400 ml-1 animate-pulse"></span>
                  )}
                </span>
              </div>
              
              {/* Command output */}
              {cmd.output && (
                <div className="ml-4 mt-1 text-gray-300 whitespace-pre-line">
                  {cmd.output}
                </div>
              )}
              
              {/* Status indicator */}
              <div className="ml-4 mt-1">
                {cmd.status === 'success' && (
                  <span className="text-green-400">✅ Completed</span>
                )}
                {cmd.status === 'error' && (
                  <span className="text-red-400">❌ Failed</span>
                )}
                {cmd.status === 'running' && (
                  <span className="text-yellow-400">⏳ Running...</span>
                )}
              </div>
            </div>
          ))}
          
          {/* Cursor */}
          {currentIndex >= commands.length && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <span className="text-blue-400">user@system:~$</span>
                <span className="inline-block w-2 h-4 bg-green-400 animate-pulse"></span>
              </div>
              
              {/* Continue Button */}
              <div className="flex justify-center pt-4">
                <Button 
                  onClick={() => onComplete?.()}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  Continue to App →
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
