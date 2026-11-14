import React, { useEffect, useState, useMemo } from 'react';
import { getMyFeedback, getSubmissionPdfViewUrl } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { DocumentPreviewModal } from '../../components/common/DocumentPreviewModal';
import { Pagination } from '../../components/common/Pagination';
import { useNotification } from '../../context/NotificationContext';
import { formatDate } from '../../utils/formatters';
import {
  MessageSquare,
  ExternalLink,
  Code2,
  FileText,
  Download,
  Sparkles,
  User,
  History,
  BookOpen,
  ChevronRight
} from 'lucide-react';

export const EmployeeFeedback = () => {
  const { addToast } = useNotification();
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Detail Modal State
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const res = await getMyFeedback();
      setFeedbackList(res.data.data.submissions || []);
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to fetch instructor feedback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  // Course-wise grouping: group multiple feedback entries by course to avoid duplicate cards
  const courseFeedbackGroups = useMemo(() => {
    const groupsMap = new Map();
    feedbackList.forEach((sub) => {
      const assign = sub.assignmentId || {};
      const training = assign.trainingId || {};
      const courseId = training._id || training.id || training.title || 'general';

      if (!groupsMap.has(courseId)) {
        groupsMap.set(courseId, {
          courseId,
          courseTitle: training.title || 'Training Course',
          instructor: sub.reviewedBy || training.createdBy || {},
          submissions: []
        });
      }
      groupsMap.get(courseId).submissions.push(sub);
    });

    groupsMap.forEach((group) => {
      group.submissions.sort((a, b) => new Date(b.reviewedAt || b.updatedAt || 0) - new Date(a.reviewedAt || a.updatedAt || 0));
      group.latest = group.submissions[0];
    });

    return Array.from(groupsMap.values()).sort(
      (a, b) => new Date(b.latest?.reviewedAt || b.latest?.updatedAt || 0) - new Date(a.latest?.reviewedAt || a.latest?.updatedAt || 0)
    );
  }, [feedbackList]);

  useEffect(() => {
    setCurrentPage(1);
  }, [courseFeedbackGroups.length]);

  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return courseFeedbackGroups.slice(start, start + pageSize);
  }, [courseFeedbackGroups, currentPage, pageSize]);

  const openDetailModal = (item, group = null) => {
    setSelectedItem(item);
    setSelectedGroup(group);
    setShowModal(true);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80 text-xs font-semibold text-teal-700 dark:text-teal-300 mb-2">
          <Sparkles className="w-3.5 h-3.5 mr-1.5 text-teal-600 dark:text-teal-400" /> Instructor Evaluation Hub
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight font-heading">Feedback</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          View feedback and evaluation provided by your instructors for submitted assignments.
        </p>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading instructor feedback..." />
      ) : courseFeedbackGroups.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No Feedback Yet"
          description="Your instructors haven't reviewed any submitted assignments yet. Once an instructor reviews an assignment, the feedback will appear here."
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {paginatedGroups.map((group) => {
              const sub = group.latest;
              const assign = sub.assignmentId || {};
              const training = assign.trainingId || {};
              const instructor = sub.reviewedBy || training.createdBy || group.instructor || {};
              const isLongFeedback = sub.feedback && sub.feedback.length > 180;
              const hasMultipleReviews = group.submissions.length > 1;

              return (
                <div
                  key={group.courseId}
                  className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 flex flex-col justify-between hover:border-teal-300 dark:hover:border-teal-700 transition-all duration-300"
                >
                  <div className="space-y-3">
                    {/* Top Bar: Course Title, Total Reviews Badge & Latest Grade */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 flex-wrap gap-1 mb-0.5">
                          <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider truncate">
                            {group.courseTitle}
                          </span>
                          {hasMultipleReviews && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 inline-flex items-center">
                              <History className="w-3 h-3 mr-1 text-teal-600 dark:text-teal-400" />
                              {group.submissions.length} Reviews
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 line-clamp-1">
                          {assign.title || 'Project Assignment'}
                        </h3>
                      </div>

                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-600 dark:bg-teal-600 text-white shadow-xs flex-shrink-0">
                        ✓ Grade: {sub.grade || 'Good'}
                      </span>
                    </div>

                    {/* Instructor Info & Review Date */}
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                      <div className="flex items-center space-x-2">
                        <img
                          src={instructor.profilePicture || `https://api.dicebear.com/7.x/initials/svg?seed=${instructor.name || 'Instructor'}`}
                          alt={instructor.name || 'Instructor'}
                          className="w-7 h-7 rounded-lg object-cover bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                        />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Instructor: {instructor.name || 'Instructor'}
                        </span>
                      </div>

                      <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        Reviewed: {formatDate(sub.reviewedAt || sub.updatedAt)}
                      </span>
                    </div>

                    {/* Submission Link / Asset */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between">
                      <span className="font-semibold text-slate-600 dark:text-slate-300 text-[11px]">
                        Submission Type: {sub.submissionType === 'github' ? 'Project URL / Link' : 'Uploaded File'}
                      </span>

                      {sub.submissionType === 'github' && sub.githubUrl && (
                        <a
                          href={sub.githubUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-teal-700 dark:text-teal-400 font-mono font-bold text-[11px] hover:underline flex items-center"
                        >
                          <Code2 className="w-3.5 h-3.5 mr-1" /> View Link <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      )}

                      {sub.submissionType === 'file' && sub.fileUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewDoc({
                            submissionId: sub._id || sub.id,
                            fileUrl: sub.fileUrl,
                            fileName: sub.assignmentId?.title ? `${sub.assignmentId.title}.pdf` : 'Assignment_Submission.pdf',
                            fileType: 'pdf'
                          })}
                          className="text-emerald-700 dark:text-emerald-400 font-mono font-bold text-[11px] hover:underline flex items-center cursor-pointer bg-transparent border-0 p-0"
                        >
                          <FileText className="w-3.5 h-3.5 mr-1" /> View PDF <ExternalLink className="w-3 h-3 ml-1" />
                        </button>
                      )}
                    </div>

                    {/* Instructor Written Feedback */}
                    <div className="space-y-1 pt-1">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center">
                        <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-teal-600 dark:text-teal-400" /> Instructor Feedback:
                      </p>

                      {sub.feedback ? (
                        <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/60 text-xs text-teal-950 dark:text-teal-200 leading-relaxed italic">
                          "{isLongFeedback ? `${sub.feedback.slice(0, 180)}...` : sub.feedback}"
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 dark:text-slate-500 italic p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                          No written feedback was provided.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Footer Action for Modal */}
                  <div className="pt-2 flex items-center justify-end space-x-2">
                    {hasMultipleReviews && (
                      <button
                        onClick={() => openDetailModal(sub, group)}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800 transition-all cursor-pointer inline-flex items-center"
                      >
                        <History className="w-3.5 h-3.5 mr-1.5" />
                        View History ({group.submissions.length})
                      </button>
                    )}
                    <button
                      onClick={() => openDetailModal(sub, group)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-teal-600 hover:text-white text-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-teal-600 dark:hover:text-white transition-all cursor-pointer inline-flex items-center"
                    >
                      View Evaluation
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            currentPage={currentPage}
            totalItems={courseFeedbackGroups.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            itemLabel="courses"
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
          />
        </div>
      )}

      {/* FULL FEEDBACK DETAIL MODAL */}
      {showModal && selectedItem && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Assignment Evaluation & Feedback"
          closeOnBackdropClick={false}
          closeOnEscape={false}
        >
          <div className="space-y-5">
            {/* History Selector if multiple reviews exist */}
            {selectedGroup && selectedGroup.submissions.length > 1 && (
              <div className="space-y-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center">
                    <History className="w-3.5 h-3.5 mr-1 text-teal-600 dark:text-teal-400" />
                    Review History ({selectedGroup.submissions.length} evaluations):
                  </span>
                </div>
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
                  {selectedGroup.submissions.map((item, idx) => {
                    const isSelected = item._id === selectedItem._id;
                    return (
                      <button
                        key={item._id}
                        type="button"
                        onClick={() => setSelectedItem(item)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-teal-600 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        Review #{selectedGroup.submissions.length - idx} • {formatDate(item.reviewedAt || item.updatedAt)} ({item.grade || 'Good'})
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Header info */}
            <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/60 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
                    {selectedItem.assignmentId?.trainingId?.title || 'Training Course'}
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 font-heading">
                    {selectedItem.assignmentId?.title || 'Project Assignment'}
                  </h3>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-600 text-white shadow-xs">
                  ✓ Grade: {selectedItem.grade || 'Good'}
                </span>
              </div>
            </div>

            {/* Dates & Instructor details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                <p className="text-slate-500 dark:text-slate-400 font-medium">Instructor</p>
                <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center">
                  <User className="w-3.5 h-3.5 mr-1 text-teal-600 dark:text-teal-400" />
                  {selectedItem.reviewedBy?.name || selectedItem.assignmentId?.trainingId?.createdBy?.name || 'Instructor'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                <p className="text-slate-500 dark:text-slate-400 font-medium">Submission Date</p>
                <p className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {formatDate(selectedItem.submittedAt)}
                </p>
              </div>
            </div>

            {/* Submission Link */}
            {selectedItem.submissionType === 'github' && selectedItem.githubUrl && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Submitted Link / Project URL:</span>
                <a
                  href={selectedItem.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-teal-700 dark:text-teal-400 font-mono font-bold hover:underline flex items-center"
                >
                  <Code2 className="w-3.5 h-3.5 mr-1" /> {selectedItem.githubUrl} <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
            )}

            {selectedItem.submissionType === 'file' && selectedItem.fileUrl && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Submitted File:</span>
                <button
                  type="button"
                  onClick={() => setPreviewDoc({
                    submissionId: selectedItem._id || selectedItem.id,
                    fileUrl: selectedItem.fileUrl,
                    fileName: selectedItem.assignmentId?.title ? `${selectedItem.assignmentId.title}.pdf` : 'Assignment_Submission.pdf',
                    fileType: 'pdf'
                  })}
                  className="text-emerald-700 dark:text-emerald-400 font-mono font-bold hover:underline flex items-center cursor-pointer bg-transparent border-0 p-0"
                >
                  <FileText className="w-3.5 h-3.5 mr-1" /> View PDF <ExternalLink className="w-3 h-3 ml-1" />
                </button>
              </div>
            )}

            {/* Complete Written Feedback */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Instructor Written Feedback
              </label>

              {selectedItem.feedback ? (
                <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/60 text-xs text-teal-950 dark:text-teal-200 leading-relaxed italic whitespace-pre-wrap">
                  "{selectedItem.feedback}"
                </div>
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  No written feedback was provided.
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-900 dark:bg-slate-800 text-white dark:text-slate-100 hover:bg-slate-800 dark:hover:bg-slate-700 cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
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

