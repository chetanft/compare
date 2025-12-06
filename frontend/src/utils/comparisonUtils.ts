import { ComparisonResult } from '@/types'

// Helper function to calculate similarity percentage
export const calculateSimilarity = (matched: number, total: number): number => {
    if (total === 0) return 0
    return Math.round((matched / total) * 100)
}

// Helper function to extract color comparison data
export const getColorComparisonData = (result: ComparisonResult) => {
    const analysis = result?.colorAnalysis || result?.comparison?.colorAnalysis
    let figmaColors = analysis?.figmaColors || result?.extractionDetails?.figma?.colors || result?.figmaData?.colors || []
    let webColors = analysis?.webColors || analysis?.developedColors || result?.extractionDetails?.web?.colors || result?.webData?.colors || []
    let matched = analysis?.matchedColors || []
    let missing = analysis?.missingColors || []
    let extra = analysis?.extraColors || []

    // Normalize data
    figmaColors = Array.isArray(figmaColors) ? figmaColors : []
    webColors = Array.isArray(webColors) ? webColors : []
    matched = Array.isArray(matched) ? matched : []
    missing = Array.isArray(missing) ? missing : []
    extra = Array.isArray(extra) ? extra : []

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
export const getTypographyComparisonData = (result: ComparisonResult) => {
    let figmaTypography = result?.figmaData?.typography || result?.extractionDetails?.figma?.typography || []
    let webTypography = result?.webData?.typography || []

    if (!Array.isArray(figmaTypography) && typeof figmaTypography === 'object') figmaTypography = Object.values(figmaTypography)
    if (!Array.isArray(webTypography) && typeof webTypography === 'object') webTypography = Object.values(webTypography)

    figmaTypography = Array.isArray(figmaTypography) ? figmaTypography : []
    webTypography = Array.isArray(webTypography) ? webTypography : []

    // Simplified matching
    const matched: any[] = []
    const missing: any[] = []
    const extra: any[] = []

    figmaTypography.forEach((figmaFont: any) => {
        const webMatch = webTypography.find((webFont: any) =>
            webFont.fontFamily?.toLowerCase() === figmaFont.fontFamily?.toLowerCase()
        )
        if (webMatch) matched.push({ figma: figmaFont, web: webMatch, similarity: 90 })
        else missing.push(figmaFont)
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
export const getSpacingComparisonData = (result: ComparisonResult) => {
    let figmaSpacing = result?.extractionDetails?.figma?.spacing || result?.figmaData?.spacing || []
    let webSpacing = result?.extractionDetails?.web?.spacing || result?.webData?.spacing || []

    figmaSpacing = Array.isArray(figmaSpacing) ? figmaSpacing : []
    webSpacing = Array.isArray(webSpacing) ? webSpacing : []

    if (figmaSpacing.length === 0 && webSpacing.length === 0) return null

    // Mock match for UI demo if no deep logic available
    const matched = figmaSpacing.filter((s: any) => webSpacing.includes(s)).map((s: any) => ({ figma: s, web: s, similarity: 100 }))

    return {
        figmaTokens: figmaSpacing,
        webTokens: webSpacing,
        matchedTokens: matched,
        missingTokens: [],
        extraTokens: [],
        similarity: calculateSimilarity(matched.length, figmaSpacing.length)
    }
}

// Helper function to extract border radius comparison data
export const getBorderRadiusComparisonData = (result: ComparisonResult) => {
    let figmaBorderRadius = result?.extractionDetails?.figma?.borderRadius || result?.figmaData?.borderRadius || []
    let webBorderRadius = result?.extractionDetails?.web?.borderRadius || result?.webData?.borderRadius || []

    figmaBorderRadius = Array.isArray(figmaBorderRadius) ? figmaBorderRadius : []
    webBorderRadius = Array.isArray(webBorderRadius) ? webBorderRadius : []

    if (figmaBorderRadius.length === 0 && webBorderRadius.length === 0) return null

    const matched = figmaBorderRadius.filter((s: any) => webBorderRadius.includes(s)).map((s: any) => ({ figma: s, web: s, similarity: 100 }))

    return {
        figmaTokens: figmaBorderRadius,
        webTokens: webBorderRadius,
        matchedTokens: matched,
        missingTokens: [],
        extraTokens: [],
        similarity: calculateSimilarity(matched.length, figmaBorderRadius.length)
    }
}
