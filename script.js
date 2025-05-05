document.addEventListener("DOMContentLoaded", async function () {
    console.log("Initializing ocuppEYE Dashboard...");

    // Constants
    const API_BASE_URL = "http://localhost:3000";
    const FACE_DETECTION_URL = "http://localhost:5000/detect_faces";

    // DOM Elements
    const elements = {
        // UI Components
        alertsSection: document.querySelector(".alerts-section"),
        sidebar: document.getElementById("sidebar"),
        menuBtn: document.querySelector(".menu-btn"),
        busGrid: document.querySelector(".bus-grid"),
        
        // Sidebar Navigation
        liveMonitoringBtn: document.getElementById("live-monitoring-btn"),
        alertsLogsBtn: document.getElementById("alerts-logs-btn"),
        busTrackingBtn: document.getElementById("bus-tracking-btn"),
        reportsAnalyticsBtn: document.getElementById("reports-analytics-btn"),
        settingsBtn: document.getElementById("settings-btn"),
        adminAccountBtn: document.getElementById("admin-account-btn"),
        adminLogoutBtn: document.getElementById("admin-logout-btn")
    };

    // State Management
    const state = {
        activeCamera: null,
        busData: [
            { id: 1, name: "Bus 1", status: "normal", driver: "Jef", plate: "KDK 424T", capacity: 14 },
            { id: 2, name: "Bus 2", status: "offline", driver: "Jane Smith", plate: "DEF-5678", capacity: 45 },
            { id: 3, name: "Bus 3", status: "offline", driver: "Mike Johnson", plate: "GHI-9012", capacity: 40 },
            { id: 4, name: "Bus 4", status: "offline", driver: "Sarah Williams", plate: "JKL-3456", capacity: 35 }
        ]
    };

    // Initialize Application
    function init() {
        setupEventListeners();
        initializeComponents();
        
        // Check authentication state
        if (localStorage.getItem("userId") && !window.location.pathname.includes("login.html")) {
            loadDashboardContent();
        }
    }

    // Setup all event listeners
    function setupEventListeners() {
        // Sidebar Navigation
        if (elements.menuBtn) elements.menuBtn.addEventListener("click", toggleSidebar);
        if (elements.liveMonitoringBtn) elements.liveMonitoringBtn.addEventListener("click", () => navigateTo("index.html"));
        if (elements.alertsLogsBtn) elements.alertsLogsBtn.addEventListener("click", () => navigateTo("alerts.html"));
        if (elements.busTrackingBtn) elements.busTrackingBtn.addEventListener("click", () => navigateTo("tracking.html"));
        if (elements.reportsAnalyticsBtn) elements.reportsAnalyticsBtn.addEventListener("click", () => navigateTo("reports.html"));
        if (elements.settingsBtn) elements.settingsBtn.addEventListener("click", toggleSettingsDropdown);
        if (elements.adminAccountBtn) elements.adminAccountBtn.addEventListener("click", () => navigateTo("profile.html"));
        if (elements.adminLogoutBtn) elements.adminLogoutBtn.addEventListener("click", handleLogout);
        
        // Profile Picture Upload
        if (elements.uploadForm) elements.uploadForm.addEventListener("submit", handleProfilePictureUpload);
    }

    // Initialize components
    function initializeComponents() {
        if (window.location.pathname.includes("profile.html")) {
            fetchUserDetails();
        }
        
        if (elements.busGrid) {
            renderBusCards();
            initializeCameraForActiveBus();
        }
        
        setupToggleButtons();
    }

    // Load dashboard content based on route
    function loadDashboardContent() {
        const path = window.location.pathname;
        if (path.includes("index.html")) {
            initializeCameraAndFaceDetection();
        } else if (path.includes("alerts.html")) {
            // Initialize alerts functionality
        } else if (path.includes("tracking.html")) {
            // Initialize tracking functionality
        } else if (path.includes("reports.html")) {
            // Initialize reports functionality
        }
    }

    async function handleLogout() {
        try {
            await fetch(`${API_BASE_URL}/logout`, { 
                method: "POST", 
                credentials: "include" 
            });
            localStorage.removeItem("userId");
            showAlert("Logged out successfully.", "success");
            setTimeout(() => navigateTo("login.html"), 1000);
        } catch (error) {
            console.error("Logout Error:", error);
            showAlert("Failed to logout. Please try again.", "error");
        }
    }
    function navigateTo(page) {
        // For profile page, check authentication first
        if (page.includes("profile.html") && !localStorage.getItem("userId")) {
            showAlert("Please login to access your profile", "error");
            window.location.href = "login.html";
            return;
        }
        window.location.href = page;
    }

    // 2. Profile Management
    async function fetchUserDetails() {
        try {
            const userId = localStorage.getItem("userId");
            if (!userId) throw new Error("User not authenticated");
    
            // Remove the Authorization header since we're using cookies
            const response = await fetch(`${API_BASE_URL}/profile/${userId}`, { 
                method: "GET",
                credentials: "include" // This will send cookies
            });
    
            if (response.status === 401) {
                // Handle unauthorized (token expired or invalid)
                localStorage.removeItem("token");
                localStorage.removeItem("userId");
                window.location.href = "/login";
                return;
            }
    
            if (!response.ok) throw new Error("Failed to fetch user details");
            
            const userData = await response.json();
            state.userProfile = userData;
            displayUserDetails(userData);
        } catch (error) {
            console.error("Profile Error:", error);
            showAlert("Failed to load profile details. Please login again.", "error");
            window.location.href = "/login";
        }
    }
    function renderBusCards() {
        elements.busGrid.innerHTML = "";
        
        state.busData.forEach((bus) => {
            const busCard = document.createElement("div");
            busCard.className = `bus-card ${bus.status}`;
            
            busCard.innerHTML = `
                <div class="bus-video">
                    ${bus.status === "offline" ? 
                        '<div class="offline-display"><span>ocuppEYE</span></div>' : 
                        `<video id="bus-${bus.id}-stream" autoplay muted playsinline></video>`
                    }
                </div>
                <div class="bus-info">
                    <div class="bus-header">
                        <div class="bus-title">
                            <span>${bus.name}</span>
                            <span class="status ${bus.status}">${getStatusText(bus.status)}</span>
                        </div>
                        ${bus.status !== "offline" ? 
                            '<button class="details-toggle" aria-label="Toggle Bus Details">' +
                                '<i class="fas fa-chevron-down"></i>' +
                            '</button>' : 
                            ''
                        }
                    </div>
                    ${bus.status !== "offline" ? `
                    <div class="additional-details">
                        <p><strong>Driver:</strong> ${bus.driver}</p>
                        <p><strong>License Plate:</strong> ${bus.plate}</p>
                        <p><strong>Capacity:</strong> ${bus.capacity} passengers</p>
                        <p><strong>Current Route:</strong> Machakos Express</p>
                        <p><strong>Last Update:</strong> ${new Date().toLocaleTimeString()}</p>
                    </div>
                    ` : ''}
                </div>
            `;
            
            elements.busGrid.appendChild(busCard);
        });
    }

    function setupToggleButtons() {
        document.addEventListener("click", function(event) {
            if (event.target.closest(".details-toggle")) {
                const button = event.target.closest(".details-toggle");
                const busCard = button.closest(".bus-card");
                const icon = button.querySelector("i");
                
                busCard.classList.toggle("active");
                icon.classList.toggle("fa-chevron-down");
                icon.classList.toggle("fa-chevron-up");
            }
        });
    }

    function initializeCameraForActiveBus() {
        const activeBus = state.busData.find(bus => bus.status === "normal");
        if (!activeBus) return;

        const videoElement = document.getElementById(`bus-${activeBus.id}-stream`);
        if (videoElement) {
            startCamera(videoElement, activeBus.id);
        }
    }

    async function startCamera(videoElement, busId) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: false 
            });
            
            videoElement.srcObject = stream;
            state.activeCamera = stream;
            
            videoElement.onloadedmetadata = () => {
                videoElement.play();
                setInterval(() => captureAndAnalyzeFrame(videoElement, busId), 2000);
            };
        } catch (error) {
            console.error("Camera Error:", error);
            showAlert("Could not access camera. Please check permissions.", "error");
        }
    }

    
    async function captureAndAnalyzeFrame(videoElement, busId) {
        if (!videoElement.videoWidth) return;

        const canvas = document.createElement("canvas");
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

        try {
            const blob = await new Promise(resolve => 
                canvas.toBlob(resolve, "image/jpeg", 0.8)
            );
            
            await sendFrameToPython(blob, busId);
        } catch (error) {
            console.error("Frame Analysis Error:", error);
        }
    }

// Track failed attempts for retry logic
const failedAttempts = new Map();
async function sendFrameToPython(blob, busId) {
    const formData = new FormData();
    formData.append("video_frame", blob, `bus-${busId}-frame.jpg`);

    // Configuration
    const maxRetries = 3;
    const retryDelay = 2000;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(FACE_DETECTION_URL, {
                method: "POST",
                body: formData,
                signal: controller.signal,
                headers: { 'Accept': 'application/json' }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            failedAttempts.delete(busId); // Reset on success

            updateBusStatus(busId, data.face_count);
            
            if (data.face_count > 1) {
                handleOvercrowding(busId, data.face_count);
            }

            return data;

        } catch (error) {
            attempt++;
            console.error(`Attempt ${attempt} failed for Bus ${busId}:`, error);
            failedAttempts.set(busId, (failedAttempts.get(busId) || 0) + 1);

            if (attempt >= maxRetries) {
                handleFinalFailure(busId);
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }
}

function handleOvercrowding(busId, faceCount) {
    showAlert({
        message: `🚨 Overcrowding detected on Bus #${busId} (${faceCount} faces)!`,
        type: "danger",
        options: {
            addToNotifications: true,
            persistent: true,
            busId: busId,
            faceCount: faceCount
        }
    });
    sendOvercrowdingEmail(busId, faceCount);
    triggerOvercrowdingProtocol(busId, faceCount);
}

function handleFinalFailure(busId) {
    showAlert({
        message: `Face detection service unavailable for Bus #${busId}`,
        type: "warning",
        options: {
            addToNotifications: true,
            persistent: false,
            busId: busId
        }
    });
    
    if (failedAttempts.get(busId) >= 3) {
        updateBusStatus(busId, -1);
    }
}

async function sendOvercrowdingEmail(busId, faceCount) {
    try {
        const response = await fetch("http://localhost:5000/api/overcrowding-alert", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ busId, faceCount })
        });
        return response.ok;
    } catch (error) {
        console.error("Email send failed:", error);
        return false;
    }
}
// Send overcrowding email to backend
async function sendOvercrowdingEmail(busId, faceCount) {
    try {
        const response = await fetch("http://localhost:5000/api/overcrowding-alert", {  // Corrected URL
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                busId,
                faceCount
            })
        });

        if (!response.ok) {
            console.error("Failed to send overcrowding email");
        } else {
            const data = await response.json();
            console.log("Overcrowding email sent successfully", data);
        }
    } catch (error) {
        console.error("Failed to send overcrowding email:", error);
    }
}


function updateBusStatus(busId, faceCount) {
    const busIndex = state.busData.findIndex(bus => bus.id === busId);
    if (busIndex === -1) return;

    let status, statusText;
    
    if (faceCount === -1) {
        // Special case for offline status
        status = "offline";
        statusText = "Offline";
    } else {
        status = faceCount > 1 ? "overcrowded" : "normal";
        statusText = getStatusText(status);
        
        // Add severity level for overcrowding
        if (status === "overcrowded") {
            const severity = faceCount > 10 ? "critical" : 
                            faceCount > 5 ? "high" : "moderate";
            statusText += ` (${severity})`;
        }
    }

    // Update state
    state.busData[busIndex] = {
        ...state.busData[busIndex],
        status,
        lastUpdate: new Date().toISOString(),
        faceCount
    };
    
    // Update UI
    const busCard = document.querySelector(`#bus-${busId}-stream`)?.closest(".bus-card");
    if (busCard) {
        // Update status indicator
        const statusElement = busCard.querySelector(".status");
        if (statusElement) {
            statusElement.textContent = statusText;
            statusElement.className = `status ${status}`;
        }
        
        // Update additional details if shown
        const detailsElement = busCard.querySelector(".additional-details");
        if (detailsElement) {
            const updateElement = detailsElement.querySelector("p:last-child");
            if (updateElement) {
                updateElement.innerHTML = `<strong>Last Update:</strong> ${new Date().toLocaleTimeString()}`;
            }
            
            // Add face count if overcrowded
            if (status === "overcrowded") {
                let faceCountElement = detailsElement.querySelector(".face-count");
                if (!faceCountElement) {
                    faceCountElement = document.createElement("p");
                    faceCountElement.className = "face-count";
                    detailsElement.appendChild(faceCountElement);
                }
                faceCountElement.innerHTML = `<strong>Detected Faces:</strong> ${faceCount}`;
            }
        }
    }
    
    // Trigger any additional UI updates
    updateBusVisualIndicators(busId, status, faceCount);
}

// Helper functions
function triggerOvercrowdingProtocol(busId, faceCount) {
    // Implement additional actions when overcrowding is detected
    console.log(`Overcrowding protocol triggered for Bus ${busId}`);
    // Example: Send notification to admin, log event, etc.
}

function updateBusVisualIndicators(busId, status, faceCount) {
    // Update any visual indicators like badges, colors, etc.
    const busElement = document.querySelector(`#bus-${busId}-stream`);
    if (busElement) {
        // Example: Add/remove warning classes
        busElement.closest(".bus-card").classList.toggle("warning", status === "overcrowded");
    }
}

    // 4. UI Utility Functions
    function toggleSidebar() {
        elements.sidebar.classList.toggle("open");
    }

    function toggleSettingsDropdown() {
        document.getElementById("settings-dropdown-content").classList.toggle("show");
    }

    function navigateTo(page) {
        window.location.href = page;
    }

    function showAlert(message, type = "info") {
        if (!elements.alertsSection) return;
        
        const alert = document.createElement("div");
        alert.className = `alert alert-${type}`;
        alert.innerHTML = `
            <i class="fas ${getAlertIcon(type)}"></i>
            <span>${message}</span>
            <button class="close-alert">&times;</button>
        `;
        
        elements.alertsSection.appendChild(alert);
        
        // Auto-remove after 5 seconds
        setTimeout(() => alert.remove(), 5000);
        
        // Manual close button
        alert.querySelector(".close-alert").addEventListener("click", () => alert.remove());
    }

    function getAlertIcon(type) {
        const icons = {
            success: "fa-check-circle",
            error: "fa-exclamation-circle",
            warning: "fa-exclamation-triangle",
            info: "fa-info-circle",
            danger: "fa-times-circle"
        };
        return icons[type] || "fa-info-circle";
    }

    function getStatusText(status) {
        const statusTexts = {
            normal: "Normal",
            overcrowded: "Overcrowded",
            warning: "Warning",
            offline: "Offline"
        };
        return statusTexts[status] || "Unknown";
    }

    // Initialize the application
    init();
    const comboCtx = document.getElementById('comboChart').getContext('2d');
new Chart(comboCtx, {
  type: 'bar',
  data: {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        label: 'Passengers',
        type: 'line',
        data: [4200, 4500, 4728, 3900],
        borderColor: '#4e73df',
        borderWidth: 3,
        yAxisID: 'y'
      },
      {
        label: 'Overload Incidents',
        data: [12, 15, 17, 9],
        backgroundColor: '#e74a3b80',
        yAxisID: 'y1'
      },
      {
        label: 'Engine Shutdowns',
        data: [2, 4, 3, 1],
        backgroundColor: '#f6c23e80',
        yAxisID: 'y1'
      }
    ]
  },
  options: {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false
    },
    scales: {
      y: {
        type: 'linear',
        position: 'left',
        title: { display: true, text: 'Passenger Count' }
      },
      y1: {
        type: 'linear',
        position: 'right',
        title: { display: true, text: 'Incident Count' },
        grid: { drawOnChartArea: false }
      }
    },
    plugins: {
      annotation: {
        annotations: {
          overloadThreshold: {
            type: 'line',
            yMin: 15,
            yMax: 15,
            borderColor: 'red',
            borderWidth: 2,
            borderDash: [6, 6],
            label: {
              content: 'Overload Threshold',
              enabled: true
            }
          }
        }
      }
    }
  }
});
const penaltyCtx = document.getElementById('penaltyChart').getContext('2d');
new Chart(penaltyCtx, {
  type: 'bar',
  data: {
    labels: ['Bus 25', 'Bus 42', 'Bus 18', 'Bus 33'],
    datasets: [
      {
        label: 'Overload Incidents',
        data: [5, 7, 3, 2],
        backgroundColor: '#e74a3b'
      },
      {
        label: 'Engine Shutdowns',
        data: [1, 2, 0, 0],
        backgroundColor: '#f6c23e'
      },
      {
        label: 'Penalty Cost',
        type: 'line',
        data: [750, 1050, 450, 300],
        borderColor: '#6f42c1',
        borderWidth: 3,
        fill: false,
        yAxisID: 'y1'
      }
    ]
  },
  options: {
    scales: {
      y: { title: { text: 'Incident Count' } },
      y1: {
        position: 'right',
        title: { text: 'Penalty Cost ($)' },
        grid: { drawOnChartArea: false }
      }
    }
  }
});
const style = document.createElement('style');
    style.textContent = `
        @keyframes bell-ring {
            0% { transform: rotate(0deg); }
            25% { transform: rotate(15deg); }
            50% { transform: rotate(-15deg); }
            75% { transform: rotate(10deg); }
            100% { transform: rotate(0deg); }
        }
        .new-notification {
            animation: bell-ring 0.5s ease-in-out;
        }
        .alert.fade-out {
            opacity: 0;
            transition: opacity 0.3s ease-out;
        }
    `;
    document.head.appendChild(style);
});