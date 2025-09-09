import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

  const initialCommands: Omit<TerminalCommand, 'id' | 'timestamp'>[] = [
    { command: 'cd /Users/user/Comparision\\ tool', status: 'pending' },
    { command: 'PORT=3007 node server.js', status: 'pending' },
    { command: 'Checking server health...', status: 'pending' },
    { command: 'curl -s http://localhost:3007/api/health', status: 'pending' },
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
            output = '~/Comparision tool';
            break;
          case 1:
            output = '🚀 Starting Figma Web Comparison Tool...\n✅ Enhanced service initialization successful\n🚀 Server running at http://localhost:3007';
            break;
          case 2:
            output = 'Server health check initiated...';
            break;
          case 3:
            output = '{"success": true, "data": {"status": "ok"}}';
            break;
          case 4:
            output = '✅ Connection successful - Port 3007';
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
            <div className="flex items-center space-x-2">
              <span className="text-blue-400">user@system:~$</span>
              <span className="inline-block w-2 h-4 bg-green-400 animate-pulse"></span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
