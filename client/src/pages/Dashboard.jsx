import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import API from '../api/axios';
import { HiOutlineUsers, HiOutlineClipboardCheck, HiOutlineOfficeBuilding, HiOutlineExclamationCircle, HiOutlineCheckCircle, HiOutlineClock, HiOutlineSearch, HiOutlineBell, HiOutlinePhone } from 'react-icons/hi';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

const Dashboard = () => {
  const { user, isHR, isSupervisor, isWorker } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [absentFilter, setAbsentFilter] = useState('without_inform');
  const [lookupResults, setLookupResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [shiftPending, setShiftPending] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchShiftPending();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        handleLookup(searchQuery);
      } else {
        setLookupResults([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleLookup = async (q) => {
    setIsSearching(true);
    try {
      const { data } = await API.get('/attendance/lookup', { params: { q } });
      setLookupResults(data.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const fetchStats = async () => {
    try {
      if (isWorker()) {
        const { data } = await API.get('/attendance/my-history', { params: { year: new Date().getFullYear(), month: new Date().getMonth() + 1 } });
        const att = data.attendance || [];
        setStats({
          totalDays: att.length,
          present: att.filter(a => ['1st_shift', '2nd_shift', 'general', 'OT'].includes(a.status)).length,
          absent: att.filter(a => a.status === 'AA').length,
          otDays: att.filter(a => a.status === 'OT').length,
        });
      } else {
        const { data } = await API.get('/attendance/stats');
        setStats(data.stats);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchShiftPending = async () => {
    try {
      const deptId = isSupervisor() ? user.department?._id : '';
      const { data } = await API.get(`/shifts/pending`, { params: { department: deptId } });
      setShiftPending(data.pending);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  const pieData = stats && !isWorker() ? [
    { name: 'Present', value: stats.todayPresent, color: '#10B981' }, // Professional Green
    { name: 'Absent', value: stats.todayAbsent, color: '#EF4444' },  // Professional Red
    { name: 'C-Off', value: stats.todayCOff || 0, color: '#F59E0B' },   // Professional Amber
    { name: 'Unmarked', value: stats.unmarked || 0, color: '#94A3B8' }, // Neutral Slate
  ].filter(d => d.value > 0) : [];

  const barData = stats?.deptChartData || [];

  const renderDashboardCards = () => (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon primary"><HiOutlineUsers /></div>
        <div className="stat-value">{stats.totalWorkers}</div>
        <div className="stat-label">{isHR() ? 'Total Workers' : 'Department Workers'}</div>
      </div>
      <div className="stat-card">
        <div className="stat-icon success"><HiOutlineCheckCircle /></div>
        <div className="stat-value">{stats.todayPresent}</div>
        <div className="stat-label">Present Today</div>
      </div>
      <div className="stat-card">
        <div className="stat-icon danger"><HiOutlineExclamationCircle /></div>
        <div className="stat-value">{stats.todayAbsent}</div>
        <div className="stat-label">Absent Today</div>
      </div>
      {isSupervisor() && (
        <div className="stat-card">
          <div className="stat-icon warning"><HiOutlineClock /></div>
          <div className="stat-value">{stats.unmarked}</div>
          <div className="stat-label">Unmarked</div>
        </div>
      )}
      {isHR() && (
        <div className="stat-card">
          <div className="stat-icon info"><HiOutlineOfficeBuilding /></div>
          <div className="stat-value">{stats.totalDepartments}</div>
          <div className="stat-label">Departments</div>
        </div>
      )}
    </div>
  );

  const renderVisualsAndList = () => (
    <>
      {/* Pending Alerts */}
      {(shiftPending || (stats.pendingAlerts && stats.pendingAlerts.length > 0)) && (
        <div style={{ marginBottom: 20 }}>
          {shiftPending && (
            <Link
              to="/shifts"
              className="alert-card alert-warning"
              style={{ textDecoration: 'none', display: 'flex', transition: 'var(--transition)', marginBottom: 10 }}
            >
              <HiOutlineBell style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ display: 'block', marginBottom: 2 }}>Action Required</strong>
                <span>Next week shift schedule is pending. Please complete that.</span>
              </div>
            </Link>
          )}
          {stats.pendingAlerts && stats.pendingAlerts.map(alert => (
            <Link
              key={alert.id}
              to={alert.id === 'a1' ? '/attendance/report' : '/attendance/mark'}
              className={`alert-card alert-${alert.type}`}
              style={{ textDecoration: 'none', display: 'flex', transition: 'var(--transition)', marginBottom: 5 }}
            >
              <HiOutlineBell style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ display: 'block', marginBottom: 2 }}>Action Required</strong>
                <span>{alert.message}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Snapshot cards above charts */}
      {isHR() && (
        <div className="dash-snapshot-grid">
          <div className="glass-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80', width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏆</div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Top Department</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{stats.topDept ? stats.topDept.name : 'N/A'} <span style={{ color: '#4ade80', fontSize: 12 }}>({stats.topDept ? stats.topDept.rate : 0}%)</span></div>
            </div>
          </div>
          <div className="glass-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>⚠️</div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Lowest Attendance</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{stats.bottomDept ? stats.bottomDept.name : 'N/A'} <span style={{ color: '#f87171', fontSize: 12 }}>({stats.bottomDept ? stats.bottomDept.rate : 0}%)</span></div>
            </div>
          </div>
        </div>
      )}

      <div className="dash-charts-grid">

        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-card dash-chart-card">
            <div className="dash-chart-header">
              <h3 style={{ margin: 0, fontSize: 16 }}>Overall Attendance</h3>
              <div className="dash-chart-stats">
                <span>Total: <strong>{stats.totalWorkers}</strong></span>
                <span style={{ color: '#00E396' }}>P: <strong>{stats.todayPresent}</strong></span>
                <span style={{ color: '#FF4560' }}>A: <strong>{stats.todayAbsent}</strong></span>
                <span style={{ color: '#FEB019' }}>CO: <strong>{stats.todayCOff || 0}</strong></span>
                <span style={{ color: '#737F94' }}>UM: <strong>{stats.unmarked}</strong></span>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: '320px', height: '240px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius="50%" outerRadius="75%" paddingAngle={5} dataKey="value">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8 }} itemStyle={{ color: 'var(--text-primary)' }} />
                    <Legend verticalAlign="bottom" height={48} wrapperStyle={{ paddingTop: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {stats.trendData && (
            <div className="glass-card" style={{ height: 280 }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: 16 }}>7-Day Attendance Trend</h3>
              <div style={{ overflowX: 'auto' }}>
                <div style={{ minWidth: '400px', height: '220px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="displayDate" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                      <RechartsTooltip contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8 }} />
                      <Area type="monotone" dataKey="present" name="Present" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorPresent)" />
                      <Area type="monotone" dataKey="absent" name="Absent" stroke="#EF4444" strokeWidth={3} fillOpacity={1} fill="url(#colorAbsent)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          <div className="glass-card">
            <div className="dash-absent-header">
              <h3 style={{ margin: 0, fontSize: 16 }}>Today's Absent List</h3>
              <div style={{ display: 'flex', gap: 5 }}>
                <button
                  onClick={() => setAbsentFilter('without_inform')}
                  style={{ padding: '4px 8px', fontSize: 11, borderRadius: 4, cursor: 'pointer', border: '1px solid var(--border)', background: absentFilter === 'without_inform' ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: absentFilter === 'without_inform' ? '#fca5a5' : 'var(--text-secondary)' }}
                >
                  W/O Inform
                </button>
                <button
                  onClick={() => setAbsentFilter('informed')}
                  style={{ padding: '4px 8px', fontSize: 11, borderRadius: 4, cursor: 'pointer', border: '1px solid var(--border)', background: absentFilter === 'informed' ? 'rgba(59, 130, 246, 0.2)' : 'transparent', color: absentFilter === 'informed' ? '#93c5fd' : 'var(--text-secondary)' }}
                >
                  Informed
                </button>
                <button
                  onClick={() => setAbsentFilter('overall')}
                  style={{ padding: '4px 8px', fontSize: 11, borderRadius: 4, cursor: 'pointer', border: '1px solid var(--border)', background: absentFilter === 'overall' ? 'rgba(255, 255, 255, 0.1)' : 'transparent', color: absentFilter === 'overall' ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                >
                  Overall
                </button>
              </div>
            </div>

            {(() => {
              const filteredList = (stats.absentList || []).filter(a => {
                if (absentFilter === 'overall') return true;
                if (absentFilter === 'without_inform') return a.absentType === 'without_inform' || !a.absentType;
                if (absentFilter === 'informed') return a.absentType === 'informed';
                return true;
              });

              return filteredList.length > 0 ? (
                <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '250px' }}>
                  <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '10px 5px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>Name</th>
                        <th style={{ padding: '10px 5px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>Dept</th>
                        <th style={{ padding: '10px 5px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>Mobile</th>
                        <th style={{ padding: '10px 5px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredList.map((record) => (
                        <tr key={record._id}>
                          <td style={{ padding: '10px 5px', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>{record.worker?.name}</td>
                          <td style={{ padding: '10px 5px', borderBottom: '1px solid var(--border)', fontSize: 12 }}>{record.department?.name}</td>
                          <td style={{ padding: '10px 5px', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                            {record.worker?.phone ? (
                              <a href={`tel:${record.worker.phone}`} style={{ color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <HiOutlinePhone size={12} /> {record.worker.phone}
                              </a>
                            ) : '—'}
                          </td>
                          <td style={{ padding: '10px 5px', borderBottom: '1px solid var(--border)' }}>
                            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: record.absentType === 'informed' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: record.absentType === 'informed' ? '#93c5fd' : '#fca5a5' }}>
                              {record.absentType === 'informed' ? 'Informed' : 'W/O Inform'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', margin: '20px 0' }}>
                  {absentFilter === 'without_inform' ? 'No unauthorized absentees today! 🎉' : 'No absentees found for this filter.'}
                </p>
              );
            })()}
          </div>

          <div className="glass-card">
            <h3 style={{ marginTop: 0, marginBottom: 15, fontSize: 16 }}>Department Breakdown</h3>
            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: '400px', height: '220px', marginBottom: 20 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <RechartsTooltip cursor={{ fill: 'var(--hover-bg)' }} contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="present" stackId="a" fill="#10B981" name="Present" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="cOff" stackId="a" fill="#F59E0B" name="C-Off" />
                    <Bar dataKey="absent" stackId="a" fill="#EF4444" name="Absent" />
                    <Bar dataKey="unmarked" stackId="a" fill="#94A3B8" name="Unmarked" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px 5px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>Department</th>
                    <th style={{ padding: '8px 5px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>Total</th>
                    <th style={{ padding: '8px 5px', borderBottom: '1px solid var(--border)', color: '#00E396' }}>Present</th>
                    <th style={{ padding: '8px 5px', borderBottom: '1px solid var(--border)', color: '#FF4560' }}>Absent</th>
                    <th style={{ padding: '8px 5px', borderBottom: '1px solid var(--border)', color: '#FEB019' }}>C-Off</th>
                    <th style={{ padding: '8px 5px', borderBottom: '1px solid var(--border)', color: '#737F94' }}>Unmarked</th>
                  </tr>
                </thead>
                <tbody>
                  {barData.map(dept => {
                    return (
                      <tr key={dept.name}>
                        <td style={{ padding: '8px 5px', borderBottom: '1px solid var(--border)' }}>{dept.name}</td>
                        <td style={{ padding: '8px 5px', borderBottom: '1px solid var(--border)' }}><strong>{dept.total || 0}</strong></td>
                        <td style={{ padding: '8px 5px', borderBottom: '1px solid var(--border)' }}>{dept.present || 0}</td>
                        <td style={{ padding: '8px 5px', borderBottom: '1px solid var(--border)' }}>{dept.absent || 0}</td>
                        <td style={{ padding: '8px 5px', borderBottom: '1px solid var(--border)' }}>{dept.cOff || 0}</td>
                        <td style={{ padding: '8px 5px', borderBottom: '1px solid var(--border)' }}>{dept.unmarked || 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </>
  );

  return (
    <>
      <div className="page-header dash-page-header">
        <div>
          <h1 className="welcome-text">Welcome, {user?.name?.split(' ')[0]} 👋</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>{isHR() ? 'HR Admin Dashboard' : isSupervisor() ? `Supervisor — ${user?.department?.name || ''}` : 'Your Attendance Overview'}</p>
        </div>

        {/* QUICK LOOKUP */}
        {!isWorker() && (
          <div className="lookup-container">
            <HiOutlineSearch className="lookup-icon" />
            <input
              type="text"
              className="lookup-input"
              placeholder="Quick search worker..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery.length >= 2 && (
              <div className="lookup-dropdown">
                {isSearching ? (
                  <div className="lookup-item" style={{ justifyContent: 'center', color: 'var(--text-muted)' }}>Searching...</div>
                ) : lookupResults.length > 0 ? (
                  lookupResults.map(w => (
                    <div key={w._id} className="lookup-item">
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{w.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{w.employeeId} • {w.department}</div>
                      </div>
                      <div className={`badge ${w.status === 'Unmarked' ? 'badge-hr' : w.status === 'AA' ? 'badge-aa' : 'badge-worker'}`} style={{ opacity: w.status === 'Unmarked' ? 0.6 : 1 }}>
                        {w.status}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="lookup-item" style={{ justifyContent: 'center', color: 'var(--text-muted)' }}>No workers found</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="page-content">

        {/* HR Dashboard */}
        {isHR() && stats && (
          <>
            {renderDashboardCards()}
            <div className="stats-grid dash-action-grid">
              <Link to="/users" className="action-banner">
                <div className="action-banner-content">
                  <div className="action-banner-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}><HiOutlineUsers /></div>
                  <div>
                    <div className="action-banner-title">Manage Users</div>
                    <div className="action-banner-subtitle">Add or edit employee details</div>
                  </div>
                </div>
                <div className="action-banner-arrow">→</div>
              </Link>
              <Link to="/attendance/report" className="action-banner">
                <div className="action-banner-content">
                  <div className="action-banner-icon" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}><HiOutlineClipboardCheck /></div>
                  <div>
                    <div className="action-banner-title">View Reports</div>
                    <div className="action-banner-subtitle">Detailed attendance analytics</div>
                  </div>
                </div>
                <div className="action-banner-arrow">→</div>
              </Link>
            </div>
            {renderVisualsAndList()}
          </>
        )}

        {/* Supervisor Dashboard */}
        {isSupervisor() && stats && (
          <>
            {renderDashboardCards()}
            {renderVisualsAndList()}
            <Link to="/attendance/mark" className="btn btn-primary" style={{ marginTop: 20 }}>
              <HiOutlineClipboardCheck /> Mark Today's Attendance
            </Link>
          </>
        )}

        {/* Worker Dashboard */}
        {isWorker() && stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon primary"><HiOutlineClipboardCheck /></div>
              <div className="stat-value">{stats.totalDays}</div>
              <div className="stat-label">Days This Month</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon success"><HiOutlineCheckCircle /></div>
              <div className="stat-value">{stats.present}</div>
              <div className="stat-label">Present</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon danger"><HiOutlineExclamationCircle /></div>
              <div className="stat-value">{stats.absent}</div>
              <div className="stat-label">Absent</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon warning"><HiOutlineClock /></div>
              <div className="stat-value">{stats.otDays}</div>
              <div className="stat-label">OT Days</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Dashboard;
