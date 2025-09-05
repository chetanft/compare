import React from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { ExtractionDetails } from '../../services/api';

interface ExtractionDetailsViewProps {
  extractionDetails: ExtractionDetails;
}

const ExtractionDetailsView: React.FC<ExtractionDetailsViewProps> = ({ extractionDetails }) => {
  const { figma, web, comparison } = extractionDetails;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Figma Summary */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm text-muted-foreground">FIGMA DATA</h3>
            <Badge variant="secondary">{figma.extractionTime}ms</Badge>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Components:</span>
              <Badge variant="outline">{figma.componentCount}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Colors:</span>
              <Badge variant="outline">{figma.colors.length}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Typography:</span>
              <Badge variant="outline">{figma.typography.length}</Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {figma.fileInfo.name}
            </div>
          </div>
        </Card>

        {/* Web Summary */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm text-muted-foreground">WEB DATA</h3>
            <Badge variant="secondary">{web.extractionTime}ms</Badge>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Elements:</span>
              <Badge variant="outline">{web.elementCount}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Colors:</span>
              <Badge variant="outline">{web.colors.length}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Fonts:</span>
              <Badge variant="outline">{web.typography.fontFamilies.length}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Spacing:</span>
              <Badge variant="outline">{web.spacing.length}</Badge>
            </div>
          </div>
        </Card>

        {/* Comparison Summary */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm text-muted-foreground">COMPARISON</h3>
            <Badge 
              variant={comparison.matchPercentage > 50 ? "default" : "destructive"}
            >
              {comparison.matchPercentage.toFixed(1)}%
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Comparisons:</span>
              <Badge variant="outline">{comparison.totalComparisons}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Matches:</span>
              <Badge variant="default">{comparison.matches}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Issues:</span>
              <Badge variant="destructive">{comparison.deviations}</Badge>
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
          {figma.colors.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Colors ({figma.colors.length})</h4>
              <div className="flex flex-wrap gap-2">
                {figma.colors.slice(0, 10).map((color, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded border"
                      style={{ backgroundColor: color.value }}
                    />
                    <span className="text-xs">{color.value}</span>
                  </div>
                ))}
                {figma.colors.length > 10 && (
                  <Badge variant="outline">+{figma.colors.length - 10} more</Badge>
                )}
              </div>
            </div>
          )}

          {/* Typography */}
          {figma.typography.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Typography ({figma.typography.length})</h4>
              <div className="space-y-2">
                {figma.typography.slice(0, 5).map((typo, index) => (
                  <div key={index} className="text-xs p-2 bg-muted rounded">
                    <div className="font-medium">{typo.fontFamily}</div>
                    <div className="text-muted-foreground">
                      {typo.fontSize}px • {typo.fontWeight}
                    </div>
                  </div>
                ))}
                {figma.typography.length > 5 && (
                  <Badge variant="outline">+{figma.typography.length - 5} more</Badge>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Web Details */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Web Extraction Details</h3>
          
          {/* Colors */}
          {web.colors.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Colors ({web.colors.length})</h4>
              <div className="flex flex-wrap gap-2">
                {web.colors.slice(0, 10).map((color, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded border"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs">{color}</span>
                  </div>
                ))}
                {web.colors.length > 10 && (
                  <Badge variant="outline">+{web.colors.length - 10} more</Badge>
                )}
              </div>
            </div>
          )}

          {/* Typography */}
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2">Typography</h4>
            <div className="space-y-2">
              {web.typography.fontFamilies.length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground">Font Families:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {web.typography.fontFamilies.map((font, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {font}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {web.typography.fontSizes.length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground">Font Sizes:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {web.typography.fontSizes.slice(0, 8).map((size, index) => (
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
          {web.spacing.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Spacing ({web.spacing.length})</h4>
              <div className="flex flex-wrap gap-1">
                {web.spacing.slice(0, 8).map((spacing, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {spacing}
                  </Badge>
                ))}
                {web.spacing.length > 8 && (
                  <Badge variant="outline">+{web.spacing.length - 8} more</Badge>
                )}
              </div>
            </div>
          )}

          {/* Border Radius */}
          {web.borderRadius.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Border Radius ({web.borderRadius.length})</h4>
              <div className="flex flex-wrap gap-1">
                {web.borderRadius.map((radius, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {radius}
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
