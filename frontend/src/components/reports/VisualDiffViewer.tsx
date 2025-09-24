import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  EyeIcon, 
  EyeSlashIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowsPointingOutIcon
} from '@heroicons/react/24/outline';
import { Discrepancy } from '../../types';

interface VisualDiffViewerProps {
  figmaImagePath: string;
  developedImagePath: string;
  diffImagePath: string;
  sideBySidePath?: string;
  discrepancies: Discrepancy[];
  className?: string;
}

export default function VisualDiffViewer({
  figmaImagePath,
  developedImagePath,
  diffImagePath,
  sideBySidePath,
  discrepancies,
  className = ''
}: VisualDiffViewerProps) {
  const [currentView, setCurrentView] = useState<'side-by-side' | 'overlay' | 'diff'>('side-by-side');
  const [showDiscrepancies, setShowDiscrepancies] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState<Discrepancy | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const views = [
    { id: 'side-by-side', name: 'Side by Side', description: 'Compare images side by side' },
    { id: 'overlay', name: 'Overlay', description: 'Overlay images with opacity control' },
    { id: 'diff', name: 'Differences', description: 'Show pixel differences highlighted' }
  ];

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.5));
  const handleResetZoom = () => setZoom(1);

  const getSeverityColor = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high': return 'border-red-500 bg-red-500';
      case 'medium': return 'border-yellow-500 bg-yellow-500';
      case 'low': return 'border-green-500 bg-green-500';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          {views.map((view) => (
            <button
              key={view.id}
              onClick={() => setCurrentView(view.id as any)}
              className={`
                px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${currentView === view.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-foreground hover:bg-gray-200'
                }
              `}
              title={view.description}
            >
              {view.name}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          {/* Discrepancy Toggle */}
          <button
            onClick={() => setShowDiscrepancies(!showDiscrepancies)}
            className={`
              flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors
              ${showDiscrepancies 
                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                : 'bg-gray-100 text-foreground hover:bg-gray-200'
              }
            `}
          >
            {showDiscrepancies ? (
              <EyeSlashIcon className="w-4 h-4" />
            ) : (
              <EyeIcon className="w-4 h-4" />
            )}
            <span>Issues ({discrepancies.length})</span>
          </button>

          {/* Zoom Controls */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={handleZoomOut}
              className="p-1 hover:bg-gray-200 rounded"
              title="Zoom Out"
            >
              <MagnifyingGlassMinusIcon className="w-4 h-4" />
            </button>
            <span className="px-2 text-sm font-mono min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1 hover:bg-gray-200 rounded"
              title="Zoom In"
            >
              <MagnifyingGlassPlusIcon className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1 hover:bg-gray-200 rounded"
              title="Reset Zoom"
            >
              <ArrowsPointingOutIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Image Viewer */}
      <div className="card overflow-hidden">
        <div 
          ref={containerRef}
          className="relative overflow-auto max-h-[70vh] bg-muted/50"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
        >
          {/* Side by Side View */}
          {currentView === 'side-by-side' && (
            <div className="grid grid-cols-2 gap-4 p-4">
              <div className="relative">
                <div className="text-sm font-medium text-foreground mb-2">Figma Design</div>
                <div className="relative border border-gray-200 rounded-lg overflow-hidden">
                  <img 
                    src={figmaImagePath} 
                    alt="Figma Design" 
                    className="w-full h-auto"
                  />
                  {showDiscrepancies && discrepancies.map((discrepancy) => (
                    <motion.div
                      key={`figma-${discrepancy.id}`}
                      className={`
                        absolute border-2 cursor-pointer transition-opacity
                        ${getSeverityColor(discrepancy.severity)}
                        ${selectedDiscrepancy?.id === discrepancy.id ? 'opacity-80' : 'opacity-40'}
                      `}
                      style={{
                        left: `${(discrepancy.location.x / 100) * 100}%`,
                        top: `${(discrepancy.location.y / 100) * 100}%`,
                        width: `${(discrepancy.location.width / 100) * 100}%`,
                        height: `${(discrepancy.location.height / 100) * 100}%`,
                      }}
                      onClick={() => setSelectedDiscrepancy(discrepancy)}
                      whileHover={{ opacity: 0.8 }}
                      title={discrepancy.description}
                    />
                  ))}
                </div>
              </div>
              
              <div className="relative">
                <div className="text-sm font-medium text-foreground mb-2">Developed Implementation</div>
                <div className="relative border border-gray-200 rounded-lg overflow-hidden">
                  <img 
                    src={developedImagePath} 
                    alt="Developed Implementation" 
                    className="w-full h-auto"
                  />
                  {showDiscrepancies && discrepancies.map((discrepancy) => (
                    <motion.div
                      key={`dev-${discrepancy.id}`}
                      className={`
                        absolute border-2 cursor-pointer transition-opacity
                        ${getSeverityColor(discrepancy.severity)}
                        ${selectedDiscrepancy?.id === discrepancy.id ? 'opacity-80' : 'opacity-40'}
                      `}
                      style={{
                        left: `${(discrepancy.location.x / 100) * 100}%`,
                        top: `${(discrepancy.location.y / 100) * 100}%`,
                        width: `${(discrepancy.location.width / 100) * 100}%`,
                        height: `${(discrepancy.location.height / 100) * 100}%`,
                      }}
                      onClick={() => setSelectedDiscrepancy(discrepancy)}
                      whileHover={{ opacity: 0.8 }}
                      title={discrepancy.description}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Overlay View */}
          {currentView === 'overlay' && (
            <div className="p-4">
              <div className="text-sm font-medium text-foreground mb-2">Overlay Comparison</div>
              <div className="relative border border-gray-200 rounded-lg overflow-hidden">
                <img 
                  src={figmaImagePath} 
                  alt="Figma Design" 
                  className="w-full h-auto"
                />
                <img 
                  src={developedImagePath} 
                  alt="Developed Implementation" 
                  className="absolute inset-0 w-full h-auto opacity-50"
                  style={{ mixBlendMode: 'difference' }}
                />
                {showDiscrepancies && discrepancies.map((discrepancy) => (
                  <motion.div
                    key={`overlay-${discrepancy.id}`}
                    className={`
                      absolute border-2 cursor-pointer transition-opacity
                      ${getSeverityColor(discrepancy.severity)}
                      ${selectedDiscrepancy?.id === discrepancy.id ? 'opacity-80' : 'opacity-60'}
                    `}
                    style={{
                      left: `${(discrepancy.location.x / 100) * 100}%`,
                      top: `${(discrepancy.location.y / 100) * 100}%`,
                      width: `${(discrepancy.location.width / 100) * 100}%`,
                      height: `${(discrepancy.location.height / 100) * 100}%`,
                    }}
                    onClick={() => setSelectedDiscrepancy(discrepancy)}
                    whileHover={{ opacity: 0.8 }}
                    title={discrepancy.description}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Diff View */}
          {currentView === 'diff' && (
            <div className="p-4">
              <div className="text-sm font-medium text-foreground mb-2">Pixel Differences</div>
              <div className="relative border border-gray-200 rounded-lg overflow-hidden">
                <img 
                  src={diffImagePath} 
                  alt="Pixel Differences" 
                  className="w-full h-auto"
                />
                {showDiscrepancies && discrepancies.map((discrepancy) => (
                  <motion.div
                    key={`diff-${discrepancy.id}`}
                    className={`
                      absolute border-2 cursor-pointer transition-opacity
                      ${getSeverityColor(discrepancy.severity)}
                      ${selectedDiscrepancy?.id === discrepancy.id ? 'opacity-80' : 'opacity-60'}
                    `}
                    style={{
                      left: `${(discrepancy.location.x / 100) * 100}%`,
                      top: `${(discrepancy.location.y / 100) * 100}%`,
                      width: `${(discrepancy.location.width / 100) * 100}%`,
                      height: `${(discrepancy.location.height / 100) * 100}%`,
                    }}
                    onClick={() => setSelectedDiscrepancy(discrepancy)}
                    whileHover={{ opacity: 0.8 }}
                    title={discrepancy.description}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selected Discrepancy Details */}
      {selectedDiscrepancy && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`card border-l-4 ${getSeverityColor(selectedDiscrepancy.severity).replace('bg-', 'border-')}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className={`px-2 py-1 rounded text-xs font-medium text-white ${getSeverityColor(selectedDiscrepancy.severity).split(' ')[1]}`}>
                  {selectedDiscrepancy.severity.toUpperCase()}
                </span>
                <span className="text-sm text-muted-foreground capitalize">
                  {selectedDiscrepancy.type.replace(/([A-Z])/g, ' $1').trim()}
                </span>
              </div>
              <h4 className="font-medium text-gray-900 mb-2">
                {selectedDiscrepancy.description}
              </h4>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                {selectedDiscrepancy.figmaValue && (
                  <div>
                    <span className="text-muted-foreground">Design Value:</span>
                    <code className="block mt-1 p-2 bg-gray-100 rounded">
                      {typeof selectedDiscrepancy.figmaValue === 'string' ? selectedDiscrepancy.figmaValue : JSON.stringify(selectedDiscrepancy.figmaValue)}
                    </code>
                  </div>
                )}
                {selectedDiscrepancy.developedValue && (
                  <div>
                    <span className="text-muted-foreground">Implementation Value:</span>
                    <code className="block mt-1 p-2 bg-gray-100 rounded">
                      {typeof selectedDiscrepancy.developedValue === 'string' ? selectedDiscrepancy.developedValue : JSON.stringify(selectedDiscrepancy.developedValue)}
                    </code>
                  </div>
                )}
              </div>
              {selectedDiscrepancy.recommendation && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                  <strong>💡 Recommendation:</strong> {selectedDiscrepancy.recommendation}
                </div>
              )}
            </div>
            <button
              onClick={() => setSelectedDiscrepancy(null)}
              className="ml-4 text-gray-400 hover:text-muted-foreground"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}

      {/* Legend */}
      {showDiscrepancies && discrepancies.length > 0 && (
        <div className="card">
          <h4 className="text-sm font-medium text-foreground mb-3">Issue Severity Legend</h4>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-red-500 bg-red-500 opacity-60 rounded"></div>
              <span>High Severity</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-yellow-500 bg-yellow-500 opacity-60 rounded"></div>
              <span>Medium Severity</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-green-500 bg-green-500 opacity-60 rounded"></div>
              <span>Low Severity</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
