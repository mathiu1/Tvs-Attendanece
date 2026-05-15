import { useState, useEffect, useMemo } from 'react';
import API from '../api/axios';
import { HiOutlineDocumentReport, HiOutlineDownload } from 'react-icons/hi';
import CustomSelect from '../components/CustomSelect';
import toast, { Toaster } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { exportAttendancePDF } from '../utils/exportPDF';

const STATUS_SHORT = {
  '1st_shift': '1st',
  '2nd_shift': '2nd',
  general: 'G',
  AA: 'AA',
  'C-off': 'CO',
  OT: 'OT',
  holiday: 'H',
};

const STATUS_LABELS = {
  '1st_shift': '1st Shift',
  '2nd_shift': '2nd Shift',
  general: 'General',
  AA: 'Absent',
  'C-off': 'C-Off',
  OT: 'Overtime',
  holiday: 'Holiday',
};

const STATUS_COLOR = {
  '1st_shift': { bg: 'rgba(59,130,246,0.18)', color: '#60a5fa' },
  '2nd_shift': { bg: 'rgba(168,85,247,0.18)', color: '#c084fc' },
  general: { bg: 'rgba(20,184,166,0.18)', color: '#2dd4bf' },
  AA: { bg: 'rgba(239,68,68,0.18)', color: '#f87171' },
  'C-off': { bg: 'rgba(245,158,11,0.18)', color: '#fbbf24' },
  OT: { bg: 'rgba(249,115,22,0.18)', color: '#fb923c' },
  holiday: { bg: 'rgba(6,182,212,0.18)', color: '#22d3ee' },
};

const AttendanceReport = () => {
  const { isHR, isSupervisor, isWorker } = useAuth();
  const [records, setRecords] = useState([]);
  const [allWorkers, setAllWorkers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedDept, setSelectedDept] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCell, setSelectedCell] = useState(null);
  const [editStatus, setEditStatus] = useState('');
  const [editOtHours, setEditOtHours] = useState('');
  const [editRemarks, setEditRemarks] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const [holidayConfirmDate, setHolidayConfirmDate] = useState(null);

  const isReadOnly = useMemo(() => {
    if (!selectedCell) return false;
    if (isWorker()) return true;

    const cellDateStr = selectedCell.date; // format is YYYY-MM-DD
    if (!cellDateStr) return true; // Safety

    const [y, m, d] = cellDateStr.split('-').map(Number);
    const cellDate = new Date(y, m - 1, d);
    cellDate.setHours(0,0,0,0);
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    if (isSupervisor()) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return !(cellDate.getTime() === today.getTime() || cellDate.getTime() === yesterday.getTime());
    }

    if (isHR()) {
      const tenDaysAgo = new Date(today);
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      return cellDate.getTime() < tenDaysAgo.getTime();
    }
    
    return false;
  }, [selectedCell, isWorker, isSupervisor, isHR]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [month, year, selectedDept]);

  const fetchDepartments = async () => {
    try {
      const { data } = await API.get('/departments?isActive=true');
      setDepartments(data.departments);
    } catch (err) {
      console.error(err);
    }
  };

  const formatYMD = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const startDateObj = new Date(year, month - 2, 21);
      const endDateObj = new Date(year, month - 1, 20);
      const startDate = formatYMD(startDateObj);
      const endDate = formatYMD(endDateObj);
      
      const params = { startDate, endDate };
      const workerParams = { role: 'worker', isActive: true };
      
      if (selectedDept) {
        params.department = selectedDept;
        workerParams.department = selectedDept;
      }
      
      const [reportRes, workersRes] = await Promise.all([
        API.get('/attendance/report', { params }),
        API.get('/users', { params: workerParams }),
      ]);
      
      setRecords(reportRes.data.attendance);
      setAllWorkers(workersRes.data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Generate array of Date objects for the 21-to-20 range
  const dates = useMemo(() => {
    const arr = [];
    let curr = new Date(year, month - 2, 21);
    const end = new Date(year, month - 1, 20);
    while (curr <= end) {
      arr.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }
    return arr;
  }, [year, month]);

  // Helpers that now take a Date object
  const getDayName = (dateObj) => dateObj.toLocaleDateString('en', { weekday: 'short' });
  const isSunday = (dateObj) => dateObj.getDay() === 0;
  const isToday = (dateObj) => {
    const now = new Date();
    return (
      now.getFullYear() === dateObj.getFullYear() &&
      now.getMonth() === dateObj.getMonth() &&
      now.getDate() === dateObj.getDate()
    );
  };

  const isDateEditable = (dateObj) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const checkDate = new Date(dateObj);
    checkDate.setHours(0, 0, 0, 0);

    if (checkDate > now) return false;

    if (isSupervisor()) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return checkDate >= yesterday;
    }

    if (isHR()) {
      const tenDaysAgo = new Date(now);
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      return checkDate >= tenDaysAgo;
    }

    return false; // Workers or others
  };

  const isFutureDate = (dateObj) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const checkDate = new Date(dateObj);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate > now;
  };

  // Build grid data: group records by worker, then by date
  const gridData = useMemo(() => {
    const workerMap = {};

    // 1. Initialize map with ALL active workers
    allWorkers.forEach((w) => {
      const wId = w._id;
      workerMap[wId] = {
        id: wId,
        name: w.name || 'Unknown',
        employeeId: w.employeeId || '',
        department: w.department?.name || '',
        role: w.role || '',
        days: {},
      };
    });

    // 2. Populate attendance records
    records.forEach((r) => {
      if (!r.worker) return;
      const wId = r.worker._id || r.worker;
      if (!workerMap[wId]) {
        // Fallback if an inactive worker has a record in this period
        workerMap[wId] = {
          id: wId,
          name: r.worker.name || 'Unknown',
          employeeId: r.worker.employeeId || '',
          department: r.department?.name || '',
          role: r.worker.role || '',
          days: {},
        };
      }
      const dateObj = new Date(r.date);
      const dateKey = formatYMD(dateObj);
      workerMap[wId].days[dateKey] = {
        _id: r._id,
        status: r.status,
        otHours: r.otHours,
        remarks: r.remarks,
        markedBy: r.markedBy?.name,
        otMarkedBy: r.otMarkedBy?.name,
        date: r.date,
        workerId: wId,
        workerName: workerMap[wId].name,
      };
    });

    // Compute per-worker summary counts
    const workers = Object.values(workerMap);
    workers.forEach((w) => {
      const entries = Object.values(w.days);
      w.presentCount = entries.filter((d) => ['1st_shift', '2nd_shift', 'general'].includes(d.status)).length;
      w.absentCount = entries.filter((d) => d.status === 'AA').length;
      w.otCount = entries.filter((d) => (d.otHours || 0) > 0).length;
      w.totalOtHours = entries.reduce((sum, d) => sum + (d.otHours || 0), 0);
    });

    return workers.sort((a, b) => a.name.localeCompare(b.name));
  }, [records, allWorkers]);

  // Filter by search
  const filteredData = useMemo(() => {
    if (!search.trim()) return gridData;
    const q = search.toLowerCase();
    return gridData.filter((w) =>
      w.name.toLowerCase().includes(q) || w.employeeId.toLowerCase().includes(q)
    );
  }, [gridData, search]);

  const startDateObj = new Date(year, month - 2, 21);
  const endDateObj = new Date(year, month - 1, 20);
  const reportPeriodTitle = `${startDateObj.toLocaleDateString('en-IN', { month: 'long' })} 21 to ${endDateObj.toLocaleDateString('en-IN', { month: 'long' })} 20, ${endDateObj.getFullYear()}`;

  const handleExportPDF = () => {
    if (filteredData.length === 0) {
      toast.error('No data to export');
      return;
    }
    try {
      const deptName = selectedDept
        ? departments.find(d => d._id === selectedDept)?.name || 'Selected'
        : 'All Departments';
      exportAttendancePDF({
        workers: filteredData,
        dates,
        reportPeriodTitle,
        departmentName: deptName,
      });
      toast.success('PDF downloaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF');
    }
  };

  const handleCellClick = (entry, dateObj, worker) => {
    if (!isDateEditable(dateObj)) {
      if (isFutureDate(dateObj)) {
        toast.error('Cannot select future dates');
      } else {
        toast.error(isSupervisor() ? 'Supervisors can only update today and yesterday' : 'HR can only update attendance for the last 10 days');
      }
      return;
    }
    if (entry) {
      setSelectedCell({ 
        ...entry, 
        date: formatYMD(dateObj),
        displayDate: dateObj.toLocaleDateString('en-IN') 
      });
      setEditStatus(entry.status);
      setEditOtHours(entry.otHours || '');
      setEditRemarks(entry.remarks || '');
    } else {
      setSelectedCell({
        isNew: true,
        workerId: worker.id,
        workerName: worker.name,
        date: formatYMD(dateObj),
        displayDate: dateObj.toLocaleDateString('en-IN')
      });
      setEditStatus('');
      setEditOtHours('');
      setEditRemarks('');
    }
  };

  const handleHeaderClick = (dateObj) => {
    if (!isDateEditable(dateObj)) {
      toast.error(isSupervisor() ? 'Supervisors can only update today and yesterday' : 'HR can only update attendance for the last 10 days');
      return;
    }
    setHolidayConfirmDate(dateObj);
  };

  const markHolidayForAll = async () => {
    if (!holidayConfirmDate) return;
    setIsUpdating(true);
    try {
      const dateStr = formatYMD(holidayConfirmDate);
      
      // Only mark holiday for workers who DON'T have an existing record for this date
      const workersToMark = filteredData.filter(worker => !worker.days[dateStr]);

      if (workersToMark.length === 0) {
        toast.info('All workers already have records for this date. No changes made.');
        setHolidayConfirmDate(null);
        return;
      }

      const recordsToMark = workersToMark.map(worker => ({
        workerId: worker.id,
        date: dateStr,
        status: 'holiday',
        otHours: 0,
        remarks: 'Public Holiday'
      }));
      
      await API.post('/attendance/mark', { records: recordsToMark });
      toast.success(`Marked as holiday for all workers`);
      setHolidayConfirmDate(null);
      fetchReport();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark holiday');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleModalSave = async () => {
    if (!editStatus) { toast.error('Status is required'); return; }
    setIsUpdating(true);
    try {
      if (selectedCell.isNew) {
        const toSubmit = [{
          workerId: selectedCell.workerId,
          date: selectedCell.date,
          status: editStatus,
          otHours: Number(editOtHours || 0),
          remarks: editRemarks || '',
        }];
        await API.post('/attendance/mark', { records: toSubmit });
      } else {
        await API.put(`/attendance/${selectedCell._id}`, {
          status: editStatus,
          otHours: Number(editOtHours || 0),
          remarks: editRemarks || '',
        });
      }
      toast.success('Record saved successfully!');
      setSelectedCell(null);
      fetchReport();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <Toaster position="top-right" toastOptions={{ style: { background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' } }} />
      <div className="page-header">
        <h1>Attendance Reports</h1>
        <p>Attendance for {reportPeriodTitle}</p>
      </div>
      <div className="page-content">
        {/* Filters */}
        <div className="filters-bar">
          {isHR() && (
            <div className="filter-group">
              <label>Department</label>
              <CustomSelect
                size="small"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                placeholder="All Departments"
                options={[
                  { value: '', label: 'All Departments' },
                  ...departments.map((d) => ({ value: d._id, label: d.name })),
                ]}
              />
            </div>
          )}
          <div className="filter-group">
            <label>Month</label>
            <CustomSelect
              size="small"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              options={Array.from({ length: 12 }, (_, i) => ({
                value: i + 1,
                label: new Date(2000, i).toLocaleDateString('en', { month: 'long' }),
              }))}
            />
          </div>
          <div className="filter-group">
            <label>Year</label>
            <CustomSelect
              size="small"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              options={[2026, 2027, 2028, 2029, 2030].map((y) => ({
                value: y,
                label: String(y),
              }))}
            />
          </div>
        </div>

        {/* Search + Legend */}
        <div className="report-toolbar">
          <div className="report-search">
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <span className="report-search-count">{filteredData.length} found</span>
            )}
          </div>
          <button
            className="btn btn-primary pdf-export-btn"
            onClick={handleExportPDF}
            disabled={filteredData.length === 0 || loading}
            title="Export as PDF"
          >
            <HiOutlineDownload /> Export PDF
          </button>
          <div className="report-legend">
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <div key={key} className="legend-item" title={label}>
                <span
                  className="legend-dot"
                  style={{ background: STATUS_COLOR[key]?.color }}
                />
                <span className="legend-label">
                  {STATUS_SHORT[key]} — {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Grid Table */}
        {loading ? (
          <div className="spinner" />
        ) : filteredData.length === 0 ? (
          <div className="empty-state">
            <div className="icon">
              <HiOutlineDocumentReport />
            </div>
            <h3>No Attendance Data</h3>
            <p>No records found for {reportPeriodTitle}</p>
          </div>
        ) : (
          <>
            {/* Desktop Grid */}
            <div className="report-grid-wrapper">
              <div className="report-grid-scroll">
                <table className="report-grid-table">
                  <thead>
                    <tr>
                      <th className="report-sticky-col report-col-name">Employee</th>
                      <th className="report-sticky-col2 report-col-id">ID / Role</th>
                      <th className="report-sticky-col3 report-col-summary">P</th>
                      <th className="report-sticky-col4 report-col-summary">AB</th>
                      <th className="report-sticky-col5 report-col-summary">OT</th>
                      {dates.map((dateObj) => {
                        const dayKey = formatYMD(dateObj);
                        return (
                          <th
                            key={dayKey}
                            className={`report-col-day ${isSunday(dateObj) ? 'report-sunday' : ''} ${isToday(dateObj) ? 'report-today' : ''}`}
                            onClick={() => handleHeaderClick(dateObj)}
                            style={{ 
                              cursor: isDateEditable(dateObj) ? 'pointer' : 'default',
                              position: 'relative'
                            }}
                            title={isDateEditable(dateObj) ? 'Click to mark as Holiday for ALL' : ''}
                          >
                            <div className="day-header">
                              <span className="day-num">{dateObj.getDate()}</span>
                              <span className="day-name">{getDayName(dateObj)}</span>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((worker) => (
                      <tr key={worker.id}>
                        <td className="report-sticky-col report-col-name">
                          <div className="worker-cell">
                            <span className="worker-cell-name">{worker.name}</span>
                            {worker.department && (
                              <span className="worker-cell-dept">{worker.department}</span>
                            )}
                          </div>
                        </td>
                        <td className="report-sticky-col2 report-col-id">
                          <div className="worker-cell">
                            <span className="worker-cell-empid">{worker.employeeId}</span>
                            {worker.role && (
                              <span className="worker-cell-role">
                                {worker.role}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="report-sticky-col3 report-col-summary">
                          <span className="summary-count count-present">{worker.presentCount}</span>
                        </td>
                        <td className="report-sticky-col4 report-col-summary">
                          <span className="summary-count count-absent">{worker.absentCount}</span>
                        </td>
                        <td className="report-sticky-col5 report-col-summary">
                          <span className="summary-count count-ot" title={`${worker.otCount} days with OT`}>{worker.totalOtHours}h</span>
                        </td>
                        {dates.map((dateObj) => {
                          const dayKey = formatYMD(dateObj);
                          const entry = worker.days[dayKey];
                          return (
                            <td
                              key={dayKey}
                              className={`report-col-day ${isSunday(dateObj) ? 'report-sunday' : ''} ${isToday(dateObj) ? 'report-today' : ''}`}
                              onClick={() => handleCellClick(entry, dateObj, worker)}
                              style={{ 
                                cursor: isDateEditable(dateObj) ? 'pointer' : 'not-allowed', 
                                opacity: !isDateEditable(dateObj) && !entry ? 0.3 : 1 
                              }}
                              title={!isDateEditable(dateObj) ? 'View only' : 'Click to edit'}
                            >
                              {entry ? (
                                <span
                                  className="status-chip"
                                  style={{
                                    background: STATUS_COLOR[entry.status]?.bg,
                                    color: STATUS_COLOR[entry.status]?.color,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: entry.otHours > 0 ? '4px' : '0',
                                    padding: '3px 6px'
                                  }}
                                  title={`${STATUS_LABELS[entry.status]}${entry.otHours > 0 ? ` + ${entry.otHours}h OT` : ''}`}
                                >
                                  <span>{STATUS_SHORT[entry.status]}</span>
                                  {entry.otHours > 0 && (
                                    <span style={{
                                      color: '#fb923c',
                                      fontSize: '9px',
                                      fontWeight: 800,
                                      borderLeft: `1px solid ${STATUS_COLOR[entry.status]?.color}`,
                                      paddingLeft: '4px',
                                      lineHeight: 1
                                    }}>
                                      +{entry.otHours}h
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="status-empty">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards — one card per worker */}
            <div className="attendance-cards">
              {filteredData.map((worker) => {
                const statusCounts = {};
                Object.values(worker.days).forEach((d) => {
                  statusCounts[d.status] = (statusCounts[d.status] || 0) + 1;
                });
                const totalMarked = Object.values(worker.days).length;
                const presentCount = Object.entries(worker.days).filter(
                  ([, d]) => ['1st_shift', '2nd_shift', 'general'].includes(d.status)
                ).length;

                return (
                  <div key={worker.id} className="attendance-card-item">
                    <div className="worker-info">
                      <div
                        className="worker-avatar"
                        style={{ background: 'linear-gradient(135deg,var(--primary),#a855f7)' }}
                      >
                        {worker.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="worker-name">{worker.name}</div>
                        <div className="worker-id">
                          {worker.employeeId}
                          {worker.role && <span style={{ textTransform: 'capitalize' }}> • {worker.role}</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--success)', fontFamily: 'JetBrains Mono' }}>
                          {presentCount}/{dates.length}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Present</div>
                      </div>
                    </div>
                    {/* Mini status grid */}
                    <div className="mobile-month-grid">
                      {dates.map((dateObj) => {
                        const dayKey = formatYMD(dateObj);
                        const entry = worker.days[dayKey];
                        return (
                          <div
                            key={dayKey}
                            className={`mobile-day-cell ${isSunday(dateObj) ? 'sunday' : ''}`}
                            title={!isDateEditable(dateObj) ? (entry ? STATUS_LABELS[entry.status] : 'No data') : 'Click to edit'}
                            onClick={() => handleCellClick(entry, dateObj, worker)}
                            style={{ 
                              cursor: isDateEditable(dateObj) ? 'pointer' : 'not-allowed', 
                              opacity: !isDateEditable(dateObj) && !entry ? 0.3 : 1 
                            }}
                          >
                            <span className="mobile-day-num">{dateObj.getDate()}</span>
                            {entry ? (
                              <span
                                className="mobile-day-status"
                                style={{
                                  background: STATUS_COLOR[entry.status]?.bg,
                                  color: STATUS_COLOR[entry.status]?.color,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: entry.otHours > 0 ? '3px' : '0'
                                }}
                              >
                                <span>{STATUS_SHORT[entry.status]}</span>
                                {entry.otHours > 0 && (
                                  <span style={{
                                    color: '#fb923c',
                                    fontSize: '8px',
                                    borderLeft: `1px solid ${STATUS_COLOR[entry.status]?.color}`,
                                    paddingLeft: '3px',
                                  }}>
                                    +{entry.otHours}h
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="mobile-day-status empty">—</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {/* Summary row */}
                    <div className="mobile-summary-row">
                      {Object.entries(statusCounts).map(([status, count]) => (
                        <span
                          key={status}
                          className="mobile-summary-badge"
                          style={{
                            background: STATUS_COLOR[status]?.bg,
                            color: STATUS_COLOR[status]?.color,
                          }}
                        >
                          {STATUS_SHORT[status]}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {selectedCell && (
        <div className="modal-overlay" onClick={() => setSelectedCell(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedCell.isNew ? 'Mark Attendance' : 'Update Record'}</h3>
              <button className="modal-close" onClick={() => setSelectedCell(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group" style={{ marginBottom: 15 }}>
                <p style={{ margin: '0 0 5px 0', fontSize: 14 }}><strong>Employee:</strong> {selectedCell.workerName}</p>
                <p style={{ margin: '0 0 5px 0', fontSize: 14 }}><strong>Date:</strong> {selectedCell.displayDate}</p>
                {selectedCell.markedBy && <p style={{ margin: '0 0 5px 0', fontSize: 14 }}><strong>Shift Saved By:</strong> {selectedCell.markedBy}</p>}
                {selectedCell.otMarkedBy && <p style={{ margin: 0, fontSize: 14 }}><strong>OT Saved By:</strong> {selectedCell.otMarkedBy}</p>}
              </div>
              
              <div className="form-group">
                <label className="form-label">Status</label>
                <CustomSelect
                  value={editStatus}
                  disabled={isReadOnly}
                  onChange={(e) => {
                     setEditStatus(e.target.value);
                     if (!['1st_shift', '2nd_shift', 'general'].includes(e.target.value)) setEditOtHours('');
                  }}
                  options={[
                    { value: '', label: '-- Select --' },
                    { value: '1st_shift', label: '1st Shift' },
                    { value: '2nd_shift', label: '2nd Shift' },
                    { value: 'general', label: 'G (General)' },
                    { value: 'AA', label: 'AA (Absent)' },
                    { value: 'C-off', label: 'C-Off' },
                    { value: 'holiday', label: 'Holiday' },
                  ]}
                />
              </div>

              {['1st_shift', '2nd_shift', 'general'].includes(editStatus) && (
                <div className="form-group">
                  <label className="form-label">OT Hours</label>
                  <input type="number" min="0" max="24" step="0.5" className="form-input" 
                    value={editOtHours} onChange={(e) => setEditOtHours(e.target.value)} disabled={isReadOnly} />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Remarks</label>
                <input type="text" className="form-input" placeholder="Optional"
                  value={editRemarks} onChange={(e) => setEditRemarks(e.target.value)} disabled={isReadOnly} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setSelectedCell(null)}>Close</button>
              {!isReadOnly && (
                <button className="btn btn-primary" onClick={handleModalSave} disabled={isUpdating}>
                  {isUpdating ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Holiday Confirmation Modal */}
      {holidayConfirmDate && (
        <div className="modal-overlay" onClick={() => setHolidayConfirmDate(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3>Bulk Holiday Update</h3>
              <button className="modal-close" onClick={() => setHolidayConfirmDate(null)}>×</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to mark <strong>{holidayConfirmDate.toLocaleDateString('en-IN')}</strong> as a <strong>Holiday</strong> for workers without existing records?</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 10 }}>This will skip any workers who already have a shift or absence marked.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setHolidayConfirmDate(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={markHolidayForAll} disabled={isUpdating}>
                {isUpdating ? 'Updating...' : 'Confirm Bulk Holiday'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AttendanceReport;
