// Dashboard JavaScript - Modern ERP Style
// API_BASE_URL is defined globally by admin-auth.js
// getToken() and checkAuth() are defined globally by navbar.js

// API Headers with token
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getToken()}`
});

// Format date
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
};

// Animate counter
function animateCounter(element, target, duration = 1000) {
  if (!element) return;
  
  const start = 0;
  const increment = target / (duration / 16); // 60 FPS
  let current = start;
  
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      element.textContent = Math.round(target);
      clearInterval(timer);
    } else {
      element.textContent = Math.round(current);
    }
  }, 16);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  const isAuthenticated = await checkAuth();
  if (!isAuthenticated) return;

  // Load dashboard data
  loadDashboardStats();
  loadRecentTransactions();
  loadLowStockAlerts();
  loadMonthlyTrends(); // Load chart data (default to monthly)

  // Trend period button handlers
  const trendButtons = document.querySelectorAll('#trendPeriodButtons button');
  trendButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Remove active class from all buttons
      trendButtons.forEach(btn => btn.classList.remove('active'));
      // Add active class to clicked button
      this.classList.add('active');
      
      // Load trends based on period
      const period = this.getAttribute('data-period');
      loadTrendsByPeriod(period);
    });
  });

  // Logout functionality
  document.querySelectorAll('.logout-btn').forEach(btn => {
    btn.addEventListener('click', handleLogout);
  });

  // Refresh button - be more specific to avoid catching currency selector
  const refreshBtn = document.querySelector('.btn-outline-secondary:has(.bi-arrow-clockwise)');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      location.reload();
    });
  }
});

// Load dashboard statistics
async function loadDashboardStats() {
  try {
    const response = await fetch(`${window.API_BASE_URL}/dashboard/stats`, {
      headers: getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch dashboard stats');
    }

    const data = await response.json();
    console.log('Dashboard stats received:', data);
    
    // The API returns data in data.overview, so pass that to display function
    displayDashboardStats(data.data.overview);
    
    // Update category chart with real data
    if (data.data.productsByCategory && window.updateCategoryChart) {
      window.updateCategoryChart(data.data.productsByCategory);
    }
  } catch (error) {
    console.error('Error loading dashboard stats:', error);
    showAlert('Failed to load dashboard statistics', 'danger');
  }
}

// Display dashboard statistics with animations
function displayDashboardStats(stats) {
  console.log('=== DASHBOARD STATS DEBUG ===');
  console.log('Displaying stats:', stats);
  console.log('Total Products Value:', stats.totalProducts);
  
  // Update Total Products with animation
  const totalProductsEl = document.getElementById('total-products');
  console.log('Total Products Element:', totalProductsEl);
  if (totalProductsEl && stats.totalProducts !== undefined) {
    console.log('Animating total products to:', stats.totalProducts);
    animateCounter(totalProductsEl, stats.totalProducts);
  } else {
    console.error('Cannot display total products - Element:', totalProductsEl, 'Value:', stats.totalProducts);
  }

  // Update Stock Value with animation
  const stockValueEl = document.getElementById('stock-value');
  // The API returns stockValue as an object with totalValue property
  const stockValue = stats.stockValue?.totalValue || stats.totalValue || 0;
  if (stockValueEl) {
    // Animate and format as currency
    let currentValue = 0;
    const target = stockValue;
    const duration = 1000;
    const increment = target / (duration / 16);
    
    const timer = setInterval(() => {
      currentValue += increment;
      if (currentValue >= target) {
        stockValueEl.textContent = window.formatPrice ? window.formatPrice(target) : `Rs ${target}`;
        clearInterval(timer);
      } else {
        stockValueEl.textContent = window.formatPrice ? window.formatPrice(Math.round(currentValue)) : `Rs ${Math.round(currentValue)}`;
      }
    }, 16);
  }

  // Update Low Stock Items with animation
  const lowStockEl = document.getElementById('low-stock');
  // API returns lowStockProducts instead of lowStockCount
  const lowStockCount = stats.lowStockProducts || stats.lowStockCount || 0;
  if (lowStockEl) {
    animateCounter(lowStockEl, lowStockCount);
  }

  // Update Low Stock Card Status (dynamic based on count)
  const lowStockStatusEl = document.getElementById('low-stock-status');
  const lowStockProgressEl = document.getElementById('low-stock-progress');
  
  if (lowStockStatusEl && lowStockProgressEl) {
    if (lowStockCount > 0) {
      // Warning state - low stock items detected
      lowStockStatusEl.className = 'd-flex align-items-center text-danger small';
      lowStockStatusEl.innerHTML = `
        <i class="bi bi-exclamation-triangle me-1"></i>
        <span class="fw-semibold">Low stock items</span>
      `;
      lowStockProgressEl.className = 'progress-bar bg-danger';
      lowStockProgressEl.style.width = '100%';
    } else {
      // Success state - all stocked
      lowStockStatusEl.className = 'd-flex align-items-center text-success small';
      lowStockStatusEl.innerHTML = `
        <i class="bi bi-check-circle me-1"></i>
        <span class="fw-semibold">All stocked</span>
        <span class="text-muted ms-1">currently</span>
      `;
      lowStockProgressEl.className = 'progress-bar bg-success';
      lowStockProgressEl.style.width = '100%';
    }
  }

  // Update Total Suppliers with animation
  const totalSuppliersEl = document.getElementById('total-suppliers');
  if (totalSuppliersEl && stats.totalSuppliers !== undefined) {
    animateCounter(totalSuppliersEl, stats.totalSuppliers);
  }

  // Update Active Suppliers card status (dynamic based on count)
  const activeSuppliersStatusEl = document.getElementById('active-suppliers-status');
  const activeSuppliersProgressEl = document.getElementById('active-suppliers-progress');
  
  if (activeSuppliersStatusEl && activeSuppliersProgressEl) {
    if (stats.totalSuppliers > 0) {
      // Success state - active suppliers available
      activeSuppliersStatusEl.className = 'd-flex align-items-center text-success small';
      activeSuppliersStatusEl.innerHTML = `
        <i class="bi bi-check-circle me-1"></i>
        <span class="fw-semibold">All verified</span>
        <span class="text-muted ms-1">& active</span>
      `;
      activeSuppliersProgressEl.className = 'progress-bar bg-info';
      activeSuppliersProgressEl.style.width = '100%';
    } else {
      // Empty state - no active suppliers
      activeSuppliersStatusEl.className = 'd-flex align-items-center text-warning small';
      activeSuppliersStatusEl.innerHTML = `
        <i class="bi bi-exclamation-circle me-1"></i>
        <span class="fw-semibold">No active suppliers</span>
      `;
      activeSuppliersProgressEl.className = 'progress-bar bg-warning';
      activeSuppliersProgressEl.style.width = '100%';
    }
  }

  // Backward compatibility - old IDs
  const totalProductsOld = document.getElementById('totalProducts');
  if (totalProductsOld) {
    totalProductsOld.textContent = stats.totalProducts || 0;
  }

  const totalSuppliersOld = document.getElementById('totalSuppliers');
  if (totalSuppliersOld) {
    totalSuppliersOld.textContent = stats.totalSuppliers || 0;
  }

  const lowStockCountOld = document.getElementById('lowStockCount');
  if (lowStockCountOld) {
    lowStockCountOld.textContent = lowStockCount;
  }

  const totalValueOld = document.getElementById('totalInventoryValue');
  if (totalValueOld) {
    totalValueOld.textContent = `$${(stats.totalInventoryValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  const recentTransactionsCountEl = document.getElementById('recentTransactionsCount');
  if (recentTransactionsCountEl) {
    recentTransactionsCountEl.textContent = stats.recentTransactionsCount || 0;
  }

  // Categories breakdown (if you have a chart)
  if (stats.categoriesBreakdown && stats.categoriesBreakdown.length > 0) {
    displayCategoriesChart(stats.categoriesBreakdown);
  }
}

// Display categories breakdown (simple text version)
function displayCategoriesChart(categories) {
  const categoriesContainer = document.getElementById('categoriesBreakdown');
  if (!categoriesContainer) return;

  categoriesContainer.innerHTML = categories.map(cat => `
    <div class="d-flex justify-content-between align-items-center mb-2">
      <span>${cat._id}</span>
      <span class="badge bg-primary">${cat.count} items</span>
    </div>
  `).join('');
}

// Load recent transactions for dashboard
async function loadRecentTransactions() {
  const transactionsContainer = document.getElementById('recent-transactions');
  if (!transactionsContainer) return;

  try {
    const response = await fetch(`${window.API_BASE_URL}/transactions?limit=5&sort=-createdAt`, {
      headers: getHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Transaction fetch failed:', response.status, errorData);
      throw new Error(`Failed to fetch transactions: ${response.status}`);
    }

    const result = await response.json();
    console.log('Transactions API response:', result);
    
    // Handle different response formats - backend returns { success: true, data: { transactions: [] } }
    let transactions = [];
    if (result.data && result.data.transactions) {
      transactions = result.data.transactions;
    } else if (Array.isArray(result.data)) {
      transactions = result.data;
    } else if (Array.isArray(result)) {
      transactions = result;
    }

    if (!transactions || transactions.length === 0) {
      transactionsContainer.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-4 text-muted">
            <i class="bi bi-inbox fs-1 d-block mb-2"></i>
            No recent transactions
          </td>
        </tr>
      `;
      return;
    }

    transactionsContainer.innerHTML = transactions.map(transaction => {
      const typeIcon = transaction.type === 'stock_in' 
        ? '<i class="bi bi-arrow-down-circle text-success"></i>' 
        : '<i class="bi bi-arrow-up-circle text-danger"></i>';
      
      const typeText = transaction.type === 'stock_in' ? 'Stock In' : 'Stock Out';
      const typeBadgeClass = transaction.type === 'stock_in' ? 'bg-success' : 'bg-danger';
      
      const productName = transaction.product?.name || 'N/A';
      const statusBadge = `<span class="badge ${typeBadgeClass} badge-status">${transaction.status || 'completed'}</span>`;
      
      return `
        <tr class="fade-in">
          <td>
            ${typeIcon}
            <span class="ms-2 small">${typeText}</span>
          </td>
          <td class="fw-medium">${productName}</td>
          <td><span class="badge bg-secondary">${transaction.quantity}</span></td>
          <td class="small text-muted">${formatDate(transaction.transactionDate || transaction.createdAt)}</td>
          <td>${statusBadge}</td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading recent transactions:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
    transactionsContainer.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-4 text-danger">
          <i class="bi bi-exclamation-triangle fs-1 d-block mb-2"></i>
          Failed to load transactions
          <div class="small mt-2">${error.message}</div>
        </td>
      </tr>
    `;
  }
}

// Load low stock alerts
async function loadLowStockAlerts() {
  const lowStockContainer = document.getElementById('low-stock-list');
  if (!lowStockContainer) return;

  try {
    const response = await fetch(`${window.API_BASE_URL}/dashboard/alerts/low-stock`, {
      headers: getHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Low stock fetch failed:', response.status, errorData);
      throw new Error(`Failed to fetch low stock: ${response.status}`);
    }

    const data = await response.json();
    console.log('Low stock API response:', data);
    
    const products = data.data?.products || data.products || [];
    const total = data.data?.total || products.length;

    if (!products || products.length === 0) {
      lowStockContainer.innerHTML = `
        <div class="list-group-item text-center py-4 text-success">
          <i class="bi bi-check-circle fs-1 d-block mb-2"></i>
          All products are well stocked!
        </div>
      `;
      return;
    }

    // Update the count in the card header if it exists
    const lowStockCountEl = document.querySelector('.low-stock-count');
    if (lowStockCountEl) {
      lowStockCountEl.textContent = total;
    }
    
    // Update notification badge count
    const lowStockNotifEl = document.querySelector('.low-stock-count-notif');
    if (lowStockNotifEl) {
      lowStockNotifEl.textContent = total;
    }

    lowStockContainer.innerHTML = products.map(product => {
      const reorderLevel = product.reorderLevel || product.minimumStock || 10;
      const stockPercentage = Math.round((product.quantity / reorderLevel) * 100);
      const progressClass = stockPercentage < 25 ? 'bg-danger' : (stockPercentage < 50 ? 'bg-warning' : 'bg-primary');
      
      return `
        <a href="products.html" class="list-group-item list-group-item-action">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div>
              <h6 class="mb-1 fw-semibold">${product.name}</h6>
              <small class="text-muted">${product.sku}</small>
            </div>
            <span class="badge bg-danger">${product.quantity} left</span>
          </div>
          <div class="progress" style="height: 4px;">
            <div class="progress-bar ${progressClass}" role="progressbar" style="width: ${Math.min(stockPercentage, 100)}%"></div>
          </div>
          <small class="text-muted">Min stock: ${reorderLevel}</small>
        </a>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading low stock alerts:', error);
    if (lowStockContainer) {
      lowStockContainer.innerHTML = `
        <div class="list-group-item text-center py-4 text-danger">
          <i class="bi bi-exclamation-triangle fs-1 d-block mb-2"></i>
          Failed to load low stock alerts
        </div>
      `;
    }
  }
}

// Show alert message
function showAlert(message, type = 'info') {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3`;
  alertDiv.style.zIndex = '9999';
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  document.body.appendChild(alertDiv);

  setTimeout(() => {
    alertDiv.remove();
  }, 5000);
}

// Load monthly transaction trends for chart
async function loadMonthlyTrends() {
  try {
    const response = await fetch(`${window.API_BASE_URL}/dashboard/trends/monthly`, {
      headers: getHeaders()
    });

    if (!response.ok) {
      console.error('Failed to fetch monthly trends');
      return;
    }

    const result = await response.json();
    const data = result.data;
    
    // Update the chart with real data
    updateInventoryTrendsChart(data.labels, data.stockIn, data.stockOut);
  } catch (error) {
    console.error('Error loading monthly trends:', error);
  }
}

// Load trends by period (week, month, year)
async function loadTrendsByPeriod(period) {
  try {
    const response = await fetch(`${window.API_BASE_URL}/dashboard/trends/${period}ly`, {
      headers: getHeaders()
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${period}ly trends`);
      return;
    }

    const result = await response.json();
    const data = result.data;
    
    // Update the chart with real data
    updateInventoryTrendsChart(data.labels, data.stockIn, data.stockOut);
  } catch (error) {
    console.error(`Error loading ${period}ly trends:`, error);
  }
}

// Logout handler
async function handleLogout() {
  try {
    await fetch(`${window.API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: getHeaders()
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    localStorage.clear();
    window.location.href = 'login.html';
  }
}

// ============================================================================
// EXPORT REPORT FUNCTIONALITY
// ============================================================================

/**
 * Export dashboard report to CSV
 * Fetches latest data from backend and generates a downloadable CSV file
 */
async function exportReport() {
  const exportBtn = document.getElementById('exportReportBtn');
  
  if (!exportBtn) {
    console.error('Export button not found');
    return;
  }

  // Prevent multiple simultaneous export requests
  if (exportBtn.disabled) {
    console.log('Export already in progress...');
    return;
  }

  // Disable button and show loading state
  const originalBtnContent = exportBtn.innerHTML;
  exportBtn.disabled = true;
  exportBtn.innerHTML = `
    <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
    Exporting...
  `;

  try {
    console.log('📊 [Export] Starting report export...');
    console.log('📊 [Export] API_BASE_URL:', window.API_BASE_URL);
    console.log('📊 [Export] Token available:', !!getToken());

    // Fetch comprehensive dashboard data
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    let response;
    try {
      const apiUrl = `${window.API_BASE_URL}/dashboard/stats`;
      console.log('📊 [Export] Fetching from:', apiUrl);
      
      response = await fetch(apiUrl, {
        headers: getHeaders(),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    console.log('📊 [Export] Response status:', response.status);
    console.log('📊 [Export] Response ok:', response.ok);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('📊 [Export] Error response:', errorData);
      throw new Error(errorData.message || `Server error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ [Export] Dashboard data received:', data);
    console.log('✅ [Export] Data structure:', JSON.stringify(data, null, 2));

    // Generate CSV from dashboard data
    const csvContent = generateDashboardCSV(data.data);
    console.log('✅ [Export] CSV generated, length:', csvContent.length);
    
    // Create and download file
    const fileName = `Inventory_Report_${new Date().toISOString().split('T')[0]}.csv`;
    console.log('📊 [Export] Downloading file:', fileName);
    downloadCSV(csvContent, fileName);

    // Show success message
    showAlert('Report exported successfully!', 'success');
    console.log(`✅ [Export] Report exported successfully: ${fileName}`);

  } catch (error) {
    console.error('❌ [Export] Failed to export report:', error);
    
    // Log error for debugging
    const errorDetails = {
      message: error.message,
      name: error.name,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
    console.error('Export error details:', errorDetails);

    // Show detailed error message for debugging
    let errorMessage = 'Failed to export report. ';
    
    if (error.name === 'AbortError') {
      errorMessage += 'Request timed out. Please try again.';
    } else if (error.message.includes('Failed to fetch')) {
      errorMessage += 'Cannot connect to server. Please check if the backend is running.';
    } else if (error.message.includes('401')) {
      errorMessage += 'Authentication failed. Please log in again.';
    } else if (error.message.includes('403')) {
      errorMessage += 'Access denied. Admin privileges required.';
    } else if (error.message.includes('500')) {
      errorMessage += 'Server error. Please try again later.';
    } else {
      errorMessage += `Error: ${error.message}`;
    }
    
    showAlert(errorMessage, 'danger');
  } finally {
    // Re-enable button and restore original content
    exportBtn.disabled = false;
    exportBtn.innerHTML = originalBtnContent;
  }
}

/**
 * Generate CSV content from dashboard data
 * @param {Object} dashboardData - The dashboard data from API
 * @returns {string} CSV formatted string
 */
function generateDashboardCSV(dashboardData) {
  const overview = dashboardData.overview || {};
  const recentTransactions = dashboardData.recentTransactions || [];
  const productsByCategory = dashboardData.productsByCategory || [];

  // Get current timestamp
  const exportDate = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Build CSV content
  let csv = [];

  // Header section
  csv.push(['INVENTORY MANAGEMENT SYSTEM - DASHBOARD REPORT']);
  csv.push(['Generated:', exportDate]);
  csv.push([]); // Empty row

  // Overview Statistics Section
  csv.push(['=== OVERVIEW STATISTICS ===']);
  csv.push(['Metric', 'Value']);
  csv.push(['Total Products', overview.totalProducts || 0]);
  csv.push(['Total Suppliers', overview.totalSuppliers || 0]);
  csv.push(['Total Users', overview.totalUsers || 0]);
  csv.push(['Low Stock Items', overview.lowStockProducts || 0]);
  csv.push(['Out of Stock Items', overview.outOfStockProducts || 0]);
  csv.push(['Total Stock Value', formatPrice(overview.stockValue?.totalValue || 0)]);
  csv.push(['Total Stock Quantity', overview.stockValue?.totalQuantity || 0]);
  csv.push([]); // Empty row

  // Products by Category Section
  if (productsByCategory.length > 0) {
    csv.push(['=== PRODUCTS BY CATEGORY ===']);
    csv.push(['Category', 'Count', 'Total Quantity']);
    productsByCategory.forEach(cat => {
      csv.push([
        cat._id || 'Uncategorized',
        cat.count || 0,
        cat.totalQuantity || 0
      ]);
    });
    csv.push([]); // Empty row
  }

  // Recent Transactions Section
  if (recentTransactions.length > 0) {
    csv.push(['=== RECENT TRANSACTIONS ===']);
    csv.push(['Type', 'Product', 'SKU', 'Quantity', 'Date', 'Status']);
    
    recentTransactions.forEach(tx => {
      const type = tx.type === 'stock_in' ? 'Stock In' : tx.type === 'stock_out' ? 'Stock Out' : tx.type;
      const productName = tx.product?.name || 'N/A';
      const sku = tx.product?.sku || 'N/A';
      const quantity = tx.quantity || 0;
      const date = tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-US') : 'N/A';
      const status = tx.status || 'completed';
      
      csv.push([type, productName, sku, quantity, date, status]);
    });
  }

  // Convert to CSV format (escape commas and quotes)
  return csv.map(row => 
    row.map(cell => {
      const cellStr = String(cell || '');
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(',')
  ).join('\n');
}

/**
 * Download CSV file
 * @param {string} csvContent - The CSV content
 * @param {string} fileName - The file name for download
 */
function downloadCSV(csvContent, fileName) {
  // Create blob with UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up
  URL.revokeObjectURL(url);
}

// Initialize export button when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const exportBtn = document.getElementById('exportReportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportReport);
    console.log('✅ [Export] Export button initialized');
  }
});
