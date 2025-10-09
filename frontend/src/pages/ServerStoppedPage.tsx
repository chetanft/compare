/**
 * Server Stopped Page
 * Displayed when the Electron app's server is stopped
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { PlayIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface ServerStoppedPageProps {
  onStartServer: () => void;
  isStarting?: boolean;
}

export default function ServerStoppedPage({ 
  onStartServer, 
  isStarting = false 
}: ServerStoppedPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-md w-full mx-auto p-8">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className="h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center">
              <svg
                className="h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 12h14M12 5l7 7-7 7"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Server Stopped
          </h1>

          {/* Message */}
          <p className="text-gray-600 mb-8 leading-relaxed">
            The application server has been stopped. Start the server to continue using the Figma Comparison Tool.
          </p>

          {/* Start Button */}
          <Button
            onClick={onStartServer}
            disabled={isStarting}
            size="lg"
            className="w-full h-14 text-lg font-semibold"
          >
            {isStarting ? (
              <>
                <ArrowPathIcon className="h-6 w-6 mr-2 animate-spin" />
                Starting Server...
              </>
            ) : (
              <>
                <PlayIcon className="h-6 w-6 mr-2" />
                Start Server
              </>
            )}
          </Button>

          {/* Footer Info */}
          <p className="text-xs text-gray-500 mt-6">
            The server runs locally on port 3847
          </p>
        </div>
      </div>
    </div>
  );
}

