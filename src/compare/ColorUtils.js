/**
 * Color Utilities Module
 * Provides color parsing, conversion, and comparison functions
 */

/**
 * Convert hex color to RGB object
 * @param {string} hex - Hex color string (e.g., #ff00aa)
 * @returns {Object|null} RGB object { r, g, b } or null if invalid
 */
export function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

/**
 * Convert RGB object to hex string
 * @param {Object} rgb - RGB object with r, g, b values (0-1 or 0-255)
 * @returns {string|null} Hex color string or null if invalid
 */
export function rgbToHex(rgb) {
    if (!rgb || typeof rgb !== 'object') return null;
    let { r, g, b } = rgb;

    // If values are 0-1 floats, convert to 0-255
    if (r <= 1 && g <= 1 && b <= 1) {
        r = Math.round(r * 255);
        g = Math.round(g * 255);
        b = Math.round(b * 255);
    }

    const toHex = (v) => v.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Parse web color to RGB object
 * Handles rgb(), rgba(), hex, and common named colors
 * @param {string} color - Color string in various formats
 * @returns {Object|null} RGB object or null if unparseable
 */
export function parseWebColor(color) {
    if (color.startsWith('#')) {
        return hexToRgb(color);
    }

    if (color.startsWith('rgb')) {
        const matches = color.match(/\d+/g);
        if (matches && matches.length >= 3) {
            return {
                r: parseInt(matches[0]),
                g: parseInt(matches[1]),
                b: parseInt(matches[2])
            };
        }
    }

    return null;
}

/**
 * Calculate Euclidean color difference between two RGB colors
 * @param {Object} rgb1 - First RGB color
 * @param {Object} rgb2 - Second RGB color
 * @returns {number} Color difference (0-441.67 for RGB)
 */
export function calculateColorDifference(rgb1, rgb2) {
    return Math.sqrt(
        Math.pow(rgb1.r - rgb2.r, 2) +
        Math.pow(rgb1.g - rgb2.g, 2) +
        Math.pow(rgb1.b - rgb2.b, 2)
    );
}

/**
 * Calculate color similarity as a 0-1 score
 * @param {string} color1 - First color (hex format)
 * @param {string} color2 - Second color (any format)
 * @returns {number} Similarity score (0-1)
 */
export function calculateColorSimilarity(color1, color2) {
    const rgb1 = hexToRgb(color1);
    const rgb2 = parseWebColor(color2);

    if (!rgb1 || !rgb2) return 0;

    const difference = calculateColorDifference(rgb1, rgb2);
    return Math.max(0, 1 - difference / 255);
}

/**
 * Compare two colors and return deviation or match result
 * @param {string} figmaColor - Figma color (hex)
 * @param {string} webColor - Web color (various formats)
 * @param {string} property - Property name
 * @param {number} threshold - Max acceptable difference (default: 10)
 * @returns {Object} Comparison result with deviation or match
 */
export function compareColors(figmaColor, webColor, property, threshold = 10) {
    const figmaRgb = hexToRgb(figmaColor);
    const webRgb = parseWebColor(webColor);

    if (!figmaRgb || !webRgb) {
        return {
            deviation: {
                property,
                figmaValue: figmaColor,
                webValue: webColor,
                difference: 'unable to compare',
                severity: 'low',
                message: 'Color format could not be compared'
            }
        };
    }

    const difference = calculateColorDifference(figmaRgb, webRgb);

    if (difference > threshold) {
        return {
            deviation: {
                property,
                figmaValue: figmaColor,
                webValue: webColor,
                difference: `${Math.round(difference)} units`,
                severity: getSeverity('color', difference),
                message: `${property} differs by ${Math.round(difference)} color units`
            }
        };
    }

    return {
        match: {
            property,
            value: figmaColor,
            message: `${property} matches within tolerance`
        }
    };
}

/**
 * Get severity level based on property type and difference value
 * @param {string} propertyType - Type of property (color, fontSize, spacing, size)
 * @param {number} difference - Numeric difference
 * @returns {string} Severity level: 'high', 'medium', or 'low'
 */
export function getSeverity(propertyType, difference) {
    const severityThresholds = {
        color: { high: 50, medium: 20 },
        fontSize: { high: 6, medium: 3 },
        spacing: { high: 10, medium: 5 },
        size: { high: 20, medium: 10 }
    };

    const thresholds = severityThresholds[propertyType] || { high: 20, medium: 10 };

    if (difference >= thresholds.high) return 'high';
    if (difference >= thresholds.medium) return 'medium';
    return 'low';
}

/**
 * Normalize color to consistent format (hex lowercase)
 * @param {string} color - Color in any format
 * @returns {string} Normalized hex color or original if unparseable
 */
export function normalizeColor(color) {
    const rgb = parseWebColor(color);
    if (rgb) {
        return rgbToHex(rgb).toLowerCase();
    }
    return color;
}
