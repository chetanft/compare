import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  EyeIcon,
  CalendarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline'
import { ComparisonReport } from '../../types'
import { FilteredResultsEmpty, NoReportsEmpty } from '../ui/EmptyStates'

interface WebDataReportsProps {
  reports: ComparisonReport[]
  filteredReports: ComparisonReport[]
  onClearFilters: () => void
}

export default function WebDataReports({ reports, filteredReports, onClearFilters }: WebDataReportsProps) {
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
        return <GlobeAltIcon className="w-5 h-5 text-gray-600" />
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

  const handleViewWebData = (reportId: string) => {
    navigate(`/web-data/${reportId}`)
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
            key={report.id}
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
                    {report.webUrl && (
                      <span className="truncate max-w-xs">
                        Web: {new URL(report.webUrl).hostname}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {report.status === 'success' && (
                  <button
                    onClick={() => handleViewWebData(report.id)}
                    className="btn-secondary btn-sm flex items-center space-x-1"
                  >
                    <EyeIcon className="w-4 h-4" />
                    <span>View Web Data</span>
                  </button>
                )}
              </div>
            </div>

            {report.summary?.web && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="text-center">
                  <div className="text-lg font-semibold text-green-600">
                    {report.summary.web.elementsExtracted || 0}
                  </div>
                  <div className="text-xs text-gray-500">Web Elements Extracted</div>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
} 