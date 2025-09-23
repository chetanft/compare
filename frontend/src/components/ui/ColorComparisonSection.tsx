import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { 
  SwatchIcon, 
  ArrowRightIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

interface ColorMatch {
  figmaColor: string
  webColor: string
  similarity: number
  status: 'exact' | 'similar' | 'different'
  figmaElements: string[]
  webElements: string[]
}

interface ColorComparisonSectionProps {
  figmaData: any
  webData: any
  className?: string
}

const ColorComparisonSection: React.FC<ColorComparisonSectionProps> = ({ 
  figmaData, 
  webData, 
  className = '' 
}) => {
  const [colorMatches, setColorMatches] = useState<ColorMatch[]>([])
  const [uniqueFigmaColors, setUniqueFigmaColors] = useState<string[]>([])
  const [uniqueWebColors, setUniqueWebColors] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (figmaData && webData) {
      analyzeColorComparison()
    }
  }, [figmaData, webData])

  const analyzeColorComparison = async () => {
    setIsLoading(true)
    try {
      const figmaColors = extractColorsFromData(figmaData)
      const webColors = extractColorsFromData(webData)
      
      const matches: ColorMatch[] = []
      const usedWebColors = new Set<string>()
      
      // Find matches for each Figma color
      for (const figmaColor of figmaColors) {
        let bestMatch: ColorMatch | null = null
        let bestSimilarity = 0
        
        for (const webColor of webColors) {
          if (usedWebColors.has(webColor)) continue
          
          const similarity = calculateColorSimilarity(figmaColor, webColor)
          if (similarity > bestSimilarity) {
            bestSimilarity = similarity
            bestMatch = {
              figmaColor,
              webColor,
              similarity,
              status: similarity >= 0.95 ? 'exact' : similarity >= 0.8 ? 'similar' : 'different',
              figmaElements: await getElementsForColor(figmaColor, 'figma'),
              webElements: await getElementsForColor(webColor, 'web')
            }
          }
        }
        
        if (bestMatch && bestMatch.similarity >= 0.5) {
          matches.push(bestMatch)
          usedWebColors.add(bestMatch.webColor)
        }
      }
      
      setColorMatches(matches)
      setUniqueFigmaColors(figmaColors.filter(color => 
        !matches.some(match => match.figmaColor === color)
      ))
      setUniqueWebColors(webColors.filter(color => 
        !matches.some(match => match.webColor === color)
      ))
    } catch (error) {
      console.error('Error analyzing color comparison:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const extractColorsFromData = (data: any): string[] => {
    const colors = new Set<string>()
    
    const extractFromObject = (obj: any) => {
      if (!obj || typeof obj !== 'object') return
      
      Object.entries(obj).forEach(([key, value]) => {
        if (typeof value === 'string' && value.match(/^#[0-9A-Fa-f]{6}$/)) {
          colors.add(value)
        } else if (key.toLowerCase().includes('color') && typeof value === 'string' && value.startsWith('#')) {
          colors.add(value)
        } else if (typeof value === 'object') {
          extractFromObject(value)
        } else if (Array.isArray(value)) {
          value.forEach(extractFromObject)
        }
      })
    }
    
    extractFromObject(data)
    return Array.from(colors)
  }

  const calculateColorSimilarity = (color1: string, color2: string): number => {
    const rgb1 = hexToRgb(color1)
    const rgb2 = hexToRgb(color2)
    
    if (!rgb1 || !rgb2) return 0
    
    const rDiff = Math.abs(rgb1.r - rgb2.r) / 255
    const gDiff = Math.abs(rgb1.g - rgb2.g) / 255
    const bDiff = Math.abs(rgb1.b - rgb2.b) / 255
    
    const avgDiff = (rDiff + gDiff + bDiff) / 3
    return 1 - avgDiff
  }

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  }

  const getElementsForColor = async (color: string, source: 'figma' | 'web'): Promise<string[]> => {
    try {
      const response = await fetch(`/api/colors/colors/${encodeURIComponent(color)}/elements`)
      if (response.ok) {
        const elements = await response.json()
        return elements
          .filter((el: any) => el.source === source)
          .map((el: any) => el.name)
          .slice(0, 3) // Limit to first 3 elements
      }
    } catch (error) {
      console.warn(`Failed to fetch elements for color ${color}:`, error)
    }
    return []
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'exact':
        return <CheckCircleIcon className="h-4 w-4 text-green-600" />
      case 'similar':
        return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" />
      case 'different':
        return <XCircleIcon className="h-4 w-4 text-red-600" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'exact':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'similar':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'different':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  if (!figmaData || !webData) {
    return null
  }

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <SwatchIcon className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg">Color Comparison Analysis</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="text-xs">
              {colorMatches.length} matches
            </Badge>
            <Badge variant="outline" className="text-xs">
              {uniqueFigmaColors.length + uniqueWebColors.length} unique
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
            <span className="ml-2 text-sm text-gray-600">Analyzing color differences...</span>
          </div>
        ) : (
          <Tabs defaultValue="matches" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="matches">
                Color Matches ({colorMatches.length})
              </TabsTrigger>
              <TabsTrigger value="figma-only">
                Figma Only ({uniqueFigmaColors.length})
              </TabsTrigger>
              <TabsTrigger value="web-only">
                Web Only ({uniqueWebColors.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="matches" className="mt-4">
              <div className="space-y-3">
                {colorMatches.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <SwatchIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No color matches found</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {colorMatches.map((match, index) => (
                      <motion.div
                        key={`${match.figmaColor}-${match.webColor}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: index * 0.05 }}
                        className={`p-3 rounded-lg border ${getStatusColor(match.status)}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              <div 
                                className="w-5 h-5 rounded border-2 border-white shadow-sm"
                                style={{ backgroundColor: match.figmaColor }}
                                title={`Figma: ${match.figmaColor}`}
                              />
                              <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                              <div 
                                className="w-5 h-5 rounded border-2 border-white shadow-sm"
                                style={{ backgroundColor: match.webColor }}
                                title={`Web: ${match.webColor}`}
                              />
                            </div>
                            <div>
                              <span className="font-mono text-xs">
                                {match.figmaColor} → {match.webColor}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(match.status)}
                            <Badge variant="outline" className="text-xs">
                              {Math.round(match.similarity * 100)}% match
                            </Badge>
                          </div>
                        </div>
                        
                        {(match.figmaElements.length > 0 || match.webElements.length > 0) && (
                          <div className="mt-2 text-xs text-gray-600">
                            {match.figmaElements.length > 0 && (
                              <div>
                                <span className="font-medium">Figma:</span> {match.figmaElements.join(', ')}
                              </div>
                            )}
                            {match.webElements.length > 0 && (
                              <div>
                                <span className="font-medium">Web:</span> {match.webElements.join(', ')}
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="figma-only" className="mt-4">
              <div className="space-y-2">
                {uniqueFigmaColors.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <CheckCircleIcon className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <p className="text-sm">All Figma colors have web equivalents</p>
                  </div>
                ) : (
                  uniqueFigmaColors.map((color) => (
                    <div key={color} className="flex items-center space-x-3 p-2 bg-blue-50 rounded border border-blue-200">
                      <div 
                        className="w-5 h-5 rounded border-2 border-white shadow-sm"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                      <span className="font-mono text-sm">{color}</span>
                      <Badge variant="secondary" className="text-xs">Figma only</Badge>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="web-only" className="mt-4">
              <div className="space-y-2">
                {uniqueWebColors.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <CheckCircleIcon className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <p className="text-sm">All web colors have Figma equivalents</p>
                  </div>
                ) : (
                  uniqueWebColors.map((color) => (
                    <div key={color} className="flex items-center space-x-3 p-2 bg-orange-50 rounded border border-orange-200">
                      <div 
                        className="w-5 h-5 rounded border-2 border-white shadow-sm"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                      <span className="font-mono text-sm">{color}</span>
                      <Badge variant="secondary" className="text-xs">Web only</Badge>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}

export default ColorComparisonSection
