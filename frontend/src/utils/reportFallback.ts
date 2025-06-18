/**
 * Utility functions for handling report fallbacks when the backend server is unavailable
 */

/**
 * Attempts to load a report from localStorage if it exists
 * @param reportId The ID of the report to load
 * @returns The report content as HTML or null if not found
 */
export const getReportFromLocalStorage = (reportId: string): string | null => {
  try {
    // Check if we have a cached version of this report
    const cachedReport = localStorage.getItem(`report_${reportId}`);
    if (cachedReport) {
      return cachedReport;
    }
    return null;
  } catch (error) {
    console.error('Error accessing localStorage:', error);
    return null;
  }
};

/**
 * Saves a report to localStorage for offline access
 * @param reportId The ID of the report
 * @param content The HTML content of the report
 */
export const saveReportToLocalStorage = (reportId: string, content: string): void => {
  try {
    // Save the report to localStorage for offline access
    // We trim the content if it's too large to fit in localStorage
    const maxSize = 5 * 1024 * 1024; // 5MB (typical localStorage limit)
    const contentToSave = content.length > maxSize ? content.substring(0, maxSize) : content;
    
    localStorage.setItem(`report_${reportId}`, contentToSave);
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

/**
 * Generates a basic error report HTML when no report can be loaded
 * @param reportId The ID of the report that failed to load
 * @param errorMessage The error message to display
 * @returns HTML content for an error report
 */
export const generateErrorReportHtml = (reportId: string, errorMessage: string): string => {
  return `
    <html>
      <head>
        <title>Error Loading Report</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.5; color: #333; padding: 2rem; }
          .error-container { max-width: 800px; margin: 0 auto; background-color: #fff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); padding: 2rem; }
          .error-header { background-color: #fee2e2; border-radius: 6px; padding: 1rem; margin-bottom: 1.5rem; }
          h1 { color: #b91c1c; margin-top: 0; }
          .error-message { background-color: #f3f4f6; padding: 1rem; border-radius: 6px; margin-bottom: 1.5rem; }
          .troubleshooting { background-color: #f0f9ff; padding: 1rem; border-radius: 6px; }
          h2 { margin-top: 0; color: #1e40af; }
          ul { margin-top: 0.5rem; }
        </style>
      </head>
      <body>
        <div class="error-container">
          <div class="error-header">
            <h1>Error Loading Report</h1>
            <p>Unable to load the report with ID: ${reportId}</p>
          </div>
          
          <div class="error-message">
            <strong>Error:</strong> ${errorMessage}
          </div>
          
          <div class="troubleshooting">
            <h2>Troubleshooting Steps:</h2>
            <ul>
              <li>Make sure the backend server is running (npm run start:unified)</li>
              <li>Check that the report ID is correct</li>
              <li>The report file may have been deleted or moved</li>
              <li>Try restarting both the frontend and backend servers</li>
              <li>Check the server logs for more information</li>
            </ul>
          </div>
        </div>
      </body>
    </html>
  `;
}; 