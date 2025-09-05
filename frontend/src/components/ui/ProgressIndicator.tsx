import React from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

export interface ProgressStage {
  stage: string
  label?: string
  progress: number
  currentChunk?: number
  totalChunks?: number
  components?: number
  elements?: number
  processedComponents?: number
  totalComponents?: number
  error?: boolean
  message?: string
}

interface ProgressIndicatorProps {
  stages: ProgressStage[]
  currentStage: string
  error?: boolean
}

const stageConfig = {
  'figma_extraction': {
    title: 'Extracting Figma Components',
    color: 'purple'
  },
  'web_extraction': {
    title: 'Extracting Web Elements',
    color: 'blue'
  },
  'comparison': {
    title: 'Comparing Components',
    color: 'indigo'
  },
  'report_generation': {
    title: 'Generating Reports',
    color: 'green'
  },
  'complete': {
    title: 'Comparison Complete',
    color: 'green'
  },
  'error': {
    title: 'Error',
    color: 'red'
  }
}

export default function ProgressIndicator({ stages, currentStage, error }: ProgressIndicatorProps) {
  const getStageDetails = (stage: ProgressStage) => {
    const config = stageConfig[stage.stage as keyof typeof stageConfig]
    const progress = stage.progress || 0

    let details = ''
    if (stage.currentChunk && stage.totalChunks) {
      details = `Processing chunk ${stage.currentChunk}/${stage.totalChunks}`
    } else if (stage.components) {
      details = `Found ${stage.components} components`
    } else if (stage.elements) {
      details = `Found ${stage.elements} elements`
    } else if (stage.processedComponents && stage.totalComponents) {
      details = `Processed ${stage.processedComponents}/${stage.totalComponents} components`
    }

    return {
      title: config?.title || stage.stage,
      color: config?.color || 'gray',
      progress,
      details
    }
  }

  return (
    <div className="space-y-4">
      {stages.map((stage, index) => {
        const { title, color, progress, details } = getStageDetails(stage)
        const isActive = stage.stage === currentStage
        const isComplete = progress === 100
        const hasError = stage.error || (error && isActive)

        return (
          <div key={stage.stage} className="relative">
            {/* Progress line connecting stages */}
            {index < stages.length - 1 && (
              <div className="absolute left-5 top-10 h-full w-0.5 bg-gray-200" />
            )}

            <div className="flex items-start space-x-4">
              {/* Stage icon */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full ${
                  hasError ? 'bg-red-100' :
                  isComplete ? `bg-${color}-100` :
                  isActive ? `bg-${color}-50` : 'bg-gray-100'
                }`}
              >
                {hasError ? (
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                ) : isComplete ? (
                  <CheckCircleIcon className={`h-6 w-6 text-${color}-600`} />
                ) : isActive ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <ArrowPathIcon className={`h-6 w-6 text-${color}-600`} />
                  </motion.div>
                ) : (
                  <div className={`h-3 w-3 rounded-full bg-gray-400`} />
                )}
              </motion.div>

              {/* Stage content */}
              <div className="min-w-0 flex-1 pt-1.5">
                <motion.div
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="space-y-1"
                >
                  <h3 className={`text-sm font-medium ${
                    hasError ? 'text-red-900' :
                    isActive ? `text-${color}-900` : 'text-muted-foreground'
                  }`}>
                    {title}
                  </h3>
                  
                  {(isActive || isComplete) && (
                    <>
                      {/* Progress bar */}
                      <div className="h-1.5 w-full rounded-full bg-gray-200">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          className={`h-full rounded-full ${
                            hasError ? 'bg-red-500' : `bg-${color}-500`
                          }`}
                        />
                      </div>
                      
                      {/* Details */}
                      {details && (
                        <p className={`text-sm ${
                          hasError ? 'text-red-600' : `text-${color}-600`
                        }`}>
                          {details}
                        </p>
                      )}
                      
                      {/* Error message */}
                      {hasError && stage.message && (
                        <p className="text-sm text-red-600">
                          {stage.message}
                        </p>
                      )}
                    </>
                  )}
                </motion.div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
} 