const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const Department = require('../models/Department');

const departments = [
  { name: 'Production', code: 'PROD', description: 'Manufacturing and production operations' },
  { name: 'Quality', code: 'QA', description: 'Quality assurance and control' },
  { name: 'Logistics', code: 'LOG', description: 'Supply chain and logistics management' },
  { name: 'Maintenance', code: 'MAINT', description: 'Equipment maintenance and repair' },
  { name: 'Stores', code: 'STR', description: 'Inventory and warehouse management' },
  { name: 'Administration', code: 'ADMIN', description: 'Administrative operations' },
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Department.deleteMany({});
    await User.deleteMany({});
    console.log('Cleared existing data');

    // Create departments
    const createdDepts = await Department.insertMany(departments);
    console.log(`Created ${createdDepts.length} departments`);

    // Create HR admin
    const admin = await User.create({
      name: 'HR Admin',
      email: 'admin@tvs.com',
      password: 'admin123',
      role: 'hr',
      employeeId: 'TVS-HR-001',
      phone: '9876543210',
      designation: 'HR Manager',
      dateOfJoining: new Date('2020-01-01'),
    });
    console.log(`Created HR Admin: ${admin.email}`);

    // Create sample supervisors
    const sup1 = await User.create({
      name: 'Rajesh Kumar',
      email: 'rajesh@tvs.com',
      password: 'super123',
      role: 'supervisor',
      department: createdDepts[0]._id,
      employeeId: 'TVS-SUP-001',
      phone: '9876543211',
      designation: 'Production Supervisor',
      dateOfJoining: new Date('2021-03-15'),
    });

    const sup2 = await User.create({
      name: 'Priya Sharma',
      email: 'priya@tvs.com',
      password: 'super123',
      role: 'supervisor',
      department: createdDepts[1]._id,
      employeeId: 'TVS-SUP-002',
      phone: '9876543212',
      designation: 'Quality Supervisor',
      dateOfJoining: new Date('2021-06-10'),
    });
    console.log('Created 2 supervisors');

    // Create sample workers
    const workerData = [
      { name: 'Arun M', email: 'arun@tvs.com', dept: 0, id: 'TVS-W-001' },
      { name: 'Karthik S', email: 'karthik@tvs.com', dept: 0, id: 'TVS-W-002' },
      { name: 'Divya R', email: 'divya@tvs.com', dept: 0, id: 'TVS-W-003' },
      { name: 'Suresh P', email: 'suresh@tvs.com', dept: 1, id: 'TVS-W-004' },
      { name: 'Lakshmi K', email: 'lakshmi@tvs.com', dept: 1, id: 'TVS-W-005' },
      { name: 'Vijay T', email: 'vijay@tvs.com', dept: 2, id: 'TVS-W-006' },
    ];

    for (const w of workerData) {
      await User.create({
        name: w.name, email: w.email, password: 'worker123', role: 'worker',
        department: createdDepts[w.dept]._id, employeeId: w.id,
        phone: '9876500' + w.id.slice(-3), designation: 'Worker',
        dateOfJoining: new Date('2022-01-01'),
      });
    }
    console.log(`Created ${workerData.length} workers`);

    console.log('\n✅ Seed completed successfully!');
    console.log('\nLogin Credentials:');
    console.log('HR Admin: admin@tvs.com / admin123');
    console.log('Supervisor: rajesh@tvs.com / super123');
    console.log('Worker: arun@tvs.com / worker123');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedDB();
