import React, { useState } from 'react';
import { Tab } from '@headlessui/react';
import FigmaDataView from './FigmaDataView';
import WebDataView from './WebDataView';
import ErrorMessage from '../ui/ErrorMessage';

interface ExtractedDataViewProps {
  data: {
    figmaData: any;
    webData: any;
    metadata: {
      timestamp: string;
      figmaUrl: string;
      webUrl: string;
      nodeId?: string;
    };
  };
  error?: {
    message: string;
    code?: string;
    stage?: string;
  };
  isLoading?: boolean;
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

const ExtractedDataView: React.FC<ExtractedDataViewProps> = ({ data, error, isLoading }) => {
  if (error) {
    return (
      <div className="p-4">
        <ErrorMessage 
          message={error.message} 
          details={error.stage ? `Stage: ${error.stage}` : undefined}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Extracted Data</h2>
        <div className="text-sm text-muted-foreground">
          Generated at: {new Date(data.metadata.timestamp).toLocaleString()}
        </div>
      </div>

      {/* URLs */}
      <div className="mb-6 bg-card rounded-lg shadow p-4">
        <div className="grid grid-cols-1 gap-2">
          <div className="text-sm">
            <span className="font-medium">Figma URL:</span>{' '}
            <a href={data.metadata.figmaUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
              {data.metadata.figmaUrl}
            </a>
          </div>
          <div className="text-sm">
            <span className="font-medium">Web URL:</span>{' '}
            <a href={data.metadata.webUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
              {data.metadata.webUrl}
            </a>
          </div>
          {data.metadata.nodeId && (
            <div className="text-sm">
              <span className="font-medium">Node ID:</span> {data.metadata.nodeId}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tab.Group>
        <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1">
          <Tab
            className={({ selected }) =>
              classNames(
                'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                selected
                  ? 'bg-card text-blue-700 shadow'
                  : 'text-blue-100 hover:bg-card/[0.12] hover:text-white'
              )
            }
          >
            Figma Data
          </Tab>
          <Tab
            className={({ selected }) =>
              classNames(
                'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                selected
                  ? 'bg-card text-blue-700 shadow'
                  : 'text-blue-100 hover:bg-card/[0.12] hover:text-white'
              )
            }
          >
            Web Data
          </Tab>
        </Tab.List>
        <Tab.Panels className="mt-2">
          <Tab.Panel>
            <FigmaDataView data={data.figmaData} />
          </Tab.Panel>
          <Tab.Panel>
            <WebDataView data={data.webData} />
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
};

export default ExtractedDataView; 