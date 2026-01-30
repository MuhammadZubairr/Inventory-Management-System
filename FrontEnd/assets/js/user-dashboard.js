// User Dashboard JavaScript
const API_BASE_URL = 'http://localhost:3001/api';

// Get token and user data from sessionStorage
const getToken = () => sessionStorage.getItem('token');
const getUserId = () => sessionStorage.getItem('userId');
const getUserName = () => sessionStorage.getItem('userName');
const getWarehouseId = () => sessionStorage.getItem('warehouseId');
const getWarehouseName = () => sessionStorage.getItem('warehouseName');
const getUserRole = () => sessionStorage.getItem('userRole');

// Check authentication
async function checkAuth() {
  const token = getToken();
  const userRole = getUserRole();
  
  if (!token) {
    window.location.href = '/pages/user-login.html';
    return false;
  }
  
  // Validate token with backend
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(`${API_BASE_URL}/auth/validate`, {
      method: 'GET',
      headers: getHeaders(),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      // Token invalid or expired
      sessionStorage.clear();
      window.location.href = '/pages/user-login.html';
      return false;
    }
  } catch (error) {
    // Only ignore AbortError (from timeout during rapid refresh)
    // All other errors (network errors, server down, etc.) should log out
    if (error.name === 'AbortError') {
      console.warn('⚠️ User auth request timeout - page might be refreshing');
      // Don't logout on timeout, allow page to continue
      return true;
    }
    
    // For ALL other errors (including network errors), log out
    // This includes: server down, server restart, connection refused, etc.
    console.error('Auth validation error:', error.message || error);
    console.log('🚪 Logging out and redirecting to login...');
    sessionStorage.clear();
    window.location.href = '/pages/user-login.html';
    return false;
  }
  
  // Redirect admins to admin dashboard
  if (userRole === 'admin') {
    window.location.href = '/pages/admin.html';
    return false;
  }
  
  return true;
}

// Heartbeat mechanism for user dashboard
let userHeartbeatInterval = null;

function startUserAuthHeartbeat() {
  // Clear any existing interval
  if (userHeartbeatInterval) {
    clearInterval(userHeartbeatInterval);
  }
  
  // Check immediately
  silentUserTokenCheck();
  
  // Then check every 30 seconds
  userHeartbeatInterval = setInterval(() => {
    silentUserTokenCheck();
  }, 30000); // 30 seconds
  
  console.log('🔄 User auth heartbeat started - checking token every 30 seconds');
}

// Silent token validation for user
async function silentUserTokenCheck() {
  const token = getToken();
  
  if (!token) {
    if (userHeartbeatInterval) {
      clearInterval(userHeartbeatInterval);
    }
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/validate`, {
      method: 'GET',
      headers: getHeaders()
    });
    
    if (!response.ok) {
      console.warn('🚨 User token validation failed during heartbeat check');
      console.log('🔄 Server instance changed - logging out...');
      
      if (userHeartbeatInterval) {
        clearInterval(userHeartbeatInterval);
      }
      
      sessionStorage.clear();
      window.location.href = '/pages/user-login.html';
    } else {
      console.log('✅ User heartbeat: Token still valid');
    }
  } catch (error) {
    console.warn('⚠️ User heartbeat check failed:', error.message);
    
    // Retry once after 2 seconds
    setTimeout(async () => {
      try {
        const retryResponse = await fetch(`${API_BASE_URL}/auth/validate`, {
          method: 'GET',
          headers: getHeaders()
        });
        
        if (!retryResponse.ok) {
          console.error('🚨 User token invalid after server restart');
          if (userHeartbeatInterval) clearInterval(userHeartbeatInterval);
          sessionStorage.clear();
          window.location.href = '/pages/user-login.html';
        }
      } catch (retryError) {
        console.error('🚨 Server unreachable - logging out user');
        if (userHeartbeatInterval) clearInterval(userHeartbeatInterval);
        sessionStorage.clear();
        window.location.href = '/pages/user-login.html';
      }
    }, 2000);
  }
}

// API Headers with token
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getToken()}`
});

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
  // Validate authentication first
  const isAuthenticated = await checkAuth();
  if (!isAuthenticated) return;

  // Display user and warehouse info
  document.getElementById('userName').textContent = getUserName() || 'User';
  document.getElementById('warehouseName').textContent = getWarehouseName() || 'Warehouse';

  // Hide stock operations for VIEWER role
  const userRole = getUserRole();
  if (userRole === 'viewer') {
    // Hide Stock In and Stock Out action cards
    const quickActionsContainer = document.querySelector('.card-body .row.g-4');
    if (quickActionsContainer) {
      const stockInCard = quickActionsContainer.children[0]; // First column (Stock In)
      const stockOutCard = quickActionsContainer.children[1]; // Second column (Stock Out)
      
      if (stockInCard) stockInCard.style.display = 'none';
      if (stockOutCard) stockOutCard.style.display = 'none';
      
      // Make View Products take full width
      const viewProductsCard = quickActionsContainer.children[2];
      if (viewProductsCard) {
        viewProductsCard.className = 'col-12';
      }
    }
  }

  // Load dashboard data
  loadDashboardStats();
  
  // Start heartbeat to detect server restarts
  const token = getToken();
  if (token) {
    startUserAuthHeartbeat();
  }
});

// Load dashboard statistics
async function loadDashboardStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/user-dashboard/stats`, {
      headers: getHeaders()
    });

    if (!response.ok) {
      if (response.status === 401) {
        sessionStorage.clear();
        window.location.href = '/pages/login.html';
        return;
      }
      throw new Error('Failed to load dashboard stats');
    }

    const data = await response.json();
    
    if (data.success && data.data) {
      updateDashboardStats(data.data);
    }
  } catch (error) {
    console.error('Error loading dashboard stats:', error);
    showAlert('Failed to load dashboard data', 'danger');
  }
}

// Update dashboard statistics
function updateDashboardStats(data) {
  const { stats, lowStockProducts, recentTransactions } = data;

  // Update stat cards
  document.getElementById('totalProducts').textContent = stats.totalProducts || 0;
  document.getElementById('lowStockCount').textContent = stats.lowStockCount || 0;
  document.getElementById('totalQuantity').textContent = stats.totalQuantity || 0;
  document.getElementById('totalValue').textContent = `$${(stats.totalValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Display low stock items
  displayLowStockItems(lowStockProducts || []);

  // Display recent transactions
  displayRecentTransactions(recentTransactions || []);
}

// Display low stock items
function displayLowStockItems(items) {
  const container = document.getElementById('lowStockItems');
  
  if (items.length === 0) {
    container.innerHTML = '<p class="text-muted text-center mb-0">No low stock items</p>';
    return;
  }

  container.innerHTML = items.map(item => {
    // Backend aggregation returns warehouseQuantity and minStockLevel directly
    const quantity = item.warehouseQuantity || 0;
    const minStock = item.minStockLevel || 0;
    
    return `
      <div class="alert alert-warning mb-2">
        <strong>${item.name}</strong><br>
        <small>SKU: ${item.sku}</small><br>
        <small>Stock: ${quantity} / Min: ${minStock}</small>
      </div>
    `;
  }).join('');
}

// Display recent transactions
function displayRecentTransactions(transactions) {
  const tbody = document.getElementById('recentTransactions');
  
  if (transactions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No recent transactions</td></tr>';
    return;
  }

  tbody.innerHTML = transactions.map(transaction => {
    const date = new Date(transaction.createdAt).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const typeBadge = transaction.type === 'stock_in' ? 'success' : 
                      transaction.type === 'stock_out' ? 'danger' : 'info';
    const typeText = transaction.type.replace('_', ' ').toUpperCase();
    
    return `
      <tr>
        <td>${date}</td>
        <td>
          <strong>${transaction.product?.name || 'N/A'}</strong><br>
          <small class="text-muted">${transaction.product?.sku || ''}</small>
        </td>
        <td><span class="badge bg-${typeBadge}">${typeText}</span></td>
        <td>${transaction.quantity}</td>
        <td>${transaction.createdBy?.name || 'System'}</td>
      </tr>
    `;
  }).join('');
}

// View warehouse products
function viewWarehouseProducts() {
  // You can create a separate page or modal for this
  showAlert('Products view coming soon', 'info');
}

// Logout function
function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    sessionStorage.clear();
    window.location.href = '/pages/login.html';
  }
}

// Show alert function
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
