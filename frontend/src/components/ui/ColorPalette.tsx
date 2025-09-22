import React from 'react';
import { motion } from 'framer-motion';
import { ColorExtraction, ColorComparison } from '../../types';

interface ColorPaletteProps {
  figmaColors: ColorExtraction[];
  developedColors: ColorExtraction[];
  comparison: ColorComparison;
  className?: string;
}

export default function ColorPalette({ 
  figmaColors, 
  developedColors, 
  comparison, 
  className = '' 
}: ColorPaletteProps) {
  const ColorSwatch = ({ color, label, frequency }: { color: ColorExtraction; label: string; frequency?: number }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center space-y-2 group"
    >
      <div 
        className="w-12 h-12 rounded-lg border-2 border-gray-200 shadow-sm group-hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden"
        style={{ backgroundColor: color.hex }}
        title={`${color.hex}\nFrequency: ${frequency || color.frequency?.toFixed(1) || 0}%\nCount: ${color.count}`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="text-center">
        <div className="text-xs font-mono text-gray-700">{color.hex}</div>
        <div className="text-xs text-gray-500">{label}</div>
        {frequency !== undefined && (
          <div className="text-xs text-gray-400">{frequency.toFixed(1)}%</div>
        )}
      </div>
    </motion.div>
  );

  const ColorMatchRow = ({ match, index }: { match: any; index: number }) => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="flex items-center space-x-4 p-3 bg-green-50 rounded-lg border border-green-200"
    >
      <div className="flex items-center space-x-2">
        <div 
          className="w-8 h-8 rounded border-2 border-white shadow-sm"
          style={{ backgroundColor: match.figmaColor }}
          title={`Figma: ${match.figmaColor}`}
        />
        <span className="text-sm font-mono text-gray-700">{match.figmaColor}</span>
      </div>
      <div className="text-green-600">≈</div>
      <div className="flex items-center space-x-2">
        <div 
          className="w-8 h-8 rounded border-2 border-white shadow-sm"
          style={{ backgroundColor: match.developedColor }}
          title={`Developed: ${match.developedColor}`}
        />
        <span className="text-sm font-mono text-gray-700">{match.developedColor}</span>
      </div>
      <div className="ml-auto text-sm text-green-600 font-medium">
        {match.similarity.toFixed(0)}% match
      </div>
    </motion.div>
  );

  const ColorMismatchRow = ({ color, type, index }: { color: any; type: 'missing' | 'extra'; index: number }) => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`flex items-center space-x-4 p-3 rounded-lg border ${
        type === 'missing' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'
      }`}
    >
      <div className="flex items-center space-x-2">
        <div 
          className="w-8 h-8 rounded border-2 border-white shadow-sm"
          style={{ backgroundColor: color.color }}
          title={color.color}
        />
        <span className="text-sm font-mono text-gray-700">{color.color}</span>
      </div>
      <div className={`text-sm font-medium ${
        type === 'missing' ? 'text-red-600' : 'text-orange-600'
      }`}>
        {type === 'missing' ? 'Missing in developed' : 'Extra in developed'}
      </div>
      <div className="ml-auto text-sm text-gray-500">
        {color.frequency?.toFixed(1)}%
      </div>
    </motion.div>
  );

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Color Similarity Score */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            🎨 Color Palette Analysis
          </h3>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">{comparison.colorSimilarity}%</div>
            <div className="text-sm text-gray-600">Color Similarity</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-700">{comparison.totalFigmaColors}</div>
            <div className="text-sm text-gray-600">Figma Colors</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-700">{comparison.totalDevelopedColors}</div>
            <div className="text-sm text-gray-600">Developed Colors</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{comparison.matchedColors.length}</div>
            <div className="text-sm text-gray-600">Matched Colors</div>
          </div>
        </div>
      </div>

      {/* Color Palettes Side by Side */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Figma Colors */}
        <div className="space-y-4">
          <h4 className="text-md font-semibold text-gray-900 flex items-center">
            <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
            Figma Colors ({figmaColors.length})
          </h4>
          <div className="grid grid-cols-6 gap-4">
            {figmaColors.slice(0, 12).map((color, index) => (
              <ColorSwatch 
                key={`figma-${index}`} 
                color={color} 
                label={`#${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Developed Colors */}
        <div className="space-y-4">
          <h4 className="text-md font-semibold text-gray-900 flex items-center">
            <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
            Developed Colors ({developedColors.length})
          </h4>
          <div className="grid grid-cols-6 gap-4">
            {developedColors.slice(0, 12).map((color, index) => (
              <ColorSwatch 
                key={`dev-${index}`} 
                color={color} 
                label={`#${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Color Matches */}
      {comparison.matchedColors.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-md font-semibold text-gray-900 flex items-center">
            ✅ Matched Colors ({comparison.matchedColors.length})
          </h4>
          <div className="space-y-2">
            {comparison.matchedColors.map((match, index) => (
              <ColorMatchRow key={`match-${index}`} match={match} index={index} />
            ))}
          </div>
        </div>
      )}

      {/* Missing Colors */}
      {comparison.missingColors.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-md font-semibold text-gray-900 flex items-center">
            ❌ Missing Colors ({comparison.missingColors.length})
          </h4>
          <div className="space-y-2">
            {comparison.missingColors.map((color, index) => (
              <ColorMismatchRow 
                key={`missing-${index}`} 
                color={color} 
                type="missing" 
                index={index} 
              />
            ))}
          </div>
        </div>
      )}

      {/* Extra Colors */}
      {comparison.extraColors.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-md font-semibold text-gray-900 flex items-center">
            ➕ Extra Colors ({comparison.extraColors.length})
          </h4>
          <div className="space-y-2">
            {comparison.extraColors.map((color, index) => (
              <ColorMismatchRow 
                key={`extra-${index}`} 
                color={color} 
                type="extra" 
                index={index} 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
