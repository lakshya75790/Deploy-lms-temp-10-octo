import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTrainings, updateTraining, deleteTraining } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { useNotification } from '../../context/NotificationContext';
import { BookOpen, Plus, Trash2, Layers, CheckCircle2, FileCode, RefreshCw, Search, X } from 'lucide-react';

export const MyTrainings = () => {
  const navigate = useNavigate();
  const { addToast } = useNotification();

  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'published' | 'draft'

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await getTrainings();
      setTrainings(res.data.data.trainings || []);
    } catch (err) {
      addToast('error', 'Failed to load trainings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTogglePublish = async (t) => {
    if (!t || processingId === t._id) return;
    const isCurrentlyPublished = t.status === 'published' || t.isPublished;
    const newStatus = isCurrentlyPublished ? 'draft' : 'published';
    const newIsPublished = newStatus === 'published';
    setProcessingId(t._id);
    try {
      const res = await updateTraining(t._id, { status: newStatus, isPublished: newIsPublished });
      const updated = res.data?.data?.training;
      setTrainings(prev => prev.map(item =>
        item._id === t._id
          ? (updated ? { ...item, ...updated } : { ...item, status: newStatus, isPublished: newIsPublished })
          : item
      ));
      addToast('success', `Course status changed to ${newStatus}`);
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to update status');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = (t) => {
    setCourseToDelete(t);
  };

  const confirmDelete = async () => {
    if (!courseToDelete || processingId === courseToDelete._id) return;
    setProcessingId(courseToDelete._id);
    try {
      await deleteTraining(courseToDelete._id);
      addToast('success', 'Training course deleted');
      setTrainings(prev => prev.filter(item => item._id !== courseToDelete._id));
      setCourseToDelete(null);
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to delete training');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredTrainings = trainings.filter((t) => {
    // 1. Status Filter
    const isPublished = t.status === 'published' || t.isPublished;
    if (statusFilter === 'published' && !isPublished) return false;
    if (statusFilter === 'draft' && isPublished) return false;

    // 2. Search Query
    if (!search.trim()) return true;
    const term = search.trim().toLowerCase();
    const titleMatch = (t.title || '').toLowerCase().includes(term);
    const descMatch = (t.description || '').toLowerCase().includes(term);
    const catMatch = (t.categoryId?.name || '').toLowerCase().includes(term);
    const sectionMatch = Array.isArray(t.sections) && t.sections.some(s => (s.title || '').toLowerCase().includes(term));
    return titleMatch || descMatch || catMatch || sectionMatch;
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-heading">Course Studio</h1>
          <p className="text-xs text-slate-500">
            Create, manage, and publish your organization courses, syllabus sections, quizzes, and assignments.
          </p>
        </div>
        <button
          onClick={() => navigate('/instructor/course-builder/new')}
          className="inline-flex items-center px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Create New Course
        </button>
      </div>

      {/* Search & Status Filter Controls */}
      {!loading && trainings.length > 0 && (
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses by title, category, or syllabus..."
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

          <div className="flex items-center gap-3 flex-wrap self-start sm:self-center">
            {/* Status Filter Pills */}
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
              {[
                { key: 'all', label: 'All' },
                { key: 'published', label: 'Published' },
                { key: 'draft', label: 'Draft' }
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    statusFilter === f.key
                      ? 'bg-white text-emerald-700 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="text-xs text-slate-500 font-medium">
              {search.trim() || statusFilter !== 'all' ? (
                <span>
                  Showing <strong className="text-slate-800">{filteredTrainings.length}</strong> of {trainings.length}
                </span>
              ) : (
                <span>
                  Total <strong className="text-slate-800">{trainings.length}</strong> {trainings.length === 1 ? 'course' : 'courses'}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingSpinner text="Loading courses..." />
      ) : trainings.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No Courses Created"
          description="Create your first course to start adding sections, lectures, quizzes, and project assignments."
          action={
            <button
              onClick={() => navigate('/instructor/course-builder/new')}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white cursor-pointer hover:bg-emerald-700"
            >
              Create Course
            </button>
          }
        />
      ) : filteredTrainings.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No Matching Courses Found"
          description={
            search.trim()
              ? `No courses matched "${search.trim()}". Try searching with a different course title, category, or keyword.`
              : 'No courses matched the selected status filter.'
          }
          action={
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white cursor-pointer hover:bg-emerald-700 shadow-xs transition-colors"
            >
              Clear Search & Filter
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTrainings.map((t) => (
            <div key={t._id} className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between transition-all hover:shadow-md">
              <div>
                <div className="relative h-44 bg-slate-900">
                  {t.thumbnailUrl ? (
                    <img src={t.thumbnailUrl} alt={t.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-900 text-emerald-300 font-bold text-base p-4 text-center">
                      {t.title}
                    </div>
                  )}

                  <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    (t.status === 'published' || t.isPublished) ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                  }`}>
                    {t.status || (t.isPublished ? 'published' : 'draft')}
                  </span>

                  {t.isMandatory && (
                    <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-600 text-white">
                      Mandatory
                    </span>
                  )}
                </div>

                <div className="p-5 space-y-3">
                  <div>
                    <span className="text-[11px] font-semibold text-emerald-700">
                      {t.categoryId?.name || 'General Category'}
                    </span>
                    <h3 className="font-bold text-slate-900 text-base line-clamp-1">{t.title}</h3>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2">{t.description || 'No description provided.'}</p>

                  <div className="flex items-center text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                    <span className="flex items-center">
                      <Layers className="w-3.5 h-3.5 mr-1 text-emerald-600" /> {t.sections?.length || 0} Sections
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <button
                  onClick={() => navigate(`/instructor/course-builder/${t._id}`)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors inline-flex items-center cursor-pointer"
                >
                  <FileCode className="w-3.5 h-3.5 mr-1" />
                  Edit & Course Builder
                </button>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleTogglePublish(t)}
                    disabled={processingId === t._id}
                    title={(t.status === 'published' || t.isPublished) ? 'Unpublish to Draft' : 'Publish Course'}
                    className={`p-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors disabled:opacity-50 ${
                      (t.status === 'published' || t.isPublished) ? 'text-emerald-600 hover:bg-emerald-50' : 'text-amber-600 hover:bg-amber-50'
                    }`}
                  >
                    {processingId === t._id ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(t)}
                    disabled={processingId === t._id}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer disabled:opacity-50"
                    title="Delete Course"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Course Deletion Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(courseToDelete)}
        onClose={() => setCourseToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Training Course"
        message={`Are you sure you want to delete "${courseToDelete?.title || 'this training'}"? This action cannot be undone.`}
        confirmText="Delete Course"
        loading={processingId === courseToDelete?._id}
        closeOnBackdropClick={false}
      />
    </div>
  );
};

