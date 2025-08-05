/**
 * Template Helpers for Enhanced HTML Reports
 * Generates interactive components and enhanced layouts
 */

/**
 * Generate a progress bar
 * @param {number} percentage - Progress percentage (0-100)
 * @param {string} type - Type of progress bar (success, warning, danger)
 * @param {boolean} large - Whether to use large size
 * @returns {string} HTML for progress bar
 */
export function generateProgressBar(percentage, type = 'primary', large = false) {
  const sizeClass = large ? 'large' : '';
  const typeClass = type !== 'primary' ? type : '';
  
  return `
    <div class="progress-bar ${sizeClass}">
      <div class="progress-fill ${typeClass}" style="width: ${percentage}%"></div>
    </div>
  `;
}

/**
 * Generate a circular progress indicator
 * @param {number} percentage - Progress percentage (0-100)
 * @param {string} label - Label to display in center
 * @returns {string} HTML for circular progress
 */
export function generateCircularProgress(percentage, label = '') {
  return `
    <div class="circular-progress" style="--progress: ${percentage}">
      <div class="percentage">${label || `${percentage}%`}</div>
    </div>
  `;
}

/**
 * Generate a bar chart
 * @param {Array} data - Array of {value, label} objects
 * @param {number} maxHeight - Maximum height for bars
 * @returns {string} HTML for bar chart
 */
export function generateBarChart(data, maxHeight = 100) {
  const maxValue = Math.max(...data.map(d => d.value));
  
  const bars = data.map(item => {
    const height = (item.value / maxValue) * maxHeight;
    return `
      <div class="bar" 
           style="height: ${height}px;" 
           data-value="${item.value}"
           title="${item.label}: ${item.value}">
      </div>
    `;
  }).join('');
  
  return `<div class="bar-chart">${bars}</div>`;
}

/**
 * Generate a donut chart for severity distribution
 * @param {Object} data - Object with success, warning, danger percentages
 * @param {string} centerText - Text to display in center
 * @returns {string} HTML for donut chart
 */
export function generateDonutChart(data, centerText = 'Total') {
  const { success = 0, warning = 0, danger = 0 } = data;
  
  return `
    <div class="donut-chart" 
         style="--success: ${success}; --warning: ${warning}; --danger: ${danger}">
      <div class="center-text">
        <div style="font-weight: 600; font-size: 0.875rem;">${centerText}</div>
        <div style="font-size: 0.75rem; color: var(--theme-text-secondary);">
          ${success + warning + danger}%
        </div>
      </div>
    </div>
  `;
}

/**
 * Generate a collapsible section
 * @param {string} title - Section title
 * @param {string} content - Section content
 * @param {string} id - Unique ID for the section
 * @param {boolean} defaultOpen - Whether section is open by default
 * @returns {string} HTML for collapsible section
 */
export function generateCollapsibleSection(title, content, id, defaultOpen = false) {
  const checked = defaultOpen ? 'checked' : '';
  
  return `
    <input type="checkbox" id="collapsible-${id}" class="collapsible-checkbox" ${checked}>
    <div class="collapsible">
      <label for="collapsible-${id}" class="collapsible-header">
        <h3 style="margin: 0;">${title}</h3>
        <span class="collapsible-toggle">▼</span>
      </label>
      <div class="collapsible-content">
        <div class="collapsible-inner">
          ${content}
        </div>
      </div>
    </div>
  `;
}

/**
 * Generate status indicator badge
 * @param {string} status - Status type (success, warning, danger, info)
 * @param {string} text - Status text
 * @returns {string} HTML for status indicator
 */
export function generateStatusIndicator(status, text) {
  return `<span class="status-indicator ${status}">${text}</span>`;
}

/**
 * Generate enhanced summary card with progress
 * @param {Object} data - Card data
 * @returns {string} HTML for enhanced summary card
 */
export function generateEnhancedSummaryCard(data) {
  const {
    title,
    value,
    total,
    percentage,
    status = 'primary',
    description = '',
    showProgress = false
  } = data;
  
  const progressBar = showProgress ? generateProgressBar(percentage, status) : '';
  const statusClass = status !== 'primary' ? `status-${status}` : '';
  
  return `
    <div class="summary-card enhanced-card ${statusClass}">
      <h3>${title}</h3>
      <div class="summary-value">${value}</div>
      ${description ? `<div class="text-sm text-gray-600">${description}</div>` : ''}
      ${total ? `<div class="text-xs text-gray-500">${total} total</div>` : ''}
      ${progressBar}
      ${percentage ? `<div class="text-sm" style="margin-top: 0.5rem;">${percentage}% complete</div>` : ''}
    </div>
  `;
}

/**
 * Generate tabs structure
 * @param {Array} tabs - Array of {id, title, content} objects
 * @returns {string} HTML for tabs
 */
export function generateTabs(tabs) {
  const tabButtons = tabs.map((tab, index) => `
    <button class="tab-button ${index === 0 ? 'active' : ''}" 
            onclick="switchTab('${tab.id}', this)">
      ${tab.title}
    </button>
  `).join('');
  
  const tabContents = tabs.map((tab, index) => `
    <div class="tab-content ${index === 0 ? 'active' : ''}" id="tab-${tab.id}">
      ${tab.content}
    </div>
  `).join('');
  
  return `
    <div class="tabs">
      <div class="tab-list">${tabButtons}</div>
      ${tabContents}
    </div>
  `;
}

/**
 * Generate tooltip element
 * @param {string} text - Tooltip text
 * @param {string} content - Element content
 * @returns {string} HTML for tooltip
 */
export function generateTooltip(text, content) {
  return `<span class="tooltip" data-tooltip="${text}">${content}</span>`;
}

/**
 * Generate theme toggle button
 * @returns {string} HTML for theme toggle
 */
export function generateThemeToggle() {
  return `
    <button class="theme-toggle" onclick="toggleTheme()" title="Toggle theme">
    </button>
  `;
}

/**
 * Generate enhanced color swatch with tooltip
 * @param {string} color - Color value
 * @param {string} name - Color name
 * @returns {string} HTML for enhanced color swatch
 */
export function generateEnhancedColorSwatch(color, name = '') {
  return `
    <div class="color-item">
      <div class="color-swatch" 
           style="background-color: ${color};" 
           data-color="${color}"
           title="${name || color}">
      </div>
      <div class="color-value">${color}</div>
    </div>
  `;
}

/**
 * Generate sticky navigation for long reports
 * @param {Array} sections - Array of {id, title} objects
 * @returns {string} HTML for sticky navigation
 */
export function generateStickyNav(sections) {
  const navItems = sections.map(section => `
    <a href="#${section.id}" class="nav-item">${section.title}</a>
  `).join('');
  
  return `
    <nav class="sticky-header" style="padding: 1rem;">
      <div style="display: flex; gap: 1.5rem; font-size: 0.875rem;">
        ${navItems}
      </div>
    </nav>
  `;
}

/**
 * Generate JavaScript for interactive features
 * @returns {string} JavaScript code for interactions
 */
export function generateInteractiveJS() {
  return `
    <script>
      // Theme toggle functionality
      function toggleTheme() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
      }
      
      // Tab switching functionality
      function switchTab(tabId, button) {
        // Remove active class from all tabs and buttons
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked button and corresponding content
        button.classList.add('active');
        document.getElementById('tab-' + tabId).classList.add('active');
      }
      
      // Initialize theme from localStorage
      document.addEventListener('DOMContentLoaded', function() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
          document.documentElement.setAttribute('data-theme', savedTheme);
        }
        
        // Animate progress bars on load
        setTimeout(() => {
          document.querySelectorAll('.progress-fill').forEach(fill => {
            const width = fill.style.width;
            fill.style.width = '0%';
            fill.offsetHeight; // Force reflow
            fill.style.width = width;
          });
        }, 100);
      });
      
      // Smooth scroll for navigation links
      document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
          e.preventDefault();
          const target = document.querySelector(this.getAttribute('href'));
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      });
    </script>
  `;
} 