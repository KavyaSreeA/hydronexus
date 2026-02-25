const { db } = require('../utils/database');

// Get all drainage nodes
exports.getAllNodes = async (req, res) => {
  try {
    let nodes = db.drainageNodes.filter(n => n.isActive);
    
    const { status, type, ward, district } = req.query;
    if (status) nodes = nodes.filter(n => n.currentStatus?.operationalStatus === status);
    if (type) nodes = nodes.filter(n => n.type === type);
    if (ward) nodes = nodes.filter(n => n.location?.ward === ward);
    if (district) nodes = nodes.filter(n => n.location?.district === district);

    res.json({ success: true, data: { nodes, pagination: { current: 1, pages: 1, total: nodes.length } } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch nodes', error: error.message });
  }
};

// Get node by ID
exports.getNodeById = async (req, res) => {
  const node = db.drainageNodes.find(n => n.nodeId === req.params.nodeId);
  if (!node) return res.status(404).json({ success: false, message: 'Node not found' });
  res.json({ success: true, data: { node } });
};

// Create node
exports.createNode = async (req, res) => {
  const node = { _id: 'node' + Date.now(), ...req.body, isActive: true, createdAt: new Date() };
  db.drainageNodes.push(node);
  
  const io = req.app.get('io');
  if (io) io.to('admin').emit('node-created', node);
  
  res.status(201).json({ success: true, message: 'Node created', data: { node } });
};

// Update node
exports.updateNode = async (req, res) => {
  const index = db.drainageNodes.findIndex(n => n.nodeId === req.params.nodeId);
  if (index === -1) return res.status(404).json({ success: false, message: 'Node not found' });
  
  Object.assign(db.drainageNodes[index], req.body);
  const io = req.app.get('io');
  if (io) io.to('admin').emit('node-updated', db.drainageNodes[index]);
  
  res.json({ success: true, message: 'Node updated', data: { node: db.drainageNodes[index] } });
};

// Update sensor data
exports.updateSensorData = async (req, res) => {
  const node = db.drainageNodes.find(n => n.nodeId === req.params.nodeId);
  if (!node) return res.status(404).json({ success: false, message: 'Node not found' });

  const { waterLevel, blockageLevel, flowRate } = req.body;
  if (waterLevel !== undefined) node.currentStatus.waterLevel = { current: waterLevel };
  if (blockageLevel !== undefined) node.currentStatus.blockageLevel = { current: blockageLevel };
  if (flowRate !== undefined) node.currentStatus.flowRate = { current: flowRate };

  // Update status
  const wl = node.currentStatus.waterLevel?.current || 0;
  const bl = node.currentStatus.blockageLevel?.current || 0;
  node.currentStatus.operationalStatus = wl >= 85 || bl >= 50 ? 'critical' : wl >= 70 || bl >= 30 ? 'warning' : 'normal';

  const io = req.app.get('io');
  if (io) io.emit('sensor-update', { nodeId: node.nodeId, ...node.currentStatus });

  res.json({ success: true, data: { node } });
};

// Delete node
exports.deleteNode = async (req, res) => {
  const node = db.drainageNodes.find(n => n.nodeId === req.params.nodeId);
  if (!node) return res.status(404).json({ success: false, message: 'Node not found' });
  node.isActive = false;
  res.json({ success: true, message: 'Node deleted' });
};

// Get nodes by status
exports.getNodesByStatus = async (req, res) => {
  const nodes = db.drainageNodes.filter(n => n.isActive && n.currentStatus?.operationalStatus === req.params.status);
  res.json({ success: true, data: { nodes, count: nodes.length } });
};

// Get nearby nodes
exports.getNearbyNodes = async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ success: false, message: 'Lat/lng required' });
  const nodes = db.drainageNodes.filter(n => n.isActive);
  res.json({ success: true, data: { nodes, count: nodes.length } });
};

// Get statistics
exports.getStatistics = async (req, res) => {
  const activeNodes = db.drainageNodes.filter(n => n.isActive);
  const statusCounts = { normal: 0, warning: 0, critical: 0 };
  
  activeNodes.forEach(n => {
    const s = n.currentStatus?.operationalStatus || 'normal';
    if (statusCounts[s] !== undefined) statusCounts[s]++;
  });

  const avgWaterLevel = activeNodes.reduce((sum, n) => sum + (n.currentStatus?.waterLevel?.current || 0), 0) / (activeNodes.length || 1);
  const criticalNodes = activeNodes.filter(n => n.currentStatus?.operationalStatus === 'critical');

  res.json({
    success: true,
    data: { totalNodes: activeNodes.length, statusCounts, avgWaterLevel: Math.round(avgWaterLevel), criticalNodes }
  });
};

// Add maintenance record
exports.addMaintenanceRecord = async (req, res) => {
  const node = db.drainageNodes.find(n => n.nodeId === req.params.nodeId);
  if (!node) return res.status(404).json({ success: false, message: 'Node not found' });
  
  if (!node.maintenanceHistory) node.maintenanceHistory = [];
  node.maintenanceHistory.push({ ...req.body, date: new Date(), performedBy: req.user.id });
  
  res.json({ success: true, message: 'Maintenance record added', data: { node } });
};
