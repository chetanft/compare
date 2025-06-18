import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LightBulbIcon,
  SparklesIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  BookmarkIcon,
  ShareIcon,
  CogIcon
} from '@heroicons/react/24/outline'

interface SmartSuggestion {
  id: string
  type: 'optimization' | 'best-practice' | 'automation' | 'learning' | 'trend'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  effort: 'low' | 'medium' | 'high'
  category: string
  actionable: boolean
  learnMoreUrl?: string
  estimatedTime?: string
  confidence: number
  tags: string[]
}

interface SmartSuggestionsProps {
  comparisonData?: any
  userHistory?: any[]
  onSuggestionDismiss?: (suggestionId: string) => void
  onSuggestionBookmark?: (suggestionId: string) => void
}

export default function SmartSuggestions({ 
  comparisonData, 
  userHistory = [], 
  onSuggestionDismiss,
  onSuggestionBookmark 
}: SmartSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([])
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set())
  const [bookmarkedSuggestions, setBookmarkedSuggestions] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    generateSmartSuggestions()
  }, [comparisonData, userHistory])

  const generateSmartSuggestions = async () => {
    setIsLoading(true)
    
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const generatedSuggestions: SmartSuggestion[] = [
      {
        id: 'design-system-implementation',
        type: 'best-practice',
        title: 'Implement a Design System',
        description: 'Based on recurring inconsistencies, consider implementing a comprehensive design system with reusable components and clear guidelines.',
        impact: 'high',
        effort: 'high',
        category: 'Process Improvement',
        actionable: true,
        estimatedTime: '2-4 weeks',
        confidence: 0.92,
        tags: ['design-system', 'consistency', 'scalability'],
        learnMoreUrl: 'https://designsystem.guide'
      },
      {
        id: 'automated-visual-testing',
        type: 'automation',
        title: 'Set Up Automated Visual Testing',
        description: 'Integrate visual regression testing into your CI/CD pipeline to catch design inconsistencies early.',
        impact: 'high',
        effort: 'medium',
        category: 'Automation',
        actionable: true,
        estimatedTime: '1-2 weeks',
        confidence: 0.88,
        tags: ['automation', 'testing', 'ci-cd'],
        learnMoreUrl: 'https://docs.percy.io'
      },
      {
        id: 'responsive-design-audit',
        type: 'optimization',
        title: 'Conduct Responsive Design Audit',
        description: 'Your comparisons show potential responsive design issues. Consider a comprehensive audit across different devices.',
        impact: 'medium',
        effort: 'medium',
        category: 'UX Optimization',
        actionable: true,
        estimatedTime: '3-5 days',
        confidence: 0.85,
        tags: ['responsive', 'mobile', 'ux']
      },
      {
        id: 'performance-optimization',
        type: 'optimization',
        title: 'Optimize Page Load Performance',
        description: 'Slow loading times can affect visual comparison accuracy. Consider optimizing images and critical CSS.',
        impact: 'medium',
        effort: 'low',
        category: 'Performance',
        actionable: true,
        estimatedTime: '1-2 days',
        confidence: 0.78,
        tags: ['performance', 'optimization', 'loading']
      },
      {
        id: 'figma-dev-mode',
        type: 'trend',
        title: 'Leverage Figma Dev Mode',
        description: 'Figma\'s Dev Mode can provide more accurate design specifications and reduce implementation discrepancies.',
        impact: 'medium',
        effort: 'low',
        category: 'Workflow',
        actionable: true,
        estimatedTime: '2-3 hours',
        confidence: 0.82,
        tags: ['figma', 'dev-mode', 'workflow'],
        learnMoreUrl: 'https://help.figma.com/hc/en-us/articles/15023124644247-Guide-to-Dev-Mode'
      },
      {
        id: 'component-documentation',
        type: 'best-practice',
        title: 'Document Component Specifications',
        description: 'Create detailed documentation for component states, interactions, and edge cases to improve implementation accuracy.',
        impact: 'medium',
        effort: 'medium',
        category: 'Documentation',
        actionable: true,
        estimatedTime: '1 week',
        confidence: 0.75,
        tags: ['documentation', 'components', 'specifications']
      }
    ]

    // Filter based on user history and context
    const contextualSuggestions = generatedSuggestions.filter(suggestion => {
      // Add logic to filter based on user's previous comparisons, preferences, etc.
      return !dismissedSuggestions.has(suggestion.id)
    })

    setSuggestions(contextualSuggestions)
    setIsLoading(false)
  }

  const handleDismiss = (suggestionId: string) => {
    setDismissedSuggestions(prev => new Set([...prev, suggestionId]))
    onSuggestionDismiss?.(suggestionId)
  }

  const handleBookmark = (suggestionId: string) => {
    setBookmarkedSuggestions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(suggestionId)) {
        newSet.delete(suggestionId)
      } else {
        newSet.add(suggestionId)
      }
      return newSet
    })
    onSuggestionBookmark?.(suggestionId)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'optimization':
        return <ArrowTrendingUpIcon className="w-5 h-5" />
      case 'automation':
        return <CogIcon className="w-5 h-5" />
      case 'best-practice':
        return <CheckCircleIcon className="w-5 h-5" />
      case 'learning':
        return <BookmarkIcon className="w-5 h-5" />
      case 'trend':
        return <SparklesIcon className="w-5 h-5" />
      default:
        return <LightBulbIcon className="w-5 h-5" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'optimization':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'automation':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'best-practice':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'learning':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'trend':
        return 'bg-pink-100 text-pink-700 border-pink-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'text-red-600 bg-red-50'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50'
      case 'low':
        return 'text-green-600 bg-green-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'high':
        return 'text-red-600'
      case 'medium':
        return 'text-yellow-600'
      case 'low':
        return 'text-green-600'
      default:
        return 'text-gray-600'
    }
  }

  const visibleSuggestions = suggestions.filter(s => !dismissedSuggestions.has(s.id))

  if (isLoading) {
    return (
      <div className="card">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <SparklesIcon className="w-5 h-5 text-blue-600 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Smart Suggestions</h3>
            <p className="text-sm text-gray-600">Generating personalized recommendations...</p>
          </div>
        </div>
        
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-2 bg-gray-200 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <SparklesIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Smart Suggestions</h3>
            <p className="text-sm text-gray-600">AI-powered recommendations for your workflow</p>
          </div>
        </div>
        
        <div className="text-sm text-gray-500">
          {visibleSuggestions.length} suggestions
        </div>
      </div>

      {/* Suggestions */}
      <div className="space-y-4">
        <AnimatePresence>
          {visibleSuggestions.map((suggestion, index) => (
            <motion.div
              key={suggestion.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: index * 0.1 }}
              className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg border ${getTypeColor(suggestion.type)}`}>
                    {getTypeIcon(suggestion.type)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">{suggestion.title}</h4>
                    <p className="text-sm text-gray-600 mb-2">{suggestion.description}</p>
                    
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {suggestion.tags.map(tag => (
                        <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleBookmark(suggestion.id)}
                    className={`p-1 rounded hover:bg-gray-100 transition-colors ${
                      bookmarkedSuggestions.has(suggestion.id) ? 'text-yellow-600' : 'text-gray-400'
                    }`}
                  >
                    <BookmarkIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDismiss(suggestion.id)}
                    className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Metrics */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <span className="text-gray-500">Impact:</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getImpactColor(suggestion.impact)}`}>
                      {suggestion.impact}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <span className="text-gray-500">Effort:</span>
                    <span className={`text-xs font-medium ${getEffortColor(suggestion.effort)}`}>
                      {suggestion.effort}
                    </span>
                  </div>
                  
                  {suggestion.estimatedTime && (
                    <div className="flex items-center space-x-1 text-gray-500">
                      <ClockIcon className="w-3 h-3" />
                      <span className="text-xs">{suggestion.estimatedTime}</span>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500">
                    {Math.round(suggestion.confidence * 100)}% confidence
                  </div>
                </div>

                {/* Action Button */}
                <div className="flex items-center space-x-2">
                  {suggestion.learnMoreUrl && (
                    <a
                      href={suggestion.learnMoreUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Learn More →
                    </a>
                  )}
                  
                  {suggestion.actionable && (
                    <button className="btn-primary btn-sm">
                      Get Started
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {visibleSuggestions.length === 0 && (
        <div className="text-center py-8">
          <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h4>
          <p className="text-gray-600 mb-4">
            No new suggestions at the moment. Keep using the tool to get more personalized recommendations.
          </p>
          <button 
            onClick={generateSmartSuggestions}
            className="btn-secondary"
          >
            Refresh Suggestions
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Suggestions updated based on your usage patterns</span>
          <div className="flex items-center space-x-1">
            <SparklesIcon className="w-3 h-3" />
            <span>AI-Powered</span>
          </div>
        </div>
      </div>
    </div>
  )
} 