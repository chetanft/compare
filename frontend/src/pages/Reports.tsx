import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import apiService from '../services/api'
import {
  DocumentTextIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { ComparisonReport } from '../types'
import { ErrorEmpty } from '../components/ui/EmptyStates'
import { useNavigate } from 'react-router-dom'
import ComparisonReports from '../components/reports/ComparisonReports'

interface ReportFilters {
  search: string
  status: 'all' | 'success' | 'error' | 'pending'
  dateRange: 'all' | 'today' | 'week' | 'month'
  sortBy: 'date' | 'name' | 'status'
  sortOrder: 'asc' | 'desc'
}

// Define search placeholder
const SEARCH_PLACEHOLDER = 'Search reports by name, date, or status...'

export default function Reports() {
  const [filters, setFilters] = useState<ReportFilters>({
    search: '',
    status: 'all',
    dateRange: 'all',
    sortBy: 'date',
    sortOrder: 'desc'
  })
  const [selectedReport, setSelectedReport] = useState<ComparisonReport | null>(null)
  const navigate = useNavigate()

  const { data: reportsData, isLoading, error } = useQuery({
    queryKey: ['reports'],
    queryFn: () => apiService.getReports(),
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  })

  const reports = reportsData?.reports || []
  const filteredReports = useMemo(() => {
    let filtered = [...reports]

    // Search filter
    if (filters.search) {
      filtered = filtered.filter(report =>
        report.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        report.figmaUrl?.toLowerCase().includes(filters.search.toLowerCase()) ||
        report.webUrl?.toLowerCase().includes(filters.search.toLowerCase())
      )
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(report => report.status === filters.status)
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date()
      const cutoff = new Date()
      
      switch (filters.dateRange) {
        case 'today':
          cutoff.setHours(0, 0, 0, 0)
          break
        case 'week':
          cutoff.setDate(now.getDate() - 7)
          break
        case 'month':
          cutoff.setMonth(now.getMonth() - 1)
          break
      }
      
      filtered = filtered.filter(report => 
        new Date(report.createdAt) >= cutoff
      )
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal
      
      switch (filters.sortBy) {
        case 'name':
          aVal = a.name || ''
          bVal = b.name || ''
          break
        case 'status':
          aVal = a.status || ''
          bVal = b.status || ''
          break
        case 'date':
        default:
          aVal = new Date(a.createdAt).getTime()
          bVal = new Date(b.createdAt).getTime()
          break
      }

      if (filters.sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })

    return filtered
  }, [reports, filters])

  const stats = useMemo(() => {
    const total = reports.length
    const success = reports.filter(r => r.status === 'success').length
    const error = reports.filter(r => r.status === 'error').length
    const pending = reports.filter(r => r.status === 'pending').length
    
    return { total, success, error, pending }
  }, [reports])



  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading reports...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorEmpty 
          error="Failed to load reports. Please try refreshing the page."
          onRetry={() => window.location.reload()}
        />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Extraction Reports</h1>
          <p className="text-gray-600">View and manage your design extraction reports</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => navigate('/new-comparison')}
            className="btn-primary"
          >
            New Extraction
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
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
          transition={{ delay: 0.1 }}
          className="card"
        >
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Successful</p>
              <p className="text-2xl font-bold text-gray-900">{stats.success}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <div className="flex items-center">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.error}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
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

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={SEARCH_PLACEHOLDER}
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="input-field pl-10"
            />
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap gap-3">
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
              className="input-field min-w-[120px]"
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
              <option value="pending">Pending</option>
            </select>

            <select
              value={filters.dateRange}
              onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
              className="input-field min-w-[120px]"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>

            <select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-')
                setFilters(prev => ({ ...prev, sortBy: sortBy as any, sortOrder: sortOrder as any }))
              }}
              className="input-field min-w-[140px]"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="status-asc">Status A-Z</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Reports Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="card"
      >
        <ComparisonReports
          reports={reports}
          filteredReports={filteredReports}
          onClearFilters={() => setFilters({
            search: '',
            status: 'all',
            dateRange: 'all',
            sortBy: 'date',
            sortOrder: 'desc'
          })}
        />
      </motion.div>
    </div>
  )
} 