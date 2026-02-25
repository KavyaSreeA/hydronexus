// Citizen Portal JavaScript - Clean Version

let map;
let userLocation = null;

// Initialize the citizen portal
document.addEventListener('DOMContentLoaded', function() {
    initializeTabs();
    initializeLocationTracking();
    loadAlerts();
    displayDefaultWeather();
    initializeReportForm();
    setupFileUpload();
    checkEmergencyStatus();
    loadEvacuationCenters();
    
    // Initialize socket events for real-time updates
    if (typeof HydroNexus !== 'undefined' && HydroNexus.socket) {
        setupRealtimeUpdates();
    }
    
    // Refresh alerts every 5 minutes
    setInterval(loadAlerts, 300000);
});

// Tab functionality
function initializeTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            contents.forEach(content => {
                content.classList.remove('active');
                content.classList.add('hidden');
            });
            
            const targetContent = document.getElementById(`${targetTab}-tab`);
            if (targetContent) {
                targetContent.classList.add('active');
                targetContent.classList.remove('hidden');
                
                if (targetTab === 'map' && !map) {
                    setTimeout(initializeMap, 100);
                }
            }
        });
    });
}

// Location tracking with graceful fallback
async function initializeLocationTracking() {
    const locationEl = document.getElementById('currentLocation');
    if (!locationEl) return;
    
    try {
        if (typeof HydroNexus !== 'undefined' && HydroNexus.location) {
            const coords = await HydroNexus.location.getCurrentPosition();
            userLocation = coords;
            locationEl.textContent = `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
        } else {
            locationEl.textContent = 'Delhi NCR Region';
        }
    } catch (error) {
        console.warn('Location not available:', error.message);
        locationEl.textContent = 'Delhi NCR Region';
    }
}

// Load alerts from API
async function loadAlerts() {
    try {
        let endpoint = '/api/alerts/active';
        if (userLocation) {
            endpoint += `?lat=${userLocation.latitude}&lng=${userLocation.longitude}`;
        }
        
        const response = await fetch(endpoint).then(r => r.json());
        
        if (response.success) {
            displayAlerts(response.data);
            updateAlertCounters(response.data);
        }
    } catch (error) {
        console.warn('Error loading alerts:', error);
        displayNoAlerts();
    }
}

// Display alerts
function displayAlerts(alerts) {
    const container = document.getElementById('alertsContainer');
    if (!container) return;
    
    if (!alerts || alerts.length === 0) {
        displayNoAlerts();
        return;
    }
    
    container.innerHTML = alerts.map(alert => `
        <div class="alert-item card mb-3 ${alert.severity || 'medium'}">
            <div class="card-body">
                <div class="flex justify-between items-start mb-2">
                    <h5 class="font-semibold">${alert.title || 'Alert'}</h5>
                    <span class="status status-${getSeverityClass(alert.severity)}">
                        ${(alert.severity || 'medium').toUpperCase()}
                    </span>
                </div>
                <p class="text-secondary text-sm mb-2">${alert.message || ''}</p>
                <div class="flex justify-between items-center text-sm text-secondary">
                    <span>📍 ${alert.location?.address || 'Location not specified'}</span>
                    <span>⏰ ${formatTime(alert.timeline?.createdAt || alert.createdAt)}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Display no alerts message
function displayNoAlerts() {
    const container = document.getElementById('alertsContainer');
    if (container) {
        container.innerHTML = `
            <div class="text-center py-8">
                <div class="text-4xl mb-4">✅</div>
                <h4 class="font-semibold mb-2">No Active Alerts</h4>
                <p class="text-secondary">Your area is currently safe from flooding.</p>
            </div>
        `;
    }
}

// Update alert counters
function updateAlertCounters(alerts) {
    const activeCount = alerts ? alerts.length : 0;
    const counterEl = document.getElementById('citizenActiveAlerts');
    if (counterEl) counterEl.textContent = activeCount;
    
    const criticalAlerts = alerts?.filter(a => a.severity === 'critical').length || 0;
    const highAlerts = alerts?.filter(a => a.severity === 'high').length || 0;
    
    const riskElement = document.getElementById('currentRiskLevel');
    if (riskElement) {
        let riskLevel = 'Low';
        let riskClass = 'status-normal';
        
        if (criticalAlerts > 0) {
            riskLevel = 'Critical';
            riskClass = 'status-critical';
        } else if (highAlerts > 0) {
            riskLevel = 'High';
            riskClass = 'status-warning';
        } else if (activeCount > 0) {
            riskLevel = 'Medium';
            riskClass = 'status-warning';
        }
        
        riskElement.className = `status ${riskClass}`;
        const span = riskElement.querySelector('span');
        if (span) span.textContent = riskLevel;
    }
}

// Get severity CSS class
function getSeverityClass(severity) {
    return { low: 'normal', medium: 'warning', high: 'warning', critical: 'critical' }[severity] || 'normal';
}

// Format time helper
function formatTime(date) {
    if (!date) return 'Recently';
    try {
        if (typeof HydroNexus !== 'undefined' && HydroNexus.utils) {
            return HydroNexus.utils.formatRelativeTime(date);
        }
        const d = new Date(date);
        const now = new Date();
        const diff = Math.floor((now - d) / 60000);
        if (diff < 60) return `${diff}m ago`;
        if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
        return d.toLocaleDateString();
    } catch { return 'Recently'; }
}

// Display default weather (no external API)
function displayDefaultWeather() {
    const elements = {
        temperature: document.getElementById('temperature'),
        weatherDescription: document.getElementById('weatherDescription'),
        humidity: document.getElementById('humidity'),
        windSpeed: document.getElementById('windSpeed'),
        rainfall: document.getElementById('rainfall'),
        pressure: document.getElementById('pressure'),
        weatherIcon: document.getElementById('weatherIcon')
    };
    
    if (elements.temperature) elements.temperature.textContent = '28°C';
    if (elements.weatherDescription) elements.weatherDescription.textContent = 'Partly Cloudy';
    if (elements.humidity) elements.humidity.textContent = '65%';
    if (elements.windSpeed) elements.windSpeed.textContent = '12 km/h';
    if (elements.rainfall) elements.rainfall.textContent = '0 mm';
    if (elements.pressure) elements.pressure.textContent = '1013 hPa';
    if (elements.weatherIcon) elements.weatherIcon.textContent = '⛅';
}

// Initialize map
function initializeMap() {
    if (map) return;
    
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;
    
    try {
        const defaultCenter = userLocation ? 
            [userLocation.latitude, userLocation.longitude] : 
            [28.6139, 77.2090];
        
        map = L.map('map').setView(defaultCenter, 12);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        
        if (userLocation) {
            L.marker([userLocation.latitude, userLocation.longitude])
                .addTo(map)
                .bindPopup('Your Location')
                .setIcon(L.divIcon({
                    className: 'user-location-marker',
                    html: '<div style="background: #3b82f6; width: 12px; height: 12px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>',
                    iconSize: [18, 18]
                }));
        }
        
        loadMapData();
    } catch (error) {
        console.error('Map initialization failed:', error);
        mapContainer.innerHTML = '<div class="text-center py-8"><p class="text-secondary">Map could not be loaded</p></div>';
    }
}

// Load map data
async function loadMapData() {
    if (!map) return;
    
    try {
        const nodesResponse = await fetch('/api/drainage').then(r => r.json()).catch(() => ({ success: false }));
        if (nodesResponse.success && nodesResponse.data) {
            const nodes = nodesResponse.data.nodes || nodesResponse.data || [];
            addDrainageNodesToMap(nodes);
        }
        
        const alertsResponse = await fetch('/api/alerts/active').then(r => r.json()).catch(() => ({ success: false }));
        if (alertsResponse.success && alertsResponse.data) {
            addAlertsToMap(alertsResponse.data);
        }
    } catch (error) {
        console.warn('Error loading map data:', error);
    }
}

// Add drainage nodes to map
function addDrainageNodesToMap(nodes) {
    if (!map || !nodes) return;
    
    nodes.forEach(node => {
        if (!node.location?.coordinates?.lat) return;
        
        const status = node.currentStatus?.operationalStatus || 'normal';
        const color = { normal: '#22c55e', warning: '#f59e0b', critical: '#ef4444', offline: '#6b7280' }[status] || '#22c55e';
        
        L.circleMarker([node.location.coordinates.lat, node.location.coordinates.lng], {
            color: 'white', fillColor: color, fillOpacity: 0.8, weight: 2, radius: 8
        }).addTo(map).bindPopup(`
            <div class="p-2">
                <h5 class="font-semibold">${node.name}</h5>
                <p class="text-sm mb-2">${(node.type || '').replace('_', ' ').toUpperCase()}</p>
                <div class="text-xs">
                    <div>Status: <strong>${status}</strong></div>
                    <div>Water Level: ${node.currentStatus?.waterLevel?.current || 0}%</div>
                </div>
            </div>
        `);
    });
}

// Add alerts to map
function addAlertsToMap(alerts) {
    if (!map || !alerts) return;
    
    alerts.forEach(alert => {
        if (!alert.location?.coordinates?.lat) return;
        
        const color = { low: '#22c55e', medium: '#f59e0b', high: '#f59e0b', critical: '#ef4444' }[alert.severity] || '#f59e0b';
        
        L.marker([alert.location.coordinates.lat, alert.location.coordinates.lng])
            .addTo(map)
            .setIcon(L.divIcon({
                className: 'alert-marker',
                html: `<div style="background: ${color}; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white;">!</div>`,
                iconSize: [24, 24]
            }))
            .bindPopup(`<div class="p-2"><h5 class="font-semibold">${alert.title}</h5><p class="text-sm">${alert.message || ''}</p></div>`);
    });
}

// Initialize report form
function initializeReportForm() {
    const form = document.getElementById('reportForm');
    if (!form) return;
    
    form.addEventListener('submit', handleReportSubmit);
    
    const locationBtn = document.getElementById('useCurrentLocation');
    if (locationBtn) {
        locationBtn.addEventListener('click', function() {
            if (userLocation) {
                document.getElementById('reportLatitude').value = userLocation.latitude;
                document.getElementById('reportLongitude').value = userLocation.longitude;
                const addressInput = document.querySelector('input[name="address"]');
                if (addressInput) {
                    addressInput.value = `${userLocation.latitude.toFixed(6)}, ${userLocation.longitude.toFixed(6)}`;
                }
                showNotification('Current location added', 'success');
            } else {
                showNotification('Location not available', 'warning');
            }
        });
    }
}

// Handle report submission
async function handleReportSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn?.textContent || 'Submit';
    
    if (!formData.get('title') || !formData.get('description')) {
        showNotification('Please fill in all required fields', 'warning');
        return;
    }
    
    try {
        if (submitBtn) { submitBtn.textContent = 'Submitting...'; submitBtn.disabled = true; }
        
        const response = await fetch('/api/citizen/reports', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            },
            body: JSON.stringify({
                reportType: formData.get('reportType'),
                severity: formData.get('severity'),
                title: formData.get('title'),
                description: formData.get('description'),
                location: {
                    address: formData.get('address'),
                    coordinates: {
                        lat: parseFloat(formData.get('latitude')) || userLocation?.latitude || 28.6139,
                        lng: parseFloat(formData.get('longitude')) || userLocation?.longitude || 77.2090
                    }
                }
            })
        }).then(r => r.json());
        
        if (response.success) {
            showNotification('Report submitted successfully!', 'success');
            form.reset();
            const counter = document.getElementById('userReports');
            if (counter) counter.textContent = parseInt(counter.textContent || 0) + 1;
            document.querySelector('[data-tab="alerts"]')?.click();
        } else {
            showNotification(response.message || 'Failed to submit', 'danger');
        }
    } catch (error) {
        showNotification('Failed to submit report', 'danger');
    } finally {
        if (submitBtn) { submitBtn.textContent = originalText; submitBtn.disabled = false; }
    }
}

// Notification helper
function showNotification(message, type = 'info') {
    if (typeof HydroNexus !== 'undefined' && HydroNexus.showNotification) {
        HydroNexus.showNotification(message, type);
    } else {
        alert(message);
    }
}

// File upload setup
function setupFileUpload() {
    const uploadArea = document.getElementById('fileUploadArea');
    const fileInput = document.getElementById('fileInput');
    if (!uploadArea || !fileInput) return;
    
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('dragover'); });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
    uploadArea.addEventListener('drop', e => { e.preventDefault(); uploadArea.classList.remove('dragover'); handleFiles(e.dataTransfer.files); });
    fileInput.addEventListener('change', e => handleFiles(e.target.files));
}

// Handle files
function handleFiles(files) {
    const preview = document.getElementById('filePreview');
    if (!preview) return;
    preview.innerHTML = '';
    if (files.length > 0) {
        preview.classList.remove('hidden');
        Array.from(files).forEach(file => {
            const div = document.createElement('div');
            div.className = 'inline-block mr-2 mb-2 p-2 bg-gray-100 rounded text-sm';
            div.textContent = `📎 ${file.name}`;
            preview.appendChild(div);
        });
    }
}

// Check emergency status
function checkEmergencyStatus() {
    fetch('/api/alerts/active').then(r => r.json()).then(response => {
        if (response.success && response.data) {
            const critical = response.data.filter(a => a.severity === 'critical');
            const banner = document.getElementById('emergencyBanner');
            if (banner && critical.length > 0) banner.classList.remove('hidden');
        }
    }).catch(() => {});
}

// Setup realtime updates
function setupRealtimeUpdates() {
    if (typeof HydroNexus === 'undefined' || !HydroNexus.socket) return;
    HydroNexus.socket.on('new-alert', () => loadAlerts());
    HydroNexus.socket.on('broadcast', data => showNotification(data.message, data.type || 'info'));
}

// Load evacuation centers
function loadEvacuationCenters() {
    const container = document.getElementById('evacuationCenters');
    if (!container) return;
    
    const centers = [
        { name: 'Central Community Hall', address: 'Main Street, Central Delhi', capacity: 500, status: 'Open' },
        { name: 'Sports Complex', address: 'Ring Road, South Delhi', capacity: 1000, status: 'Open' },
        { name: 'Government School', address: 'Park Avenue, East Delhi', capacity: 300, status: 'Standby' }
    ];
    
    container.innerHTML = centers.map(c => `
        <div class="card"><div class="card-body">
            <h5 class="font-semibold">${c.name}</h5>
            <p class="text-sm text-secondary mb-2">${c.address}</p>
            <div class="flex justify-between text-sm">
                <span>Capacity: ${c.capacity}</span>
                <span class="status ${c.status === 'Open' ? 'status-normal' : 'status-warning'}">${c.status}</span>
            </div>
        </div></div>
    `).join('');
}

// Floating action buttons
function quickReport() { document.querySelector('[data-tab="report"]')?.click(); }
function callEmergency() { if (confirm('Call Emergency Services (911)?')) window.location.href = 'tel:911'; }
function resetForm() {
    document.getElementById('reportForm')?.reset();
    const preview = document.getElementById('filePreview');
    if (preview) { preview.innerHTML = ''; preview.classList.add('hidden'); }
}
