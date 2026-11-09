import React, { useEffect, useState } from 'react';
import { useInvalidateLmsQueries } from '../../hooks/useLmsQueries';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { useNotification } from '../../context/NotificationContext';
import { FolderKanban, Plus, Edit2, Trash2, Check, AlertCircle } from 'lucide-react';
import { validateCategoryName, validateCategoryDescription } from '../../utils/userValidation';

export const CategoriesManager = () => {
  const { addToast } = useNotification();
  const invalidateQueries = useInvalidateLmsQueries();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchCats = async () => {
    try {
      setLoading(true);
      const res = await getCategories();
      setCategories(res.data.data.categories || []);
    } catch (err) {
      addToast('error', 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCats();
  }, []);

  const openCreateModal = () => {
    setEditingCat(null);
    setName('');
    setDescription('');
    setFieldErrors({ name: '', description: '' });
    setShowModal(true);
  };

  const openEditModal = (cat) => {
    setEditingCat(cat);
    setName(cat.name || '');
    setDescription(cat.description || '');
    setFieldErrors({ name: '', description: '' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nameErr = validateCategoryName(name);
    const descErr = validateCategoryDescription(description);

    if (nameErr || descErr) {
      setFieldErrors({
        name: nameErr || '',
        description: descErr || ''
      });
      return;
    }

    setSubmitting(true);
    try {
      if (editingCat) {
        const targetId = editingCat._id || editingCat.id;
        const res = await updateCategory(targetId, { name, description });
        const updated = res.data?.data?.category;
        if (updated) {
          const updatedCat = {
            ...updated,
            _id: updated._id || updated.id,
            id: updated.id || updated._id
          };
          setCategories(prev => prev.map(c => ((c._id || c.id) === targetId ? updatedCat : c)));
        } else {
          fetchCats();
        }
        addToast('success', 'Category updated successfully');
        invalidateQueries(['categories', 'admin-dashboard']);
      } else {
        const res = await createCategory({ name, description });
        const created = res.data?.data?.category;
        if (created) {
          const newCat = {
            ...created,
            _id: created._id || created.id,
            id: created.id || created._id
          };
          setCategories(prev => [newCat, ...prev.filter(c => (c._id || c.id) !== newCat.id)]);
        } else {
          fetchCats();
        }
        addToast('success', 'Category created successfully');
        invalidateQueries(['categories', 'admin-dashboard']);
      }
      setShowModal(false);
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      const serverMsg = err.response?.data?.message || 'Action failed';
      const mapped = {};
      if (Array.isArray(serverErrors) && serverErrors.length > 0) {
        serverErrors.forEach((item) => {
          if (item.field) mapped[item.field] = item.message;
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

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this category?')) return;
    try {
      await deleteCategory(id);
      setCategories(prev => prev.filter(c => (c._id || c.id) !== id));
      addToast('success', 'Category Deleted');
      invalidateQueries(['categories', 'admin-dashboard']);
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to deactivate category');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-heading">Course Categories</h1>
          <p className="text-xs text-slate-500">
            Organize courses into categories like Compliance, Technical Skills, Security, Onboarding, etc.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Category
        </button>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading categories..." />
      ) : categories.length === 0 ? (
        <EmptyState icon={FolderKanban} title="No Categories Created" description="Add categories to classify organization courses." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((c) => {
            const catId = c._id || c.id;
            return (
              <div
                key={catId}
                className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3 relative flex flex-col justify-between hover:shadow-md transition-all min-w-0"
              >
                <div className="space-y-3 min-w-0">
                  {/* Card Header: Icon + Name + Action Buttons */}
                  <div className="flex items-start justify-between gap-3 min-w-0">
                    <div className="flex items-start space-x-3 min-w-0 flex-1">
                      <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 border border-teal-100 shrink-0 mt-0.5">
                        <FolderKanban className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <h3
                          className="font-bold text-slate-900 text-base leading-snug break-words [overflow-wrap:anywhere] line-clamp-2"
                          title={c.name}
                        >
                          {c.name}
                        </h3>
                        <span className="inline-flex items-center text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200 uppercase tracking-wider shrink-0">
                          Active
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-1 shrink-0 pt-0.5">
                      <button
                        onClick={() => openEditModal(c)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                        title="Edit Category"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(catId)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                        title="Deactivate Category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Category Description */}
                  <p
                    className="text-xs text-slate-600 leading-relaxed break-words [overflow-wrap:anywhere] line-clamp-4"
                    title={c.description || 'No category description provided.'}
                  >
                    {c.description || 'No category description provided.'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingCat ? 'Edit Category' : 'Create Category'}>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Category Name <span className="text-rose-500">*</span>
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
              placeholder="e.g. Cybersecurity Compliance"
              className={`w-full px-4 py-2.5 rounded-xl border bg-white text-sm text-slate-900 outline-none transition-all ${
                fieldErrors.name
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'
              }`}
            />
            <div className="flex items-center justify-between mt-1">
              {fieldErrors.name ? (
                <p className="text-xs text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {fieldErrors.name}
                </p>
              ) : (
                <span />
              )}
              <span className="text-[10px] text-slate-400 ml-auto">{name.length}/60 characters</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">Description</label>
              <span className="text-[10px] text-slate-400">Optional, max 300 characters</span>
            </div>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (fieldErrors.description) setFieldErrors((prev) => ({ ...prev, description: '' }));
              }}
              rows={3}
              maxLength={300}
              placeholder="Brief description of what courses belong to this category..."
              className={`w-full px-4 py-2.5 rounded-xl border bg-white text-sm text-slate-900 outline-none resize-none transition-all ${
                fieldErrors.description
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'
              }`}
            />
            <div className="flex items-center justify-between mt-1">
              {fieldErrors.description ? (
                <p className="text-xs text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {fieldErrors.description}
                </p>
              ) : (
                <span />
              )}
              <span className="text-[10px] text-slate-400 ml-auto">{description.length}/300 characters</span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
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
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs inline-flex items-center cursor-pointer"
            >
              <Check className="w-4 h-4 mr-1.5" />
              {submitting ? 'Saving...' : editingCat ? 'Update Category' : 'Create Category'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

