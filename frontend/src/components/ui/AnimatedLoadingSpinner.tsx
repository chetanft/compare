import React from 'react'
import { motion } from 'framer-motion'

interface AnimatedLoadingSpinnerProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'figma' | 'web' | 'comparison'
}

const spinnerVariants = {
  default: {
    colors: ['#3B82F6', '#8B5CF6', '#06B6D4'],
    icon: '🔄'
  },
  figma: {
    colors: ['#F24E1E', '#FF7262', '#A259FF'],
    icon: '🎨'
  },
  web: {
    colors: ['#10B981', '#06B6D4', '#3B82F6'],
    icon: '🌐'
  },
  comparison: {
    colors: ['#F59E0B', '#EF4444', '#8B5CF6'],
    icon: '⚖️'
  }
}

const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-12 h-12'
}

const messages = {
  default: [
    'Working on it...',
    'Almost there...',
    'Processing...',
    'Just a moment...'
  ],
  figma: [
    'Extracting design magic...',
    'Reading Figma components...',
    'Analyzing design tokens...',
    'Gathering visual elements...'
  ],
  web: [
    'Exploring the website...',
    'Capturing web elements...',
    'Analyzing CSS properties...',
    'Inspecting DOM structure...'
  ],
  comparison: [
    'Comparing designs...',
    'Finding matches...',
    'Calculating differences...',
    'Generating insights...'
  ]
}

export default function AnimatedLoadingSpinner({ 
  message, 
  size = 'md', 
  variant = 'default' 
}: AnimatedLoadingSpinnerProps) {
  const [currentMessage, setCurrentMessage] = React.useState(
    message || messages[variant][0]
  )
  const config = spinnerVariants[variant]

  React.useEffect(() => {
    if (message) return 

    const interval = setInterval(() => {
      setCurrentMessage(prev => {
        const currentIndex = messages[variant].indexOf(prev)
        const nextIndex = (currentIndex + 1) % messages[variant].length
        return messages[variant][nextIndex]
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [variant, message])

  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8">
      <motion.div
        className="text-4xl"
        animate={{ 
          rotate: 360,
          scale: [1, 1.1, 1]
        }}
        transition={{
          rotate: {
            duration: 2,
            repeat: Infinity,
            ease: "linear"
          },
          scale: {
            duration: 1,
            repeat: Infinity,
            ease: "easeInOut"
          }
        }}
      >
        {config.icon}
      </motion.div>

      <div className="flex space-x-2">
        {config.colors.map((color, index) => (
          <motion.div
            key={index}
            className={`${sizeClasses[size]} rounded-full`}
            style={{ backgroundColor: color }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.7, 1, 0.7]
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: index * 0.2,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      <motion.div
        key={currentMessage}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="text-sm text-muted-foreground dark:text-gray-400 font-medium text-center"
      >
        {currentMessage}
      </motion.div>

      <div className="w-48 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${config.colors.join(', ')})`
          }}
          animate={{
            x: ['-100%', '100%']
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>
    </div>
  )
}