import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast, { Toaster } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { HiOutlineDownload } from 'react-icons/hi';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import CustomSelect from '../components/CustomSelect';

const SHIFT_OPTIONS = [
  { value: 'Shift 1', label: 'Shift 1' },
  { value: 'Shift 2', label: 'Shift 2' },
  { value: 'General', label: 'General' },
  { value: 'Not Assign', label: 'Not Assign' },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const ShiftSchedule = () => {
  const { user, isHR, isSupervisor } = useAuth();
  const [workers, setWorkers] = useState([]);
  const [schedule, setSchedule] = useState({}); // { workerId: shift }
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState('');
  const [weekEnd, setWeekEnd] = useState('');
  const [isEditable, setIsEditable] = useState(false);
  const [dateOptions, setDateOptions] = useState([]);

  useEffect(() => {
    const today = new Date();
    
    const currentMonday = new Date(today);
    currentMonday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    currentMonday.setHours(0, 0, 0, 0);
    const currentStr = currentMonday.toISOString().split('T')[0];

    const nextMonday = new Date(currentMonday);
    nextMonday.setDate(currentMonday.getDate() + 7);
    const nextStr = nextMonday.toISOString().split('T')[0];

    const options = [
      { value: currentStr, label: `Current Week (${currentStr})` },
      { value: nextStr, label: `Next Week (${nextStr})` },
    ];
    setDateOptions(options);
    
    const day = today.getDay();
    const defaultWeek = (day === 5 || day === 6 || day === 0) ? nextStr : currentStr;
    setWeekStart(defaultWeek);

    setIsEditable(day === 5 || day === 6 || day === 0 || isHR());

    fetchWorkers();
  }, []);

  useEffect(() => {
    if (weekStart && workers.length > 0) {
      fetchSchedule();
    }
  }, [weekStart, workers]);

  useEffect(() => {
    if (weekStart) {
      const start = new Date(weekStart);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      setWeekEnd(end.toISOString().split('T')[0]);
    }
  }, [weekStart]);

  const fetchWorkers = async () => {
    try {
      const deptId = isSupervisor() ? user.department?._id : '';
      const url = deptId ? `/users?department=${deptId}` : '/users';
      const { data } = await API.get(url);
      setWorkers(data.users.filter(u => u.role === 'worker'));
    } catch (err) {
      toast.error('Failed to fetch workers');
    }
  };

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const deptId = isSupervisor() ? user.department?._id : (workers[0]?.department?._id || workers[0]?.department);
      if (!deptId) return;

      const { data } = await API.get(`/shifts?department=${deptId}&weekStartDate=${weekStart}`);
      if (data.data) {
        const lookup = {};
        data.data.schedule.forEach(s => {
          const workerId = s.worker?._id || s.worker;
          lookup[String(workerId)] = s.shifts[0]?.shift || 'Not Assign';
        });
        setSchedule(lookup);
      } else {
        setSchedule({});
      }
    } catch (err) {
      toast.error('Failed to fetch schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleShiftChange = (workerId, shift) => {
    if (!isEditable) return;
    setSchedule(prev => ({
      ...prev,
      [workerId]: shift,
    }));
  };

  const handleSave = async () => {
    try {
      const deptId = isSupervisor() ? user.department?._id : workers[0]?.department?._id;
      if (!deptId) return;

      const scheduleArray = workers.map(w => ({
        worker: w._id,
        shifts: DAYS.map(day => ({
          day,
          shift: schedule[w._id] || 'Not Assign',
        }))
      }));

      await API.post('/shifts', {
        department: deptId,
        weekStartDate: weekStart,
        schedule: scheduleArray,
        status: 'published',
      });

      toast.success('Schedule published successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to publish schedule');
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const deptName = isSupervisor() ? user.department?.name : 'All Departments';
    
    // Header Bar
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(0, 0, pageWidth, 40, 'F'); // Top bar
    
    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('SHIFT SCHEDULE', 14, 18);
    
    // Details
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184); // slate-400
    const formatDMY = (d) => d.split('-').reverse().join('/');
    doc.text(`Department: ${deptName}`, 14, 28);
    doc.text(`Week: ${formatDMY(weekStart)} to ${formatDMY(weekEnd)}`, 14, 34);

    const tableData = workers.map((w, idx) => [
      idx + 1,
      w.name,
      w.employeeId,
      w.department?.name || w.department || 'N/A',
      schedule[w._id] || 'Not Assign'
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['#', 'Name', 'ID', 'Dept', 'Shift']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] }, // Very light gray-blue
      styles: { fontSize: 10, cellPadding: 4, valign: 'middle' },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { fontStyle: 'bold' },
        4: { fontStyle: 'bold' } // Make shift bold
      }
    });

    doc.save(`Shift_Schedule_${weekStart}_to_${weekEnd}.pdf`);
  };

  return (
    <>
      <Toaster position="top-right" />
      <div className="page-header">
        <h1>Shift Schedule</h1>
        <p>Manage weekly shift schedules for your department</p>
      </div>
      <div className="page-content">
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
              Week: {weekStart} to {weekEnd}
            </span>
            <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Select Week:</label>
              <CustomSelect
                options={dateOptions}
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value)}
                size="compact"
                className="cs-compact"
                style={{ width: 220 }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-outline" onClick={exportPDF}><HiOutlineDownload /> Download PDF</button>
            {isEditable && (
              <button className="btn btn-primary" onClick={handleSave}>Publish</button>
            )}
          </div>
        </div>

        {!isEditable && (
          <div style={{ background: 'var(--warning-bg)', color: 'var(--warning)', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
            Notice: Schedules can only be assigned on Friday, Saturday, and Sunday. Current view is read-only.
          </div>
        )}

        {loading ? <div className="spinner" /> : (
          <div className="table-container table-responsive" style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ minWidth: '500px' }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>ID</th>
                  <th>Dept</th>
                  <th style={{ width: 150 }}>Shift</th>
                </tr>
              </thead>
              <tbody>
                {workers.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                      No workers found.
                    </td>
                  </tr>
                ) : (
                  workers.map(w => (
                    <tr key={w._id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{w.name}</td>
                      <td style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{w.employeeId}</td>
                      <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{w.department?.name || w.department || 'N/A'}</td>
                      <td>
                        <CustomSelect
                          options={SHIFT_OPTIONS}
                          value={schedule[w._id] || 'Not Assign'}
                          onChange={(e) => handleShiftChange(w._id, e.target.value)}
                          disabled={!isEditable}
                          size="compact"
                          placeholder="Choose..."
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

export default ShiftSchedule;
