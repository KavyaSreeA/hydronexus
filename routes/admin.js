const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// All routes in this file already require admin role (applied in server.js)

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// User management
router.get('/users', adminController.getAllUsers);
router.put('/users/:userId/role', adminController.updateUserRole);
router.put('/users/:userId/deactivate', adminController.deactivateUser);

// Analytics
router.get('/analytics', adminController.getAnalytics);

// Report management
router.get('/reports', adminController.getAllReports);
router.put('/reports/:reportId/status', adminController.updateReportStatus);

// Broadcast
router.post('/broadcast', adminController.broadcastMessage);

module.exports = router;
