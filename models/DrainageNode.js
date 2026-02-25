const mongoose = require('mongoose');

const drainageNodeSchema = new mongoose.Schema({
  nodeId: {
    type: String,
    required: [true, 'Node ID is required'],
    unique: true,
    uppercase: true,
    match: [/^DN[0-9]{4}$/, 'Node ID must follow format DN0001']
  },
  name: {
    type: String,
    required: [true, 'Node name is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['storm_drain', 'catch_basin', 'culvert', 'channel', 'pump_station', 'retention_pond'],
    required: true
  },
  location: {
    coordinates: {
      lat: {
        type: Number,
        required: true,
        min: -90,
        max: 90
      },
      lng: {
        type: Number,
        required: true,
        min: -180,
        max: 180
      }
    },
    address: String,
    ward: String,
    district: String,
    city: String
  },
  specifications: {
    capacity: {
      type: Number, // in cubic meters
      required: true
    },
    diameter: Number, // in meters
    depth: Number, // in meters
    material: {
      type: String,
      enum: ['concrete', 'steel', 'plastic', 'brick', 'composite']
    },
    installationDate: Date
  },
  monitoring: {
    sensors: [{
      sensorId: String,
      type: {
        type: String,
        enum: ['water_level', 'flow_rate', 'blockage', 'ph', 'temperature', 'debris']
      },
      status: {
        type: String,
        enum: ['active', 'inactive', 'maintenance', 'error'],
        default: 'active'
      },
      lastCalibration: Date
    }],
    lastInspection: Date,
    nextScheduledMaintenance: Date
  },
  currentStatus: {
    waterLevel: {
      current: Number, // percentage 0-100
      threshold: {
        warning: { type: Number, default: 70 },
        critical: { type: Number, default: 85 }
      },
      lastUpdated: Date
    },
    blockageLevel: {
      current: Number, // percentage 0-100
      threshold: {
        warning: { type: Number, default: 30 },
        critical: { type: Number, default: 50 }
      },
      lastUpdated: Date
    },
    flowRate: {
      current: Number, // liters per second
      average: Number,
      lastUpdated: Date
    },
    operationalStatus: {
      type: String,
      enum: ['normal', 'warning', 'critical', 'offline', 'maintenance'],
      default: 'normal'
    }
  },
  alertHistory: [{
    alertType: {
      type: String,
      enum: ['water_level', 'blockage', 'overflow', 'sensor_failure', 'maintenance']
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    message: String,
    timestamp: Date,
    resolved: {
      type: Boolean,
      default: false
    },
    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  maintenanceHistory: [{
    date: Date,
    type: {
      type: String,
      enum: ['cleaning', 'repair', 'replacement', 'inspection', 'calibration']
    },
    description: String,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    cost: Number,
    nextMaintenanceDate: Date
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Geospatial index for location queries
drainageNodeSchema.index({ 'location.coordinates': '2dsphere' });

// Index for efficient querying
drainageNodeSchema.index({ nodeId: 1, isActive: 1 });
drainageNodeSchema.index({ 'currentStatus.operationalStatus': 1 });
drainageNodeSchema.index({ ward: 1, district: 1 });

// Update timestamp before saving
drainageNodeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for risk assessment
drainageNodeSchema.virtual('riskLevel').get(function() {
  const waterLevel = this.currentStatus.waterLevel.current || 0;
  const blockageLevel = this.currentStatus.blockageLevel.current || 0;
  
  if (waterLevel >= 85 || blockageLevel >= 50) return 'critical';
  if (waterLevel >= 70 || blockageLevel >= 30) return 'high';
  if (waterLevel >= 50 || blockageLevel >= 20) return 'medium';
  return 'low';
});

// Method to check if node needs immediate attention
drainageNodeSchema.methods.needsImmediateAttention = function() {
  return this.currentStatus.operationalStatus === 'critical' || 
         this.currentStatus.waterLevel.current >= this.currentStatus.waterLevel.threshold.critical ||
         this.currentStatus.blockageLevel.current >= this.currentStatus.blockageLevel.threshold.critical;
};

// Method to get nearby nodes
drainageNodeSchema.statics.findNearby = function(lat, lng, maxDistance = 1000) {
  return this.find({
    'location.coordinates': {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: maxDistance
      }
    },
    isActive: true
  });
};

module.exports = mongoose.model('DrainageNode', drainageNodeSchema);