/**
 * Figma Extraction API Endpoint - Edge Runtime
 */

import { corsResponse, getEnv, jsonResponse, methodNotAllowed, parseJsonBody } from '../../vercel/edge-helpers';

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
        const body = await parseJsonBody<{ figmaUrl?: string; nodeId?: string }>(req);
        if (!body?.figmaUrl) {
            return jsonResponse({ error: 'figmaUrl is required' }, 400);
        }

        const { figmaUrl, nodeId } = body;
        const urlMatch = figmaUrl.match(/figma\.com\/(file|design)\/([a-zA-Z0-9]+)/);
        if (!urlMatch) {
            return jsonResponse({ error: 'Invalid Figma URL format' }, 400);
        }

        const fileKey = urlMatch[2];
        const figmaToken = getEnv('FIGMA_ACCESS_TOKEN');
        if (!figmaToken) {
            return jsonResponse({ error: 'Figma API token not configured' }, 500);
        }

        const figmaApiUrl = nodeId
            ? `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${nodeId}`
            : `https://api.figma.com/v1/files/${fileKey}`;

        const response = await fetch(figmaApiUrl, {
            headers: {
                'X-Figma-Token': figmaToken
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            return jsonResponse(
                {
                    error: 'Figma API error',
                    details: errorText
                },
                response.status
            );
        }

        const figmaData = await response.json();
        const extracted = transformFigmaData(figmaData, nodeId);

        return jsonResponse({
            success: true,
            data: extracted,
            extractedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Figma extraction error:', error);
        return jsonResponse(
            {
                error: 'Extraction failed',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            500
        );
    }
}

/**
 * Transform Figma API response to comparison format
 */
function transformFigmaData(figmaData: any, nodeId?: string) {
    const document = nodeId
        ? figmaData.nodes?.[nodeId]?.document
        : figmaData.document;

    if (!document) {
        return { elements: [], colorPalette: [], typography: {} };
    }

    const elements: any[] = [];
    const colorPalette = new Set<string>();
    const typography = {
        fontFamilies: new Set<string>(),
        fontSizes: new Set<string>(),
        fontWeights: new Set<string>(),
    };

    function traverseNode(node: any) {
        if (!node) return;

        // Extract element data
        if (node.type !== 'DOCUMENT' && node.type !== 'CANVAS') {
            const element: any = {
                id: node.id,
                name: node.name,
                type: node.type,
                rect: node.absoluteBoundingBox || {},
            };

            // Extract fills (colors)
            if (node.fills && Array.isArray(node.fills)) {
                node.fills.forEach((fill: any) => {
                    if (fill.type === 'SOLID' && fill.color) {
                        const hex = rgbToHex(fill.color);
                        colorPalette.add(hex);
                        element.backgroundColor = hex;
                    }
                });
            }

            // Extract typography
            if (node.style) {
                if (node.style.fontFamily) {
                    typography.fontFamilies.add(node.style.fontFamily);
                    element.fontFamily = node.style.fontFamily;
                }
                if (node.style.fontSize) {
                    typography.fontSizes.add(`${node.style.fontSize}px`);
                    element.fontSize = `${node.style.fontSize}px`;
                }
                if (node.style.fontWeight) {
                    typography.fontWeights.add(String(node.style.fontWeight));
                    element.fontWeight = String(node.style.fontWeight);
                }
            }

            // Extract spacing (padding)
            if (node.paddingTop !== undefined) {
                element.paddingTop = node.paddingTop;
                element.paddingRight = node.paddingRight;
                element.paddingBottom = node.paddingBottom;
                element.paddingLeft = node.paddingLeft;
            }

            // Extract border radius
            if (node.cornerRadius !== undefined) {
                element.borderRadius = node.cornerRadius;
            }

            elements.push(element);
        }

        // Traverse children
        if (node.children && Array.isArray(node.children)) {
            node.children.forEach(traverseNode);
        }
    }

    traverseNode(document);

    return {
        elements,
        colorPalette: Array.from(colorPalette),
        typography: {
            fontFamilies: Array.from(typography.fontFamilies),
            fontSizes: Array.from(typography.fontSizes),
            fontWeights: Array.from(typography.fontWeights),
        },
        metadata: {
            name: figmaData.name,
            lastModified: figmaData.lastModified,
        },
    };
}

function rgbToHex(color: { r: number; g: number; b: number }): string {
    const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
    return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}
