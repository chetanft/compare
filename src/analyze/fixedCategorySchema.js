/**
 * Fixed Category Schema for Component Categorization
 * Ensures consistent reporting structure regardless of data availability
 */

export const FIXED_CATEGORY_SCHEMA = {
  // Design Tokens (Always shown)
  designTokens: {
    colors: {
      id: 'colors',
      label: 'Colors',
      description: 'Color palette and usage analysis',
      icon: '🎨',
      priority: 1,
      alwaysShow: true,
      figmaColumn: [],
      webColumn: [],
      analysis: {
        total: 0,
        mostUsed: [],
        consistency: null,
        recommendations: []
      }
    },
    typography: {
      id: 'typography',
      label: 'Typography',
      description: 'Font families, sizes, and text styles',
      icon: '📝',
      priority: 2,
      alwaysShow: true,
      figmaColumn: [],
      webColumn: [],
      analysis: {
        total: 0,
        fontFamilies: [],
        fontSizes: [],
        scale: null,
        recommendations: []
      }
    },
    spacing: {
      id: 'spacing',
      label: 'Spacing',
      description: 'Margin, padding, and gap patterns',
      icon: '📏',
      priority: 3,
      alwaysShow: true,
      figmaColumn: [],
      webColumn: [],
      analysis: {
        total: 0,
        mostUsed: [],
        scale: null,
        inconsistencies: [],
        recommendations: []
      }
    },
    shadows: {
      id: 'shadows',
      label: 'Shadows & Elevation',
      description: 'Box shadows and elevation system',
      icon: '🌫️',
      priority: 4,
      alwaysShow: true,
      figmaColumn: [],
      webColumn: [],
      analysis: {
        total: 0,
        elevationLevels: [],
        mostUsed: []
      }
    },
    borderRadius: {
      id: 'borderRadius',
      label: 'Border Radius',
      description: 'Corner radius and border styles',
      icon: '⭕',
      priority: 5,
      alwaysShow: true,
      figmaColumn: [],
      webColumn: [],
      analysis: {
        total: 0,
        scale: null,
        mostUsed: []
      }
    }
  },

  // Atomic Design (Always shown with fixed subcategories)
  atoms: {
    typography: {
      id: 'atoms-typography',
      label: 'Typography',
      description: 'Text elements, headings, labels',
      icon: '📄',
      priority: 1,
      alwaysShow: true,
      figmaColumn: [],
      webColumn: [],
      examples: ['Heading 1', 'Body Text', 'Caption', 'Label']
    },
    buttons: {
      id: 'atoms-buttons',
      label: 'Buttons',
      description: 'All button variants and states',
      icon: '🔘',
      priority: 2,
      alwaysShow: true,
      figmaColumn: [],
      webColumn: [],
      examples: ['Primary Button', 'Secondary Button', 'Icon Button']
    },
    inputs: {
      id: 'atoms-inputs',
      label: 'Form Inputs',
      description: 'Form controls and input fields',
      icon: '📝',
      priority: 3,
      alwaysShow: true,
      figmaColumn: [],
      webColumn: [],
      examples: ['Text Input', 'Select', 'Checkbox', 'Radio Button']
    },
    icons: {
      id: 'atoms-icons',
      label: 'Icons & Graphics',
      description: 'SVG icons, images, graphics',
      icon: '🎯',
      priority: 4,
      alwaysShow: true,
      figmaColumn: [],
      webColumn: [],
      examples: ['Menu Icon', 'Search Icon', 'Arrow Icon']
    },
    dividers: {
      id: 'atoms-dividers',
      label: 'Dividers',
      description: 'Lines, separators, spacers',
      icon: '➖',
      priority: 5,
      alwaysShow: true,
      figmaColumn: [],
      webColumn: [],
      examples: ['Horizontal Line', 'Vertical Divider']
    },
    badges: {
      id: 'atoms-badges',
      label: 'Badges & Tags',
      description: 'Status indicators, labels, tags',
      icon: '🏷️',
      priority: 6,
      alwaysShow: true,
      figmaColumn: [],
      webColumn: [],
      examples: ['Status Badge', 'Category Tag', 'Count Badge']
    },
    loaders: {
      id: 'atoms-loaders',
      label: 'Loading States',
      description: 'Spinners, progress indicators',
      icon: '⏳',
      priority: 7,
      alwaysShow: true,
      figmaColumn: [],
      webColumn: [],
      examples: ['Spinner', 'Progress Bar', 'Skeleton']
    }
  },

  molecules: {
    formGroups: {
      id: 'molecules-formGroups',
      label: 'Form Groups',
      description: 'Input + label + validation combinations',
      icon: '📋',
      priority: 1,
      alwaysShow: true,
      figmaColumn: [],
      webColumn: [],
      examples: ['Text Field Group', 'Select Group', 'Checkbox Group']
    },
    navigation: {
      id: 'molecules-navigation',
      label: 'Navigation',
      description: 'Menu items, breadcrumbs, tabs',
      icon: '🧭',
      priority: 2,
      alwaysShow: true,
      figmaColumn: [],
      webColumn: [],
      examples: ['Nav Item', 'Breadcrumb', 'Tab Item']
    },
    cards: {
      id: 'molecules-cards',
      label: 'Cards',
      description: 'Content containers and panels',
      icon: '🃏',
      priority: 3,
      alwaysShow: true,
      figmaColumn: [],
      webColumn: [],
      examples: ['Product Card', 'Info Panel', 'Summary Card']
    },
    searchBoxes: {
      id: 'molecules-searchBoxes',
      label: 'Search Boxes',
      description: 'Search input with button/filters',
      icon: '🔍',
      priority: 4,
      alwaysShow: true,
      figmaColumn: [],
      webColumn: [],
      examples: ['Search Bar', 'Filter Search', 'Auto-complete']
    },
    pagination: {
      id: 'molecules-pagination',
      label: 'Pagination',
      description: 'Page navigation controls',
      icon: '📄',
      priority: 5,
      alwaysShow: true,
      figmaColumn: [],
      webColumn: [],
      examples: ['Page Numbers', 'Next/Prev', 'Load More']
    },
    dropdowns: {
      id: 'molecules-dropdowns',
      label: 'Dropdowns',
      description: 'Select menus, dropdown lists',
      icon: '📋',
      priority: 6,
      alwaysShow: true,
      figmaColumn: [],
      webColumn: [],
      examples: ['Dropdown Menu', 'Select List', 'Multi-select']
    },
    modals: {
      id: 'molecules-modals',
      label: 'Modals & Dialogs',
      description: 'Dialog boxes, popovers, tooltips',
      icon: '💬',
      priority: 7,
      alwaysShow: true,
      figmaColumn: [],
      webColumn: [],
      examples: ['Modal Dialog', 'Tooltip', 'Popover']
    },
    tabs: {
      id: 'molecules-tabs',
      label: 'Tabs',
      description: 'Tab navigation and panels',
      icon: '📑',
      priority: 8,
      alwaysShow: true,
      figmaColumn: [],
      webColumn: [],
      examples: ['Tab Set', 'Tab Panel', 'Vertical Tabs']
    },
    accordions: {
      id: 'molecules-accordions',
      label: 'Accordions',
      description: 'Collapsible content sections',
      icon: '📂',
      priority: 9,
      alwaysShow: true,
      figmaColumn: [],
      webColumn: [],
      examples: ['Expandable Panel', 'FAQ Item', 'Collapsible']
    }
  },

  organisms: {
    headers: {
      id: 'organisms-headers',
      label: 'Headers',
      description: 'Site headers, navigation bars',
      icon: '🏠',
      priority: 1,
      alwaysShow: true,
      figmaColumn: [],
      webColumn: [],
      examples: ['Main Header', 'Sub Navigation', 'Top Bar']
    },
    footers: {
      id: 'organisms-footers',
      label: 'Footers',
      description: 'Site footers, bottom sections',
      icon: '🔻',
      priority: 2,
      alwaysShow: true,
      figmaColumn: [],
      webColumn: [],
      examples: ['Main Footer', 'Copyright Bar', 'Link Footer']
    },
    sidebars: {
      id: 'organisms-sidebars',
      label: 'Sidebars',
      description: 'Side navigation, filter panels',
      icon: '📘',
      priority: 3,
      alwaysShow: true,
      figmaColumn: [],
      webColumn: [],
      examples: ['Side Navigation', 'Filter Panel', 'Sidebar Menu']
    },
    forms: {
      id: 'organisms-forms',
      label: 'Forms',
      description: 'Complete form sections',
      icon: '📝',
      priority: 4,
      alwaysShow: true,
      figmaColumn: [],
      webColumn: [],
      examples: ['Contact Form', 'Registration Form', 'Search Form']
    },
    tables: {
      id: 'organisms-tables',
      label: 'Tables & Lists',
      description: 'Data tables, list views',
      icon: '📊',
      priority: 5,
      alwaysShow: true,
      figmaColumn: [],
      webColumn: [],
      examples: ['Data Table', 'List View', 'Grid Layout']
    },
    galleries: {
      id: 'organisms-galleries',
      label: 'Galleries',
      description: 'Image galleries, carousels',
      icon: '🖼️',
      priority: 6,
      alwaysShow: true,
      figmaColumn: [],
      webColumn: [],
      examples: ['Image Gallery', 'Carousel', 'Media Grid']
    },
    dashboards: {
      id: 'organisms-dashboards',
      label: 'Dashboard Sections',
      description: 'Dashboard widgets, analytics panels',
      icon: '📈',
      priority: 7,
      alwaysShow: true,
      figmaColumn: [],
      webColumn: [],
      examples: ['Stats Widget', 'Chart Panel', 'Dashboard Card']
    },
    articles: {
      id: 'organisms-articles',
      label: 'Content Sections',
      description: 'Article content, text blocks',
      icon: '📰',
      priority: 8,
      alwaysShow: true,
      figmaColumn: [],
      webColumn: [],
      examples: ['Article Section', 'Content Block', 'Text Area']
    }
  },

  // Technical Categories (Always shown)
  layout: {
    containers: {
      id: 'layout-containers',
      label: 'Containers',
      description: 'Wrapper elements, sections',
      icon: '📦',
      priority: 1,
      alwaysShow: true,
      figmaColumn: [],
      webColumn: [],
      examples: ['Page Container', 'Section Wrapper', 'Content Box']
    },
    grids: {
      id: 'layout-grids',
      label: 'Grid Systems',
      description: 'CSS Grid layouts',
      icon: '⊞',
      priority: 2,
      alwaysShow: true,
      figmaColumn: [],
      webColumn: [],
      examples: ['CSS Grid', 'Grid Container', 'Grid Item']
    },
    flexbox: {
      id: 'layout-flexbox',
      label: 'Flexbox',
      description: 'Flexible box layouts',
      icon: '↔️',
      priority: 3,
      alwaysShow: true,
      figmaColumn: [],
      webColumn: [],
      examples: ['Flex Container', 'Flex Item', 'Flex Row']
    },
    positioning: {
      id: 'layout-positioning',
      label: 'Positioning',
      description: 'Absolute, fixed, sticky elements',
      icon: '📍',
      priority: 4,
      alwaysShow: true,
      figmaColumn: [],
      webColumn: [],
      examples: ['Fixed Header', 'Sticky Nav', 'Absolute Position']
    },
    responsive: {
      id: 'layout-responsive',
      label: 'Responsive',
      description: 'Media query components',
      icon: '📱',
      priority: 5,
      alwaysShow: true,
      figmaColumn: [],
      webColumn: [],
      examples: ['Mobile View', 'Tablet Layout', 'Desktop Version']
    }
  }
};

/**
 * Get the complete fixed schema with empty state
 * @returns {Object} Fixed category schema
 */
export function getFixedCategorySchema() {
  return JSON.parse(JSON.stringify(FIXED_CATEGORY_SCHEMA));
}

/**
 * Category priorities for UI ordering
 */
export const CATEGORY_PRIORITIES = {
  designTokens: 1,
  atoms: 2,
  molecules: 3,
  organisms: 4,
  layout: 5,
  spacing: 6,
  visual: 7,
  interactive: 8,
  semantic: 9
};

/**
 * Generate navigation structure from fixed schema
 * @returns {Object} Navigation structure for UI
 */
export function generateFixedNavigation() {
  return {
    primary: [
      {
        id: 'summary',
        label: 'Executive Summary',
        icon: '📊',
        description: 'High-level metrics and health assessment',
        alwaysShow: true
      },
      {
        id: 'design-tokens',
        label: 'Design Tokens',
        icon: '🎨',
        description: 'Colors, typography, spacing, and other design primitives',
        alwaysShow: true,
        subcategories: Object.values(FIXED_CATEGORY_SCHEMA.designTokens).map(token => ({
          id: token.id,
          label: token.label,
          icon: token.icon,
          alwaysShow: token.alwaysShow
        }))
      },
      {
        id: 'atomic-design',
        label: 'Atomic Design',
        icon: '⚛️',
        description: 'Components organized by atomic design methodology',
        alwaysShow: true,
        subcategories: [
          {
            id: 'atoms',
            label: 'Atoms',
            icon: '⚛️',
            alwaysShow: true,
            subcategories: Object.values(FIXED_CATEGORY_SCHEMA.atoms).map(atom => ({
              id: atom.id,
              label: atom.label,
              icon: atom.icon,
              alwaysShow: atom.alwaysShow
            }))
          },
          {
            id: 'molecules',
            label: 'Molecules',
            icon: '🧬',
            alwaysShow: true,
            subcategories: Object.values(FIXED_CATEGORY_SCHEMA.molecules).map(molecule => ({
              id: molecule.id,
              label: molecule.label,
              icon: molecule.icon,
              alwaysShow: molecule.alwaysShow
            }))
          },
          {
            id: 'organisms',
            label: 'Organisms',
            icon: '🦠',
            alwaysShow: true,
            subcategories: Object.values(FIXED_CATEGORY_SCHEMA.organisms).map(organism => ({
              id: organism.id,
              label: organism.label,
              icon: organism.icon,
              alwaysShow: organism.alwaysShow
            }))
          }
        ]
      }
    ],
    
    secondary: [
      {
        id: 'layout',
        label: 'Layout Systems',
        icon: '📐',
        alwaysShow: true,
        subcategories: Object.values(FIXED_CATEGORY_SCHEMA.layout).map(layout => ({
          id: layout.id,
          label: layout.label,
          icon: layout.icon,
          alwaysShow: layout.alwaysShow
        }))
      },
      {
        id: 'insights',
        label: 'Insights & Gaps',
        icon: '💡',
        alwaysShow: true,
        subcategories: [
          { id: 'design-gaps', label: 'Design System Gaps', alwaysShow: true },
          { id: 'implementation-gaps', label: 'Implementation Gaps', alwaysShow: true },
          { id: 'quick-wins', label: 'Quick Wins', alwaysShow: true },
          { id: 'action-plan', label: 'Action Plan', alwaysShow: true }
        ]
      }
    ],
    
    utility: [
      {
        id: 'inventories',
        label: 'Component Inventories',
        icon: '📋',
        description: 'Detailed component lists and cross-references',
        alwaysShow: true
      },
      {
        id: 'export',
        label: 'Export Data',
        icon: '💾',
        description: 'Download categorized data in various formats',
        alwaysShow: true
      }
    ]
  };
}

export default FIXED_CATEGORY_SCHEMA; 