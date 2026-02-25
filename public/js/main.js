// HydroNexus - Main JavaScript Module

// Global utilities and configuration
const HydroNexus = {
    apiBase: '/api',
    socket: null,
    currentUser: null,
    config: {
        refreshInterval: 30000,
        mapDefaultCenter: { lat: 28.6139, lng: 77.2090 },
        mapDefaultZoom: 12
    }
};

// Initialize Socket.IO connection
HydroNexus.initSocket = function() {
    if (typeof io !== 'undefined') {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Connected to HydroNexus server');
            this.handleSocketEvents();
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from HydroNexus server');
            this.showNotification('Connection lost. Attempting to reconnect...', 'warning');
        });

        this.socket.on('reconnect', () => {
            console.log('Reconnected to HydroNexus server');
            this.showNotification('Connection restored', 'success');
        });
    }
};

// Handle Socket.IO events
HydroNexus.handleSocketEvents = function() {
    // Real-time alert updates
    this.socket.on('new-alert', (alert) => {
        this.handleNewAlert(alert);
    });

    // Drainage data updates
    this.socket.on('drainage-update', (data) => {
        this.handleDrainageUpdate(data);
    });

    // System notifications
    this.socket.on('system-notification', (notification) => {
        this.showNotification(notification.message, notification.type);
    });
};

// API request wrapper
HydroNexus.api = {
    async request(endpoint, options = {}) {
        const url = `${HydroNexus.apiBase}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Add auth token if available
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Request failed:', error);
            HydroNexus.showNotification(error.message, 'danger');
            throw error;
        }
    },

    async get(endpoint) {
        return this.request(endpoint);
    },

    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    }
};

// Toast notification system (modern)
HydroNexus.showNotification = function(message, type = 'info', duration = 5000) {
    // Ensure toast container exists
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        container.id = 'toastContainer';
        document.body.appendChild(container);
    }

    const iconMap = {
        success: '✓', danger: '✕', warning: '⚠', info: 'ℹ', error: '✕'
    };
    const titleMap = {
        success: 'Success', danger: 'Error', warning: 'Warning', info: 'Info', error: 'Error'
    };
    const mappedType = type === 'error' ? 'danger' : type;

    const toast = document.createElement('div');
    toast.className = `toast toast-${mappedType}`;
    toast.innerHTML = `
        <div class="toast-icon">${iconMap[type] || 'ℹ'}</div>
        <div class="toast-body">
            <div class="toast-title">${titleMap[type] || 'Notification'}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" aria-label="Close">&times;</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => removeToast(toast));
    container.appendChild(toast);

    // Limit toasts to 5
    const toasts = container.querySelectorAll('.toast:not(.removing)');
    if (toasts.length > 5) removeToast(toasts[0]);

    // Auto remove
    if (duration > 0) {
        setTimeout(() => removeToast(toast), duration);
    }

    function removeToast(el) {
        if (!el || el.classList.contains('removing')) return;
        el.classList.add('removing');
        setTimeout(() => el.remove(), 300);
    }

    return toast;
};

// Handle new alerts
HydroNexus.handleNewAlert = function(alert) {
    const message = `New ${alert.severity} alert: ${alert.title}`;
    const type = alert.severity === 'critical' ? 'danger' : 'warning';
    this.showNotification(message, type, 10000);

    // Update alert counters if elements exist
    const alertCounter = document.getElementById('activeAlerts');
    if (alertCounter) {
        const current = parseInt(alertCounter.textContent) || 0;
        alertCounter.textContent = current + 1;
    }

    // Trigger any page-specific alert handlers
    if (typeof window.onNewAlert === 'function') {
        window.onNewAlert(alert);
    }
};

// Handle drainage updates
HydroNexus.handleDrainageUpdate = function(data) {
    // Update any drainage displays on the page
    if (typeof window.onDrainageUpdate === 'function') {
        window.onDrainageUpdate(data);
    }

    // Check for threshold breaches
    if (data.waterLevel > 85 || data.blockageLevel > 50) {
        const message = `${data.nodeName}: ${data.waterLevel > 85 ? 'Critical water level' : 'High blockage level'}`;
        this.showNotification(message, 'warning');
    }
};

// Format utilities
HydroNexus.utils = {
    formatDate(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return new Date(date).toLocaleDateString('en-US', { ...defaultOptions, ...options });
    },

    formatRelativeTime(date) {
        const now = new Date();
        const diff = now - new Date(date);
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    },

    formatNumber(num, decimals = 1) {
        return Number(num).toFixed(decimals);
    },

    getStatusClass(status) {
        const statusMap = {
            'normal': 'status-normal',
            'warning': 'status-warning',
            'critical': 'status-critical',
            'offline': 'status-offline'
        };
        return statusMap[status] || 'status-normal';
    }
};

// Location utilities
HydroNexus.location = {
    async getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                position => resolve(position.coords),
                error => reject(error),
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
            );
        });
    },

    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
};

// Form utilities
HydroNexus.forms = {
    serialize(form) {
        const formData = new FormData(form);
        const data = {};
        for (let [key, value] of formData.entries()) {
            if (data[key]) {
                if (!Array.isArray(data[key])) {
                    data[key] = [data[key]];
                }
                data[key].push(value);
            } else {
                data[key] = value;
            }
        }
        return data;
    },

    validate(form, rules) {
        const data = this.serialize(form);
        const errors = {};

        for (let field in rules) {
            const value = data[field];
            const rule = rules[field];

            if (rule.required && (!value || value.trim() === '')) {
                errors[field] = `${field} is required`;
                continue;
            }

            if (value && rule.minLength && value.length < rule.minLength) {
                errors[field] = `${field} must be at least ${rule.minLength} characters`;
            }

            if (value && rule.maxLength && value.length > rule.maxLength) {
                errors[field] = `${field} must be no more than ${rule.maxLength} characters`;
            }

            if (value && rule.pattern && !rule.pattern.test(value)) {
                errors[field] = rule.message || `${field} format is invalid`;
            }
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    },

    showErrors(form, errors) {
        // Clear previous errors
        form.querySelectorAll('.error-message').forEach(el => el.remove());
        form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));

        // Show new errors
        for (let field in errors) {
            const input = form.querySelector(`[name="${field}"]`);
            if (input) {
                input.classList.add('error');
                const errorMsg = document.createElement('div');
                errorMsg.className = 'error-message text-danger text-sm mt-1';
                errorMsg.textContent = errors[field];
                input.parentNode.appendChild(errorMsg);
            }
        }
    }
};

// Authentication utilities
HydroNexus.auth = {
    async login(email, password) {
        try {
            const response = await HydroNexus.api.post('/auth/login', { email, password });
            if (response.success) {
                localStorage.setItem('token', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));
                HydroNexus.currentUser = response.user;
                return response;
            }
        } catch (error) {
            throw error;
        }
    },

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        HydroNexus.currentUser = null;
        window.location.href = '/login';
    },

    getCurrentUser() {
        if (!HydroNexus.currentUser) {
            const userData = localStorage.getItem('user');
            if (userData) {
                HydroNexus.currentUser = JSON.parse(userData);
            }
        }
        return HydroNexus.currentUser;
    },

    isAuthenticated() {
        return !!localStorage.getItem('token');
    },

    hasRole(role) {
        const user = this.getCurrentUser();
        return user && user.role === role;
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize socket connection
    HydroNexus.initSocket();
    
    // Check authentication status
    const user = HydroNexus.auth.getCurrentUser();
    if (user) {
        console.log('User authenticated:', user.username);
    }

    // Add CSS animations if not present
    if (!document.querySelector('#hydronexus-animations')) {
        const style = document.createElement('style');
        style.id = 'hydronexus-animations';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
            .error {
                border-color: var(--accent-red) !important;
            }
        `;
        document.head.appendChild(style);
    }
});

// Export for use in other scripts
window.HydroNexus = HydroNexus;