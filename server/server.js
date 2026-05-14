const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/departments', require('./routes/departmentRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'TVS Attendance API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;


if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/dist"), {
    maxAge: '1d', // Cache static assets for 1 day
    etag: false
  }));


  app.get(/.*/, (req, res) => {
    res.sendFile(path.resolve(__dirname, "../client/dist/index.html"));
  });

}


app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
