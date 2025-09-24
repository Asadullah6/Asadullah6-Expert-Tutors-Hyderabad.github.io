

const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mentor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: String, // You might want to change this to Date type
    required: true
  },
  time: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled', 'rejected'],
    default: 'pending'
  },
  message: {
    type: String,
    trim: true
  },
  // Session completion fields
  notes: {
    type: String,
    trim: true
  },
  duration: {
    type: Number, // Duration in minutes
  },
  topicsCovered: {
    type: String,
    trim: true
  },
  homework: {
    type: String,
    trim: true
  },
  // Student feedback fields
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  studentFeedback: {
    type: String,
    trim: true
  },
  // Reschedule fields
  rescheduledAt: {
    type: Date
  },
  rescheduleReason: {
    type: String,
    trim: true
  },
  // Timestamps
  acceptedAt: {
    type: Date
  },
  rejectedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  // Additional fields
  goalsMet: {
    type: Boolean,
    default: true
  },
  // Original request details
  studentName: {
    type: String, // Fallback if populate fails
    trim: true
  },
  mentorName: {
    type: String, // Fallback if populate fails
    trim: true
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Indexes for better query performance
sessionSchema.index({ student: 1, status: 1 });
sessionSchema.index({ mentor: 1, status: 1 });
sessionSchema.index({ date: 1, time: 1 });

// Virtual for session date/time as Date object
sessionSchema.virtual('sessionDateTime').get(function() {
  if (this.date && this.time) {
    return new Date(`${this.date}T${this.time}`);
  }
  return null;
});

// Method to check if session is upcoming
sessionSchema.methods.isUpcoming = function() {
  const now = new Date();
  const sessionDateTime = this.sessionDateTime;
  return sessionDateTime && sessionDateTime > now && this.status === 'confirmed';
};

// Method to check if session can be completed
sessionSchema.methods.canBeCompleted = function() {
  return this.status === 'confirmed' && !this.completedAt;
};

// Method to check if session can be rescheduled
sessionSchema.methods.canBeRescheduled = function() {
  return ['confirmed', 'pending'].includes(this.status) && !this.completedAt;
};

// Static method to get sessions by status for a user
sessionSchema.statics.getSessionsByStatus = function(userId, userRole, status) {
  const query = {};
  query[userRole] = userId;
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .populate('student', 'name email')
    .populate('mentor', 'name email')
    .sort({ createdAt: -1 });
};

// Pre-save middleware to set fallback names
sessionSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      if (this.student && !this.studentName) {
        const student = await mongoose.model('User').findById(this.student);
        if (student) this.studentName = student.name;
      }
      if (this.mentor && !this.mentorName) {
        const mentor = await mongoose.model('User').findById(this.mentor);
        if (mentor) this.mentorName = mentor.name;
      }
    } catch (error) {
      console.error('Error setting fallback names:', error);
    }
  }
  next();
});

module.exports = mongoose.model('Session', sessionSchema);

















// const mongoose = require('mongoose');

// const sessionSchema = new mongoose.Schema({
//   student: { 
//     type: mongoose.Schema.Types.ObjectId, 
//     ref: 'User', 
//     required: true 
//   },
//   mentor: { 
//     type: mongoose.Schema.Types.ObjectId, 
//     ref: 'Mentor', 
//     required: true 
//   },
//   subject: String,
//   date: String,
//   time: String,
//   status: { 
//     type: String, 
//     enum: ['pending', 'confirmed', 'canceled'], 
//     default: 'pending' 
//   }
// });

// module.exports = mongoose.model('Session', sessionSchema);