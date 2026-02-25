const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  alertId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  type: {
    type: String,
    enum: [
      'flood_warning',
      'drainage_blockage', 
      'overflow_risk',
      'maintenance_required',
      'sensor_malfunction',
      'emergency',
      'weather_alert',
      'citizen_report'
    ],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  location: {
    coordinates: {
      lat: Number,
      lng: Number
    },
    address: String,
    ward: String,
    district: String,
    affectedRadius: {
      type: Number,
      default: 500 // meters
    }
  },
  source: {
    type: String,
    enum: ['system', 'citizen', 'admin', 'sensor', 'weather_api'],
    required: true
  },
  sourceDetails: {
    drainageNodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DrainageNode'
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    sensorId: String,
    automaticTrigger: Boolean
  },
  status: {
    type: String,
    enum: ['active', 'acknowledged', 'investigating', 'resolved', 'cancelled'],
    default: 'active'
  },
  priority: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  targetAudience: [{
    type: String,
    enum: ['all_citizens', 'local_residents', 'emergency_services', 'admin_only', 'maintenance_crew']
  }],
  affectedAreas: [{
    ward: String,
    district: String,
    estimatedPopulation: Number
  }],
  timeline: {
    createdAt: {
      type: Date,
      default: Date.now
    },
    acknowledgedAt: Date,
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    estimatedResolutionTime: Date,
    actualResolutionTime: Date
  },
  actions: {
    immediate: [String],
    shortTerm: [String],
    longTerm: [String],
    preventive: [String]
  },
  notifications: {
    sent: {
      email: { type: Boolean, default: false },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: false },
      publicAddress: { type: Boolean, default: false }
    },
    recipients: {
      citizens: Number,
      officials: Number,
      emergencyServices: Number
    },
    deliveryStatus: [{
      type: {
        type: String,
        enum: ['email', 'sms', 'push', 'public_address']
      },
      delivered: Number,
      failed: Number,
      pending: Number,
      timestamp: Date
    }]
  },
  relatedAlerts: [{
    alertId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Alert'
    },
    relationship: {
      type: String,
      enum: ['duplicate', 'related', 'escalation', 'follow_up']
    }
  }],
  attachments: [{
    type: String, // file path or URL
    description: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  feedback: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    helpful: Boolean,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  weatherData: {
    rainfall: Number, // mm
    windSpeed: Number, // km/h
    temperature: Number, // celsius
    humidity: Number, // percentage
    pressure: Number, // hPa
    forecast: String,
    dataSource: String,
    timestamp: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  autoResolveAt: Date,
  escalationLevel: {
    type: Number,
    default: 0,
    max: 3
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Geospatial index for location-based queries
alertSchema.index({ 'location.coordinates': '2dsphere' });

// Compound indexes for efficient querying
alertSchema.index({ status: 1, severity: 1, createdAt: -1 });
alertSchema.index({ type: 1, isActive: 1 });
alertSchema.index({ 'timeline.createdAt': -1 });
alertSchema.index({ 'location.ward': 1, 'location.district': 1 });

// Update timestamp before saving
alertSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Auto-generate alert ID
alertSchema.pre('save', function(next) {
  if (this.isNew) {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    this.alertId = `ALT${date}${random}`;
  }
  next();
});

// Virtual for response time
alertSchema.virtual('responseTime').get(function() {
  if (this.timeline.acknowledgedAt) {
    return this.timeline.acknowledgedAt - this.timeline.createdAt;
  }
  return null;
});

// Virtual for resolution time
alertSchema.virtual('resolutionTime').get(function() {
  if (this.timeline.resolvedAt) {
    return this.timeline.resolvedAt - this.timeline.createdAt;
  }
  return null;
});

// Method to check if alert is escalated
alertSchema.methods.shouldEscalate = function() {
  const ageInMinutes = (Date.now() - this.timeline.createdAt) / (1000 * 60);
  const severityThresholds = {
    'critical': 15,
    'high': 30,
    'medium': 60,
    'low': 120
  };
  
  return ageInMinutes > severityThresholds[this.severity] && this.status === 'active';
};

// Static method to find active alerts by location
alertSchema.statics.findByLocation = function(lat, lng, radius = 1000) {
  return this.find({
    'location.coordinates': {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: radius
      }
    },
    status: { $in: ['active', 'acknowledged', 'investigating'] },
    isActive: true
  });
};

// Static method to get alert statistics
alertSchema.statics.getStatistics = function(timeRange = 30) {
  const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
  
  return this.aggregate([
    { $match: { 'timeline.createdAt': { $gte: startDate } } },
    {
      $group: {
        _id: {
          type: '$type',
          severity: '$severity',
          status: '$status'
        },
        count: { $sum: 1 },
        avgResolutionTime: { $avg: '$resolutionTime' }
      }
    }
  ]);
};

module.exports = mongoose.model('Alert', alertSchema);