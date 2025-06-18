import React, { useEffect, useState } from 'react';
import { FigmaData, WebData } from '../../../src/types/extractor';
import { extractFigmaData, extractWebData } from '../services/api';
import FigmaDataView from '../components/reports/FigmaDataView';
import WebDataView from '../components/reports/WebDataView';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';

interface ReportPageProps {
  figmaFileKey: string;
  webUrl: string;
}

interface LoadingState {
  figma: boolean;
  web: boolean;
}

interface ErrorState {
  figma: string | null;
  web: string | null;
}

const ReportPage: React.FC<ReportPageProps> = ({ figmaFileKey, webUrl }) => {
  const [figmaData, setFigmaData] = useState<FigmaData | null>(null);
  const [webData, setWebData] = useState<WebData | null>(null);
  const [loading, setLoading] = useState<LoadingState>({
    figma: false,
    web: false
  });
  const [error, setError] = useState<ErrorState>({
    figma: null,
    web: null
  });
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      // Reset states
      setError({ figma: null, web: null });
      setLoading({ figma: true, web: true });

      try {
        // Start parallel data extraction
        const [figmaResult, webResult] = await Promise.all([
          extractFigmaData(figmaFileKey),
          extractWebData(webUrl)
        ]);

        setFigmaData(figmaResult);
        setWebData(webResult);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An error occurred';
        setError({
          figma: errorMessage,
          web: errorMessage
        });
      } finally {
        setLoading({ figma: false, web: false });
      }
    };

    if (figmaFileKey && webUrl) {
      loadData();
    }
  }, [figmaFileKey, webUrl]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Extracted Data Report</h1>
      
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab(0)}
            className={`${
              activeTab === 0
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Figma Design
          </button>
          <button
            onClick={() => setActiveTab(1)}
            className={`${
              activeTab === 1
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Web Implementation
          </button>
        </nav>
      </div>

      <div className="mt-4">
        {activeTab === 0 && (
          loading.figma ? (
            <LoadingSpinner message="Loading Figma data..." />
          ) : error.figma ? (
            <ErrorMessage message={error.figma} />
          ) : figmaData ? (
            <FigmaDataView data={figmaData} />
          ) : null
        )}

        {activeTab === 1 && (
          loading.web ? (
            <LoadingSpinner message="Loading web data..." />
          ) : error.web ? (
            <ErrorMessage message={error.web} />
          ) : webData ? (
            <WebDataView data={webData} />
          ) : null
        )}
      </div>
    </div>
  );
};

export default ReportPage; 