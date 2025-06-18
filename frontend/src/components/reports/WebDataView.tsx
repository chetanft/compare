import React from 'react';
import { WebData } from '../../../../src/types/extractor';

interface WebDataViewProps {
  data: WebData;
}

const WebDataView: React.FC<WebDataViewProps> = ({ data }) => {
  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Web Implementation Details</h2>
        <div className="text-sm text-gray-600">
          Extracted at: {new Date(data.timestamp).toLocaleString()}
        </div>
      </div>

      {/* Screenshots Section */}
      <div className="mb-6">
        <h3 className="font-medium mb-2">Screenshots</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.data.screenshots.map((screenshot, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-2">
              <img
                src={`data:image/png;base64,${screenshot}`}
                alt={`Screenshot ${index + 1}`}
                className="w-full h-auto rounded"
              />
              <div className="text-sm text-gray-600 mt-2">
                Screenshot {index + 1}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Resources Section */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <h3 className="font-medium mb-2">Resources</h3>
        <div className="space-y-2">
          {data.data.resources.map((resource, index) => (
            <div key={index} className="p-2 bg-gray-50 rounded text-sm">
              <a
                href={resource}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
              >
                {resource}
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* HTML Content */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <h3 className="font-medium mb-2">HTML Content</h3>
        <div className="bg-gray-50 p-4 rounded">
          <pre className="overflow-auto max-h-96 text-sm">
            {data.data.html}
          </pre>
        </div>
      </div>

      {/* Metadata */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-medium mb-2">Metadata</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>Version: {data.metadata.version}</div>
          <div>Extractor: {data.metadata.extractorType}</div>
          {Object.entries(data.metadata)
            .filter(([key]) => !['version', 'extractorType'].includes(key))
            .map(([key, value]) => (
              <div key={key} className="col-span-2">
                {key}: {JSON.stringify(value)}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default WebDataView; 