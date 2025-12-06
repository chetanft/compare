/**
 * Centralized content constants to eliminate redundancy across pages
 */

export const PAGE_CONTENT = {
  // Page titles and descriptions
  NEW_COMPARISON: {
    title: 'Design & Web Extraction',
    description: 'Extract and compare design elements from Figma and web implementations',
    notice: 'Comparison feature is disabled in this version. Only extraction data will be shown.'
  },
  
  SINGLE_SOURCE: {
    title: 'Single Source Extraction',
    description: 'Extract design elements from either Figma or web',
    figma: {
      title: 'Figma Design',
      description: 'Extract from Figma file or frame'
    },
    web: {
      title: 'Web Implementation', 
      description: 'Extract from live website'
    }
  },
  
  SCREENSHOT_COMPARISON: {
    title: 'Screenshot Comparison',
    description: 'Compare visual differences between images',
    error: 'Comparison Failed',
    reset: 'Start Compare'
  },
  
  SETTINGS: {
    title: 'Settings',
    description: 'Configure your comparison tool preferences and integrations'
  }
} as const;

export const FORM_CONTENT = {
  // Common form labels and placeholders
  LABELS: {
    figmaUrl: 'Figma URL',
    webUrl: 'Web URL',
    cssSelector: 'CSS Selector (Optional)',
    extractionMode: 'Extraction Mode'
  },
  
  PLACEHOLDERS: {
    figmaUrl: 'https://www.figma.com/file/...',
    webUrl: 'https://example.com',
    cssSelector: 'e.g., .main-content, #hero-section'
  },
  
  DESCRIPTIONS: {
    cssSelector: 'Specify a CSS selector to focus on specific elements',
    extractionMode: 'Choose what to extract from the Figma file'
  },
  
  VALIDATION: {
    figmaUrlRequired: 'Figma URL is required',
    figmaUrlInvalid: 'Please enter a valid Figma URL',
    webUrlRequired: 'Web URL is required',
    webUrlInvalid: 'Please enter a valid URL'
  }
} as const;

export const EXTRACTION_MODES = {
  FRAME_ONLY: {
    value: 'frame-only',
    label: 'Frame Only',
    description: 'Extract only elements from the selected frame'
  },
  GLOBAL_STYLES: {
    value: 'global-styles',
    label: 'Global Styles', 
    description: 'Extract all global styles from the file'
  },
  BOTH: {
    value: 'both',
    label: 'Both',
    description: 'Extract both frame elements and global styles'
  }
} as const;

export const BUTTON_LABELS = {
  extractData: 'Extract Data',
  extractDesignWeb: 'Extract Design & Web Data',
  extracting: 'Extracting Data...',
  resetForm: 'Reset Form',
  viewReport: 'View Report',
  download: 'Download',
  saveSettings: 'Save Settings',
  testConnection: 'Test Connection'
} as const;
