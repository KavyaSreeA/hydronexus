const { db } = require('../utils/database');

// Generate alert ID
const generateAlertId = () => {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  return `ALT${date}${String(db.alerts.length + 1).padStart(4, '0')}`;
};

// Get all alerts
exports.getAllAlerts = async (req, res) => {
  let alerts = [...db.alerts];
  const { status, severity, type } = req.query;
  
  if (status) alerts = alerts.filter(a => a.status === status);
  if (severity) alerts = alerts.filter(a => a.severity === severity);
  if (type) alerts = alerts.filter(a => a.type === type);
  
  alerts.sort((a, b) => new Date(b.timeline?.createdAt) - new Date(a.timeline?.createdAt));
  res.json({ success: true, data: { alerts, pagination: { current: 1, pages: 1, total: alerts.length } } });
};

// Get active alerts
exports.getActiveAlerts = async (req, res) => {
  const alerts = db.alerts.filter(a => ['active', 'acknowledged', 'investigating'].includes(a.status));
  res.json({ success: true, data: { alerts, count: alerts.length } });
};

// Get alert by ID
exports.getAlertById = async (req, res) => {
  const alert = db.alerts.find(a => a.alertId === req.params.alertId);
  if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
  res.json({ success: true, data: { alert } });
};

// Create alert
exports.createAlert = async (req, res) => {
  const alert = {
    _id: 'alert' + Date.now(),
    alertId: generateAlertId(),
    ...req.body,
    source: req.body.source || 'admin',
    status: 'active',
    timeline: { createdAt: new Date() }
  };
  
  db.alerts.push(alert);
  
  const io = req.app.get('io');
  if (io) io.emit('new-alert', alert);
  
  res.status(201).json({ success: true, message: 'Alert created', data: { alert } });
};

// Update alert status
exports.updateAlertStatus = async (req, res) => {
  const alert = db.alerts.find(a => a.alertId === req.params.alertId);
  if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
  
  alert.status = req.body.status;
  if (req.body.status === 'acknowledged') alert.timeline.acknowledgedAt = new Date();
  if (req.body.status === 'resolved') alert.timeline.resolvedAt = new Date();
  
  const io = req.app.get('io');
  if (io) io.emit('alert-updated', { alertId: alert.alertId, status: alert.status });
  
  res.json({ success: true, message: 'Alert updated', data: { alert } });
};

// Get alerts by location
exports.getAlertsByLocation = async (req, res) => {
  const { ward, district } = req.query;
  let alerts = db.alerts.filter(a => ['active', 'acknowledged'].includes(a.status));
  
  if (ward) alerts = alerts.filter(a => a.location?.ward === ward);
  if (district) alerts = alerts.filter(a => a.location?.district === district);
  
  res.json({ success: true, data: { alerts, count: alerts.length } });
};

// Get public alerts
exports.getPublicAlerts = async (req, res) => {
  const alerts = db.alerts.filter(a => 
    ['active', 'acknowledged'].includes(a.status) &&
    a.targetAudience?.some(t => ['all_citizens', 'local_residents'].includes(t))
  ).slice(0, 50);
  
  res.json({ success: true, data: { alerts, count: alerts.length } });
};

// Initialize monitoring (no-op for in-memory)
exports.initializeMonitoring = (io) => {
  console.log('🔍 Alert monitoring system initialized');
};

// Get alert statistics
exports.getAlertStatistics = async (req, res) => {
  const activeAlerts = db.alerts.filter(a => ['active', 'acknowledged', 'investigating'].includes(a.status)).length;
  const severityCounts = { low: 0, medium: 0, high: 0, critical: 0 };
  
  db.alerts.forEach(a => {
    if (severityCounts[a.severity] !== undefined) severityCounts[a.severity]++;
  });
  
  res.json({
    success: true,
    data: {
      totalAlerts: db.alerts.length,
      activeAlerts,
      resolvedAlerts: db.alerts.length - activeAlerts,
      severityCounts,
      recentAlerts: db.alerts.slice(-10).reverse()
    }
  });
};
