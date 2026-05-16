import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import toast, { Toaster } from 'react-hot-toast';
import { HiOutlineCheckCircle, HiOutlineSave } from 'react-icons/hi';
import CustomSelect from '../components/CustomSelect';

const STATUS_OPTIONS = [
  { value: '', label: '-- Select --' },
  { value: '1st_shift', label: '1st Shift' },
  { value: '2nd_shift', label: '2nd Shift' },
  { value: 'general', label: 'G (General)' },
  { value: 'AA', label: 'AA (Absent)' },
  { value: 'C-off', label: 'C-Off' },
  { value: 'holiday', label: 'Holiday' },
];

const MarkAttendance = () => {
  const { user, isHR, isSupervisor } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [workers, setWorkers] = useState([]);
  const [records, setRecords] = useState({});
  const todayDate = (() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  })();
  const yesterdayDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  })();
  const tenDaysAgoDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 10);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  })();

  const [date, setDate] = useState(todayDate);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existingRecords, setExistingRecords] = useState([]);

  useEffect(() => {
    if (isHR()) fetchDepartments();
    else if (isSupervisor() && user?.department?._id) {
      setSelectedDept(user.department._id);
    }
  }, []);

  useEffect(() => {
    if (selectedDept) {
      fetchWorkers();
      fetchExisting();
    }
  }, [selectedDept, date]);

  const fetchDepartments = async () => {
    try {
      const { data } = await API.get('/departments?isActive=true');
      setDepartments(data.departments);
    } catch (err) { console.error(err); }
  };

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/users/department/${selectedDept}`);
      setWorkers(data.workers);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchExisting = async () => {
    try {
      const { data } = await API.get(`/attendance/department/${selectedDept}?date=${date}`);
      setExistingRecords(data.marked || []);
      const existing = {};
      (data.marked || []).forEach(r => {
        existing[r.worker?._id] = { status: r.status, otHours: r.otHours || 0, remarks: r.remarks || '', absentType: r.absentType || 'without_inform' };
      });
      setRecords(existing);
    } catch (err) { console.error(err); }
  };

  const updateRecord = (workerId, field, value) => {
    setRecords(prev => {
      const newRecord = { ...prev[workerId], [field]: value };
      if (field === 'status' && !['1st_shift', '2nd_shift', 'general'].includes(value)) {
        newRecord.otHours = '';
      }
      if (field === 'status' && value === 'AA' && !newRecord.absentType) {
        newRecord.absentType = 'without_inform';
      }
      return { ...prev, [workerId]: newRecord };
    });
  };



  const isAlreadyMarked = (workerId) => existingRecords.some(r => r.worker?._id === workerId);

  const handleSubmit = async () => {
    const toSubmit = Object.entries(records)
      .filter(([, r]) => r.status)
      .map(([workerId, r]) => ({
        workerId, date, status: r.status,
        otHours: Number(r.otHours || 0),
        remarks: r.remarks || '',
        absentType: r.status === 'AA' ? (r.absentType || 'without_inform') : undefined,
      }));

    if (toSubmit.length === 0) { toast.error('No attendance records to submit'); return; }

    setSubmitting(true);
    try {
      const { data } = await API.post('/attendance/mark', { records: toSubmit });
      toast.success(`${data.count} records saved successfully!`);
      if (data.errors?.length) toast.error(`${data.errors.length} errors occurred`);
      fetchExisting();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSubmitting(false); }
  };

  const handleSingleSubmit = async (workerId) => {
    const r = records[workerId];
    if (!r || !r.status) { toast.error('Please select a status'); return; }
    
    setSubmitting(true);
    try {
      const toSubmit = [{
        workerId, date, status: r.status,
        otHours: Number(r.otHours || 0),
        remarks: r.remarks || '',
        absentType: r.status === 'AA' ? (r.absentType || 'without_inform') : undefined,
      }];
      const { data } = await API.post('/attendance/mark', { records: toSubmit });
      toast.success(`Record saved successfully!`);
      fetchExisting();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSubmitting(false); }
  };

  const getStatusBadgeClass = (status) => {
    const map = { '1st_shift': 'badge-shift1', '2nd_shift': 'badge-shift2', 'general': 'badge-general', 'AA': 'badge-aa', 'C-off': 'badge-coff', 'OT': 'badge-ot', 'holiday': 'badge-holiday' };
    return map[status] || '';
  };

  return (
    <>
      <Toaster position="top-right" toastOptions={{ style: { background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' } }} />
      <div className="page-header">
        <h1>Mark Attendance</h1>
        <p>{isSupervisor() ? `Department: ${user?.department?.name}` : 'Select a department to mark attendance'}</p>
      </div>
      <div className="page-content">
        <div className="filters-bar">
          {isHR() && (
            <div className="filter-group">
              <label>Department</label>
              <CustomSelect
                size="small"
                value={selectedDept}
                onChange={(e) => { setSelectedDept(e.target.value); setRecords({}); setExistingRecords([]); setWorkers([]); }}
                placeholder="Select Department"
                options={[{ value: '', label: 'Select Department' }, ...departments.map(d => ({ value: d._id, label: d.name }))]}
              />
            </div>
          )}
          <div className="filter-group">
            <label>Date</label>
            <input 
              type="date" 
              value={date} 
              max={todayDate} 
              min={isHR() ? tenDaysAgoDate : yesterdayDate}
              onChange={(e) => { setDate(e.target.value); setRecords({}); setExistingRecords([]); }} 
            />
          </div>
          <div className="filter-group" style={{ flex: 'none' }}>
            <label>&nbsp;</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary save-all-mobile-fixed" onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="loader"></div>
                    <span>Saving...</span>
                  </div>
                ) : (
                  <><HiOutlineSave /> Save All</>
                )}
              </button>
            </div>
          </div>
        </div>

        {loading ? <div className="spinner" /> : workers.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📋</div>
            <h3>No Workers Found</h3>
            <p>{selectedDept ? 'No active workers in this department' : 'Select a department to begin'}</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="table-container table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Employee</th>
                    <th>ID</th>
                    <th>Status</th>
                    <th>OT Hours</th>
                    <th>Remarks</th>
                    <th>Saved</th>
                  </tr>
                </thead>
                <tbody>
                  {workers.map((w, i) => {
                    const rec = records[w._id] || {};
                    const marked = isAlreadyMarked(w._id);
                    return (
                      <tr key={w._id} style={marked ? { background: 'rgba(34,197,94,0.04)' } : {}}>
                        <td>{i + 1}</td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{w.name}</td>
                        <td><span style={{ fontFamily: 'JetBrains Mono', fontSize: 12 }}>{w.employeeId}</span></td>
                        <td>
                          <CustomSelect
                            size="compact"
                            value={rec.status || ''}
                            onChange={(e) => updateRecord(w._id, 'status', e.target.value)}
                            placeholder="-- Select --"
                            options={STATUS_OPTIONS}
                          />
                        </td>
                        <td>
                          {marked && ['1st_shift', '2nd_shift', 'general'].includes(rec.status) && (
                            <input type="number" className="form-input" style={{ width: 80, padding: '6px 10px', fontSize: 13 }}
                              min="0" max="24" step="0.5" value={rec.otHours || ''} placeholder="Hrs"
                              onChange={(e) => updateRecord(w._id, 'otHours', e.target.value)} />
                          )}
                          {rec.status === 'AA' && (
                            <CustomSelect
                              size="compact"
                              value={rec.absentType || 'without_inform'}
                              onChange={(e) => updateRecord(w._id, 'absentType', e.target.value)}
                              options={[{ value: 'without_inform', label: 'W/O Inform' }, { value: 'informed', label: 'Informed' }]}
                            />
                          )}
                        </td>
                        <td>
                          <input type="text" className="form-input" style={{ padding: '6px 10px', fontSize: 13 }}
                            placeholder="Optional" value={rec.remarks || ''}
                            onChange={(e) => updateRecord(w._id, 'remarks', e.target.value)} />
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {marked && <HiOutlineCheckCircle style={{ color: 'var(--success)', fontSize: 20 }} title="Saved" />}
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '4px 8px', fontSize: '12px', minHeight: 'auto' }}
                              onClick={() => handleSingleSubmit(w._id)}
                              disabled={submitting || !rec.status}
                            >
                              {marked ? 'Update' : 'Save'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="attendance-cards">
              {workers.map((w) => {
                const rec = records[w._id] || {};
                const marked = isAlreadyMarked(w._id);
                const initials = w.name.split(' ').map(n => n[0]).join('').slice(0, 2);
                return (
                  <div key={w._id} className="attendance-card-item" style={marked ? { borderColor: 'rgba(34,197,94,0.3)' } : {}}>
                    <div className="worker-info">
                      <div className="worker-avatar">{initials}</div>
                      <div>
                        <div className="worker-name">{w.name} {marked && <HiOutlineCheckCircle style={{ color: 'var(--success)', verticalAlign: 'middle' }} />}</div>
                        <div className="worker-id">{w.employeeId}</div>
                      </div>
                    </div>
                    <div className="card-fields">
                      <div className="card-field">
                        <label>Status</label>
                        <CustomSelect
                          size="small"
                          value={rec.status || ''}
                          onChange={(e) => updateRecord(w._id, 'status', e.target.value)}
                          placeholder="-- Select --"
                          options={STATUS_OPTIONS}
                        />
                      </div>
                      {marked && ['1st_shift', '2nd_shift', 'general'].includes(rec.status) && (
                        <div className="card-field">
                          <label>OT Hours</label>
                          <input type="number" min="0" max="24" step="0.5" value={rec.otHours || ''} placeholder="Hours"
                            onChange={(e) => updateRecord(w._id, 'otHours', e.target.value)} />
                        </div>
                      )}
                      {rec.status === 'AA' && (
                        <div className="card-field">
                          <label>Absent Type</label>
                          <CustomSelect
                            size="small"
                            value={rec.absentType || 'without_inform'}
                            onChange={(e) => updateRecord(w._id, 'absentType', e.target.value)}
                            options={[{ value: 'without_inform', label: 'Without Inform' }, { value: 'informed', label: 'Informed' }]}
                          />
                        </div>
                      )}
                      <div className="card-field full">
                        <label>Remarks</label>
                        <input type="text" placeholder="Optional remarks" value={rec.remarks || ''}
                          onChange={(e) => updateRecord(w._id, 'remarks', e.target.value)} />
                      </div>
                      <div className="card-field full" style={{ marginTop: '8px' }}>
                        <button 
                          className="btn btn-outline" 
                          style={{ width: '100%', padding: '8px' }}
                          onClick={() => handleSingleSubmit(w._id)}
                          disabled={submitting || !rec.status}
                        >
                          {marked ? 'Update Record' : 'Save Record'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default MarkAttendance;
