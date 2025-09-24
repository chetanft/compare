import React from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { ExtractionDetails } from '../../services/api';

interface ExtractionDetailsViewProps {
  extractionDetails: ExtractionDetails;
}

const ExtractionDetailsView: React.FC<ExtractionDetailsViewProps> = ({ extractionDetails }) => {
  // Safely destructure with fallbacks to prevent undefined errors
  const figma = extractionDetails?.figma || {};
  const web = extractionDetails?.web || {};
  const comparison = extractionDetails?.comparison || {};

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Figma Summary */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm text-muted-foreground">FIGMA DATA</h3>
            <Badge variant="secondary">{figma.extractionTime || 0}ms</Badge>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Components:</span>
              <Badge variant="outline">{figma.componentCount || extractionDetails?.figma?.componentCount || 0}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Colors:</span>
              <Badge variant="outline">{figma.colors?.length || 0}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Typography:</span>
              <Badge variant="outline">{figma.typography?.fontFamilies?.length || 0}</Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {figma.fileInfo?.name || 'Unknown'}
            </div>
          </div>
        </Card>

        {/* Web Summary */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm text-muted-foreground">WEB DATA</h3>
            <Badge variant="secondary">{web.extractionTime || 0}ms</Badge>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Elements:</span>
              <Badge variant="outline">{web.elementCount || 0}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Colors:</span>
              <Badge variant="outline">{web.colors?.length || 0}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Fonts:</span>
              <Badge variant="outline">{web.typography?.fontFamilies?.length || 0}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Spacing:</span>
              <Badge variant="outline">{web.spacing?.length || 0}</Badge>
            </div>
          </div>
        </Card>

        {/* Comparison Summary */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm text-muted-foreground">COMPARISON</h3>
            <Badge 
              variant={(comparison.matchPercentage || 0) > 50 ? "default" : "destructive"}
            >
              {(comparison.matchPercentage || 0).toFixed(1)}%
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Comparisons:</span>
              <Badge variant="outline">{comparison.totalComparisons || 0}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Matches:</span>
              <Badge variant="default">{comparison.matches || 0}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Issues:</span>
              <Badge variant="destructive">{comparison.deviations || 0}</Badge>
            </div>
          </div>
        </Card>
      </div>

      <Separator />

      {/* Detailed Extraction Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Figma Details */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Figma Extraction Details</h3>
          
          {/* Colors */}
          {(figma.colors?.length || 0) > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Colors ({figma.colors?.length || 0})</h4>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {(figma.colors || []).map((color, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded border"
                      style={{ backgroundColor: typeof color === 'string' ? color : color.value }}
                    />
                    <span className="text-xs">{typeof color === 'string' ? color : color.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Typography */}
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2">Typography</h4>
            <div className="space-y-2">
              {(figma.typography?.fontFamilies?.length || 0) > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground">Font Families:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(figma.typography?.fontFamilies || []).map((font: any, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {font}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {(figma.typography?.fontSizes?.length || 0) > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground">Font Sizes:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(figma.typography?.fontSizes || []).map((size: any, index: number) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {size}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {(figma.typography?.fontWeights?.length || 0) > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground">Font Weights:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(figma.typography?.fontWeights || []).map((weight: any, index: number) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {weight}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Spacing */}
          {((figma as any).spacing?.length || 0) > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Spacing ({(figma as any).spacing?.length || 0})</h4>
              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                {((figma as any).spacing || []).map((space: any, index: number) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {typeof space === 'object' ? 
                      `${space.value || space.name || 'Unknown'}${space.unit || ''}` : 
                      String(space)
                    }
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Border Radius */}
          {((figma as any).borderRadius?.length || 0) > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Border Radius ({(figma as any).borderRadius?.length || 0})</h4>
              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                {((figma as any).borderRadius || []).map((radius: any, index: number) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {typeof radius === 'object' ? 
                      `${radius.value || radius.name || 'Unknown'}${radius.unit || ''}` : 
                      String(radius)
                    }
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Web Details */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Web Extraction Details</h3>
          
          {/* Colors */}
          {(web.colors?.length || 0) > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Colors ({web.colors?.length || 0})</h4>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {(web.colors || []).map((color, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded border"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs">{color}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Typography */}
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2">Typography</h4>
            <div className="space-y-2">
              {(web.typography?.fontFamilies?.length || 0) > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground">Font Families:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(web.typography?.fontFamilies || []).map((font, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {font}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {(web.typography?.fontSizes?.length || 0) > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground">Font Sizes:</span>
                  <div className="flex flex-wrap gap-1 mt-1 max-h-20 overflow-y-auto">
                    {(web.typography?.fontSizes || []).map((size, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {size}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Spacing */}
          {(web.spacing?.length || 0) > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Spacing ({web.spacing?.length || 0})</h4>
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                {(web.spacing || []).map((spacing, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {typeof spacing === 'object' ? 
                      `${spacing.value || spacing.name || 'Unknown'}${spacing.unit || ''}` : 
                      String(spacing)
                    }
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Border Radius */}
          {(web.borderRadius?.length || 0) > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Border Radius ({web.borderRadius?.length || 0})</h4>
              <div className="flex flex-wrap gap-1">
                {(web.borderRadius || []).map((radius, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {typeof radius === 'object' ? 
                      `${radius.value || radius.name || 'Unknown'}${radius.unit || ''}` : 
                      String(radius)
                    }
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ExtractionDetailsView;
