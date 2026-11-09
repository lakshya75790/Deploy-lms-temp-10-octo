import React, { useEffect, useState } from 'react';
import { useInvalidateLmsQueries } from '../../hooks/useLmsQueries';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { useNotification } from '../../context/NotificationContext';
import { Building2, Plus, Edit2, Trash2, Briefcase, Check, X, Tag, AlertTriangle, Power, AlertCircle, Search } from 'lucide-react';
import { validateGroupName, validateGroupDescription } from '../../utils/userValidation';

export const Departments = () => {
  const { addToast } = useNotification();
  const invalidateQueries = useInvalidateLmsQueries();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [roleInput, setRoleInput] = useState('');
  const [jobRoles, setJobRoles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ name: '', description: '' });

  // Deactivation confirmation modal state
  const [deptToDeactivate, setDeptToDeactivate] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  const fetchDepts = async () => {
    try {
      setLoading(true);
      const res = await getDepartments();
      setDepartments(res.data.data.departments || []);
    } catch (err) {
      addToast('error', 'Failed to fetch groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepts();
  }, []);

  const openCreateModal = () => {
    setEditingDept(null);
    setName('');
    setDescription('');
    setJobRoles([]);
    setRoleInput('');
    setFieldErrors({ name: '', description: '' });
    setShowModal(true);
  };

  const openEditModal = (dept) => {
    setEditingDept(dept);
    setName(dept.name);
    setDescription(dept.description || '');
    setJobRoles(dept.jobRoles || []);
    setRoleInput('');
    setFieldErrors({ name: '', description: '' });
    setShowModal(true);
  };

  const handleAddRole = (e) => {
    e.preventDefault();
    if (roleInput.trim() && !jobRoles.includes(roleInput.trim())) {
      setJobRoles([...jobRoles, roleInput.trim()]);
      setRoleInput('');
    }
  };

  const handleRoleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddRole(e);
    }
  };

  const handleRemoveRole = (roleToRemove) => {
    setJobRoles(jobRoles.filter(r => r !== roleToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanDesc = description.trim();

    const errors = {};
    const nameErr = validateGroupName(cleanName);
    if (nameErr) errors.name = nameErr;

    if (cleanDesc) {
      const descErr = validateGroupDescription(cleanDesc);
      if (descErr) errors.description = descErr;
    }

    const targetId = editingDept ? (editingDept._id || editingDept.id) : null;
    const isDuplicate = departments.some(d =>
      d.name.trim().toLowerCase() === cleanName.toLowerCase() &&
      (d._id || d.id) !== targetId
    );

    if (isDuplicate) {
      errors.name = `Group '${cleanName}' already exists. Please use a different name.`;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      addToast('error', Object.values(errors)[0]);
      return;
    }

    setSubmitting(true);
    try {
      if (editingDept) {
        const res = await updateDepartment(targetId, { name: cleanName, description: cleanDesc || null, jobRoles });
        const updated = res.data?.data?.department;
        if (updated) {
          const updatedDept = {
            ...updated,
            _id: updated._id || updated.id,
            id: updated.id || updated._id
          };
          setDepartments(prev => prev.map(d => ((d._id || d.id) === targetId ? updatedDept : d)));
        } else {
          fetchDepts();
        }
        addToast('success', 'Group updated successfully');
        invalidateQueries(['departments', 'admin-dashboard']);
      } else {
        const res = await createDepartment({ name: cleanName, description: cleanDesc || null, jobRoles });
        const created = res.data?.data?.department;
        if (created) {
          const newDept = {
            ...created,
            _id: created._id || created.id,
            id: created.id || created._id
          };
          setDepartments(prev => [newDept, ...prev.filter(d => (d._id || d.id) !== newDept.id)]);
        } else {
          fetchDepts();
        }
        addToast('success', 'Group created successfully');
        invalidateQueries(['departments', 'admin-dashboard']);
      }
      setShowModal(false);
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      const serverMsg = err.response?.data?.message || 'Action failed';
      const mapped = {};
      if (Array.isArray(serverErrors) && serverErrors.length > 0) {
        serverErrors.forEach((item) => {
          if (item.field) {
            mapped[item.field] = item.message;
          }
        });
      } else if (typeof serverMsg === 'string') {
        const lower = serverMsg.toLowerCase();
        if (lower.includes('name') || lower.includes('exists')) {
          mapped.name = serverMsg;
        } else if (lower.includes('description')) {
          mapped.description = serverMsg;
        }
      }
      setFieldErrors(prev => ({ ...prev, ...mapped }));
      addToast('error', serverMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const openDeactivateModal = (dept) => {
    setDeptToDeactivate(dept);
  };

  const closeDeactivateModal = () => {
    if (deactivating) return;
    setDeptToDeactivate(null);
  };

  const handleConfirmDeactivate = async () => {
    if (!deptToDeactivate || deactivating) return;
    const targetId = deptToDeactivate._id || deptToDeactivate.id;
    setDeactivating(true);
    try {
      await deleteDepartment(targetId);
      setDepartments(prev => prev.filter(d => (d._id || d.id) !== targetId));
      addToast('success', `Group "${deptToDeactivate.name}" deactivated successfully`);
      invalidateQueries(['departments', 'admin-dashboard']);
      setDeptToDeactivate(null);
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to deactivate group');
    } finally {
      setDeactivating(false);
    }
  };

  const filteredDepartments = departments.filter((d) => {
    if (!search.trim()) return true;
    const term = search.trim().toLowerCase();
    const nameMatch = (d.name || '').toLowerCase().includes(term);
    const descMatch = (d.description || '').toLowerCase().includes(term);
    const rolesMatch = Array.isArray(d.jobRoles) && d.jobRoles.some(r => (r || '').toLowerCase().includes(term));
    return nameMatch || descMatch || rolesMatch;
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-heading">Groups & Roles</h1>
          <p className="text-xs text-slate-500">
            Organize learners into groups and define roles for streamlined training assignment.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Group
        </button>
      </div>

      {/* Search Bar */}
      {!loading && departments.length > 0 && (
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by group name or role name..."
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
                Showing <strong className="text-slate-800">{filteredDepartments.length}</strong> of {departments.length} {departments.length === 1 ? 'group' : 'groups'}
              </span>
            ) : (
              <span>
                Total <strong className="text-slate-800">{departments.length}</strong> {departments.length === 1 ? 'group' : 'groups'}
              </span>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <LoadingSpinner text="Loading groups..." />
      ) : departments.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No Groups Created"
          description="Create your first group to organize learners and map roles."
          action={
            <button onClick={openCreateModal} className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs">
              Create Group
            </button>
          }
        />
      ) : filteredDepartments.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No Matching Groups or Roles"
          description={`No groups or roles matched "${search.trim()}". Try searching for a different group name or role.`}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredDepartments.map((d) => {
            const deptId = d._id || d.id;
            return (
              <div
                key={deptId}
                className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between space-y-4 transition-all hover:shadow-md hover:border-slate-300 min-w-0"
              >
                <div className="space-y-3 min-w-0">
                  {/* Card Header: Icon + Name + Action Buttons */}
                  <div className="flex items-start justify-between gap-3 min-w-0">
                    <div className="flex items-start space-x-3 min-w-0 flex-1">
                      <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0 mt-0.5">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <h3
                          className="font-bold text-slate-900 text-base leading-snug break-words [overflow-wrap:anywhere] line-clamp-2"
                          title={d.name}
                        >
                          {d.name}
                        </h3>
                        <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider shrink-0">
                          Active
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-1 shrink-0 pt-0.5">
                      <button
                        onClick={() => openEditModal(d)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                        title="Edit Group"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeactivateModal(d)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                        title="Deactivate Group"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Group Description */}
                  <p
                    className="text-xs text-slate-600 leading-relaxed break-words [overflow-wrap:anywhere] line-clamp-3"
                    title={d.description || 'No group description provided.'}
                  >
                    {d.description || 'No group description provided.'}
                  </p>
                </div>

                {/* Footer: Mapped Roles */}
                <div className="pt-4 border-t border-slate-100 space-y-2 min-w-0">
                  <p className="text-[11px] font-semibold text-slate-700 flex items-center">
                    <Briefcase className="w-3.5 h-3.5 mr-1.5 text-emerald-600 shrink-0" />
                    Mapped Roles ({d.jobRoles?.length || 0}):
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-w-full">
                    {(!d.jobRoles || d.jobRoles.length === 0) ? (
                      <span className="text-[11px] text-slate-400 italic">No roles mapped yet.</span>
                    ) : (
                      d.jobRoles.map((role) => (
                        <span
                          key={role}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700 break-words [overflow-wrap:anywhere] max-w-full"
                          title={role}
                        >
                          {role}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingDept ? 'Edit Group Details' : 'Create New Group'}>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Group Name <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400">2–60 characters</span>
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
              }}
              required
              maxLength={60}
              placeholder="e.g. Engineering, Class 10-A, JEE Morning Batch"
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
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Description (Optional)
              </label>
              <span className="text-[10px] text-slate-400">{description.length}/300</span>
            </div>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (fieldErrors.description) setFieldErrors((prev) => ({ ...prev, description: '' }));
              }}
              rows={3}
              maxLength={300}
              placeholder="Brief description of group scope and responsibilities..."
              className={`w-full px-4 py-2.5 rounded-xl border bg-white text-sm text-slate-900 outline-none resize-none transition-all ${
                fieldErrors.description
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'
              }`}
            />
            {fieldErrors.description && (
              <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                {fieldErrors.description}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mapped Roles
            </label>
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                onKeyDown={handleRoleKeyDown}
                placeholder="e.g. Student, Developer, Teacher"
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none"
              />
              <button
                type="button"
                onClick={handleAddRole}
                className="px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                Add Role
              </button>
            </div>

            <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 min-h-[52px]">
              {jobRoles.length === 0 ? (
                <span className="text-xs text-slate-400 italic p-1">No roles added yet. Type a role above and click 'Add Role'.</span>
              ) : (
                jobRoles.map((role) => (
                  <span key={role} className="inline-flex items-center px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
                    <Tag className="w-3 h-3 mr-1 text-emerald-600" />
                    {role}
                    <button
                      type="button"
                      onClick={() => handleRemoveRole(role)}
                      className="ml-2 text-emerald-600 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Remove Role"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all inline-flex items-center cursor-pointer"
            >
              <Check className="w-4 h-4 mr-1.5" />
              {submitting ? 'Saving Group...' : editingDept ? 'Update Group' : 'Create Group'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Deactivate Group Confirmation Modal */}
      <Modal
        isOpen={!!deptToDeactivate}
        onClose={closeDeactivateModal}
        title="Deactivate Group"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 space-y-2">
              <p className="font-bold text-sm">
                Are you sure you want to deactivate this group?
              </p>
              <p>
                You are about to deactivate{' '}
                <strong className="font-bold text-slate-900">{deptToDeactivate?.name}</strong>.
              </p>
              <div className="pt-1 text-[11px] text-amber-800 space-y-1">
                <p>• Learners assigned to this group will no longer receive new automated course assignments for this group.</p>
                <p>• Historical course completions, certificates, and learning records will remain safely preserved.</p>
                <p>• This group will be hidden from active learner and instructor assignment menus.</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              disabled={deactivating}
              onClick={closeDeactivateModal}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deactivating}
              onClick={handleConfirmDeactivate}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer flex items-center transition-colors disabled:opacity-50"
            >
              <Power className="w-3.5 h-3.5 mr-1.5" />
              {deactivating ? 'Deactivating...' : 'Deactivate Group'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

