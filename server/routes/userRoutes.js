const router = require('express').Router();
const { getUsers, getUser, createUser, updateUser, deleteUser, getWorkersByDepartment } = require('../controllers/userController');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/', auth, authorize('hr', 'supervisor', 'worker'), getUsers);
router.post('/', auth, authorize('hr'), createUser);
router.get('/department/:deptId', auth, authorize('hr', 'supervisor'), getWorkersByDepartment);
router.get('/:id', auth, authorize('hr'), getUser);
router.put('/:id', auth, authorize('hr'), updateUser);
router.delete('/:id', auth, authorize('hr'), deleteUser);

module.exports = router;
