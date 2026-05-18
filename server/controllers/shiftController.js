const ShiftSchedule = require('../models/ShiftSchedule');
const User = require('../models/User');

// @desc    Get schedule for a department and week
// @route   GET /api/shifts
// @access  Private
exports.getSchedule = async (req, res) => {
  try {
    const { department, weekStartDate } = req.query;

    if (!department || !weekStartDate) {
      return res.status(400).json({ success: false, message: 'Please provide department and weekStartDate' });
    }

    const schedule = await ShiftSchedule.findOne({ department, weekStartDate })
      .populate('schedule.worker', 'name employeeId designation');

    res.json({ success: true, data: schedule });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Create or update schedule
// @route   POST /api/shifts
// @access  Private (Supervisor)
exports.saveSchedule = async (req, res) => {
  try {
    const { department, weekStartDate, schedule, status } = req.body;

    // Check if editing is allowed (Fri, Sat, Sun)
    const today = new Date().getDay(); // 0 is Sunday, 5 is Friday, 6 is Saturday
    const isAllowedDay = today === 5 || today === 6 || today === 0;

    if (!isAllowedDay && req.user.role !== 'hr') {
      return res.status(400).json({ success: false, message: 'Schedules can only be assigned on Friday, Saturday, and Sunday.' });
    }

    let shiftSchedule = await ShiftSchedule.findOne({ department, weekStartDate });

    if (shiftSchedule) {
      shiftSchedule.schedule = schedule;
      shiftSchedule.status = status || shiftSchedule.status;
      await shiftSchedule.save();
    } else {
      shiftSchedule = await ShiftSchedule.create({
        department,
        weekStartDate,
        schedule,
        status: status || 'draft',
      });
    }

    // Delete old schedules (older than current week)
    const currentMonday = new Date();
    currentMonday.setDate(currentMonday.getDate() - ((currentMonday.getDay() + 6) % 7)); // Current Monday
    currentMonday.setHours(0, 0, 0, 0);

    await ShiftSchedule.deleteMany({ weekStartDate: { $lt: currentMonday } });

    res.json({ success: true, data: shiftSchedule });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Check if next week's schedule is pending
// @route   GET /api/shifts/pending
// @access  Private
exports.checkPending = async (req, res) => {
  try {
    const { department } = req.query;
    
    // Calculate next week's start date (assume Monday)
    const today = new Date();
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7 || 7));
    nextMonday.setHours(0, 0, 0, 0);

    let pending = false;

    const query = { weekStartDate: nextMonday, status: 'published' };
    if (department) query.department = department;

    const exists = await ShiftSchedule.findOne(query);
    if (!exists) pending = true;

    res.json({ success: true, pending });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
