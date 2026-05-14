const User = require('../models/User');

// @desc    Get all users
// @route   GET /api/users
// @access  HR
exports.getUsers = async (req, res) => {
  try {
    const { role, department, search, isActive } = req.query;

    const filter = {};
    if (role) filter.role = role;
    
    // Role-based department filtering
    if (req.user.role === 'hr') {
      if (department) filter.department = department;
    } else {
      filter.department = req.user.department;
    }
    
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter)
      .populate('department', 'name code')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  HR
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate(
      'department',
      'name code'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Create user
// @route   POST /api/users
// @access  HR
exports.createUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      department,
      employeeId,
      phone,
      dateOfJoining,
      designation,
      address,
      emergencyContact,
    } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, ...(employeeId ? [{ employeeId }] : [])],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message:
          existingUser.email === email
            ? 'Email already exists'
            : 'Employee ID already exists',
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      department,
      employeeId,
      phone,
      dateOfJoining,
      designation,
      address,
      emergencyContact,
    });

    const populatedUser = await User.findById(user._id).populate(
      'department',
      'name code'
    );

    res.status(201).json({
      success: true,
      user: populatedUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  HR
exports.updateUser = async (req, res) => {
  try {
    const {
      name,
      email,
      role,
      department,
      employeeId,
      phone,
      dateOfJoining,
      designation,
      address,
      emergencyContact,
      isActive,
    } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (department) user.department = department;
    if (employeeId) user.employeeId = employeeId;
    if (phone !== undefined) user.phone = phone;
    if (dateOfJoining) user.dateOfJoining = dateOfJoining;
    if (designation !== undefined) user.designation = designation;
    if (address !== undefined) user.address = address;
    if (emergencyContact) user.emergencyContact = emergencyContact;
    if (isActive !== undefined) user.isActive = isActive;

    // If password is provided, update it (triggers pre-save hash)
    if (req.body.password) {
      user.password = req.body.password;
    }

    await user.save();

    const updatedUser = await User.findById(user._id).populate(
      'department',
      'name code'
    );

    res.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Delete (deactivate) user
// @route   DELETE /api/users/:id
// @access  HR
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Soft delete
    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      message: 'User deactivated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get workers by department
// @route   GET /api/users/department/:deptId
// @access  HR, Supervisor
exports.getWorkersByDepartment = async (req, res) => {
  try {
    let deptId = req.params.deptId;

    // Supervisors can only access their own department
    if (req.user.role === 'supervisor') {
      const supervisorDept = req.user.department?._id || req.user.department;
      if (deptId !== supervisorDept.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only access workers in your own department',
        });
      }
    }

    const workers = await User.find({
      department: deptId,
      role: 'worker',
      isActive: true,
    })
      .populate('department', 'name code')
      .sort({ name: 1 });

    res.json({
      success: true,
      count: workers.length,
      workers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
