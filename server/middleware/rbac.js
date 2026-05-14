const User = require('../models/User');

/**
 * Restrict route access to specific roles
 * Usage: authorize('hr', 'supervisor')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this resource`,
      });
    }
    next();
  };
};

/**
 * Department scope middleware for Supervisors.
 * Ensures supervisors can only access workers in their own department.
 * Expects the target worker ID in req.body.workerId or req.params.workerId
 */
const departmentScope = () => {
  return async (req, res, next) => {
    // HR has unrestricted access
    if (req.user.role === 'hr') return next();

    if (req.user.role === 'supervisor') {
      const supervisorDept = req.user.department?._id || req.user.department;

      // For bulk operations (marking attendance for multiple workers)
      if (req.body.records && Array.isArray(req.body.records)) {
        const workerIds = req.body.records.map((r) => r.workerId);
        const workers = await User.find({ _id: { $in: workerIds } });

        for (const worker of workers) {
          if (worker.department.toString() !== supervisorDept.toString()) {
            return res.status(403).json({
              success: false,
              message: `Worker ${worker.name} does not belong to your department`,
            });
          }
        }
        return next();
      }

      // For single worker operations
      const targetWorkerId =
        req.body.workerId || req.params.workerId || req.params.id;

      if (targetWorkerId) {
        const targetWorker = await User.findById(targetWorkerId);
        if (!targetWorker) {
          return res.status(404).json({
            success: false,
            message: 'Target worker not found',
          });
        }

        if (
          targetWorker.department.toString() !== supervisorDept.toString()
        ) {
          return res.status(403).json({
            success: false,
            message: 'You can only access workers in your own department',
          });
        }
      }
    }

    next();
  };
};

/**
 * Restrict Supervisors to only mark attendance for the current date.
 */
const currentDateOnly = () => {
  return (req, res, next) => {
    // HR can mark for any date
    if (req.user.role === 'hr') return next();

    if (req.user.role === 'supervisor') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check single date
      if (req.body.date) {
        const requestedDate = new Date(req.body.date);
        requestedDate.setHours(0, 0, 0, 0);

        if (requestedDate.getTime() !== today.getTime()) {
          return res.status(403).json({
            success: false,
            message: 'Supervisors can only mark attendance for the current date',
          });
        }
      }

      // Check bulk records
      if (req.body.records && Array.isArray(req.body.records)) {
        for (const record of req.body.records) {
          if (record.date) {
            const recordDate = new Date(record.date);
            recordDate.setHours(0, 0, 0, 0);

            if (recordDate.getTime() !== today.getTime()) {
              return res.status(403).json({
                success: false,
                message:
                  'Supervisors can only mark attendance for the current date',
              });
            }
          }
        }
      }
    }

    next();
  };
};

module.exports = { authorize, departmentScope, currentDateOnly };
