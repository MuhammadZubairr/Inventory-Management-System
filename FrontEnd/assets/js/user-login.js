// User Login JavaScript
const API_BASE_URL = 'http://localhost:3001/api';

// Check if already logged in
document.addEventListener('DOMContentLoaded', () => {
  const token = sessionStorage.getItem('token');
  const userRole = sessionStorage.getItem('userRole');
  
  if (token && userRole && userRole !== 'admin') {
    window.location.href = '/pages/user-dashboard.html';
  }
});

// Handle login form submission
document.getElementById('userLoginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    const { user, token } = data.data;

    // Check if user is active
    if (user.status !== 'active') {
      showAlert(`Your account is ${user.status}. Please contact administrator.`, 'danger');
      return;
    }

    // Check if user is not admin (operational user)
    if (user.role === 'admin') {
      showAlert('Admin users should use the admin login page.', 'warning');
      setTimeout(() => {
        window.location.href = '/pages/login.html';
      }, 2000);
      return;
    }

    // Check if warehouse is assigned
    if (!user.warehouse) {
      showAlert('No warehouse assigned. Please contact administrator.', 'danger');
      return;
    }

    // Store user data in sessionStorage
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('userId', user._id);
    sessionStorage.setItem('userName', user.name);
    sessionStorage.setItem('userEmail', user.email);
    sessionStorage.setItem('userRole', user.role);
    sessionStorage.setItem('warehouseId', user.warehouse._id);
    sessionStorage.setItem('warehouseName', user.warehouse.name);
    sessionStorage.setItem('warehouseCode', user.warehouse.code);

    // Show success message
    showAlert('Login successful! Redirecting...', 'success');

    // Redirect to user dashboard
    setTimeout(() => {
      window.location.href = '/pages/user-dashboard.html';
    }, 1000);

  } catch (error) {
    console.error('Login error:', error);
    showAlert(error.message || 'Invalid email or password', 'danger');
  }
});

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
