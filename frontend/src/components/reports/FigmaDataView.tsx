import React from 'react';
import { FigmaData } from '../../../../src/types/extractor';

interface FigmaDataViewProps {
  data: FigmaData;
}

const FigmaDataView: React.FC<FigmaDataViewProps> = ({ data }) => {
  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Figma Design Details</h2>
        <div className="text-sm text-gray-600">
          Extracted at: {new Date(data.timestamp).toLocaleString()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Components Section */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-medium mb-2">Components</h3>
          <div className="space-y-2">
            {data.data.components.map((component, index) => (
              <div key={index} className="p-2 bg-gray-50 rounded">
                <div className="font-medium">{component.name}</div>
                <div className="text-sm text-gray-600">
                  Type: {component.type}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Styles Section */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-medium mb-2">Styles</h3>
          <div className="space-y-2">
            {data.data.styles.map((style, index) => (
              <div key={index} className="p-2 bg-gray-50 rounded">
                <div className="font-medium">{style.name}</div>
                <div className="text-sm text-gray-600">
                  Type: {style.type}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Document Structure */}
      <div className="mt-4 bg-white rounded-lg shadow p-4">
        <h3 className="font-medium mb-2">Document Structure</h3>
        <pre className="bg-gray-50 p-4 rounded overflow-auto max-h-96">
          {JSON.stringify(data.data.document, null, 2)}
        </pre>
      </div>

      {/* Metadata */}
      <div className="mt-4 bg-white rounded-lg shadow p-4">
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

export default FigmaDataView; 