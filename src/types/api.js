/**
 * Unified API Response Types and Schemas
 * This file defines the standard response format for all API endpoints
 */

// Standard API Response wrapper
export const createApiResponse = (success, data = null, error = null, metadata = {}) => {
  return {
    success,
    data,
    error,
    timestamp: new Date().toISOString(),
    ...metadata
  };
};

// Comparison Response Schema
export const createComparisonResponse = (comparisonResult, processingTime) => {
  return createApiResponse(true, {
    // Main comparison data
    comparison: {
      overallSimilarity: comparisonResult.summary?.overallSimilarity || 0,
      totalComparisons: comparisonResult.summary?.totalComparisons || 0,
      matchedElements: comparisonResult.summary?.matchedElements || 0,
      discrepancies: comparisonResult.summary?.discrepancies || 0
    },
    
    // Extraction details
    extractionDetails: {
      figma: comparisonResult.extractionDetails?.figma || comparisonResult.figmaData?.metadata || {},
      web: comparisonResult.extractionDetails?.web || comparisonResult.webData?.metadata || {},
      comparison: {
        totalComparisons: comparisonResult.summary?.totalComparisons || 0,
        matches: comparisonResult.summary?.matchedElements || 0,
        deviations: comparisonResult.summary?.discrepancies || 0,
        matchPercentage: Math.round((comparisonResult.summary?.overallSimilarity || 0) * 100)
      }
    },
    
    // Raw data for detailed analysis
    figmaData: comparisonResult.figmaData,
    webData: comparisonResult.webData,
    
    // Report information
    reportPath: comparisonResult.reportPath,
    reports: comparisonResult.reports
  }, null, {
    processingTime
  });
};

// Error Response Schema
export const createErrorResponse = (error, stage = 'unknown') => {
  return createApiResponse(false, null, {
    message: error.message,
    code: error.code || 'UNKNOWN_ERROR',
    stage,
    details: error.context || {}
  });
};

// Validation helpers
export const validateComparisonRequest = (body) => {
  const errors = [];
  
  if (!body.figmaUrl || typeof body.figmaUrl !== 'string') {
    errors.push('figmaUrl is required and must be a string');
  }
  
  if (!body.webUrl || typeof body.webUrl !== 'string') {
    errors.push('webUrl is required and must be a string');
  }
  
  if (body.figmaUrl && !body.figmaUrl.includes('figma.com')) {
    errors.push('figmaUrl must be a valid Figma URL');
  }
  
  if (body.webUrl && !body.webUrl.startsWith('http')) {
    errors.push('webUrl must be a valid HTTP/HTTPS URL');
  }
  
  return errors;
};
