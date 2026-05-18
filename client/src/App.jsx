import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ManageUsers from './pages/ManageUsers';
import ManageDepartments from './pages/ManageDepartments';
import MarkAttendance from './pages/MarkAttendance';
import AttendanceReport from './pages/AttendanceReport';
import ShiftSchedule from './pages/ShiftSchedule';

const AppRoutes = () => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <Login />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/users" element={<ProtectedRoute roles={['hr']}><ManageUsers /></ProtectedRoute>} />
        <Route path="/departments" element={<ProtectedRoute roles={['hr']}><ManageDepartments /></ProtectedRoute>} />
        <Route path="/attendance/mark" element={<ProtectedRoute roles={['supervisor']}><MarkAttendance /></ProtectedRoute>} />
        <Route path="/attendance/report" element={<ProtectedRoute roles={['hr', 'supervisor', 'worker']}><AttendanceReport /></ProtectedRoute>} />
        <Route path="/shifts" element={<ProtectedRoute roles={['hr', 'supervisor']}><ShiftSchedule /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <Toaster position="top-right" toastOptions={{ style: { background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' } }} />
      <AppRoutes />
    </AuthProvider>
  </BrowserRouter>
);

export default App;
