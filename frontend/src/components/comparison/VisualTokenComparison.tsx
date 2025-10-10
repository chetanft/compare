import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Plus } from 'lucide-react';

interface ColorToken {
  value: string;
  id: string;
  frequency?: number;
  count?: number;
}

interface TypographyToken {
  fontFamily: string;
  fontSize?: string | number;
  fontWeight?: string | number;
  lineHeight?: string | number;
  id: string;
}

interface SpacingToken {
  value: string | number;
  id: string;
  frequency?: number;
}

interface MatchedItem {
  figma: any;
  web: any;
  similarity: number;
}

interface VisualTokenComparisonProps {
  title: string;
  icon: React.ReactNode;
  figmaTokens: any[];
  webTokens: any[];
  matchedTokens: MatchedItem[];
  missingTokens: any[];
  extraTokens: any[];
  similarity: number;
  type: 'color' | 'typography' | 'spacing' | 'padding';
}

export function VisualTokenComparison({
  title,
  icon,
  figmaTokens,
  webTokens,
  matchedTokens,
  missingTokens,
  extraTokens,
  similarity,
  type
}: VisualTokenComparisonProps) {
  // Ensure all inputs are arrays
  const safeFigmaTokens = Array.isArray(figmaTokens) ? figmaTokens : []
  const safeWebTokens = Array.isArray(webTokens) ? webTokens : []
  const safeMatchedTokens = Array.isArray(matchedTokens) ? matchedTokens : []
  const safeMissingTokens = Array.isArray(missingTokens) ? missingTokens : []
  const safeExtraTokens = Array.isArray(extraTokens) ? extraTokens : []
  
  // Helper to safely extract value from token (handles both object and primitive)
  const getTokenValue = (token: any): string => {
    if (typeof token === 'string') return token;
    if (typeof token === 'number') return token.toString();
    if (token && typeof token === 'object' && 'value' in token) {
      return typeof token.value === 'string' || typeof token.value === 'number' 
        ? token.value.toString() 
        : '';
    }
    return '';
  };
  
  const renderColorSwatch = (colorInput: any, label: string, sublabel?: string) => {
    // Extract color value from object or use string directly
    const color = typeof colorInput === 'string' ? colorInput : (colorInput?.value || '#000000');
    
    return (
      <div className="flex flex-col items-center">
        <div 
          className="w-16 h-16 rounded-lg shadow-md border border-gray-200"
          style={{ backgroundColor: color }}
          title={`${color} - ${sublabel || ''}`}
        />
        <span className="mt-2 text-xs font-mono text-gray-700">{color}</span>
        <span className="text-xs text-gray-500">{label}</span>
        {sublabel && <span className="text-xs text-gray-400">{sublabel}</span>}
      </div>
    );
  };

  const renderTypographySwatch = (token: TypographyToken, label: string) => (
    <div className="flex flex-col items-center p-4 border border-gray-200 rounded-lg bg-white">
      <div 
        className="text-center mb-2"
        style={{ 
          fontFamily: token.fontFamily,
          fontSize: typeof token.fontSize === 'number' ? `${token.fontSize}px` : token.fontSize,
          fontWeight: token.fontWeight
        }}
      >
        Aa
      </div>
      <span className="text-xs font-semibold text-gray-700">{token.fontFamily}</span>
      <span className="text-xs text-gray-500">{token.fontSize}</span>
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  );

  const renderSpacingSwatch = (valueInput: any, label: string) => {
    // Extract value from object or use string/number directly
    const value = typeof valueInput === 'object' && valueInput !== null 
      ? (valueInput.value || '0px') 
      : valueInput;
    
    return (
      <div className="flex flex-col items-center">
        <div className="relative w-20 h-20 border-2 border-dashed border-gray-300 rounded flex items-center justify-center bg-blue-50">
          <div 
            className="bg-blue-500"
            style={{ 
              width: typeof value === 'number' ? `${Math.min(value / 2, 60)}px` : '50%',
              height: typeof value === 'number' ? `${Math.min(value / 2, 60)}px` : '50%'
            }}
          />
        </div>
        <span className="mt-2 text-xs font-mono text-gray-700">{value}px</span>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
    );
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">{similarity}%</div>
            <div className="text-sm text-gray-500">Similarity</div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-800">{safeFigmaTokens.length}</div>
            <div className="text-sm text-gray-600">Figma {title}</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-800">{safeWebTokens.length}</div>
            <div className="text-sm text-gray-600">Developed {title}</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{safeMatchedTokens.length}</div>
            <div className="text-sm text-gray-600">Matched {title}</div>
          </div>
        </div>

        {/* Token Palettes */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Figma Tokens */}
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              Figma {title} ({safeFigmaTokens.length})
            </h3>
            <div className="grid grid-cols-4 gap-4">
              {safeFigmaTokens.slice(0, 12).map((token, idx) => {
                if (type === 'color') {
                  const freq = token.frequency || token.count || 0;
                  return renderColorSwatch(
                    token.value || token,
                    `#${idx + 1}`,
                    `Frequency: ${freq}%`
                  );
                } else if (type === 'typography') {
                  return renderTypographySwatch(token, `#${idx + 1}`);
                } else {
                  return renderSpacingSwatch(token.value || token, `#${idx + 1}`);
                }
              })}
            </div>
          </div>

          {/* Web/Developed Tokens */}
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              Developed {title} ({safeWebTokens.length})
            </h3>
            <div className="grid grid-cols-4 gap-4">
              {safeWebTokens.slice(0, 12).map((token, idx) => {
                if (type === 'color') {
                  const freq = token.frequency || token.count || 0;
                  return renderColorSwatch(
                    token.value || token,
                    `#${idx + 1}`,
                    `Frequency: ${freq}%`
                  );
                } else if (type === 'typography') {
                  return renderTypographySwatch(token, `#${idx + 1}`);
                } else {
                  return renderSpacingSwatch(token.value || token, `#${idx + 1}`);
                }
              })}
            </div>
          </div>
        </div>

        {/* Matched Tokens */}
        {safeMatchedTokens.length > 0 && (
          <div className="mb-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Matched {title} ({safeMatchedTokens.length})
            </h3>
            <div className="space-y-3">
              {safeMatchedTokens.map((match, idx) => (
                <div key={idx} className="flex items-center gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  {type === 'color' && (
                    <>
                      <div className="w-12 h-12 rounded" style={{ backgroundColor: match.figma.value || match.figma }} />
                      <span className="flex-1 font-mono text-sm">{match.figma.value || match.figma}</span>
                      <span className="text-xl">≈</span>
                      <div className="w-12 h-12 rounded" style={{ backgroundColor: match.web.value || match.web }} />
                      <span className="flex-1 font-mono text-sm">{match.web.value || match.web}</span>
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                        {match.similarity}% match
                      </Badge>
                    </>
                  )}
                  {type === 'typography' && (
                    <>
                      <div className="flex-1">
                        <div className="font-semibold">{match.figma.fontFamily}</div>
                        <div className="text-sm text-gray-600">{match.figma.fontSize} / {match.figma.fontWeight}</div>
                      </div>
                      <span className="text-xl">≈</span>
                      <div className="flex-1">
                        <div className="font-semibold">{match.web.fontFamily}</div>
                        <div className="text-sm text-gray-600">{match.web.fontSize} / {match.web.fontWeight}</div>
                      </div>
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                        {match.similarity}% match
                      </Badge>
                    </>
                  )}
                  {(type === 'spacing' || type === 'padding') && (
                    <>
                      <span className="flex-1 font-mono text-sm">{match.figma.value || match.figma}px</span>
                      <span className="text-xl">≈</span>
                      <span className="flex-1 font-mono text-sm">{match.web.value || match.web}px</span>
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                        {match.similarity}% match
                      </Badge>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Missing Tokens */}
        {safeMissingTokens.length > 0 && (
          <div className="mb-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
              <XCircle className="w-5 h-5 text-red-600" />
              Missing {title} ({safeMissingTokens.length})
            </h3>
            <div className="space-y-2">
              {safeMissingTokens.map((token, idx) => (
                <div key={idx} className="flex items-center gap-4 p-3 bg-red-50 rounded-lg border border-red-200">
                  {type === 'color' && (
                    <>
                      <div className="w-10 h-10 rounded" style={{ backgroundColor: getTokenValue(token) }} />
                      <span className="flex-1 font-mono text-sm">{getTokenValue(token)}</span>
                      <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                        Missing in developed
                      </Badge>
                      <span className="text-sm text-gray-500">{token.frequency || 0}%</span>
                    </>
                  )}
                  {type === 'typography' && (
                    <>
                      <div className="flex-1">
                        <div className="font-semibold">{token.fontFamily}</div>
                        <div className="text-sm text-gray-600">{token.fontSize} / {token.fontWeight}</div>
                      </div>
                      <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                        Missing in developed
                      </Badge>
                    </>
                  )}
                  {(type === 'spacing' || type === 'padding') && (
                    <>
                      <span className="flex-1 font-mono text-sm">{getTokenValue(token)}px</span>
                      <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                        Missing in developed
                      </Badge>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Extra Tokens */}
        {safeExtraTokens.length > 0 && (
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
              <Plus className="w-5 h-5 text-orange-600" />
              Extra {title} ({safeExtraTokens.length})
            </h3>
            <div className="space-y-2">
              {safeExtraTokens.map((token, idx) => (
                <div key={idx} className="flex items-center gap-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  {type === 'color' && (
                    <>
                      <div className="w-10 h-10 rounded" style={{ backgroundColor: getTokenValue(token) }} />
                      <span className="flex-1 font-mono text-sm">{getTokenValue(token)}</span>
                      <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                        Extra in developed
                      </Badge>
                      <span className="text-sm text-gray-500">{token.frequency || 0}%</span>
                    </>
                  )}
                  {type === 'typography' && (
                    <>
                      <div className="flex-1">
                        <div className="font-semibold">{token.fontFamily}</div>
                        <div className="text-sm text-gray-600">{token.fontSize} / {token.fontWeight}</div>
                      </div>
                      <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                        Extra in developed
                      </Badge>
                    </>
                  )}
                  {(type === 'spacing' || type === 'padding') && (
                    <>
                      <span className="flex-1 font-mono text-sm">{getTokenValue(token)}px</span>
                      <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                        Extra in developed
                      </Badge>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

