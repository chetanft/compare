import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useParams } from 'react-router-dom'
import apiService from '../services/api'
import {
  SwatchIcon,
  DocumentTextIcon,
  CubeIcon,
  BeakerIcon,
  BuildingOfficeIcon,
  RectangleStackIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline'

export default function WebData() {
  const { comparisonId } = useParams<{ comparisonId?: string }>()
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['design-tokens']))

  const { data: webData, isLoading, error } = useQuery({
    queryKey: ['web-data', comparisonId],
    queryFn: () => comparisonId ? apiService.getWebData(comparisonId) : Promise.resolve(null),
    enabled: !!comparisonId
  })

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const renderDesignTokens = (tokens: any) => {
    if (!tokens) return null

    return (
      <div className="space-y-4">
        {/* Colors */}
        {tokens.colors && tokens.colors.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <SwatchIcon className="w-5 h-5 mr-2 text-blue-600" />
              Colors ({tokens.colors.length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {tokens.colors.map((color: any, index: number) => (
                <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                  <div 
                    className="w-8 h-8 rounded border border-gray-300"
                    style={{ backgroundColor: color.value }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{color.value}</p>
                    <p className="text-xs text-gray-500">Web Implementation</p>
                    {color.usage && (
                      <p className="text-xs text-gray-400">{color.usage} uses</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Typography */}
        {tokens.typography && tokens.typography.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <DocumentTextIcon className="w-5 h-5 mr-2 text-green-600" />
              Typography ({tokens.typography.length})
            </h4>
            <div className="space-y-2">
              {tokens.typography.map((typo: any, index: number) => (
                <div key={index} className="p-3 bg-gray-50 rounded">
                  <p className="font-medium text-gray-900">{typo.value}</p>
                  <p className="text-sm text-gray-500">Font family, size, and weight</p>
                  {typo.usage && (
                    <p className="text-xs text-gray-400">{typo.usage} uses</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Spacing */}
        {tokens.spacing && tokens.spacing.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <RectangleStackIcon className="w-5 h-5 mr-2 text-purple-600" />
              Spacing ({tokens.spacing.length})
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {tokens.spacing.map((spacing: any, index: number) => (
                <div key={index} className="p-2 bg-gray-50 rounded text-center">
                  <p className="text-sm font-medium text-gray-900">{spacing.value}</p>
                  {spacing.usage && (
                    <p className="text-xs text-gray-400">{spacing.usage} uses</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderComponents = (components: any[], title: string, icon: React.ReactNode, color: string) => {
    if (!components || components.length === 0) return null

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="font-medium text-gray-900 mb-3 flex items-center">
          {icon}
          {title} ({components.length})
        </h4>
        <div className="space-y-3">
          {components.map((component: any, index: number) => (
            <div key={index} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h5 className="font-medium text-gray-900">{component.name || component.tagName || `Element ${index + 1}`}</h5>
                  <p className="text-sm text-gray-600 mt-1">{component.tagName || component.type}</p>
                  {component.dimensions && (
                    <p className="text-xs text-gray-500 mt-1">
                      {Math.round(component.dimensions.width)}×{Math.round(component.dimensions.height)}px
                    </p>
                  )}
                  {component.selector && (
                    <p className="text-xs text-gray-400 mt-1 font-mono">{component.selector}</p>
                  )}
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${color}`}>
                  Web
                </span>
              </div>
              {component.styles && Object.keys(component.styles).length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    {Object.keys(component.styles).length} CSS properties
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!comparisonId) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <GlobeAltIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Comparison Selected</h3>
          <p className="text-gray-600">Select a comparison to view web extracted data</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading web data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Web Data</h3>
          <p className="text-gray-600">There was an error loading the web extracted data</p>
        </div>
      </div>
    )
  }

  const sections = [
    {
      id: 'design-tokens',
      title: 'Design Tokens',
      icon: <SwatchIcon className="w-5 h-5 mr-2 text-blue-600" />,
      content: renderDesignTokens(webData?.designTokens)
    },
    {
      id: 'atoms',
      title: 'Atoms',
      icon: <CubeIcon className="w-5 h-5 mr-2 text-green-600" />,
      content: renderComponents(webData?.atoms, 'Atoms', <CubeIcon className="w-5 h-5 mr-2 text-green-600" />, 'bg-green-100 text-green-800')
    },
    {
      id: 'molecules',
      title: 'Molecules',
      icon: <BeakerIcon className="w-5 h-5 mr-2 text-purple-600" />,
      content: renderComponents(webData?.molecules, 'Molecules', <BeakerIcon className="w-5 h-5 mr-2 text-purple-600" />, 'bg-purple-100 text-purple-800')
    },
    {
      id: 'organisms',
      title: 'Organisms',
      icon: <BuildingOfficeIcon className="w-5 h-5 mr-2 text-orange-600" />,
      content: renderComponents(webData?.organisms, 'Organisms', <BuildingOfficeIcon className="w-5 h-5 mr-2 text-orange-600" />, 'bg-orange-100 text-orange-800')
    }
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Web Extracted Data</h1>
        <p className="text-gray-600">Design tokens, atoms, molecules, and organisms extracted from the web implementation</p>
      </div>

      {/* Content Sections */}
      <div className="space-y-4">
        {sections.map((section) => (
          <motion.div
            key={section.id}
            className="bg-white rounded-lg border border-gray-200 overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                {section.icon}
                <span className="font-medium text-gray-900">{section.title}</span>
              </div>
              {expandedSections.has(section.id) ? (
                <ChevronDownIcon className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRightIcon className="w-5 h-5 text-gray-400" />
              )}
            </button>
            
            {expandedSections.has(section.id) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="px-6 pb-6"
              >
                {section.content || (
                  <p className="text-gray-500 italic">No {section.title.toLowerCase()} found in this comparison</p>
                )}
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
} 