import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Shield, ShieldCheck, UserCog, Eye, EyeOff,
  Pencil, Trash2, X, Check, ChevronDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { cn } from '../lib/utils';
import PageHeader from '../components/PageHeader';
import type { User, UserRole, TabKey } from '../types';
import { ALL_TABS } from '../types';

// Tab display labels
const TAB_LABELS: Record<TabKey, string> = {
  dashboard: 'Dashboard',
  lessons: 'Lessons',
  'group-lessons': 'Group Lessons',
  rentals: 'Board Rentals',
  sunbeds: 'Sunbed Rentals',
  schedule: 'Schedule',
  instructors: 'Instructors',
  students: 'Students',
  agents: 'Agents',
  payments: 'Payments',
  reports: 'Reports',
  settings: 'Settings',
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400',
  manager: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
  worker: 'bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400',
};

const ROLE_ICONS: Record<UserRole, React.ElementType> = {
  admin: Shield,
  manager: ShieldCheck,
  worker: UserCog,
};

interface UserForm {
  username: string;
  password: string;
  displayName: string;
  role: UserRole;
  allowedTabs: TabKey[];
  isActive: boolean;
}

const EMPTY_FORM: UserForm = {
  username: '',
  password: '',
  displayName: '',
  role: 'worker',
  allowedTabs: ['dashboard'],
  isActive: true,
};

export default function UserManagement() {
  const { user: currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await api.auth.getUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filtered = users.filter(
    (u) =>
      u.displayName.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowPassword(false);
    setShowModal(true);
  };

  const openEdit = (u: User) => {
    setEditingUser(u);
    setForm({
      username: u.username,
      password: '',
      displayName: u.displayName,
      role: u.role,
      allowedTabs: u.allowedTabs as TabKey[],
      isActive: u.isActive,
    });
    setError('');
    setShowPassword(false);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (editingUser) {
        const updateData: any = {
          displayName: form.displayName,
          isActive: form.isActive,
          allowedTabs: form.allowedTabs,
        };
        if (isAdmin) updateData.role = form.role;
        if (form.password) updateData.password = form.password;
        await api.auth.updateUser(editingUser.id, updateData);
      } else {
        if (!form.username || !form.password || !form.displayName) {
          setError('All fields are required.');
          setLoading(false);
          return;
        }
        await api.auth.createUser({
          username: form.username,
          password: form.password,
          displayName: form.displayName,
          role: form.role,
          allowedTabs: form.allowedTabs,
        });
      }
      await fetchUsers();
      setShowModal(false);
    } catch (err: any) {
      setError(err.message || 'Operation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.auth.deleteUser(id);
      await fetchUsers();
      setDeleteConfirm(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete user.');
    }
  };

  const toggleTab = (tab: TabKey) => {
    setForm((prev) => ({
      ...prev,
      allowedTabs: prev.allowedTabs.includes(tab)
        ? prev.allowedTabs.filter((t) => t !== tab)
        : [...prev.allowedTabs, tab],
    }));
  };

  const selectAllTabs = () => setForm((prev) => ({ ...prev, allowedTabs: [...ALL_TABS] }));
  const clearAllTabs = () => setForm((prev) => ({ ...prev, allowedTabs: ['dashboard'] }));

  return (
    <>
      <PageHeader
        title="User Management"
        subtitle={`Manage user accounts and permissions — ${users.length} users`}
        action={
          <button
            onClick={openCreate}
            className="bg-brand text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-brand/30 hover:scale-105 transition-transform flex items-center gap-2"
          >
            <Plus size={16} />
            Add User
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 pb-6 lg:pb-10 custom-scrollbar">
        {/* Search */}
        <div className="relative mb-6">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Search users by name, username, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-surface border border-border-default text-sm font-medium placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>

        {/* Users Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((u) => {
            const RoleIcon = ROLE_ICONS[u.role];
            const isSelf = u.id === currentUser?.id;
            return (
              <div
                key={u.id}
                className={cn(
                  'bg-surface rounded-3xl border shadow-sm p-6 flex flex-col gap-4 transition-all',
                  u.isActive ? 'border-border-default' : 'border-red-200 dark:border-red-500/20 opacity-60'
                )}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg',
                        u.role === 'admin'
                          ? 'bg-red-500'
                          : u.role === 'manager'
                            ? 'bg-blue-500'
                            : 'bg-green-500'
                      )}
                    >
                      {u.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{u.displayName}</span>
                        {isSelf && (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-brand/10 text-brand">
                            YOU
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-text-secondary">@{u.username}</span>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-bold px-2.5 py-1 rounded-full capitalize flex items-center gap-1',
                      ROLE_COLORS[u.role]
                    )}
                  >
                    <RoleIcon size={10} />
                    {u.role}
                  </span>
                </div>

                {/* Status */}
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full',
                      u.isActive ? 'bg-green-500' : 'bg-red-500'
                    )}
                  />
                  <span className="text-[11px] font-medium text-text-secondary">
                    {u.isActive ? 'Active' : 'Disabled'}
                  </span>
                </div>

                {/* Allowed Tabs (workers only) */}
                {u.role === 'worker' && (
                  <div className="flex flex-wrap gap-1">
                    {u.allowedTabs.map((tab) => (
                      <span
                        key={tab}
                        className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-surface-dim text-text-secondary"
                      >
                        {TAB_LABELS[tab as TabKey] || tab}
                      </span>
                    ))}
                  </div>
                )}
                {(u.role === 'admin' || u.role === 'manager') && (
                  <span className="text-[10px] font-medium text-text-secondary italic">
                    Full access to all tabs
                  </span>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-border-default">
                  <button
                    onClick={() => openEdit(u)}
                    className="flex-1 py-2 text-[11px] font-bold rounded-xl bg-surface-dim hover:bg-brand/10 hover:text-brand transition-all flex items-center justify-center gap-1.5"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  {isAdmin && !isSelf && (
                    <>
                      {deleteConfirm === u.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="py-2 px-3 text-[11px] font-bold rounded-xl bg-red-500 text-white hover:bg-red-600 transition-all flex items-center gap-1"
                          >
                            <Check size={12} /> Yes
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="py-2 px-3 text-[11px] font-bold rounded-xl bg-surface-dim hover:bg-surface transition-all flex items-center gap-1"
                          >
                            <X size={12} /> No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(u.id)}
                          className="py-2 px-3 text-[11px] font-bold rounded-xl bg-surface-dim hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 transition-all flex items-center gap-1"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <UserCog size={48} className="mx-auto text-text-secondary/30 mb-4" />
            <p className="text-text-secondary font-medium">No users found</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-3xl shadow-2xl border border-border-default w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border-default flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {editingUser ? 'Edit User' : 'Create New User'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-xl hover:bg-surface-dim transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
              {/* Username */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                  Username
                </label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  disabled={!!editingUser}
                  placeholder="Enter username"
                  className={cn(
                    'w-full px-4 py-3 rounded-xl bg-surface-dim border border-border-default text-sm font-medium placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand/50',
                    editingUser && 'opacity-50 cursor-not-allowed'
                  )}
                />
              </div>

              {/* Display Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                  Display Name
                </label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  placeholder="Enter display name"
                  className="w-full px-4 py-3 rounded-xl bg-surface-dim border border-border-default text-sm font-medium placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand/50"
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                  {editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={editingUser ? 'Leave blank to keep current' : 'Enter password'}
                    className="w-full px-4 py-3 pr-12 rounded-xl bg-surface-dim border border-border-default text-sm font-medium placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Role */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                  Role
                </label>
                {isAdmin ? (
                  <div className="flex gap-2">
                    {(['admin', 'manager', 'worker'] as UserRole[]).map((r) => {
                      const Icon = ROLE_ICONS[r];
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setForm({ ...form, role: r })}
                          className={cn(
                            'flex-1 py-2.5 rounded-xl text-[11px] font-bold capitalize flex items-center justify-center gap-1.5 border transition-all',
                            form.role === r
                              ? 'border-brand bg-brand/10 text-brand'
                              : 'border-border-default bg-surface-dim text-text-secondary hover:border-brand/30'
                          )}
                        >
                          <Icon size={14} /> {r}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-4 py-3 rounded-xl bg-surface-dim border border-border-default text-sm font-medium text-text-secondary">
                    Worker (Managers can only create workers)
                  </div>
                )}
              </div>

              {/* Active Status */}
              <div className="flex items-center justify-between py-2">
                <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                  Account Active
                </span>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, isActive: !form.isActive })}
                  className={cn(
                    'w-12 h-6 rounded-full transition-all relative',
                    form.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                  )}
                >
                  <div
                    className={cn(
                      'w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm',
                      form.isActive ? 'left-6' : 'left-0.5'
                    )}
                  />
                </button>
              </div>

              {/* Tab Permissions (only for workers) */}
              {form.role === 'worker' && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                      Allowed Tabs
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAllTabs}
                        className="text-[10px] font-bold text-brand hover:underline"
                      >
                        Select All
                      </button>
                      <span className="text-text-secondary">|</span>
                      <button
                        type="button"
                        onClick={clearAllTabs}
                        className="text-[10px] font-bold text-text-secondary hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {ALL_TABS.map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => toggleTab(tab)}
                        className={cn(
                          'py-2 px-3 rounded-xl text-[11px] font-bold border transition-all text-center',
                          form.allowedTabs.includes(tab)
                            ? 'border-brand bg-brand/10 text-brand'
                            : 'border-border-default bg-surface-dim text-text-secondary hover:border-brand/30'
                        )}
                      >
                        {TAB_LABELS[tab]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {form.role !== 'worker' && (
                <div className="bg-surface-dim rounded-xl p-3 text-[11px] text-text-secondary font-medium">
                  {form.role === 'admin'
                    ? 'Admins have full access to all tabs and can manage all users.'
                    : 'Managers have full access to all tabs and can create/manage worker accounts.'}
                </div>
              )}

              {error && (
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold bg-surface-dim hover:bg-surface border border-border-default transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={cn(
                    'flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all',
                    loading
                      ? 'bg-brand/60 cursor-not-allowed'
                      : 'bg-brand hover:bg-brand/90 shadow-lg shadow-brand/30'
                  )}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                  ) : editingUser ? (
                    'Save Changes'
                  ) : (
                    'Create User'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
