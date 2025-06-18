import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import ComparisonForm from '../components/forms/ComparisonForm'
import ProgressTracker from '../components/ui/ProgressTracker'
import { ComparisonResult } from '../types'
import { DocumentTextIcon, EyeIcon } from '@heroicons/react/24/outline'

export default function NewComparison() {
  const [activeComparison, setActiveComparison] = useState<string | null>(null)
  const [showProgress, setShowProgress] = useState(false)
  const [result, setResult] = useState<ComparisonResult | null>(null)
  const [reportUrl, setReportUrl] = useState<string | null>(null)
  const navigate = useNavigate()

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
    setResult(comparisonResult)
    
    // Check if reports are available in the result
    if (comparisonResult?.reports?.html) {
      // Store the report URL for direct access
      setReportUrl(comparisonResult.reports.html);
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
                <a
                  href={reportUrl}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <EyeIcon className="w-5 h-5 mr-2" />
                  View Report
                </a>
              </div>
            )}
          </div>

          {/* Results Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="card text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {result.summary?.figma.componentsExtracted || 0}
              </div>
              <div className="text-sm text-gray-600">Figma Components</div>
            </div>
            <div className="card text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {result.summary?.web.elementsExtracted || 0}
              </div>
              <div className="text-sm text-gray-600">Web Elements</div>
            </div>
          </div>

          {/* Report Links */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Generated Reports</h3>
            <div className="space-y-3">
              {result.reports?.html && (
                <a
                  href={result.reports.html}
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

              {result.reports?.json && (
                <a
                  href={result.reports.json}
                  download
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
    <div className="p-6 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {!showProgress ? (
          <ComparisonForm onComparisonStart={handleComparisonStart} />
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
      </motion.div>
    </div>
  )
} 