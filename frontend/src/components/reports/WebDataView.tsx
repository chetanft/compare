import React, { useState } from 'react';
import { WebData } from '../../../../src/types/extractor';
import {
  SwatchIcon,
  DocumentTextIcon,
  CubeIcon,
  ArrowsPointingOutIcon,
  Square3Stack3DIcon,
  PaintBrushIcon
} from '@heroicons/react/24/outline';
// import ColorUsageSection from '../ui/ColorUsageSection';

interface WebDataViewProps {
  data: WebData;
}

const WebDataView: React.FC<WebDataViewProps> = ({ data }) => {
  const [expandedElements, setExpandedElements] = useState<Record<string, boolean>>({});

  const toggleElement = (id: string) => {
    setExpandedElements(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const renderCSSProperties = (styles: any) => {
    if (!styles || typeof styles !== 'object') {
      return (
        <div className="p-4 text-sm text-muted-foreground italic">
          No CSS properties available
        </div>
      );
    }

    const sections = [
      {
        title: 'Colors',
        data: {
          color: styles.color,
          backgroundColor: styles.backgroundColor,
          borderColor: styles.borderColor
        },
        render: (value: any, key: string) => {
          if (value && (value.startsWith('#') || value.startsWith('rgb'))) {
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
          return String(value || 'Not set');
        }
      },
      {
        title: 'Typography',
        data: {
          fontFamily: styles.fontFamily,
          fontSize: styles.fontSize,
          fontWeight: styles.fontWeight,
          lineHeight: styles.lineHeight,
          letterSpacing: styles.letterSpacing
        },
        render: (value: any, key: string) => {
          if (key === 'fontFamily' && value) {
            return <span className="font-medium">{value}</span>;
          }
          if (key === 'fontSize' && value) {
            return <span className="font-medium">{value}</span>;
          }
          if (key === 'fontWeight' && value) {
            return <span className="font-medium">{value}</span>;
          }
          if (key === 'lineHeight' && value) {
            return <span className="font-medium">{value}</span>;
          }
          if (key === 'letterSpacing' && value) {
            return <span className="font-medium">{value}</span>;
          }
          return String(value || 'Not set');
        }
      },
      {
        title: 'Layout',
        data: {
          width: styles.width,
          height: styles.height,
          display: styles.display,
          position: styles.position
        },
        render: (value: any, key: string) => {
          if (value) {
            return <span className="font-medium">{value}</span>;
          }
          return 'Not set';
        }
      },
      {
        title: 'Spacing',
        data: {
          padding: styles.padding,
          margin: styles.margin,
          gap: styles.gap
        },
        render: (value: any, key: string) => {
          if (value) {
            return <span className="font-medium">{value}</span>;
          }
          return 'Not set';
        }
      },
      {
        title: 'Borders',
        data: {
          border: styles.border,
          borderRadius: styles.borderRadius,
          borderWidth: styles.borderWidth
        },
        render: (value: any, key: string) => {
          if (value) {
            return <span className="font-medium">{value}</span>;
          }
          return 'Not set';
        }
      },
      {
        title: 'Effects',
        data: {
          boxShadow: styles.boxShadow,
          opacity: styles.opacity,
          transform: styles.transform
        },
        render: (value: any, key: string) => {
          if (value) {
            return <span className="font-medium">{value}</span>;
          }
          return 'Not set';
        }
      }
    ];

    const structuredSections = sections.filter(section => 
      Object.values(section.data).some(value => value !== undefined && value !== null)
    );

    if (structuredSections.length === 0) {
      return (
        <div className="p-4 text-sm text-muted-foreground italic">
          No CSS properties found
        </div>
      );
    }

    return (
      <div className="mt-2 space-y-3">
        {structuredSections.map(section => {
          const entries = Object.entries(section.data).filter(([_, value]) => value !== undefined && value !== null);
          
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

  const renderElement = (element: any, depth = 0) => {
    const isExpanded = expandedElements[element.id];
    const hasStyles = element.styles && Object.keys(element.styles).length > 0;
    
    return (
      <div key={element.id} className="mb-4 border rounded-lg overflow-hidden">
        <div 
          className="flex items-center justify-between py-3 px-4 bg-muted/50 hover:bg-gray-100 cursor-pointer"
          onClick={() => toggleElement(element.id)}
        >
          <div className="flex items-center">
            <CubeIcon className="w-5 h-5 mr-2 text-green-500" />
            <span className="font-medium text-gray-900">{element.tagName || 'Element'}</span>
            {element.className && (
              <span className="ml-2 text-sm text-muted-foreground">.{element.className}</span>
            )}
            {element.id && (
              <span className="ml-2 text-sm text-muted-foreground">#{element.id}</span>
            )}
          </div>
          <div className="flex items-center">
            <span className="text-sm text-muted-foreground mr-2">
              {hasStyles ? `${Object.keys(element.styles).length} CSS properties` : 'No styles'}
            </span>
            {hasStyles && (
              <svg
                className={`w-5 h-5 text-gray-400 transform transition-transform ${
                  isExpanded ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </div>
        </div>
        
        {isExpanded && hasStyles && (
          <div className="p-4 bg-card">
            {renderCSSProperties(element.styles)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="p-4">
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">Web Implementation Details</h2>
          <div className="text-sm text-muted-foreground">
            Extracted at: {new Date(data.timestamp).toLocaleString()}
          </div>
        </div>

      {/* CSS Elements Section */}
      {data.data.elements && data.data.elements.length > 0 && (
        <div className="mb-6">
          <h3 className="font-medium mb-4 flex items-center">
            <CubeIcon className="w-5 h-5 mr-2 text-green-500" />
            CSS Elements ({data.data.elements.length})
          </h3>
          <div className="space-y-2">
            {data.data.elements.map((element: any, index: number) => renderElement(element, index))}
          </div>
        </div>
      )}

      {/* Screenshots Section */}
      {data.data.screenshots && data.data.screenshots.length > 0 && (
        <div className="mb-6">
          <h3 className="font-medium mb-2">Screenshots</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.data.screenshots.map((screenshot, index) => (
              <div key={index} className="bg-card rounded-lg shadow p-2">
                <img
                  src={`data:image/png;base64,${screenshot}`}
                  alt={`Screenshot ${index + 1}`}
                  className="w-full h-auto rounded"
                />
                <div className="text-sm text-muted-foreground mt-2">
                  Screenshot {index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

        {/* Metadata */}
        <div className="bg-card rounded-lg shadow p-4">
          <h3 className="font-medium mb-2">Metadata</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Version: {data.metadata.version}</div>
            <div>Extractor: {data.metadata.extractorType}</div>
            {Object.entries(data.metadata)
              .filter(([key]) => !['version', 'extractorType'].includes(key))
              .map(([key, value]) => (
                <div key={key} className="col-span-2">
                  {key}: {JSON.stringify(value)}
                </div>
              ))}
          </div>
        </div>
      </div>
      
      {/* Color Usage Analysis Section */}
      {/* <ColorUsageSection 
        data={data} 
        source="web" 
        className="bg-card rounded-lg border"
      /> */}
    </div>
  );
};

export default WebDataView; 