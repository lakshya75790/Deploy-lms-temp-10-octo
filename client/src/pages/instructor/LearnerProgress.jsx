import React, { useEffect, useState, useMemo } from 'react';
import { getLearnerProgress } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { useNotification } from '../../context/NotificationContext';
import { formatDate, formatAuditDate } from '../../utils/formatters';
import {
  TrendingUp,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  X,
  Filter,
  RotateCcw,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Award,
  GraduationCap
} from 'lucide-react';

export const LearnerProgress = () => {
  const { addToast } = useNotification();
  const [data, setData] = useState({ records: [], summary: {}, courses: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await getLearnerProgress();
      const payload = res.data?.data || { records: [], summary: {}, courses: [] };
      setData(payload);
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to fetch learner progress data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter records
  const filteredRecords = useMemo(() => {
    const list = data.records || [];
    return list.filter((r) => {
      // Search by learner name or email
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        const nameMatch = (r.learnerName || '').toLowerCase().includes(query);
        const emailMatch = (r.learnerEmail || '').toLowerCase().includes(query);
        const courseMatch = (r.courseTitle || '').toLowerCase().includes(query);
        if (!nameMatch && !emailMatch && !courseMatch) return false;
      }

      // Filter by course
      if (courseFilter !== 'all' && r.courseId !== courseFilter) {
        return false;
      }

      // Filter by progress status
      if (statusFilter !== 'all' && r.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [data.records, search, courseFilter, statusFilter]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, courseFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  const handleResetFilters = () => {
    setSearch('');
    setCourseFilter('all');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  const hasActiveFilters = search.trim() !== '' || courseFilter !== 'all' || statusFilter !== 'all';

  const summary = data.summary || {
    totalLearners: 0,
    activeLearners: 0,
    completedCourses: 0,
    pendingLearners: 0
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 mb-2">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> Learner Analytics & Progress Tracking
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-heading">
            Learner Progress
          </h1>
          <p className="text-xs text-slate-500">
            Monitor real-time course completions, lecture milestones, quiz results, and assignment evaluations across all your assigned learners.
          </p>
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Learners */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between transition-all hover:border-emerald-300">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Learners</p>
            <p className="text-2xl font-extrabold text-slate-900 font-heading mt-1">
              {loading ? '...' : summary.totalLearners ?? 0}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Unique enrolled learners</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Active Learners */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between transition-all hover:border-blue-300">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Learners</p>
            <p className="text-2xl font-extrabold text-blue-600 font-heading mt-1">
              {loading ? '...' : summary.activeLearners ?? 0}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Currently learning / in progress</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Completed Courses */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between transition-all hover:border-emerald-300">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Completed Courses</p>
            <p className="text-2xl font-extrabold text-emerald-600 font-heading mt-1">
              {loading ? '...' : summary.completedCourses ?? 0}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">100% finished curriculums</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Pending Learners */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between transition-all hover:border-amber-300">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pending / In Progress</p>
            <p className="text-2xl font-extrabold text-amber-600 font-heading mt-1">
              {loading ? '...' : summary.pendingLearners ?? 0}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Awaiting completion</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by learner or email..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Course Filter Dropdown */}
          <div className="relative">
            <BookOpen className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none cursor-pointer"
            >
              <option value="all">All Courses ({data.courses?.length || 0})</option>
              {(data.courses || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Progress Status Filter Dropdown */}
          <div className="relative">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          {/* Reset Filters Button */}
          <div>
            <button
              type="button"
              onClick={handleResetFilters}
              disabled={!hasActiveFilters}
              className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center transition-all ${
                hasActiveFilters
                  ? 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 cursor-pointer shadow-2xs'
                  : 'border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed opacity-60'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20">
            <LoadingSpinner message="Loading learner progress records..." />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-16 px-4">
            <EmptyState
              icon={GraduationCap}
              title={hasActiveFilters ? 'No Matching Records' : 'No Learners Assigned'}
              message={
                hasActiveFilters
                  ? 'No learner progress records match your active search or filter criteria. Try clearing filters.'
                  : 'You do not have any learners assigned to your courses yet.'
              }
              actionLabel={hasActiveFilters ? 'Clear Filters' : undefined}
              onAction={hasActiveFilters ? handleResetFilters : undefined}
            />
          </div>
        ) : (
          <div className="p-1">
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4 min-w-[190px]">Learner</th>
                    <th className="py-3 px-4 min-w-[170px]">Email</th>
                    <th className="py-3 px-4 min-w-[180px]">Course</th>
                    <th className="py-3 px-4 min-w-[160px]">Progress</th>
                    <th className="py-3 px-4 min-w-[130px] text-center">Lectures</th>
                    <th className="py-3 px-4 min-w-[140px] text-center">Quiz Result</th>
                    <th className="py-3 px-4 min-w-[140px] text-center">Assignment</th>
                    <th className="py-3 px-4 min-w-[140px]">Last Activity</th>
                    <th className="py-3 px-4 min-w-[110px] text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRecords.map((record) => {
                    const initials = (record.learnerName || 'Learner')
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((n) => n[0].toUpperCase())
                      .join('');

                    return (
                      <tr
                        key={record.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* Learner */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-3">
                            {record.profilePicture ? (
                              <img
                                src={record.profilePicture}
                                alt={record.learnerName}
                                className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0 border border-emerald-200">
                                {initials || 'L'}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate">
                                {record.learnerName}
                              </p>
                              {record.jobRole && (
                                <p className="text-[11px] text-slate-500 truncate">
                                  {record.jobRole}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                          <span className="truncate block max-w-[180px]" title={record.learnerEmail}>
                            {record.learnerEmail}
                          </span>
                        </td>

                        {/* Course */}
                        <td className="py-3.5 px-4">
                          <span
                            className="font-medium text-slate-800 block line-clamp-2 max-w-[200px]"
                            title={record.courseTitle}
                          >
                            {record.courseTitle}
                          </span>
                        </td>

                        {/* Progress */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1.5 w-full max-w-[140px]">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-slate-700">Completion</span>
                              <span
                                className={`font-bold ${
                                  record.progressPercentage === 100
                                    ? 'text-emerald-700'
                                    : record.progressPercentage > 0
                                    ? 'text-blue-700'
                                    : 'text-slate-500'
                                }`}
                              >
                                {record.progressPercentage}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                              <div
                                className={`h-full transition-all duration-300 rounded-full ${
                                  record.progressPercentage === 100
                                    ? 'bg-emerald-600'
                                    : record.progressPercentage > 50
                                    ? 'bg-teal-600'
                                    : record.progressPercentage > 0
                                    ? 'bg-blue-600'
                                    : 'bg-slate-300'
                                }`}
                                style={{ width: `${record.progressPercentage}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Completed Lectures */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {record.completedLectures} / {record.totalLectures}
                          </span>
                        </td>

                        {/* Quiz Performance */}
                        <td className="py-3.5 px-4 text-center">
                          {record.quizPerformance === 'N/A' ? (
                            <span className="text-slate-400 italic text-[11px]">N/A</span>
                          ) : record.quizPerformance === 'Not Attempted' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              Not Attempted
                            </span>
                          ) : record.quizPerformance.includes('Passed') ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {record.quizPerformance}
                            </span>
                          ) : record.quizPerformance.includes('Failed') ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              {record.quizPerformance}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              {record.quizPerformance}
                            </span>
                          )}
                        </td>

                        {/* Assignment Status */}
                        <td className="py-3.5 px-4 text-center">
                          {record.assignmentStatus === 'N/A' ? (
                            <span className="text-slate-400 italic text-[11px]">N/A</span>
                          ) : record.assignmentStatus === 'Not Submitted' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              Not Submitted
                            </span>
                          ) : record.assignmentStatus === 'Pending Review' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              Pending Review
                            </span>
                          ) : record.assignmentStatus.startsWith('Reviewed') ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {record.assignmentStatus}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              {record.assignmentStatus}
                            </span>
                          )}
                        </td>

                        {/* Last Activity */}
                        <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                          <div className="flex items-center space-x-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{formatAuditDate(record.lastActivity)}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          {record.status === 'Completed' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                              Completed
                            </span>
                          ) : record.status === 'In Progress' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200 shadow-2xs">
                              <Clock className="w-3 h-3 mr-1 text-blue-600" />
                              In Progress
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              <AlertCircle className="w-3 h-3 mr-1 text-slate-500" />
                              Not Started
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls (Only shown when filtered count > 10) */}
            {filteredRecords.length > pageSize && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-200">
                <p className="text-xs text-slate-500 font-medium">
                  Showing <span className="font-bold text-slate-800">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                  <span className="font-bold text-slate-800">
                    {Math.min(currentPage * pageSize, filteredRecords.length)}
                  </span> of <span className="font-bold text-slate-800">{filteredRecords.length}</span> learners
                </p>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                    Previous
                  </button>

                  <span className="text-xs font-bold text-slate-700 px-2">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
export default LearnerProgress;

