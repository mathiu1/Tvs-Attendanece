import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast, { Toaster } from 'react-hot-toast';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineX } from 'react-icons/hi';

const ManageDepartments = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', description: '' });

  useEffect(() => { fetchDepartments(); }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    try { const { data } = await API.get('/departments'); setDepartments(data.departments); }
    catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const openCreate = () => { setEditing(null); setForm({ name: '', code: '', description: '' }); setShowModal(true); };
  const openEdit = (d) => { setEditing(d._id); setForm({ name: d.name, code: d.code, description: d.description || '' }); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await API.put(`/departments/${editing}`, form); toast.success('Updated'); }
      else { await API.post('/departments', form); toast.success('Created'); }
      setShowModal(false); fetchDepartments();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDeleteClick = (id, name) => {
    setDeleteConfirm({ id, name });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await API.delete(`/departments/${deleteConfirm.id}`);
      toast.success('Deactivated');
      setDeleteConfirm(null);
      fetchDepartments();
    } catch {
      toast.error('Failed to deactivate');
    }
  };

  return (
    <>
      <Toaster position="top-right" toastOptions={{ style: { background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' } }} />
      <div className="page-header"><h1>Departments</h1><p>Manage organizational departments</p></div>
      <div className="page-content">
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={openCreate}><HiOutlinePlus /> Add Department</button>
        </div>
        {loading ? <div className="spinner" /> : (
          <>
            <div className="table-container table-responsive">
              <table>
                <thead><tr><th>Name</th><th>Code</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {departments.map(d => (
                    <tr key={d._id} style={!d.isActive ? { opacity: 0.5 } : {}}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.name}</td>
                      <td><span className="badge badge-shift1">{d.code}</span></td>
                      <td>{d.description || '—'}</td>
                      <td><span className={`badge ${d.isActive ? 'badge-general' : 'badge-aa'}`}>{d.isActive ? 'Active' : 'Inactive'}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-outline btn-sm btn-icon" onClick={() => openEdit(d)}><HiOutlinePencil /></button>
                          <button className="btn btn-outline btn-sm btn-icon" onClick={() => handleDeleteClick(d._id, d.name)} style={{ color: 'var(--danger)' }}><HiOutlineTrash /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="attendance-cards">
              {departments.map(d => (
                <div key={d._id} className="attendance-card-item" style={!d.isActive ? { opacity: 0.5 } : {}}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div><div style={{ fontWeight: 600, fontSize: 15 }}>{d.name}</div><span className="badge badge-shift1" style={{ marginTop: 4 }}>{d.code}</span></div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-outline btn-sm btn-icon" onClick={() => openEdit(d)}><HiOutlinePencil /></button>
                      <button className="btn btn-outline btn-sm btn-icon" onClick={() => handleDeleteClick(d._id, d.name)} style={{ color: 'var(--danger)' }}><HiOutlineTrash /></button>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{d.description || 'No description'}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header"><h3>{editing ? 'Edit' : 'Create'} Department</h3><button className="modal-close" onClick={() => setShowModal(false)}><HiOutlineX /></button></div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                  <div className="form-group"><label className="form-label">Code *</label><input className="form-input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required placeholder="e.g. PROD" /></div>
                  <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                </div>
                <div className="modal-footer"><button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button></div>
              </form>
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
                <p>Are you sure you want to deactivate the department <strong>{deleteConfirm.name}</strong>?</p>
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

export default ManageDepartments;
