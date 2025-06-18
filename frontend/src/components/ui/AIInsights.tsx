import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  SparklesIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon,
  CogIcon,
  ArrowTrendingUpIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'

interface AIAnalysis {
  timestamp: string
  overallScore: number
  insights: AIInsight[]
  recommendations: AIRecommendation[]
  issueBreakdown: {
    bySeverity: { critical: number; high: number; medium: number; low: number }
    byCategory: Record<string, number>
    total: number
  }
  aiSummary: string
  actionItems: AIActionItem[]
}

interface AIInsight {
  type: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: string
  title: string
  description: string
  impact: string
  suggestion: string
  confidence: number
}

interface AIRecommendation {
  priority: 'high' | 'medium' | 'low'
  category: string
  title: string
  description: string
  action: string
  estimatedTime: string
}

interface AIActionItem {
  id: number
  priority: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  category: string
  estimatedTime: string
  confidence: number
}

interface AIInsightsProps {
  analysis: AIAnalysis | null
  isLoading?: boolean
}

export default function AIInsights({ analysis, isLoading = false }: AIInsightsProps) {
  const [activeTab, setActiveTab] = useState<'insights' | 'recommendations' | 'actions'>('insights')
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null)

  // Handle null analysis
  if (!analysis && !isLoading) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-purple-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <SparklesIcon className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No AI analysis available</h3>
          <p className="text-gray-600">
            AI insights will appear here once comparison analysis is complete.
          </p>
        </div>
      </div>
    )
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
      case 'high':
        return <ExclamationTriangleIcon className="w-5 h-5 text-orange-600" />
      case 'medium':
        return <InformationCircleIcon className="w-5 h-5 text-yellow-600" />
      case 'low':
        return <CheckCircleIcon className="w-5 h-5 text-blue-600" />
      default:
        return <InformationCircleIcon className="w-5 h-5 text-gray-600" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 75) return 'text-yellow-600'
    if (score >= 50) return 'text-orange-600'
    return 'text-red-600'
  }

  const getScoreGradient = (score: number) => {
    if (score >= 90) return 'from-green-500 to-green-600'
    if (score >= 75) return 'from-yellow-500 to-yellow-600'
    if (score >= 50) return 'from-orange-500 to-orange-600'
    return 'from-red-500 to-red-600'
  }

  if (isLoading) {
    return (
      <div className="card">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <SparklesIcon className="w-5 h-5 text-purple-600 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Analysis</h3>
            <p className="text-sm text-gray-600">Analyzing comparison results...</p>
          </div>
        </div>
        
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // TypeScript assertion since we've already checked for null above
  if (!analysis) return null

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <SparklesIcon className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Analysis</h3>
            <p className="text-sm text-gray-600">Intelligent insights and recommendations</p>
          </div>
        </div>
        
        {/* Overall Score */}
        <div className="text-center">
          <div className={`text-3xl font-bold ${getScoreColor(analysis.overallScore)}`}>
            {analysis.overallScore}
          </div>
          <div className="text-xs text-gray-500">Quality Score</div>
          <div className="w-16 h-2 bg-gray-200 rounded-full mt-1">
            <div 
              className={`h-2 rounded-full bg-gradient-to-r ${getScoreGradient(analysis.overallScore)}`}
              style={{ width: `${analysis.overallScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* AI Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200"
      >
        <div className="flex items-start space-x-3">
          <LightBulbIcon className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-purple-900 mb-1">AI Summary</h4>
            <p className="text-sm text-purple-800">{analysis.aiSummary}</p>
          </div>
        </div>
      </motion.div>

      {/* Issue Breakdown */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Object.entries(analysis.issueBreakdown.bySeverity).map(([severity, count]) => (
          <motion.div
            key={severity}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-3 rounded-lg border ${getSeverityColor(severity)}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold">{count}</div>
                <div className="text-xs capitalize">{severity}</div>
              </div>
              {getSeverityIcon(severity)}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
        {[
          { key: 'insights', label: 'Insights', icon: ChartBarIcon },
          { key: 'recommendations', label: 'Recommendations', icon: LightBulbIcon },
          { key: 'actions', label: 'Action Items', icon: CogIcon }
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'insights' && (
          <motion.div
            key="insights"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {analysis.insights.map((insight, index) => (
              <motion.div
                key={insight.type}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`border rounded-lg ${getSeverityColor(insight.severity)}`}
              >
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedInsight(
                    expandedInsight === insight.type ? null : insight.type
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getSeverityIcon(insight.severity)}
                      <div>
                        <h4 className="font-medium">{insight.title}</h4>
                        <p className="text-sm opacity-80">{insight.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs bg-white bg-opacity-50 px-2 py-1 rounded">
                        {Math.round(insight.confidence * 100)}% confidence
                      </span>
                      {expandedInsight === insight.type ? (
                        <ChevronDownIcon className="w-4 h-4" />
                      ) : (
                        <ChevronRightIcon className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>
                
                <AnimatePresence>
                  {expandedInsight === insight.type && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-current border-opacity-20"
                    >
                      <div className="p-4 space-y-3">
                        <div>
                          <h5 className="font-medium text-sm mb-1">Impact</h5>
                          <p className="text-sm opacity-80">{insight.impact}</p>
                        </div>
                        <div>
                          <h5 className="font-medium text-sm mb-1">Suggestion</h5>
                          <p className="text-sm opacity-80">{insight.suggestion}</p>
                        </div>
                        <div className="flex items-center space-x-4 text-xs">
                          <span className="bg-white bg-opacity-30 px-2 py-1 rounded">
                            Category: {insight.category}
                          </span>
                          <span className="bg-white bg-opacity-30 px-2 py-1 rounded">
                            Type: {insight.type}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        )}

        {activeTab === 'recommendations' && (
          <motion.div
            key="recommendations"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {analysis.recommendations.map((rec, index) => (
              <motion.div
                key={rec.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(rec.priority)}`}>
                        {rec.priority} priority
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {rec.category}
                      </span>
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1">{rec.title}</h4>
                    <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                    <p className="text-sm text-gray-800 font-medium">{rec.action}</p>
                  </div>
                  <div className="text-right ml-4">
                    <div className="flex items-center space-x-1 text-gray-500">
                      <ClockIcon className="w-4 h-4" />
                      <span className="text-xs">{rec.estimatedTime}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {activeTab === 'actions' && (
          <motion.div
            key="actions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {analysis.actionItems.map((action, index) => (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${getSeverityColor(action.priority)}`}>
                    {action.id}
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{action.title}</h4>
                  <p className="text-sm text-gray-600">{action.description}</p>
                  <div className="flex items-center space-x-3 mt-1">
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {action.category}
                    </span>
                    <span className="text-xs text-gray-500">
                      {Math.round(action.confidence * 100)}% confidence
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-1 text-gray-500">
                    <ClockIcon className="w-4 h-4" />
                    <span className="text-xs">{action.estimatedTime}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Analysis generated at {new Date(analysis.timestamp).toLocaleString()}</span>
          <div className="flex items-center space-x-1">
            <SparklesIcon className="w-3 h-3" />
            <span>Powered by AI</span>
          </div>
        </div>
      </div>
    </div>
  )
} 