/**
 * Admin Panel Authentication Guard
 * Protects admin pages and verifies user permissions
 */

// Use centralized API base URL from config.js.
window.API_BASE_URL =
  window.API_BASE_URL ||
  (window.resolveApiBaseUrl ? window.resolveApiBaseUrl() : `${window.location.origin}/api`);

// Check authentication and authorization
async function checkAdminAccess() {
  const token = sessionStorage.getItem('token');
  const sessionActive = sessionStorage.getItem('sessionActive');
  const userStr = sessionStorage.getItem('user');

  // Redirect to login if no token OR no active session.
  if (!token || !sessionActive) {
    sessionStorage.clear();
    window.location.href = '/pages/login.html';
    return;
  }

  // Get user data
  let user;
  if (userStr) {
    try {
      user = JSON.parse(userStr);
    } catch (e) {
      console.error('Error parsing user data:', e);
      sessionStorage.clear();
      window.location.href = '/pages/login.html';
      return;
    }
  } else {
    // No user data found
    sessionStorage.clear();
    window.location.href = '/pages/login.html';
    return;
  }

  // Check if user is admin (only admin can access admin panel)
  if (user.role !== 'admin') {
    alert('Access denied. Admin privileges required.');
    sessionStorage.clear();
    window.location.href = '/pages/login.html';
    return;
  }

  try {
    // Validate token with backend
    console.log('🔐 Validating admin token with backend...');
    console.log('Token:', token ? token.substring(0, 20) + '...' : 'missing');
    console.log('API URL:', `${window.API_BASE_URL}/auth/validate`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(`${window.API_BASE_URL}/auth/validate`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    if (!response.ok) {
      // Token invalid or expired (e.g., server restarted)
      console.error('❌ Admin token validation failed');
      sessionStorage.clear();
      window.location.href = '/pages/login.html';
      return;
    }

    console.log('✅ Admin token validated successfully');
    // Display admin info
    displayAdminInfo(user);

  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn('⚠️ Admin auth request timeout - backend unreachable, redirecting to login');
      sessionStorage.clear();
      window.location.href = '/pages/login.html';
      return;
    }

    console.error('❌ Auth check failed:', error.message || error);
    sessionStorage.clear();
    window.location.href = '/pages/login.html';
  }
}

// Display admin information
function displayAdminInfo(user) {
  const welcomeElements = document.querySelectorAll('.admin-name, .user-name');
  welcomeElements.forEach(el => {
    if (el) el.textContent = user.name || user.email || '';
  });

  const roleElements = document.querySelectorAll('.user-role');
  roleElements.forEach(el => {
    if (el && user.role) el.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
  });
}

// Logout function
async function handleLogout() {
  const token = sessionStorage.getItem('token');

  try {
    // Call backend logout endpoint if token exists
    if (token) {
      await fetch(`${window.API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    }
  } catch (err) {
    console.error('Logout API error:', err);
    // Continue with logout even if API call fails
  }

  // Clear all authentication data
  sessionStorage.clear();
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('sessionActive');

  // Show success message
  showToast('Logged out successfully', 'success');

  // Redirect to login page
  setTimeout(() => {
    window.location.href = '/pages/login.html';
  }, 500);
}

// Toast notification function
function showToast(message, type = 'info') {
  // Remove existing toast if any
  const existingToast = document.querySelector('.custom-toast');
  if (existingToast) {
    existingToast.remove();
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `custom-toast alert alert-${type} position-fixed top-0 end-0 m-3 shadow`;
  toast.style.cssText = 'z-index: 9999; min-width: 250px; animation: slideIn 0.3s ease-out;';
  toast.innerHTML = `
    <div class="d-flex align-items-center">
      <i class="bi ${type === 'success' ? 'bi-check-circle-fill' : 'bi-info-circle-fill'} me-2"></i>
      <div class="flex-grow-1">${message}</div>
      <button type="button" class="btn-close" onclick="this.parentElement.parentElement.remove()"></button>
    </div>
  `;

  // Add animation style if not exists
  if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease-out reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Setup logout buttons
function setupLogoutButtons() {
  const logoutButtons = document.querySelectorAll('.logout-btn, [href="#logout"]');
  logoutButtons.forEach(btn => {
    // Remove existing listeners by cloning and replacing
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    // Add new listener
    newBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleLogout();
    });
  });
}

// Heartbeat mechanism for admin pages
let adminHeartbeatInterval = null;

function startAdminAuthHeartbeat() {
  if (adminHeartbeatInterval) clearInterval(adminHeartbeatInterval);
  silentAdminTokenCheck();
  adminHeartbeatInterval = setInterval(silentAdminTokenCheck, 30000);
}

async function silentAdminTokenCheck() {
  const token = sessionStorage.getItem('token');
  if (!token) {
    if (adminHeartbeatInterval) clearInterval(adminHeartbeatInterval);
    return;
  }

  try {
    const response = await fetch(`${window.API_BASE_URL}/auth/validate`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      console.warn('🚨 Admin token validation failed during heartbeat check');
      if (adminHeartbeatInterval) clearInterval(adminHeartbeatInterval);
      sessionStorage.clear();
      window.location.href = '/pages/login.html';
    }
  } catch (error) {
    console.warn('⚠️ Admin heartbeat check failed:', error.message);
    // Retry once after 2 seconds
    setTimeout(async () => {
      try {
        const retryResponse = await fetch(`${window.API_BASE_URL}/auth/validate`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!retryResponse.ok) {
          if (adminHeartbeatInterval) clearInterval(adminHeartbeatInterval);
          sessionStorage.clear();
          window.location.href = '/pages/login.html';
        }
      } catch (retryError) {
        if (adminHeartbeatInterval) clearInterval(adminHeartbeatInterval);
        sessionStorage.clear();
        window.location.href = '/pages/login.html';
      }
    }, 2000);
  }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
  checkAdminAccess();
  setupLogoutButtons();
  const token = sessionStorage.getItem('token');
  if (token) startAdminAuthHeartbeat();
});

// Re-setup logout buttons when sidebar is loaded dynamically
window.setupLogoutButtonsAfterSidebarLoad = function() {
  // Wait a bit for the sidebar HTML to be fully inserted
  setTimeout(() => {
    setupLogoutButtons();
    console.log('✅ Logout buttons re-initialized after sidebar load');
  }, 100);
};

// Export functions for use in other scripts
window.adminAuth = {
  checkAccess: checkAdminAccess,
  logout: handleLogout,
  getUser: () => {
    const userStr = sessionStorage.getItem('user');
    if (!userStr) return null;
    try { return JSON.parse(userStr); } catch (e) { return null; }
  },
  getToken: () => sessionStorage.getItem('token')
};
