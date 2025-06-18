import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import apiService from '../services/api'
import {
  ChartBarIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ServerIcon,
  WifiIcon,
  EyeIcon,
  CalendarIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline'
import AnalyticsDashboard from '../components/ui/AnalyticsDashboard'
import AIInsights from '../components/ui/AIInsights'
import SmartSuggestions from '../components/ui/SmartSuggestions'
import { useWebSocket } from '../hooks/useWebSocket'
import { ComparisonReport } from '../types'
import { NoInsightsEmpty } from '../components/ui/EmptyStates'
import { useNavigate } from 'react-router-dom'

interface HealthStatus {
  status: string
  timestamp: string
  version: string
  features: string[]
  components?: {
    figmaExtractor?: string
    webExtractor?: string
    mcpIntegration?: string
  }
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'ai-insights'>('overview')
  const { isConnected, connectionError } = useWebSocket()
  const navigate = useNavigate()

  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ['health'],
    queryFn: () => apiService.healthCheck(),
    refetchInterval: 30000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  })

  const { data: reportsData, isLoading: reportsLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => apiService.getReports(),
    refetchInterval: 30000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  })

  const reports = reportsData?.reports || []
  const recentReports = reports.slice(0, 5)
  const stats = {
    total: reports.length,
    successful: reports.filter((r: ComparisonReport) => r.status === 'success').length,
    failed: reports.filter((r: ComparisonReport) => r.status === 'error').length,
    pending: reports.filter((r: ComparisonReport) => r.status === 'pending').length
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />
      case 'error':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
      case 'pending':
        return <ClockIcon className="w-5 h-5 text-yellow-600" />
      default:
        return <DocumentTextIcon className="w-5 h-5 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800'
      case 'error':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (healthLoading || reportsLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Monitor your comparison tool performance and activity</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'analytics'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('ai-insights')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'ai-insights'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            AI Insights
          </button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* System Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Health Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
                <div className={`w-3 h-3 rounded-full ${health?.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    health?.status === 'healthy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {health?.status || 'Unknown'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Version</span>
                  <span className="text-sm font-medium text-gray-900">{health?.version}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last Check</span>
                  <span className="text-sm text-gray-900">
                    {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : 'Unknown'}
                  </span>
                </div>

                {health?.components && (
                  <div className="pt-3 border-t border-gray-200">
                    <div className="space-y-2">
                      {Object.entries(health.components).map(([key, status]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                                                     <span className={`text-xs ${status === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
                             {String(status)}
                           </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* WebSocket Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Real-time Connection</h3>
                <WifiIcon className={`w-5 h-5 ${isConnected ? 'text-green-600' : 'text-red-600'}`} />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">WebSocket</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                
                {connectionError && (
                  <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                    {connectionError}
                  </div>
                )}
                
                <div className="text-xs text-gray-500">
                  {isConnected 
                    ? 'Real-time updates enabled for comparison progress'
                    : 'Real-time updates unavailable - using polling fallback'
                  }
                </div>
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/new-comparison')}
                  className="w-full btn-primary text-left"
                >
                  New Comparison
                </button>
                <button
                  onClick={() => navigate('/reports')}
                  className="w-full btn-secondary text-left"
                >
                  View All Reports
                </button>
                <button
                  onClick={() => navigate('/settings')}
                  className="w-full btn-secondary text-left"
                >
                  Settings
                </button>
              </div>
            </motion.div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ChartBarIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Reports</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="card"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Successful</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.successful}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="card"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Failed</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.failed}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="card"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <ClockIcon className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Recent Reports */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="card"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Recent Reports</h3>
              <button
                onClick={() => navigate('/reports')}
                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
              >
                View All →
              </button>
            </div>

            {recentReports.length === 0 ? (
              <div className="text-center py-8">
                <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">No reports yet</h4>
                <p className="text-gray-600 mb-4">Create your first extraction to see reports here.</p>
                <button
                  onClick={() => navigate('/new-comparison')}
                  className="btn-primary"
                >
                  Create New Extraction
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentReports.map((report, index) => (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(report.status)}
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {report.name || `Report ${report.id}`}
                        </h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center space-x-1">
                            <CalendarIcon className="w-4 h-4" />
                            <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(report.status)}`}>
                            {report.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    {report.htmlPath && (
                      <a
                        href={report.htmlPath}
                        className="btn-secondary btn-sm flex items-center space-x-1"
                      >
                        <EyeIcon className="w-4 h-4" />
                        <span>View</span>
                      </a>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </>
      )}

      {activeTab === 'analytics' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AnalyticsDashboard reports={reports} />
        </motion.div>
      )}

      {activeTab === 'ai-insights' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {reports.length === 0 ? (
            <NoInsightsEmpty />
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Show AI insights only if we have successful reports with analysis data */}
              {reports.some(r => r.status === 'success' && r.summary) ? (
                <>
            <AIInsights 
                    key="ai-insights"
                    analysis={reports.find(r => r.status === 'success' && r.summary)?.analysis || null}
            />
            
            <SmartSuggestions 
                    key="smart-suggestions"
                    comparisonData={reports.find(r => r.status === 'success')}
              userHistory={reports}
            />
                </>
              ) : (
                <div className="col-span-2">
                  <div className="card text-center py-12">
                    <div className="w-16 h-16 bg-purple-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <ExclamationTriangleIcon className="w-8 h-8 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No analysis data available</h3>
                    <p className="text-gray-600 mb-6">
                      AI insights will appear here once you have successful extraction reports with analysis data.
                    </p>
                    <button
                      onClick={() => navigate('/new-comparison')}
                      className="btn-primary"
                    >
                      Create New Extraction
                    </button>
                  </div>
                </div>
              )}
          </div>
          )}
        </motion.div>
      )}
    </div>
  )
} 