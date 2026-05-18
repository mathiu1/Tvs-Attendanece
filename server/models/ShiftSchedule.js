const mongoose = require('mongoose');

const shiftScheduleSchema = new mongoose.Schema(
  {
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    weekStartDate: {
      type: Date,
      required: true,
    },
    schedule: [
      {
        worker: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        shifts: [
          {
            day: {
              type: String,
              enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
              required: true,
            },
            shift: {
              type: String,
              enum: ['Shift 1', 'Shift 2', 'General', 'Not Assign'],
              default: 'Not Assign',
            },
          },
        ],
      },
    ],
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
    },
  },
  { timestamps: true }
);

// Compound index to ensure one schedule per department per week
shiftScheduleSchema.index({ department: 1, weekStartDate: 1 }, { unique: true });

module.exports = mongoose.model('ShiftSchedule', shiftScheduleSchema);
