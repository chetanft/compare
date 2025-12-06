import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import ComparisonForm from '../components/forms/ComparisonForm'
import ProgressTracker from '../components/ui/ProgressTracker'
import { ComparisonResultView } from '../components/comparison/ComparisonResultView'
import { ComparisonResult } from '../types'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { getApiBaseUrl } from '../utils/environment'
import { GlassCard, GlassContent } from '@/components/ui/GlassCard'

export default function NewComparison() {
  const [activeComparison, setActiveComparison] = useState<string | null>(null)
  const { toast } = useToast()
  const [showProgress, setShowProgress] = useState(false)
  const [result, setResult] = useState<ComparisonResult | null>(null)
  const [reportUrl, setReportUrl] = useState<string | null>(null)
  const [isSavingReport, setIsSavingReport] = useState(false)

  // Handlers
  const handleComparisonStart = (comparisonId: string) => {
    setActiveComparison(comparisonId)
    setShowProgress(true)
    setResult(null)
  }

  const handleComparisonComplete = (result: any) => {
    console.log('Extraction completed:', result)
    setResult(result)
    setShowProgress(false)
    setActiveComparison(null)
  }

  const handleComparisonError = (error: any) => {
    console.error('Extraction failed:', error)
    toast({
      title: "Comparison Failed",
      description: error.message || "An error occurred during comparison",
      variant: "destructive"
    })
    setTimeout(() => {
      setShowProgress(false)
      setActiveComparison(null)
    }, 3000)
  }

  const handleSuccess = (comparisonResult: ComparisonResult) => {
    setResult(comparisonResult)

    // Check if reports are available in the result
    if (comparisonResult?.reports?.directUrl) {
      const apiBaseUrl = getApiBaseUrl();
      setReportUrl(`${apiBaseUrl}${comparisonResult.reports.directUrl}`);
    } else if (comparisonResult?.reportPath) {
      const apiBaseUrl = getApiBaseUrl();
      setReportUrl(`${apiBaseUrl}${comparisonResult.reportPath}`);
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

      if (data.reports?.directUrl) {
        setReportUrl(`${apiBaseUrl}${data.reports.directUrl}`)
      }

      toast({
        title: 'Report saved',
        description: 'The comparison report has been saved.'
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

  const handleReset = () => {
    setResult(null)
    setActiveComparison(null)
    setShowProgress(false)
    setReportUrl(null)
  }

  return (
    <div className="content-container max-w-7xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Main Content Area */}
        <div className="mx-auto">
          {result ? (
            <ComparisonResultView
              result={result}
              onReset={handleReset}
              onSaveReport={handleSaveReport}
              isSavingReport={isSavingReport}
              reportUrl={reportUrl}
            />
          ) : (
            <>
              {!showProgress ? (
                <div className="max-w-4xl mx-auto">
                  <ComparisonForm onComparisonStart={handleComparisonStart} onSuccess={handleSuccess} />
                </div>
              ) : (
                <div className="max-w-xl mx-auto space-y-6 py-12">
                  <GlassCard className="p-8">
                    <GlassContent>
                      <div className="space-y-8">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-semibold text-foreground">
                            Processing Comparison
                          </h3>
                          <Button
                            onClick={handleReset}
                            variant="outline"
                            size="sm"
                            className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
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
                    </GlassContent>
                  </GlassCard>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}