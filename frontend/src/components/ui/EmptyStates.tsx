import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  DocumentTextIcon,
  ChartBarIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

interface EmptyStateProps {
  icon?: React.ComponentType<any>
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
  illustration?: 'reports' | 'analytics' | 'insights' | 'error' | 'generic'
}

const illustrations = {
  reports: (
    <div className="relative">
      <div className="w-24 h-32 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
        <DocumentTextIcon className="w-12 h-12 text-gray-400" />
      </div>
      <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
        <PlusIcon className="w-4 h-4 text-blue-600" />
      </div>
    </div>
  ),
  analytics: (
    <div className="relative">
      <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
        <ChartBarIcon className="w-12 h-12 text-gray-400" />
      </div>
      <div className="flex space-x-1 justify-center">
        <div className="w-2 h-8 bg-gray-200 rounded"></div>
        <div className="w-2 h-6 bg-gray-200 rounded"></div>
        <div className="w-2 h-10 bg-gray-200 rounded"></div>
        <div className="w-2 h-4 bg-gray-200 rounded"></div>
      </div>
    </div>
  ),
  insights: (
    <div className="relative">
      <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
        <LightBulbIcon className="w-12 h-12 text-purple-500" />
      </div>
      <div className="flex space-x-2 justify-center">
        <div className="w-3 h-3 bg-purple-200 rounded-full animate-pulse"></div>
        <div className="w-3 h-3 bg-blue-200 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-3 h-3 bg-indigo-200 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
      </div>
    </div>
  ),
  error: (
    <div className="relative">
      <div className="w-24 h-24 bg-red-50 rounded-full mx-auto mb-4 flex items-center justify-center">
        <ExclamationTriangleIcon className="w-12 h-12 text-red-400" />
      </div>
    </div>
  ),
  generic: (
    <div className="w-24 h-24 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
      <DocumentTextIcon className="w-12 h-12 text-gray-400" />
    </div>
  )
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  illustration = 'generic'
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-12"
    >
      {/* Illustration */}
      <div className="mb-6">
        {Icon ? (
          <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Icon className="w-12 h-12 text-gray-400" />
          </div>
        ) : (
          illustrations[illustration]
        )}
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto">
        <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
        <p className="text-muted-foreground mb-6">{description}</p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 flex items-center justify-center space-x-2"
            >
              <PlusIcon className="w-4 h-4" />
              <span>{actionLabel}</span>
            </button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 flex items-center justify-center space-x-2"
            >
              <ArrowPathIcon className="w-4 h-4" />
              <span>{secondaryActionLabel}</span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Specific empty state components for common use cases
export function NoReportsEmpty({ onCreateNew }: { onCreateNew?: () => void }) {
  const navigate = useNavigate()
  
  return (
    <EmptyState
      illustration="reports"
      title="No comparison reports yet"
      description="Start by creating your first Figma vs Web comparison. Reports will appear here once you've run some comparisons."
      actionLabel="Compare"
      onAction={onCreateNew || (() => navigate('/new-comparison'))}
    />
  )
}

export function NoAnalyticsEmpty({ onCreateNew }: { onCreateNew?: () => void }) {
  const navigate = useNavigate()
  
  return (
    <EmptyState
      illustration="analytics"
      title="No analytics data available"
      description="Analytics will appear here once you've run some comparisons. Create your first comparison to start seeing trends and insights."
      actionLabel="Compare"
      onAction={onCreateNew || (() => navigate('/new-comparison'))}
    />
  )
}

export function NoInsightsEmpty({ onCreateNew }: { onCreateNew?: () => void }) {
  const navigate = useNavigate()
  
  return (
    <EmptyState
      illustration="insights"
      title="No AI insights available"
      description="AI-powered insights and recommendations will appear here after you've completed some comparisons. Our AI analyzes your results to provide actionable feedback."
      actionLabel="Compare"
      onAction={onCreateNew || (() => navigate('/new-comparison'))}
    />
  )
}

export function FilteredResultsEmpty({ onClearFilters }: { onClearFilters?: () => void }) {
  const navigate = useNavigate()
  
  return (
    <EmptyState
      icon={DocumentTextIcon}
      title="No results found"
      description="No reports match your current filters. Try adjusting your search terms or filter criteria."
      actionLabel="Clear Filters"
      onAction={onClearFilters}
      secondaryActionLabel="Compare"
      onSecondaryAction={() => navigate('/new-comparison')}
    />
  )
}

export function ErrorEmpty({ onRetry, error }: { onRetry?: () => void; error?: string }) {
  return (
    <EmptyState
      illustration="error"
      title="Something went wrong"
      description={error || "We couldn't load the data. Please try again or contact support if the problem persists."}
      actionLabel="Try Again"
      onAction={onRetry}
      secondaryActionLabel="Refresh Page"
      onSecondaryAction={() => window.location.reload()}
    />
  )
} 