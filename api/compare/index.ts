/**
 * Comparison API Endpoint - Edge Runtime
 */

import { corsResponse, jsonResponse, methodNotAllowed, parseJsonBody } from '../../vercel/edge-helpers';

export const config = {
    runtime: 'edge'
};

export default async function handler(req: Request): Promise<Response> {
    if (req.method === 'OPTIONS') {
        return corsResponse();
    }

    if (req.method !== 'POST') {
        return methodNotAllowed(['POST']);
    }

    try {
        const body = await parseJsonBody<{ figmaData?: any; webData?: any; options?: any }>(req);

        if (!body || !body.figmaData || !body.webData) {
            return jsonResponse(
                {
                    error: 'Both figmaData and webData are required'
                },
                400
            );
        }

        const { figmaData, webData, options = {} } = body;
        const result = compareData(figmaData, webData, options);

        return jsonResponse({
            success: true,
            ...result,
            comparedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Comparison error:', error);
        return jsonResponse(
            {
                error: 'Comparison failed',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            500
        );
    }
}

/**
 * Compare Figma and web data
 */
function compareData(figmaData: any, webData: any, options: any = {}) {
    const thresholds = {
        colorDifference: options.colorDifference || 10,
        fontSizeDifference: options.fontSizeDifference || 2,
        spacingDifference: options.spacingDifference || 3,
    };

    // Compare colors
    const colorResult = compareColors(
        figmaData.colorPalette || [],
        webData.colorPalette || [],
        thresholds.colorDifference
    );

    // Compare typography
    const typographyResult = compareTypography(
        figmaData.typography || {},
        webData.typography || {},
        thresholds.fontSizeDifference
    );

    // Calculate overall score
    const scores = {
        colors: colorResult.score,
        typography: typographyResult.score,
    };

    const overallScore = (scores.colors + scores.typography) / 2;

    return {
        overallScore: Math.round(overallScore * 100),
        scores: {
            colors: Math.round(scores.colors * 100),
            typography: Math.round(scores.typography * 100),
        },
        colors: colorResult,
        typography: typographyResult,
        summary: {
            totalDeviations: colorResult.deviations.length + typographyResult.deviations.length,
            totalMatches: colorResult.matches.length + typographyResult.matches.length,
        },
    };
}

function compareColors(figmaColors: string[], webColors: string[], threshold: number) {
    const matches: any[] = [];
    const deviations: any[] = [];
    const figmaOnly: string[] = [];
    const webOnly: string[] = [];

    const normalizedWeb = webColors.map(c => normalizeColor(c));
    const normalizedFigma = figmaColors.map(c => normalizeColor(c));

    normalizedFigma.forEach((figmaColor, idx) => {
        const matchIdx = normalizedWeb.findIndex(webColor =>
            colorDistance(figmaColor, webColor) <= threshold
        );

        if (matchIdx !== -1) {
            matches.push({
                figma: figmaColors[idx],
                web: webColors[matchIdx],
                distance: colorDistance(figmaColor, normalizedWeb[matchIdx]),
            });
        } else {
            figmaOnly.push(figmaColors[idx]);
            deviations.push({
                property: 'color',
                figmaValue: figmaColors[idx],
                webValue: null,
                severity: 'medium',
                message: `Color ${figmaColors[idx]} not found in web`,
            });
        }
    });

    normalizedWeb.forEach((webColor, idx) => {
        const hasMatch = normalizedFigma.some(figmaColor =>
            colorDistance(figmaColor, webColor) <= threshold
        );
        if (!hasMatch) {
            webOnly.push(webColors[idx]);
        }
    });

    return {
        matches,
        deviations,
        figmaOnly,
        webOnly,
        score: matches.length / Math.max(figmaColors.length, 1),
    };
}

function compareTypography(figmaTypo: any, webTypo: any, threshold: number) {
    const matches: any[] = [];
    const deviations: any[] = [];

    // Compare font families
    const figmaFonts = figmaTypo.fontFamilies || [];
    const webFonts = webTypo.fontFamilies || [];

    figmaFonts.forEach((font: string) => {
        const normalized = font.toLowerCase().replace(/['"]/g, '');
        const found = webFonts.some((wf: string) =>
            wf.toLowerCase().replace(/['"]/g, '').includes(normalized)
        );

        if (found) {
            matches.push({ property: 'fontFamily', value: font });
        } else {
            deviations.push({
                property: 'fontFamily',
                figmaValue: font,
                webValue: null,
                severity: 'medium',
                message: `Font family ${font} not found in web`,
            });
        }
    });

    // Compare font sizes
    const figmaSizes = (figmaTypo.fontSizes || []).map((s: string) => parseFloat(s));
    const webSizes = (webTypo.fontSizes || []).map((s: string) => parseFloat(s));

    figmaSizes.forEach((size: number) => {
        const found = webSizes.some((ws: number) => Math.abs(size - ws) <= threshold);
        if (found) {
            matches.push({ property: 'fontSize', value: `${size}px` });
        } else {
            deviations.push({
                property: 'fontSize',
                figmaValue: `${size}px`,
                webValue: null,
                severity: 'low',
                message: `Font size ${size}px not found in web`,
            });
        }
    });

    const totalItems = figmaFonts.length + figmaSizes.length;
    return {
        matches,
        deviations,
        score: matches.length / Math.max(totalItems, 1),
    };
}

function normalizeColor(color: string): [number, number, number] {
    if (color.startsWith('#')) {
        const hex = color.slice(1);
        return [
            parseInt(hex.slice(0, 2), 16),
            parseInt(hex.slice(2, 4), 16),
            parseInt(hex.slice(4, 6), 16),
        ];
    }

    const match = color.match(/\d+/g);
    if (match && match.length >= 3) {
        return [parseInt(match[0]), parseInt(match[1]), parseInt(match[2])];
    }

    return [0, 0, 0];
}

function colorDistance(c1: [number, number, number], c2: [number, number, number]): number {
    return Math.sqrt(
        Math.pow(c1[0] - c2[0], 2) +
        Math.pow(c1[1] - c2[1], 2) +
        Math.pow(c1[2] - c2[2], 2)
    );
}
