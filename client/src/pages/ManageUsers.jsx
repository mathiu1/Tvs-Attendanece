import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast, { Toaster } from 'react-hot-toast';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineSearch, HiOutlineX, HiOutlineEye, HiOutlineIdentification, HiOutlinePhone, HiOutlineOfficeBuilding, HiOutlineBriefcase, HiOutlineCalendar, HiOutlineLocationMarker, HiOutlineMail, HiOutlineCheckCircle, HiOutlineExclamationCircle } from 'react-icons/hi';
import CustomSelect from '../components/CustomSelect';

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [viewUser, setViewUser] = useState(null);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'worker', department: '', employeeId: '', phone: '', designation: '', dateOfJoining: '', address: '' });

  useEffect(() => { fetchUsers(); fetchDepartments(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (filterRole) params.role = filterRole;
      if (filterDept) params.department = filterDept;
      const { data } = await API.get('/users', { params });
      setUsers(data.users);
    } catch (err) { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  const fetchDepartments = async () => {
    try {
      const { data } = await API.get('/departments?isActive=true');
      setDepartments(data.departments);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchUsers(); }, [search, filterRole, filterDept]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', email: '', password: '', role: 'worker', department: '', employeeId: '', phone: '', designation: '', dateOfJoining: '', address: '' });
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditing(user._id);
    setForm({
      name: user.name, email: user.email, password: '', role: user.role,
      department: user.department?._id || '', employeeId: user.employeeId || '',
      phone: user.phone || '', designation: user.designation || '',
      dateOfJoining: user.dateOfJoining ? user.dateOfJoining.split('T')[0] : '', address: user.address || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (payload.role === 'hr') delete payload.department;

      if (editing) {
        await API.put(`/users/${editing}`, payload);
        toast.success('User updated');
      } else {
        await API.post('/users', payload);
        toast.success('User created');
      }
      setShowModal(false);
      fetchUsers();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDeleteClick = (id, name) => {
    setDeleteConfirm({ id, name });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await API.delete(`/users/${deleteConfirm.id}`);
      toast.success('User deactivated');
      setDeleteConfirm(null);
      fetchUsers();
    } catch (err) { toast.error('Failed to deactivate'); }
  };

  const handleView = (user) => {
    setViewUser(user);
  };

  const getRoleBadge = (role) => <span className={`badge badge-${role}`}>{role}</span>;

  return (
    <>
      <Toaster position="top-right" toastOptions={{ style: { background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' } }} />
      <div className="page-header">
        <h1>Manage Users</h1>
        <p>Create, edit, and manage all system users</p>
      </div>
      <div className="page-content">
        <div className="filters-bar">
          <div className="filter-group">
            <label>Search</label>
            <input type="text" placeholder="Name, email, or ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="filter-group" style={{ flex: '0 0 150px' }}>
            <label>Role</label>
            <CustomSelect
              size="small"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              placeholder="All Roles"
              options={[
                { value: '', label: 'All Roles' },
                { value: 'hr', label: 'HR' },
                { value: 'supervisor', label: 'Supervisor' },
                { value: 'worker', label: 'Worker' },
              ]}
            />
          </div>
          <div className="filter-group" style={{ flex: '0 0 180px' }}>
            <label>Department</label>
            <CustomSelect
              size="small"
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              placeholder="All Departments"
              options={[{ value: '', label: 'All Departments' }, ...departments.map(d => ({ value: d._id, label: d.name }))]}
            />
          </div>
          <div className="filter-group" style={{ flex: 'none' }}>
            <label>&nbsp;</label>
            <button className="btn btn-primary" onClick={openCreate}><HiOutlinePlus /> Add User</button>
          </div>
        </div>

        {loading ? <div className="spinner" /> : (
          <>
            {/* Desktop Table */}
            <div className="table-container table-responsive">
              <table>
                <thead>
                  <tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Employee ID</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id} style={!u.isActive ? { opacity: 0.5 } : {}}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</td>
                      <td>{u.email}</td>
                      <td>{getRoleBadge(u.role)}</td>
                      <td>{u.department?.name || '—'}</td>
                      <td><span style={{ fontFamily: 'JetBrains Mono', fontSize: 12 }}>{u.employeeId || '—'}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-outline btn-sm btn-icon" onClick={() => handleView(u)}><HiOutlineEye /></button>
                          <button className="btn btn-outline btn-sm btn-icon" onClick={() => openEdit(u)}><HiOutlinePencil /></button>
                          <button className="btn btn-outline btn-sm btn-icon" onClick={() => handleDeleteClick(u._id, u.name)} style={{ color: 'var(--danger)' }}><HiOutlineTrash /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="attendance-cards">
              {users.map(u => (
                <div key={u._id} className="attendance-card-item" style={!u.isActive ? { opacity: 0.5 } : {}}>
                  <div className="worker-info">
                    <div className={`worker-avatar`} style={{ background: u.role === 'hr' ? 'linear-gradient(135deg,#ef4444,#f97316)' : u.role === 'supervisor' ? 'linear-gradient(135deg,#6366f1,#a855f7)' : 'linear-gradient(135deg,#22c55e,#14b8a6)' }}>
                      {u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="worker-name">{u.name}</div>
                      <div className="worker-id">{u.email}</div>
                    </div>
                    {getRoleBadge(u.role)}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                    <span>{u.department?.name || 'No Dept'} · {u.employeeId || 'No ID'}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-outline btn-sm btn-icon" onClick={() => handleView(u)}><HiOutlineEye /></button>
                      <button className="btn btn-outline btn-sm btn-icon" onClick={() => openEdit(u)}><HiOutlinePencil /></button>
                      <button className="btn btn-outline btn-sm btn-icon" onClick={() => handleDeleteClick(u._id, u.name)} style={{ color: 'var(--danger)' }}><HiOutlineTrash /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{editing ? 'Edit User' : 'Create User'}</h3>
                <button className="modal-close" onClick={() => setShowModal(false)}><HiOutlineX /></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                    <div className="form-group"><label className="form-label">Email *</label><input className="form-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">{editing ? 'New Password' : 'Password *'}</label><input className="form-input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} placeholder={editing ? 'Leave blank to keep' : ''} /></div>
                    <div className="form-group"><label className="form-label">Role *</label><CustomSelect value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} options={[{ value: 'worker', label: 'Worker' }, { value: 'supervisor', label: 'Supervisor' }, { value: 'hr', label: 'HR' }]} /></div>
                  </div>
                  {form.role !== 'hr' && (
                    <div className="form-group"><label className="form-label">Department *</label><CustomSelect value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Select..." required options={[{ value: '', label: 'Select...' }, ...departments.map(d => ({ value: d._id, label: d.name }))]} /></div>
                  )}
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Employee ID</label><input className="form-input" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} /></div>
                    <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Designation</label><input className="form-input" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></div>
                    <div className="form-group"><label className="form-label">Date of Joining</label><input className="form-input" type="date" value={form.dateOfJoining} onChange={(e) => setForm({ ...form, dateOfJoining: e.target.value })} /></div>
                  </div>
                  <div className="form-group"><label className="form-label">Address</label><textarea className="form-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View User Modal */}
        {viewUser && (
          <div className="modal-overlay" onClick={() => setViewUser(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500, padding: 0, overflow: 'hidden' }}>
              <button className="modal-close" onClick={() => setViewUser(null)} style={{ position: 'absolute', top: 15, right: 15, zIndex: 10, background: 'var(--bg-secondary)', borderRadius: '50%', padding: 5 }}><HiOutlineX /></button>
              
              <div className="modal-body" style={{ padding: 0 }}>
                {/* Header Banner */}
                <div style={{ 
                  background: viewUser.role === 'hr' ? 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(249,115,22,0.1))' : 
                              viewUser.role === 'supervisor' ? 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.1))' : 
                              'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(20,184,166,0.1))',
                  padding: '30px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--border)',
                  position: 'relative'
                }}>
                  <h2 style={{ margin: '0 0 5px 0', fontSize: 24 }}>{viewUser.name}</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 14 }}>
                    <HiOutlineMail /> {viewUser.email}
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
                    {getRoleBadge(viewUser.role)}
                    <span className={`badge ${viewUser.isActive ? 'badge-general' : 'badge-aa'}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {viewUser.isActive ? <HiOutlineCheckCircle /> : <HiOutlineExclamationCircle />}
                      {viewUser.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Details Grid */}
                <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ background: 'var(--bg-secondary)', padding: 10, borderRadius: 8, color: 'var(--primary)' }}>
                      <HiOutlineIdentification size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Employee ID</div>
                      <div style={{ fontSize: 15, fontWeight: 500, marginTop: 2, fontFamily: 'JetBrains Mono' }}>{viewUser.employeeId || '—'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ background: 'var(--bg-secondary)', padding: 10, borderRadius: 8, color: '#f59e0b' }}>
                      <HiOutlineOfficeBuilding size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Department</div>
                      <div style={{ fontSize: 15, fontWeight: 500, marginTop: 2 }}>{viewUser.department?.name || '—'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ background: 'var(--bg-secondary)', padding: 10, borderRadius: 8, color: '#10b981' }}>
                      <HiOutlinePhone size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phone Number</div>
                      <div style={{ fontSize: 15, fontWeight: 500, marginTop: 2 }}>{viewUser.phone || '—'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ background: 'var(--bg-secondary)', padding: 10, borderRadius: 8, color: '#8b5cf6' }}>
                      <HiOutlineBriefcase size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Designation</div>
                      <div style={{ fontSize: 15, fontWeight: 500, marginTop: 2 }}>{viewUser.designation || '—'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ background: 'var(--bg-secondary)', padding: 10, borderRadius: 8, color: '#ec4899' }}>
                      <HiOutlineCalendar size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date of Joining</div>
                      <div style={{ fontSize: 15, fontWeight: 500, marginTop: 2 }}>{viewUser.dateOfJoining ? new Date(viewUser.dateOfJoining).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', gridColumn: '1 / -1' }}>
                    <div style={{ background: 'var(--bg-secondary)', padding: 10, borderRadius: 8, color: '#64748b' }}>
                      <HiOutlineLocationMarker size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Address</div>
                      <div style={{ fontSize: 14, fontWeight: 400, marginTop: 4, background: 'rgba(0,0,0,0.1)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        {viewUser.address || '—'}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
              <div className="modal-header">
                <h3>Confirm Deactivation</h3>
                <button className="modal-close" onClick={() => setDeleteConfirm(null)}><HiOutlineX /></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to deactivate the user <strong>{deleteConfirm.name}</strong>?</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>This action can be reversed by an administrator later.</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <button type="button" className="btn" style={{ background: 'var(--danger)', color: 'white' }} onClick={confirmDelete}>Deactivate</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ManageUsers;
