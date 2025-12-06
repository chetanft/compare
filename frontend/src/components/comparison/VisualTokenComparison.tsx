import React from 'react';
import { GlassCard, GlassHeader, GlassContent } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

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
  delay?: number;
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
  type,
  delay = 0
}: VisualTokenComparisonProps) {
  const safeFigmaTokens = Array.isArray(figmaTokens) ? figmaTokens : []
  const safeWebTokens = Array.isArray(webTokens) ? webTokens : []
  const safeMatchedTokens = Array.isArray(matchedTokens) ? matchedTokens : []
  const safeMissingTokens = Array.isArray(missingTokens) ? missingTokens : []
  const safeExtraTokens = Array.isArray(extraTokens) ? extraTokens : []

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

  const renderColorSwatch = (colorInput: any, idx: number, sublabel?: string) => {
    const color = typeof colorInput === 'string' ? colorInput : (colorInput?.value || '#000000');
    return (
      <div
        key={idx}
        className="group relative flex flex-col items-center justify-center p-2 rounded-xl hover:bg-muted/50 transition-colors"
      >
        <div
          className="w-12 h-12 rounded-full shadow-lg ring-2 ring-white/10 transition-transform group-hover:scale-110"
          style={{ backgroundColor: color }}
        />
        <span className="mt-2 text-[10px] font-mono text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-4 bg-popover px-2 py-1 rounded shadow-sm z-10 whitespace-nowrap">
          {color} {sublabel && `(${sublabel})`}
        </span>
      </div>
    );
  };

  const renderTypographySwatch = (token: TypographyToken, idx: number) => (
    <div key={idx} className="flex flex-col p-3 rounded-lg bg-muted/20 border border-white/5 hover:border-white/20 transition-all">
      <div
        className="text-foreground truncate"
        style={{
          fontFamily: token.fontFamily,
          fontSize: '16px',
        }}
      >
        Aa
      </div>
      <div className="mt-2 flex flex-col gap-0.5">
        <span className="text-[10px] font-medium text-muted-foreground truncate" title={token.fontFamily}>{token.fontFamily}</span>
        <span className="text-[10px] text-muted-foreground/60">{token.fontSize} · {token.fontWeight}</span>
      </div>
    </div>
  );

  const renderSpacingSwatch = (valueInput: any, idx: number) => {
    const value = typeof valueInput === 'object' && valueInput !== null ? (valueInput.value || '0px') : valueInput;
    const numValue = typeof value === 'number' ? value : parseInt(value);

    return (
      <div key={idx} className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-muted/30 transition-colors group">
        <div className="h-10 flex items-center justify-end flex-col w-full gap-1">
          <div
            className="w-full bg-primary/20 rounded-sm"
            style={{ height: `${Math.min(numValue * 2, 40)}px` }}
          />
          <span className="text-[10px] font-mono text-muted-foreground">{value}px</span>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <GlassCard className="mb-6 overflow-hidden">
        <GlassHeader className="flex items-center justify-between bg-muted/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              {icon}
            </div>
            <div>
              <h3 className="text-lg font-semibold">{title}</h3>
              <div className="flex gap-2 text-xs text-muted-foreground">
                <span>{safeFigmaTokens.length} Figma</span>
                <span>•</span>
                <span>{safeWebTokens.length} Web</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className={cn(
                "text-2xl font-bold",
                similarity > 90 ? "text-emerald-500" : similarity > 70 ? "text-amber-500" : "text-rose-500"
              )}>
                {similarity}%
              </span>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Match</p>
            </div>
          </div>
        </GlassHeader>

        <GlassContent className="space-y-8">
          {/* Tokens Grid */}
          <div className="grid md:grid-cols-2 gap-8 relative">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-border to-transparent hidden md:block" />

            {/* Figma Side */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-foreground" />
                Figma Tokens
              </h4>
              <div className={cn(
                "grid gap-2",
                type === 'color' ? "grid-cols-6" : type === 'spacing' ? "grid-cols-6" : "grid-cols-2"
              )}>
                {safeFigmaTokens.slice(0, 12).map((token, idx) => {
                  if (type === 'color') return renderColorSwatch(token, idx);
                  if (type === 'typography') return renderTypographySwatch(token, idx);
                  return renderSpacingSwatch(token, idx);
                })}
              </div>
            </div>

            {/* Web Side */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                Web Implementation
              </h4>
              <div className={cn(
                "grid gap-2",
                type === 'color' ? "grid-cols-6" : type === 'spacing' ? "grid-cols-6" : "grid-cols-2"
              )}>
                {safeWebTokens.slice(0, 12).map((token, idx) => {
                  if (type === 'color') return renderColorSwatch(token, idx);
                  if (type === 'typography') return renderTypographySwatch(token, idx);
                  return renderSpacingSwatch(token, idx);
                })}
              </div>
            </div>
          </div>

          {/* Analysis Section */}
          {(safeMissingTokens.length > 0 || safeExtraTokens.length > 0) && (
            <div className="pt-4 border-t border-border/40 grid md:grid-cols-2 gap-4">
              {safeMissingTokens.length > 0 && (
                <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                  <div className="flex items-center gap-2 mb-3 text-rose-600 dark:text-rose-400">
                    <XCircle className="w-4 h-4" />
                    <span className="text-sm font-semibold">Missing Tokens ({safeMissingTokens.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {safeMissingTokens.slice(0, 6).map((token, i) => (
                      <Badge key={i} variant="outline" className="bg-background border-border text-xs shadow-none text-muted-foreground">
                        {type === 'typography' ? token.fontFamily : getTokenValue(token)} {type !== 'typography' && type !== 'color' && 'px'}
                      </Badge>
                    ))}
                    {safeMissingTokens.length > 6 && (
                      <span className="text-xs text-muted-foreground self-center">+{safeMissingTokens.length - 6} more</span>
                    )}
                  </div>
                </div>
              )}

              {safeExtraTokens.length > 0 && (
                <div className="p-4 rounded-xl bg-muted/30 border border-border">
                  <div className="flex items-center gap-2 mb-3 text-amber-600 dark:text-amber-400">
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-semibold">Unmatched Web Tokens ({safeExtraTokens.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {safeExtraTokens.slice(0, 6).map((token, i) => (
                      <Badge key={i} variant="outline" className="bg-background border-border text-xs shadow-none text-muted-foreground">
                        {type === 'typography' ? token.fontFamily : getTokenValue(token)} {type !== 'typography' && type !== 'color' && 'px'}
                      </Badge>
                    ))}
                    {safeExtraTokens.length > 6 && (
                      <span className="text-xs text-muted-foreground self-center">+{safeExtraTokens.length - 6} more</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </GlassContent>
      </GlassCard>
    </motion.div>
  );
}

