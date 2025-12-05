/**
 * Spacing Utilities Module
 * Provides spacing and layout comparison functions
 */

import { getSeverity } from './ColorUtils.js';

/**
 * Compare spacing properties (padding/margin)
 * @param {Object} figmaSpacing - Figma spacing data
 * @param {Object} webStyles - Web element styles
 * @param {Object} thresholds - Comparison thresholds
 * @returns {Object} { deviations: Array, matches: Array }
 */
export function compareSpacing(figmaSpacing, webStyles, thresholds = { spacingDifference: 3 }) {
    const deviations = [];
    const matches = [];

    const spacingProps = [
        { figma: 'paddingTop', web: 'paddingTop' },
        { figma: 'paddingRight', web: 'paddingRight' },
        { figma: 'paddingBottom', web: 'paddingBottom' },
        { figma: 'paddingLeft', web: 'paddingLeft' },
        { figma: 'marginTop', web: 'marginTop' },
        { figma: 'marginRight', web: 'marginRight' },
        { figma: 'marginBottom', web: 'marginBottom' },
        { figma: 'marginLeft', web: 'marginLeft' }
    ];

    for (const prop of spacingProps) {
        if (figmaSpacing[prop.figma] !== undefined && webStyles[prop.web] !== undefined) {
            const figmaValue = parseFloat(figmaSpacing[prop.figma]);
            const webValue = parseFloat(webStyles[prop.web]);
            const difference = Math.abs(figmaValue - webValue);

            if (difference > thresholds.spacingDifference) {
                deviations.push({
                    property: prop.figma,
                    figmaValue: `${figmaValue}px`,
                    webValue: `${webValue}px`,
                    difference: `${difference}px`,
                    severity: getSeverity('spacing', difference),
                    message: `${prop.figma} differs by ${difference}px`
                });
            } else {
                matches.push({
                    property: prop.figma,
                    value: `${figmaValue}px`,
                    message: `${prop.figma} matches within tolerance`
                });
            }
        }
    }

    return { deviations, matches };
}

/**
 * Compare dimension properties (width/height)
 * @param {Object} figmaDimensions - Figma dimensions
 * @param {Object} webDimensions - Web element dimensions
 * @param {Object} thresholds - Comparison thresholds
 * @returns {Object} { deviations: Array, matches: Array }
 */
export function compareDimensions(figmaDimensions, webDimensions, thresholds = { sizeDifference: 5 }) {
    const deviations = [];
    const matches = [];

    // Width comparison
    if (figmaDimensions.width !== undefined && webDimensions.width !== undefined) {
        const difference = Math.abs(figmaDimensions.width - webDimensions.width);
        if (difference > thresholds.sizeDifference) {
            deviations.push({
                property: 'width',
                figmaValue: `${figmaDimensions.width}px`,
                webValue: `${webDimensions.width}px`,
                difference: `${difference}px`,
                severity: getSeverity('size', difference),
                message: `Width differs by ${difference}px`
            });
        } else {
            matches.push({
                property: 'width',
                value: `${figmaDimensions.width}px`,
                message: 'Width matches within tolerance'
            });
        }
    }

    // Height comparison
    if (figmaDimensions.height !== undefined && webDimensions.height !== undefined) {
        const difference = Math.abs(figmaDimensions.height - webDimensions.height);
        if (difference > thresholds.sizeDifference) {
            deviations.push({
                property: 'height',
                figmaValue: `${figmaDimensions.height}px`,
                webValue: `${webDimensions.height}px`,
                difference: `${difference}px`,
                severity: getSeverity('size', difference),
                message: `Height differs by ${difference}px`
            });
        } else {
            matches.push({
                property: 'height',
                value: `${figmaDimensions.height}px`,
                message: 'Height matches within tolerance'
            });
        }
    }

    return { deviations, matches };
}

/**
 * Compare border radius values
 * @param {number|string} figmaBorderRadius - Figma border radius
 * @param {string} webBorderRadius - Web border radius
 * @param {Object} thresholds - Comparison thresholds
 * @returns {Object} { deviation, match }
 */
export function compareBorderRadius(figmaBorderRadius, webBorderRadius, thresholds = { spacingDifference: 3 }) {
    const figmaValue = typeof figmaBorderRadius === 'number' ? figmaBorderRadius : parseFloat(figmaBorderRadius);
    const webValue = parseFloat(webBorderRadius);

    if (isNaN(figmaValue) || isNaN(webValue)) {
        return {
            deviation: {
                property: 'borderRadius',
                figmaValue: figmaBorderRadius,
                webValue: webBorderRadius,
                difference: 'unable to compare',
                severity: 'low',
                message: 'Border radius values could not be compared'
            }
        };
    }

    const difference = Math.abs(figmaValue - webValue);

    if (difference > thresholds.spacingDifference) {
        return {
            deviation: {
                property: 'borderRadius',
                figmaValue: `${figmaValue}px`,
                webValue: webBorderRadius,
                difference: `${difference}px`,
                severity: getSeverity('spacing', difference),
                message: `Border radius differs by ${difference}px`
            }
        };
    }

    return {
        match: {
            property: 'borderRadius',
            value: `${figmaValue}px`,
            message: 'Border radius matches within tolerance'
        }
    };
}

/**
 * Calculate dimension similarity score (0-1)
 * @param {Object} figmaDim - Figma dimensions { width, height }
 * @param {Object} webDim - Web dimensions { width, height }
 * @returns {number} Similarity score 0-1
 */
export function calculateDimensionSimilarity(figmaDim, webDim) {
    const widthDiff = Math.abs(figmaDim.width - webDim.width) / Math.max(figmaDim.width, webDim.width);
    const heightDiff = Math.abs(figmaDim.height - webDim.height) / Math.max(figmaDim.height, webDim.height);

    return 1 - (widthDiff + heightDiff) / 2;
}
