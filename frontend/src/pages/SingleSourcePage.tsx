import { useState, useEffect } from 'react';
import SingleSourceForm from '../components/forms/SingleSourceForm';
import FigmaDataView from '../components/reports/FigmaDataView';
import WebDataView from '../components/reports/WebDataView';
import { FigmaOnlyResponse, WebOnlyResponse } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PAGE_CONTENT } from '../constants/content';

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

export default function SingleSourcePage() {
  const [figmaData, setFigmaData] = useState<FigmaOnlyResponse['data'] | null>(null);
  const [webData, setWebData] = useState<WebOnlyResponse['data'] | null>(null);
  const [resetKey, setResetKey] = useState<number>(0);
  
  // Clear any cached data on component mount
  useEffect(() => {
    // Clear localStorage cache related to figma data
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('figma') || key.includes('color') || key.includes('extract'))) {
          keysToRemove.push(key);
        }
      }
      
      // Remove identified keys
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log('Cleared localStorage cache keys:', keysToRemove);
    } catch (err) {
      console.error('Error clearing localStorage:', err);
    }
    
    return () => {
      // Cleanup function to clear data when component unmounts
      setFigmaData(null);
      setWebData(null);
    };
  }, []);
  
  const handleFigmaSuccess = (data: FigmaOnlyResponse['data']) => {
    console.log('Figma data received:', {
      componentCount: data.components?.length || data.metadata?.totalComponents || 0,
      colorCount: data.metadata?.colorCount || data.colors?.length || 0,
      typographyCount: data.metadata?.typographyCount || data.typography?.length || 0,
      actualColorsLength: data.colors?.length || 0,
      hasColors: !!(data.colors && data.colors.length > 0),
      hasTypography: !!(data.typography && data.typography.length > 0),
      hasComponents: !!(data.components && data.components.length > 0)
    });
    
    // Validate data before setting
    if (!data || typeof data !== 'object') {
      console.error('Invalid Figma data received:', data);
      return;
    }
    
    // Clear any previous data first
    setWebData(null);
    
    // Set new data preserving the correct componentCount from API
    const processedData = {
      ...data,
      components: data.components || [],
      colors: data.colors || [],
      typography: data.typography || [],
      // Preserve componentCount at root level from API response
      componentCount: data.components?.length || data.metadata?.totalComponents || 0,
      metadata: {
        ...data.metadata,
        // Don't override - preserve what API sent
        componentCount: data.components?.length || data.metadata?.totalComponents || 0,
        colorCount: data.metadata?.colorCount || data.colors?.length || 0,
        typographyCount: data.metadata?.typographyCount || data.typography?.length || 0
      }
    };
    
    setFigmaData(processedData);
    
    // Force component re-render with new key
    setResetKey(prev => prev + 1);
  };
  
  const handleWebSuccess = (data: WebOnlyResponse['data']) => {
    // Force a complete reset of the component state
    setFigmaData(null);
    setWebData(null);
    
    // Force component re-render with new key
    setResetKey(prev => prev + 1);
    
    // Set new data with delay to ensure clean state
    setTimeout(() => {
      setWebData(data);
    }, 100);
  };
  
  return (
    <div className="content-container max-w-7xl">
      <div className="space-y-8">
        <SingleSourceForm 
          onFigmaSuccess={handleFigmaSuccess}
          onWebSuccess={handleWebSuccess}
        />
        
        {figmaData && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl">Figma Extraction Results</CardTitle>
                  <CardDescription>Design elements extracted from Figma file</CardDescription>
                </div>
                {figmaData.reportPath && (
                  <Button asChild>
                    <a 
                      href={figmaData.reportPath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download Report
                    </a>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">File Name</p>
                  <p className="font-medium">{figmaData.metadata?.fileName || figmaData.fileName || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Method</p>
                  <Badge variant="secondary">{figmaData.metadata?.extractionMethod || 'figma-api'}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Node ID</p>
                  <p className="font-mono text-sm">{figmaData.metadata?.nodeId || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Extracted</p>
                  <p className="font-medium text-sm">
                    {new Date(figmaData.extractedAt || figmaData.metadata?.extractedAt || Date.now()).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Enhanced metadata section */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-sm">Extraction Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Components:</span>
                    <span className="font-medium">{figmaData.components?.length || figmaData.metadata?.totalComponents || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Colors:</span>
                    <span className="font-medium">{figmaData.metadata?.colorCount || figmaData.colors?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Typography:</span>
                    <span className="font-medium">{figmaData.metadata?.typographyCount || figmaData.typography?.length || 0}</span>
                  </div>
                </div>
                
                {/* Show component details if available */}
                {figmaData.components && figmaData.components.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-sm font-medium mb-2">Component Details:</p>
                    {figmaData.components.map((comp, index) => (
                      <div key={comp.nodeId || index} className="text-xs bg-background/50 rounded p-2 mb-1">
                        <div className="flex justify-between items-center">
                          <span className="font-mono">{comp.nodeId}</span>
                          <span className="text-muted-foreground">
                            {comp.name || 'Unnamed Component'}
                          </span>
                        </div>
                        {comp.hasChildren && (
                          <div className="text-muted-foreground mt-1">
                            Children: {comp.childCount || 0}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            
            <div className="mt-6">
              <FigmaDataView data={{
                id: 'single-source',
                timestamp: Date.now(),
                source: 'figma-single-source',
                data: {
                  ...figmaData,
                  document: {},
                  components: figmaData.components || [],
                  styles: figmaData.styles || {}
                },
                metadata: {
                  ...figmaData.metadata,
                  extractorType: 'figma'
                }
              } as any} />
            </div>
            
            {/* Colors Section */}
            {figmaData.colors && Array.isArray(figmaData.colors) && figmaData.colors.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Colors ({figmaData.colors.length})</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                  {figmaData.colors.map((color: any, index: number) => {
                    const colorValue = getColorValue(color);
                    const colorName = typeof color.name === 'string' ? color.name : 
                                     typeof color.name === 'object' ? JSON.stringify(color.name) :
                                     `Color ${index + 1}`;
                    const keyValue = typeof color.value === 'string' ? color.value :
                                    typeof color.value === 'object' ? JSON.stringify(color.value) :
                                    String(color.value || index);
                    
                    return (
                      <div key={`color-${index}-${keyValue}`} className="flex flex-col items-center">
                        <div 
                          className="w-12 h-12 rounded-lg border shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all" 
                          style={{ backgroundColor: colorValue }}
                          title={`Click to see all components using ${colorValue}`}
                          onClick={() => {
                            // Navigate to color analytics with selected color
                            window.open(`/color-analytics?color=${encodeURIComponent(colorValue)}`, '_blank');
                          }}
                        />
                        <span className="text-xs mt-1 font-medium truncate max-w-16" title={colorName}>
                          {colorName}
                        </span>
                        <span className="text-xs text-muted-foreground cursor-pointer hover:text-blue-500"
                              onClick={() => window.open(`/color-analytics?color=${encodeURIComponent(colorValue)}`, '_blank')}>
                          {colorValue}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Typography Section */}
            {figmaData.typography && Array.isArray(figmaData.typography) && figmaData.typography.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Typography ({figmaData.typography.length})</h3>
                <div className="space-y-3">
                  {figmaData.typography.map((typo: any, index: number) => {
                    const typoName = typeof typo.name === 'string' ? typo.name :
                                    typeof typo.name === 'object' ? JSON.stringify(typo.name) :
                                    String(typo.name || `Typography ${index + 1}`);
                    const fontFamily = typeof typo.fontFamily === 'string' ? typo.fontFamily :
                                      typeof typo.fontFamily === 'object' ? JSON.stringify(typo.fontFamily) :
                                      String(typo.fontFamily || 'Unknown');
                    const characters = typeof typo.characters === 'string' ? typo.characters :
                                      typeof typo.characters === 'object' ? JSON.stringify(typo.characters) :
                                      String(typo.characters || typoName || 'The quick brown fox jumps over the lazy dog');
                    
                    return (
                      <div key={`typo-${index}-${fontFamily}`} className="p-3 bg-muted/50 rounded-lg">
                        <p 
                          className="mb-2" 
                          style={{ 
                            fontFamily: fontFamily === 'Unknown' ? 'inherit' : fontFamily,
                            fontSize: typo.fontSize ? `${typo.fontSize}px` : 'inherit',
                            fontWeight: typo.fontWeight || 'normal'
                          }}
                        >
                          {characters}
                        </p>
                        <div className="text-xs text-muted-foreground">
                          {fontFamily}, {typo.fontSize || 'Unknown'}px, weight: {typo.fontWeight || 'Unknown'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            </CardContent>
          </Card>
        )}
      
      {webData && (
        <div className="mt-8">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Web Extraction Results</h2>
            <div className="mb-4">
                          <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold">Metadata</h3>
                {webData.reportPath && (
                  <a 
                    href={webData.reportPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download HTML Report
                  </a>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">URL</p>
                  <p className="font-medium">{webData.metadata?.url || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Elements Extracted</p>
                  <p className="font-medium">{webData.elements?.length || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Colors</p>
                  <p className="font-medium">{webData.colorPalette?.length || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Extracted At</p>
                  <p className="font-medium">
                    {webData.metadata?.timestamp ? new Date(webData.metadata.timestamp).toLocaleString() : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
            </div>
            
            {webData.screenshot && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Screenshot</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <img 
                    src={webData.screenshot} 
                    alt="Web page screenshot" 
                    className="w-full h-auto"
                  />
                </div>
              </div>
            )}
            
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Elements</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Tag</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">ID/Classes</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Text</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Dimensions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(webData.elements || []).map((element, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{element.tag}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {element.id ? `#${element.id}` : ''}
                          {element.classes && element.classes.length > 0 && 
                            (element.id ? ' ' : '') + element.classes.map((c: string) => `.${c}`).join(' ')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {element.text && element.text.length > 30 
                            ? `${element.text.substring(0, 30)}...` 
                            : element.text || ''}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {element.rect ? `${Math.round(element.rect.width)}×${Math.round(element.rect.height)}` : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(webData.elements?.length || 0) > 100 && (
                  <div className="py-3 text-center text-sm text-muted-foreground">
                    Showing all {webData.elements?.length || 0} elements
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Color Palette</h3>
              <div className="flex flex-wrap gap-2">
                {(webData.colorPalette || []).slice(0, 20).map((color, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <div 
                      className="w-10 h-10 rounded-full border border-gray-200 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all" 
                      style={{ backgroundColor: color }}
                      title={`Click to see all elements using ${color}`}
                      onClick={() => {
                        // Navigate to color analytics with selected color
                        window.open(`/color-analytics?color=${encodeURIComponent(color)}`, '_blank');
                      }}
                    ></div>
                    <span className="text-xs mt-1 cursor-pointer hover:text-blue-500"
                          onClick={() => window.open(`/color-analytics?color=${encodeURIComponent(color)}`, '_blank')}>
                      {color}
                    </span>
                  </div>
                ))}
                {(webData.colorPalette?.length || 0) > 20 && (
                  <div className="text-xs text-muted-foreground self-center">
                    +{(webData.colorPalette?.length || 0) - 20} more colors
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Typography</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Font Families</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {(webData.typography?.fontFamilies || []).slice(0, 10).map((font, index) => (
                      <li key={index} style={{ fontFamily: font }}>{font}</li>
                    ))}
                    {(webData.typography?.fontFamilies?.length || 0) > 10 && (
                      <li className="text-xs text-muted-foreground">
                        +{(webData.typography?.fontFamilies?.length || 0) - 10} more
                      </li>
                    )}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Font Sizes</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {(webData.typography?.fontSizes || []).slice(0, 10).map((size, index) => (
                      <li key={index}>{size}</li>
                    ))}
                    {(webData.typography?.fontSizes?.length || 0) > 10 && (
                      <li className="text-xs text-muted-foreground">
                        +{(webData.typography?.fontSizes?.length || 0) - 10} more
                      </li>
                    )}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Font Weights</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {(webData.typography?.fontWeights || []).slice(0, 10).map((weight, index) => (
                      <li key={index}>{weight}</li>
                    ))}
                    {(webData.typography?.fontWeights?.length || 0) > 10 && (
                      <li className="text-xs text-muted-foreground">
                        +{(webData.typography?.fontWeights?.length || 0) - 10} more
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Debug Section */}
      {figmaData && (
        <div className="mt-8 bg-gray-100 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Debug Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Metadata:</p>
              <ul className="list-disc list-inside text-sm">
                <li>Component Count: {figmaData.metadata.totalComponents}</li>
                <li>Color Count: {figmaData.metadata.colorCount}</li>
                <li>Typography Count: {figmaData.metadata.typographyCount}</li>
                <li>Extraction Method: {figmaData.metadata.extractionMethod}</li>
                <li>Extracted At: {new Date(figmaData.extractedAt || figmaData.metadata.extractedAt || Date.now()).toLocaleString()}</li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium">Actual Data:</p>
              <ul className="list-disc list-inside text-sm">
                <li>Components Array Length: {figmaData.components?.length || 0}</li>
                <li>Colors Array Length: {figmaData.colors?.length || 0}</li>
                <li>Typography Array Length: {figmaData.typography?.length || 0}</li>
                <li>Reset Key: {resetKey}</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4">
            <p className="text-sm font-medium">First 3 Colors:</p>
            <pre className="text-xs bg-gray-200 p-2 rounded mt-1 overflow-auto max-h-40">
              {figmaData.colors?.slice(0, 3).map((color: any, i: number) => 
                JSON.stringify(color, null, 2) + (i < 2 ? ',\n' : '')
              )}
            </pre>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
 