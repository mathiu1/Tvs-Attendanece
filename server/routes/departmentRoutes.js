const router = require('express').Router();
const { getDepartments, getDepartment, createDepartment, updateDepartment, deleteDepartment } = require('../controllers/departmentController');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/', auth, getDepartments);
router.get('/:id', auth, getDepartment);
router.post('/', auth, authorize('hr'), createDepartment);
router.put('/:id', auth, authorize('hr'), updateDepartment);
router.delete('/:id', auth, authorize('hr'), deleteDepartment);

module.exports = router;
