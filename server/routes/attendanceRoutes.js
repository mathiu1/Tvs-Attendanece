const router = require('express').Router();
const { markAttendance, getMyHistory, getReport, getDepartmentAttendance, updateAttendance, deleteAttendance, getStats, lookupWorker } = require('../controllers/attendanceController');
const auth = require('../middleware/auth');
const { authorize, currentDateOnly } = require('../middleware/rbac');

router.post('/mark', auth, authorize('hr', 'supervisor'), currentDateOnly(), markAttendance);
router.get('/my-history', auth, getMyHistory);
router.get('/report', auth, authorize('hr', 'supervisor', 'worker'), getReport);
router.get('/stats', auth, authorize('hr', 'supervisor'), getStats);
router.get('/lookup', auth, authorize('hr', 'supervisor'), lookupWorker);
router.get('/department/:deptId', auth, authorize('hr', 'supervisor'), getDepartmentAttendance);
router.put('/:id', auth, authorize('hr'), updateAttendance);
router.delete('/:id', auth, authorize('hr'), deleteAttendance);

module.exports = router;
