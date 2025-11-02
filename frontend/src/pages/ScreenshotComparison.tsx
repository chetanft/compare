import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ScreenshotComparisonForm from '../components/forms/ScreenshotComparisonForm';
import ScreenshotComparisonView from '../components/reports/ScreenshotComparisonView';
import { ScreenshotComparisonResult } from '../types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { PAGE_CONTENT } from '../constants/content';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

export default function ScreenshotComparison() {
  const [comparisonResult, setComparisonResult] = useState<ScreenshotComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleSuccess = (result: ScreenshotComparisonResult) => {
    setComparisonResult(result);
    setError(null);
  };

  const handleError = (error: any) => {
    setError(error?.message || 'An unexpected error occurred');
    setComparisonResult(null);
  };

  const handleReset = () => {
    setComparisonResult(null);
    setError(null);
    setShowResetConfirm(false);
  };

  return (
    <div className="content-container max-w-7xl">
      <AnimatePresence mode="wait">
        {!comparisonResult ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <ScreenshotComparisonForm
              onSuccess={handleSuccess}
              onError={handleError}
            />
            
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="max-w-4xl mx-auto"
              >
                <Alert variant="destructive">
                  <ExclamationTriangleIcon className="h-4 w-4" />
                  <AlertDescription>
                    <div>
                      <p className="font-medium">{PAGE_CONTENT.SCREENSHOT_COMPARISON.error}</p>
                      <p className="text-sm mt-1">{error}</p>
                    </div>
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            <ScreenshotComparisonView result={comparisonResult} />
            
            <div className="text-center">
              <Button onClick={() => setShowResetConfirm(true)} variant="outline">
                {PAGE_CONTENT.SCREENSHOT_COMPARISON.reset}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start a new comparison?</DialogTitle>
            <DialogDescription>
              This will clear the current comparison results and any error messages.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReset}>
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
