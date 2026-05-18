const Attendance = require('../models/Attendance');
const User = require('../models/User');

// @desc    Mark attendance (single or bulk)
// @route   POST /api/attendance/mark
// @access  HR, Supervisor
exports.markAttendance = async (req, res) => {
  try {
    const { records } = req.body;
    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide attendance records' });
    }

    const results = [];
    const errors = [];

    for (const record of records) {
      const { workerId, date, status, otHours, remarks, absentType } = record;
      try {
        const worker = await User.findById(workerId);
        if (!worker) { errors.push({ workerId, error: 'Worker not found' }); continue; }
        if (worker.role !== 'worker') { errors.push({ workerId, error: 'User is not a worker' }); continue; }

        // Supervisor department check
        if (req.user.role === 'supervisor') {
          const supDept = (req.user.department?._id || req.user.department).toString();
          if (worker.department.toString() !== supDept) {
            errors.push({ workerId, error: 'Worker not in your department' }); continue;
          }
        }

        const attendanceDate = new Date(date);
        attendanceDate.setHours(0, 0, 0, 0);

        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);

        const yesterday = new Date(todayDate);
        yesterday.setDate(yesterday.getDate() - 1);

        const tenDaysAgo = new Date(todayDate);
        tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

        if (attendanceDate > todayDate) {
          errors.push({ workerId, error: 'Cannot mark attendance for future dates' }); continue;
        }

        if (req.user.role === 'supervisor') {
          if (attendanceDate.getTime() < yesterday.getTime()) {
            errors.push({ workerId, error: "Supervisors can only update today's and yesterday's attendance" }); continue;
          }
        } else if (req.user.role === 'hr') {
          if (attendanceDate.getTime() < tenDaysAgo.getTime()) {
            errors.push({ workerId, error: "HR can only update attendance for the last 10 days" }); continue;
          }
        }

        // Check for existing entry
        const existing = await Attendance.findOne({ worker: workerId, date: attendanceDate });
        if (existing) {
          // Update existing record
          let changes = [];
          
          if (status && status !== existing.status) {
            changes.push(`Status: ${existing.status} -> ${status}`);
            existing.status = status;
            existing.markedBy = req.user._id;
          }
          
          if (status === 'AA' || existing.status === 'AA') {
             if (absentType && absentType !== existing.absentType) {
               changes.push(`Absent Type: ${existing.absentType} -> ${absentType}`);
               existing.absentType = absentType;
             }
          } else {
             if (existing.absentType) {
               changes.push(`Absent Type cleared`);
               existing.absentType = undefined;
             }
          }
          
          if (otHours !== undefined && otHours !== existing.otHours) {
            changes.push(`OT Hours: ${existing.otHours} -> ${otHours}`);
            existing.otHours = otHours || 0;
            existing.otMarkedBy = (otHours > 0) ? req.user._id : undefined;
          }
          
          if (remarks !== undefined && remarks !== existing.remarks) {
            changes.push(`Remarks: "${existing.remarks}" -> "${remarks}"`);
            existing.remarks = remarks;
          }
          
          if (!existing.markedBy) existing.markedBy = req.user._id; // fallback
          
          if (changes.length > 0) {
            existing.history.push({
              user: req.user._id,
              date: new Date(),
              details: changes.join(', ')
            });
          }
          
          await existing.save();
          results.push(existing);
        } else {
          const attendance = await Attendance.create({
            worker: workerId,
            date: attendanceDate,
            status,
            absentType: status === 'AA' ? (absentType || 'without_inform') : undefined,
            otHours: otHours || 0,
            markedBy: req.user._id,
            otMarkedBy: (otHours > 0) ? req.user._id : undefined,
            department: worker.department,
            remarks: remarks || '',
          });
          results.push(attendance);
        }
      } catch (err) {
        errors.push({ workerId, error: err.message });
      }
    }

    res.status(201).json({ success: true, count: results.length, results, errors: errors.length > 0 ? errors : undefined });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get worker's own attendance history
// @route   GET /api/attendance/my-history
// @access  Worker
exports.getMyHistory = async (req, res) => {
  try {
    const { month, year } = req.query;
    const filter = { worker: req.user._id };

    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      filter.date = { $gte: startDate, $lte: endDate };
    } else if (year) {
      filter.date = { $gte: new Date(year, 0, 1), $lte: new Date(year, 11, 31) };
    }

    const attendance = await Attendance.find(filter)
      .populate('markedBy', 'name')
      .populate('history.user', 'name')
      .populate('department', 'name code')
      .sort({ date: -1 });

    res.json({ success: true, count: attendance.length, attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get attendance report with filters
// @route   GET /api/attendance/report
// @access  HR
exports.getReport = async (req, res) => {
  try {
    const { department, startDate, endDate, status } = req.query;
    const filter = {};

    // Role-based department filtering
    if (req.user.role === 'hr') {
      if (department) filter.department = department;
    } else {
      // Supervisor or worker only sees their own department
      filter.department = req.user.department;
    }

    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const attendance = await Attendance.find(filter)
      .populate('worker', 'name employeeId')
      .populate('markedBy', 'name')
      .populate('otMarkedBy', 'name')
      .populate('history.user', 'name')
      .populate('department', 'name code')
      .sort({ date: -1, 'worker.name': 1 })
      .lean();

    res.json({ success: true, count: attendance.length, attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get department attendance for a date
// @route   GET /api/attendance/department/:deptId
// @access  HR, Supervisor
exports.getDepartmentAttendance = async (req, res) => {
  try {
    const { deptId } = req.params;
    const { date } = req.query;

    // Supervisor can only access own department
    if (req.user.role === 'supervisor') {
      const supDept = (req.user.department?._id || req.user.department).toString();
      if (deptId !== supDept) {
        return res.status(403).json({ success: false, message: 'You can only view your own department' });
      }
    }

    const queryDate = date ? new Date(date) : new Date();
    queryDate.setHours(0, 0, 0, 0);

    const attendance = await Attendance.find({ department: deptId, date: queryDate })
      .populate('worker', 'name employeeId phone designation')
      .populate('markedBy', 'name')
      .sort({ 'worker.name': 1 });

    // Also get all workers in department to show who is unmarked
    const allWorkers = await User.find({ department: deptId, role: 'worker', isActive: true })
      .select('name employeeId phone designation')
      .sort({ name: 1 });

    const markedWorkerIds = attendance.map((a) => a.worker?._id?.toString());
    const unmarkedWorkers = allWorkers.filter((w) => !markedWorkerIds.includes(w._id.toString()));

    res.json({ success: true, date: queryDate, marked: attendance, unmarked: unmarkedWorkers, totalWorkers: allWorkers.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Update attendance record
// @route   PUT /api/attendance/:id
// @access  HR
exports.updateAttendance = async (req, res) => {
  try {
    const { status, otHours, remarks, absentType } = req.body;
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) return res.status(404).json({ success: false, message: 'Record not found' });

    let changes = [];

    if (status && status !== attendance.status) {
      changes.push(`Status: ${attendance.status} -> ${status}`);
      attendance.status = status;
      attendance.markedBy = req.user._id;
    }

    if (status === 'AA' || attendance.status === 'AA') {
       if (absentType && absentType !== attendance.absentType) {
         changes.push(`Absent Type: ${attendance.absentType} -> ${absentType}`);
         attendance.absentType = absentType;
       }
    } else {
       if (attendance.absentType) {
         changes.push(`Absent Type cleared`);
         attendance.absentType = undefined;
       }
    }
    
    if (otHours !== undefined && otHours !== attendance.otHours) {
      changes.push(`OT Hours: ${attendance.otHours} -> ${otHours}`);
      attendance.otHours = otHours || 0;
      attendance.otMarkedBy = (otHours > 0) ? req.user._id : undefined;
    }
    
    if (remarks !== undefined && remarks !== attendance.remarks) {
      changes.push(`Remarks: "${attendance.remarks}" -> "${remarks}"`);
      attendance.remarks = remarks;
    }

    if (changes.length > 0) {
      attendance.history.push({
        user: req.user._id,
        date: new Date(),
        details: changes.join(', ')
      });
    }

    await attendance.save();

    const updated = await Attendance.findById(attendance._id)
      .populate('worker', 'name employeeId')
      .populate('markedBy', 'name')
      .populate('otMarkedBy', 'name')
      .populate('history.user', 'name')
      .populate('department', 'name code');

    res.json({ success: true, attendance: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Delete attendance record
// @route   DELETE /api/attendance/:id
// @access  HR
exports.deleteAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findByIdAndDelete(req.params.id);
    if (!attendance) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, message: 'Attendance record deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get dashboard stats
// @route   GET /api/attendance/stats
// @access  HR, Supervisor
exports.getStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Ensure we use the same normalized date for alert comparisons
    const todayStartTime = today.getTime();

    let deptFilter = {};
    let deptQuery = { isActive: true };
    if (req.user.role === 'supervisor') {
      const deptId = req.user.department?._id || req.user.department;
      deptFilter.department = deptId;
      deptQuery._id = deptId;
    }

    const [
      totalWorkers, 
      todayCounts, 
      totalDepartments, 
      absentList,
      allDepartments,
      workersByDept,
      deptStatsAgg
    ] = await Promise.all([
      User.countDocuments({ role: 'worker', isActive: true, ...deptFilter }),
      Attendance.aggregate([
        { $match: { date: today, ...deptFilter } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            present: { $sum: { $cond: [{ $in: ['$status', ['1st_shift', '2nd_shift', 'general', 'OT']] }, 1, 0] } },
            absent: { $sum: { $cond: [{ $eq: ['$status', 'AA'] }, 1, 0] } },
            cOff: { $sum: { $cond: [{ $eq: ['$status', 'C-off'] }, 1, 0] } },
          }
        }
      ]),
      require('../models/Department').countDocuments({ isActive: true }),
      Attendance.find({ date: today, status: 'AA', ...deptFilter })
        .populate('worker', 'name phone')
        .populate('department', 'name')
        .sort({ 'worker.name': 1 })
        .lean(),
      require('../models/Department').find(deptQuery).lean(),
      User.aggregate([
        { $match: { role: 'worker', isActive: true, ...deptFilter } },
        { $group: { _id: '$department', total: { $sum: 1 } } }
      ]),
      Attendance.aggregate([
        { $match: { date: today, ...deptFilter } },
        {
          $group: {
            _id: '$department',
            present: { $sum: { $cond: [{ $in: ['$status', ['1st_shift', '2nd_shift', 'general', 'OT']] }, 1, 0] } },
            absent: { $sum: { $cond: [{ $eq: ['$status', 'AA'] }, 1, 0] } },
            cOff: { $sum: { $cond: [{ $eq: ['$status', 'C-off'] }, 1, 0] } },
          }
        }
      ])
    ]);

    const activeWorkersCount = totalWorkers;
    const statsResult = todayCounts[0] || { total: 0, present: 0, absent: 0, cOff: 0 };
    
    const todayAttendance = statsResult.total;
    const todayPresent = statsResult.present;
    const todayAbsent = statsResult.absent;
    const todayCOff = statsResult.cOff;

    const finalDeptChartData = allDepartments.map(dept => {
      const deptIdStr = dept._id.toString();
      
      const workerStat = workersByDept.find(w => w._id && w._id.toString() === deptIdStr);
      const totalWorkersInDept = workerStat ? workerStat.total : 0;

      const attStat = deptStatsAgg.find(a => a._id && a._id.toString() === deptIdStr);
      const present = attStat ? attStat.present : 0;
      const absent = attStat ? attStat.absent : 0;
      const cOff = attStat ? attStat.cOff : 0;
      const unmarked = totalWorkersInDept - (present + absent + cOff);

      return {
        name: dept.name,
        total: totalWorkersInDept,
        present,
        absent,
        cOff,
        unmarked: unmarked > 0 ? unmarked : 0
      };
    }).sort((a, b) => a.name.localeCompare(b.name));

    // 1. Pending Alerts
    const pendingAlerts = [];
    const yesterday = new Date(todayStartTime);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Total active workers for yesterday (assuming workers weren't deactivated just today)
    // For simplicity, we use totalWorkers which is active workers today.
    
    const yesterdayAttendanceCount = await Attendance.countDocuments({ 
      date: yesterday, 
      ...deptFilter 
    });
    
    const yesterdayUnmarked = activeWorkersCount - yesterdayAttendanceCount;
    if (yesterdayUnmarked > 0) {
      pendingAlerts.push({ 
        id: 'a1', 
        type: 'warning', 
        message: `${yesterdayUnmarked} worker(s) still have unmarked attendance for yesterday (${yesterday.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}).` 
      });
    }

    const completelyUnmarkedDepts = finalDeptChartData.filter(d => d.total > 0 && d.unmarked === d.total).map(d => d.name);
    if (completelyUnmarkedDepts.length > 0) {
      pendingAlerts.push({ id: 'a2', type: 'danger', message: `${completelyUnmarkedDepts.join(', ')} missing all attendance today.` });
    }

    // 2. Trend Data (Last 7 Days)
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);

    const trendAgg = await Attendance.aggregate([
      { $match: { date: { $gte: sevenDaysAgo, $lte: today }, ...deptFilter } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          present: { $sum: { $cond: [{ $in: ['$status', ['1st_shift', '2nd_shift', 'general', 'OT']] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$status', 'AA'] }, 1, 0] } }
        }
      }
    ]);

    const trendData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const found = trendAgg.find(t => t._id === dateStr);
      trendData.push({
        date: dateStr,
        displayDate: d.toLocaleDateString('en-US', { weekday: 'short' }),
        present: found ? found.present : 0,
        absent: found ? found.absent : 0
      });
    }

    // 3. Department Performance Snapshot
    const deptPerformance = finalDeptChartData
      .map(d => ({
        name: d.name,
        attendanceRate: d.total > 0 ? ((d.present / d.total) * 100) : 0
      }))
      .filter(d => d.attendanceRate > 0)
      .sort((a, b) => b.attendanceRate - a.attendanceRate);

    const topDept = deptPerformance.length > 0 ? deptPerformance[0] : null;
    const bottomDept = deptPerformance.length > 0 ? deptPerformance[deptPerformance.length - 1] : null;

    res.json({
      success: true,
      stats: { 
        totalWorkers, todayAttendance, todayPresent, todayAbsent, todayCOff, 
        unmarked: totalWorkers - (todayPresent + todayAbsent + todayCOff), totalDepartments,
        absentList,
        deptChartData: finalDeptChartData,
        trendData,
        pendingAlerts,
        topDept: topDept ? { name: topDept.name, rate: topDept.attendanceRate.toFixed(1) } : null,
        bottomDept: bottomDept ? { name: bottomDept.name, rate: bottomDept.attendanceRate.toFixed(1) } : null
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Quick lookup worker status for today
// @route   GET /api/attendance/lookup?q=...
// @access  HR, Supervisor
exports.lookupWorker = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ success: true, results: [] });

    let userFilter = { role: 'worker', isActive: true, $or: [
      { name: { $regex: q, $options: 'i' } },
      { employeeId: { $regex: q, $options: 'i' } }
    ]};

    if (req.user.role === 'supervisor') {
      userFilter.department = req.user.department?._id || req.user.department;
    }

    const workers = await User.find(userFilter).select('name employeeId phone department').populate('department', 'name').limit(5);

    const today = new Date();
    today.setHours(0,0,0,0);

    const workerIds = workers.map(w => w._id);
    const todayAttendance = await Attendance.find({ worker: { $in: workerIds }, date: today }).select('worker status');

    const results = workers.map(w => {
      const att = todayAttendance.find(a => a.worker.toString() === w._id.toString());
      return {
        _id: w._id,
        name: w.name,
        employeeId: w.employeeId,
        department: w.department?.name,
        phone: w.phone,
        status: att ? att.status : 'Unmarked'
      };
    });

    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
