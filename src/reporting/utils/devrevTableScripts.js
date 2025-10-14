/**
 * DevRev Table Utilities
 * Client-side JavaScript for DevRev issues table functionality
 * Includes: CSV export, copy to clipboard, filtering, and sorting
 */

/**
 * Export DevRev issues table to CSV
 */
function exportDevRevTableToCSV() {
  const table = document.getElementById('devrev-issues-table');
  if (!table) {
    alert('Table not found!');
    return;
  }
  
  const csv = tableToCSV(table);
  const timestamp = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `comparison-issues-${timestamp}.csv`);
  
  // Show success message
  showNotification('✅ CSV exported successfully!', 'success');
}

/**
 * Convert HTML table to CSV format
 * @param {HTMLTableElement} table - Table element
 * @returns {string} CSV string
 */
function tableToCSV(table) {
  const rows = [];
  
  // Get headers
  const headerCells = table.querySelectorAll('thead th');
  const headers = Array.from(headerCells).map(th => cleanTextForCSV(th.textContent));
  rows.push(headers.join(','));
  
  // Get data rows
  const dataRows = table.querySelectorAll('tbody tr');
  dataRows.forEach(tr => {
    // Skip hidden rows (filtered out)
    if (tr.style.display === 'none') return;
    
    const cells = tr.querySelectorAll('td');
    const rowData = Array.from(cells).map(td => {
      // Get text content, handling nested elements
      let text = td.textContent.trim();
      // Escape quotes and wrap in quotes if contains comma or newline
      if (text.includes(',') || text.includes('"') || text.includes('\n')) {
        text = `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    });
    rows.push(rowData.join(','));
  });
  
  return rows.join('\n');
}

/**
 * Clean text for CSV export
 * @param {string} text - Text to clean
 * @returns {string} Cleaned text
 */
function cleanTextForCSV(text) {
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Download CSV file
 * @param {string} csv - CSV content
 * @param {string} filename - File name
 */
function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Copy DevRev table to clipboard
 */
function copyDevRevTableToClipboard() {
  const table = document.getElementById('devrev-issues-table');
  if (!table) {
    alert('Table not found!');
    return;
  }
  
  // Create a temporary element to hold the table
  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  tempDiv.appendChild(table.cloneNode(true));
  document.body.appendChild(tempDiv);
  
  // Select the table
  const range = document.createRange();
  range.selectNode(tempDiv);
  window.getSelection().removeAllRanges();
  window.getSelection().addRange(range);
  
  // Copy to clipboard
  try {
    document.execCommand('copy');
    showNotification('✅ Table copied to clipboard! Paste into Excel or DevRev.', 'success');
  } catch (err) {
    // Fallback: copy as CSV text
    const csv = tableToCSV(table);
    navigator.clipboard.writeText(csv).then(() => {
      showNotification('✅ Table copied as CSV text!', 'success');
    }).catch(err => {
      alert('Failed to copy table: ' + err.message);
    });
  } finally {
    // Clean up
    document.body.removeChild(tempDiv);
    window.getSelection().removeAllRanges();
  }
}

/**
 * Filter DevRev table based on search input
 */
function filterDevRevTable() {
  const input = document.getElementById('devrev-filter-input');
  const filter = input.value.toLowerCase();
  const table = document.getElementById('devrev-issues-table');
  const rows = table.querySelectorAll('tbody tr');
  
  let visibleCount = 0;
  
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    const matchesFilter = text.includes(filter);
    row.style.display = matchesFilter ? '' : 'none';
    if (matchesFilter) visibleCount++;
  });
  
  // Update visible count
  updateTableStats(visibleCount, rows.length);
}

/**
 * Sort DevRev table by column
 * @param {number} columnIndex - Column index to sort by
 */
function sortDevRevTable(columnIndex) {
  const table = document.getElementById('devrev-issues-table');
  const tbody = table.querySelector('tbody');
  const rows = Array.from(tbody.querySelectorAll('tr'));
  const header = table.querySelectorAll('thead th')[columnIndex];
  
  // Get current sort direction
  const currentDirection = header.dataset.sortDirection || 'asc';
  const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
  
  // Clear all sort indicators
  table.querySelectorAll('thead th').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    delete th.dataset.sortDirection;
  });
  
  // Set new sort direction
  header.dataset.sortDirection = newDirection;
  header.classList.add(`sort-${newDirection}`);
  
  // Sort rows
  rows.sort((a, b) => {
    const aCell = a.querySelectorAll('td')[columnIndex];
    const bCell = b.querySelectorAll('td')[columnIndex];
    
    let aValue = aCell.textContent.trim();
    let bValue = bCell.textContent.trim();
    
    // Try to parse as number
    const aNum = parseFloat(aValue);
    const bNum = parseFloat(bValue);
    
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return newDirection === 'asc' ? aNum - bNum : bNum - aNum;
    }
    
    // String comparison
    if (newDirection === 'asc') {
      return aValue.localeCompare(bValue);
    } else {
      return bValue.localeCompare(aValue);
    }
  });
  
  // Reorder DOM
  rows.forEach(row => tbody.appendChild(row));
}

/**
 * Update table statistics
 * @param {number} visibleCount - Number of visible rows
 * @param {number} totalCount - Total number of rows
 */
function updateTableStats(visibleCount, totalCount) {
  const statsCounter = document.getElementById('devrev-visible-count');
  if (!statsCounter) return;

  if (visibleCount === totalCount) {
    statsCounter.innerHTML = `<strong>${totalCount}</strong> issues`;
  } else {
    statsCounter.innerHTML = `<strong>${visibleCount}</strong> / ${totalCount}`;
  }
}

/**
 * Show notification message
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, info)
 */
function showNotification(message, type = 'info') {
  // Remove existing notifications
  const existingNotification = document.getElementById('devrev-notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.id = 'devrev-notification';
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 24px;
    background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 10000;
    font-size: 14px;
    font-weight: 500;
    animation: slideInRight 0.3s ease-out;
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease-in';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Initialize table on page load
document.addEventListener('DOMContentLoaded', function() {
  console.log('✅ DevRev table utilities loaded');
  
  // Auto-focus filter input when Ctrl+F is pressed
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      const filterInput = document.getElementById('devrev-filter-input');
      if (filterInput) {
        e.preventDefault();
        filterInput.focus();
      }
    }
  });
});

