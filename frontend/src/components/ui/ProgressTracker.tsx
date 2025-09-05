import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { useWebSocket, ComparisonProgress } from '../../hooks/useWebSocket'

interface ProgressTrackerProps {
  comparisonId: string
  onComplete?: (result: any) => void
  onError?: (error: any) => void
}

interface ProgressStep {
  id: string
  name: string
  description: string
  icon: React.ComponentType<any>
  status: 'pending' | 'running' | 'completed' | 'error'
  progress: number
  estimatedTime?: number
}

export default function ProgressTracker({ comparisonId, onComplete, onError }: ProgressTrackerProps) {
  const { isConnected, joinComparison, onComparisonProgress, onComparisonComplete, onComparisonError } = useWebSocket()
  const [currentProgress, setCurrentProgress] = useState<ComparisonProgress | null>(null)
  const [steps, setSteps] = useState<ProgressStep[]>([
    {
      id: 'figma-extraction',
      name: 'Figma Data Extraction',
      description: 'Extracting design components and properties',
      icon: DocumentTextIcon,
      status: 'pending',
      progress: 0,
      estimatedTime: 15
    },
    {
      id: 'web-extraction',
      name: 'Web Data Extraction',
      description: 'Capturing web page elements and styles',
      icon: GlobeAltIcon,
      status: 'pending',
      progress: 0,
      estimatedTime: 20
    },
    {
      id: 'report-generation',
      name: 'Report Generation',
      description: 'Generating extraction report',
      icon: ChartBarIcon,
      status: 'pending',
      progress: 0,
      estimatedTime: 5
    }
  ])
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [estimatedCompletion, setEstimatedCompletion] = useState<Date | null>(null)

  useEffect(() => {
    if (isConnected && comparisonId) {
      joinComparison(comparisonId)
      setStartTime(new Date())
    }
  }, [isConnected, comparisonId, joinComparison])

  useEffect(() => {
    const unsubscribeProgress = onComparisonProgress((progress: ComparisonProgress) => {
      setCurrentProgress(progress)
      updateStepsFromProgress(progress)
    })

    const unsubscribeComplete = onComparisonComplete((result: any) => {
      setCurrentProgress(prev => prev ? { ...prev, status: 'completed', progress: 100 } : null)
      markAllStepsCompleted()
      onComplete?.(result)
    })

    const unsubscribeError = onComparisonError((error: any) => {
      setCurrentProgress(prev => prev ? { ...prev, status: 'error' } : null)
      markCurrentStepError()
      onError?.(error)
    })

    return () => {
      unsubscribeProgress()
      unsubscribeComplete()
      unsubscribeError()
    }
  }, [onComparisonProgress, onComparisonComplete, onComparisonError, onComplete, onError])

  const updateStepsFromProgress = (progress: ComparisonProgress) => {
    setSteps(prevSteps => {
      const newSteps = [...prevSteps]
      
      // Update based on current stage
      switch (progress.stage) {
        case 'figma-extraction':
          newSteps[0].status = 'running'
          newSteps[0].progress = progress.details?.figmaProgress || progress.progress
          break
        case 'web-extraction':
          newSteps[0].status = 'completed'
          newSteps[0].progress = 100
          newSteps[1].status = 'running'
          newSteps[1].progress = progress.details?.webProgress || progress.progress
          break
        case 'report-generation':
          newSteps[0].status = 'completed'
          newSteps[0].progress = 100
          newSteps[1].status = 'completed'
          newSteps[1].progress = 100
          newSteps[2].status = 'running'
          newSteps[2].progress = progress.details?.comparisonProgress || progress.progress
          break
      }

      return newSteps
    })

    // Update estimated completion time
    if (progress.details?.estimatedTimeRemaining && startTime) {
      const completion = new Date(Date.now() + progress.details.estimatedTimeRemaining * 1000)
      setEstimatedCompletion(completion)
    }
  }

  const markAllStepsCompleted = () => {
    setSteps(prevSteps => 
      prevSteps.map(step => ({ ...step, status: 'completed' as const, progress: 100 }))
    )
  }

  const markCurrentStepError = () => {
    setSteps(prevSteps => {
      const newSteps = [...prevSteps]
      const runningStepIndex = newSteps.findIndex(step => step.status === 'running')
      if (runningStepIndex !== -1) {
        newSteps[runningStepIndex].status = 'error'
      }
      return newSteps
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />
      case 'error':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
      case 'running':
        return <ArrowPathIcon className="w-5 h-5 text-blue-600 animate-spin" />
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 border-green-200'
      case 'error':
        return 'bg-red-100 border-red-200'
      case 'running':
        return 'bg-blue-100 border-blue-200'
      default:
        return 'bg-muted/50 border-gray-200'
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getElapsedTime = () => {
    if (!startTime) return 0
    return Math.floor((Date.now() - startTime.getTime()) / 1000)
  }

  const overallProgress = steps.reduce((acc, step) => acc + step.progress, 0) / steps.length

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Extraction Progress</h3>
          <p className="text-sm text-muted-foreground">
            {currentProgress?.message || 'Initializing extraction...'}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-indigo-600">
            {Math.round(overallProgress)}%
          </div>
          <div className="text-xs text-muted-foreground">
            {startTime && `${formatTime(getElapsedTime())} elapsed`}
          </div>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Overall Progress</span>
          <span>{Math.round(overallProgress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <motion.div
            className="bg-indigo-600 h-3 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Connection Status */}
      {!isConnected && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2 text-yellow-800">
            <ExclamationTriangleIcon className="w-5 h-5" />
            <span className="text-sm font-medium">
              Real-time updates unavailable - connection lost
            </span>
          </div>
        </div>
      )}

      {/* Steps */}
      <div className="space-y-4">
        <AnimatePresence>
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-lg border ${getStatusColor(step.status)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {getStatusIcon(step.status)}
                    </div>
                    <div className="flex-shrink-0">
                      <Icon className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{step.name}</h4>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {Math.round(step.progress)}%
                    </div>
                    {step.estimatedTime && step.status === 'pending' && (
                      <div className="text-xs text-muted-foreground">
                        ~{step.estimatedTime}s
                      </div>
                    )}
                  </div>
                </div>

                {/* Step Progress Bar */}
                {step.status !== 'pending' && (
                  <div className="mt-3">
                    <div className="w-full bg-card bg-opacity-50 rounded-full h-2">
                      <motion.div
                        className={`h-2 rounded-full ${
                          step.status === 'completed' 
                            ? 'bg-green-500' 
                            : step.status === 'error'
                            ? 'bg-red-500'
                            : 'bg-blue-500'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${step.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Estimated Completion */}
      {estimatedCompletion && currentProgress?.status === 'running' && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2 text-blue-800">
            <ClockIcon className="w-4 h-4" />
            <span className="text-sm">
              Estimated completion: {estimatedCompletion.toLocaleTimeString()}
            </span>
          </div>
        </div>
      )}

      {/* Real-time Details */}
      {currentProgress?.details && (
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <div className="text-xs text-muted-foreground space-y-1">
            {currentProgress.details.currentStep && (
              <div>Current: {currentProgress.details.currentStep}</div>
            )}
            {currentProgress.details.totalSteps && (
              <div>
                Step {(currentProgress.details.totalSteps - (currentProgress.details.estimatedTimeRemaining || 0))} of {currentProgress.details.totalSteps}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 