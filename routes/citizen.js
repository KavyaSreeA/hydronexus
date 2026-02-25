const express = require('express');
const router = express.Router();
const citizenController = require('../controllers/citizenController');
const { verifyToken, optionalAuth } = require('../middleware/auth');

// Public routes (no auth required)
router.get('/alerts/local', optionalAuth, citizenController.getLocalAlerts);
router.get('/nodes/nearby', optionalAuth, citizenController.getNearbyNodesStatus);
router.get('/reports/track/:reportId', citizenController.trackReport);

// Protected routes (require login)
router.get('/dashboard', verifyToken, citizenController.getDashboard);
router.post('/reports', verifyToken, citizenController.submitReport);
router.get('/reports', verifyToken, citizenController.getMyReports);
router.get('/reports/:reportId', verifyToken, citizenController.getReportById);
router.post('/reports/:reportId/feedback', verifyToken, citizenController.addFeedback);
router.post('/subscribe', verifyToken, citizenController.subscribeToArea);

module.exports = router;
