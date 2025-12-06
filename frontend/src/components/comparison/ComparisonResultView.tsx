import { ComparisonResult } from '@/types'
import { motion } from 'framer-motion'
import { SummaryStats } from './SummaryStats'
import { VisualTokenComparison } from './VisualTokenComparison'
import { Button } from '@/components/ui/button'
import ExtractionDetailsView from '../reports/ExtractionDetailsView'
import { GlassCard, GlassContent } from '@/components/ui/GlassCard'
import { Palette, Type, Ruler, BoxSelect, Download, EyeIcon, RepeatIcon, ArrowLeftIcon } from 'lucide-react'
import { getApiBaseUrl } from '@/utils/environment'
import { cn } from '@/lib/utils'
import { getColorComparisonData, getTypographyComparisonData, getSpacingComparisonData, getBorderRadiusComparisonData } from '@/utils/comparisonUtils'

interface ComparisonResultViewProps {
    result: ComparisonResult
    onReset: () => void
    onSaveReport: () => void
    isSavingReport: boolean
    reportUrl: string | null
}

export function ComparisonResultView({
    result,
    onReset,
    onSaveReport,
    isSavingReport,
    reportUrl
}: ComparisonResultViewProps) {

    const figmaCount = result.figmaData?.componentCount || result.extractionDetails?.figma?.componentCount || 0
    const webCount = result.webData?.elementCount || result.extractionDetails?.web?.elementCount || 0
    const matches = result.extractionDetails?.comparison?.matches || 0
    const deviations = result.extractionDetails?.comparison?.deviations || 0
    const matchPercentage = Math.round(result.extractionDetails?.comparison?.matchPercentage || 0)

    // Use extracted utility functions
    const colorData = getColorComparisonData(result)
    const typographyData = getTypographyComparisonData(result)
    const spacingData = getSpacingComparisonData(result)
    const borderRadiusData = getBorderRadiusComparisonData(result)

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
        >
            {/* Header Actions */}
            <div className="flex items-center justify-between mb-8">
                <Button variant="ghost" onClick={onReset} className="gap-2 text-muted-foreground hover:text-foreground">
                    <ArrowLeftIcon className="w-4 h-4" />
                    Back to Dashboard
                </Button>
                <div className="flex items-center gap-4">
                    {reportUrl && (
                        <Button variant="outline" onClick={() => window.open(reportUrl, '_blank')} className="gap-2">
                            <EyeIcon className="w-4 h-4" />
                            View Report
                        </Button>
                    )}
                    <Button onClick={onSaveReport} disabled={isSavingReport} className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25">
                        <Download className="w-4 h-4" />
                        {isSavingReport ? 'Saving...' : 'Save Report'}
                    </Button>
                </div>
            </div>

            <SummaryStats
                figmaCount={figmaCount}
                webCount={webCount}
                matches={matches}
                deviations={deviations}
                matchPercentage={matchPercentage}
            />

            {/* Visual Analysis Grid */}
            <div className="space-y-12">
                <div>
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-muted-foreground mb-6">
                        Visual Analysis
                    </h2>
                    <div className="grid grid-cols-1 gap-6">
                        {colorData && (
                            <VisualTokenComparison
                                title="Color Palette"
                                icon={<Palette className="w-5 h-5" />}
                                figmaTokens={colorData.figmaTokens}
                                webTokens={colorData.webTokens}
                                matchedTokens={colorData.matchedTokens}
                                missingTokens={colorData.missingTokens}
                                extraTokens={colorData.extraTokens}
                                similarity={colorData.similarity}
                                type="color"
                                delay={0.4}
                            />
                        )}

                        {typographyData.figmaTokens.length > 0 && (
                            <VisualTokenComparison
                                title="Typography"
                                icon={<Type className="w-5 h-5" />}
                                figmaTokens={typographyData.figmaTokens}
                                webTokens={typographyData.webTokens}
                                matchedTokens={typographyData.matchedTokens}
                                missingTokens={typographyData.missingTokens}
                                extraTokens={typographyData.extraTokens}
                                similarity={typographyData.similarity}
                                type="typography"
                                delay={0.5}
                            />
                        )}

                        <div className="grid md:grid-cols-2 gap-6">
                            {spacingData && (
                                <VisualTokenComparison
                                    title="Spacing"
                                    icon={<Ruler className="w-5 h-5" />}
                                    figmaTokens={spacingData.figmaTokens}
                                    webTokens={spacingData.webTokens}
                                    matchedTokens={spacingData.matchedTokens}
                                    missingTokens={spacingData.missingTokens}
                                    extraTokens={spacingData.extraTokens}
                                    similarity={spacingData.similarity}
                                    type="spacing"
                                    delay={0.6}
                                />
                            )}

                            {borderRadiusData && (
                                <VisualTokenComparison
                                    title="Border Radius"
                                    icon={<BoxSelect className="w-5 h-5" />}
                                    figmaTokens={borderRadiusData.figmaTokens}
                                    webTokens={borderRadiusData.webTokens}
                                    matchedTokens={borderRadiusData.matchedTokens}
                                    missingTokens={borderRadiusData.missingTokens}
                                    extraTokens={borderRadiusData.extraTokens}
                                    similarity={borderRadiusData.similarity}
                                    type="spacing"
                                    delay={0.7}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Detailed Extraction Data */}
                {result.extractionDetails && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                    >
                        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-muted-foreground mb-6">
                            Raw Extraction Data
                        </h2>
                        <GlassCard>
                            <GlassContent>
                                <ExtractionDetailsView extractionDetails={result.extractionDetails} />
                            </GlassContent>
                        </GlassCard>
                    </motion.div>
                )}
            </div>
        </motion.div>
    )
}
