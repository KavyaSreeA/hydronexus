const { db } = require('../utils/database');

// Get dashboard
exports.getDashboard = async (req, res) => {
  const activeAlerts = db.alerts.filter(a => ['active', 'acknowledged', 'investigating'].includes(a.status));
  const pendingReports = db.citizenReports.filter(r => ['submitted', 'under_review'].includes(r.status));
  const criticalNodes = db.drainageNodes.filter(n => n.isActive && n.currentStatus?.operationalStatus === 'critical');
  
  res.json({
    success: true,
    data: {
      stats: {
        totalUsers: db.users.length,
        totalNodes: db.drainageNodes.filter(n => n.isActive).length,
        activeAlerts: activeAlerts.length,
        pendingReports: pendingReports.length
      },
      criticalNodes: criticalNodes.slice(0, 10),
      recentAlerts: activeAlerts.slice(0, 5),
      recentReports: pendingReports.slice(0, 5)
    }
  });
};

// Get all users
exports.getAllUsers = async (req, res) => {
  let users = db.users.map(u => ({ ...u, password: undefined }));
  const { role, status } = req.query;
  
  if (role) users = users.filter(u => u.role === role);
  if (status) users = users.filter(u => u.isActive === (status === 'active'));
  
  res.json({ success: true, data: { users, pagination: { current: 1, pages: 1, total: users.length } } });
};

// Update user role
exports.updateUserRole = async (req, res) => {
  const user = db.users.find(u => u._id === req.params.userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  
  user.role = req.body.role;
  res.json({ success: true, message: 'Role updated', data: { user: { ...user, password: undefined } } });
};

// Deactivate user
exports.deactivateUser = async (req, res) => {
  if (req.params.userId === req.user.id) {
    return res.status(400).json({ success: false, message: 'Cannot deactivate yourself' });
  }
  
  const user = db.users.find(u => u._id === req.params.userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  
  user.isActive = false;
  res.json({ success: true, message: 'User deactivated' });
};

// Get analytics
exports.getAnalytics = async (req, res) => {
  const statusCounts = { normal: 0, warning: 0, critical: 0 };
  db.drainageNodes.filter(n => n.isActive).forEach(n => {
    const s = n.currentStatus?.operationalStatus || 'normal';
    if (statusCounts[s] !== undefined) statusCounts[s]++;
  });
  
  res.json({
    success: true,
    data: {
      alertsOverTime: [{ _id: new Date().toISOString().split('T')[0], count: db.alerts.length }],
      reportsOverTime: [{ _id: new Date().toISOString().split('T')[0], count: db.citizenReports.length }],
      nodeStatusDistribution: Object.entries(statusCounts).map(([k, v]) => ({ _id: k, count: v })),
      avgResponseTime: 0
    }
  });
};

// Get all reports
exports.getAllReports = async (req, res) => {
  let reports = [...db.citizenReports];
  const { status, severity } = req.query;
  
  if (status) reports = reports.filter(r => r.status === status);
  if (severity) reports = reports.filter(r => r.severity === severity);
  
  res.json({ success: true, data: { reports, pagination: { current: 1, pages: 1, total: reports.length } } });
};

// Update report status
exports.updateReportStatus = async (req, res) => {
  const report = db.citizenReports.find(r => r.reportId === req.params.reportId);
  if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
  
  report.status = req.body.status;
  if (req.body.adminNotes) report.adminNotes = req.body.adminNotes;
  
  const io = req.app.get('io');
  if (io) io.to('admin').emit('report-updated', { reportId: report.reportId, status: report.status });
  
  res.json({ success: true, message: 'Report updated', data: { report } });
};

// Broadcast message
exports.broadcastMessage = async (req, res) => {
  const io = req.app.get('io');
  if (io) {
    io.emit('broadcast', { message: req.body.message, type: req.body.type || 'info', timestamp: new Date() });
  }
  res.json({ success: true, message: 'Broadcast sent' });
};
