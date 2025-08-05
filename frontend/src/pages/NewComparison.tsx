import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import ComparisonForm from '../components/forms/ComparisonForm'
import ProgressTracker from '../components/ui/ProgressTracker'
import { ComparisonResult } from '../types'
import { DocumentTextIcon, EyeIcon, ClockIcon } from '@heroicons/react/24/outline'
import { getApiBaseUrl } from '../utils/environment'

export default function NewComparison() {
  const [activeComparison, setActiveComparison] = useState<string | null>(null)
  const [showProgress, setShowProgress] = useState(false)
  const [result, setResult] = useState<ComparisonResult | null>(null)
  const [reportUrl, setReportUrl] = useState<string | null>(null)
  const [recentReports, setRecentReports] = useState<string[]>([])
  const navigate = useNavigate()

  // Load recent reports on component mount
  useEffect(() => {
    const loadRecentReports = async () => {
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/reports/list`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.reports) {
            // Get the 5 most recent HTML reports
            const htmlReports = data.reports
              .filter((report: any) => report.name.endsWith('.html'))
              .slice(0, 5)
            setRecentReports(htmlReports)
          }
        }
      } catch (error) {
        console.log('Could not load recent reports:', error)
      }
    }
    loadRecentReports()
  }, [])

  const handleComparisonStart = (comparisonId: string) => {
    setActiveComparison(comparisonId)
    setShowProgress(true)
  }

  const handleComparisonComplete = (result: any) => {
    console.log('Extraction completed:', result)
    // Instead of redirecting immediately, show the result
    setResult(result)
    setShowProgress(false)
    setActiveComparison(null)
  }

  const handleComparisonError = (error: any) => {
    console.error('Extraction failed:', error)
    // Show error message and allow retry
    setTimeout(() => {
      setShowProgress(false)
      setActiveComparison(null)
    }, 3000)
  }

  const handleSuccess = (comparisonResult: ComparisonResult) => {
    console.log('🔍 DEBUG: handleSuccess received:', comparisonResult);
    console.log('🔍 DEBUG: comparisonResult.data:', comparisonResult?.data);
    console.log('🔍 DEBUG: comparisonResult.reportPath:', comparisonResult?.reportPath);
    console.log('🔍 DEBUG: comparisonResult.reports:', comparisonResult?.reports);
    
    setResult(comparisonResult)
    
    // Check if reports are available in the result
    if (comparisonResult?.reports?.directUrl) {
      console.log('🔍 DEBUG: Using reports.directUrl structure');
      // Store the report URL for direct access, including the API base URL
      const apiBaseUrl = getApiBaseUrl();
      setReportUrl(`${apiBaseUrl}${comparisonResult.reports.directUrl}`);
    } else if (comparisonResult?.reportPath) {
      console.log('🔍 DEBUG: Using reportPath structure');
      // Handle new reportPath structure
      const apiBaseUrl = getApiBaseUrl();
      setReportUrl(`${apiBaseUrl}${comparisonResult.reportPath}`);
    } else {
      console.log('🔍 DEBUG: No report URL found in either structure');
    }
  }

  // Function to open report in new tab
  const openReportInNewTab = (url: string) => {
    try {
      window.open(url, '_blank');
    } catch (error) {
      console.error('Failed to open report:', error);
    }
  }

  // Format report filename for display
  const formatReportName = (filename: string) => {
    const timestamp = filename.replace('comparison-', '').replace('.html', '')
    try {
      const date = new Date(timestamp.replace(/T/, ' ').replace(/-/g, ':'))
      return date.toLocaleString()
    } catch {
      return filename.replace('comparison-', '').replace('.html', '')
    }
  }

  if (result) {
    return (
      <div className="p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <DocumentTextIcon className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Extraction Complete!</h1>
            <p className="text-gray-600">Your design and web data has been extracted successfully.</p>
            
            {/* Show direct link to report if available */}
            {reportUrl && (
              <div className="mt-4">
                <button
                  onClick={() => openReportInNewTab(reportUrl)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <EyeIcon className="w-5 h-5 mr-2" />
                  View Report
                </button>
              </div>
            )}
          </div>

          {/* Results Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="card text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {result.figmaData?.componentsCount || 0}
              </div>
              <div className="text-sm text-gray-600">Figma Components</div>
            </div>
            <div className="card text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {result.webData?.elementsCount || 0}
              </div>
              <div className="text-sm text-gray-600">Web Elements</div>
            </div>
          </div>

          {/* Report Links */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Generated Reports</h3>
            <div className="space-y-3">
              {result?.reports?.directUrl && (
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    const apiBaseUrl = getApiBaseUrl();
                    if (result.reports?.directUrl) {
                      openReportInNewTab(`${apiBaseUrl}${result.reports.directUrl}`);
                    }
                  }}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <EyeIcon className="w-5 h-5 text-gray-600" />
                    <div>
                      <div className="font-medium text-gray-900">HTML Report</div>
                      <div className="text-sm text-gray-500">Interactive data visualization</div>
                    </div>
                  </div>
                  <div className="text-sm text-indigo-600 font-medium">View Report →</div>
                </a>
              )}

              {result?.reports?.downloadUrl && (
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    const apiBaseUrl = getApiBaseUrl();
                    if (result.reports?.downloadUrl) {
                      openReportInNewTab(`${apiBaseUrl}${result.reports.downloadUrl}`);
                    }
                  }}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <DocumentTextIcon className="w-5 h-5 text-gray-600" />
                    <div>
                      <div className="font-medium text-gray-900">JSON Data</div>
                      <div className="text-sm text-gray-500">Raw extraction data</div>
                    </div>
                  </div>
                  <div className="text-sm text-indigo-600 font-medium">Download →</div>
                </a>
              )}

              {result?.reportPath && (
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    const apiBaseUrl = getApiBaseUrl();
                    if (result.reportPath) {
                      openReportInNewTab(`${apiBaseUrl}${result.reportPath}`);
                    }
                  }}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <DocumentTextIcon className="w-5 h-5 text-gray-600" />
                    <div>
                      <div className="font-medium text-gray-900">HTML Comparison Report</div>
                      <div className="text-sm text-gray-500">Complete comparison analysis</div>
                    </div>
                  </div>
                  <div className="text-sm text-indigo-600 font-medium">Download →</div>
                </a>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-center space-x-4 mt-8">
            <button
              onClick={() => setResult(null)}
              className="btn-primary"
            >
              Run Another Extraction
            </button>
            <button
              onClick={() => navigate('/')}
              className="btn-secondary"
            >
              Back to Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2">
            {!showProgress ? (
              <ComparisonForm onComparisonStart={handleComparisonStart} onSuccess={handleSuccess} />
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      setShowProgress(false)
                      setActiveComparison(null)
                    }}
                    className="btn-secondary btn-sm"
                  >
                    Cancel
                  </button>
                </div>
                
                {activeComparison && (
                  <ProgressTracker
                    comparisonId={activeComparison}
                    onComplete={handleComparisonComplete}
                    onError={handleComparisonError}
                  />
                )}
              </div>
            )}
          </div>

          {/* Recent Reports Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center space-x-2 mb-4">
                <ClockIcon className="w-5 h-5 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900">Recent Reports</h3>
              </div>
              
              {recentReports.length > 0 ? (
                <div className="space-y-2">
                  {recentReports.map((report: any, index) => (
                    <motion.button
                      key={report.name}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => openReportInNewTab(`${getApiBaseUrl()}/reports/${report.name}`)}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            Comparison Report
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {formatReportName(report.name)}
                          </div>
                        </div>
                        <EyeIcon className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 flex-shrink-0 ml-2" />
                      </div>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <DocumentTextIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No reports yet</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Run a comparison to generate your first report
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
} 