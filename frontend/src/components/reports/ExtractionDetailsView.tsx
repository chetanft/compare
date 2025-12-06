import React from 'react';
import { GlassCard, GlassContent } from '../ui/GlassCard';
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
        <GlassCard>
          <GlassContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm text-muted-foreground">FIGMA DATA</h3>
              <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">{figma.extractionTime || 0}ms</Badge>
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
              <div className="text-xs text-muted-foreground mt-2 truncate" title={figma.fileInfo?.name || 'Unknown'}>
                {figma.fileInfo?.name || 'Unknown'}
              </div>
            </div>
          </GlassContent>
        </GlassCard>

        {/* Web Summary */}
        <GlassCard>
          <GlassContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm text-muted-foreground">WEB DATA</h3>
              <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">{web.extractionTime || 0}ms</Badge>
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
          </GlassContent>
        </GlassCard>

        {/* Comparison Summary */}
        <GlassCard>
          <GlassContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm text-muted-foreground">COMPARISON</h3>
              <Badge
                className={(comparison.matchPercentage || 0) > 80 ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" : (comparison.matchPercentage || 0) > 50 ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20" : "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20"}
                variant="outline"
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
                <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900">{comparison.matches || 0}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Issues:</span>
                <Badge variant="outline" className="text-rose-600 border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-900">{comparison.deviations || 0}</Badge>
              </div>
            </div>
          </GlassContent>
        </GlassCard>
      </div>

      <Separator className="bg-border/50" />

      {/* Detailed Extraction Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Figma Details */}
        <GlassCard>
          <GlassContent className="p-4">
            <h3 className="font-semibold mb-4 text-primary">Figma Extraction Details</h3>

            {/* Colors */}
            {(figma.colors?.length || 0) > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2 text-muted-foreground uppercase tracking-wider text-[10px]">Colors ({figma.colors?.length || 0})</h4>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                  {(figma.colors || []).map((color, index) => (
                    <div key={index} className="flex items-center gap-2 group p-1 rounded hover:bg-muted/50 transition-colors">
                      <div
                        className="w-4 h-4 rounded-full border shadow-sm ring-1 ring-border"
                        style={{ backgroundColor: typeof color === 'string' ? color : color.value }}
                      />
                      <span className="text-xs font-mono text-muted-foreground group-hover:text-foreground">{typeof color === 'string' ? color : color.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Typography */}
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2 text-muted-foreground uppercase tracking-wider text-[10px]">Typography</h4>
              <div className="space-y-3">
                {(figma.typography?.fontFamilies?.length || 0) > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground/70 block mb-1">Font Families:</span>
                    <div className="flex flex-wrap gap-1">
                      {(figma.typography?.fontFamilies || []).map((font: any, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs bg-background/50">
                          {font}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {(figma.typography?.fontSizes?.length || 0) > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground/70 block mb-1">Font Sizes:</span>
                    <div className="flex flex-wrap gap-1">
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
                    <span className="text-xs text-muted-foreground/70 block mb-1">Font Weights:</span>
                    <div className="flex flex-wrap gap-1">
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
                <h4 className="text-sm font-medium mb-2 text-muted-foreground uppercase tracking-wider text-[10px]">Spacing ({(figma as any).spacing?.length || 0})</h4>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                  {((figma as any).spacing || []).map((space: any, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs font-mono bg-background/50">
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
                <h4 className="text-sm font-medium mb-2 text-muted-foreground uppercase tracking-wider text-[10px]">Border Radius ({(figma as any).borderRadius?.length || 0})</h4>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                  {((figma as any).borderRadius || []).map((radius: any, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs font-mono bg-background/50">
                      {typeof radius === 'object' ?
                        `${radius.value || radius.name || 'Unknown'}${radius.unit || ''}` :
                        String(radius)
                      }
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </GlassContent>
        </GlassCard>

        {/* Web Details */}
        <GlassCard>
          <GlassContent className="p-4">
            <h3 className="font-semibold mb-4 text-emerald-600 dark:text-emerald-400">Web Extraction Details</h3>

            {/* Colors */}
            {(web.colors?.length || 0) > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2 text-muted-foreground uppercase tracking-wider text-[10px]">Colors ({web.colors?.length || 0})</h4>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                  {(web.colors || []).map((color, index) => (
                    <div key={index} className="flex items-center gap-2 group p-1 rounded hover:bg-muted/50 transition-colors">
                      <div
                        className="w-4 h-4 rounded-full border shadow-sm ring-1 ring-border"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs font-mono text-muted-foreground group-hover:text-foreground">{color}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Typography */}
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2 text-muted-foreground uppercase tracking-wider text-[10px]">Typography</h4>
              <div className="space-y-3">
                {(web.typography?.fontFamilies?.length || 0) > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground/70 block mb-1">Font Families:</span>
                    <div className="flex flex-wrap gap-1">
                      {(web.typography?.fontFamilies || []).map((font, index) => (
                        <Badge key={index} variant="outline" className="text-xs bg-background/50">
                          {font}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {(web.typography?.fontSizes?.length || 0) > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground/70 block mb-1">Font Sizes:</span>
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto custom-scrollbar">
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
                <h4 className="text-sm font-medium mb-2 text-muted-foreground uppercase tracking-wider text-[10px]">Spacing ({web.spacing?.length || 0})</h4>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto custom-scrollbar">
                  {(web.spacing || []).map((spacing, index) => (
                    <Badge key={index} variant="secondary" className="text-xs font-mono">
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
                <h4 className="text-sm font-medium mb-2 text-muted-foreground uppercase tracking-wider text-[10px]">Border Radius ({web.borderRadius?.length || 0})</h4>
                <div className="flex flex-wrap gap-1">
                  {(web.borderRadius || []).map((radius, index) => (
                    <Badge key={index} variant="secondary" className="text-xs font-mono">
                      {typeof radius === 'object' ?
                        `${radius.value || radius.name || 'Unknown'}${radius.unit || ''}` :
                        String(radius)
                      }
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </GlassContent>
        </GlassCard>
      </div>
    </div>
  );
};

export default ExtractionDetailsView;
