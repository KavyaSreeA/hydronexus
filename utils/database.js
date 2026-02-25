// In-Memory Database - No MongoDB Required!
// Data persists only while server is running

const bcrypt = require('bcryptjs');

const db = {
  users: [],
  drainageNodes: [],
  alerts: [],
  citizenReports: []
};

// Initialize with sample data
const initializeData = async () => {
  // Create default admin user (password: admin123)
  const hashedPassword = await bcrypt.hash('admin123', 12);
  
  db.users.push({
    _id: 'admin001',
    username: 'admin',
    email: 'admin@hydronexus.com',
    password: hashedPassword,
    role: 'admin',
    profile: { firstName: 'System', lastName: 'Administrator' },
    preferences: { notifications: { email: true, push: true } },
    isActive: true,
    createdAt: new Date()
  });

  db.users.push({
    _id: 'user001',
    username: 'citizen',
    email: 'citizen@example.com',
    password: hashedPassword,
    role: 'citizen',
    profile: { firstName: 'Test', lastName: 'User' },
    preferences: { notifications: { email: true, push: true } },
    isActive: true,
    createdAt: new Date()
  });

  // Sample drainage nodes
  db.drainageNodes = [
    {
      _id: 'node001', nodeId: 'DN0001', name: 'Main Street Storm Drain', type: 'storm_drain',
      location: { coordinates: { lat: 28.6139, lng: 77.2090 }, address: 'Main Street, Central Delhi', ward: 'Central Ward', district: 'Central Delhi' },
      specifications: { capacity: 50, diameter: 1.5, depth: 3.0, material: 'concrete' },
      currentStatus: { waterLevel: { current: 25 }, blockageLevel: { current: 15 }, flowRate: { current: 120 }, operationalStatus: 'normal' },
      isActive: true, priority: 'medium', createdAt: new Date()
    },
    {
      _id: 'node002', nodeId: 'DN0002', name: 'Park Avenue Catch Basin', type: 'catch_basin',
      location: { coordinates: { lat: 28.6129, lng: 77.2095 }, address: 'Park Avenue, Central Delhi', ward: 'Central Ward', district: 'Central Delhi' },
      specifications: { capacity: 25, diameter: 1.0, depth: 2.5, material: 'concrete' },
      currentStatus: { waterLevel: { current: 75 }, blockageLevel: { current: 35 }, flowRate: { current: 85 }, operationalStatus: 'warning' },
      isActive: true, priority: 'high', createdAt: new Date()
    },
    {
      _id: 'node003', nodeId: 'DN0003', name: 'Industrial Zone Pump Station', type: 'pump_station',
      location: { coordinates: { lat: 28.6149, lng: 77.2085 }, address: 'Industrial Zone, Delhi', ward: 'Industrial Ward', district: 'East Delhi' },
      specifications: { capacity: 200, material: 'steel' },
      currentStatus: { waterLevel: { current: 90 }, blockageLevel: { current: 55 }, flowRate: { current: 180 }, operationalStatus: 'critical' },
      isActive: true, priority: 'critical', createdAt: new Date()
    },
    {
      _id: 'node004', nodeId: 'DN0004', name: 'Riverside Culvert', type: 'culvert',
      location: { coordinates: { lat: 28.6159, lng: 77.2100 }, address: 'Riverside Road, Delhi', ward: 'River Ward', district: 'North Delhi' },
      specifications: { capacity: 100, diameter: 2.0, depth: 4.0, material: 'concrete' },
      currentStatus: { waterLevel: { current: 45 }, blockageLevel: { current: 10 }, flowRate: { current: 150 }, operationalStatus: 'normal' },
      isActive: true, priority: 'medium', createdAt: new Date()
    },
    {
      _id: 'node005', nodeId: 'DN0005', name: 'Market Area Channel', type: 'channel',
      location: { coordinates: { lat: 28.6120, lng: 77.2110 }, address: 'Market Street, Delhi', ward: 'Commercial Ward', district: 'South Delhi' },
      specifications: { capacity: 75, depth: 2.0, material: 'brick' },
      currentStatus: { waterLevel: { current: 60 }, blockageLevel: { current: 25 }, flowRate: { current: 100 }, operationalStatus: 'normal' },
      isActive: true, priority: 'medium', createdAt: new Date()
    }
  ];

  // Sample alerts
  db.alerts = [
    {
      _id: 'alert001', alertId: 'ALT202602250001', type: 'flood_warning', severity: 'critical',
      title: 'Critical Water Level at Industrial Zone',
      message: 'Water level has exceeded critical threshold at DN0003. Immediate attention required.',
      location: { coordinates: { lat: 28.6149, lng: 77.2085 }, address: 'Industrial Zone, Delhi', ward: 'Industrial Ward', district: 'East Delhi' },
      source: 'sensor', status: 'active', priority: 5, targetAudience: ['all_citizens', 'emergency_services'],
      timeline: { createdAt: new Date(Date.now() - 3600000) }
    },
    {
      _id: 'alert002', alertId: 'ALT202602250002', type: 'drainage_blockage', severity: 'high',
      title: 'Blockage Detected at Park Avenue',
      message: 'Blockage level above warning threshold at DN0002. Maintenance team notified.',
      location: { coordinates: { lat: 28.6129, lng: 77.2095 }, address: 'Park Avenue, Central Delhi', ward: 'Central Ward', district: 'Central Delhi' },
      source: 'sensor', status: 'acknowledged', priority: 4, targetAudience: ['admin_only', 'maintenance_crew'],
      timeline: { createdAt: new Date(Date.now() - 7200000), acknowledgedAt: new Date(Date.now() - 3600000) }
    }
  ];

  console.log('✅ Sample data loaded:');
  console.log(`   👤 ${db.users.length} users (admin@hydronexus.com / admin123)`);
  console.log(`   🔧 ${db.drainageNodes.length} drainage nodes`);
  console.log(`   🚨 ${db.alerts.length} alerts`);
};

const connectDB = async () => {
  console.log('🚀 Using in-memory database (no MongoDB required!)');
  await initializeData();
};

module.exports = connectDB;
module.exports.db = db;