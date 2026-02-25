const { db } = require('../utils/database');

// Generate unique report ID
const generateReportId = () => {
  const date = new Date();
  const prefix = `RPT${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const count = db.citizenReports.filter(r => r.reportId && r.reportId.startsWith(prefix)).length;
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
};

// Submit a new report
exports.submitReport = async (req, res) => {
  const reportId = generateReportId();
  const report = {
    reportId,
    submittedBy: req.user.id,
    status: 'submitted',
    createdAt: new Date(),
    ...req.body
  };
  
  db.citizenReports.push(report);

  const io = req.app.get('io');
  if (io) {
    io.to('admin').emit('new-report', {
      reportId: report.reportId,
      type: report.reportType,
      severity: report.severity,
      title: report.title,
      location: report.location
    });
  }

  res.status(201).json({
    success: true,
    message: 'Report submitted successfully',
    data: { report: { reportId: report.reportId, status: report.status, createdAt: report.createdAt } }
  });
};

// Get user's own reports
exports.getMyReports = async (req, res) => {
  let reports = db.citizenReports.filter(r => r.submittedBy === req.user.id);
  if (req.query.status) reports = reports.filter(r => r.status === req.query.status);
  reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({
    success: true,
    data: { reports, pagination: { current: 1, pages: 1, total: reports.length } }
  });
};

// Get single report by ID
exports.getReportById = async (req, res) => {
  const report = db.citizenReports.find(r => r.reportId === req.params.reportId);
  if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
  
  if (report.submittedBy !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not authorized to view this report' });
  }

  res.json({ success: true, data: { report } });
};

// Track report status
exports.trackReport = async (req, res) => {
  const report = db.citizenReports.find(r => r.reportId === req.params.reportId);
  if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

  res.json({
    success: true,
    data: {
      reportId: report.reportId,
      status: report.status,
      priority: report.priority,
      createdAt: report.createdAt,
      updates: report.updates || [],
      resolution: report.status === 'resolved' ? report.resolution : null
    }
  });
};

// Add feedback to resolved report
exports.addFeedback = async (req, res) => {
  const report = db.citizenReports.find(r => r.reportId === req.params.reportId && r.submittedBy === req.user.id);
  if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
  if (report.status !== 'resolved') {
    return res.status(400).json({ success: false, message: 'Can only provide feedback for resolved reports' });
  }

  report.feedback = { rating: req.body.rating, comment: req.body.comment, submittedAt: new Date() };
  res.json({ success: true, message: 'Feedback submitted successfully' });
};

// Get alerts for citizen's area
exports.getLocalAlerts = async (req, res) => {
  const alerts = db.alerts.filter(a => 
    ['active', 'acknowledged'].includes(a.status) &&
    ['all_citizens', 'local_residents'].includes(a.targetAudience)
  ).slice(0, 20);

  res.json({ success: true, data: { alerts, count: alerts.length } });
};

// Get nearby drainage nodes status
exports.getNearbyNodesStatus = async (req, res) => {
  const { lat, lng, radius = 2000 } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
  }

  const nodes = db.drainageNodes.filter(n => n.isActive).map(node => ({
    nodeId: node.nodeId,
    name: node.name,
    type: node.type,
    status: node.currentStatus?.operationalStatus || 'unknown',
    waterLevel: node.currentStatus?.waterLevel?.current || 0,
    location: node.location
  }));

  res.json({ success: true, data: { nodes, count: nodes.length } });
};

// Get citizen dashboard data
exports.getDashboard = async (req, res) => {
  const userId = req.user.id;
  const myReports = db.citizenReports.filter(r => r.submittedBy === userId);
  const activeAlerts = db.alerts.filter(a => ['active', 'acknowledged'].includes(a.status));
  
  const statusCounts = { normal: 0, warning: 0, critical: 0 };
  db.drainageNodes.filter(n => n.isActive).forEach(n => {
    const s = n.currentStatus?.operationalStatus || 'normal';
    if (statusCounts[s] !== undefined) statusCounts[s]++;
  });

  const resolvedReports = myReports.filter(r => r.status === 'resolved').length;

  res.json({
    success: true,
    data: {
      myStats: { totalReports: myReports.length, resolvedReports, pendingReports: myReports.length - resolvedReports },
      recentReports: myReports.slice(0, 5),
      activeAlerts: activeAlerts.slice(0, 5),
      systemStatus: statusCounts
    }
  });
};

// Subscribe to alerts for specific area
exports.subscribeToArea = async (req, res) => {
  const { lat, lng, radius = 5000, ward, district } = req.body;
  const user = db.users.find(u => u._id === req.user.id);
  
  if (user) {
    user.preferences = user.preferences || {};
    user.preferences.alertArea = {
      coordinates: lat && lng ? { lat, lng } : undefined,
      radius, ward, district
    };
  }

  res.json({ success: true, message: 'Successfully subscribed to area alerts' });
};
