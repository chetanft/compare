/**
 * Unified Comparison Page
 * Clean, focused page for comparison workflow
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import UnifiedComparisonForm from '../components/forms/UnifiedComparisonForm';
import UnifiedResultsView from '../components/reports/UnifiedResultsView';
import { ComparisonResult } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RotateCcw } from 'lucide-react';

type ViewState = 'form' | 'results' | 'error';

export default function UnifiedComparison() {
  const [viewState, setViewState] = useState<ViewState>('form');
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const handleComparisonSuccess = (result: ComparisonResult) => {
    console.log('🎉 Comparison completed successfully:', result);
    setComparisonResult(result);
    setError(null);
    setViewState('results');
  };

  const handleComparisonError = (error: Error) => {
    console.error('💥 Comparison failed:', error);
    setError(error);
    setComparisonResult(null);
    setViewState('error');
  };

  const handleStartNewComparison = () => {
    setViewState('form');
    setComparisonResult(null);
    setError(null);
  };

  const handleRetryComparison = () => {
    setViewState('form');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Main Content */}
        <div className="max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            {/* Form View */}
            {viewState === 'form' && (
              <motion.div
                key="form"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <UnifiedComparisonForm
                  onSuccess={handleComparisonSuccess}
                  onError={handleComparisonError}
                />
              </motion.div>
            )}

            {/* Results View */}
            {viewState === 'results' && comparisonResult && (
              <motion.div
                key="results"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Navigation */}
                <div className="mb-6">
                  <Button
                    variant="outline"
                    onClick={handleStartNewComparison}
                    className="mr-4"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Compare
                  </Button>
                </div>

                {/* Results */}
                <UnifiedResultsView result={comparisonResult} />
              </motion.div>
            )}

            {/* Error View */}
            {viewState === 'error' && error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="max-w-2xl mx-auto"
              >
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl">⚠️</span>
                    </div>
                    
                    <h2 className="text-xl font-semibold text-red-900 mb-2">
                      Comparison Failed
                    </h2>
                    
                    <p className="text-red-700 mb-6">
                      {error.message}
                    </p>
                    
                    <div className="flex justify-center gap-4">
                      <Button
                        variant="outline"
                        onClick={handleRetryComparison}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Try Again
                      </Button>
                      
                      <Button
                        onClick={handleStartNewComparison}
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Start Over
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12 text-gray-500 text-sm"
        >
          <p>
            Unified Comparison Tool v4.0 - Powered by AI-driven design analysis
          </p>
        </motion.div>
      </div>
    </div>
  );
}
