import React, { useEffect, useState, useMemo } from 'react';
import {
  getInstructorSubmissions,
  getTrainings,
  reviewSubmission,
  downloadAssignmentSubmission,
  getSubmissionPdfViewUrl,
  getSubmissionDownloadUrl
} from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { DocumentPreviewModal } from '../../components/common/DocumentPreviewModal';
import { CustomSelectDropdown } from '../../components/common/CustomSelectDropdown';
import { Pagination } from '../../components/common/Pagination';
import { useNotification } from '../../context/NotificationContext';
import { formatDate } from '../../utils/formatters';
import {
  FileCheck2,
  ExternalLink,
  CheckCircle2,
  Clock,
  Sparkles,
  Code2,
  Link2,
  Download,
  Eye,
  Loader2,
  FileText
} from 'lucide-react';

const getDisplayFileName = (submission) => {
  if (submission?.originalFilename) {
    const fn = submission.originalFilename;
    return fn.toLowerCase().endsWith('.pdf') ? fn : `${fn}.pdf`;
  }
  if (submission?.originalName) {
    const fn = submission.originalName;
    return fn.toLowerCase().endsWith('.pdf') ? fn : `${fn}.pdf`;
  }
  if (submission?.fileName) {
    const fn = submission.fileName;
    return fn.toLowerCase().endsWith('.pdf') ? fn : `${fn}.pdf`;
  }
  if (submission?.fileUrl) {
    try {
      const urlParts = submission.fileUrl.split('/');
      let rawName = decodeURIComponent(urlParts[urlParts.length - 1] || '').split('?')[0];
      if (rawName && rawName.trim() && rawName.length > 3) {
        return rawName.toLowerCase().endsWith('.pdf') ? rawName : `${rawName}.pdf`;
      }
    } catch {
      // fallback
    }
  }
  const empName = (submission?.employeeId?.name || submission?.employee?.name || 'Learner').replace(/[^a-zA-Z0-9_-]/g, '_');
  const assTitle = (submission?.assignmentId?.title || submission?.assignment?.title || 'Assignment').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${empName}_${assTitle}.pdf`;
};

export const SubmissionsReviewer = () => {
  const { addToast } = useNotification();
  const [trainings, setTrainings] = useState([]);
  const [selectedTrainingId, setSelectedTrainingId] = useState('all');
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'submitted' | 'reviewed'
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [activeSubmission, setActiveSubmission] = useState(null);
  const [grade, setGrade] = useState('Good'); // 'Excellent' | 'Good' | 'Satisfactory' | 'Needs Improvement' | 'Poor'
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);

  const handleDownload = async (sub, e) => {
    if (e) e.stopPropagation();
    const subId = sub._id || sub.id;
    if (!subId) return;
    try {
      setDownloadingId(subId);
      const res = await downloadAssignmentSubmission(subId);
      let filename = getDisplayFileName(sub);
      const disposition = res.headers?.['content-disposition'];
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '').trim();
        }
      }
      if (!filename.toLowerCase().endsWith('.pdf')) {
        filename = `${filename}.pdf`;
      }
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      addToast('success', `Downloaded ${filename}`);
    } catch (err) {
      console.error('Download error:', err);
      addToast('error', err.response?.data?.message || 'Failed to download original submission file. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  useEffect(() => {
    getTrainings()
      .then(res => {
        setTrainings(res.data.data.trainings || []);
      })
      .catch(console.error);
  }, []);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const res = await getInstructorSubmissions(selectedTrainingId);
      setSubmissions(res.data.data.submissions || []);
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to fetch instructor submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [selectedTrainingId]);

  const openReviewModal = (sub) => {
    setActiveSubmission(sub);
    setGrade(sub.grade || 'Good');
    setFeedback(sub.feedback || '');
    setShowReviewModal(true);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!activeSubmission) return;

    setSubmitting(true);
    try {
      await reviewSubmission(activeSubmission._id, {
        grade,
        feedback
      });
      addToast('success', 'Assignment evaluated & grade saved successfully!');
      setShowReviewModal(false);
      fetchSubmissions();
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to review submission');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSubmissions = useMemo(() => {
    return submissions.filter(sub => {
      if (filterStatus === 'submitted') return sub.status === 'submitted';
      if (filterStatus === 'reviewed') return sub.status === 'reviewed';
      return true;
    });
  }, [submissions, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredSubmissions.length / pageSize));

  // Reset pagination to page 1 whenever filterStatus or selectedTrainingId changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, selectedTrainingId]);

  // Ensure currentPage is never out of bounds when filtered results update
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedSubmissions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSubmissions.slice(start, start + pageSize);
  }, [filteredSubmissions, currentPage, pageSize]);

  const totalCount = submissions.length;
  const pendingCount = submissions.filter(s => s.status === 'submitted').length;
  const reviewedCount = submissions.filter(s => s.status === 'reviewed').length;

  const trainingOptions = [
    { value: 'all', label: 'All Trainings' },
    ...trainings.map(t => ({ value: t._id, label: t.title }))
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-16">
      {/* Header Bar */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-xs font-semibold text-teal-700 mb-2">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-teal-600" /> Instructor Evaluation Hub
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-heading break-words">Project Submissions & Grading Studio</h1>
          <p className="text-xs text-slate-500">
            Review learner project submissions, evaluate submitted URLs and files, assign qualitative grades, and provide feedback.
          </p>
        </div>

        {/* Training Filter Dropdown */}
        <div className="w-full sm:w-72 md:w-80 max-w-full shrink-0">
          <CustomSelectDropdown
            options={trainingOptions}
            value={selectedTrainingId}
            onChange={(val) => setSelectedTrainingId(val)}
            placeholder="All Trainings"
            accentColor="teal"
          />
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Total Submissions</p>
            <h3 className="text-2xl font-bold text-slate-900">{totalCount}</h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="p-3.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Pending Reviews</p>
            <h3 className="text-2xl font-bold text-amber-600">{pendingCount}</h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Reviewed Submissions</p>
            <h3 className="text-2xl font-bold text-emerald-700">{reviewedCount}</h3>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          {[
            { key: 'all', label: `All (${totalCount})` },
            { key: 'submitted', label: `Pending Review (${pendingCount})` },
            { key: 'reviewed', label: `Reviewed (${reviewedCount})` }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filterStatus === f.key
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Submissions Table / Cards */}
      {loading ? (
        <LoadingSpinner text="Loading project submissions..." />
      ) : filteredSubmissions.length === 0 ? (
        <EmptyState
          icon={FileCheck2}
          title="No Submissions Found"
          description="There are no project submissions under the selected filter criteria."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 min-w-[960px] border-collapse">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 w-[23%] min-w-[210px]">Learner</th>
                  <th className="px-6 py-4 w-[26%] min-w-[230px]">Training & Assignment</th>
                  <th className="px-6 py-4 w-[21%] min-w-[200px]">Submission Details</th>
                  <th className="px-6 py-4 w-[12%] min-w-[130px]">Submitted Date</th>
                  <th className="px-6 py-4 w-[11%] min-w-[120px]">Status & Grade</th>
                  <th className="px-6 py-4 w-[7%] min-w-[130px] text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedSubmissions.map((sub) => {
                  const emp = sub.employeeId || {};
                  const assign = sub.assignmentId || {};
                  const trainingTitle = assign.trainingId?.title || 'Training Course';
                  const assignDesc = assign.instructions || assign.description || '';

                  return (
                    <tr key={sub._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-5 align-middle">
                        <div className="flex items-center space-x-3.5 min-w-0">
                          <img
                            src={emp.profilePicture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(emp.name || 'User')}`}
                            alt={emp.name || 'Learner'}
                            className="w-10 h-10 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0 shadow-2xs"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-900 text-sm truncate leading-snug" title={emp.name || 'Learner'}>
                              {emp.name || 'Learner'}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5 font-normal" title={emp.email || ''}>
                              {emp.email || 'No email provided'}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5 align-middle">
                        <div className="min-w-0 max-w-[230px] sm:max-w-[260px]">
                          <div
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-teal-50 border border-teal-200/80 text-teal-800 text-[10px] font-bold uppercase tracking-wider max-w-full truncate shadow-2xs"
                            title={trainingTitle}
                          >
                            <span className="truncate">{trainingTitle}</span>
                          </div>
                          <h4
                            className="text-slate-900 font-bold text-xs sm:text-sm truncate max-w-full mt-1.5 leading-snug"
                            title={assign.title || 'Project Assignment'}
                          >
                            {assign.title || 'Project Assignment'}
                          </h4>
                          {assignDesc ? (
                            <p
                              className="text-[11px] text-slate-500 line-clamp-2 max-w-full mt-1 leading-relaxed font-normal"
                              title={assignDesc}
                            >
                              {assignDesc}
                            </p>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-6 py-5 align-middle">
                        <div className="min-w-0 max-w-[200px]">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200/80 mb-2">
                            {sub.submissionType === 'github' ? 'URL/Link' : 'File Upload'}
                          </span>

                          {sub.submissionType === 'github' && sub.githubUrl && (
                            <div className="max-w-full">
                              <a
                                href={sub.githubUrl.startsWith('http://') || sub.githubUrl.startsWith('https://') ? sub.githubUrl : `https://${sub.githubUrl}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-teal-700 font-mono font-semibold hover:text-teal-800 hover:underline max-w-full group truncate"
                                title={sub.githubUrl}
                              >
                                <Link2 className="w-3.5 h-3.5 shrink-0 text-teal-600" />
                                <span className="truncate">{sub.githubUrl}</span>
                                <ExternalLink className="w-3 h-3 shrink-0 opacity-70 group-hover:opacity-100" />
                              </a>
                            </div>
                          )}

                          {sub.submissionType === 'file' && sub.fileUrl && (
                            <div className="space-y-1.5 max-w-full">
                              <div
                                className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 max-w-full truncate"
                                title={getDisplayFileName(sub)}
                              >
                                <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                <span className="truncate font-mono text-[11px]">{getDisplayFileName(sub)}</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => setPreviewDoc({
                                    submissionId: sub._id || sub.id,
                                    fileUrl: sub.fileUrl,
                                    fileName: getDisplayFileName(sub),
                                    fileType: 'pdf'
                                  })}
                                  className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200/80 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                  title="Preview PDF In-App"
                                >
                                  <Eye className="w-3 h-3 text-teal-600" />
                                  <span>View PDF</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleDownload(sub, e)}
                                  disabled={downloadingId === (sub._id || sub.id)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50 shadow-2xs"
                                  title="Download Original PDF"
                                >
                                  {downloadingId === (sub._id || sub.id) ? (
                                    <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                                  ) : (
                                    <Download className="w-3 h-3 text-emerald-600" />
                                  )}
                                  <span>Download</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-5 align-middle">
                        <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{formatDate(sub.submittedAt)}</span>
                        </div>
                      </td>

                      <td className="px-6 py-5 align-middle">
                        <div className="space-y-1.5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            sub.status === 'reviewed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {sub.status === 'reviewed' ? '✓ Reviewed' : 'Pending Review'}
                          </span>

                          {sub.status === 'reviewed' && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                              <span className="text-slate-400 text-[11px]">Grade:</span>
                              <span className="font-bold text-emerald-700 text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200/60">
                                {sub.grade || 'Good'}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-5 align-middle text-right">
                        <div className="flex justify-end">
                          <button
                            onClick={() => openReviewModal(sub)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all inline-flex items-center cursor-pointer whitespace-nowrap shadow-xs ${
                              sub.status === 'reviewed'
                                ? 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 hover:border-slate-300 shadow-2xs'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700'
                            }`}
                          >
                            <FileCheck2 className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                            {sub.status === 'reviewed' ? 'View Review' : 'Review Submission'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalItems={filteredSubmissions.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            itemLabel="submissions"
            alwaysShowCount={true}
          />
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <Modal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          title="Evaluate Assignment Submission"
          closeOnBackdropClick={false}
          closeOnEscape={false}
        >
          <form onSubmit={handleReviewSubmit} className="space-y-5">
            {/* Employee & Assignment Header */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{activeSubmission?.employeeId?.name}</h4>
                  <p className="text-xs text-slate-500">{activeSubmission?.employeeId?.email}</p>
                </div>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                  {activeSubmission?.submissionType === 'github' ? 'URL/Link' : 'File Upload'}
                </span>
              </div>

              <div className="pt-2 text-xs space-y-1">
                <p className="text-slate-700">
                  Assignment: <strong>{activeSubmission?.assignmentId?.title}</strong>
                </p>

                {activeSubmission?.submissionType === 'github' && activeSubmission?.githubUrl && (
                  <div className="pt-2">
                    <span className="text-[11px] text-slate-500 font-semibold block mb-1">
                      Submitted URL / Link:
                    </span>
                    <a
                      href={activeSubmission.githubUrl.startsWith('http://') || activeSubmission.githubUrl.startsWith('https://') ? activeSubmission.githubUrl : `https://${activeSubmission.githubUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 text-xs font-semibold transition-colors group cursor-pointer max-w-full"
                      title={`Open: ${activeSubmission.githubUrl}`}
                    >
                      <Link2 className="w-3.5 h-3.5 mr-1.5 text-teal-600 shrink-0" />
                      <span className="truncate max-w-xs sm:max-w-md font-mono">{activeSubmission.githubUrl}</span>
                      <ExternalLink className="w-3 h-3 ml-1.5 text-teal-500 shrink-0" />
                    </a>
                  </div>
                )}

                {activeSubmission?.submissionType === 'file' && activeSubmission?.fileUrl && (
                  <div className="pt-2">
                    <span className="text-[11px] text-slate-500 font-semibold block mb-1">
                      Submitted File:
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewDoc({
                          submissionId: activeSubmission._id || activeSubmission.id,
                          fileUrl: activeSubmission.fileUrl,
                          fileName: getDisplayFileName(activeSubmission),
                          fileType: 'pdf'
                        })}
                        className="inline-flex items-center px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 text-xs font-semibold transition-colors group cursor-pointer"
                        title="Preview Submitted PDF In-App"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1.5 text-teal-600 group-hover:scale-110 transition-transform shrink-0" />
                        <span>View PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDownload(activeSubmission, e)}
                        disabled={downloadingId === (activeSubmission._id || activeSubmission.id)}
                        className="inline-flex items-center px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold transition-colors group cursor-pointer disabled:opacity-50"
                        title="Download Original Submitted PDF"
                      >
                        {downloadingId === (activeSubmission._id || activeSubmission.id) ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-emerald-600 shrink-0" />
                        ) : (
                          <Download className="w-3.5 h-3.5 mr-1.5 text-emerald-600 group-hover:translate-y-0.5 transition-transform shrink-0" />
                        )}
                        <span className="truncate max-w-xs sm:max-w-md font-mono">{getDisplayFileName(activeSubmission)}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Qualitative Grade Dropdown */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Select Qualitative Grade <span className="text-rose-500">*</span>
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:border-emerald-600 outline-none cursor-pointer"
              >
                <option value="Excellent">Excellent - Outstanding execution</option>
                <option value="Good">Good - Solid implementation with minor improvements</option>
                <option value="Satisfactory">Satisfactory - Meets basic requirements</option>
                <option value="Needs Improvement">Needs Improvement - Requires revision</option>
                <option value="Poor">Poor - Incomplete or incorrect submission</option>
              </select>
            </div>

            {/* Feedback Textarea */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Instructor Feedback (Optional)
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
                placeholder="Write constructive qualitative feedback for the employee explaining the evaluation..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:border-emerald-600 outline-none resize-none"
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-all cursor-pointer"
              >
                {submitting ? 'Saving Review...' : 'Submit Review'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* In-App Document Preview Modal */}
      {previewDoc && (
        <DocumentPreviewModal
          isOpen={Boolean(previewDoc)}
          onClose={() => setPreviewDoc(null)}
          fileUrl={previewDoc.fileUrl}
          submissionId={previewDoc.submissionId}
          fileName={previewDoc.fileName}
          title={previewDoc.title}
          fileType={previewDoc.fileType}
        />
      )}
    </div>
  );
};

