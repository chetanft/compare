import { useState } from 'react';
import {
  SwatchIcon,
  DocumentTextIcon,
  CubeIcon,
  ArrowsPointingOutIcon,
  Square3Stack3DIcon,
  PaintBrushIcon
} from '@heroicons/react/24/outline';
import { Tab } from '@headlessui/react';
import { classNames } from '../../utils/classNames';
import { FigmaData } from '../../../../src/types/extractor';
// import ColorUsageSection from '../ui/ColorUsageSection';

interface DesignToken {
  name?: string;
  value: string;
  styleId?: string;
  alpha?: number;
}

interface TypographyToken {
  id?: string;
  name?: string;
  fontFamilies?: string[];
  fontFamily?: string;
  fontSizes?: (string | number)[];
  fontSize?: number;
  fontWeights?: (string | number)[];
  fontWeight?: number | string;
  lineHeights?: (string | number)[];
  lineHeight?: number;
  letterSpacing?: number;
  usageCount?: number;
}

interface SpacingToken {
  name?: string;
  value: number;
  unit: string;
  type?: string;
}

interface BorderRadiusToken {
  name?: string;
  value: number;
  unit: string;
}

interface ShadowToken {
  name?: string;
  type: string;
  color: string;
  offsetX: number;
  offsetY: number;
  radius: number;
  spread: number;
}

interface ComponentProperty {
  variants?: Record<string, string>;
  layout?: {
    mode?: string;
    padding?: {
      left: number;
      right: number;
      top: number;
      bottom: number;
    };
    spacing?: number;
    width?: number;
    height?: number;
  };
  styles?: Record<string, string>;
  text?: Record<string, string>;
  variables?: Record<string, string | string[]>;
}

interface FigmaComponent {
  id: string;
  name: string;
  type: string;
  properties?: ComponentProperty;
  children?: FigmaComponent[];
}

interface FigmaDataViewProps {
  data: FigmaData;
}

// Helper function to ensure color values are properly formatted
const getColorValue = (color: any): string => {
  if (!color) return '#000000';
  
  // If color is already a string, return it
  if (typeof color === 'string') return color;
  
  // If color is an object with r,g,b properties, convert to hex
  if (typeof color === 'object' && 'r' in color && 'g' in color && 'b' in color) {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    
    if ('a' in color && color.a < 1) {
      return `rgba(${r}, ${g}, ${b}, ${color.a})`;
    }
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  
  // If color has a value property, use that
  if (typeof color === 'object' && 'value' in color) {
    return getColorValue(color.value);
  }
  
  return '#000000';
}

const FigmaDataView: React.FC<FigmaDataViewProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'colors' | 'typography' | 'components'>('overview');
  const [expandedComponents, setExpandedComponents] = useState<Record<string, boolean>>({});
  
  // Extract design tokens from data
  const colors = data.data?.colors || [];
  const typography = data.data?.typography || [];
  const components = data.data?.components || [];
  const styles = data.data?.styles || [];
  
  // Calculate stats - Use recursive count from API response, fallback to array length
  const totalComponents = (data as any).componentCount || data.metadata?.componentCount || components.length;
  const totalColors = colors.length;
  const totalTypography = typography.length;
  const totalStyles = styles.length;
  
  const toggleComponent = (id: string) => {
    setExpandedComponents(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const renderComponentProperties = (properties: any) => {
    console.log('Rendering properties:', properties);
    
    if (!properties || typeof properties !== 'object') {
      return (
        <div className="p-4 text-sm text-muted-foreground italic">
          No properties available
        </div>
      );
    }

    // Enhanced property rendering with clear formatting
    const sections = [
      {
        title: 'Colors',
        data: properties.colors || {},
        render: (value: any, key: string) => {
          if (typeof value === 'string' && value.startsWith('#')) {
            return (
              <div className="flex items-center space-x-2">
                <div 
                  className="w-4 h-4 rounded border cursor-pointer hover:ring-2 hover:ring-blue-500" 
                  style={{ backgroundColor: value }}
                  title={`Click to see all elements using ${value}`}
                  onClick={() => {
                    // Navigate to color analytics with selected color
                    window.open(`/color-analytics?color=${encodeURIComponent(value)}`, '_blank');
                  }}
                />
                <span className="font-mono text-sm">{value}</span>
                <span className="text-xs text-gray-500 hover:text-blue-500 cursor-pointer"
                      onClick={() => window.open(`/color-analytics?color=${encodeURIComponent(value)}`, '_blank')}>
                  (view usage)
                </span>
              </div>
            );
          }
          return String(value);
        }
      },
      {
        title: 'Typography',
        data: properties.typography || {},
        render: (value: any, key: string) => {
          if (typeof value === 'object' && value.fontFamily) {
            return (
              <div className="space-y-1">
                <div className="font-medium">{value.fontFamily}</div>
                <div className="text-xs text-muted-foreground">
                  {value.fontSize}px • {value.fontWeight} • {value.lineHeight ? `${value.lineHeight}px` : 'auto'}
                </div>
              </div>
            );
          }
          return String(value);
        }
      },
      {
        title: 'Layout',
        data: properties.layout || {},
        render: (value: any, key: string) => {
          if (typeof value === 'object' && value !== null) {
            if ('left' in value && 'right' in value) { // padding object
              return (
                <div className="space-y-1">
                  <div className="font-medium">Padding</div>
                  <div className="text-xs text-muted-foreground">
                    {value.top}px {value.right}px {value.bottom}px {value.left}px
                  </div>
                </div>
              );
            }
            if (key === 'mode') {
              return <span className="capitalize font-medium">{value}</span>;
            }
            if (key === 'spacing' || key === 'gap') {
              return <span className="font-medium">{value}px</span>;
            }
            if (key === 'width' || key === 'height') {
              return <span className="font-medium">{value}px</span>;
            }
            return JSON.stringify(value, null, 2);
          }
          return String(value);
        }
      },
      {
        title: 'Dimensions',
        data: properties.dimensions || {},
        render: (value: any, key: string) => {
          if (typeof value === 'object' && value.width !== undefined) {
            return (
              <div className="space-y-1">
                <div className="font-medium">Size</div>
                <div className="text-xs text-muted-foreground">
                  {value.width}px × {value.height}px
                </div>
              </div>
            );
          }
          return String(value);
        }
      },
      {
        title: 'Borders',
        data: properties.border || {},
        render: (value: any, key: string) => {
          if (typeof value === 'object' && value.color) {
            return (
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded border" 
                  style={{ backgroundColor: value.color }}
                />
                <span className="text-xs">{value.width}px {value.style}</span>
              </div>
            );
          }
          return String(value);
        }
      },
      {
        title: 'Effects',
        data: properties.shadows || properties.effects || {},
        render: (value: any, key: string) => {
          if (Array.isArray(value) && value.length > 0) {
            return (
              <div className="space-y-1">
                <div className="font-medium">{value.length} shadow{value.length > 1 ? 's' : ''}</div>
                {value.map((shadow: any, index: number) => (
                  <div key={index} className="text-xs text-muted-foreground">
                    {shadow.type}: {shadow.offsetX}px {shadow.offsetY}px {shadow.radius}px
                  </div>
                ))}
              </div>
            );
          }
          return String(value);
        }
      },
      {
        title: 'Variables',
        data: properties.variables || {},
        render: (value: any, key: string) => {
          if (typeof value === 'string' && value.includes('VariableID:')) {
            const parts = value.split(':');
            const varName = parts[0];
            const varId = parts.slice(1).join(':');
            return (
              <div className="space-y-1">
                <div className="font-medium">{varName}</div>
                <div className="text-xs text-muted-foreground font-mono">{varId}</div>
              </div>
            );
          }
          return String(value);
        }
      },
      {
        title: 'Styles',
        data: properties.styles || {},
        render: (value: any, key: string) => {
          if (typeof value === 'string' && (value.includes('fills') || value.includes('strokes'))) {
            return (
              <div className="text-xs text-muted-foreground">
                {value.split(', ').join(' + ')}
              </div>
            );
          }
          return typeof value === 'object' ? JSON.stringify(value) : String(value);
        }
      },
      {
        title: 'Text',
        data: properties.text || {},
        render: (value: any, key: string) => String(value)
      }
    ];

    // If no structured sections found, show raw properties
    const structuredSections = sections.filter(section => Object.keys(section.data).length > 0);
    
    if (structuredSections.length === 0) {
      // Fallback: show all properties as raw data
      const allEntries = Object.entries(properties);
      if (allEntries.length === 0) {
        return (
          <div className="p-4 text-sm text-muted-foreground italic">
            Properties object is empty
          </div>
        );
      }
      
      return (
        <div className="mt-2">
          <div className="border rounded-md overflow-hidden">
            <div className="bg-muted/50 px-4 py-2 text-sm font-medium text-foreground">
              Raw Properties
            </div>
            <div className="divide-y">
              {allEntries.map(([key, value]) => (
                <div key={key} className="px-4 py-2 flex text-sm">
                  <div className="w-1/3 font-medium text-muted-foreground">{key}</div>
                  <div className="w-2/3 text-gray-900 font-mono text-xs">
                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="mt-2 space-y-3">
        {structuredSections.map(section => {
          const entries = Object.entries(section.data);
          
          return (
            <div key={section.title} className="border rounded-md overflow-hidden">
              <div className="bg-muted/50 px-4 py-2 text-sm font-medium text-foreground">
                {section.title} ({entries.length})
              </div>
              <div className="divide-y">
                {entries.map(([key, value]) => (
                  <div key={key} className="px-4 py-2 flex text-sm">
                    <div className="w-1/3 font-medium text-muted-foreground">{key}</div>
                    <div className="w-2/3 text-gray-900">{section.render(value, key)}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderComponent = (component: FigmaComponent, depth = 0) => {
    const isExpanded = expandedComponents[component.id];
    const properties = (component as any).properties;
    
    // Debug logging
    console.log('Component:', component.name, 'Properties:', properties);
    
    const hasProperties = properties && Object.keys(properties).length > 0;
    const propertyCount = hasProperties ? 
      Object.values(properties).reduce((total: number, section: any) => {
        if (section && typeof section === 'object') {
          return total + Object.keys(section).length;
        }
        return total;
      }, 0) : 0;
    
    return (
      <div key={component.id} className="mb-4 border rounded-lg overflow-hidden">
        <div 
          className={classNames(
            "flex items-center justify-between py-3 px-4",
            "bg-muted/50 hover:bg-gray-100 cursor-pointer"
          )}
          onClick={() => toggleComponent(component.id)}
        >
          <div className="flex items-center">
            <CubeIcon className="w-5 h-5 mr-2 text-blue-500" />
            <span className="font-medium text-gray-900">{component.name}</span>
            <span className="ml-2 text-sm text-muted-foreground">{component.type}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-muted-foreground mr-2">
              {hasProperties ? `${propertyCount} properties` : 'No properties'}
            </span>
            {hasProperties && (
              <svg
                className={classNames(
                  "w-5 h-5 text-gray-400 transform transition-transform",
                  isExpanded ? "rotate-180" : ""
                )}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </div>
        </div>
        
        {isExpanded && hasProperties && (
          <div className="p-4 bg-card">
            {renderComponentProperties(properties)}
          </div>
        )}
      </div>
    );
  };
  
  const renderColorToken = (token: DesignToken, index: number) => {
    const colorValue = getColorValue(token);
    const alpha = token.alpha !== undefined ? token.alpha : 1;
    
    return (
      <div key={index} className="flex items-center p-2 border rounded mb-2 bg-card">
        <div 
          className="w-10 h-10 rounded mr-3 border"
          style={{ 
            backgroundColor: colorValue,
            opacity: alpha
          }}
        />
        <div className="flex-1">
          <div className="font-medium text-sm">
            {token.name || `Color ${index + 1}`}
          </div>
          <div className="text-xs text-muted-foreground flex items-center">
            <span className="uppercase">{colorValue}</span>
            {alpha !== 1 && (
              <span className="ml-2">Opacity: {Math.round(alpha * 100)}%</span>
            )}
          </div>
        </div>
      </div>
    );
  };
  
const renderTypographyToken = (token: TypographyToken, index: number) => {
  const families = token.fontFamilies || (token.fontFamily ? [token.fontFamily] : []);
  const sizes = token.fontSizes || (token.fontSize !== undefined ? [token.fontSize] : []);
  const weights = token.fontWeights || (token.fontWeight !== undefined ? [token.fontWeight] : []);
  const lineHeights = token.lineHeights || (token.lineHeight !== undefined ? [token.lineHeight] : []);

  return (
    <div key={`${token.id || index}-typography`} className="space-y-2 rounded-lg border bg-card px-3 py-3 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-medium text-foreground">{token.name || `Style ${index + 1}`}</span>
        {token.usageCount !== undefined && (
          <span className="text-muted-foreground">{token.usageCount} uses</span>
        )}
      </div>
      <div className="space-y-1 text-muted-foreground">
        {families.length > 0 && (
          <div>
            <span className="font-semibold text-foreground">Families:</span> {families.join(', ')}
          </div>
        )}
        {sizes.length > 0 && (
          <div>
            <span className="font-semibold text-foreground">Sizes:</span> {sizes.map(size => `${size}`).join(', ')}
          </div>
        )}
        {weights.length > 0 && (
          <div>
            <span className="font-semibold text-foreground">Weights:</span> {weights.join(', ')}
          </div>
        )}
        {lineHeights.length > 0 && (
          <div>
            <span className="font-semibold text-foreground">Line heights:</span> {lineHeights.join(', ')}
          </div>
        )}
      </div>
    </div>
  );
};
  
  const renderSpacingToken = (token: SpacingToken, index: number) => {
    const value = token.value;
    const unit = token.unit || 'px';
    const type = token.type || 'spacing';
    
    return (
      <div key={index} className="flex items-center p-2 border rounded mb-2 bg-card">
        <div className="w-16 h-10 mr-3 bg-gray-100 flex items-center justify-center relative">
          {type === 'gap' ? (
            <div className="flex items-center">
              <div className="w-3 h-6 bg-blue-200"></div>
              <div className="text-xs text-blue-500 mx-1">{value}{unit}</div>
              <div className="w-3 h-6 bg-blue-200"></div>
            </div>
          ) : (
            <div className="w-10 h-6 bg-blue-200 flex items-center justify-center">
              <ArrowsPointingOutIcon className="w-4 h-4 text-blue-500" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="font-medium text-sm">
            {token.name || `${type === 'gap' ? 'Gap' : 'Spacing'} ${index + 1}`}
          </div>
          <div className="text-xs text-muted-foreground">
            {value}{unit} {type && `(${type})`}
          </div>
        </div>
      </div>
    );
  };
  
  const renderBorderRadiusToken = (token: BorderRadiusToken, index: number) => {
    const value = token.value;
    const unit = token.unit || 'px';
    
    return (
      <div key={index} className="flex items-center p-2 border rounded mb-2 bg-card">
        <div 
          className="w-10 h-10 mr-3 bg-gray-100"
          style={{ 
            borderRadius: `${value}${unit}`
          }}
        />
        <div className="flex-1">
          <div className="font-medium text-sm">
            {token.name || `Border Radius ${index + 1}`}
          </div>
          <div className="text-xs text-muted-foreground">
            {value}{unit}
          </div>
        </div>
      </div>
    );
  };
  
  const renderShadowToken = (token: ShadowToken, index: number) => {
    const { offsetX, offsetY, radius, spread, color, type } = token;
    const shadowType = type === 'DROP_SHADOW' ? 'box-shadow' : 'inset';
    const shadowValue = type === 'DROP_SHADOW' 
      ? `${offsetX}px ${offsetY}px ${radius}px ${spread}px ${color}`
      : `inset ${offsetX}px ${offsetY}px ${radius}px ${spread}px ${color}`;
    
    return (
      <div key={index} className="flex items-center p-2 border rounded mb-2 bg-card">
        <div 
          className="w-12 h-12 mr-3 bg-card border"
          style={{ 
            boxShadow: shadowValue
          }}
        />
        <div className="flex-1">
          <div className="font-medium text-sm">
            {token.name || `${type === 'DROP_SHADOW' ? 'Drop Shadow' : 'Inner Shadow'} ${index + 1}`}
          </div>
          <div className="text-xs text-muted-foreground">
            {offsetX}px {offsetY}px {radius}px {spread}px {color}
          </div>
        </div>
      </div>
    );
  };

  const tabs = [
    { name: 'Overview', icon: DocumentTextIcon },
    { name: 'Components', icon: CubeIcon },
    { name: 'Colors', icon: SwatchIcon },
    { name: 'Typography', icon: PaintBrushIcon },
    { name: 'Spacing', icon: ArrowsPointingOutIcon },
    { name: 'Shadows', icon: Square3Stack3DIcon }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border overflow-hidden">
        <Tab.Group>
          <Tab.List className="flex border-b">
            {tabs.map((tab) => (
              <Tab
                key={tab.name}
                className={({ selected }) =>
                  classNames(
                    'flex items-center py-3 px-4 text-sm font-medium focus:outline-none',
                    selected
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )
                }
              >
                <tab.icon className="w-5 h-5 mr-2" />
                {tab.name}
              </Tab>
            ))}
          </Tab.List>
          <Tab.Panels className="p-4">
          {/* Overview Panel */}
          <Tab.Panel>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Figma Design</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {data.data?.name || data.metadata?.fileName || data.data?.fileName || 'Unknown'}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-muted/50 p-4 rounded">
                  <h4 className="font-medium mb-2 flex items-center">
                    <CubeIcon className="w-5 h-5 mr-1 text-blue-500" />
                    Components
                  </h4>
                  <p className="text-2xl font-semibold">{totalComponents}</p>
                </div>
                
                <div className="bg-muted/50 p-4 rounded">
                  <h4 className="font-medium mb-2 flex items-center">
                    <SwatchIcon className="w-5 h-5 mr-1 text-blue-500" />
                    Design Tokens
                  </h4>
                  <p className="text-2xl font-semibold">
                    {(() => {
                      const colorCount = totalColors || data.metadata?.colorCount || 0;
                      const typographyCount = totalTypography || data.metadata?.typographyCount || 0;
                      const spacingCount = data.data?.tokens?.spacing?.length || 0;
                      const borderRadiusCount = data.data?.tokens?.borderRadius?.length || 0;
                      const shadowsCount = data.data?.tokens?.shadows?.length || 0;
                      const totalTokens = colorCount + typographyCount + spacingCount + borderRadiusCount + shadowsCount;
                      
                      return totalTokens > 0 ? totalTokens : 'None extracted';
                    })()}
                  </p>
                </div>
              </div>
              
              {data.data?.lastModified && (
                <div className="text-sm text-muted-foreground">
                  Last modified: {new Date(data.data?.lastModified).toLocaleString()}
                </div>
              )}
            </div>
          </Tab.Panel>
          
          {/* Components Panel */}
          <Tab.Panel>
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Components</h3>
                <span className="text-sm text-muted-foreground">
                  {totalComponents} components
                </span>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                {totalComponents > 0 ? (
                  <div className="p-2">
                    {components.map(component => renderComponent(component))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    No components found
                  </div>
                )}
              </div>
            </div>
          </Tab.Panel>
          
          {/* Colors Panel */}
          <Tab.Panel>
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Colors</h3>
                <span className="text-sm text-muted-foreground">
                  {totalColors} colors
                </span>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                {totalColors > 0 ? (
                  <div className="p-2 bg-muted/50">
                    {colors.map((color: any, index: number) => renderColorToken(color, index))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    No colors found
                  </div>
                )}
              </div>
            </div>
          </Tab.Panel>
          
          {/* Typography Panel */}
          <Tab.Panel>
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Typography</h3>
                <span className="text-sm text-muted-foreground">
                  {totalTypography} typography styles
                </span>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                {totalTypography > 0 ? (
                  <div className="p-2 bg-muted/50">
                    {typography.map((item: any, index: number) => renderTypographyToken(item, index))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    No typography styles found
                  </div>
                )}
              </div>
            </div>
          </Tab.Panel>
          
          {/* Spacing Panel */}
          <Tab.Panel>
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Spacing</h3>
                <span className="text-sm text-muted-foreground">
                  {(data.data?.tokens?.spacing?.length || 0)} spacing tokens
                </span>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                {data.data?.tokens?.spacing?.length ? (
                  <div className="p-2 bg-muted/50">
                    {data.data?.tokens?.spacing.map((spacing: any, index: number) => renderSpacingToken(spacing, index))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    No spacing tokens found
                  </div>
                )}
              </div>
            </div>
          </Tab.Panel>
          
          {/* Shadows Panel */}
          <Tab.Panel>
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Shadows & Border Radius</h3>
                <span className="text-sm text-muted-foreground">
                  {(data.data?.tokens?.shadows?.length || 0) + (data.data?.tokens?.borderRadius?.length || 0)} tokens
                </span>
              </div>
              
              {data.data?.tokens?.borderRadius?.length ? (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-foreground mb-2">Border Radius</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="p-2 bg-muted/50">
                      {data.data?.tokens?.borderRadius.map((radius: any, index: number) => renderBorderRadiusToken(radius, index))}
                    </div>
                  </div>
                </div>
              ) : null}
              
              {data.data?.tokens?.shadows?.length ? (
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Shadows</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="p-2 bg-muted/50">
                      {data.data?.tokens?.shadows.map((shadow: any, index: number) => renderShadowToken(shadow, index))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-muted-foreground border rounded">
                  No shadow or border radius tokens found
                </div>
              )}
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
      </div>
      
      {/* Color Usage Analysis Section */}
      {/* <ColorUsageSection 
        data={data} 
        source="figma" 
        className="bg-card rounded-lg border"
      /> */}
    </div>
  );
};

export default FigmaDataView; 