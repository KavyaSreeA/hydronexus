const express = require('express');
const router = express.Router();
const drainageController = require('../controllers/drainageController');
const { verifyToken, requireRole, optionalAuth } = require('../middleware/auth');

// Public routes (read-only access)
router.get('/', optionalAuth, drainageController.getAllNodes);
router.get('/statistics', optionalAuth, drainageController.getStatistics);
router.get('/status/:status', optionalAuth, drainageController.getNodesByStatus);
router.get('/nearby', optionalAuth, drainageController.getNearbyNodes);
router.get('/:nodeId', optionalAuth, drainageController.getNodeById);

// Protected routes (require authentication)
router.post('/', verifyToken, requireRole(['admin', 'operator']), drainageController.createNode);
router.put('/:nodeId', verifyToken, requireRole(['admin', 'operator']), drainageController.updateNode);
router.delete('/:nodeId', verifyToken, requireRole(['admin']), drainageController.deleteNode);

// Sensor data update (from IoT devices - uses API key or admin token)
router.post('/:nodeId/sensor-data', verifyToken, drainageController.updateSensorData);

// Maintenance records
router.post('/:nodeId/maintenance', verifyToken, requireRole(['admin', 'operator']), drainageController.addMaintenanceRecord);

module.exports = router;
