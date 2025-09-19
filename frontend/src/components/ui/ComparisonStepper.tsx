import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  EyeIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type StepStatus = 'pending' | 'in-progress' | 'completed' | 'error' | 'skipped';

export interface ComparisonStep {
  id: string;
  title: string;
  description: string;
  status: StepStatus;
  progress?: number;
  duration?: number;
  error?: string;
  details?: string[];
  icon?: React.ComponentType<{ className?: string }>;
}

interface ComparisonStepperProps {
  steps: ComparisonStep[];
  currentStepId?: string;
  onStepClick?: (stepId: string) => void;
  onRetry?: (stepId: string) => void;
  onCancel?: () => void;
  onComplete?: () => void;
  showProgress?: boolean;
  allowSkip?: boolean;
  className?: string;
}

const defaultSteps: ComparisonStep[] = [
  {
    id: 'validation',
    title: 'Input Validation',
    description: 'Validating Figma and web URLs',
    status: 'pending',
    icon: CogIcon
  },
  {
    id: 'figma-extraction',
    title: 'Figma Data Extraction',
    description: 'Extracting design data from Figma',
    status: 'pending',
    icon: DocumentTextIcon
  },
  {
    id: 'web-extraction',
    title: 'Web Page Analysis',
    description: 'Analyzing live web implementation',
    status: 'pending',
    icon: EyeIcon
  },
  {
    id: 'comparison',
    title: 'Design Comparison',
    description: 'Comparing design vs implementation',
    status: 'pending',
    icon: ChartBarIcon
  },
  {
    id: 'report-generation',
    title: 'Report Generation',
    description: 'Generating detailed comparison report',
    status: 'pending',
    icon: DocumentTextIcon
  }
];

export default function ComparisonStepper({
  steps = defaultSteps,
  currentStepId,
  onStepClick,
  onRetry,
  onCancel,
  onComplete,
  showProgress = true,
  allowSkip = false,
  className
}: ComparisonStepperProps) {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const currentStepIndex = steps.findIndex(step => step.id === currentStepId);
  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const totalProgress = (completedSteps / steps.length) * 100;

  const getStepIcon = (step: ComparisonStep) => {
    const IconComponent = step.icon || DocumentTextIcon;
    
    switch (step.status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircleIcon className="h-5 w-5 text-red-600" />;
      case 'in-progress':
        return <ArrowPathIcon className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'skipped':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />;
      default:
        return <IconComponent className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStepStatusBadge = (status: StepStatus) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'in-progress':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'skipped':
        return <Badge variant="secondary">Skipped</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
  };

  const isStepClickable = (step: ComparisonStep) => {
    return onStepClick && (step.status === 'completed' || step.status === 'error');
  };

  const handleStepClick = (step: ComparisonStep) => {
    if (isStepClickable(step)) {
      onStepClick?.(step.id);
    } else {
      setExpandedStep(expandedStep === step.id ? null : step.id);
    }
  };

  // Auto-expand current step
  useEffect(() => {
    if (currentStepId && currentStepId !== expandedStep) {
      setExpandedStep(currentStepId);
    }
  }, [currentStepId]);

  // Check if all steps are completed
  useEffect(() => {
    const allCompleted = steps.every(step => 
      step.status === 'completed' || step.status === 'skipped'
    );
    if (allCompleted && onComplete) {
      onComplete();
    }
  }, [steps, onComplete]);

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">Comparison Progress</h3>
            <p className="text-sm text-muted-foreground">
              {completedSteps} of {steps.length} steps completed
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onCancel && (
              <Button variant="outline" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Overall Progress */}
        {showProgress && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">{Math.round(totalProgress)}%</span>
            </div>
            <Progress value={totalProgress} className="h-2" />
          </div>
        )}

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "relative",
                index < steps.length - 1 && "pb-4"
              )}
            >
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-200" />
              )}

              {/* Step Content */}
              <div
                className={cn(
                  "flex items-start gap-4 p-4 rounded-lg border transition-all cursor-pointer",
                  step.status === 'in-progress' && "border-blue-200 bg-blue-50",
                  step.status === 'completed' && "border-green-200 bg-green-50",
                  step.status === 'error' && "border-red-200 bg-red-50",
                  step.status === 'pending' && "border-gray-200 bg-gray-50",
                  isStepClickable(step) && "hover:shadow-md",
                  expandedStep === step.id && "ring-2 ring-blue-200"
                )}
                onClick={() => handleStepClick(step)}
              >
                {/* Step Icon */}
                <div className="flex-shrink-0 mt-1">
                  {getStepIcon(step)}
                </div>

                {/* Step Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium text-sm">{step.title}</h4>
                      {getStepStatusBadge(step.status)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {step.duration && (
                        <div className="flex items-center gap-1">
                          <ClockIcon className="h-3 w-3" />
                          {formatDuration(step.duration)}
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mt-1">
                    {step.description}
                  </p>

                  {/* Step Progress */}
                  {step.status === 'in-progress' && step.progress !== undefined && (
                    <div className="mt-3">
                      <Progress value={step.progress} className="h-1" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {step.progress}% complete
                      </p>
                    </div>
                  )}

                  {/* Error Message */}
                  {step.status === 'error' && step.error && (
                    <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded-md">
                      <p className="text-sm text-red-800">{step.error}</p>
                      {onRetry && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRetry(step.id);
                          }}
                        >
                          <ArrowPathIcon className="h-4 w-4 mr-1" />
                          Retry
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {expandedStep === step.id && step.details && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 space-y-1"
                      >
                        {step.details.map((detail, idx) => (
                          <p key={idx} className="text-xs text-muted-foreground">
                            • {detail}
                          </p>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Skip Button */}
                {allowSkip && step.status === 'pending' && step.id === currentStepId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle skip logic here
                    }}
                  >
                    Skip
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Summary */}
        {completedSteps === steps.length && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
              <h4 className="font-medium text-green-800">Comparison Complete!</h4>
            </div>
            <p className="text-sm text-green-700 mt-1">
              All steps have been completed successfully. Your comparison report is ready.
            </p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

// Hook for managing stepper state
export function useComparisonStepper(initialSteps?: ComparisonStep[]) {
  const [steps, setSteps] = useState<ComparisonStep[]>(initialSteps || defaultSteps);
  const [currentStepId, setCurrentStepId] = useState<string | null>(null);

  const updateStep = (stepId: string, updates: Partial<ComparisonStep>) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    ));
  };

  const startStep = (stepId: string) => {
    setCurrentStepId(stepId);
    updateStep(stepId, { status: 'in-progress', progress: 0 });
  };

  const completeStep = (stepId: string, duration?: number) => {
    updateStep(stepId, { status: 'completed', progress: 100, duration });
  };

  const errorStep = (stepId: string, error: string) => {
    updateStep(stepId, { status: 'error', error });
  };

  const skipStep = (stepId: string) => {
    updateStep(stepId, { status: 'skipped' });
  };

  const updateProgress = (stepId: string, progress: number) => {
    updateStep(stepId, { progress });
  };

  const resetSteps = () => {
    setSteps(prev => prev.map(step => ({ 
      ...step, 
      status: 'pending' as StepStatus, 
      progress: undefined, 
      error: undefined, 
      duration: undefined 
    })));
    setCurrentStepId(null);
  };

  return {
    steps,
    currentStepId,
    updateStep,
    startStep,
    completeStep,
    errorStep,
    skipStep,
    updateProgress,
    resetSteps,
    setCurrentStepId
  };
}
