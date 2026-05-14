const router = require('express').Router();
const { login, getProfile, changePassword } = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/login', login);
router.get('/profile', auth, getProfile);
router.put('/change-password', auth, changePassword);

module.exports = router;
