import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HiOutlineHome, HiOutlineUsers, HiOutlineOfficeBuilding, HiOutlineClipboardCheck, HiOutlineDocumentReport, HiOutlineClock, HiOutlineLogout } from 'react-icons/hi';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout, isHR, isSupervisor } = useAuth();

  const navItems = [];

  navItems.push({ to: '/', label: 'Dashboard', icon: <HiOutlineHome className="icon" /> });

  if (isHR()) {
    navItems.push(
      { to: '/users', label: 'Manage Users', icon: <HiOutlineUsers className="icon" /> },
      { to: '/departments', label: 'Departments', icon: <HiOutlineOfficeBuilding className="icon" /> }
    );
  }

  if (isSupervisor()) {
    navItems.push(
      { to: '/attendance/mark', label: 'Mark Attendance', icon: <HiOutlineClipboardCheck className="icon" /> }
    );
  }

  if (isHR() || isSupervisor()) {
    navItems.push({ to: '/shifts', label: 'Shift Schedule', icon: <HiOutlineClock className="icon" /> });
  }

  navItems.push({ to: '/attendance/report', label: 'Reports', icon: <HiOutlineDocumentReport className="icon" /> });

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'show' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">T</div>
          <div className="sidebar-title">
            <h2>TVS Attendance</h2>
            <span>Management System</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-label">Navigation</div>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className={`user-avatar ${user?.role}`}>{initials}</div>
            <div className="user-info">
              <div className="name">{user?.name}</div>
              <div className="role">{user?.role}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>
            <HiOutlineLogout /> Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
