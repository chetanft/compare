/**
 * Typography Utilities Module
 * Provides typography parsing, normalization, and comparison functions
 */

import { getSeverity } from './ColorUtils.js';

/**
 * Normalize font family string for comparison
 * @param {string} fontFamily - Font family string (may include fallbacks)
 * @returns {string} Normalized primary font family
 */
export function normalizeFontFamily(fontFamily) {
    return fontFamily.toLowerCase().replace(/['"]/g, '').split(',')[0].trim();
}

/**
 * Normalize font weight to numeric value
 * @param {string|number} fontWeight - Font weight (name or number)
 * @returns {string} Normalized numeric font weight
 */
export function normalizeFontWeight(fontWeight) {
    const weightMap = {
        'thin': '100',
        'extralight': '200',
        'light': '300',
        'normal': '400',
        'medium': '500',
        'semibold': '600',
        'bold': '700',
        'extrabold': '800',
        'black': '900'
    };

    const normalized = fontWeight.toString().toLowerCase();
    return weightMap[normalized] || normalized;
}

/**
 * Compare typography properties between Figma and web
 * @param {Object} figmaTypography - Figma typography data
 * @param {Object} webStyles - Web element styles
 * @param {Object} thresholds - Comparison thresholds
 * @returns {Object} { deviations: Array, matches: Array }
 */
export function compareTypography(figmaTypography, webStyles, thresholds = { fontSizeDifference: 2 }) {
    const deviations = [];
    const matches = [];

    // Font family comparison
    if (figmaTypography.fontFamily && webStyles.fontFamily) {
        if (normalizeFontFamily(figmaTypography.fontFamily) !== normalizeFontFamily(webStyles.fontFamily)) {
            deviations.push({
                property: 'fontFamily',
                figmaValue: figmaTypography.fontFamily,
                webValue: webStyles.fontFamily,
                difference: 'different',
                severity: 'medium',
                message: 'Font family differs between design and implementation'
            });
        } else {
            matches.push({
                property: 'fontFamily',
                value: figmaTypography.fontFamily,
                message: 'Font family matches'
            });
        }
    }

    // Font size comparison
    if (figmaTypography.fontSize && webStyles.fontSize) {
        const figmaSize = parseFloat(figmaTypography.fontSize);
        const webSize = parseFloat(webStyles.fontSize);
        const difference = Math.abs(figmaSize - webSize);

        if (difference > thresholds.fontSizeDifference) {
            deviations.push({
                property: 'fontSize',
                figmaValue: `${figmaSize}px`,
                webValue: `${webSize}px`,
                difference: `${difference}px`,
                severity: getSeverity('fontSize', difference),
                message: `Font size differs by ${difference}px`
            });
        } else {
            matches.push({
                property: 'fontSize',
                value: `${figmaSize}px`,
                message: 'Font size matches within tolerance'
            });
        }
    }

    // Font weight comparison
    if (figmaTypography.fontWeight && webStyles.fontWeight) {
        const figmaWeight = normalizeFontWeight(figmaTypography.fontWeight);
        const webWeight = normalizeFontWeight(webStyles.fontWeight);

        if (figmaWeight !== webWeight) {
            deviations.push({
                property: 'fontWeight',
                figmaValue: figmaTypography.fontWeight,
                webValue: webStyles.fontWeight,
                difference: 'different',
                severity: 'low',
                message: 'Font weight differs between design and implementation'
            });
        } else {
            matches.push({
                property: 'fontWeight',
                value: figmaTypography.fontWeight,
                message: 'Font weight matches'
            });
        }
    }

    return { deviations, matches };
}

/**
 * Compare line height values
 * @param {string|number} figmaLineHeight - Figma line height
 * @param {string} webLineHeight - Web line height
 * @returns {Object} Comparison result
 */
export function compareLineHeight(figmaLineHeight, webLineHeight) {
    if (!figmaLineHeight || !webLineHeight || webLineHeight === 'normal') {
        return { match: null, deviation: null };
    }

    const figmaValue = parseFloat(figmaLineHeight);
    const webValue = parseFloat(webLineHeight);
    const difference = Math.abs(figmaValue - webValue);

    if (difference > 2) {
        return {
            deviation: {
                property: 'lineHeight',
                figmaValue: figmaLineHeight,
                webValue: webLineHeight,
                difference: `${difference}`,
                severity: 'low',
                message: `Line height differs by ${difference}`
            }
        };
    }

    return {
        match: {
            property: 'lineHeight',
            value: figmaLineHeight,
            message: 'Line height matches within tolerance'
        }
    };
}
