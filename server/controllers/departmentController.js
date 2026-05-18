const Department = require('../models/Department');
const User = require('../models/User');

exports.getDepartments = async (req, res) => {
  try {
    const filter = {};
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    const departments = await Department.find(filter).sort({ name: 1 });
    res.json({ success: true, count: departments.length, departments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getDepartment = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) return res.status(404).json({ success: false, message: 'Department not found' });
    res.json({ success: true, department });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.createDepartment = async (req, res) => {
  try {
    const { name, code, description } = req.body;
    const existing = await Department.findOne({ $or: [{ name }, { code: code?.toUpperCase() }] });
    if (existing) return res.status(400).json({ success: false, message: 'Department name or code already exists' });
    const department = await Department.create({ name, code, description });
    res.status(201).json({ success: true, department });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const department = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!department) return res.status(404).json({ success: false, message: 'Department not found' });
    res.json({ success: true, department });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) return res.status(404).json({ success: false, message: 'Department not found' });
    
    // Check if there are users in this department
    const usersInDept = await User.find({ department: req.params.id }).select('name');
    if (usersInDept.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot deactivate department. Move users first.',
        users: usersInDept.map(u => u.name)
      });
    }

    department.isActive = false;
    await department.save();
    res.json({ success: true, message: 'Department deactivated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
