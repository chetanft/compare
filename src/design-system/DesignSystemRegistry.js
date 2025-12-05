/**
 * Design System Registry
 * Manages multiple design systems for comparison
 */

/**
 * @typedef {Object} DesignSystemTokens
 * @property {Object} colors - Color tokens
 * @property {Object} typography - Typography tokens
 * @property {Object} spacing - Spacing scale
 * @property {Object} shadows - Shadow tokens
 * @property {Object} borderRadius - Border radius tokens
 */

/**
 * Design System Registry - Singleton pattern
 */
class DesignSystemRegistry {
    constructor() {
        this.systems = new Map();
        this.defaultSystemId = null;

        // Register built-in design systems
        this.registerBuiltInSystems();
    }

    /**
     * Register a design system
     * @param {string} id - Unique identifier
     * @param {Object} config - Design system configuration
     */
    register(id, config) {
        const system = {
            id,
            name: config.name,
            version: config.version || '1.0.0',
            tokens: this.normalizeTokens(config.tokens),
            metadata: config.metadata || {},
            registeredAt: new Date().toISOString()
        };

        this.systems.set(id, system);
        console.log(`📐 Registered design system: ${config.name} (${id})`);

        return system;
    }

    /**
     * Get a design system by ID
     * @param {string} id - Design system ID
     * @returns {Object|undefined}
     */
    get(id) {
        return this.systems.get(id);
    }

    /**
     * Get all registered design systems
     * @returns {Array}
     */
    getAll() {
        return Array.from(this.systems.values());
    }

    /**
     * Set the default design system for comparisons
     * @param {string} id - Design system ID
     */
    setDefault(id) {
        if (!this.systems.has(id)) {
            throw new Error(`Design system not found: ${id}`);
        }
        this.defaultSystemId = id;
    }

    /**
     * Get the default design system
     * @returns {Object|undefined}
     */
    getDefault() {
        return this.defaultSystemId ? this.systems.get(this.defaultSystemId) : null;
    }

    /**
     * Find closest token match for a value
     * @param {string} systemId - Design system ID
     * @param {string} category - Token category (colors, typography, etc.)
     * @param {string} property - Property name
     * @param {*} value - Value to match
     * @returns {Object} Match result with token name and distance
     */
    findClosestToken(systemId, category, property, value) {
        const system = this.get(systemId);
        if (!system) return { token: null, distance: Infinity };

        const tokens = system.tokens[category];
        if (!tokens) return { token: null, distance: Infinity };

        let closestToken = null;
        let closestDistance = Infinity;

        // Handle different token types
        if (category === 'colors') {
            closestToken = this.findClosestColor(tokens, value);
        } else if (category === 'spacing') {
            closestToken = this.findClosestNumeric(tokens, value);
        } else if (category === 'borderRadius') {
            closestToken = this.findClosestNumeric(tokens, value);
        } else if (category === 'typography') {
            closestToken = this.findClosestTypography(tokens, property, value);
        }

        return closestToken || { token: null, distance: Infinity };
    }

    /**
     * Find closest color token
     */
    findClosestColor(tokens, value) {
        const targetRgb = this.parseColor(value);
        if (!targetRgb) return null;

        let closest = null;
        let minDistance = Infinity;

        const flatTokens = this.flattenTokens(tokens);

        for (const [name, tokenValue] of Object.entries(flatTokens)) {
            const tokenRgb = this.parseColor(tokenValue);
            if (!tokenRgb) continue;

            const distance = Math.sqrt(
                Math.pow(targetRgb.r - tokenRgb.r, 2) +
                Math.pow(targetRgb.g - tokenRgb.g, 2) +
                Math.pow(targetRgb.b - tokenRgb.b, 2)
            );

            if (distance < minDistance) {
                minDistance = distance;
                closest = { token: name, value: tokenValue, distance };
            }
        }

        return closest;
    }

    /**
     * Find closest numeric token
     */
    findClosestNumeric(tokens, value) {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return null;

        let closest = null;
        let minDistance = Infinity;

        const flatTokens = this.flattenTokens(tokens);

        for (const [name, tokenValue] of Object.entries(flatTokens)) {
            const tokenNum = parseFloat(tokenValue);
            if (isNaN(tokenNum)) continue;

            const distance = Math.abs(numValue - tokenNum);

            if (distance < minDistance) {
                minDistance = distance;
                closest = { token: name, value: tokenValue, distance };
            }
        }

        return closest;
    }

    /**
     * Find closest typography token
     */
    findClosestTypography(tokens, property, value) {
        const subTokens = tokens[property];
        if (!subTokens) return null;

        if (property === 'fontSize') {
            return this.findClosestNumeric(subTokens, value);
        }

        // For font family and weight, do exact or fuzzy match
        const normalizedValue = String(value).toLowerCase().replace(/['"]/g, '');

        for (const [name, tokenValue] of Object.entries(subTokens)) {
            const normalizedToken = String(tokenValue).toLowerCase().replace(/['"]/g, '');
            if (normalizedToken.includes(normalizedValue) || normalizedValue.includes(normalizedToken)) {
                return { token: name, value: tokenValue, distance: 0 };
            }
        }

        return null;
    }

    /**
     * Flatten nested token object
     */
    flattenTokens(tokens, prefix = '') {
        const result = {};

        for (const [key, value] of Object.entries(tokens)) {
            const newKey = prefix ? `${prefix}.${key}` : key;

            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                Object.assign(result, this.flattenTokens(value, newKey));
            } else {
                result[newKey] = value;
            }
        }

        return result;
    }

    /**
     * Parse color string to RGB
     */
    parseColor(color) {
        if (!color || typeof color !== 'string') return null;

        // Hex format
        if (color.startsWith('#')) {
            const hex = color.slice(1);
            if (hex.length === 3) {
                return {
                    r: parseInt(hex[0] + hex[0], 16),
                    g: parseInt(hex[1] + hex[1], 16),
                    b: parseInt(hex[2] + hex[2], 16)
                };
            }
            if (hex.length === 6) {
                return {
                    r: parseInt(hex.slice(0, 2), 16),
                    g: parseInt(hex.slice(2, 4), 16),
                    b: parseInt(hex.slice(4, 6), 16)
                };
            }
        }

        // RGB/RGBA format
        const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgbMatch) {
            return {
                r: parseInt(rgbMatch[1]),
                g: parseInt(rgbMatch[2]),
                b: parseInt(rgbMatch[3])
            };
        }

        // HSL format - convert to RGB
        const hslMatch = color.match(/hsla?\((\d+),\s*(\d+)%,\s*(\d+)%/);
        if (hslMatch) {
            return this.hslToRgb(
                parseInt(hslMatch[1]),
                parseInt(hslMatch[2]),
                parseInt(hslMatch[3])
            );
        }

        return null;
    }

    /**
     * Convert HSL to RGB
     */
    hslToRgb(h, s, l) {
        s /= 100;
        l /= 100;
        const a = s * Math.min(l, 1 - l);
        const f = (n) => {
            const k = (n + h / 30) % 12;
            return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        };
        return {
            r: Math.round(f(0) * 255),
            g: Math.round(f(8) * 255),
            b: Math.round(f(4) * 255)
        };
    }

    /**
     * Normalize token structure
     */
    normalizeTokens(tokens) {
        return {
            colors: tokens.colors || {},
            typography: tokens.typography || {},
            spacing: tokens.spacing || {},
            shadows: tokens.shadows || {},
            borderRadius: tokens.borderRadius || {},
            ...tokens
        };
    }

    /**
     * Register built-in design systems
     */
    registerBuiltInSystems() {
        // ShadCN UI tokens (default)
        this.register('shadcn', SHADCN_TOKENS);

        // FT Design System tokens
        this.register('ft-ds', FT_DS_TOKENS);

        // Set ShadCN as default
        this.setDefault('shadcn');
    }
}

// =============================================================================
// BUILT-IN DESIGN SYSTEM TOKENS
// =============================================================================

/**
 * ShadCN UI Design System Tokens
 */
const SHADCN_TOKENS = {
    name: 'ShadCN UI',
    version: '1.0.0',
    tokens: {
        colors: {
            background: 'hsl(0 0% 100%)',
            foreground: 'hsl(222.2 84% 4.9%)',
            card: 'hsl(0 0% 100%)',
            cardForeground: 'hsl(222.2 84% 4.9%)',
            popover: 'hsl(0 0% 100%)',
            popoverForeground: 'hsl(222.2 84% 4.9%)',
            primary: 'hsl(222.2 47.4% 11.2%)',
            primaryForeground: 'hsl(210 40% 98%)',
            secondary: 'hsl(210 40% 96.1%)',
            secondaryForeground: 'hsl(222.2 47.4% 11.2%)',
            muted: 'hsl(210 40% 96.1%)',
            mutedForeground: 'hsl(215.4 16.3% 46.9%)',
            accent: 'hsl(210 40% 96.1%)',
            accentForeground: 'hsl(222.2 47.4% 11.2%)',
            destructive: 'hsl(0 84.2% 60.2%)',
            destructiveForeground: 'hsl(210 40% 98%)',
            border: 'hsl(214.3 31.8% 91.4%)',
            input: 'hsl(214.3 31.8% 91.4%)',
            ring: 'hsl(222.2 84% 4.9%)'
        },
        typography: {
            fontFamily: {
                sans: 'Inter, system-ui, sans-serif',
                mono: 'JetBrains Mono, monospace'
            },
            fontSize: {
                xs: '0.75rem',
                sm: '0.875rem',
                base: '1rem',
                lg: '1.125rem',
                xl: '1.25rem',
                '2xl': '1.5rem',
                '3xl': '1.875rem',
                '4xl': '2.25rem'
            },
            fontWeight: {
                normal: '400',
                medium: '500',
                semibold: '600',
                bold: '700'
            }
        },
        spacing: {
            0: '0',
            1: '0.25rem',
            2: '0.5rem',
            3: '0.75rem',
            4: '1rem',
            5: '1.25rem',
            6: '1.5rem',
            8: '2rem',
            10: '2.5rem',
            12: '3rem',
            16: '4rem',
            20: '5rem',
            24: '6rem'
        },
        borderRadius: {
            none: '0',
            sm: '0.125rem',
            default: '0.25rem',
            md: '0.375rem',
            lg: '0.5rem',
            xl: '0.75rem',
            '2xl': '1rem',
            full: '9999px'
        },
        shadows: {
            sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
            default: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
            md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
            xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
        }
    },
    metadata: {
        source: 'https://ui.shadcn.com',
        description: 'Beautifully designed components built with Radix UI and Tailwind CSS'
    }
};

/**
 * FT Design System Tokens
 */
const FT_DS_TOKENS = {
    name: 'FT Design System',
    version: '4.13.17',
    tokens: {
        colors: {
            // Primary palette
            primary: {
                50: '#e6f0ff',
                100: '#b3d1ff',
                200: '#80b3ff',
                300: '#4d94ff',
                400: '#1a75ff',
                500: '#0066ff', // Primary
                600: '#0052cc',
                700: '#003d99',
                800: '#002966',
                900: '#001433'
            },
            // Neutral palette
            neutral: {
                50: '#fafafa',
                100: '#f5f5f5',
                200: '#e5e5e5',
                300: '#d4d4d4',
                400: '#a3a3a3',
                500: '#737373',
                600: '#525252',
                700: '#404040',
                800: '#262626',
                900: '#171717'
            },
            // Semantic colors
            success: '#22c55e',
            warning: '#f59e0b',
            error: '#ef4444',
            info: '#3b82f6',
            // Surface colors
            background: '#ffffff',
            surface: '#fafafa',
            border: '#e5e5e5'
        },
        typography: {
            fontFamily: {
                primary: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                mono: 'JetBrains Mono, Consolas, monospace'
            },
            fontSize: {
                '2xs': '0.625rem',   // 10px
                xs: '0.75rem',       // 12px
                sm: '0.875rem',      // 14px
                md: '1rem',          // 16px
                lg: '1.125rem',      // 18px
                xl: '1.25rem',       // 20px
                '2xl': '1.5rem',     // 24px
                '3xl': '1.875rem',   // 30px
                '4xl': '2.25rem',    // 36px
                '5xl': '3rem'        // 48px
            },
            fontWeight: {
                regular: '400',
                medium: '500',
                semibold: '600',
                bold: '700'
            },
            lineHeight: {
                tight: '1.25',
                normal: '1.5',
                relaxed: '1.75'
            }
        },
        spacing: {
            0: '0',
            1: '4px',
            2: '8px',
            3: '12px',
            4: '16px',
            5: '20px',
            6: '24px',
            8: '32px',
            10: '40px',
            12: '48px',
            16: '64px',
            20: '80px',
            24: '96px'
        },
        borderRadius: {
            none: '0',
            sm: '2px',
            md: '4px',
            lg: '8px',
            xl: '12px',
            '2xl': '16px',
            full: '9999px'
        },
        shadows: {
            xs: '0 1px 2px rgba(0, 0, 0, 0.05)',
            sm: '0 1px 3px rgba(0, 0, 0, 0.1)',
            md: '0 4px 6px rgba(0, 0, 0, 0.1)',
            lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
            xl: '0 20px 25px rgba(0, 0, 0, 0.15)'
        }
    },
    metadata: {
        source: 'FreightTiger Design System',
        description: 'Enterprise-grade design system for logistics applications'
    }
};

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let registryInstance = null;

/**
 * Get the design system registry instance
 * @returns {DesignSystemRegistry}
 */
export function getDesignSystemRegistry() {
    if (!registryInstance) {
        registryInstance = new DesignSystemRegistry();
    }
    return registryInstance;
}

/**
 * Register a custom design system
 */
export function registerDesignSystem(id, config) {
    return getDesignSystemRegistry().register(id, config);
}

/**
 * Get a design system by ID
 */
export function getDesignSystem(id) {
    return getDesignSystemRegistry().get(id);
}

/**
 * Find closest token match
 */
export function findClosestToken(systemId, category, property, value) {
    return getDesignSystemRegistry().findClosestToken(systemId, category, property, value);
}

export { DesignSystemRegistry, SHADCN_TOKENS, FT_DS_TOKENS };
