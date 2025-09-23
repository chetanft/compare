import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SwatchIcon, MagnifyingGlassIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'

interface ColorElement {
  id: string
  name: string
  type: string
  source: 'figma' | 'web'
  colorType: 'fill' | 'stroke' | 'text' | 'background' | 'border'
  properties?: any
}

interface ColorUsage {
  color: string
  elements: ColorElement[]
  count: number
}

interface ColorUsageSectionProps {
  data: any
  source: 'figma' | 'web' | 'comparison'
  className?: string
}

const ColorUsageSection: React.FC<ColorUsageSectionProps> = ({ data, source, className = '' }) => {
  const [colorUsage, setColorUsage] = useState<ColorUsage[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchColorUsage()
  }, [data])

  const fetchColorUsage = async () => {
    if (!data) return
    
    setIsLoading(true)
    try {
      // Extract colors from the current data
      const colors = extractColorsFromData(data)
      
      // For each color, fetch associated elements
      const colorUsagePromises = colors.map(async (color) => {
        try {
          const response = await fetch(`/api/colors/colors/${encodeURIComponent(color)}/elements`)
          if (response.ok) {
            const elements = await response.json()
            return {
              color,
              elements: elements.filter((el: ColorElement) => source === 'comparison' || el.source === source),
              count: elements.length
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch elements for color ${color}:`, error)
        }
        return { color, elements: [], count: 0 }
      })
      
      const results = await Promise.all(colorUsagePromises)
      setColorUsage(results.filter(usage => usage.count > 0))
    } catch (error) {
      console.error('Error fetching color usage:', error)
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

  const filteredColorUsage = colorUsage.filter(usage =>
    usage.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
    usage.elements.some(el => 
      el.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      el.type.toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  const displayedUsage = isExpanded ? filteredColorUsage : filteredColorUsage.slice(0, 5)

  if (colorUsage.length === 0 && !isLoading) {
    return null
  }

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <SwatchIcon className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Color Usage Analysis</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {colorUsage.length} colors
            </Badge>
          </div>
        </div>
        
        {colorUsage.length > 0 && (
          <div className="flex items-center space-x-2 mt-2">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search colors or elements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-8 text-sm"
              />
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-sm text-gray-600">Loading color analysis...</span>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <AnimatePresence>
                {displayedUsage.map((usage) => (
                  <motion.div
                    key={usage.color}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-3 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-6 h-6 rounded border-2 border-white shadow-sm"
                          style={{ backgroundColor: usage.color }}
                          title={usage.color}
                        />
                        <div>
                          <span className="font-mono text-sm font-medium">{usage.color}</span>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {usage.count} element{usage.count !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    {usage.elements.length > 0 && (
                      <div className="mt-2">
                        <div className="flex flex-wrap gap-1">
                          {usage.elements.slice(0, 3).map((element, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {element.name} ({element.colorType})
                            </Badge>
                          ))}
                          {usage.elements.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{usage.elements.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            
            {filteredColorUsage.length > 5 && (
              <div className="flex justify-center mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-xs"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUpIcon className="h-4 w-4 mr-1" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDownIcon className="h-4 w-4 mr-1" />
                      Show All ({filteredColorUsage.length})
                    </>
                  )}
                </Button>
              </div>
            )}
            
            {filteredColorUsage.length === 0 && searchTerm && (
              <div className="text-center py-6 text-gray-500">
                <SwatchIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No colors found matching "{searchTerm}"</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default ColorUsageSection
