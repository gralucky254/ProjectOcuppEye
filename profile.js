// DOM Elements
const avatarInput = document.getElementById('avatarInput');
const avatarImage = document.getElementById('avatarImage');
const fullNameInput = document.getElementById('fullName');
const emailInput = document.getElementById('email');
const phoneNumberInput = document.getElementById('phoneNumber');
const updateBtn = document.getElementById('updateBtn');
const logoutBtn = document.getElementById('logoutBtn');
const displayName = document.getElementById('displayName');
const userEmail = document.getElementById('userEmail');

// Fetch user profile data
const fetchUserProfile = async () => {
    try {
        const response = await fetch('/api/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${getCookie('token')}`
            }
        });
        const data = await response.json();

        if (data.success) {
            const user = data.user;
            fullNameInput.value = user.fullName;
            emailInput.value = user.email;
            phoneNumberInput.value = user.phoneNumber || '';
            displayName.textContent = user.fullName;
            userEmail.textContent = user.email;
            
            if (user.avatar) {
                avatarImage.src = user.avatar;
            }
        } else {
            showAlert('Error fetching profile: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Error fetching profile:', error);
        showAlert('Failed to load profile data', 'error');
    }
};

// Update user profile data
const updateUserProfile = async () => {
    const fullName = fullNameInput.value.trim();
    const email = emailInput.value.trim();
    const phoneNumber = phoneNumberInput.value.trim();

    if (!fullName || !email) {
        showAlert('Please fill in all required fields', 'error');
        return;
    }

    const updatedData = { fullName, email, phoneNumber };
    
    try {
        const response = await fetch('/api/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getCookie('token')}`
            },
            body: JSON.stringify(updatedData)
        });
        const data = await response.json();
        
        if (data.success) {
            displayName.textContent = fullName;
            showAlert('Profile updated successfully!', 'success');
        } else {
            showAlert('Error updating profile: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showAlert('Failed to update profile', 'error');
    }
};

// Upload profile avatar
const uploadAvatar = async () => {
    if (!avatarInput.files || !avatarInput.files[0]) return;
    
    const file = avatarInput.files[0];
    if (!file.type.match('image.*')) {
        showAlert('Please select an image file', 'error');
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('avatar', file);

        const response = await fetch('/api/profile/avatar', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getCookie('token')}`
            },
            body: formData
        });
        const data = await response.json();

        if (data.success) {
            avatarImage.src = data.avatarUrl;
            showAlert('Avatar updated successfully!', 'success');
        } else {
            showAlert('Error updating avatar: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Error uploading avatar:', error);
        showAlert('Failed to upload avatar', 'error');
    }
};

// Logout function
const handleLogout = async () => {
    try {
        await fetch('/logout', {
            method: 'GET',
            credentials: 'same-origin'
        });
        window.location.href = '/'; // Redirect to home page
    } catch (error) {
        console.error('Error logging out:', error);
        showAlert('Failed to logout', 'error');
    }
};

// Show alert message
const showAlert = (message, type) => {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.classList.add('hide');
        setTimeout(() => alert.remove(), 500);
    }, 3000);
};

// Utility function to get the value of a cookie by name
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

// Event Listeners
updateBtn.addEventListener('click', updateUserProfile);
avatarInput.addEventListener('change', uploadAvatar);
logoutBtn.addEventListener('click', handleLogout);

// Initialize on page load
document.addEventListener('DOMContentLoaded', fetchUserProfile);