// User Management JavaScript
// API_BASE_URL is provided by navbar.js

// Note: getToken() and checkAuth() are provided by navbar.js

// API Headers with token
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getToken()}`
});

// DOM Elements
let usersTableBody;
let addUserModal;
let editUserModal;
let cachedWarehouses = [];
let changePasswordModal;
let addUserForm;
let editUserForm;
let changePasswordForm;
let searchInput;
let currentEditId = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  const isAuthenticated = await checkAuth();
  console.log('[manage-users] isAuthenticated:', isAuthenticated);
  console.log('[manage-users] API_BASE_URL:', window.API_BASE_URL);
  if (!isAuthenticated) {
    console.warn('[manage-users] not authenticated; aborting user load');
    return;
  }

  // Get DOM elements
  usersTableBody = document.getElementById('usersTableBody');
  addUserForm = document.getElementById('addUserForm');
  editUserForm = document.getElementById('editUserForm');
  changePasswordForm = document.getElementById('changePasswordForm');
  searchInput = document.getElementById('searchInput');
  roleFilter = document.getElementById('roleFilter');

  // Load initial data
  try {
    loadUsers();
  } catch (e) {
    console.error('Error calling loadUsers():', e);
  }

  try {
    loadWarehouses(); // Load warehouses for dropdown
  } catch (e) {
    console.error('Error calling loadWarehouses():', e);
  }

  // Role change → toggle warehouse section
  const addRoleSelect = document.getElementById('addRole');
  if (addRoleSelect) {
    addRoleSelect.addEventListener('change', handleRoleChange);
  }

  // Edit role change → toggle warehouse section
  const editRoleSelect = document.getElementById('editRole');
  if (editRoleSelect) {
    editRoleSelect.addEventListener('change', () => handleEditRoleChange());
  }

  // Reset warehouse section when modal closes
  const addModalEl = document.getElementById('addUserModal');
  if (addModalEl) {
    addModalEl.addEventListener('hidden.bs.modal', () => {
      handleRoleChange(); // reset to single mode
    });
  }

  // Event listeners
  if (addUserForm) {
    addUserForm.addEventListener('submit', handleAddUser);
  }
  if (editUserForm) {
    editUserForm.addEventListener('submit', handleEditUser);
  }
  if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', handleChangePassword);
  }
  if (searchInput) {
    searchInput.addEventListener('input', debounce(loadUsers, 500));
  }

  // Logout functionality
  document.querySelectorAll('.logout-btn').forEach(btn => {
    btn.addEventListener('click', handleLogout);
  });
});

// Debounce function for search
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Resolve warehouse object whether it's an id string or already-populated object
async function fetchWarehouseById(id) {
  try {
    const resp = await fetch(`${API_BASE_URL}/warehouses/${id}`, { headers: getHeaders() });
    if (!resp.ok) return null;
    const json = await resp.json();
    return json.data && json.data.warehouse ? json.data.warehouse : null;
  } catch (err) {
    console.error('Error fetching warehouse by id:', err);
    return null;
  }
}

async function resolveWarehouse(wh) {
  if (!wh) return null;
  const id = typeof wh === 'string' ? wh : (wh._id || wh);

  // Try cached warehouses first
  if (id && cachedWarehouses && cachedWarehouses.length > 0) {
    const found = cachedWarehouses.find(w => String(w._id) === String(id));
    if (found) return found;
  }

  if (typeof wh === 'string') {
    return await fetchWarehouseById(wh);
  }

  // It may be a populated object already
  return wh;
}

// Ensure a select gets a value only when an option with that value exists.
// Retries a few times with short delays to handle network/dom update races (production).
function ensureSelectValue(selectEl, value, attempts = 8, delayMs = 100) {
  return new Promise(resolve => {
    if (!selectEl) return resolve(false);

    const trySet = (remaining) => {
      const optionExists = Array.from(selectEl.options).some(o => String(o.value) === String(value));
      if (optionExists) {
        selectEl.value = value;
        return resolve(true);
      }

      if (remaining <= 0) {
        // no matching option found — leave it unset
        return resolve(false);
      }

      setTimeout(() => trySet(remaining - 1), delayMs);
    };

    trySet(attempts);
  });
}

// Load all users
async function loadUsers() {
  try {
    const params = new URLSearchParams();
    params.append('limit', '100');

    if (searchInput && searchInput.value) {
      params.append('search', searchInput.value);
    }

    // Use AbortController to avoid hanging requests in production
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

    const response = await fetch(`${API_BASE_URL}/users?${params.toString()}`, {
      headers: getHeaders(),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Try to surface server message if present
      let errMsg = 'Failed to fetch users';
      try {
        const errJson = await response.json();
        if (errJson && errJson.message) errMsg = errJson.message;
      } catch (e) {}
      throw new Error(errMsg);
    }

    const data = await response.json();

    // Accept multiple possible shapes: { data: { users: [...] } } or { users: [...] }
    const usersArray = (data && data.data && data.data.users) || data.users || [];
    displayUsers(usersArray);
  } catch (error) {
    console.error('Error loading users:', error);
    showAlert('Failed to load users', 'danger');
    if (usersTableBody) {
      usersTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Failed to load users. Please refresh.</td></tr>';
    }
  }
}

// Display users in table
function displayUsers(users) {
  if (!usersTableBody) return;

  // Filter out admin users
  const filteredUsers = users.filter(user => user.role !== 'admin');

  if (!filteredUsers || filteredUsers.length === 0) {
    usersTableBody.innerHTML = '<tr><td colspan="7" class="text-center">No users found</td></tr>';
    return;
  }

  usersTableBody.innerHTML = filteredUsers.map(user => {
    // Set badge color based on role
    let roleBadgeClass = 'secondary';
    if (user.role === 'manager') {
      roleBadgeClass = 'warning';
    } else if (user.role === 'staff') {
      roleBadgeClass = 'info';
    } else if (user.role === 'viewer') {
      roleBadgeClass = 'secondary';
    }
    
    // Calculate warehouse count
    const warehouseCount = user.warehouses && user.warehouses.length > 0
      ? user.warehouses.length
      : user.warehouse
        ? 1
        : 0;
    const warehouseDisplay = warehouseCount > 0
      ? `<span class="badge bg-light text-dark">${warehouseCount}</span>`
      : '<span class="text-muted">N/A</span>';
    
    const statusClass = user.status === 'active' ? 'success' : user.status === 'inactive' ? 'secondary' : 'warning';
    const statusText = user.status || 'active';
    
    // Capitalize role for display
    const roleDisplay = user.role.charAt(0).toUpperCase() + user.role.slice(1);
    
    return `
      <tr>
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td><span class="badge bg-${roleBadgeClass}">${roleDisplay}</span></td>
        <td>${warehouseDisplay}</td>
        <td>
          <span class="badge bg-${statusClass}">
            ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}
          </span>
        </td>
        <td>
          <button class="btn btn-sm btn-outline-info me-1" onclick="showViewUserModal('${user._id}')" title="View Details">
            <i class="bi bi-eye"></i> View
          </button>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="showEditModal('${user._id}')" title="Edit User">
            <i class="bi bi-pencil-square"></i> Edit
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${user._id}')" title="Delete User">
            <i class="bi bi-trash"></i> Delete
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Load warehouses for dropdown and checklist
async function loadWarehouses() {
  try {
    const response = await fetch(`${API_BASE_URL}/warehouses?limit=100`, {
      headers: getHeaders()
    });

    const data = await response.json();

    if (data.success && data.data && data.data.warehouses) {
      const warehouses = data.data.warehouses;
      // cache for later lookup
      cachedWarehouses = warehouses;

      // Single-select dropdown (Staff / Viewer)
      const warehouseSelect = document.getElementById('addWarehouse');
      if (warehouseSelect) {
        warehouseSelect.innerHTML = warehouses.length === 0
          ? '<option value="">No warehouses available</option>'
          : '<option value="">Select Warehouse</option>' +
            warehouses.map(wh =>
              `<option value="${wh._id}">${wh.code} - ${wh.name}</option>`
            ).join('');
      }

      // Checklist (Manager)
      const checklist = document.getElementById('addWarehouseChecklist');
      if (checklist) {
        if (warehouses.length === 0) {
          checklist.innerHTML = '<div class="text-muted small">No warehouses available.</div>';
        } else {
          checklist.innerHTML = `
            <div class="form-check mb-1 pb-1 border-bottom">
              <input class="form-check-input" type="checkbox" id="mwh_select_all">
              <label class="form-check-label fw-semibold" for="mwh_select_all">Select All</label>
            </div>
          ` + warehouses.map(wh => `
            <div class="form-check mb-1">
              <input class="form-check-input wh-manager-cb" type="checkbox"
                id="mwh_${wh._id}" value="${wh._id}">
              <label class="form-check-label" for="mwh_${wh._id}">
                <span class="fw-semibold">${wh.code}</span>
                <span class="text-muted"> — ${wh.name}</span>
              </label>
            </div>
          `).join('');

          // Bind Select All
          const selectAllCb = checklist.querySelector('#mwh_select_all');
          if (selectAllCb) {
            selectAllCb.addEventListener('change', function () {
              checklist.querySelectorAll('.wh-manager-cb').forEach(cb => {
                cb.checked = this.checked;
              });
            });
            checklist.querySelectorAll('.wh-manager-cb').forEach(cb => {
              cb.addEventListener('change', function () {
                const allCbs = checklist.querySelectorAll('.wh-manager-cb');
                const allChecked = Array.from(allCbs).every(c => c.checked);
                const noneChecked = Array.from(allCbs).every(c => !c.checked);
                selectAllCb.checked = allChecked;
                selectAllCb.indeterminate = !allChecked && !noneChecked;
              });
            });
          }
        }
      }

      console.log(`Loaded ${warehouses.length} warehouses`);
    }
  } catch (error) {
    console.error('Error loading warehouses:', error);
    showAlert('Failed to load warehouses. Please refresh the page.', 'danger');
  }
}

// Show View User Details Modal
async function showViewUserModal(userId) {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      headers: getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user details');
    }

    const data = await response.json();
    const user = data.data.user;

    // Populate basic info fields
    document.getElementById('viewName').textContent = user.name || 'N/A';
    document.getElementById('viewEmail').textContent = user.email || 'N/A';
    
    // Populate role badge
    const roleDisplay = user.role.charAt(0).toUpperCase() + user.role.slice(1);
    const roleBadgeClass = user.role === 'manager' ? 'warning' : user.role === 'staff' ? 'info' : 'secondary';
    document.getElementById('viewRole').innerHTML = `<span class="badge bg-${roleBadgeClass}">${roleDisplay}</span>`;
    
    // Populate status badge
    const statusClass = user.status === 'active' ? 'success' : user.status === 'inactive' ? 'secondary' : 'warning';
    const statusText = user.status || 'active';
    document.getElementById('viewStatus').innerHTML = `<span class="badge bg-${statusClass}">${statusText.charAt(0).toUpperCase() + statusText.slice(1)}</span>`;

    // Populate warehouse list
    const warehousesList = document.getElementById('viewWarehousesList');
    warehousesList.innerHTML = ''; // Clear previous content

    const warehouses = user.warehouses && user.warehouses.length > 0 ? user.warehouses : user.warehouse ? [user.warehouse] : [];

    if (warehouses.length === 0) {
      warehousesList.innerHTML = '<p class="text-muted">No warehouses assigned</p>';
    } else {
      // Resolve warehouses that may be ids
      const resolved = await Promise.all(warehouses.map(w => resolveWarehouse(w)));
      warehousesList.innerHTML = resolved.map(wh => `
        <div class="card mb-2">
          <div class="card-body py-2">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <h6 class="card-title mb-1">${(wh && (wh.code || wh._id)) || 'N/A'} — ${(wh && wh.name) || 'N/A'}</h6>
                ${wh && wh.location ? `
                  <small class="text-muted d-block">
                    ${wh.location.address || ''} ${wh.location.city ? ', ' + wh.location.city : ''} ${wh.location.state ? ', ' + wh.location.state : ''} ${wh.location.zipCode || ''}
                  </small>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
      `).join('');
    }

    // Show modal
    const viewUserModal = new bootstrap.Modal(document.getElementById('viewUserModal'));
    viewUserModal.show();
  } catch (error) {
    console.error('Error fetching user details:', error);
    showAlert('Failed to load user details', 'danger');
  }
}

// Toggle warehouse section based on selected role
function handleRoleChange() {
  const role = document.getElementById('addRole')?.value;
  const singleSection = document.getElementById('singleWarehouseSection');
  const multiSection = document.getElementById('multiWarehouseSection');
  const singleSelect = document.getElementById('addWarehouse');

  // Clear all selections
  if (singleSelect) {
    singleSelect.value = '';
  }
  document.querySelectorAll('#addWarehouseChecklist .wh-manager-cb').forEach(cb => {
    cb.checked = false;
  });
  const selectAllCb = document.querySelector('#mwh_select_all');
  if (selectAllCb) {
    selectAllCb.checked = false;
    selectAllCb.indeterminate = false;
  }

  if (role === 'manager') {
    singleSection.style.display = 'none';
    multiSection.style.display = 'block';
    singleSelect.removeAttribute('required');
  } else {
    singleSection.style.display = 'block';
    multiSection.style.display = 'none';
    singleSelect.setAttribute('required', 'required');
    // Uncheck all manager checkboxes
    document.querySelectorAll('#addWarehouseChecklist .wh-manager-cb').forEach(cb => {
      cb.checked = false;
    });
    const errEl = document.getElementById('addWarehouseError');
    if (errEl) errEl.style.display = 'none';
  }
}

// Load warehouses for edit modal
async function loadWarehousesForEdit() {
  try {
    const response = await fetch(`${API_BASE_URL}/warehouses?limit=100`, {
      headers: getHeaders()
    });

    const data = await response.json();

    if (data.success && data.data && data.data.warehouses) {
      const warehouses = data.data.warehouses;
      // Cache for use in edit flows
      cachedWarehouses = warehouses;

      // Single-select dropdown (Staff / Viewer)
      const warehouseSelect = document.getElementById('editWarehouse');
      if (warehouseSelect) {
        warehouseSelect.innerHTML = warehouses.length === 0
          ? '<option value="">No warehouses available</option>'
          : '<option value="">Select Warehouse</option>' +
            warehouses.map(wh =>
              `<option value="${wh._id}">${wh.code} - ${wh.name}</option>`
            ).join('');
      }

      // Checklist (Manager)
      const checklist = document.getElementById('editWarehouseChecklist');
      if (checklist) {
        if (warehouses.length === 0) {
          checklist.innerHTML = '<div class="text-muted small">No warehouses available.</div>';
        } else {
          checklist.innerHTML = `
            <div class="form-check mb-1 pb-1 border-bottom">
              <input class="form-check-input" type="checkbox" id="edit_mwh_select_all">
              <label class="form-check-label fw-semibold" for="edit_mwh_select_all">Select All</label>
            </div>
          ` + warehouses.map(wh => `
            <div class="form-check mb-1">
              <input class="form-check-input wh-edit-manager-cb" type="checkbox"
                id="edit_mwh_${wh._id}" value="${wh._id}">
              <label class="form-check-label" for="edit_mwh_${wh._id}">
                <span class="fw-semibold">${wh.code}</span>
                <span class="text-muted"> — ${wh.name}</span>
              </label>
            </div>
          `).join('');

          // Bind Select All
          const selectAllCb = checklist.querySelector('#edit_mwh_select_all');
          if (selectAllCb) {
            selectAllCb.addEventListener('change', function () {
              checklist.querySelectorAll('.wh-edit-manager-cb').forEach(cb => {
                cb.checked = this.checked;
              });
              refreshAssignedWarehousesDisplay();
            });
            checklist.querySelectorAll('.wh-edit-manager-cb').forEach(cb => {
              cb.addEventListener('change', function () {
                const allCbs = checklist.querySelectorAll('.wh-edit-manager-cb');
                const allChecked = Array.from(allCbs).every(c => c.checked);
                const noneChecked = Array.from(allCbs).every(c => !c.checked);
                selectAllCb.checked = allChecked;
                selectAllCb.indeterminate = !allChecked && !noneChecked;
                refreshAssignedWarehousesDisplay();
              });
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('Error loading warehouses for edit:', error);
    showAlert('Failed to load warehouses. Please try again.', 'danger');
  }
}

// Remove assigned warehouse from modal
function removeAssignedWarehouse(whId, type) {
  if (type === 'single') {
    // For staff/viewer, just clear the display and clear the selection
    const assignedDiv = document.getElementById('editCurrentSingleWarehouse');
    if (assignedDiv) {
      assignedDiv.innerHTML = '<p class="text-muted small mb-0">No warehouse assigned</p>';
    }
    const warehouseSelect = document.getElementById('editWarehouse');
    if (warehouseSelect) {
      warehouseSelect.value = '';
    }
  } else if (type === 'multi') {
    // For managers, uncheck the corresponding checkbox (ids are 'edit_mwh_<id>') and update display
    const checkbox = document.querySelector(`#edit_mwh_${whId}`);
    if (checkbox) {
      checkbox.checked = false;
      // Trigger update of select all checkbox
      const selectAllCb = document.querySelector('#edit_mwh_select_all');
      if (selectAllCb) {
        const allCbs = document.querySelectorAll('#editWarehouseChecklist .wh-edit-manager-cb');
        const allChecked = Array.from(allCbs).every(c => c.checked);
        const noneChecked = Array.from(allCbs).every(c => !c.checked);
        selectAllCb.checked = allChecked;
        selectAllCb.indeterminate = !allChecked && !noneChecked;
      }
      // Refresh assigned warehouses display
      refreshAssignedWarehousesDisplay();
    }
  }
}

// Refresh assigned warehouses display for managers
function refreshAssignedWarehousesDisplay() {
  const checkedBoxes = document.querySelectorAll('#editWarehouseChecklist .wh-edit-manager-cb:checked');
  const assignedList = document.getElementById('editCurrentMultiWarehouses');
  
      if (assignedList) {
        if (checkedBoxes.length === 0) {
          assignedList.innerHTML = '<p class="text-muted small mb-0">No warehouses assigned</p>';
        } else {
          assignedList.innerHTML = Array.from(checkedBoxes).map(cb => {
            const label = cb.nextElementSibling;
            const warehouseText = label ? label.textContent.trim() : cb.value;
            const whId = cb.value;
            return `
          <div class="d-flex justify-content-between align-items-center p-2 mb-1 bg-white border rounded">
            <div>${warehouseText}</div>
            <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeAssignedWarehouse('${whId}', 'multi')">
              <i class="bi bi-trash"></i> Remove
            </button>
          </div>
        `;
          }).join('');
        }
      }
}

// Toggle warehouse section based on selected role in edit modal
async function handleEditRoleChange(user = null) {
  const role = document.getElementById('editRole')?.value;
  const singleSection = document.getElementById('editSingleWarehouseSection');
  const multiSection = document.getElementById('editMultiWarehouseSection');
  const singleSelect = document.getElementById('editWarehouse');

  // Clear all selections first
  if (singleSelect) {
    singleSelect.value = '';
  }
  document.querySelectorAll('#editWarehouseChecklist .wh-edit-manager-cb').forEach(cb => {
    cb.checked = false;
  });
  const selectAllCb = document.querySelector('#edit_mwh_select_all');
  if (selectAllCb) {
    selectAllCb.checked = false;
    selectAllCb.indeterminate = false;
  }

  if (role === 'admin') {
    // Hide both sections for admin
    if (singleSection) singleSection.style.display = 'none';
    if (multiSection) multiSection.style.display = 'none';
    if (singleSelect) singleSelect.removeAttribute('required');
  } else if (role === 'manager') {
    // Show multi-select for manager
    if (singleSection) singleSection.style.display = 'none';
    if (multiSection) multiSection.style.display = 'block';
    if (singleSelect) singleSelect.removeAttribute('required');

    // Display currently assigned warehouses for manager
    if (user && user.warehouses && user.warehouses.length > 0) {
      const assignedList = document.getElementById('editCurrentMultiWarehouses');
      if (assignedList) {
        // Build the assigned list using warehouse ids (remove will reference the id)
        assignedList.innerHTML = user.warehouses.map(wh => `
          <div class="d-flex justify-content-between align-items-center p-2 mb-1 bg-white border rounded">
            <div>
              <span class="fw-semibold">${wh.code || ''}</span>
              <span class="text-muted"> — ${wh.name || ''}</span>
            </div>
            <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeAssignedWarehouse('${wh._id || wh}', 'multi')">
              <i class="bi bi-trash"></i> Remove
            </button>
          </div>
        `).join('');
      }

      const warehouseIds = user.warehouses.map(wh => wh._id || wh);
      console.log('Pre-selecting warehouses for manager:', warehouseIds);
      document.querySelectorAll('#editWarehouseChecklist .wh-edit-manager-cb').forEach(cb => {
        if (warehouseIds.includes(cb.value)) {
          cb.checked = true;
        }
      });
      // Update select all checkbox
      const selectAllCbForUpdate = document.querySelector('#edit_mwh_select_all');
      if (selectAllCbForUpdate) {
        const allCbs = document.querySelectorAll('#editWarehouseChecklist .wh-edit-manager-cb');
        const allChecked = Array.from(allCbs).every(c => c.checked);
        const someChecked = Array.from(allCbs).some(c => c.checked);
        selectAllCbForUpdate.checked = allChecked;
        selectAllCbForUpdate.indeterminate = !allChecked && someChecked;
      }
    } else {
      // No warehouses assigned
      const assignedList = document.getElementById('editCurrentMultiWarehouses');
      if (assignedList) {
        assignedList.innerHTML = '<p class="text-muted small mb-0">No warehouses assigned</p>';
      }
    }
  } else {
    // Show single-select for staff/viewer
    if (singleSection) singleSection.style.display = 'block';
    if (multiSection) multiSection.style.display = 'none';
    if (singleSelect) singleSelect.setAttribute('required', 'required');

    // Display currently assigned warehouse for staff/viewer
    if (user && user.warehouse) {
      // Prefer using cached warehouses (populated by loadWarehousesForEdit). If not found, fall back to resolveWarehouse.
      const assignedDiv = document.getElementById('editCurrentSingleWarehouse');
      const warehouseIdRaw = (user.warehouse && (user.warehouse._id || user.warehouse)) || user.warehouse;
      const warehouseId = warehouseIdRaw ? String(warehouseIdRaw) : null;

      let resolved = null;
      if (warehouseId && cachedWarehouses && cachedWarehouses.length > 0) {
        resolved = cachedWarehouses.find(w => String(w._id) === warehouseId) || null;
      }

      if (!resolved) {
        // last-resort: try resolving via network (same behaviour as before)
        try {
          resolved = await resolveWarehouse(user.warehouse);
        } catch (err) {
          resolved = null;
        }
      }

      const codeText = resolved && (resolved.code || resolved._id) || null;
      const nameText = resolved && resolved.name || null;

      if (assignedDiv) {
        if (!codeText && !nameText) {
          assignedDiv.innerHTML = '<p class="text-muted small mb-0">Loading warehouse…</p>';
        } else {
          assignedDiv.innerHTML = `
            <div class="d-flex justify-content-between align-items-center p-2 bg-white border rounded">
              <div>
                <span class="fw-semibold">${codeText || ''}</span>
                <span class="text-muted"> — ${nameText || ''}</span>
              </div>
              <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeAssignedWarehouse('${warehouseId}', 'single')">
                <i class="bi bi-trash"></i> Remove
              </button>
            </div>
          `;
        }
      }

      console.log('Pre-selecting warehouse for staff:', warehouseId);

      // Ensure the select option exists before setting value. If it doesn't, create one from resolved.
      if (singleSelect && warehouseId) {
        const optionExists = Array.from(singleSelect.options).some(o => String(o.value) === warehouseId);
        if (optionExists) {
          singleSelect.value = warehouseId;
        } else if (resolved) {
          // Add a best-effort option so the UI shows the assigned warehouse immediately
          try {
            const opt = document.createElement('option');
            opt.value = warehouseId;
            opt.text = `${resolved.code || warehouseId} - ${resolved.name || ''}`;
            singleSelect.appendChild(opt);
            singleSelect.value = warehouseId;
          } catch (err) {
            // Fallback to original ensureSelectValue (keeps previous retry behaviour)
            await ensureSelectValue(singleSelect, warehouseId);
          }
        } else {
          // last fallback: try the retry helper
          await ensureSelectValue(singleSelect, warehouseId);
        }
      }
    } else {
      // No warehouse assigned
      const assignedDiv = document.getElementById('editCurrentSingleWarehouse');
      if (assignedDiv) {
        assignedDiv.innerHTML = '<p class="text-muted small mb-0">No warehouse assigned</p>';
      }
    }

    const errEl = document.getElementById('editWarehouseError');
    if (errEl) errEl.style.display = 'none';
  }
}

// Show add user modal
function showAddUserModal() {
  const modal = new bootstrap.Modal(document.getElementById('addUserModal'));
  if (addUserForm) {
    addUserForm.reset();
  }
  modal.show();
}

// Handle add user
async function handleAddUser(e) {
  e.preventDefault();

  const formData = new FormData(addUserForm);
  const role = formData.get('role');

  // Validate role selection
  if (!role || role === '') {
    showAlert('Please select a user role', 'danger');
    return;
  }

  const userData = {
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    role: role,
    status: formData.get('isActive') === 'true' ? 'active' : 'inactive',
  };

  // Validate password confirmation
  const confirmPassword = formData.get('confirmPassword');
  if (userData.password !== confirmPassword) {
    showAlert('Passwords do not match', 'danger');
    return;
  }

  if (role === 'manager') {
    // Collect all checked warehouses
    const checkedWarehouses = [];
    document.querySelectorAll('#addWarehouseChecklist .wh-manager-cb:checked').forEach(cb => {
      checkedWarehouses.push(cb.value);
    });

    if (checkedWarehouses.length === 0) {
      const errEl = document.getElementById('addWarehouseError');
      if (errEl) errEl.style.display = 'block';
      showAlert('Please select at least one warehouse for the manager.', 'danger');
      return;
    }

    const errEl = document.getElementById('addWarehouseError');
    if (errEl) errEl.style.display = 'none';
    userData.warehouses = checkedWarehouses;
  } else {
    // Single warehouse for staff / viewer
    const warehouse = formData.get('warehouse');
    if (!warehouse || warehouse === '') {
      showAlert('Please select a warehouse', 'danger');
      return;
    }
    userData.warehouse = warehouse.trim();
  }

  console.log('Sending user data:', userData);

  try {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(userData)
    });

    const data = await response.json();
    console.log('Response:', data);

    if (!response.ok) {
      throw new Error(data.message || 'Failed to add user');
    }

    showAlert('User added successfully', 'success');
    addUserForm.reset();
    handleRoleChange(); // reset warehouse section UI

    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
    if (modal) modal.hide();

    loadUsers();
  } catch (error) {
    console.error('Error adding user:', error);
    showAlert(error.message, 'danger');
  }
}

// Show edit modal
async function showEditModal(userId) {
  currentEditId = userId;

  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      headers: getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user details');
    }

    const data = await response.json();
    const user = data.data.user;

    // Load warehouses for edit modal
    await loadWarehousesForEdit();

    // Populate form
    document.getElementById('editName').value = user.name;
    document.getElementById('editEmail').value = user.email;
    document.getElementById('editRole').value = user.role;
    // Convert status to isActive format for the form (active = true, inactive = false)
    document.getElementById('editIsActive').value = (user.status === 'active').toString();

    // Handle warehouse selections based on role
    await handleEditRoleChange(user);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
    modal.show();
  } catch (error) {
    console.error('Error loading user:', error);
    showAlert(error.message, 'danger');
  }
}

// Handle edit user
async function handleEditUser(e) {
  e.preventDefault();

  if (!currentEditId) return;

  const formData = new FormData(editUserForm);
  const role = formData.get('role');
  const userData = {
    name: formData.get('name'),
    email: formData.get('email'),
    role: role,
    status: formData.get('isActive') === 'true' ? 'active' : 'inactive'
  };

  // Handle warehouse assignment based on role
  if (role === 'manager') {
    // Collect all checked warehouses
    const checkedWarehouses = [];
    document.querySelectorAll('#editWarehouseChecklist .wh-edit-manager-cb:checked').forEach(cb => {
      checkedWarehouses.push(cb.value);
    });

    if (checkedWarehouses.length === 0) {
      const errEl = document.getElementById('editWarehouseError');
      if (errEl) errEl.style.display = 'block';
      showAlert('Please select at least one warehouse for the manager.', 'danger');
      return;
    }

    const errEl = document.getElementById('editWarehouseError');
    if (errEl) errEl.style.display = 'none';
    userData.warehouses = checkedWarehouses;
  } else if (role !== 'admin') {
    // Single warehouse for staff / viewer (can be empty to unassign)
    const warehouse = formData.get('warehouse');
    if (warehouse && warehouse !== '') {
      userData.warehouse = warehouse.trim();
    } else {
      // Allow unassignment by sending null
      userData.warehouse = null;
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}/users/${currentEditId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(userData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to update user');
    }

    showAlert('User updated successfully', 'success');
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
    if (modal) modal.hide();
    
    currentEditId = null;
    loadUsers();
  } catch (error) {
    console.error('Error updating user:', error);
    showAlert(error.message, 'danger');
  }
}

// Toggle user active status
async function toggleUserStatus(userId, newStatus) {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ isActive: newStatus })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to update user status');
    }

    showAlert(`User ${newStatus ? 'activated' : 'deactivated'} successfully`, 'success');
    loadUsers();
  } catch (error) {
    console.error('Error updating user status:', error);
    showAlert(error.message, 'danger');
  }
}

// Delete user
async function deleteUser(userId) {
  if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete user');
    }

    showAlert('User deleted successfully', 'success');
    loadUsers();
  } catch (error) {
    console.error('Error deleting user:', error);
    showAlert(error.message, 'danger');
  }
}

// Show change password modal
function showChangePasswordModal(userId) {
  currentEditId = userId;
  
  if (changePasswordForm) {
    changePasswordForm.reset();
  }
  
  const modal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
  modal.show();
}

// Handle change password
async function handleChangePassword(e) {
  e.preventDefault();

  const formData = new FormData(changePasswordForm);
  const newPassword = formData.get('newPassword');
  const confirmPassword = formData.get('confirmPassword');

  if (newPassword !== confirmPassword) {
    showAlert('Passwords do not match', 'danger');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/users/change-password`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        currentPassword: formData.get('currentPassword'),
        newPassword: newPassword
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to change password');
    }

    showAlert('Password changed successfully', 'success');
    changePasswordForm.reset();
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
    if (modal) modal.hide();
  } catch (error) {
    console.error('Error changing password:', error);
    showAlert(error.message, 'danger');
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

// Logout handler
async function handleLogout() {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: getHeaders()
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Clear all client-side storage that may hold auth state
    try { sessionStorage.clear(); } catch (e) {}
    try { localStorage.clear(); } catch (e) {}

    // Clear auth cookie if it exists (best-effort)
    document.cookie.split(';').forEach(function(c) {
      const name = c.split('=')[0].trim();
      if (name.toLowerCase().includes('token') || name.toLowerCase().includes('auth')) {
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/';
      }
    });

    // Hard redirect to login to avoid rehydration race
    window.location.href = 'login.html';
  }
}
