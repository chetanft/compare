import React from 'react';
import { AdjustmentsHorizontalIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { ComparisonSettings as IComparisonSettings } from '../../types';

interface ComparisonSettingsProps {
  settings: IComparisonSettings;
  onChange: (settings: IComparisonSettings) => void;
  className?: string;
}

export default function ComparisonSettings({ 
  settings, 
  onChange, 
  className = '' 
}: ComparisonSettingsProps) {
  const updateSetting = (key: keyof IComparisonSettings, value: any) => {
    onChange({
      ...settings,
      [key]: value
    });
  };

  return (
    <div className={`card ${className}`}>
      <div className="flex items-center space-x-2 mb-4">
        <AdjustmentsHorizontalIcon className="w-5 h-5 text-indigo-600" />
        <h3 className="text-lg font-medium text-gray-900">Comparison Settings</h3>
      </div>

      <div className="space-y-4">
        {/* Sensitivity Threshold */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Sensitivity Threshold
            </label>
            <span className="text-sm text-muted-foreground">{settings.threshold}</span>
          </div>
          <input
            type="range"
            min="0.01"
            max="1.0"
            step="0.01"
            value={settings.threshold}
            onChange={(e) => updateSetting('threshold', parseFloat(e.target.value))}
            className="comparison-slider w-full"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>More Sensitive</span>
            <span>Less Sensitive</span>
          </div>
        </div>

        {/* Color Tolerance */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Color Tolerance
            </label>
            <span className="text-sm text-muted-foreground">{settings.colorTolerance}</span>
          </div>
          <input
            type="range"
            min="0"
            max="255"
            step="1"
            value={settings.colorTolerance}
            onChange={(e) => updateSetting('colorTolerance', parseInt(e.target.value))}
            className="comparison-slider w-full"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Strict</span>
            <span>Lenient</span>
          </div>
        </div>

        {/* Analysis Options */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Analysis Options</h4>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.colorAnalysis}
                onChange={(e) => updateSetting('colorAnalysis', e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm text-muted-foreground">Color Analysis</span>
              <div className="group relative ml-1">
                <InformationCircleIcon className="w-4 h-4 text-gray-400 cursor-help" />
                <div className="absolute left-0 top-5 hidden group-hover:block bg-gray-800 text-white text-xs rounded p-2 w-48 z-10">
                  Analyzes color differences and palette variations between designs
                </div>
              </div>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.layoutAnalysis}
                onChange={(e) => updateSetting('layoutAnalysis', e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm text-muted-foreground">Layout Analysis</span>
              <div className="group relative ml-1">
                <InformationCircleIcon className="w-4 h-4 text-gray-400 cursor-help" />
                <div className="absolute left-0 top-5 hidden group-hover:block bg-gray-800 text-white text-xs rounded p-2 w-48 z-10">
                  Detects structural and positioning differences
                </div>
              </div>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.spacingAnalysis}
                onChange={(e) => updateSetting('spacingAnalysis', e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm text-muted-foreground">Spacing Analysis</span>
              <div className="group relative ml-1">
                <InformationCircleIcon className="w-4 h-4 text-gray-400 cursor-help" />
                <div className="absolute left-0 top-5 hidden group-hover:block bg-gray-800 text-white text-xs rounded p-2 w-48 z-10">
                  Analyzes margin, padding, and content distribution
                </div>
              </div>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.includeTextAnalysis}
                onChange={(e) => updateSetting('includeTextAnalysis', e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm text-muted-foreground">Text Analysis</span>
              <div className="group relative ml-1">
                <InformationCircleIcon className="w-4 h-4 text-gray-400 cursor-help" />
                <div className="absolute left-0 top-5 hidden group-hover:block bg-gray-800 text-white text-xs rounded p-2 w-48 z-10">
                  Identifies text content and typography differences
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Advanced Options */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Advanced Options</h4>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.ignoreAntiAliasing}
              onChange={(e) => updateSetting('ignoreAntiAliasing', e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-muted-foreground">Ignore Anti-aliasing</span>
            <div className="group relative ml-1">
              <InformationCircleIcon className="w-4 h-4 text-gray-400 cursor-help" />
              <div className="absolute left-0 top-5 hidden group-hover:block bg-gray-800 text-white text-xs rounded p-2 w-48 z-10">
                Reduces false positives from text rendering differences
              </div>
            </div>
          </label>
        </div>

        {/* Settings Summary */}
        <div className="bg-muted/50 rounded-lg p-3 mt-4">
          <h5 className="text-xs font-medium text-muted-foreground mb-2">Current Configuration</h5>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Sensitivity: {(settings.threshold * 100).toFixed(0)}%</div>
            <div>Color Tolerance: {settings.colorTolerance}/255</div>
            <div>
              Active Analyses: {
                [
                  settings.colorAnalysis && 'Color',
                  settings.layoutAnalysis && 'Layout',
                  settings.spacingAnalysis && 'Spacing',
                  settings.includeTextAnalysis && 'Text'
                ].filter(Boolean).join(', ') || 'None'
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
