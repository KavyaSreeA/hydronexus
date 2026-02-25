const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const { verifyToken, requireRole, optionalAuth } = require('../middleware/auth');

// Public routes
router.get('/public', alertController.getPublicAlerts);
router.get('/active', optionalAuth, alertController.getActiveAlerts);
router.get('/location', optionalAuth, alertController.getAlertsByLocation);
router.get('/statistics', optionalAuth, alertController.getAlertStatistics);

// Protected routes
router.get('/', verifyToken, alertController.getAllAlerts);
router.get('/:alertId', verifyToken, alertController.getAlertById);
router.post('/', verifyToken, requireRole(['admin', 'operator']), alertController.createAlert);
router.put('/:alertId/status', verifyToken, requireRole(['admin', 'operator']), alertController.updateAlertStatus);

module.exports = router;
