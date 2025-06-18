import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  DocumentTextIcon,
  EyeIcon,
  CalendarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'
import { ComparisonReport } from '../../types'
import { FilteredResultsEmpty, NoReportsEmpty } from '../ui/EmptyStates'

interface ComparisonReportsProps {
  reports: ComparisonReport[]
  filteredReports: ComparisonReport[]
  onClearFilters: () => void
}

export default function ComparisonReports({ reports, filteredReports, onClearFilters }: ComparisonReportsProps) {
  const navigate = useNavigate()
  
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

  if (filteredReports.length === 0) {
    return reports.length === 0 ? (
      <NoReportsEmpty />
    ) : (
      <FilteredResultsEmpty onClearFilters={onClearFilters} />
    )
  }

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {filteredReports.map((report, index) => (
          <motion.div
            key={report.id || `report-${index}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: index * 0.05 }}
            className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                {getStatusIcon(report.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {report.name || `Report ${report.id}`}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(report.status)}`}>
                      {report.status}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                    <span className="flex items-center space-x-1">
                      <CalendarIcon className="w-4 h-4" />
                      <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                    </span>
                    {report.figmaUrl && (
                      <span className="truncate max-w-xs">
                        Figma: {new URL(report.figmaUrl).pathname.split('/').pop()}
                      </span>
                    )}
                    {report.webUrl && (
                      <span className="truncate max-w-xs">
                        Web: {new URL(report.webUrl).hostname}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {report.htmlPath && (
                  <button
                    onClick={() => {
                      // Extract report filename from path: /output/reports/comparison-1749447741330.html -> comparison-1749447741330
                      const filename = report.htmlPath?.split('/').pop()?.replace('.html', '') || report.id;
                      navigate(`/html-report/${filename}`);
                    }}
                    className="btn-secondary btn-sm flex items-center space-x-1"
                  >
                    <EyeIcon className="w-4 h-4" />
                    <span>View</span>
                  </button>
                )}
                {!report.htmlPath && report.jsonPath && (
                  <button
                    onClick={() => {
                      // Extract report filename from path: /output/reports/comparison-1749447741330.json -> comparison-1749447741330
                      const filename = report.jsonPath?.split('/').pop()?.replace('.json', '') || report.id;
                      navigate(`/html-report/${filename}`);
                    }}
                    className="btn-secondary btn-sm flex items-center space-x-1"
                  >
                    <EyeIcon className="w-4 h-4" />
                    <span>View Data</span>
                  </button>
                )}
                {report.jsonPath && (
                  <a
                    href={report.jsonPath}
                    download
                    className="btn-secondary btn-sm flex items-center space-x-1"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    <span>Download</span>
                  </a>
                )}
              </div>
            </div>

            {report.summary && (
              <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                <div className="text-center">
                  <div className="text-lg font-semibold text-blue-600">
                    {report.summary.figma?.componentsExtracted || 0}
                  </div>
                  <div className="text-xs text-gray-500">Figma Components</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-green-600">
                    {report.summary.web?.elementsExtracted || 0}
                  </div>
                  <div className="text-xs text-gray-500">Web Elements</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-purple-600">
                    {report.summary.comparison?.totalMatches || 0}
                  </div>
                  <div className="text-xs text-gray-500">Matches</div>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
} 