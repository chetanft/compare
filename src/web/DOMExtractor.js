/**
 * DOM Extractor Module
 * Handles comprehensive DOM extraction from web pages
 */

/**
 * Semantic selectors for extracting meaningful elements
 */
export const semanticSelectors = [
    // Framework-specific elements
    '[class*="ant-"]',
    '[class*="css-"]',
    'nav[class*="topnav"]',
    'div[class*="ant-layout"]',
    'div[class*="ant-layout-content"]',
    'div[class*="main-content"]',
    'main[class*="ant-layout-content"]',
    'table, tbody, tr, td, th',
    '.ant-table, .ant-table-body',

    // Standard semantic elements
    'h1, h2, h3, h4, h5, h6',
    'p, span:not(:empty)',
    'article, section, main, aside',
    'nav, [role="navigation"]',
    'header, [role="banner"]',
    'footer, [role="contentinfo"]',
    'button, [role="button"], [class*="btn" i]',
    'a[href]:not(:empty)',
    'form',
    'input, textarea, select',
    'table, [role="table"], tr, td, th',
    'ul, ol, li, dl',
    'img[src], [role="img"]',
    'div[class*="content"], div[class*="text"], div[class*="list"], div[class*="item"]',
    '[role="main"], [role="article"]'
];

/**
 * Extract all DOM elements with computed styles
 * This function is designed to run inside a browser context via page.evaluate()
 * @param {string} pageUrl - URL of the page being extracted
 * @returns {Object} Extraction results
 */
export function extractDOMElements(pageUrl) {
    const elements = [];
    const colorPalette = new Set();
    const typography = {
        fontFamilies: new Set(),
        fontSizes: new Set(),
        fontWeights: new Set()
    };
    const spacingValues = new Set();
    const borderRadiusValues = new Set();

    const maxElements = 1500;
    let elementCount = 0;

    /**
     * Add an element to the collection if it meets criteria
     */
    const addElement = (element, selectorIndex, elemIndex) => {
        if (elementCount >= maxElements) return;

        const rect = element.getBoundingClientRect();
        if (rect.width <= 5 || rect.height <= 5) return;

        const styles = window.getComputedStyle(element);
        if (styles.display === 'none' || styles.visibility === 'hidden' || parseFloat(styles.opacity) < 0.1) return;

        // Extract colors
        if (styles.color && styles.color !== 'rgba(0, 0, 0, 0)' && styles.color !== 'transparent') {
            colorPalette.add(styles.color);
        }
        if (styles.backgroundColor && styles.backgroundColor !== 'rgba(0, 0, 0, 0)' && styles.backgroundColor !== 'transparent') {
            colorPalette.add(styles.backgroundColor);
        }
        if (styles.borderColor && styles.borderColor !== 'rgba(0, 0, 0, 0)' && styles.borderColor !== 'transparent') {
            colorPalette.add(styles.borderColor);
        }

        // Extract typography
        if (styles.fontFamily) typography.fontFamilies.add(styles.fontFamily.split(',')[0].trim());
        if (styles.fontSize) typography.fontSizes.add(styles.fontSize);
        if (styles.fontWeight) typography.fontWeights.add(styles.fontWeight);
        if (styles.lineHeight && styles.lineHeight !== 'normal') typography.fontWeights.add(`lineHeight-${styles.lineHeight}`);

        // Extract spacing
        if (styles.padding && styles.padding !== '0px') spacingValues.add(styles.padding);
        if (styles.margin && styles.margin !== '0px') spacingValues.add(styles.margin);
        ['Top', 'Right', 'Bottom', 'Left'].forEach(dir => {
            const pad = styles[`padding${dir}`];
            const mar = styles[`margin${dir}`];
            if (pad && pad !== '0px') spacingValues.add(pad);
            if (mar && mar !== '0px') spacingValues.add(mar);
        });

        // Extract border radius
        if (styles.borderRadius && styles.borderRadius !== '0px') borderRadiusValues.add(styles.borderRadius);

        const textContent = element.textContent?.trim() || '';
        const hasText = textContent.length > 0;
        const hasBackground = styles.backgroundColor !== 'rgba(0, 0, 0, 0)';
        const hasBorder = styles.borderWidth !== '0px' && styles.borderStyle !== 'none';
        const isLarge = rect.width * rect.height > 100;
        const tag = element.tagName.toLowerCase();
        const isImage = tag === 'img';
        const isInteractive = ['button', 'a', 'input', 'select', 'textarea'].includes(tag);

        if (hasText || hasBackground || hasBorder || isLarge || isImage || isInteractive) {
            const elementData = {
                id: `element-${selectorIndex}-${elemIndex}`,
                name: element.className ? `.${element.className.split(' ')[0]}` : tag,
                type: tag,
                text: textContent.slice(0, 200),
                className: element.className || '',
                rect: {
                    x: Math.round(rect.x),
                    y: Math.round(rect.y),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height)
                },
                styles: {
                    color: styles.color,
                    backgroundColor: styles.backgroundColor,
                    fontSize: styles.fontSize,
                    fontFamily: styles.fontFamily,
                    fontWeight: styles.fontWeight,
                    lineHeight: styles.lineHeight,
                    letterSpacing: styles.letterSpacing,
                    padding: styles.padding,
                    paddingTop: styles.paddingTop,
                    paddingRight: styles.paddingRight,
                    paddingBottom: styles.paddingBottom,
                    paddingLeft: styles.paddingLeft,
                    margin: styles.margin,
                    marginTop: styles.marginTop,
                    marginRight: styles.marginRight,
                    marginBottom: styles.marginBottom,
                    marginLeft: styles.marginLeft,
                    border: styles.border,
                    borderWidth: styles.borderWidth,
                    borderStyle: styles.borderStyle,
                    borderColor: styles.borderColor,
                    borderRadius: styles.borderRadius
                },
                attributes: {
                    href: element.href || '',
                    alt: element.alt || '',
                    src: element.src || '',
                    role: element.getAttribute('role') || ''
                },
                source: 'unified-extractor',
                selector: `${tag}${element.id ? '#' + element.id : ''}${element.className ? '.' + element.className.split(' ')[0] : ''}`
            };

            elements.push(elementData);
            elementCount++;
        }
    };

    /**
     * Visit a node tree and extract elements
     */
    const visitNode = (root, selectorIndex) => {
        try {
            const selectors = [
                '[class*="ant-"]', '[class*="css-"]',
                'h1, h2, h3, h4, h5, h6', 'p, span:not(:empty)',
                'article, section, main, aside', 'nav, [role="navigation"]',
                'header, footer', 'button, [role="button"]', 'a[href]',
                'form', 'input, textarea, select', 'table, tr, td, th',
                'ul, ol, li', 'img[src]', 'div[class*="content"]'
            ];

            selectors.forEach((selector) => {
                try {
                    const nodeList = root.querySelectorAll ? root.querySelectorAll(selector) : [];
                    nodeList.forEach((el, idx) => addElement(el, selectorIndex, idx));
                } catch (_) { }
            });

            // Handle shadow DOM
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
            let node;
            while ((node = walker.nextNode())) {
                if (node.shadowRoot) {
                    visitNode(node.shadowRoot, selectorIndex + 1);
                }
            }
        } catch (_) { }
    };

    /**
     * Collect from document including iframes
     */
    const collectFromDocument = (doc) => {
        visitNode(doc, 0);

        const frames = doc.querySelectorAll('iframe');
        frames.forEach((iframe, fIdx) => {
            try {
                const iframeDoc = iframe.contentDocument;
                if (iframeDoc) visitNode(iframeDoc, fIdx + 10);
            } catch (_) {
                // cross-origin, skip
            }
        });
    };

    collectFromDocument(document);

    return {
        elements,
        colorPalette: Array.from(colorPalette).slice(0, 50),
        typography: {
            fontFamilies: Array.from(typography.fontFamilies).slice(0, 20),
            fontSizes: Array.from(typography.fontSizes).slice(0, 20),
            fontWeights: Array.from(typography.fontWeights).slice(0, 10)
        },
        spacing: Array.from(spacingValues).slice(0, 30),
        borderRadius: Array.from(borderRadiusValues).slice(0, 20),
        metadata: {
            title: document.title,
            url: pageUrl,
            elementCount: elements.length,
            extractorVersion: '3.0.0-unified'
        }
    };
}

/**
 * Merge multiple extraction results into one
 * @param {Object[]} results - Array of extraction results
 * @param {string} url - Original URL
 * @returns {Object} Merged results
 */
export function mergeExtractionResults(results, url) {
    const merged = {
        elements: [],
        colorPalette: [],
        typography: { fontFamilies: [], fontSizes: [], fontWeights: [] },
        spacing: [],
        borderRadius: [],
        metadata: { title: '', url, elementCount: 0, extractorVersion: '3.0.0-unified' }
    };

    const colorSet = new Set();
    const famSet = new Set();
    const sizeSet = new Set();
    const weightSet = new Set();
    const spacingSet = new Set();
    const borderRadiusSet = new Set();

    for (const result of results) {
        if (!result) continue;

        merged.elements.push(...result.elements);
        result.colorPalette?.forEach(c => colorSet.add(c));
        result.typography?.fontFamilies?.forEach(f => famSet.add(f));
        result.typography?.fontSizes?.forEach(s => sizeSet.add(s));
        result.typography?.fontWeights?.forEach(w => weightSet.add(w));
        result.spacing?.forEach(s => spacingSet.add(s));
        result.borderRadius?.forEach(r => borderRadiusSet.add(r));

        if (result.metadata?.title && !merged.metadata.title) {
            merged.metadata.title = result.metadata.title;
        }
    }

    merged.colorPalette = Array.from(colorSet).slice(0, 50);
    merged.typography.fontFamilies = Array.from(famSet).slice(0, 20);
    merged.typography.fontSizes = Array.from(sizeSet).slice(0, 20);
    merged.typography.fontWeights = Array.from(weightSet).slice(0, 10);
    merged.spacing = Array.from(spacingSet).slice(0, 30);
    merged.borderRadius = Array.from(borderRadiusSet).slice(0, 20);
    merged.metadata.elementCount = merged.elements.length;

    return merged;
}

/**
 * Capture screenshot with retry logic
 * @param {Object} page - Puppeteer page object
 * @param {Object} options - Screenshot options
 * @returns {string|null} Base64 screenshot or null
 */
export async function captureScreenshot(page, options = {}) {
    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            console.log(`📸 Capturing screenshot (attempt ${attempt + 1}/${maxRetries})...`);

            const screenshot = await page.screenshot({
                fullPage: options.fullPage !== false,
                type: options.type || 'png',
                quality: options.quality || undefined,
                encoding: 'base64'
            });

            console.log('✅ Screenshot captured successfully');
            return screenshot;
        } catch (error) {
            console.warn(`⚠️ Screenshot attempt ${attempt + 1} failed:`, error.message);

            if (attempt < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    return null;
}
