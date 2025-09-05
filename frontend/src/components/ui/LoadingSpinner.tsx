import React from 'react'
import { motion } from 'framer-motion'
import AnimatedLoadingSpinner from './AnimatedLoadingSpinner'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'white' | 'gray'
  text?: string
  className?: string
  message?: string
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12'
}

const colorClasses = {
  primary: 'border-indigo-600 border-t-transparent',
  white: 'border-white border-t-transparent',
  gray: 'border-gray-300 border-t-transparent'
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Loading...' }) => {
  return <AnimatedLoadingSpinner message={message} variant="default" />
}

export default LoadingSpinner

// Inline spinner for buttons
export function InlineSpinner({ size = 'sm', color = 'white' }: Pick<LoadingSpinnerProps, 'size' | 'color'>) {
  return (
    <div className={`border-2 rounded-full animate-spin ${sizeClasses[size]} ${colorClasses[color]}`} />
  )
}

// Full page loading overlay
export function LoadingOverlay({ text = 'Loading...' }: { text?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-card bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50"
    >
      <LoadingSpinner size="lg" text={text} />
    </motion.div>
  )
} 