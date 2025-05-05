document.addEventListener("DOMContentLoaded", async function () {
    console.log("Initializing ocuppEYE Analytics Dashboard...");

    // API Configuration
    const API_BASE_URL = "http://localhost:5000"; // Your Flask backend
    const ANALYTICS_ENDPOINT = "/api/analytics/overcrowding";

    // DOM Elements
    const elements = {
        totalIncidents: document.getElementById("total-incidents"),
        avgExcess: document.getElementById("avg-excess"),
        totalPenalties: document.getElementById("total-penalties"),
        dailyTrendsChart: document.getElementById("dailyTrendsChart"),
        busViolationsChart: document.getElementById("busViolationsChart"),
        incidentsTable: document.querySelector("#incidents-table tbody"),
        timePeriod: document.getElementById("time-period")
    };

    // Initialize the dashboard
    async function initDashboard() {
        try {
            // Load data for default time period (30 days)
            await loadAnalyticsData(30);
            
            // Set up event listeners
            elements.timePeriod.addEventListener("change", async () => {
                const days = parseInt(elements.timePeriod.value);
                await loadAnalyticsData(days);
            });
            
            // Set up export button
            document.getElementById("export-btn").addEventListener("click", exportData);
            
        } catch (error) {
            console.error("Dashboard initialization failed:", error);
            showAlert("Failed to initialize dashboard. Please try again.", "error");
        }
    }

    // Main function to load analytics data
    async function loadAnalyticsData(days) {
        try {
            showLoadingState(true);
            
            const response = await fetch(`${API_BASE_URL}${ANALYTICS_ENDPOINT}?days=${days}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Update the UI with the fetched data
            updateOverviewCards(data.summary);
            updateCharts(data.trends, data.violations);
            updateIncidentsTable(data.recentIncidents);
            
        } catch (error) {
            console.error("Error loading analytics data:", error);
            showAlert("Failed to load analytics data. Please try again.", "error");
        } finally {
            showLoadingState(false);
        }
    }

    // Update the overview cards
    function updateOverviewCards(summary) {
        elements.totalIncidents.textContent = summary.totalIncidents;
        elements.avgExcess.textContent = summary.avgExcess.toFixed(1);
        elements.totalPenalties.textContent = `Ksh${summary.totalPenalties.toLocaleString()}`;
        
        // Update trend indicators
        document.querySelector(".card-change.up").textContent = 
            `↑ ${summary.incidentChange}% from last period`;
        document.querySelector(".card-change.down").textContent = 
            `↓ ${summary.excessChange} from last period`;
    }

    // Initialize and update charts
    function updateCharts(trendsData, violationsData) {
        // Daily Trends Chart (Combo chart)
        new Chart(elements.dailyTrendsChart, {
            type: 'bar',
            data: {
                labels: trendsData.dates,
                datasets: [
                    {
                        label: 'Overload Incidents',
                        data: trendsData.incidents,
                        backgroundColor: '#ff6b6b',
                        borderColor: '#ff6b6b',
                        borderWidth: 1
                    },
                    {
                        label: 'Excess Passengers',
                        data: trendsData.excessPassengers,
                        type: 'line',
                        borderColor: '#4ecdc4',
                        borderWidth: 2,
                        tension: 0.1,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Incidents Count'
                        }
                    },
                    y1: {
                        beginAtZero: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Excess Passengers'
                        },
                        grid: {
                            drawOnChartArea: false,
                        }
                    }
                }
            }
        });

        // Bus Violations Chart (Doughnut)
        new Chart(elements.busViolationsChart, {
            type: 'doughnut',
            data: {
                labels: violationsData.buses,
                datasets: [{
                    data: violationsData.counts,
                    backgroundColor: [
                        '#4361ee',
                        '#3a0ca3',
                        '#4895ef',
                        '#4cc9f0',
                        '#f72585'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.raw} incidents`;
                            }
                        }
                    },
                    datalabels: {
                        formatter: (value) => value,
                        color: '#fff',
                        font: {
                            weight: 'bold'
                        }
                    }
                }
            },
            plugins: [ChartDataLabels]
        });
    }

    // Update incidents table
    function updateIncidentsTable(incidents) {
        elements.incidentsTable.innerHTML = '';
        
        incidents.forEach(incident => {
            const row = document.createElement('tr');
            
            // Highlight overcrowded incidents
            if (incident.excess > 5) {
                row.classList.add('overcrowded-incident');
            }
            
            row.innerHTML = `
                <td>${new Date(incident.timestamp).toLocaleString()}</td>
                <td>${incident.busId}</td>
                <td>${incident.capacity}</td>
                <td>${incident.detected}</td>
                <td class="${incident.excess > 0 ? 'excess-highlight' : ''}">+${incident.excess}</td>
                <td>Ksh${incident.penalty.toLocaleString()}</td>
            `;
            
            elements.incidentsTable.appendChild(row);
        });
    }

    // Export data function
    async function exportData() {
        try {
            const days = parseInt(elements.timePeriod.value);
            const response = await fetch(`${API_BASE_URL}${ANALYTICS_ENDPOINT}/export?days=${days}`);
            
            if (!response.ok) {
                throw new Error('Export failed');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `overcrowding-report-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
        } catch (error) {
            console.error('Export error:', error);
            showAlert('Failed to export data', 'error');
        }
    }

    // Utility functions
    function showLoadingState(show) {
        const loadingElement = document.getElementById('loading-overlay');
        if (loadingElement) {
            loadingElement.style.display = show ? 'flex' : 'none';
        }
    }

    function showAlert(message, type) {
        // Your existing alert implementation
        const alertElement = document.createElement('div');
        alertElement.className = `alert alert-${type}`;
        alertElement.innerHTML = `
            <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}"></i>
            <span>${message}</span>
            <button class="close-alert">&times;</button>
        `;
        
        document.body.appendChild(alertElement);
        setTimeout(() => alertElement.remove(), 5000);
    }

    // Initialize the dashboard
    initDashboard();
});