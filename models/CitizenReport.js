const mongoose = require('mongoose');

const citizenReportSchema = new mongoose.Schema({
  reportId: {
    type: String,
    unique: true,
    uppercase: true
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportType: {
    type: String,
    enum: [
      'drainage_blockage',
      'flooding',
      'overflow',
      'broken_infrastructure',
      'maintenance_needed',
      'debris_accumulation',
      'unusual_water_flow',
      'emergency',
      'other'
    ],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'emergency'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 150
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  location: {
    coordinates: {
      lat: {
        type: Number,
        required: true
      },
      lng: {
        type: Number,
        required: true
      }
    },
    address: String,
    landmark: String,
    ward: String,
    district: String,
    accuracy: Number // GPS accuracy in meters
  },
  media: [{
    type: {
      type: String,
      enum: ['image', 'video', 'audio'],
      required: true
    },
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimeType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  contactInfo: {
    phone: String,
    email: String,
    preferredContact: {
      type: String,
      enum: ['phone', 'email', 'app_notification'],
      default: 'app_notification'
    },
    allowPublicContact: {
      type: Boolean,
      default: false
    }
  },
  status: {
    type: String,
    enum: [
      'submitted',
      'under_review',
      'verified',
      'assigned',
      'in_progress',
      'resolved',
      'rejected',
      'duplicate'
    ],
    default: 'submitted'
  },
  priority: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  assignedTo: {
    department: String,
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assignedAt: Date
  },
  relatedNodes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DrainageNode'
  }],
  verification: {
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedAt: Date,
    verificationNotes: String,
    fieldInspection: {
      required: {
        type: Boolean,
        default: false
      },
      completed: {
        type: Boolean,
        default: false
      },
      scheduledDate: Date,
      completedDate: Date,
      inspector: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      findings: String
    }
  },
  resolution: {
    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolutionType: {
      type: String,
      enum: [
        'fixed',
        'not_an_issue',
        'duplicate',
        'referred_to_other_department',
        'scheduled_for_maintenance',
        'requires_major_work'
      ]
    },
    resolutionNotes: String,
    resolutionCost: Number,
    workOrderId: String,
    preventiveMeasures: [String]
  },
  updates: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: String,
    message: String,
    isPublic: {
      type: Boolean,
      default: true
    }
  }],
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    responseTime: Number, // in hours
    resolutionSatisfaction: {
      type: Number,
      min: 1,
      max: 5
    },
    submittedAt: Date
  },
  tags: [String],
  isPublic: {
    type: Boolean,
    default: true
  },
  alertGenerated: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Alert'
  },
  duplicateOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CitizenReport'
  },
  relatedReports: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CitizenReport'
  }],
  views: {
    admin: Number,
    public: Number
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

// Geospatial index
citizenReportSchema.index({ 'location.coordinates': '2dsphere' });

// Compound indexes
citizenReportSchema.index({ status: 1, priority: -1, createdAt: -1 });
citizenReportSchema.index({ reportType: 1, status: 1 });
citizenReportSchema.index({ submittedBy: 1, createdAt: -1 });
citizenReportSchema.index({ 'location.ward': 1, 'location.district': 1 });

// Auto-generate report ID
citizenReportSchema.pre('save', function(next) {
  if (this.isNew) {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    this.reportId = `RPT${date}${random}`;
  }
  this.updatedAt = Date.now();
  next();
});

// Virtual for age in days
citizenReportSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual for response time
citizenReportSchema.virtual('responseTime').get(function() {
  if (this.updates.length > 1) {
    return this.updates[1].timestamp - this.createdAt;
  }
  return null;
});

// Method to check if report is overdue
citizenReportSchema.methods.isOverdue = function() {
  const ageInHours = (Date.now() - this.createdAt) / (1000 * 60 * 60);
  const severityThresholds = {
    'emergency': 2,
    'high': 24,
    'medium': 72,
    'low': 168
  };
  
  return ageInHours > severityThresholds[this.severity] && 
         !['resolved', 'rejected', 'duplicate'].includes(this.status);
};

// Static method to find similar reports
citizenReportSchema.statics.findSimilar = function(lat, lng, type, timeFrame = 7) {
  const startDate = new Date(Date.now() - timeFrame * 24 * 60 * 60 * 1000);
  
  return this.find({
    'location.coordinates': {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: 200 // 200 meters
      }
    },
    reportType: type,
    createdAt: { $gte: startDate },
    status: { $nin: ['rejected', 'duplicate'] }
  });
};

// Static method to get report statistics
citizenReportSchema.statics.getStatistics = function(timeRange = 30) {
  const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
  
  return this.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: {
          type: '$reportType',
          status: '$status',
          severity: '$severity'
        },
        count: { $sum: 1 },
        avgResolutionTime: { $avg: '$responseTime' }
      }
    }
  ]);
};

module.exports = mongoose.model('CitizenReport', citizenReportSchema);