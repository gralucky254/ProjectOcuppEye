const API_BASE_URL = window.location.origin;

// Unified alert system
function showAlert(message, type = "success") {
  const alertContainer = document.getElementById('alertContainer') || document.body;
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  alertContainer.appendChild(alert);
  
  setTimeout(() => alert.remove(), 5000);
}

// Login handler
async function handleLogin(event) {
  event.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
      credentials: "include"
    });

    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("token", data.token);
      showAlert("Login successful!", "success");
      window.location.href = "profile.html";
    } else {
      showAlert(data.message || "Login failed", "error");
    }
  } catch (error) {
    console.error("Login error:", error);
    showAlert("Failed to connect to server", "error");
  }
}

// Registration handler
async function handleRegister(event) {
  event.preventDefault();
  const formData = {
    username: document.getElementById("username").value.trim(),
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value.trim(),
    fullName: document.getElementById("fullName").value.trim(),
    phoneNumber: document.getElementById("phoneNumber").value.trim() || undefined
  };

  try {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
      credentials: "include"
    });

    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("token", data.token);
      showAlert("Registration successful!", "success");
      window.location.href = "profile.html";
    } else {
      if (data.errors) {
        data.errors.forEach(err => showAlert(err.msg, "error"));
      } else {
        showAlert(data.message || "Registration failed", "error");
      }
    }
  } catch (error) {
    console.error("Registration error:", error);
    showAlert("Failed to connect to server", "error");
  }
}

// Handle Google OAuth redirect
function handleGoogleRedirect() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  
  if (token) {
    localStorage.setItem('token', token);
    window.history.replaceState({}, document.title, window.location.pathname);
    
    // Fetch user profile
    fetch(`${API_BASE_URL}/profile`, {
      credentials: "include",
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
    });
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  // Check for Google OAuth redirect
  if (window.location.pathname.includes('profile.html')) {
    handleGoogleRedirect();
  }
  
  // Attach form handlers
  document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
  document.getElementById('registerForm')?.addEventListener('submit', handleRegister);
});