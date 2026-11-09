import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyAssignments } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { formatDate } from '../../utils/formatters';
import { GraduationCap, Play, Lock, CheckCircle2, Clock, Sparkles, Search, X } from 'lucide-react';

export const MyTrainings = () => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'in_progress' | 'completed' | 'overdue'
  const [search, setSearch] = useState('');

  useEffect(() => {
    getMyAssignments()
      .then(res => setAssignments(res.data.data.assignments || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();

  const filtered = assignments.filter((a) => {
    const t = a.trainingId;
    if (!t) return false;

    // 1. Status Filter
    const isOverdue = a.status === 'Overdue' || (new Date(a.deadline) < now && a.status !== 'Completed');
    if (filter === 'completed' && a.status !== 'Completed') return false;
    if (filter === 'overdue' && !isOverdue) return false;
    if (filter === 'in_progress' && !(a.status === 'In Progress' || a.status === 'Assigned')) return false;

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
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="p-4 xs:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 mb-2">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> Learner Hub
          </div>
          <h1 className="text-xl xs:text-2xl font-extrabold text-slate-900 tracking-tight font-heading">My Assigned Courses</h1>
          <p className="text-xs text-slate-500">
            Access your courses, interactive video lessons, quizzes, downloadable PDF resources, and project assignments.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'All Courses' },
            { key: 'in_progress', label: 'In Progress' },
            { key: 'completed', label: 'Completed' },
            { key: 'overdue', label: 'Overdue' }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filter === f.key
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar Controls */}
      {!loading && assignments.length > 0 && (
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assigned courses by title, category, or syllabus..."
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
            {search.trim() || filter !== 'all' ? (
              <span>
                Showing <strong className="text-slate-800">{filtered.length}</strong> of {assignments.length}
              </span>
            ) : (
              <span>
                Total <strong className="text-slate-800">{assignments.length}</strong> {assignments.length === 1 ? 'course' : 'courses'}
              </span>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <LoadingSpinner text="Loading assigned courses..." />
      ) : assignments.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No Courses Assigned"
          description="You currently do not have any assigned courses in your training program."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No Matching Courses Found"
          description={
            search.trim()
              ? `No assigned courses matched "${search.trim()}". Try searching with a different course title, category, or keyword.`
              : 'You currently have no courses under this filter category.'
          }
          action={
            <button
              onClick={() => {
                setSearch('');
                setFilter('all');
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white cursor-pointer hover:bg-emerald-700 shadow-xs transition-colors"
            >
              Clear Search & Filter
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((a) => {
            const t = a.trainingId;
            if (!t) return null;

            const isOverdue = a.status === 'Overdue' || (new Date(a.deadline) < now && a.status !== 'Completed');
            const totalSubSections = t.sections?.reduce((acc, sec) => acc + (sec.subSections?.length || 0), 0) || 0;

            let statusLabel = 'Not Started';
            let badgeStyle = 'bg-teal-600 text-white';

            if (a.status === 'Completed') {
              statusLabel = 'Completed';
              badgeStyle = 'bg-emerald-600 text-white';
            } else if (isOverdue) {
              statusLabel = 'Overdue';
              badgeStyle = 'bg-rose-600 text-white';
            } else if (a.status === 'In Progress' || (a.progressPercentage || 0) > 0) {
              statusLabel = 'In Progress';
              badgeStyle = 'bg-teal-700 text-white';
            }

            const isLocked = a.isLocked || a.lockStatus?.isLocked || a.status === 'Locked';

            return (
              <div
                key={a._id}
                className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between transition-all hover:shadow-md"
              >
                <div>
                  <div className="relative h-44 bg-slate-900">
                    {t.thumbnailUrl ? (
                      <img src={t.thumbnailUrl} alt={t.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-900 text-teal-300 font-bold text-base p-4 text-center">
                        {t.title}
                      </div>
                    )}

                    <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow ${badgeStyle}`}>
                      {statusLabel}
                    </span>

                    {isLocked ? (
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow bg-rose-600 text-white flex items-center border border-rose-400">
                        <Lock className="w-3 h-3 mr-1" /> LOCKED
                      </span>
                    ) : t.isMandatory ? (
                      <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-600 text-white shadow">
                        Compulsory
                      </span>
                    ) : null}
                  </div>

                  <div className="p-5 space-y-3">
                    <div>
                      <span className="text-[11px] font-semibold text-emerald-700">
                        {t.categoryId?.name || 'Course Category'}
                      </span>
                      <h3 className="font-bold text-slate-900 text-base line-clamp-1">{t.title}</h3>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2">{t.description}</p>

                    {/* Progress Bar & SubSections Count */}
                    <div className="space-y-1.5 pt-2">
                      <div className="flex justify-between text-[11px] font-bold text-slate-700">
                        <span>{totalSubSections} Lessons Total</span>
                        <span className="text-emerald-700">{a.progressPercentage || 0}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${a.progressPercentage || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                  <span className={`text-[11px] font-bold flex items-center ${isOverdue ? 'text-rose-600' : 'text-slate-500'}`}>
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    Due: {formatDate(a.deadline)}
                  </span>

                  <button
                    onClick={() => navigate(`/employee/player/${a._id}`)}
                    disabled={isLocked}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all inline-flex items-center cursor-pointer ${
                      isLocked
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                        : a.status === 'Completed'
                        ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                    }`}
                  >
                    {isLocked ? (
                      <>
                        <Lock className="w-3.5 h-3.5 mr-1.5" /> Locked
                      </>
                    ) : a.status === 'Completed' ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Review Course
                      </>
                    ) : (a.progressPercentage || 0) > 0 ? (
                      <>
                        <Play className="w-3.5 h-3.5 mr-1.5" /> Resume Learning
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 mr-1.5" /> Start Learning
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

