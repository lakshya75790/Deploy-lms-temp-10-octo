import React, { useEffect, useState } from 'react';
import { getEmployees, getInstructors, createInstructor, createAdmin, updateUserStatus, deleteUser, getDepartments } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { useNotification } from '../../context/NotificationContext';
import { Users, UserCheck, Plus, CheckCircle2, Power, Eye, EyeOff, AlertTriangle, AlertCircle, Trash2, Search, X } from 'lucide-react';
import {
  validateName,
  validateEmail,
  validatePassword,
  validateAssignedGroup,
  evaluatePasswordStrength
} from '../../utils/userValidation';

export const UsersManager = () => {
  const { addToast } = useNotification();
  const [activeTab, setActiveTab] = useState('employees'); // 'employees' | 'instructors' | 'admins'

  const [employees, setEmployees] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [licenseStats, setLicenseStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal states
  const [showInstModal, setShowInstModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null); // { id, name, email, role: 'Learner' | 'Instructor' }
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [departmentId, setDepartmentId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Field-specific validation errors for Create Instructor
  const [fieldErrors, setFieldErrors] = useState({
    name: '',
    email: '',
    password: '',
    departmentId: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [empRes, instRes, depRes] = await Promise.all([
        getEmployees(),
        getInstructors(),
        getDepartments()
      ]);
      setEmployees(empRes.data.data.employees || []);
      if (empRes.data.data.licenseStats) {
        setLicenseStats(empRes.data.data.licenseStats);
      } else if (instRes.data.data.licenseStats) {
        setLicenseStats(instRes.data.data.licenseStats);
      }
      setInstructors(instRes.data.data.instructors || []);
      setDepartments(depRes.data.data.departments || []);
    } catch (err) {
      addToast('error', 'Failed to fetch user directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const [togglingUserIds, setTogglingUserIds] = useState(new Set());

  const handleToggleStatus = async (userId, currentStatus) => {
    if (togglingUserIds.has(userId)) return;
    const newStatus = currentStatus === 'active' ? 'deactivated' : 'active';
    setTogglingUserIds(prev => new Set(prev).add(userId));
    try {
      const res = await updateUserStatus(userId, newStatus);
      addToast('success', `User ${newStatus === 'active' ? 'reactivated' : 'deactivated'} successfully`);
      setEmployees(prev => prev.map(e => (e._id === userId || e.id === userId) ? { ...e, status: newStatus } : e));
      setInstructors(prev => prev.map(i => (i._id === userId || i.id === userId) ? { ...i, status: newStatus } : i));
      if (res.data?.data?.licenseStats) {
        setLicenseStats(res.data.data.licenseStats);
      }
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to update user status');
    } finally {
      setTogglingUserIds(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete || deleting) return;
    setDeleting(true);
    const { id, name, role } = userToDelete;
    try {
      const res = await deleteUser(id);
      addToast('success', `${role} "${name}" permanently deleted successfully`);
      if (role === 'Learner') {
        setEmployees(prev => prev.filter(e => (e._id !== id && e.id !== id)));
      } else {
        setInstructors(prev => prev.filter(i => (i._id !== id && i.id !== id)));
      }
      if (res.data?.data?.licenseStats) {
        setLicenseStats(res.data.data.licenseStats);
      } else {
        setLicenseStats(prev => prev ? {
          ...prev,
          usedLicenses: Math.max(0, prev.usedLicenses - 1),
          remainingLicenses: Math.min(prev.totalLicenses, prev.remainingLicenses + 1)
        } : null);
      }
      setUserToDelete(null);
    } catch (err) {
      addToast('error', err.response?.data?.message || `Failed to delete ${role}`);
    } finally {
      setDeleting(false);
    }
  };

  const passwordStrength = evaluatePasswordStrength(password, { name, email });

  const handleOpenInstModal = () => {
    setName('');
    setEmail('');
    setPassword('');
    setDepartmentId('');
    setShowPassword(false);
    setFieldErrors({ name: '', email: '', password: '', departmentId: '' });
    setShowInstModal(true);
  };

  const handleCloseInstModal = () => {
    setShowInstModal(false);
    setName('');
    setEmail('');
    setPassword('');
    setDepartmentId('');
    setShowPassword(false);
    setFieldErrors({ name: '', email: '', password: '', departmentId: '' });
  };

  const handleCreateInstructor = async (e) => {
    e.preventDefault();

    // 1. Client-Side Field Validation
    const errors = {};

    const nameErr = validateName(name);
    if (nameErr) errors.name = nameErr;

    const existingEmails = [
      ...instructors.map(i => i.email),
      ...employees.map(e => e.email)
    ];
    const emailErr = validateEmail(email, existingEmails);
    if (emailErr) errors.email = emailErr;

    const passErr = validatePassword(password, { name, email });
    if (passErr) errors.password = passErr;

    const groupErr = validateAssignedGroup(departmentId, departments);
    if (groupErr) errors.departmentId = groupErr;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      addToast('error', Object.values(errors)[0]);
      return;
    }

    setSubmitting(true);
    try {
      const cleanData = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        departmentId: departmentId && departmentId.trim() !== '' ? departmentId.trim() : null
      };

      const res = await createInstructor(cleanData);
      const newInst = res.data?.data?.instructor;
      if (newInst) {
        setInstructors(prev => [newInst, ...prev]);
      } else {
        fetchData();
      }
      if (res.data?.data?.licenseStats) {
        setLicenseStats(res.data.data.licenseStats);
      }
      addToast('success', 'Instructor account created successfully');
      setShowInstModal(false);
      // Valid inputs cleared ONLY upon successful account creation
      setName('');
      setEmail('');
      setPassword('');
      setDepartmentId('');
      setFieldErrors({ name: '', email: '', password: '', departmentId: '' });
    } catch (err) {
      // Map server-side errors to specific fields without clearing valid inputs!
      const serverErrors = err.response?.data?.errors;
      const serverMsg = err.response?.data?.message || 'Failed to create instructor';

      const mappedErrors = {};
      if (Array.isArray(serverErrors) && serverErrors.length > 0) {
        serverErrors.forEach(errItem => {
          if (errItem.field) {
            mappedErrors[errItem.field] = errItem.message;
          }
        });
      } else if (typeof serverMsg === 'string') {
        const lowerMsg = serverMsg.toLowerCase();
        if (lowerMsg.includes('email') || lowerMsg.includes('user with this email')) {
          mappedErrors.email = serverMsg;
        } else if (lowerMsg.includes('name')) {
          mappedErrors.name = serverMsg;
        } else if (lowerMsg.includes('password')) {
          mappedErrors.password = serverMsg;
        } else if (lowerMsg.includes('department') || lowerMsg.includes('group')) {
          mappedErrors.departmentId = serverMsg;
        }
      }

      setFieldErrors(prev => ({ ...prev, ...mappedErrors }));
      addToast('error', serverMsg);
      // Note: Inputs (name, email, password, departmentId) are strictly NOT cleared!
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createAdmin({ name, email, password });
      addToast('success', 'Organization Admin account created successfully');
      setShowAdminModal(false);
      setName(''); setEmail(''); setPassword('');
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to create admin');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    if (!search.trim()) return true;
    const term = search.trim().toLowerCase();
    const nameMatch = (emp.name || '').toLowerCase().includes(term);
    const emailMatch = (emp.email || '').toLowerCase().includes(term);
    const idMatch = (emp.employeeId || emp.employee_id || emp.empId || '').toLowerCase().includes(term);
    const deptMatch = (emp.departmentId?.name || '').toLowerCase().includes(term);
    const roleMatch = (emp.jobRole || '').toLowerCase().includes(term);
    return nameMatch || emailMatch || idMatch || deptMatch || roleMatch;
  });

  const filteredInstructors = instructors.filter((inst) => {
    if (!search.trim()) return true;
    const term = search.trim().toLowerCase();
    const nameMatch = (inst.name || '').toLowerCase().includes(term);
    const emailMatch = (inst.email || '').toLowerCase().includes(term);
    const idMatch = (inst.employeeId || inst.employee_id || inst.empId || '').toLowerCase().includes(term);
    const deptMatch = (inst.departmentId?.name || '').toLowerCase().includes(term);
    return nameMatch || emailMatch || idMatch || deptMatch;
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 xs:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl xs:text-2xl font-extrabold text-slate-900 tracking-tight font-heading">Users & Status Management</h1>
          <p className="text-xs text-slate-500">
            Manage organization learners, instructors, admins, and active/deactivated statuses.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {activeTab === 'instructors' && (
            <button
              onClick={handleOpenInstModal}
              className="inline-flex items-center px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Create Instructor
            </button>
          )}
          {activeTab === 'admins' && (
            <button
              onClick={() => setShowAdminModal(true)}
              className="inline-flex items-center px-4 py-2.5 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Create Admin
            </button>
          )}
        </div>
      </div>

      {/* License Alert / Usage Banner */}
      {licenseStats && licenseStats.remainingLicenses === 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center space-x-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="text-xs font-semibold">
            All available licenses have been used. Please add more licenses to create or register new users.
          </div>
        </div>
      )}
      {licenseStats && licenseStats.remainingLicenses > 0 && (
        <div className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium flex items-center justify-between">
          <span>
            License usage: <strong className="text-slate-900 font-bold">{licenseStats.usedLicenses}/{licenseStats.totalLicenses}</strong> — <span className="text-emerald-700 font-semibold">{licenseStats.remainingLicenses} {licenseStats.remainingLicenses === 1 ? 'license' : 'licenses'} remaining</span>
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('employees')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'employees' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Learners Directory ({employees.length})
        </button>
        <button
          onClick={() => setActiveTab('instructors')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'instructors' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Instructors ({instructors.length})
        </button>
      </div>

      {/* Search Controls */}
      {!loading && (employees.length > 0 || instructors.length > 0) && (
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                activeTab === 'employees'
                  ? 'Search learners by name, email, employee ID, group, or role...'
                  : 'Search instructors by name, email, or group...'
              }
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:border-emerald-600 outline-none transition-all placeholder:text-slate-400 bg-white"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                title="Clear search"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="text-xs text-slate-500 font-medium self-start sm:self-center">
            {search.trim() ? (
              <span>
                Showing <strong className="text-slate-800">
                  {activeTab === 'employees' ? filteredEmployees.length : filteredInstructors.length}
                </strong> of {activeTab === 'employees' ? employees.length : instructors.length} {activeTab === 'employees' ? (employees.length === 1 ? 'learner' : 'learners') : (instructors.length === 1 ? 'instructor' : 'instructors')}
              </span>
            ) : (
              <span>
                Total <strong className="text-slate-800">
                  {activeTab === 'employees' ? employees.length : instructors.length}
                </strong> {activeTab === 'employees' ? (employees.length === 1 ? 'learner' : 'learners') : (instructors.length === 1 ? 'instructor' : 'instructors')}
              </span>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <LoadingSpinner text="Loading users directory..." />
      ) : activeTab === 'employees' ? (
        employees.length === 0 ? (
          <EmptyState icon={Users} title="No Learners Registered" description="Learners can register publicly using your organization code." />
        ) : filteredEmployees.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Matching Learners Found"
            description={`No learners matched "${search.trim()}". Try searching by name, email, employee ID, group, or role.`}
            action={
              <button
                onClick={() => setSearch('')}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs transition-colors"
              >
                Clear Search
              </button>
            }
          />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="p-4">Learner</th>
                    <th className="p-4">Group & Role</th>
                    <th className="p-4">Profile Status</th>
                    <th className="p-4">Account Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center space-x-3 min-w-0 max-w-xs sm:max-w-sm">
                          <img
                            src={emp.profilePicture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(emp.name || 'User')}`}
                            alt={emp.name}
                            className="w-9 h-9 rounded-xl object-cover border border-slate-200 bg-slate-100 shrink-0 shadow-xs"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-900 truncate" title={emp.name}>{emp.name}</p>
                            <p className="text-[11px] text-slate-500 truncate" title={emp.email}>{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="font-semibold text-emerald-600">{emp.departmentId?.name || 'Unassigned'}</p>
                        <p className="text-[11px] text-slate-500">{emp.jobRole || 'No role selected'}</p>
                      </td>
                      <td className="p-4">
                        {emp.isProfileComplete ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Complete
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Pending Setup
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        {emp.status === 'active' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Deactivated
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="inline-flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleToggleStatus(emp._id || emp.id, emp.status)}
                            disabled={togglingUserIds.has(emp._id || emp.id)}
                            className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                              emp.status === 'active'
                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            }`}
                            title={emp.status === 'active' ? 'Deactivate account' : 'Reactivate account'}
                          >
                            <Power className="w-3.5 h-3.5 mr-1.5" />
                            {emp.status === 'active' ? 'Deactivate' : 'Reactivate'}
                          </button>
                          <button
                            onClick={() => setUserToDelete({ id: emp._id || emp.id, name: emp.name, email: emp.email, role: 'Learner' })}
                            className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                            title="Permanently delete learner"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        instructors.length === 0 ? (
          <EmptyState icon={UserCheck} title="No Instructors Created" description="Create instructor accounts to build courses and grade submissions." />
        ) : filteredInstructors.length === 0 ? (
          <EmptyState
            icon={UserCheck}
            title="No Matching Instructors Found"
            description={`No instructors matched "${search.trim()}". Try searching by name, email, or group.`}
            action={
              <button
                onClick={() => setSearch('')}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs transition-colors"
              >
                Clear Search
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {filteredInstructors.map((inst) => (
              <div
                key={inst._id || inst.id}
                className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all"
              >
                {/* Header: User Info & Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3.5">
                  {/* Left Side: Avatar & Details */}
                  <div className="flex items-start space-x-3.5 min-w-0 flex-1">
                    <img
                      src={inst.profilePicture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(inst.name || 'User')}`}
                      alt={inst.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 bg-slate-100 shrink-0 shadow-xs"
                    />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <h3
                        className="font-bold text-slate-900 text-base leading-snug break-words [overflow-wrap:anywhere] line-clamp-2"
                        title={inst.name}
                      >
                        {inst.name}
                      </h3>
                      <p
                        className="text-xs text-slate-500 truncate"
                        title={inst.email}
                      >
                        {inst.email}
                      </p>
                    </div>
                  </div>

                  {/* Right Side: Flexible Action Buttons (Deactivate & Delete) */}
                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-center flex-wrap sm:flex-nowrap pt-1 sm:pt-0">
                    <button
                      onClick={() => handleToggleStatus(inst._id || inst.id, inst.status)}
                      disabled={togglingUserIds.has(inst._id || inst.id)}
                      className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0 whitespace-nowrap shadow-xs disabled:opacity-50 ${
                        inst.status === 'active'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                      }`}
                      title={inst.status === 'active' ? 'Deactivate account' : 'Reactivate account'}
                    >
                      <Power className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                      {inst.status === 'active' ? 'Deactivate' : 'Reactivate'}
                    </button>
                    <button
                      onClick={() => setUserToDelete({ id: inst._id || inst.id, name: inst.name, email: inst.email, role: 'Instructor' })}
                      className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0 whitespace-nowrap bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 shadow-xs"
                      title="Permanently delete instructor"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                      Delete
                    </button>
                  </div>
                </div>

                {/* Footer: Group Info & Status */}
                <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between gap-2 flex-wrap">
                  <p className="truncate min-w-0">
                    Group: <span className="text-emerald-600 font-semibold">{inst.departmentId?.name || 'General Instructor'}</span>
                  </p>
                  <span className="text-[11px] font-mono text-slate-400 shrink-0">
                    Status: <span className={inst.status === 'active' ? 'text-emerald-600 font-medium' : 'text-slate-400'}>{inst.status === 'active' ? 'Active' : 'Deactivated'}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Create Instructor Modal */}
      <Modal isOpen={showInstModal} onClose={handleCloseInstModal} title="Create Instructor Account">
        <form onSubmit={handleCreateInstructor} className="space-y-4" noValidate>
          {/* 1. Full Name */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400">2–100 characters</span>
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }));
              }}
              maxLength={100}
              placeholder="Dr. Sarah Connor"
              className={`w-full px-4 py-2.5 rounded-xl border bg-white text-sm text-slate-900 outline-none transition-all ${
                fieldErrors.name
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'
              }`}
            />
            {fieldErrors.name && (
              <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                {fieldErrors.name}
              </p>
            )}
            <p className="text-[11px] text-slate-400 mt-1">
              Letters, spaces, hyphens, periods, and apostrophes only. Whitespace-only values rejected.
            </p>
          </div>

          {/* 2. Email Address */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400">Unique account email</span>
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: '' }));
              }}
              placeholder="sarah.connor@company.com"
              className={`w-full px-4 py-2.5 rounded-xl border bg-white text-sm text-slate-900 outline-none transition-all ${
                fieldErrors.email
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'
              }`}
            />
            {fieldErrors.email && (
              <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                {fieldErrors.email}
              </p>
            )}
          </div>

          {/* 3. Password & Security Policy */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Password <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400">Min 8 chars, uppercase, lowercase, number, symbol</span>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: '' }));
                }}
                placeholder="Enter a strong password"
                className={`w-full pl-4 pr-10 py-2.5 rounded-xl border bg-white text-sm text-slate-900 outline-none transition-all ${
                  fieldErrors.password
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                    : 'border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Real-time Password Strength Meter */}
            {password && (
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Password Strength:</span>
                  <span className={`font-bold ${
                    passwordStrength.score >= 4 ? 'text-emerald-600' :
                    passwordStrength.score === 3 ? 'text-teal-600' :
                    passwordStrength.score === 2 ? 'text-amber-600' : 'text-rose-600'
                  }`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 h-1.5">
                  {[1, 2, 3, 4].map(idx => (
                    <div
                      key={idx}
                      className={`h-full rounded-full transition-all duration-300 ${
                        passwordStrength.score >= idx
                          ? (passwordStrength.score >= 4 ? 'bg-emerald-500' : passwordStrength.score === 3 ? 'bg-teal-500' : passwordStrength.score === 2 ? 'bg-amber-500' : 'bg-rose-500')
                          : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Password Policy Requirements Checklist */}
            <div className="mt-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1 text-[11px] text-slate-600">
              <div className="font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Security Policy Checklist</span>
                <span className="text-[10px] text-slate-400 font-normal">All rules enforced</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1">
                {passwordStrength.requirements.map(req => (
                  <div key={req.id} className={`flex items-center gap-1.5 transition-colors ${req.met ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                    {req.met ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
                    )}
                    <span>{req.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {fieldErrors.password && (
              <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                {fieldErrors.password}
              </p>
            )}
          </div>

          {/* 4. Assigned Group (Optional) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">Assigned Group (Optional)</label>
              <span className="text-[10px] text-slate-400">Select authorized group</span>
            </div>
            <select
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value);
                if (fieldErrors.departmentId) setFieldErrors(prev => ({ ...prev, departmentId: '' }));
              }}
              className={`w-full px-4 py-2.5 rounded-xl border bg-white text-sm text-slate-900 outline-none transition-all ${
                fieldErrors.departmentId
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'
              }`}
            >
              <option value="">All Groups / General Instructor</option>
              {departments.map(d => (
                <option key={d._id || d.id} value={d._id || d.id}>{d.name}</option>
              ))}
            </select>
            {fieldErrors.departmentId && (
              <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                {fieldErrors.departmentId}
              </p>
            )}
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleCloseInstModal}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Instructor'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Admin Modal */}
      <Modal isOpen={showAdminModal} onClose={() => setShowAdminModal(false)} title="Create Additional Organization Admin">
        <form onSubmit={handleCreateAdmin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              placeholder="Admin Name"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Work Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin2@company.com"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="At least 6 characters"
                className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
            <button type="button" onClick={() => setShowAdminModal(false)} className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="px-5 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-xs cursor-pointer">
              {submitting ? 'Creating...' : 'Create Admin'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Permanent Delete Confirmation Modal */}
      <Modal
        isOpen={!!userToDelete}
        onClose={() => !deleting && setUserToDelete(null)}
        title={`Permanently Delete ${userToDelete?.role || 'User'}`}
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-900 space-y-2">
              <p className="font-bold text-sm">Warning: This action is permanent and cannot be undone.</p>
              <p>
                Are you sure you want to permanently delete{' '}
                <strong className="font-bold text-slate-900">{userToDelete?.name}</strong>{' '}
                (<span className="text-slate-600">{userToDelete?.email}</span>)?
              </p>
              <p className="text-rose-700">
                Permanently deleting this account will remove their data and free 1 license slot for your organization.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
            <button
              type="button"
              disabled={deleting}
              onClick={() => setUserToDelete(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={handleConfirmDelete}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer flex items-center disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              {deleting ? 'Deleting...' : `Delete ${userToDelete?.role || 'User'}`}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

