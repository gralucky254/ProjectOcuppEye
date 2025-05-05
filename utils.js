// API configuration
const API_BASE_URL = "http://localhost:3000"; // Update if your backend is hosted elsewhere

// Alert system
function showAlert(message, type = "success") {
  const alertContainer = document.getElementById("alertContainer");
  
  const alert = document.createElement("div");
  alert.className = `alert alert-${type}`;
  
  const icon = document.createElement("span");
  icon.innerHTML = type === "success" ? "✓" : "✗";
  
  const text = document.createElement("span");
  text.textContent = message;
  
  alert.appendChild(icon);
  alert.appendChild(text);
  
  alertContainer.appendChild(alert);
  
  // Remove alert after 5 seconds
  setTimeout(() => {
    alert.style.opacity = "0";
    setTimeout(() => alert.remove(), 300);
  }, 5000);
}

// Check authentication status
function checkAuth() {
  const token = localStorage.getItem("token");
  if (!token) {
    if (!window.location.pathname.includes("login.html") && 
        !window.location.pathname.includes("register.html")) {
      window.location.href = "login.html";
    }
  } else if (window.location.pathname.includes("login.html") || 
             window.location.pathname.includes("register.html")) {
    window.location.href = "profile.html";
  }
}

// Initialize auth check on page load
document.addEventListener("DOMContentLoaded", checkAuth);