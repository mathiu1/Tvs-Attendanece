const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Worker reference is required'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    status: {
      type: String,
      enum: ['1st_shift', '2nd_shift', 'general', 'AA', 'C-off', 'OT', 'holiday'],
      required: [true, 'Status is required'],
    },
    absentType: {
      type: String,
      enum: ['informed', 'without_inform'],
    },
    // OT extra hours tracking
    otHours: {
      type: Number,
      default: 0,
      min: 0,
      max: 24,
      validate: {
        validator: function (v) {
          // otHours is only relevant when status is a working shift
          if (!['1st_shift', '2nd_shift', 'general', 'OT'].includes(this.status) && v > 0) return false;
          return true;
        },
        message: 'OT hours can only be set when worker is present',
      },
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'MarkedBy reference is required'],
    },
    otMarkedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
    history: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        date: {
          type: Date,
          default: Date.now,
        },
        details: {
          type: String,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound unique index to prevent double entries for same worker on same date
attendanceSchema.index({ worker: 1, date: 1 }, { unique: true });

// Speed up dashboard and report queries
attendanceSchema.index({ date: 1, department: 1 });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ department: 1 });

// Pre-save: normalize date to start of day (strip time)
attendanceSchema.pre('save', function (next) {
  if (this.date) {
    const d = new Date(this.date);
    d.setHours(0, 0, 0, 0);
    this.date = d;
  }
  next();
});

module.exports = mongoose.model('Attendance', attendanceSchema);
