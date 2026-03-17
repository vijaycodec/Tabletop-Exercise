import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  FaUserPlus, FaUser, FaEnvelope, FaLock, FaEdit,
  FaTrash, FaExclamationCircle, FaTimes
} from 'react-icons/fa';

const emptyForm = { username: '', email: '', password: '', confirmPassword: '' };

const formInputClass = "pl-9 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/30";

const Users = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const res = await userAPI.getUsers();
      setUsers(res.data.users);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setFormError('');
    if (form.password !== form.confirmPassword) { setFormError('Passwords do not match'); return; }
    setFormLoading(true);
    try {
      await userAPI.createUser({ username: form.username, email: form.email, password: form.password });
      toast.success('User created successfully');
      setShowAddModal(false);
      setForm(emptyForm);
      fetchUsers();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (form.password && form.password !== form.confirmPassword) { setFormError('Passwords do not match'); return; }
    setFormLoading(true);
    try {
      const payload = { username: form.username, email: form.email };
      if (form.password) payload.password = form.password;
      await userAPI.updateUser(selectedUser._id, payload);
      toast.success('User updated successfully');
      setShowEditModal(false);
      setSelectedUser(null);
      setForm(emptyForm);
      fetchUsers();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to update user');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await userAPI.deleteUser(selectedUser._id);
      toast.success('User deleted');
      setShowDeleteModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const openEdit = (u) => {
    setSelectedUser(u);
    setForm({ username: u.username, email: u.email, password: '', confirmPassword: '' });
    setFormError('');
    setShowEditModal(true);
  };

  const closeModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setSelectedUser(null);
    setForm(emptyForm);
    setFormError('');
  };

  const formFields = (isEdit) => (
    <>
      {formError && (
        <div className="mb-4 bg-gray-700/50 border border-gray-600 rounded-lg p-3 flex items-start gap-2">
          <FaExclamationCircle className="text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="text-gray-300 text-sm">{formError}</p>
        </div>
      )}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FaUser className="text-gray-500 text-sm" /></div>
          <input type="text" value={form.username} onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))} className={formInputClass} required />
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FaEnvelope className="text-gray-500 text-sm" /></div>
          <input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} className={formInputClass} required />
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Password {isEdit && <span className="text-gray-500 text-xs">(leave blank to keep current)</span>}
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FaLock className="text-gray-500 text-sm" /></div>
          <input type="password" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} className={formInputClass} required={!isEdit} minLength={form.password ? 6 : undefined} />
        </div>
      </div>
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-1">Confirm Password</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FaLock className="text-gray-500 text-sm" /></div>
          <input type="password" value={form.confirmPassword} onChange={(e) => setForm(f => ({ ...f, confirmPassword: e.target.value }))} className={formInputClass} required={!isEdit} />
        </div>
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={closeModals} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors">Cancel</button>
        <button type="submit" disabled={formLoading} className="flex-1 px-4 py-2 bg-blue-600/80 hover:bg-blue-500/80 text-white rounded-lg transition-colors font-semibold disabled:opacity-50">
          {formLoading ? 'Saving...' : isEdit ? 'Update User' : 'Add User'}
        </button>
      </div>
    </>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-2xl p-6 border border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">User Management</h1>
            <p className="text-gray-400 text-sm mt-1">{users.length} facilitator{users.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => { setForm(emptyForm); setFormError(''); setShowAddModal(true); }}
            className="flex items-center gap-2 bg-blue-600/80 hover:bg-blue-500/80 text-white px-4 py-2 rounded-lg transition-colors font-medium"
          >
            <FaUserPlus />
            Add User
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No users found.</div>
        ) : (
          <div className="space-y-3">
            {users.map((u) => (
              <div key={u._id} className="flex items-center justify-between bg-gray-800/60 border border-gray-700 rounded-lg px-5 py-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center">
                    <FaUser className="text-blue-400 text-sm" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{u.username}</span>
                      {u._id === currentUser?.id && (
                        <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">You</span>
                      )}
                    </div>
                    <span className="text-gray-400 text-sm">{u.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 bg-gray-700 px-2 py-1 rounded">{u.role}</span>
                  <button onClick={() => openEdit(u)} className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" title="Edit">
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => { setSelectedUser(u); setShowDeleteModal(true); }}
                    disabled={u._id === currentUser?.id}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title={u._id === currentUser?.id ? 'Cannot delete own account' : 'Delete'}
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-600 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/10 p-2 rounded-full"><FaUserPlus className="text-blue-400 text-lg" /></div>
                <h3 className="text-lg font-bold text-white">Add User</h3>
              </div>
              <button onClick={closeModals} className="text-gray-500 hover:text-gray-300"><FaTimes /></button>
            </div>
            <form onSubmit={handleAdd}>{formFields(false)}</form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-600 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/10 p-2 rounded-full"><FaEdit className="text-blue-400 text-lg" /></div>
                <h3 className="text-lg font-bold text-white">Edit User</h3>
              </div>
              <button onClick={closeModals} className="text-gray-500 hover:text-gray-300"><FaTimes /></button>
            </div>
            <form onSubmit={handleEdit}>{formFields(true)}</form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-600 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-500/10 p-3 rounded-full"><FaTrash className="text-red-400 text-lg" /></div>
              <div>
                <h3 className="text-lg font-bold text-white">Delete User</h3>
                <p className="text-gray-400 text-sm">This cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm mb-6">
              Are you sure you want to delete <span className="text-white font-medium">{selectedUser?.username}</span>?
            </p>
            <div className="flex gap-3">
              <button onClick={closeModals} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2 bg-red-600/80 hover:bg-red-500/80 text-white rounded-lg transition-colors font-semibold">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
