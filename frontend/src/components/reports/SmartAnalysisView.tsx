import React from 'react';
import { motion } from 'framer-motion';
import { 
  SparklesIcon, 
  LightBulbIcon, 
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

interface SmartAnalysisViewProps {
  analysis: {
    overallScore: number;
    insights: Array<{
      type: string;
      severity: 'critical' | 'high' | 'medium' | 'low';
      category: string;
      title: string;
      description: string;
      suggestion: string;
      confidence?: number;
      impact?: string;
    }>;
    recommendations: Array<{
      priority: string;
      category: string;
      title: string;
      description: string;
      action: string;
      estimatedTime: string;
    }>;
    issueBreakdown: {
      bySeverity: {
        critical: number;
        high: number;
        medium: number;
        low: number;
      };
      byCategory: Record<string, number>;
      total: number;
    };
    quickWins?: Array<{
      title: string;
      description: string;
      action: string;
      estimatedTime: string;
      impact: string;
      category: string;
    }>;
    aiSummary: string;
  };
}

export default function SmartAnalysisView({ analysis }: SmartAnalysisViewProps) {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 75) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const priorityIssues = analysis.insights.filter(i => 
    i.severity === 'critical' || i.severity === 'high'
  ).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Smart Overview */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <SparklesIcon className="w-6 h-6 text-purple-600" />
          <h3 className="text-lg font-medium text-gray-900">Smart Analysis</h3>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="text-center">
            <div className={`text-3xl font-bold mb-1 ${getScoreColor(analysis.overallScore).split(' ')[0]}`}>
              {analysis.overallScore}%
            </div>
            <div className="text-sm text-muted-foreground">Quality Score</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 mb-1">
              {analysis.issueBreakdown.bySeverity.critical + analysis.issueBreakdown.bySeverity.high}
            </div>
            <div className="text-sm text-muted-foreground">Priority Issues</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {analysis.quickWins?.length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Quick Wins</div>
          </div>
        </div>

        {/* AI Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">AI Summary</h4>
          <p className="text-blue-800 text-sm leading-relaxed">{analysis.aiSummary}</p>
        </div>
      </div>

      {/* Quick Wins Section */}
      {analysis.quickWins && analysis.quickWins.length > 0 && (
        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <LightBulbIcon className="w-5 h-5 text-yellow-500" />
            <h4 className="font-medium text-gray-900">Quick Wins</h4>
            <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-1 rounded">
              High impact, low effort
            </span>
          </div>
          
          <div className="space-y-3">
            {analysis.quickWins.map((win, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg"
              >
                <CheckCircleIcon className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-green-800">{win.title}</div>
                  <div className="text-sm text-green-700 mt-1">{win.action}</div>
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="flex items-center space-x-1">
                      <ClockIcon className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-green-600">{win.estimatedTime}</span>
                    </div>
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">
                      {win.category}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Priority Issues */}
      {priorityIssues.length > 0 && (
        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
            <h4 className="font-medium text-gray-900">Priority Issues</h4>
          </div>
          
          <div className="space-y-3">
            {priorityIssues.map((issue, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`border rounded-lg p-4 ${getSeverityColor(issue.severity)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-medium">{issue.title}</div>
                    <div className="text-sm mt-1">{issue.description}</div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(issue.severity)}`}>
                    {issue.severity.toUpperCase()}
                  </span>
                </div>
                
                {issue.suggestion && (
                  <div className="mt-3 p-2 bg-card bg-opacity-50 rounded text-sm">
                    <strong>Recommendation:</strong> {issue.suggestion}
                  </div>
                )}
                
                {issue.impact && (
                  <div className="mt-2 text-xs opacity-75">
                    <strong>Impact:</strong> {issue.impact}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Smart Recommendations */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <ChartBarIcon className="w-5 h-5 text-blue-500" />
          <h4 className="font-medium text-gray-900">Smart Recommendations</h4>
        </div>
        
        <div className="space-y-4">
          {analysis.recommendations.slice(0, 4).map((rec, index) => (
            <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
              <div className="flex items-center justify-between mb-1">
                <div className="font-medium text-gray-900">{rec.title}</div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  rec.priority === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {rec.priority} priority
                </span>
              </div>
              <div className="text-sm text-muted-foreground mb-2">{rec.description}</div>
              <div className="text-sm text-blue-600 font-medium mb-1">
                Action: {rec.action}
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-xs text-muted-foreground">
                  Estimated time: {rec.estimatedTime}
                </div>
                <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-0.5 rounded">
                  {rec.category}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Issue Breakdown */}
      <div className="card">
        <h4 className="font-medium text-gray-900 mb-4">Issue Analysis</h4>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h5 className="text-sm font-medium text-foreground mb-3">By Severity</h5>
            <div className="space-y-2">
              {Object.entries(analysis.issueBreakdown.bySeverity).map(([severity, count]) => (
                <div key={severity} className="flex justify-between items-center">
                  <span className="capitalize text-sm text-muted-foreground">{severity}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(severity)}`}>
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h5 className="text-sm font-medium text-foreground mb-3">By Category</h5>
            <div className="space-y-2">
              {Object.entries(analysis.issueBreakdown.byCategory).map(([category, count]) => (
                <div key={category} className="flex justify-between items-center">
                  <span className="capitalize text-sm text-muted-foreground">{category}</span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
