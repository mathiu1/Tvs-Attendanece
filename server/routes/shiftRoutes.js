const router = require('express').Router();
const { getSchedule, saveSchedule, checkPending } = require('../controllers/shiftController');
const auth = require('../middleware/auth');

router.get('/', auth, getSchedule);
router.post('/', auth, saveSchedule);
router.get('/pending', auth, checkPending);

module.exports = router;
