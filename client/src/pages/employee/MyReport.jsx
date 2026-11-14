import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { getMyReport } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Pagination } from '../../components/common/Pagination';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/formatters';
import {
  GraduationCap,
  CheckCircle2,
  BarChart3,
  Award,
  Download,
  HelpCircle,
  FileCheck2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
  FileText,
  X
} from 'lucide-react';
import { DocumentPreviewModal } from '../../components/common/DocumentPreviewModal';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const MyReport = () => {
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  // Pagination Config & States
  const TRANSCRIPT_PAGE_SIZE = 5;
  const QUIZ_PAGE_SIZE = 5;
  const ASSIGNMENT_PAGE_SIZE = 10;
  const [transcriptPage, setTranscriptPage] = useState(1);
  const [quizPage, setQuizPage] = useState(1);
  const [assignmentPage, setAssignmentPage] = useState(1);

  // Modals States
  const [selectedQuizAttempt, setSelectedQuizAttempt] = useState(null);
  const [modalContent, setModalContent] = useState(null); // { title: string, text: string }
  const [previewDoc, setPreviewDoc] = useState(null);

  useEffect(() => {
    getMyReport()
      .then(res => setReport(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Reset pagination to page 1 whenever underlying datasets change
  useEffect(() => {
    setTranscriptPage(1);
  }, [report?.assignments?.length]);

  useEffect(() => {
    setQuizPage(1);
  }, [report?.quizAttempts?.length]);

  // Handle modal body scroll lock and ESC key suppression strictly
  useEffect(() => {
    if (selectedQuizAttempt || modalContent) {
      document.body.style.overflow = 'hidden';
      const mainEl = document.querySelector('main');
      if (mainEl) mainEl.style.overflow = 'hidden';

      const suppressEsc = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
        }
      };

      window.addEventListener('keydown', suppressEsc, true);
      return () => {
        if (!selectedQuizAttempt && !modalContent) {
          document.body.style.overflow = 'unset';
          if (mainEl) mainEl.style.overflow = 'auto';
        }
        window.removeEventListener('keydown', suppressEsc, true);
      };
    } else {
      document.body.style.overflow = 'unset';
      const mainEl = document.querySelector('main');
      if (mainEl) mainEl.style.overflow = 'auto';
    }
  }, [selectedQuizAttempt, modalContent]);

  const handleDownloadPDF = () => {
    if (!report) return;

    const doc = new jsPDF();
    const emp = report.employee || {};
    const overview = report.overview || {};
    const assignments = report.assignments || [];
    const quizAttempts = report.quizAttempts || [];
    const assignmentSubmissions = report.assignmentSubmissions || [];

    // Header Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Personal Training Report', 14, 20);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 26);

    // Section 1: Learner Details
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Learner Information', 14, 34);

    autoTable(doc, {
      startY: 37,
      theme: 'grid',
      head: [['Learner Name', 'Email', 'Group', 'Subgroup', 'Organization']],
      body: [[
        emp.name || user?.name || 'N/A',
        emp.email || user?.email || 'N/A',
        emp.department || user?.department?.name || 'Unassigned',
        emp.jobRole || 'Learner',
        emp.organization || 'Organization'
      ]],
      styles: { fontSize: 8 }
    });

    // Section 2: Summary Metrics
    let currentY = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Training Summary & Performance Metrics', 14, currentY);

    autoTable(doc, {
      startY: currentY + 3,
      theme: 'grid',
      head: [['Total Assigned', 'Completed', 'In Progress', 'Overdue', 'Overall Progress', 'Avg Quiz Score']],
      body: [[
        overview.totalAssigned || 0,
        overview.completedCourses || 0,
        overview.inProgressAssignments || 0,
        overview.overdueAssignments || 0,
        `${overview.overallProgress || 0}%`,
        `${overview.averageQuizScore || 0}%`
      ]],
      styles: { fontSize: 8 }
    });

    // Section 3: Course Transcript
    currentY = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Course Transcript & History', 14, currentY);

    const transcriptRows = assignments.map(a => [
      a.title,
      a.category,
      a.instructorName,
      a.assignedDate ? formatDate(a.assignedDate) : 'N/A',
      a.deadline ? formatDate(a.deadline) : 'N/A',
      `${a.progressPercentage}%`,
      a.status,
      a.quizScore,
      a.assignmentStatus
    ]);

    autoTable(doc, {
      startY: currentY + 3,
      theme: 'striped',
      head: [['Title', 'Category', 'Instructor', 'Assigned', 'Deadline', 'Progress', 'Status', 'Quiz Score', 'Assignment']],
      body: transcriptRows.length > 0 ? transcriptRows : [['No training courses assigned', '', '', '', '', '', '', '', '']],
      styles: { fontSize: 7, cellPadding: 2 }
    });

    // Section 4: Quiz Attempt & Question Breakdown
    quizAttempts.forEach((att) => {
      currentY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : currentY + 8;
      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Quiz: ${att.quizTitle} (Attempt ${att.attemptNumber} • Score: ${att.percentage}% • ${att.passed ? 'PASSED' : 'FAILED'})`, 14, currentY);

      const qAnsRows = (att.answers || []).map((ans, idx) => {
        let selText = ans.selectedAnswerText || '';
        if (!selText) {
          selText = ans.status === 'data_unavailable' ? 'Answer data unavailable' : (ans.status === 'not_answered' ? 'Not Answered' : 'N/A');
        }

        let statusText = 'Incorrect';
        if (ans.isCorrect) statusText = 'Correct';
        else if (ans.status === 'not_answered') statusText = 'Not Answered';
        else if (ans.status === 'data_unavailable') statusText = 'Data Unavailable';

        return [
          `Q${idx + 1}: ${ans.questionText || `Question ${idx + 1}`}`,
          selText,
          ans.correctAnswerText || 'N/A',
          statusText
        ];
      });

      autoTable(doc, {
        startY: currentY + 3,
        theme: 'grid',
        head: [['Question', 'Your Answer', 'Correct Answer', 'Result']],
        body: qAnsRows.length > 0 ? qAnsRows : [['No question answers recorded', '', '', '']],
        styles: { fontSize: 7, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { cellWidth: 50 },
          2: { cellWidth: 50 },
          3: { cellWidth: 20 }
        }
      });
    });

    // Section 5: Project Assignment Submissions
    currentY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : currentY + 8;
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Project Assignment Submissions', 14, currentY);

    const assignRows = assignmentSubmissions.map(s => [
      s.assignmentTitle,
      s.submissionType === 'github' ? 'Project URL' : 'File Upload',
      s.githubUrl || s.fileUrl || 'N/A',
      s.submittedAt ? formatDate(s.submittedAt) : 'N/A',
      s.status
    ]);

    autoTable(doc, {
      startY: currentY + 3,
      theme: 'grid',
      head: [['Assignment Title', 'Submission Type', 'Link / File', 'Date Submitted', 'Status']],
      body: assignRows.length > 0 ? assignRows : [['No assignment submissions recorded', '', '', '', '']],
      styles: { fontSize: 7, cellPadding: 2 }
    });

    doc.save(`Personal_Training_Report_${(emp.name || 'Learner').replace(/\s+/g, '_')}.pdf`);
  };

  if (loading) return <LoadingSpinner text="Compiling your personal training report & stats..." />;

  if (!report) return <EmptyState title="Report Unavailable" description="Unable to load personal training report statistics." />;

  const { overview = {}, assignments = [], quizAttempts = [], assignmentSubmissions = [] } = report;

  // Pagination Slices
  const totalTranscriptItems = assignments.length;
  const totalTranscriptPages = Math.ceil(totalTranscriptItems / TRANSCRIPT_PAGE_SIZE) || 1;
  const currentTranscriptPage = Math.min(Math.max(transcriptPage, 1), totalTranscriptPages);
  const paginatedAssignments = assignments.slice(
    (currentTranscriptPage - 1) * TRANSCRIPT_PAGE_SIZE,
    currentTranscriptPage * TRANSCRIPT_PAGE_SIZE
  );

  const totalQuizItems = quizAttempts.length;
  const totalQuizPages = Math.ceil(totalQuizItems / QUIZ_PAGE_SIZE) || 1;
  const currentQuizPage = Math.min(Math.max(quizPage, 1), totalQuizPages);
  const paginatedQuizAttempts = quizAttempts.slice(
    (currentQuizPage - 1) * QUIZ_PAGE_SIZE,
    currentQuizPage * QUIZ_PAGE_SIZE
  );

  const totalAssignmentItems = assignmentSubmissions.length;
  const totalAssignmentPages = Math.ceil(totalAssignmentItems / ASSIGNMENT_PAGE_SIZE) || 1;
  const currentAssignmentPage = Math.min(Math.max(assignmentPage, 1), totalAssignmentPages);
  const paginatedAssignmentSubmissions = assignmentSubmissions.slice(
    (currentAssignmentPage - 1) * ASSIGNMENT_PAGE_SIZE,
    currentAssignmentPage * ASSIGNMENT_PAGE_SIZE
  );

  // Chart Data Preparation
  const progressChartData = assignments.map(a => ({
    name: a.title.length > 15 ? a.title.slice(0, 15) + '...' : a.title,
    Progress: a.progressPercentage || 0
  }));

  const pieData = [
    { name: 'Completed', value: overview.completedCourses || 0, color: '#10b981' },
    { name: 'In Progress', value: overview.inProgressAssignments || 0, color: '#0f766e' },
    { name: 'Not Started', value: overview.notStartedAssignments || 0, color: '#94a3b8' },
    { name: 'Overdue', value: overview.overdueAssignments || 0, color: '#e11d48' }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-16">
      {/* Full Text View Modal for Long Questions / Answers */}
      {modalContent && ReactDOM.createPortal(
        <div
          className="fixed inset-0 z-[99995] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl space-y-4 my-auto relative animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base font-heading">{modalContent.title}</h3>
              <button
                type="button"
                onClick={() => setModalContent(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                title="Close (X)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 font-mono whitespace-pre-wrap break-words leading-relaxed">
              {modalContent.text}
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setModalContent(null)}
                className="px-5 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Header Bar */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 mb-2">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> Learner Performance Hub
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-heading">Personal Training Report & Stats</h1>
          <p className="text-xs text-slate-500">
            View your training progress, completion history, quiz performance, and learning activity.
          </p>
        </div>

        <button
          onClick={handleDownloadPDF}
          className="inline-flex items-center px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer"
        >
          <Download className="w-4 h-4 mr-2" /> Download Report PDF
        </button>
      </div>

      {/* Top Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Total Assigned</p>
            <h3 className="text-2xl font-bold text-slate-900">{overview.totalAssigned || 0}</h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Completed Courses</p>
            <h3 className="text-2xl font-bold text-emerald-700">{overview.completedCourses || 0}</h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="p-3.5 rounded-xl bg-teal-50 text-teal-600 border border-teal-100">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Overall Progress</p>
            <h3 className="text-2xl font-bold text-slate-900">{overview.overallProgress || 0}%</h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="p-3.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Average Quiz Score</p>
            <h3 className="text-2xl font-bold text-amber-700">{overview.averageQuizScore || 0}%</h3>
          </div>
        </div>
      </div>

      {/* Progress Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Training Progress Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center">
            <BarChart3 className="w-4 h-4 mr-2 text-emerald-600" /> Course Progress Breakdown
          </h3>
          {progressChartData.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-12">No training progress recorded yet.</p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={progressChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                  <YAxis domain={[0, 100]} stroke="#64748b" fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="Progress" fill="#059669" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Training Status Distribution Pie Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center">
            <Layers className="w-4 h-4 mr-2 text-emerald-600" /> Status Distribution
          </h3>
          {pieData.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-12">No active training status data.</p>
          ) : (
            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Course Transcript & History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base font-heading">Course Transcript & History</h3>
            <p className="text-xs text-slate-500">Your complete training record, deadlines, scores, and completion status.</p>
          </div>
          {totalTranscriptItems > 0 && (
            <span className="text-xs font-semibold text-slate-500">
              {totalTranscriptItems} {totalTranscriptItems === 1 ? 'Record' : 'Total Records'}
            </span>
          )}
        </div>

        {assignments.length === 0 ? (
          <EmptyState title="No Course History" description="Your assigned courses and transcript will appear here." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Training Title</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Instructor</th>
                    <th className="p-3.5">Assigned Date</th>
                    <th className="p-3.5">Deadline</th>
                    <th className="p-3.5">Progress</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Completion Date</th>
                    <th className="p-3.5">Quiz Score</th>
                    <th className="p-3.5 text-right">Assignment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedAssignments.map((a) => (
                    <tr key={a._id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900">{a.title}</td>
                      <td className="p-3.5 text-emerald-700 font-semibold">{a.category}</td>
                      <td className="p-3.5">{a.instructorName}</td>
                      <td className="p-3.5 font-mono text-[11px] text-slate-500">{formatDate(a.assignedDate)}</td>
                      <td className="p-3.5 font-mono text-[11px] text-slate-500">{formatDate(a.deadline)}</td>
                      <td className="p-3.5 font-bold text-emerald-700">{a.progressPercentage}%</td>
                      <td className="p-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${a.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            a.status === 'Overdue' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                              'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-slate-500">{a.completedDate ? formatDate(a.completedDate) : '-'}</td>
                      <td className="p-3.5 font-bold text-amber-600">{a.quizScore}</td>
                      <td className="p-3.5 text-right font-bold text-teal-700">{a.assignmentStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls for Course Transcript & History */}
            {totalTranscriptItems > TRANSCRIPT_PAGE_SIZE && (
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="text-slate-500">
                  Showing <strong className="text-slate-900">{(currentTranscriptPage - 1) * TRANSCRIPT_PAGE_SIZE + 1}</strong> to{' '}
                  <strong className="text-slate-900">{Math.min(currentTranscriptPage * TRANSCRIPT_PAGE_SIZE, totalTranscriptItems)}</strong> of{' '}
                  <strong className="text-slate-900">{totalTranscriptItems}</strong> records
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    disabled={currentTranscriptPage === 1}
                    onClick={() => setTranscriptPage(prev => Math.max(prev - 1, 1))}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 cursor-pointer inline-flex items-center transition-colors shadow-2xs font-medium"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
                  </button>

                  <span className="px-3 py-1.5 rounded-xl font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Page {currentTranscriptPage} of {totalTranscriptPages}
                  </span>

                  <button
                    type="button"
                    disabled={currentTranscriptPage === totalTranscriptPages}
                    onClick={() => setTranscriptPage(prev => Math.min(prev + 1, totalTranscriptPages))}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 cursor-pointer inline-flex items-center transition-colors shadow-2xs font-medium"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Quiz Performance & Attempt History */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base flex items-center font-heading">
              <HelpCircle className="w-4 h-4 mr-2 text-amber-600" /> Quiz Performance & Attempt History
            </h3>
            <p className="text-xs text-slate-500">All quiz attempts, score breakdowns, and question-level evaluation records.</p>
          </div>
          {totalQuizItems > 0 && (
            <span className="text-xs font-semibold text-slate-500">
              {totalQuizItems} {totalQuizItems === 1 ? 'Attempt' : 'Total Attempts'}
            </span>
          )}
        </div>

        {quizAttempts.length === 0 ? (
          <EmptyState icon={HelpCircle} title="No Quiz Activity" description="You have not attempted any section quizzes yet." />
        ) : (
          <>
            <div className="space-y-3">
              {paginatedQuizAttempts.map((att) => {
                const answersList = att.answers || [];
                const correctCount = answersList.filter(a => a.isCorrect).length;
                const incorrectCount = answersList.filter(a => !a.isCorrect && a.status === 'incorrect').length;
                const notAnsweredCount = answersList.filter(a => a.status === 'not_answered').length;

                return (
                  <div
                    key={att._id}
                    onClick={() => setSelectedQuizAttempt(att)}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/90 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:border-emerald-300 hover:shadow-xs"
                    title="Click to view complete attempt details"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
                          {att.quizTitle}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Attempt {att.attemptNumber}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                        <span className="inline-flex items-center">
                          <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          Date: {formatDate(att.createdAt)}
                        </span>
                        <span>•</span>
                        <span>Passing Threshold: {att.passingScorePercent}%</span>
                        <span>•</span>
                        <span className="text-emerald-700 font-bold">{correctCount} Correct</span>
                        <span>•</span>
                        <span className="text-rose-600 font-bold">{incorrectCount} Incorrect</span>
                        {notAnsweredCount > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-amber-700 font-bold">{notAnsweredCount} Unanswered</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 self-start sm:self-auto shrink-0">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${att.passed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                        {att.percentage}% ({att.passed ? '✓ PASSED' : '✕ FAILED'})
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedQuizAttempt(att);
                        }}
                        className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 transition-colors cursor-pointer shadow-2xs"
                        title="Open Quiz Attempt Details Modal"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1 text-slate-400 group-hover:text-white transition-colors" />
                        <span>View Details</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls for Quiz Performance & Attempt History */}
            {totalQuizItems > QUIZ_PAGE_SIZE && (
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="text-slate-500">
                  Showing <strong className="text-slate-900">{(currentQuizPage - 1) * QUIZ_PAGE_SIZE + 1}</strong> to{' '}
                  <strong className="text-slate-900">{Math.min(currentQuizPage * QUIZ_PAGE_SIZE, totalQuizItems)}</strong> of{' '}
                  <strong className="text-slate-900">{totalQuizItems}</strong> attempts
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    disabled={currentQuizPage === 1}
                    onClick={() => setQuizPage(prev => Math.max(prev - 1, 1))}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 cursor-pointer inline-flex items-center transition-colors shadow-2xs font-medium"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
                  </button>

                  <span className="px-3 py-1.5 rounded-xl font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    Page {currentQuizPage} of {totalQuizPages}
                  </span>

                  <button
                    type="button"
                    disabled={currentQuizPage === totalQuizPages}
                    onClick={() => setQuizPage(prev => Math.min(prev + 1, totalQuizPages))}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 cursor-pointer inline-flex items-center transition-colors shadow-2xs font-medium"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Dedicated Quiz Attempt Details Modal */}
      {selectedQuizAttempt && (() => {
        const answersList = selectedQuizAttempt.answers || [];
        const correctCount = answersList.filter(a => a.isCorrect).length;
        const incorrectCount = answersList.filter(a => !a.isCorrect && a.status === 'incorrect').length;
        const notAnsweredCount = answersList.filter(a => a.status === 'not_answered').length;
        const totalQuestions = answersList.length;

        return ReactDOM.createPortal(
          <div
            className="fixed inset-0 z-[99990] flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in"
            // Backdrop click intentionally does NOT close the modal
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[88vh] sm:max-h-[85vh] shadow-2xl flex flex-col overflow-hidden my-auto relative animate-fade-in"
              // Outside click intentionally does NOT close the modal
              onClick={(e) => e.stopPropagation()}
            >
              {/* MODAL HEADER */}
              <div className="flex items-start justify-between p-4 sm:p-5 sm:px-6 border-b border-slate-200 bg-slate-50/90 shrink-0 gap-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                      <HelpCircle className="w-3.5 h-3.5 mr-1 text-amber-600 shrink-0" />
                      Quiz Attempt Details
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Attempt {selectedQuizAttempt.attemptNumber}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider ${selectedQuizAttempt.passed
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                      {selectedQuizAttempt.passed ? '✓ Passed' : '✕ Failed'}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-base sm:text-xl font-heading truncate leading-snug" title={selectedQuizAttempt.quizTitle}>
                    {selectedQuizAttempt.quizTitle}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-500 pt-0.5">
                    <span>Date: <strong className="text-slate-700">{formatDate(selectedQuizAttempt.createdAt)}</strong></span>
                    <span>•</span>
                    <span>Passing Threshold: <strong className="text-slate-700">{selectedQuizAttempt.passingScorePercent}%</strong></span>
                    <span>•</span>
                    <span>Final Score: <strong className={selectedQuizAttempt.passed ? 'text-emerald-700' : 'text-rose-600'}>{selectedQuizAttempt.percentage}%</strong></span>
                  </div>
                </div>

                {/* DEDICATED CLOSE (X) BUTTON - ONLY WAY TO CLOSE THE MODAL */}
                <button
                  type="button"
                  onClick={() => setSelectedQuizAttempt(null)}
                  aria-label="Close Quiz Attempt Details"
                  title="Close (X)"
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors focus:outline-none cursor-pointer border border-transparent hover:border-slate-300 shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* MODAL BODY (SCROLLABLE) */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 overscroll-contain">
                {/* Performance Summary KPI Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Score Achieved</p>
                    <p className={`text-xl font-extrabold ${selectedQuizAttempt.passed ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {selectedQuizAttempt.percentage}%
                    </p>
                    <span className="text-[11px] text-slate-500">Min {selectedQuizAttempt.passingScorePercent}% required</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Questions</p>
                    <p className="text-xl font-extrabold text-slate-900">{totalQuestions}</p>
                    <span className="text-[11px] text-slate-500">Evaluated questions</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Correct Answers</p>
                    <p className="text-xl font-extrabold text-emerald-700">{correctCount}</p>
                    <span className="text-[11px] text-emerald-600">{totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0}% accuracy</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Incorrect Answers</p>
                    <p className="text-xl font-extrabold text-rose-700">{incorrectCount}</p>
                    <span className="text-[11px] text-rose-600">{notAnsweredCount > 0 ? `${notAnsweredCount} unanswered` : '0 unanswered'}</span>
                  </div>
                </div>

                {/* Question-Level Evaluation Breakdown */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-700 flex items-center">
                      <HelpCircle className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                      Question Evaluation Breakdown
                    </h4>
                    <span className="text-xs text-slate-500 font-medium">
                      {answersList.length} {answersList.length === 1 ? 'Question' : 'Questions'}
                    </span>
                  </div>

                  {answersList.length > 0 ? (
                    <div className="space-y-3.5">
                      {answersList.map((ans, aIdx) => {
                        const isQuestionLong = (ans.questionText || '').length > 180;
                        const questionDisplay = isQuestionLong
                          ? (ans.questionText || '').slice(0, 180) + '...'
                          : (ans.questionText || `Question ${aIdx + 1}`);

                        let userAnsText = ans.selectedAnswerText;
                        if (!userAnsText) {
                          if (ans.status === 'data_unavailable' || ans.dataUnavailable) userAnsText = 'Answer data unavailable';
                          else if (ans.status === 'not_answered') userAnsText = 'Not Answered';
                          else userAnsText = (ans.options && ans.selectedOptionIndex !== null && ans.selectedOptionIndex !== undefined && ans.options[ans.selectedOptionIndex]) ? ans.options[ans.selectedOptionIndex] : 'Not Answered';
                        }

                        const corrAnsText = ans.correctAnswerText || (ans.options && ans.correctAnswerIndex !== undefined ? ans.options[ans.correctAnswerIndex] : 'N/A');

                        const isUserAnsLong = userAnsText.length > 120;
                        const isCorrAnsLong = corrAnsText.length > 120;
                        const isUserAnsUrl = userAnsText.startsWith('http://') || userAnsText.startsWith('https://');

                        return (
                          <div key={aIdx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                            {/* Question Header */}
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                              <div className="font-bold text-slate-900 text-xs sm:text-sm leading-snug flex-1">
                                <span>Q{aIdx + 1}: {questionDisplay}</span>
                                {isQuestionLong && (
                                  <button
                                    type="button"
                                    onClick={() => setModalContent({ title: `Question ${aIdx + 1}`, text: ans.questionText })}
                                    className="ml-2 text-emerald-700 font-semibold hover:underline text-[11px] cursor-pointer inline-block"
                                  >
                                    [View full question]
                                  </button>
                                )}
                              </div>

                              <span className={`px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider self-start sm:self-auto shrink-0 ${ans.isCorrect
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : ans.status === 'not_answered'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : ans.status === 'data_unavailable'
                                      ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                {ans.isCorrect
                                  ? '✓ Correct'
                                  : ans.status === 'not_answered'
                                    ? '○ Not Answered'
                                    : ans.status === 'data_unavailable'
                                      ? '⚠ Data Unavailable'
                                      : '✕ Incorrect'}
                              </span>
                            </div>

                            {/* Your Answer vs Correct Answer Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                              <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Your Answer</p>
                                <div className={`font-bold ${ans.isCorrect ? 'text-emerald-700' : ans.status === 'not_answered' ? 'text-amber-600' : ans.status === 'data_unavailable' ? 'text-slate-400' : 'text-rose-600'}`}>
                                  {isUserAnsUrl ? (
                                    <a href={userAnsText} target="_blank" rel="noreferrer" className="underline font-mono inline-flex items-center hover:opacity-80">
                                      {userAnsText.slice(0, 35)}... <ExternalLink className="w-3 h-3 ml-1" />
                                    </a>
                                  ) : isUserAnsLong ? (
                                    <div>
                                      <span>{userAnsText.slice(0, 120)}...</span>
                                      <button
                                        type="button"
                                        onClick={() => setModalContent({ title: `Q${aIdx + 1} - Your Answer`, text: userAnsText })}
                                        className="ml-2 text-emerald-700 text-[11px] font-semibold hover:underline cursor-pointer block pt-0.5"
                                      >
                                        [View full answer]
                                      </button>
                                    </div>
                                  ) : (
                                    <span>{userAnsText}</span>
                                  )}
                                </div>
                              </div>

                              <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Correct Answer</p>
                                <div className="font-bold text-emerald-700">
                                  {isCorrAnsLong ? (
                                    <div>
                                      <span>{corrAnsText.slice(0, 120)}...</span>
                                      <button
                                        type="button"
                                        onClick={() => setModalContent({ title: `Q${aIdx + 1} - Correct Answer`, text: corrAnsText })}
                                        className="ml-2 text-emerald-700 text-[11px] font-semibold hover:underline cursor-pointer block pt-0.5"
                                      >
                                        [View full answer]
                                      </button>
                                    </div>
                                  ) : (
                                    <span>{corrAnsText}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 py-4 text-center">No question breakdown recorded for this attempt.</p>
                  )}
                </div>
              </div>

              {/* MODAL FOOTER */}
              <div className="p-3.5 sm:px-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs shrink-0">
                <span className="text-slate-500 hidden sm:inline">
                  Click the dedicated <strong className="text-slate-700">(X)</strong> button to close this window
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedQuizAttempt(null)}
                  className="px-5 py-2 rounded-xl bg-slate-200/80 hover:bg-slate-200 text-slate-700 font-semibold transition-colors cursor-pointer ml-auto"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}

      {/* Assignment History Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div>
          <h3 className="font-extrabold text-slate-900 text-base flex items-center font-heading">
            <FileCheck2 className="w-4 h-4 mr-2 text-teal-600" /> Project Assignment History
          </h3>
          <p className="text-xs text-slate-500">Submitted project assignments, URLs, and instructor review status.</p>
        </div>

        {assignmentSubmissions.length === 0 ? (
          <EmptyState icon={FileCheck2} title="No Assignments Submitted" description="Project assignment submissions will appear here." />
        ) : (
          <div>
            <div className="space-y-3">
              {paginatedAssignmentSubmissions.map((sub) => (
                <div key={sub._id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{sub.assignmentTitle}</h4>
                    <p className="text-slate-500 pt-0.5">
                      Format: <strong>{sub.submissionType === 'github' ? 'Project URL / Link' : 'File Upload'}</strong> • Submitted: {formatDate(sub.submittedAt)}
                    </p>
                    {sub.githubUrl && (
                      <a href={sub.githubUrl} target="_blank" rel="noreferrer" className="text-teal-600 font-mono underline hover:text-teal-700 pt-1 block">
                        {sub.githubUrl}
                      </a>
                    )}
                    {sub.fileUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewDoc({
                          submissionId: sub._id || sub.id,
                          fileUrl: sub.fileUrl,
                          fileName: sub.assignmentTitle ? `${sub.assignmentTitle}.pdf` : 'Assignment_Submission.pdf',
                          fileType: 'pdf'
                        })}
                        className="text-teal-600 font-mono font-semibold underline hover:text-teal-700 pt-1 flex items-center cursor-pointer bg-transparent border-0 p-0"
                        title="View Submitted PDF In-App"
                      >
                        <FileText className="w-3.5 h-3.5 mr-1" /> View Submitted PDF
                      </button>
                    )}
                  </div>

                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 self-start sm:self-auto">
                    {sub.status === 'reviewed' ? 'Reviewed' : 'Submitted'}
                  </span>
                </div>
              ))}
            </div>

            <Pagination
              currentPage={currentAssignmentPage}
              totalItems={totalAssignmentItems}
              pageSize={ASSIGNMENT_PAGE_SIZE}
              onPageChange={setAssignmentPage}
              itemLabel="submissions"
              className="rounded-xl border border-slate-200 mt-4 bg-slate-50"
            />
          </div>
        )}
      </div>

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
