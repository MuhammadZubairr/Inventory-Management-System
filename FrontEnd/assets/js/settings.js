/**
 * Settings Page Functionality
 * Handles profile updates and password changes
 */

const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3001/api';
const UPLOAD_BASE_URL = 'http://localhost:3001';

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    const token = sessionStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Load user data
    loadUserProfile();

    // Handle profile image preview
    const profileImageInput = document.getElementById('profileImage');
    const profilePreviewImg = document.getElementById('profile-preview-img');

    profileImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                profilePreviewImg.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // Handle profile form submission
    const profileForm = document.getElementById('profile-form');
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        formData.append('name', document.getElementById('profile-name').value);
        formData.append('phone', document.getElementById('profile-phone').value);
        formData.append('department', document.getElementById('profile-dept').value);
        
        const imageFile = profileImageInput.files[0];
        if (imageFile) {
            formData.append('profileImage', imageFile);
        }

        try {
            showToast('Saving changes...', 'info');
            
            const response = await fetch(`${API_BASE_URL}/users/profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                showToast('Profile updated successfully!', 'success');
                // Update session storage
                sessionStorage.setItem('userName', data.data.user.name);
                if (data.data.user.profileImage) {
                    sessionStorage.setItem('profileImage', data.data.user.profileImage);
                }
                
                // Update UI elements
                updateUIWithUserData(data.data.user);
            } else {
                showToast(data.message || 'Error updating profile', 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('Network error while updating profile', 'danger');
        }
    });

    // Handle password form submission
    const passwordForm = document.getElementById('password-form');
    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const currentPassword = passwordForm.querySelector('[name="currentPassword"]').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            showToast('New passwords do not match!', 'warning');
            return;
        }

        if (newPassword.length < 6) {
            showToast('Password must be at least 6 characters!', 'warning');
            return;
        }

        try {
            showToast('Updating password...', 'info');
            
            const response = await fetch(`${API_BASE_URL}/users/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            const data = await response.json();

            if (response.ok) {
                showToast('Password updated successfully!', 'success');
                passwordForm.reset();
            } else {
                showToast(data.message || 'Error updating password', 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('Network error while updating password', 'danger');
        }
    });
});

async function loadUserProfile() {
    const token = sessionStorage.getItem('token');
    
    try {
        // Fetch latest user data from backend
        // Note: we can use a generic "get my profile" endpoint or reuse getUserById with "me"
        // For now, let's use the ID stored in session if available, or just use validate endpoint
        
        // Let's use the validate endpoint which returns user info
        const response = await fetch(`${API_BASE_URL}/auth/validate`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok && data.data.user) {
            const user = data.data.user;
            updateUIWithUserData(user);
        } else {
            // Fallback to session storage if API fails
            const fallbackUser = {
                name: sessionStorage.getItem('userName'),
                email: sessionStorage.getItem('userEmail'),
                role: sessionStorage.getItem('userRole'),
                profileImage: sessionStorage.getItem('profileImage')
            };
            updateUIWithUserData(fallbackUser);
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

function updateUIWithUserData(user) {
    // Update inputs
    document.getElementById('profile-name').value = user.name || '';
    document.getElementById('profile-email').value = user.email || '';
    document.getElementById('profile-phone').value = user.phone || '';
    document.getElementById('profile-dept').value = user.department || '';
    
    // Update display text
    document.getElementById('display-name').textContent = user.name || 'User';
    document.getElementById('display-email').textContent = user.email || '';
    document.getElementById('display-role').textContent = (user.role || 'user').toUpperCase();
    
    // Update profile image preview
    if (user.profileImage) {
        const imageUrl = user.profileImage.startsWith('http') 
            ? user.profileImage 
            : `${UPLOAD_BASE_URL}${user.profileImage}`;
        document.getElementById('profile-preview-img').src = imageUrl;
        
        // Also update navbar images if present
        document.querySelectorAll('.rounded-circle i.bi-person-fill').forEach(icon => {
            const img = document.createElement('img');
            img.src = imageUrl;
            img.className = 'rounded-circle';
            img.style.width = '40px';
            img.style.height = '40px';
            img.style.objectFit = 'cover';
            icon.parentNode.replaceChild(img, icon);
        });
        
        // Update existing profile images in navbar
        document.querySelectorAll('nav .rounded-circle img').forEach(img => {
            img.src = imageUrl;
        });
    }

    // Update global admin-name elements if they exist
    document.querySelectorAll('.admin-name').forEach(el => {
        el.textContent = user.name;
    });
}

function showToast(message, type = 'info') {
    const toastEl = document.getElementById('liveToast');
    const toastTitle = document.getElementById('toast-title');
    const toastBody = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');

    // Set colors based on type
    toastEl.className = `toast border-0 shadow-lg`;
    if (type === 'danger') toastEl.classList.add('bg-danger', 'text-white');
    else if (type === 'success') toastEl.classList.add('bg-success', 'text-white');
    else if (type === 'warning') toastEl.classList.add('bg-warning', 'text-dark');
    else toastEl.classList.add('bg-primary', 'text-white');

    toastTitle.textContent = type.charAt(0).toUpperCase() + type.slice(1);
    toastBody.textContent = message;

    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}
