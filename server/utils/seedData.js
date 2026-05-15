const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const Department = require('../models/Department');
const Attendance = require('../models/Attendance');

const departments = [
  { name: 'Production', code: 'PROD', description: 'Manufacturing and production operations' },
  { name: 'Quality', code: 'QA', description: 'Quality assurance and control' },
  { name: 'Logistics', code: 'LOG', description: 'Supply chain and logistics management' },
  { name: 'Maintenance', code: 'MAINT', description: 'Equipment maintenance and repair' },
  { name: 'Stores', code: 'STR', description: 'Inventory and warehouse management' },
  { name: 'Administration', code: 'ADMIN', description: 'Administrative operations' },
];

const firstNames = ['Arun', 'Karthik', 'Divya', 'Suresh', 'Lakshmi', 'Vijay', 'Rahul', 'Priya', 'Sneha', 'Manoj', 'Anand', 'Kavita', 'Ramesh', 'Swathi', 'Dinesh', 'Deepa', 'Balaji', 'Meena', 'Prabhu', 'Nithya', 'Ganesh', 'Saranya', 'Ashok', 'Anitha', 'Prakash', 'Ramya'];
const lastNames = ['M', 'S', 'R', 'P', 'K', 'T', 'V', 'N', 'A', 'D', 'C', 'L', 'G', 'B'];

const makeName = () => {
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${first} ${last}`;
};

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    // await Department.deleteMany({});
    // await User.deleteMany({});
    await Attendance.deleteMany({});
    console.log('Cleared existing data');

    // Create departments
    // const createdDepts = await Department.insertMany(departments);
    // console.log(`Created ${createdDepts.length} departments`);

    // // Create HR admin
    // const admin = await User.create({
    //   name: 'HR Admin',
    //   email: 'admin@tvs.com',
    //   password: 'admin123',
    //   role: 'hr',
    //   employeeId: 'TVS-HR-001',
    //   phone: '9876543210',
    //   designation: 'HR Manager',
    //   dateOfJoining: new Date('2020-01-01'),
    // });

    // // Create a supervisor
    // const supervisor = await User.create({
    //   name: 'Rajesh Kumar',
    //   email: 'rajesh@tvs.com',
    //   password: 'super123',
    //   role: 'supervisor',
    //   department: createdDepts[0]._id,
    //   employeeId: 'TVS-SUP-001',
    //   phone: '9876543211',
    //   designation: 'Production Supervisor',
    //   dateOfJoining: new Date('2021-03-15'),
    // });

    // // Generate Workers (5 to 10 per dept)
    // let allWorkers = [];
    // let workerCounter = 1;
    // for (const dept of createdDepts) {
    //   const numWorkers = Math.floor(Math.random() * 6) + 5; // 5 to 10
    //   for (let i = 1; i <= numWorkers; i++) {
    //     const empId = `TVS-W-${String(workerCounter).padStart(3, '0')}`;
    //     const w = await User.create({
    //       name: makeName(i, dept.code),
    //       email: `worker${workerCounter}@tvs.com`,
    //       password: 'worker123',
    //       role: 'worker',
    //       department: dept._id,
    //       employeeId: empId,
    //       phone: `9876500${String(workerCounter).padStart(3, '0')}`,
    //       designation: 'Worker',
    //       dateOfJoining: new Date('2022-01-01'),
    //     });
    //     allWorkers.push(w);
    //     workerCounter++;
    //   }
    // }
    // console.log(`Created ${allWorkers.length} workers across ${createdDepts.length} departments`);

    // if (allWorkers.length > 0) {
    //   allWorkers[0].email = 'arun@tvs.com';
    //   allWorkers[0].name = 'Arun M';
    //   await allWorkers[0].save();
    // }

    // // Generate 30 days of attendance
    // const today = new Date();
    // today.setHours(0, 0, 0, 0);
    // const attendanceRecords = [];

    // for (let i = 30; i >= 0; i--) {
    //   const currentDate = new Date(today);
    //   currentDate.setDate(today.getDate() - i);
    //   const isSunday = currentDate.getDay() === 0;

    //   for (const w of allWorkers) {
    //     let status = 'general';
    //     let absentType = undefined;
    //     let otHours = 0;

    //     if (isSunday) {
    //       status = 'holiday';
    //     } else {
    //       const rand = Math.random();
    //       if (rand < 0.7) status = 'general';
    //       else if (rand < 0.8) status = '1st_shift';
    //       else if (rand < 0.9) status = '2nd_shift';
    //       else status = 'AA';
    //     }

    //     if (status === 'AA') {
    //       absentType = Math.random() > 0.5 ? 'informed' : 'without_inform';
    //     }

    //     attendanceRecords.push({
    //       worker: w._id,
    //       date: currentDate,
    //       status,
    //       absentType,
    //       otHours: 0,
    //       markedBy: supervisor._id,
    //       department: w.department,
    //     });
    //   }
    // }

    // // Batch insert attendance
    // const batchSize = 500;
    // for (let i = 0; i < attendanceRecords.length; i += batchSize) {
    //   const batch = attendanceRecords.slice(i, i + batchSize);
    //   await Attendance.insertMany(batch);
    // }
    // console.log(`Created ${attendanceRecords.length} attendance records for the past 30 days.`);

    // console.log('\n✅ Seed completed successfully!');
    // console.log('\nLogin Credentials:');
    // console.log('HR Admin: admin@tvs.com / admin123');
    // console.log('Supervisor: rajesh@tvs.com / super123');
    // console.log('Worker: arun@tvs.com / worker123');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedDB();
