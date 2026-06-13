/**
 * Manager Warehouse Selection
 * Displays all warehouses the logged-in manager can access.
 * Clicking a warehouse stores it in sessionStorage and enters the dashboard.
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getToken() {
  return sessionStorage.getItem('token');
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  };
}

function handleLogout() {
  sessionStorage.clear();
  window.location.href = '/pages/login.html';
}

window.handleLogout = handleLogout;

// ─── UI helpers ───────────────────────────────────────────────────────────────

function showState(state) {
  document.getElementById('loadingState').style.display = state === 'loading' ? 'block' : 'none';
  document.getElementById('errorState').style.display   = state === 'error'   ? 'block' : 'none';
  document.getElementById('emptyState').style.display   = state === 'empty'   ? 'block' : 'none';

  const grid = document.getElementById('warehouseGrid');
  if (state === 'grid') {
    grid.style.removeProperty('display');
    grid.style.display = 'flex';
    grid.classList.add('d-flex');
  } else {
    grid.style.display = 'none';
  }
}

function setErrorMessage(msg) {
  document.getElementById('errorMessage').textContent = msg || 'Something went wrong.';
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function statusBadge(status) {
  const map = {
    active:      { cls: 'bg-success',           label: 'Active'      },
    inactive:    { cls: 'bg-secondary',          label: 'Inactive'    },
    maintenance: { cls: 'bg-warning text-dark',  label: 'Maintenance' },
    full:        { cls: 'bg-danger',             label: 'Full'        },
  };
  const s = map[status] || { cls: 'bg-secondary', label: status || 'Unknown' };
  return `<span class="badge badge-status ${s.cls}">${s.label}</span>`;
}

// ─── Render warehouses ────────────────────────────────────────────────────────

function renderWarehouses(warehouses) {
  const grid = document.getElementById('warehouseGrid');
  grid.innerHTML = '';

  warehouses.forEach((wh) => {
    const id       = wh._id   || wh.id   || wh;
    const name     = wh.name  || 'Warehouse';
    const code     = wh.code  || '';
    const location = wh.location || '';
    const status   = wh.status   || 'active';

    const col = document.createElement('div');
    col.className = 'col-12 col-sm-6 col-md-4 col-lg-3';

    col.innerHTML = `
      <div
        class="warehouse-card h-100"
        tabindex="0"
        role="button"
        aria-label="Enter ${name}"
        data-id="${id}"
        data-name="${name}"
        data-code="${code}"
        data-status="${status}"
      >
        <div class="warehouse-icon">
          <i class="bi bi-building"></i>
        </div>
        <div class="warehouse-code">${code}</div>
        <div class="warehouse-name">${name}</div>
        ${location ? `<div class="warehouse-location"><i class="bi bi-geo-alt me-1"></i>${location}</div>` : ''}
        <div class="mt-2">${statusBadge(status)}</div>
        <div class="enter-label">
          <i class="bi bi-arrow-right-circle me-1"></i>Enter Warehouse
        </div>
      </div>
    `;

    const card = col.querySelector('.warehouse-card');
    card.addEventListener('click', () => selectWarehouse(wh));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') selectWarehouse(wh);
    });

    grid.appendChild(col);
  });

  showState('grid');
}

// ─── Select a warehouse ───────────────────────────────────────────────────────

function selectWarehouse(wh) {
  const id   = wh._id   || wh.id   || wh;
  const name = wh.name  || '';
  const code = wh.code  || '';

  sessionStorage.setItem('warehouseId',   id);
  sessionStorage.setItem('warehouseName', name);
  sessionStorage.setItem('warehouseCode', code);

  window.location.href = '/pages/user-dashboard.html';
}

// ─── Resolve warehouse IDs to full objects ────────────────────────────────────

async function fetchWarehouseDetails(ids) {
  try {
    const results = await Promise.all(
      ids.map(id =>
        fetch(`${window.API_BASE_URL}/warehouses/${id}`, { headers: getHeaders() })
          .then(r => (r.ok ? r.json() : null))
          .then(d => {
            // Handle both { data: { warehouse: {...} } } and { data: {...} }
            if (!d) return null;
            return d.data?.warehouse || d.data || null;
          })
      )
    );
    const valid = results.filter(Boolean);
    if (valid.length === 0) {
      showState('empty');
    } else {
      sessionStorage.setItem('managerWarehouses', JSON.stringify(valid));
      renderWarehouses(valid);
    }
  } catch (err) {
    console.error('[WarehouseSelect] fetchWarehouseDetails error:', err);
    setErrorMessage('Could not load warehouse details. Please try again.');
    showState('error');
  }
}

// ─── FIX: Always fetch fresh warehouse list from API ─────────────────────────
// Never rely on sessionStorage cache for warehouse list — admin may have
// changed assignments since last login. Always call /auth/me fresh.

async function fetchAllManagerWarehouses() {
  try {
    const response = await fetch(`${window.API_BASE_URL}/auth/me`, {
      headers: getHeaders()
    });

    if (!response.ok) {
      if (response.status === 401) {
        handleLogout();
        return;
      }
      throw new Error('Failed to load user profile');
    }

    const data = await response.json();

    // Handle multiple possible response shapes from /auth/me
    const user = data.data?.user || data.data || data.user || data;

    // FIX: Check BOTH warehouses (array, for manager) AND warehouse (singular,
    // set as primary). The backend may populate one or both depending on version.
    let warehouses = [];

    if (user.warehouses && Array.isArray(user.warehouses) && user.warehouses.length > 0) {
      // Use the full array — this is the correct field for managers
      warehouses = user.warehouses;
    } else if (user.warehouse) {
      // Fallback: singular field — wrap in array so UI still works
      warehouses = [user.warehouse];
    }

    if (warehouses.length === 0) {
      console.warn('[WarehouseSelect] No warehouses found on user object:', user);
      showState('empty');
      return;
    }

    // FIX: If warehouses are bare IDs (not populated objects), fetch details
    const firstItem = warehouses[0];
    const needsPopulation = typeof firstItem === 'string' ||
      (typeof firstItem === 'object' && !firstItem.name);

    if (needsPopulation) {
      // Extract IDs and fetch full warehouse details
      const ids = warehouses.map(w => w._id || w.id || w);
      await fetchWarehouseDetails(ids);
    } else {
      // Already populated objects — render directly
      sessionStorage.setItem('managerWarehouses', JSON.stringify(warehouses));
      renderWarehouses(warehouses);
    }

  } catch (err) {
    console.error('[WarehouseSelect] fetchAllManagerWarehouses error:', err);
    setErrorMessage(err.message || 'Could not load warehouses. Please try again.');
    showState('error');
  }
}

// ─── Load warehouses ──────────────────────────────────────────────────────────
// FIX: Always fetch fresh from API on every page load.
// Never use sessionStorage cache for the warehouse LIST — admin may have
// changed assignments at any time. Cache is only used for the selected
// warehouse (warehouseId, warehouseName, warehouseCode) within a session.

async function loadWarehouses() {
  showState('loading');

  // FIX: Clear stale managerWarehouses cache — always get fresh list from API.
  // This was the root cause: old cache from a previous session with fewer
  // warehouses was being served instead of the updated assignment.
  sessionStorage.removeItem('managerWarehouses');

  await fetchAllManagerWarehouses();
}

// ─── Auth check ───────────────────────────────────────────────────────────────

async function checkAuth() {
  const token = getToken();
  if (!token) {
    window.location.href = '/pages/login.html';
    return false;
  }

  const userRole = sessionStorage.getItem('userRole');
  if (userRole === 'admin') {
    window.location.href = '/pages/admin.html';
    return false;
  }

  try {
    const res = await fetch(`${window.API_BASE_URL}/auth/validate`, {
      headers: getHeaders()
    });
    if (!res.ok) {
      sessionStorage.clear();
      window.location.href = '/pages/login.html';
      return false;
    }
  } catch (_) {
    // Allow offline/timeout — don't log out
  }

  return true;
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const ok = await checkAuth();
  if (!ok) return;

  const name = sessionStorage.getItem('userName') || 'Manager';
  document.getElementById('managerName').textContent = name;
  document.getElementById('managerNameHeader').textContent = name;

  await loadWarehouses();
});