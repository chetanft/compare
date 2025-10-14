/**
 * Unified Results View
 * Clean, comprehensive display of comparison results
 */

import React from 'react';
import { motion } from 'framer-motion';
import { ComparisonResult } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import FigmaDataView from './FigmaDataView';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Eye, 
  Code, 
  ExternalLink,
  Download,
  CheckCircle,
  AlertTriangle,
  Info,
  Save,
  Share2,
  Link2
} from 'lucide-react';
// import ColorUsageSection from '../ui/ColorUsageSection';
// import ColorComparisonSection from '../ui/ColorComparisonSection';

interface UnifiedResultsViewProps {
  result: ComparisonResult;
}

export default function UnifiedResultsView({ result }: UnifiedResultsViewProps) {
  if (!result.success || !result.data) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">
              Invalid Results
            </h3>
            <p className="text-red-700">
              {result.error?.message || 'No comparison data available'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { comparison, extractionDetails } = result.data;
  const regressionRisk = comparison?.summary?.regressionRisk;
  const remediationLinks = comparison?.remediationLinks || [];
  
  // Handle different comparison data structures
  const similarityScore = comparison?.overallSimilarity || 
                          (extractionDetails?.comparison?.matchPercentage / 100) ||
                          (comparison?.summary?.totalMatches / Math.max(comparison?.summary?.totalComponents || 1, 1)) ||
                          0;
  
  const similarity = Math.round(similarityScore * 100);
  
  // Determine similarity level and color
  const getSimilarityLevel = (score: number) => {
    if (score >= 90) return { level: 'Excellent', color: 'text-green-600', bg: 'bg-green-100' };
    if (score >= 75) return { level: 'Good', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (score >= 60) return { level: 'Fair', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { level: 'Needs Work', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const similarityInfo = getSimilarityLevel(similarity);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Overall Score Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
        <CardContent className="p-8">
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="inline-block"
            >
              <div className={`w-32 h-32 rounded-full ${similarityInfo.bg} flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-lg`}>
                <span className={`text-4xl font-bold ${similarityInfo.color}`}>
                  {similarity}%
                </span>
              </div>
            </motion.div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Overall Similarity: {similarityInfo.level}
            </h2>
            
            <p className="text-gray-600 mb-4">
              Your design and implementation are {similarity}% similar
            </p>

            <div className="flex justify-center gap-4 text-sm text-gray-500">
              <span>⏱️ {result.processingTime}s processing time</span>
              <span>📅 {new Date(result.timestamp).toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Comparisons</p>
                <p className="text-2xl font-bold text-gray-900">
                  {comparison.totalComparisons}
                </p>
              </div>
              <Target className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Matched Elements</p>
                <p className="text-2xl font-bold text-green-600">
                  {comparison.matchedElements}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Discrepancies</p>
                <p className="text-2xl font-bold text-red-600">
                  {comparison.discrepancies}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {regressionRisk && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              Regression Risk Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['critical', 'major', 'minor'] as const).map((risk) => (
              <div key={risk} className="flex items-center justify-between rounded-lg border bg-muted/40 p-4">
                <div>
                  <p className="text-sm text-muted-foreground capitalize">{risk} risk</p>
                  <p className="text-2xl font-semibold">
                    {regressionRisk[risk] ?? 0}
                  </p>
                </div>
                <Badge variant={risk === 'critical' ? 'destructive' : risk === 'major' ? 'default' : 'secondary'}>{risk.toUpperCase()}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Extraction Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {result.data.figmaData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Figma Extraction Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FigmaDataView data={{ data: result.data.figmaData, metadata: extractionDetails.figma }} />
            </CardContent>
          </Card>
        )}

        {extractionDetails.web && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                Web Extraction Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Page Title</span>
                <span className="font-medium">
                  {extractionDetails.web.urlInfo?.title || 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Elements</span>
                <Badge variant="secondary">
                  {extractionDetails.web.elementCount || 0}
                </Badge>
              </div>
              {extractionDetails.web.urlInfo?.url && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">URL</span>
                  <a 
                    href={extractionDetails.web.urlInfo.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
                  >
                    Open <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Raw Data Preview */}
      {(result.data.figmaData || result.data.webData) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Detailed Analysis Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {result.data.figmaData && (
                <div>
                  <h4 className="font-semibold mb-3">Figma Typography</h4>
                  {result.data.figmaData.typography?.length ? (
                    <ul className="space-y-2 max-h-48 overflow-y-auto pr-2">
                      {result.data.figmaData.typography.map((token, index) => (
                        <li key={`fg-typo-${token.id || index}`} className="rounded-lg border bg-gray-50 p-3 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900">{token.name || `Style ${index + 1}`}</span>
                            {token.usageCount !== undefined && (
                              <span className="text-muted-foreground">{token.usageCount} uses</span>
                            )}
                          </div>
                          <div className="text-muted-foreground space-y-1">
                            {token.fontFamilies?.length && (
                              <div><span className="font-semibold text-gray-700">Families:</span> {token.fontFamilies.join(', ')}</div>
                            )}
                            {token.fontSizes?.length && (
                              <div><span className="font-semibold text-gray-700">Sizes:</span> {token.fontSizes.join(', ')}</div>
                            )}
                            {token.fontWeights?.length && (
                              <div><span className="font-semibold text-gray-700">Weights:</span> {token.fontWeights.join(', ')}</div>
                            )}
                            {token.lineHeights?.length && (
                              <div><span className="font-semibold text-gray-700">Line heights:</span> {token.lineHeights.join(', ')}</div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No typography tokens detected.</p>
                  )}
                </div>
              )}
              
              {result.data.webData && (
                <div>
                  <h4 className="font-semibold mb-3">Web Elements</h4>
                  <div className="bg-gray-50 p-4 rounded-lg max-h-40 overflow-y-auto">
                    <pre className="text-xs text-gray-700">
                      {JSON.stringify(result.data.webData.elements?.slice(0, 2), null, 2)}
                      {result.data.webData.elements && result.data.webData.elements.length > 2 && (
                        <div className="text-center text-gray-500 mt-2">
                          ... and {result.data.webData.elements.length - 2} more elements
                        </div>
                      )}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Color Analysis Section */}
      {/* {result.data.figmaData && result.data.webData && (
        <ColorComparisonSection 
          figmaData={result.data.figmaData} 
          webData={result.data.webData}
          className="bg-card rounded-lg border"
        />
      )} */}

      {/* Individual Color Usage Sections */}
      {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {result.data.figmaData && (
          <ColorUsageSection 
            data={result.data.figmaData} 
            source="figma" 
            className="bg-card rounded-lg border"
          />
        )}
        
        {result.data.webData && (
          <ColorUsageSection 
            data={result.data.webData} 
            source="web" 
            className="bg-card rounded-lg border"
          />
        )}
      </div> */}

      {/* Actions */}
      {result.data.reportPath && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Detailed Report</h3>
                <p className="text-sm text-gray-600">
                  Download or view the complete analysis report
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button size="sm">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {remediationLinks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              Suggested Remediation Links
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {remediationLinks.map((item, index) => (
              <div key={`${item.type}-${index}`} className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {item.label || item.type}
                  </p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.description}
                    </p>
                  )}
                </div>
                <Button asChild variant="outline" size="sm">
                  <a href={item.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    Open
                  </a>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {result.data.export && (
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <h3 className="font-semibold">Share this comparison</h3>
              <p className="text-sm text-muted-foreground">
                Download a sharable bundle or copy export link.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(result.data.export.shareUrl)}>
                <Share2 className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
              <Button asChild size="sm">
                <a href={result.data.export.bundleUrl} download>
                  <Download className="w-4 h-4 mr-2" />
                  Download Bundle
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
