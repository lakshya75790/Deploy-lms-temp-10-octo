import React, { useEffect, useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { getInstructorCertificates } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Pagination } from '../../components/common/Pagination';
import { useNotification } from '../../context/NotificationContext';
import { CertificateCanvas, exportCertificatePNG, exportCertificatePDF } from '../../components/common/CertificateCanvas';
import { formatDate } from '../../utils/formatters';
import {
  Award,
  Search,
  Download,
  Eye,
  X,
  BookOpen,
  FileText,
  Filter,
  RotateCcw,
  Building2,
  Calendar,
  ArrowUpDown
} from 'lucide-react';

export const InstructorCertificates = () => {
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedCert, setSelectedCert] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const { addToast } = useNotification();

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      const res = await getInstructorCertificates();
      setCertificates(res.data.data.certificates || []);
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to load course certificates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  const uniqueCourses = useMemo(() => {
    const set = new Set();
    certificates.forEach(c => {
      if (c.training?.title) set.add(c.training.title);
    });
    return Array.from(set).sort();
  }, [certificates]);

  const uniqueDepartments = useMemo(() => {
    const set = new Set();
    certificates.forEach(c => {
      const dept = c.employee?.department?.name;
      if (dept) set.add(dept);
    });
    return Array.from(set).sort();
  }, [certificates]);

  const hasActiveFilters = search.trim() !== '' || selectedCourse !== 'all' || selectedDepartment !== 'all' || dateFilter !== 'all' || sortBy !== 'newest';

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCourse('all');
    setSelectedDepartment('all');
    setDateFilter('all');
    setSortBy('newest');
  };

  const filteredCertificates = useMemo(() => {
    const now = new Date();
    return certificates
      .filter((cert) => {
        // Search filter
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          const certId = (cert.certificateId || '').toLowerCase();
          const emp = (cert.employee?.name || '').toLowerCase();
          const email = (cert.employee?.email || '').toLowerCase();
          const title = (cert.training?.title || '').toLowerCase();
          const dept = (cert.employee?.department?.name || '').toLowerCase();
          const matches = certId.includes(q) || emp.includes(q) || email.includes(q) || title.includes(q) || dept.includes(q);
          if (!matches) return false;
        }

        // Course filter
        if (selectedCourse !== 'all' && cert.training?.title !== selectedCourse) {
          return false;
        }

        // Department / Group filter
        if (selectedDepartment !== 'all') {
          const dept = cert.employee?.department?.name || 'N/A';
          if (dept !== selectedDepartment) return false;
        }

        // Date range filter
        if (dateFilter !== 'all' && cert.completionDate) {
          const certDate = new Date(cert.completionDate);
          const diffDays = (now.getTime() - certDate.getTime()) / (1000 * 60 * 60 * 24);
          if (dateFilter === '7days' && diffDays > 7) return false;
          if (dateFilter === '30days' && diffDays > 30) return false;
          if (dateFilter === '90days' && diffDays > 90) return false;
          if (dateFilter === 'thisYear' && certDate.getFullYear() !== now.getFullYear()) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.completionDate || 0) - new Date(a.completionDate || 0);
        }
        if (sortBy === 'oldest') {
          return new Date(a.completionDate || 0) - new Date(b.completionDate || 0);
        }
        if (sortBy === 'learnerAsc') {
          return (a.employee?.name || '').localeCompare(b.employee?.name || '');
        }
        if (sortBy === 'courseAsc') {
          return (a.training?.title || '').localeCompare(b.training?.title || '');
        }
        return 0;
      });
  }, [certificates, search, selectedCourse, selectedDepartment, dateFilter, sortBy]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCourse, selectedDepartment, dateFilter, sortBy, certificates.length]);

  const paginatedCertificates = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCertificates.slice(start, start + pageSize);
  }, [filteredCertificates, currentPage, pageSize]);

  if (loading) return <LoadingSpinner text="Loading course completion certificates..." />;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Instructor Portal</span>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-heading mt-1">Course Certificates</h1>
          <p className="text-xs text-slate-500 mt-1">
            View and download official completion certificates issued to learners in your training courses.
          </p>
        </div>
        <div className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
          <BookOpen className="w-4 h-4" />
          <span>{certificates.length} Certificate{certificates.length === 1 ? '' : 's'} Issued</span>
        </div>
      </div>

      {/* Filter and Search Controls Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by learner name, email, course title, or certificate ID..."
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-900 focus:bg-white focus:border-amber-500 outline-none transition-all placeholder:text-slate-400"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-2.5 p-0.5 rounded-md text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* Course Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center">
              <BookOpen className="w-3.5 h-3.5 mr-1 text-amber-600" /> Course
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 font-medium focus:border-amber-500 outline-none cursor-pointer"
            >
              <option value="all">All Courses ({uniqueCourses.length})</option>
              {uniqueCourses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Group / Department Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center">
              <Building2 className="w-3.5 h-3.5 mr-1 text-amber-600" /> Group / Dept
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 font-medium focus:border-amber-500 outline-none cursor-pointer"
            >
              <option value="all">All Groups ({uniqueDepartments.length})</option>
              {uniqueDepartments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Timeline / Completion Date Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1 text-amber-600" /> Issued Date
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 font-medium focus:border-amber-500 outline-none cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
              <option value="thisYear">This Year</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center">
              <ArrowUpDown className="w-3.5 h-3.5 mr-1 text-amber-600" /> Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 font-medium focus:border-amber-500 outline-none cursor-pointer"
            >
              <option value="newest">Latest Issued First</option>
              <option value="oldest">Oldest Issued First</option>
              <option value="learnerAsc">Learner Name (A-Z)</option>
              <option value="courseAsc">Course Title (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Status & Reset Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="text-slate-500 font-medium">
            Showing <strong className="text-slate-800 font-bold">{filteredCertificates.length}</strong> of{' '}
            <strong className="text-slate-800 font-bold">{certificates.length}</strong> certificate{certificates.length === 1 ? '' : 's'}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center text-amber-700 hover:text-amber-800 font-semibold cursor-pointer self-start sm:self-auto"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Reset All Filters
            </button>
          )}
        </div>
      </div>

      {/* Certificates Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider text-[11px]">
                <th className="p-4">Certificate ID</th>
                <th className="p-4">Learner Name</th>
                <th className="p-4">Group</th>
                <th className="p-4">Course Title</th>
                <th className="p-4">Completion Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCertificates.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-slate-400 space-y-2">
                    <Award className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">No matching certificates found</p>
                    <p className="text-xs text-slate-400">
                      {hasActiveFilters ? 'Try adjusting your search criteria or filter options.' : 'No certificates have been issued yet.'}
                    </p>
                    {hasActiveFilters && (
                      <button
                        onClick={handleResetFilters}
                        className="mt-2 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 font-semibold text-xs hover:bg-amber-100 transition-colors cursor-pointer inline-flex items-center"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" /> Clear Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedCertificates.map((cert) => (
                  <tr key={cert.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-mono font-bold text-amber-700">
                      {cert.certificateId}
                    </td>
                    <td className="p-4 font-bold text-slate-900">
                      {cert.employee?.name}
                    </td>
                    <td className="p-4 text-slate-500">
                      {cert.employee?.department?.name || 'N/A'}
                    </td>
                    <td className="p-4 font-semibold text-slate-800">
                      {cert.training?.title}
                    </td>
                    <td className="p-4 text-slate-500 font-mono">
                      {formatDate(cert.completionDate)}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedCert(cert)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                        title="View Certificate"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCert(cert);
                          setTimeout(() => {
                            exportCertificatePNG(`inst_cert_${cert.id}`, `Certificate_${cert.certificateId}.png`);
                          }, 150);
                        }}
                        className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors cursor-pointer"
                        title="Download PNG"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCert(cert);
                          setTimeout(() => {
                            exportCertificatePDF(`inst_cert_${cert.id}`, `Certificate_${cert.certificateId}.pdf`);
                          }, 150);
                        }}
                        className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-colors cursor-pointer"
                        title="Download PDF"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={filteredCertificates.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemLabel="certificates"
        />
      </div>

      {/* FULL VIEW MODAL */}
      {selectedCert && ReactDOM.createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/80 backdrop-blur-md animate-fade-in overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="relative w-full max-w-6xl h-[84vh] sm:h-[88vh] max-h-[820px] bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col shadow-2xl overflow-hidden my-auto shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 sm:pb-4 gap-3 shrink-0">
              <div className="min-w-0 pr-2">
                <span className="text-[11px] font-bold text-amber-600 font-mono tracking-wider">{selectedCert.certificateId}</span>
                <h2
                  className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5 truncate"
                  title={`${selectedCert.employee?.name ? `${selectedCert.employee.name} • ` : ''}${selectedCert.training?.title || ''}`}
                >
                  {selectedCert.employee?.name ? `${selectedCert.employee.name} • ` : ''}
                  {selectedCert.training?.title}
                </h2>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => setSelectedCert(null)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                  aria-label="Close Certificate View"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 min-w-0 p-2 sm:p-4 flex items-center justify-center bg-slate-900/5 border border-slate-200/80 rounded-xl overflow-hidden mt-3 sm:mt-4">
              <CertificateCanvas
                certificate={selectedCert}
                elementId={`inst_cert_${selectedCert.id}`}
                className="w-full h-full"
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

