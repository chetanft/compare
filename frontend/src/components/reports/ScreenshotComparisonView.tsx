import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon,
  EyeIcon,
  DocumentTextIcon,
  ChartBarIcon,
  AdjustmentsHorizontalIcon,
  MagnifyingGlassIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { ScreenshotComparisonResult, Discrepancy } from '../../types';
import VisualDiffViewer from './VisualDiffViewer';
import SmartAnalysisView from './SmartAnalysisView';
import ColorPalette from '../ui/ColorPalette';

interface ScreenshotComparisonViewProps {
  result: ScreenshotComparisonResult;
  className?: string;
}

export default function ScreenshotComparisonView({ 
  result, 
  className = '' 
}: ScreenshotComparisonViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'visual' | 'colors' | 'discrepancies' | 'metrics' | 'smart-analysis'>('overview');
  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState<Discrepancy | null>(null);

  const tabs = [
    { id: 'overview', name: 'Overview', icon: InformationCircleIcon },
    { id: 'visual', name: 'Visual Comparison', icon: EyeIcon },
    ...(result.colorPalettes ? [{ id: 'colors', name: 'Color Palettes', icon: AdjustmentsHorizontalIcon }] : []),
    { id: 'discrepancies', name: 'Discrepancies', icon: ExclamationTriangleIcon },
    { id: 'metrics', name: 'Metrics', icon: ChartBarIcon },
    ...(result.enhancedAnalysis ? [{ id: 'smart-analysis', name: 'Smart Analysis', icon: SparklesIcon }] : [])
  ];

  const getSeverityColor = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'color': return '🎨';
      case 'layout': return '📐';
      case 'text': return '📝';
      case 'spacing': return '📏';
      case 'missing-element': return '❌';
      case 'extra-element': return '➕';
      default: return '🔍';
    }
  };

  const getQualityScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className={`max-w-6xl mx-auto ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Screenshot Comparison Results
            </h1>
            <p className="text-muted-foreground mt-1">
              Comparison ID: {result.id}
            </p>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getQualityScoreColor(result.metrics.qualityScore)}`}>
              Quality Score: {result.metrics.qualityScore.toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Processed in {result.processingTime}ms
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card text-center">
          <div className="text-2xl font-bold text-indigo-600">
            {result.metrics.overallSimilarity.toFixed(1)}%
          </div>
          <div className="text-sm text-muted-foreground">Overall Similarity</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-orange-600">
            {result.metrics.totalDiscrepancies}
          </div>
          <div className="text-sm text-muted-foreground">Total Issues</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-red-600">
            {result.metrics.severityBreakdown.high}
          </div>
          <div className="text-sm text-muted-foreground">High Severity</div>
        </div>
        <div className="card text-center">
          <div className={`text-2xl font-bold ${getQualityScoreColor(result.metrics.qualityScore).split(' ')[0]}`}>
            {result.metrics.qualityScore.toFixed(0)}
          </div>
          <div className="text-sm text-muted-foreground">Quality Score</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
                {tab.id === 'discrepancies' && result.metrics.totalDiscrepancies > 0 && (
                  <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
                    {result.metrics.totalDiscrepancies}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Summary Card */}
                <div className="card">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pixel Similarity:</span>
                      <span className="font-medium">{result.metrics.overallSimilarity.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pixel Differences:</span>
                      <span className="font-medium">{result.metrics.pixelDifferences.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Pixels:</span>
                      <span className="font-medium">{result.metrics.totalPixels.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quality Score:</span>
                      <span className={`font-medium ${getQualityScoreColor(result.metrics.qualityScore).split(' ')[0]}`}>
                        {result.metrics.qualityScore.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Severity Breakdown */}
                <div className="card">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Issue Breakdown</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-muted-foreground">High Severity</span>
                      </div>
                      <span className="font-medium">{result.metrics.severityBreakdown.high}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span className="text-muted-foreground">Medium Severity</span>
                      </div>
                      <span className="font-medium">{result.metrics.severityBreakdown.medium}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-muted-foreground">Low Severity</span>
                      </div>
                      <span className="font-medium">{result.metrics.severityBreakdown.low}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Discrepancy Types */}
              <div className="card">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Discrepancy Types</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(result.metrics.discrepancyTypes).map(([type, count]) => (
                    <div key={type} className="flex items-center space-x-3">
                      <span className="text-xl">{getTypeIcon(type)}</span>
                      <div>
                        <div className="font-medium capitalize">{type.replace(/([A-Z])/g, ' $1').trim()}</div>
                        <div className="text-sm text-muted-foreground">{count} issues</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Visual Comparison Tab */}
          {activeTab === 'visual' && (
            <VisualDiffViewer
              figmaImagePath={`/api/screenshots/images/${result.id}/figma-processed`}
              developedImagePath={`/api/screenshots/images/${result.id}/developed-processed`}
              diffImagePath={`/api/screenshots/images/${result.id}/pixel-diff`}
              sideBySidePath={result.sideBySidePath ? `/api/screenshots/images/${result.id}/side-by-side` : undefined}
              discrepancies={result.discrepancies}
            />
          )}

          {/* Color Palettes Tab */}
          {activeTab === 'colors' && result.colorPalettes && (
            <ColorPalette
              figmaColors={result.colorPalettes.figma}
              developedColors={result.colorPalettes.developed}
              comparison={result.colorPalettes.comparison}
            />
          )}

          {/* Discrepancies Tab */}
          {activeTab === 'discrepancies' && (
            <div className="space-y-4">
              {result.discrepancies.length === 0 ? (
                <div className="card text-center py-8">
                  <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No Discrepancies Found</h3>
                  <p className="text-muted-foreground">The screenshots match perfectly!</p>
                </div>
              ) : (
                result.discrepancies.map((discrepancy) => (
                  <motion.div
                    key={discrepancy.id}
                    className={`card border-l-4 cursor-pointer hover:shadow-md transition-shadow ${getSeverityColor(discrepancy.severity)}`}
                    onClick={() => setSelectedDiscrepancy(discrepancy)}
                    whileHover={{ scale: 1.01 }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-lg">{getTypeIcon(discrepancy.type)}</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(discrepancy.severity)}`}>
                            {discrepancy.severity.toUpperCase()}
                          </span>
                          <span className="text-sm text-muted-foreground capitalize">
                            {discrepancy.type.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                        </div>
                        <h4 className="font-medium text-gray-900 mb-1">
                          {discrepancy.description}
                        </h4>
                        {(discrepancy.figmaValue || discrepancy.developedValue) && (
                          <div className="text-sm space-y-1">
                            {discrepancy.figmaValue && (
                              <div>
                                <span className="text-muted-foreground">Design:</span> 
                                <code className="ml-1 px-1 bg-gray-100 rounded">
                                  {typeof discrepancy.figmaValue === 'string' ? discrepancy.figmaValue : JSON.stringify(discrepancy.figmaValue)}
                                </code>
                              </div>
                            )}
                            {discrepancy.developedValue && (
                              <div>
                                <span className="text-muted-foreground">Implementation:</span> 
                                <code className="ml-1 px-1 bg-gray-100 rounded">
                                  {typeof discrepancy.developedValue === 'string' ? discrepancy.developedValue : JSON.stringify(discrepancy.developedValue)}
                                </code>
                              </div>
                            )}
                          </div>
                        )}
                        {discrepancy.recommendation && (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                            <strong>Recommendation:</strong> {discrepancy.recommendation}
                          </div>
                        )}
                      </div>
                      <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 ml-2" />
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}

          {/* Metrics Tab */}
          {activeTab === 'metrics' && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Pixel Analysis</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Pixels:</span>
                    <span className="font-mono">{result.metrics.totalPixels.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Different Pixels:</span>
                    <span className="font-mono">{result.metrics.pixelDifferences.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Similarity:</span>
                    <span className="font-mono">{result.metrics.overallSimilarity.toFixed(3)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Difference:</span>
                    <span className="font-mono">{(100 - result.metrics.overallSimilarity).toFixed(3)}%</span>
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Quality Assessment</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quality Score:</span>
                    <span className={`font-mono ${getQualityScoreColor(result.metrics.qualityScore).split(' ')[0]}`}>
                      {result.metrics.qualityScore.toFixed(1)}/100
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Issues:</span>
                    <span className="font-mono">{result.metrics.totalDiscrepancies}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Critical Issues:</span>
                    <span className="font-mono text-red-600">{result.metrics.severityBreakdown.high}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Processing Time:</span>
                    <span className="font-mono">{result.processingTime}ms</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Smart Analysis Tab */}
          {activeTab === 'smart-analysis' && result.enhancedAnalysis && (
            <SmartAnalysisView analysis={result.enhancedAnalysis} />
          )}

          {activeTab === 'smart-analysis' && !result.enhancedAnalysis && (
            <div className="card text-center py-8">
              <SparklesIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Smart Analysis Not Available</h3>
              <p className="text-muted-foreground">Enhanced AI analysis is not available for this comparison.</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="mt-8 flex justify-center space-x-4">
        {result.reportPath && (
          <a
            href={result.reportPath}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 flex items-center space-x-2"
          >
            <DocumentTextIcon className="w-4 h-4" />
            <span>View Full Report</span>
          </a>
        )}
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 flex items-center space-x-2"
        >
          <AdjustmentsHorizontalIcon className="w-4 h-4" />
          <span>Compare</span>
        </button>
      </div>
    </div>
  );
}
