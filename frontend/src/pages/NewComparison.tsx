import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import ComparisonForm from '../components/forms/ComparisonForm'
import ProgressTracker from '../components/ui/ProgressTracker'
import { ComparisonResult } from '../types'
import { DocumentTextIcon, EyeIcon } from '@heroicons/react/24/outline'
import { Download } from 'lucide-react'
import { getApiBaseUrl } from '../utils/environment'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent } from '@/components/ui/card'
import ExtractionDetailsView from '../components/reports/ExtractionDetailsView'
import { VisualTokenComparison } from '../components/comparison/VisualTokenComparison'
import { Palette, Type, Ruler, BoxSelect } from 'lucide-react'

export default function NewComparison() {
  const [activeComparison, setActiveComparison] = useState<string | null>(null)
  const { toast } = useToast()
  const [showProgress, setShowProgress] = useState(false)
  const [result, setResult] = useState<ComparisonResult | null>(null)
  const [reportUrl, setReportUrl] = useState<string | null>(null)
  const [isSavingReport, setIsSavingReport] = useState(false)
  const navigate = useNavigate()

  const handleComparisonStart = (comparisonId: string) => {
    setActiveComparison(comparisonId)
    setShowProgress(true)
  }

  const handleComparisonComplete = (result: any) => {
    console.log('Extraction completed:', result)
    // Instead of redirecting immediately, show the result
    setResult(result)
    setShowProgress(false)
    setActiveComparison(null)
  }

  const handleComparisonError = (error: any) => {
    console.error('Extraction failed:', error)
    // Show error message and allow retry
    setTimeout(() => {
      setShowProgress(false)
      setActiveComparison(null)
    }, 3000)
  }

  const handleSuccess = (comparisonResult: ComparisonResult) => {
    console.log('🔍 NewComparison handleSuccess received:', JSON.stringify(comparisonResult, null, 2));
    console.log('🔍 NewComparison: comparisonResult.data exists?', !!comparisonResult?.data);
    console.log('🔍 NewComparison: comparisonResult.extractionDetails exists?', !!comparisonResult?.extractionDetails);
    console.log('🔍 NewComparison: comparisonResult.data?.extractionDetails exists?', !!comparisonResult?.data?.extractionDetails);
    console.log('🔍 NewComparison: comparisonResult.reportPath:', comparisonResult?.reportPath);
    console.log('🔍 NewComparison: comparisonResult.data?.reportPath:', comparisonResult?.data?.reportPath);
    
    // The API service already returns the correct structure
    setResult(comparisonResult)
    
    // Check if reports are available in the result
    if (comparisonResult?.reports?.directUrl) {
      console.log('🔍 DEBUG: Using reports.directUrl structure');
      // Store the report URL for direct access, including the API base URL
      const apiBaseUrl = getApiBaseUrl();
      setReportUrl(`${apiBaseUrl}${comparisonResult.reports.directUrl}`);
    } else if (comparisonResult?.reportPath) {
      console.log('🔍 DEBUG: Using reportPath structure');
      // Handle new reportPath structure
      const apiBaseUrl = getApiBaseUrl();
      setReportUrl(`${apiBaseUrl}${comparisonResult.reportPath}`);
    } else {
      console.log('🔍 DEBUG: No report URL found in either structure');
    }
  }

  const openReportInNewTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  // Helper function to calculate similarity percentage
  const calculateSimilarity = (matched: number, total: number): number => {
    if (total === 0) return 0
    return Math.round((matched / total) * 100)
  }

  // Helper function to extract color comparison data
  const getColorComparisonData = () => {
    // Try multiple data sources
    const analysis = result?.colorAnalysis || result?.comparison?.colorAnalysis
    
    // Get colors from extraction details if analysis doesn't exist
    let figmaColors = analysis?.figmaColors || result?.extractionDetails?.figma?.colors || result?.figmaData?.colors || []
    let webColors = analysis?.webColors || analysis?.developedColors || result?.extractionDetails?.web?.colors || result?.webData?.colors || []
    let matched = analysis?.matchedColors || []
    let missing = analysis?.missingColors || []
    let extra = analysis?.extraColors || []
    
    // Ensure all are arrays
    figmaColors = Array.isArray(figmaColors) ? figmaColors : []
    webColors = Array.isArray(webColors) ? webColors : []
    matched = Array.isArray(matched) ? matched : []
    missing = Array.isArray(missing) ? missing : []
    extra = Array.isArray(extra) ? extra : []
    
    // If we have colors but no analysis, do basic matching
    if (figmaColors.length > 0 && matched.length === 0) {
      figmaColors.forEach((figmaColor: any) => {
        const figmaValue = figmaColor.value || figmaColor
        const webMatch = webColors.find((webColor: any) => {
          const webValue = webColor.value || webColor
          return figmaValue.toLowerCase() === webValue.toLowerCase()
        })
        if (webMatch) {
          matched.push({ figma: figmaColor, web: webMatch, similarity: 100 })
        } else {
          missing.push(figmaColor)
        }
      })
      
      webColors.forEach((webColor: any) => {
        const webValue = webColor.value || webColor
        const figmaMatch = figmaColors.find((figmaColor: any) => {
          const figmaValue = figmaColor.value || figmaColor
          return figmaValue.toLowerCase() === webValue.toLowerCase()
        })
        if (!figmaMatch) {
          extra.push(webColor)
        }
      })
    }
    
    // Only return if we have data
    if (figmaColors.length === 0 && webColors.length === 0) return null
    
    return {
      figmaTokens: figmaColors,
      webTokens: webColors,
      matchedTokens: matched.map((m: any) => ({
        figma: m.figma || m.figmaColor,
        web: m.web || m.developedColor,
        similarity: m.similarity || m.matchPercentage || 100
      })),
      missingTokens: missing,
      extraTokens: extra,
      similarity: analysis?.similarity || calculateSimilarity(matched.length, figmaColors.length)
    }
  }

  // Helper function to extract typography comparison data
  const getTypographyComparisonData = () => {
    // Handle both array and object formats
    let figmaTypography = result?.figmaData?.typography || result?.extractionDetails?.figma?.typography || []
    let webTypography = result?.webData?.typography || []
    
    // Convert object to array if needed
    if (!Array.isArray(figmaTypography) && typeof figmaTypography === 'object') {
      figmaTypography = Object.values(figmaTypography)
    }
    if (!Array.isArray(webTypography) && typeof webTypography === 'object') {
      webTypography = Object.values(webTypography)
    }
    
    // Ensure arrays
    figmaTypography = Array.isArray(figmaTypography) ? figmaTypography : []
    webTypography = Array.isArray(webTypography) ? webTypography : []
    
    // Simple matching logic based on font family
    const matched: any[] = []
    const missing: any[] = []
    const extra: any[] = []
    
    figmaTypography.forEach((figmaFont: any) => {
      const webMatch = webTypography.find((webFont: any) => 
        webFont.fontFamily?.toLowerCase() === figmaFont.fontFamily?.toLowerCase()
      )
      if (webMatch) {
        matched.push({
          figma: figmaFont,
          web: webMatch,
          similarity: 95 // Simplified similarity
        })
      } else {
        missing.push(figmaFont)
      }
    })
    
    webTypography.forEach((webFont: any) => {
      const figmaMatch = figmaTypography.find((figmaFont: any) =>
        figmaFont.fontFamily?.toLowerCase() === webFont.fontFamily?.toLowerCase()
      )
      if (!figmaMatch) {
        extra.push(webFont)
      }
    })
    
    return {
      figmaTokens: figmaTypography,
      webTokens: webTypography,
      matchedTokens: matched,
      missingTokens: missing,
      extraTokens: extra,
      similarity: calculateSimilarity(matched.length, figmaTypography.length)
    }
  }

  // Helper function to extract spacing comparison data
  const getSpacingComparisonData = () => {
    let figmaSpacing = result?.extractionDetails?.figma?.spacing || result?.figmaData?.spacing || []
    let webSpacing = result?.extractionDetails?.web?.spacing || result?.webData?.spacing || []
    
    // Ensure arrays
    figmaSpacing = Array.isArray(figmaSpacing) ? figmaSpacing : []
    webSpacing = Array.isArray(webSpacing) ? webSpacing : []
    
    if (figmaSpacing.length === 0 && webSpacing.length === 0) return null
    
    const matched: any[] = []
    const missing: any[] = []
    const extra: any[] = []
    
    figmaSpacing.forEach((spacing: any) => {
      const match = webSpacing.find((w: any) => w === spacing || w.value === spacing)
      if (match) {
        matched.push({ figma: spacing, web: match, similarity: 100 })
      } else {
        missing.push(spacing)
      }
    })
    
    webSpacing.forEach((spacing: any) => {
      const match = figmaSpacing.find((f: any) => f === spacing || f.value === spacing)
      if (!match) extra.push(spacing)
    })
    
    return {
      figmaTokens: figmaSpacing,
      webTokens: webSpacing,
      matchedTokens: matched,
      missingTokens: missing,
      extraTokens: extra,
      similarity: calculateSimilarity(matched.length, figmaSpacing.length)
    }
  }

  // Helper function to extract border radius comparison data
  const getBorderRadiusComparisonData = () => {
    let figmaBorderRadius = result?.extractionDetails?.figma?.borderRadius || result?.figmaData?.borderRadius || []
    let webBorderRadius = result?.extractionDetails?.web?.borderRadius || result?.webData?.borderRadius || []
    
    // Ensure arrays
    figmaBorderRadius = Array.isArray(figmaBorderRadius) ? figmaBorderRadius : []
    webBorderRadius = Array.isArray(webBorderRadius) ? webBorderRadius : []
    
    if (figmaBorderRadius.length === 0 && webBorderRadius.length === 0) return null
    
    const matched: any[] = []
    const missing: any[] = []
    const extra: any[] = []
    
    figmaBorderRadius.forEach((radius: any) => {
      const match = webBorderRadius.find((w: any) => w === radius || w.value === radius)
      if (match) {
        matched.push({ figma: radius, web: match, similarity: 100 })
      } else {
        missing.push(radius)
      }
    })
    
    webBorderRadius.forEach((radius: any) => {
      const match = figmaBorderRadius.find((f: any) => f === radius || f.value === radius)
      if (!match) extra.push(radius)
    })
    
    return {
      figmaTokens: figmaBorderRadius,
      webTokens: webBorderRadius,
      matchedTokens: matched,
      missingTokens: missing,
      extraTokens: extra,
      similarity: calculateSimilarity(matched.length, figmaBorderRadius.length)
    }
  }

  const handleSaveReport = async () => {
    if (!result?.comparisonId && !result?.id) {
      toast({
        title: 'Cannot save report',
        description: 'Comparison identifier is missing. Please rerun the comparison.',
        variant: 'destructive'
      })
      return
    }

    const comparisonId = result?.comparisonId || result?.id

    try {
      setIsSavingReport(true)
      const apiBaseUrl = getApiBaseUrl()
      const response = await fetch(`${apiBaseUrl}/api/reports/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comparisonId })
      })

      if (!response.ok) {
        throw new Error(`Save failed with status ${response.status}`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Unknown error while saving report')
      }

      setResult(prev => prev ? ({
        ...prev,
        reports: data.reports || data.report || prev.reports
      }) : prev)

      toast({
        title: 'Report saved',
        description: 'The comparison report has been saved and will appear below.'
      })
    } catch (error: any) {
      toast({
        title: 'Failed to save report',
        description: error.message || 'Unexpected error encountered',
        variant: 'destructive'
      })
    } finally {
      setIsSavingReport(false)
    }
  }

  if (result) {
    return (
      <div className="p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <DocumentTextIcon className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Extraction Complete!</h1>
            <p className="text-muted-foreground">Your design and web data has been extracted successfully.</p>
            
            {/* Show direct link to report if available */}
            {reportUrl && (
              <div className="mt-4">
                <Button
                  onClick={() => openReportInNewTab(reportUrl)}
                  className="inline-flex items-center"
                >
                  <EyeIcon className="w-5 h-5 mr-2" />
                  View Report
                </Button>
              </div>
            )}
          </div>

          {/* Results Summary */}
          <div className="layout-grid-data mb-8">
            <div className="card text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {result.figmaData?.componentCount || result.extractionDetails?.figma?.componentCount || 0}
              </div>
              <div className="text-sm text-muted-foreground">Figma Components</div>
            </div>
            <div className="card text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {result.webData?.elementCount || result.extractionDetails?.web?.elementCount || 0}
              </div>
              <div className="text-sm text-muted-foreground">Web Elements</div>
            </div>
          </div>

          {/* Comparison Results */}
          {result.extractionDetails?.comparison && (
            <div className="mb-8">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Comparison Results</h2>
                  <div className="grid-standard-3 space-standard-lg">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600 mb-2">
                        {result.extractionDetails.comparison.matches || 0}
                      </div>
                      <div className="text-muted-foreground">Matches Found</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-600 mb-2">
                        {result.extractionDetails.comparison.deviations || 0}
                      </div>
                      <div className="text-muted-foreground">Deviations</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-2">
                        {Math.round(result.extractionDetails.comparison.matchPercentage || 0)}%
                      </div>
                      <div className="text-muted-foreground">Match Rate</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Extraction Details */}
          {result.extractionDetails && (
            <div className="mb-8">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Extraction Details</h2>
                  <ExtractionDetailsView extractionDetails={result.extractionDetails} />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Visual Token Comparisons */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Visual Design Token Analysis</h2>
            
            {/* Color Comparison */}
            {(() => {
              const colorData = getColorComparisonData()
              return colorData && (
                <VisualTokenComparison
                  title="Color Palette"
                  icon={<Palette className="w-6 h-6" />}
                  figmaTokens={colorData.figmaTokens}
                  webTokens={colorData.webTokens}
                  matchedTokens={colorData.matchedTokens}
                  missingTokens={colorData.missingTokens}
                  extraTokens={colorData.extraTokens}
                  similarity={colorData.similarity}
                  type="color"
                />
              )
            })()}

            {/* Typography Comparison */}
            {(() => {
              const typographyData = getTypographyComparisonData()
              return typographyData.figmaTokens.length > 0 && (
                <VisualTokenComparison
                  title="Typography"
                  icon={<Type className="w-6 h-6" />}
                  figmaTokens={typographyData.figmaTokens}
                  webTokens={typographyData.webTokens}
                  matchedTokens={typographyData.matchedTokens}
                  missingTokens={typographyData.missingTokens}
                  extraTokens={typographyData.extraTokens}
                  similarity={typographyData.similarity}
                  type="typography"
                />
              )
            })()}

            {/* Spacing Comparison */}
            {(() => {
              const spacingData = getSpacingComparisonData()
              return spacingData && (
                <VisualTokenComparison
                  title="Spacing"
                  icon={<Ruler className="w-6 h-6" />}
                  figmaTokens={spacingData.figmaTokens}
                  webTokens={spacingData.webTokens}
                  matchedTokens={spacingData.matchedTokens}
                  missingTokens={spacingData.missingTokens}
                  extraTokens={spacingData.extraTokens}
                  similarity={spacingData.similarity}
                  type="spacing"
                />
              )
            })()}

            {/* Border Radius Comparison */}
            {(() => {
              const borderRadiusData = getBorderRadiusComparisonData()
              return borderRadiusData && (
                <VisualTokenComparison
                  title="Border Radius"
                  icon={<BoxSelect className="w-6 h-6" />}
                  figmaTokens={borderRadiusData.figmaTokens}
                  webTokens={borderRadiusData.webTokens}
                  matchedTokens={borderRadiusData.matchedTokens}
                  missingTokens={borderRadiusData.missingTokens}
                  extraTokens={borderRadiusData.extraTokens}
                  similarity={borderRadiusData.similarity}
                  type="spacing"
                />
              )
            })()}
          </div>

          {/* Report Links */}
          <div className="card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Generated Reports</h3>
                <p className="text-xs text-muted-foreground">Save the comparison to generate downloadable reports.</p>
              </div>
              <Button size="sm" onClick={handleSaveReport} disabled={isSavingReport} className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                {isSavingReport ? 'Saving…' : 'Save Report'}
              </Button>
            </div>
            <div className="space-y-3">
              {result?.reports?.directUrl && (
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    const apiBaseUrl = getApiBaseUrl();
                    if (result.reports?.directUrl) {
                      openReportInNewTab(`${apiBaseUrl}${result.reports.directUrl}`);
                    }
                  }}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <EyeIcon className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-gray-900">HTML Report</div>
                      <div className="text-sm text-muted-foreground">Interactive data visualization</div>
                    </div>
                  </div>
                  <div className="text-sm text-indigo-600 font-medium">View Report →</div>
                </a>
              )}

              {result?.reports?.downloadUrl && (
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    const apiBaseUrl = getApiBaseUrl();
                    if (result.reports?.downloadUrl) {
                      openReportInNewTab(`${apiBaseUrl}${result.reports.downloadUrl}`);
                    }
                  }}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <DocumentTextIcon className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-gray-900">JSON Data</div>
                      <div className="text-sm text-muted-foreground">Raw extraction data</div>
                    </div>
                  </div>
                  <div className="text-sm text-indigo-600 font-medium">Download →</div>
                </a>
              )}

              {result?.reportPath && (
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    const apiBaseUrl = getApiBaseUrl();
                    if (result.reportPath) {
                      openReportInNewTab(`${apiBaseUrl}${result.reportPath}`);
                    }
                  }}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <DocumentTextIcon className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-gray-900">HTML Comparison Report</div>
                      <div className="text-sm text-muted-foreground">Complete comparison analysis</div>
                    </div>
                  </div>
                  <div className="text-sm text-indigo-600 font-medium">Download →</div>
                </a>
              )}

              {!result?.reports?.directUrl && !result?.reports?.downloadUrl && !result?.reportPath && (
                <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                  No reports yet. Run “Save Report” to generate downloadable files.
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-center space-x-4 mt-8">
            <Button
              onClick={() => setResult(null)}
            >
              Run Another Extraction
            </Button>
            <Button
              onClick={() => navigate('/')}
              variant="outline"
            >
              Back to Dashboard
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="content-container max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="max-w-4xl mx-auto">
          {!showProgress ? (
            <ComparisonForm onComparisonStart={handleComparisonStart} onSuccess={handleSuccess} />
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Button
                  onClick={() => {
                    setShowProgress(false)
                    setActiveComparison(null)
                  }}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
              
              {activeComparison && (
                <ProgressTracker
                  comparisonId={activeComparison}
                  onComplete={handleComparisonComplete}
                  onError={handleComparisonError}
                />
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
} 