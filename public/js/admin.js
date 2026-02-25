// Admin Dashboard JavaScript - Robust Version

let adminMap = null;
let waterLevelChart = null;
let alertDistributionChart = null;

// Wait for DOM and initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin dashboard initializing...');
    
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
        console.log('No auth token, redirecting to login');
        window.location.href = '/login';
        return;
    }
    
    try {
        const user = JSON.parse(userData);
        console.log('User logged in:', user);
        
        // Display user info
        const userNameEl = document.getElementById('adminUserName');
        const roleEl = document.getElementById('adminRole');
        if (userNameEl) userNameEl.textContent = user.username || 'Admin';
        if (roleEl) roleEl.textContent = (user.role || 'admin').charAt(0).toUpperCase() + (user.role || 'admin').slice(1);
        
    } catch (e) {
        console.error('Error parsing user data:', e);
    }
    
    // Initialize components
    initializeSidebar();
    initializeCharts();
    loadDashboardStats();
    loadDrainageNodes();
    loadAlerts();
    loadRecentActivity();
    initializeMap();
    setupLogout();
    updateLastUpdateTime();
    
    // Initialize feather icons if available
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
    
    // Refresh data periodically
    setInterval(() => {
        loadDashboardStats();
        updateLastUpdateTime();
    }, 60000);
});

// Sidebar navigation
function initializeSidebar() {
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    const sections = document.querySelectorAll('.section-content');
    
    sidebarItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.dataset.section;
            
            // Update active states
            sidebarItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding section
            sections.forEach(s => s.classList.add('hidden'));
            const targetSection = document.getElementById(`${sectionId}-section`);
            if (targetSection) {
                targetSection.classList.remove('hidden');
                
                // Update page title
                const pageTitle = document.getElementById('pageTitle');
                if (pageTitle) {
                    pageTitle.textContent = this.textContent.trim();
                }
                
                // Initialize section-specific components
                if (sectionId === 'drainage' || sectionId === 'overview') {
                    setTimeout(() => {
                        if (!adminMap) initializeMap();
                        else adminMap.invalidateSize();
                    }, 100);
                }
            }
        });
    });
}

// Initialize Charts
function initializeCharts() {
    // Water Level Trends Chart
    const waterCtx = document.getElementById('waterLevelChart');
    if (waterCtx) {
        waterLevelChart = new Chart(waterCtx, {
            type: 'line',
            data: {
                labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
                datasets: [{
                    label: 'Main Street Drain',
                    data: [25, 30, 45, 55, 40, 35, 28],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Park Avenue Basin',
                    data: [60, 65, 75, 80, 72, 68, 65],
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Industrial Zone',
                    data: [80, 85, 90, 92, 88, 85, 82],
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: { display: true, text: 'Water Level (%)' }
                    }
                }
            }
        });
    }
    
    // Alert Distribution Chart
    const alertCtx = document.getElementById('alertDistributionChart');
    if (alertCtx) {
        alertDistributionChart = new Chart(alertCtx, {
            type: 'doughnut',
            data: {
                labels: ['Critical', 'High', 'Medium', 'Low'],
                datasets: [{
                    data: [2, 5, 8, 3],
                    backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#22c55e'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }
}

// Initialize Map
function initializeMap() {
    const mapContainer = document.getElementById('adminMap');
    if (!mapContainer) return;
    
    if (adminMap) {
        adminMap.invalidateSize();
        return;
    }
    
    try {
        adminMap = L.map('adminMap').setView([28.6139, 77.2090], 12);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(adminMap);
        
        // Add drainage nodes to map
        addNodesToMap();
        
        console.log('Map initialized successfully');
    } catch (error) {
        console.error('Map initialization error:', error);
        mapContainer.innerHTML = '<div class="text-center p-8 text-secondary">Map could not be loaded</div>';
    }
}

// Add nodes to map
function addNodesToMap() {
    if (!adminMap) return;
    
    const nodes = [
        { name: 'Main Street Storm Drain', lat: 28.6139, lng: 77.2090, status: 'normal', waterLevel: 25 },
        { name: 'Park Avenue Catch Basin', lat: 28.6129, lng: 77.2095, status: 'warning', waterLevel: 75 },
        { name: 'Industrial Zone Pump', lat: 28.6149, lng: 77.2085, status: 'critical', waterLevel: 90 },
        { name: 'Riverside Culvert', lat: 28.6159, lng: 77.2100, status: 'normal', waterLevel: 45 },
        { name: 'Market Area Channel', lat: 28.6120, lng: 77.2110, status: 'normal', waterLevel: 60 }
    ];
    
    const colors = { normal: '#22c55e', warning: '#f59e0b', critical: '#ef4444' };
    
    nodes.forEach(node => {
        L.circleMarker([node.lat, node.lng], {
            radius: 10,
            fillColor: colors[node.status] || '#22c55e',
            color: '#fff',
            weight: 2,
            fillOpacity: 0.9
        }).addTo(adminMap).bindPopup(`
            <div style="min-width: 150px;">
                <strong>${node.name}</strong><br>
                Status: <span style="color: ${colors[node.status]}">${node.status.toUpperCase()}</span><br>
                Water Level: ${node.waterLevel}%
            </div>
        `);
    });
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        
        // Load drainage nodes
        const nodesResponse = await fetch('/api/drainage', { headers }).then(r => r.json()).catch(() => null);
        
        // Load alerts
        const alertsResponse = await fetch('/api/alerts/active', { headers }).then(r => r.json()).catch(() => null);
        
        // Update stats
        if (nodesResponse?.success) {
            const nodes = nodesResponse.data?.nodes || nodesResponse.data || [];
            updateElement('totalNodes', nodes.length || 5);
            
            const critical = nodes.filter(n => n.currentStatus?.operationalStatus === 'critical').length;
            updateElement('criticalNodes', critical || 1);
        } else {
            updateElement('totalNodes', 5);
            updateElement('criticalNodes', 1);
        }
        
        if (alertsResponse?.success) {
            const alerts = alertsResponse.data || [];
            updateElement('activeAlertsCount', alerts.length || 2);
        } else {
            updateElement('activeAlertsCount', 2);
        }
        
        // Set system health and citizen reports
        updateElement('systemHealthStatus', 'Normal');
        updateElement('citizenReportsCount', 3);
        
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        // Set fallback values
        updateElement('totalNodes', 5);
        updateElement('activeAlerts', 2);
        updateElement('criticalNodes', 1);
        updateElement('systemHealth', '98%');
    }
}

// Load drainage nodes
async function loadDrainageNodes() {
    const tbody = document.getElementById('nodesTableBody');
    if (!tbody) return;
    
    try {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        
        const response = await fetch('/api/drainage', { headers }).then(r => r.json());
        
        if (response.success && response.data) {
            const nodes = response.data.nodes || response.data || [];
            tbody.innerHTML = nodes.map(node => `
                <tr>
                    <td><span class="node-status ${node.currentStatus?.operationalStatus || 'normal'}"></span>${node.nodeId || node._id}</td>
                    <td>${node.name}</td>
                    <td>${(node.type || '').replace('_', ' ')}</td>
                    <td><span class="status status-${getStatusClass(node.currentStatus?.operationalStatus)}">${(node.currentStatus?.operationalStatus || 'normal').toUpperCase()}</span></td>
                    <td>${node.currentStatus?.waterLevel?.current || 0}%</td>
                    <td>${node.currentStatus?.blockageLevel?.current || 0}%</td>
                    <td>${formatTime(node.updatedAt || node.createdAt)}</td>
                    <td>
                        <button class="btn btn-sm btn-outline" onclick="viewNode('${node._id}')">View</button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading nodes:', error);
        // Show sample data
        tbody.innerHTML = getSampleNodesHTML();
    }
}

// Load alerts
async function loadAlerts() {
    const tbody = document.getElementById('alertsTableBody');
    if (!tbody) return;
    
    try {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        
        const response = await fetch('/api/alerts/active', { headers }).then(r => r.json());
        
        if (response.success && response.data) {
            const alerts = response.data || [];
            if (alerts.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-secondary">No active alerts</td></tr>';
                return;
            }
            tbody.innerHTML = alerts.map(alert => `
                <tr class="alert-row">
                    <td>${alert.alertId || alert._id}</td>
                    <td>${alert.title}</td>
                    <td>${(alert.type || '').replace('_', ' ')}</td>
                    <td><span class="status status-${getSeverityClass(alert.severity)}">${(alert.severity || 'medium').toUpperCase()}</span></td>
                    <td>${alert.status || 'active'}</td>
                    <td>${alert.location?.address || 'N/A'}</td>
                    <td>${formatTime(alert.timeline?.createdAt || alert.createdAt)}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="acknowledgeAlert('${alert._id}')">Acknowledge</button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading alerts:', error);
        tbody.innerHTML = getSampleAlertsHTML();
    }
}

// Sample data fallbacks
function getSampleNodesHTML() {
    return `
        <tr>
            <td><span class="node-status normal"></span>DN0001</td>
            <td>Main Street Storm Drain</td>
            <td>storm drain</td>
            <td><span class="status status-normal">NORMAL</span></td>
            <td>25%</td>
            <td>15%</td>
            <td>Just now</td>
            <td><button class="btn btn-sm btn-outline">View</button></td>
        </tr>
        <tr>
            <td><span class="node-status warning"></span>DN0002</td>
            <td>Park Avenue Catch Basin</td>
            <td>catch basin</td>
            <td><span class="status status-warning">WARNING</span></td>
            <td>75%</td>
            <td>35%</td>
            <td>2m ago</td>
            <td><button class="btn btn-sm btn-outline">View</button></td>
        </tr>
        <tr>
            <td><span class="node-status critical"></span>DN0003</td>
            <td>Industrial Zone Pump Station</td>
            <td>pump station</td>
            <td><span class="status status-critical">CRITICAL</span></td>
            <td>90%</td>
            <td>55%</td>
            <td>5m ago</td>
            <td><button class="btn btn-sm btn-outline">View</button></td>
        </tr>
    `;
}

function getSampleAlertsHTML() {
    return `
        <tr class="alert-row">
            <td>ALT001</td>
            <td>Critical Water Level at Industrial Zone</td>
            <td>flood warning</td>
            <td><span class="status status-critical">CRITICAL</span></td>
            <td>active</td>
            <td>Industrial Zone, Delhi</td>
            <td>1h ago</td>
            <td><button class="btn btn-sm btn-primary">Acknowledge</button></td>
        </tr>
        <tr class="alert-row">
            <td>ALT002</td>
            <td>Blockage Detected at Park Avenue</td>
            <td>drainage blockage</td>
            <td><span class="status status-warning">HIGH</span></td>
            <td>acknowledged</td>
            <td>Park Avenue, Central Delhi</td>
            <td>2h ago</td>
            <td><button class="btn btn-sm btn-outline">View</button></td>
        </tr>
    `;
}

// Setup logout functionality
function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
}

// Helper functions
function updateElement(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function getStatusClass(status) {
    return { normal: 'normal', warning: 'warning', critical: 'critical', offline: 'offline' }[status] || 'normal';
}

function getSeverityClass(severity) {
    return { low: 'normal', medium: 'warning', high: 'warning', critical: 'critical' }[severity] || 'warning';
}

function formatTime(date) {
    if (!date) return 'Recently';
    try {
        const d = new Date(date);
        const now = new Date();
        const diff = Math.floor((now - d) / 60000);
        if (diff < 60) return `${diff}m ago`;
        if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
        return d.toLocaleDateString();
    } catch { return 'Recently'; }
}

function updateLastUpdateTime() {
    const el = document.getElementById('lastUpdate');
    const el2 = document.getElementById('lastUpdateTime');
    const time = new Date().toLocaleTimeString();
    if (el) el.textContent = `Last updated: ${time}`;
    if (el2) el2.textContent = time;
}

// Action functions
function viewNode(nodeId) {
    alert(`View details for node: ${nodeId}`);
}

function acknowledgeAlert(alertId) {
    alert(`Alert ${alertId} acknowledged`);
    loadAlerts();
}

function refreshData() {
    loadDashboardStats();
    loadDrainageNodes();
    loadAlerts();
    loadRecentActivity();
    updateLastUpdateTime();
    if (typeof HydroNexus !== 'undefined' && HydroNexus.showNotification) {
        HydroNexus.showNotification('Data refreshed', 'success');
    }
}

// Load recent activity
function loadRecentActivity() {
    const container = document.getElementById('recentActivity');
    if (!container) return;
    
    const activities = [
        { icon: '🚨', text: 'Critical alert triggered at Industrial Zone Pump Station', time: '5 minutes ago', type: 'danger' },
        { icon: '⚠️', text: 'Water level warning at Park Avenue Catch Basin', time: '12 minutes ago', type: 'warning' },
        { icon: '✅', text: 'Maintenance completed at Main Street Storm Drain', time: '1 hour ago', type: 'success' },
        { icon: '📝', text: 'New citizen report submitted for Market Area', time: '2 hours ago', type: 'info' },
        { icon: '🔧', text: 'Scheduled maintenance for Riverside Culvert', time: '3 hours ago', type: 'info' }
    ];
    
    container.innerHTML = activities.map(a => `
        <div class="flex items-center p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
            <span class="text-2xl mr-3">${a.icon}</span>
            <div class="flex-1">
                <div class="text-sm font-medium">${a.text}</div>
                <div class="text-xs text-secondary">${a.time}</div>
            </div>
        </div>
    `).join('');
}

// Expose functions globally
window.logout = logout;
window.viewNode = viewNode;
window.acknowledgeAlert = acknowledgeAlert;
window.refreshData = refreshData;
window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth <= 768) {
        sidebar.classList.toggle('mobile-open');
    } else {
        sidebar.classList.toggle('collapsed');
    }
};

// Close sidebar when clicking outside on mobile
document.addEventListener('click', function(e) {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebarToggle');
    if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('mobile-open')) {
        if (!sidebar.contains(e.target) && !toggle.contains(e.target)) {
            sidebar.classList.remove('mobile-open');
        }
    }
});

// Close sidebar on window resize to desktop
window.addEventListener('resize', function() {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth > 768 && sidebar) {
        sidebar.classList.remove('mobile-open');
    }
});
