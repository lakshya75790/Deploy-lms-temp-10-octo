import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTrainingById, getLearnerProgress, getAssignmentPdfDownloadUrl } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { DocumentPreviewModal } from '../../components/common/DocumentPreviewModal';
import { useNotification } from '../../context/NotificationContext';
import { formatDate, formatAuditDate, formatQuizDuration, formatFileSize } from '../../utils/formatters';
import {
  ArrowLeft,
  BookOpen,
  Layers,
  PlayCircle,
  Award,
  FileCheck2,
  FolderDown,
  Clock,
  Calendar,
  Check,
  ChevronDown,
  FileText,
  ExternalLink,
  Tag,
  Building2,
  User,
  Eye,
  Download,
  AlertCircle,
  HelpCircle,
  Video,
  CheckCircle2,
  Users,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Filter,
  RotateCcw,
  Sparkles,
  GraduationCap
} from 'lucide-react';

export const CourseDetailsView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useNotification();

  const [training, setTraining] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Accordion state: map of sectionKey -> boolean
  const [expandedSections, setExpandedSections] = useState({});

  // Dedicated quiz modal state
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  // Expanded assignments state: map of assignmentKey -> boolean
  const [expandedAssignments, setExpandedAssignments] = useState({});

  // Video preview modal
  const [previewVideo, setPreviewVideo] = useState(null);

  // Document preview modal
  const [previewDoc, setPreviewDoc] = useState(null);

  // Description expand/collapse state
  const [descExpanded, setDescExpanded] = useState(false);

  // Assigned learners state for this course
  const [assignedLearners, setAssignedLearners] = useState([]);
  const [learnersLoading, setLearnersLoading] = useState(true);
  const [learnerSearch, setLearnerSearch] = useState('');
  const [learnerStatusFilter, setLearnerStatusFilter] = useState('all');
  const [learnerPage, setLearnerPage] = useState(1);
  const learnerPageSize = 10;

  const fetchAssignedLearners = async () => {
    if (!id) return;
    try {
      setLearnersLoading(true);
      const res = await getLearnerProgress({ trainingId: id });
      const records = res.data?.data?.records || [];
      setAssignedLearners(records);
    } catch (err) {
      console.error('Failed to fetch assigned learners:', err);
    } finally {
      setLearnersLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedLearners();
  }, [id]);

  // Filtered assigned learners
  const filteredLearners = useMemo(() => {
    return assignedLearners.filter((l) => {
      if (learnerSearch.trim()) {
        const query = learnerSearch.trim().toLowerCase();
        const nameMatch = (l.learnerName || '').toLowerCase().includes(query);
        const emailMatch = (l.learnerEmail || '').toLowerCase().includes(query);
        if (!nameMatch && !emailMatch) return false;
      }
      if (learnerStatusFilter !== 'all' && l.status !== learnerStatusFilter) {
        return false;
      }
      return true;
    });
  }, [assignedLearners, learnerSearch, learnerStatusFilter]);

  // Reset pagination on search or status change
  useEffect(() => {
    setLearnerPage(1);
  }, [learnerSearch, learnerStatusFilter]);

  const totalLearnerPages = Math.max(1, Math.ceil(filteredLearners.length / learnerPageSize));
  const paginatedLearners = useMemo(() => {
    const start = (learnerPage - 1) * learnerPageSize;
    return filteredLearners.slice(start, start + learnerPageSize);
  }, [filteredLearners, learnerPage, learnerPageSize]);

  const handleResetLearnerFilters = () => {
    setLearnerSearch('');
    setLearnerStatusFilter('all');
    setLearnerPage(1);
  };

  const hasActiveLearnerFilters = learnerSearch.trim() !== '' || learnerStatusFilter !== 'all';

  // Fetch complete course details
  useEffect(() => {
    let isMounted = true;

    const fetchCourseDetails = async () => {
      if (!id) {
        setError('No course ID provided');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await getTrainingById(id);
        if (!isMounted) return;

        const data = res?.data?.data?.training;
        if (!data) {
          setError('Course details not found or unavailable');
        } else {
          setTraining(data);
          // All sections collapsed by default upon page load
          setExpandedSections({});
        }
      } catch (err) {
        if (!isMounted) return;
        const msg = err.response?.data?.message || 'Failed to fetch course details';
        setError(msg);
        addToast('error', msg);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCourseDetails();

    return () => {
      isMounted = false;
    };
  }, [id, addToast]);

  // Aggregate all quizzes from course level and section level (deduplicated)
  const allQuizzes = useMemo(() => {
    if (!training) return [];
    const quizMap = new Map();

    // 1. Course-level quizzes
    if (Array.isArray(training.quizzes)) {
      training.quizzes.forEach(q => {
        const qId = q._id || q.id;
        if (qId && !quizMap.has(qId)) {
          quizMap.set(qId, { ...q, source: 'Course Final Assessment' });
        }
      });
    }

    // 2. Section-level quizzes
    if (Array.isArray(training.sections)) {
      training.sections.forEach(sec => {
        if (sec.quiz) {
          const qId = sec.quiz._id || sec.quiz.id;
          if (qId && !quizMap.has(qId)) {
            quizMap.set(qId, {
              ...sec.quiz,
              source: `Section Assessment: ${sec.title}`,
              sectionTitle: sec.title
            });
          }
        }
        if (Array.isArray(sec.quizzes)) {
          sec.quizzes.forEach(q => {
            const qId = q._id || q.id;
            if (qId && !quizMap.has(qId)) {
              quizMap.set(qId, {
                ...q,
                source: `Section Assessment: ${sec.title}`,
                sectionTitle: sec.title
              });
            }
          });
        }
        if (Array.isArray(sec.subSections)) {
          sec.subSections.forEach(sub => {
            if (sub.quizId && typeof sub.quizId === 'object') {
              const qId = sub.quizId._id || sub.quizId.id;
              if (qId && !quizMap.has(qId)) {
                quizMap.set(qId, {
                  ...sub.quizId,
                  source: `Lecture Quiz: ${sub.title}`,
                  sectionTitle: sec.title,
                  subSectionTitle: sub.title
                });
              }
            }
          });
        }
      });
    }

    return Array.from(quizMap.values());
  }, [training]);

  // Aggregate all assignments (deduplicated)
  const allAssignments = useMemo(() => {
    if (!training) return [];
    const assignmentMap = new Map();

    // 1. Course-level assignments
    if (Array.isArray(training.assignments)) {
      training.assignments.forEach(a => {
        const aId = a._id || a.id;
        if (aId && !assignmentMap.has(aId)) {
          assignmentMap.set(aId, { ...a, source: 'Course Assignment' });
        }
      });
    }

    // 2. SubSection-level assignments
    if (Array.isArray(training.sections)) {
      training.sections.forEach(sec => {
        if (Array.isArray(sec.subSections)) {
          sec.subSections.forEach(sub => {
            const ass = sub.assignment || (sub.assignmentId && typeof sub.assignmentId === 'object' ? sub.assignmentId : null);
            if (ass) {
              const aId = ass._id || ass.id;
              if (aId && !assignmentMap.has(aId)) {
                assignmentMap.set(aId, {
                  ...ass,
                  source: `Lecture Task: ${sub.title}`,
                  sectionTitle: sec.title,
                  subSectionTitle: sub.title
                });
              }
            }
          });
        }
      });
    }

    return Array.from(assignmentMap.values());
  }, [training]);

  // Aggregate all study resources from training level, section level, and subSections
  const allResources = useMemo(() => {
    if (!training) return [];
    const resList = [];
    const seenUrls = new Set();

    const addResource = (r, contextTitle, originType) => {
      if (!r) return;
      const url = r.fileUrl || r.pdfUrl || r.url || '';
      const name = r.originalName || r.fileName || r.title || 'Resource Document';
      const key = url || r._id || r.id || `${contextTitle}-${name}`;
      if (!seenUrls.has(key)) {
        seenUrls.add(key);
        resList.push({
          id: r._id || r.id || key,
          title: r.title || name,
          fileName: name,
          fileUrl: url,
          description: r.description || '',
          source: contextTitle,
          originType: originType || 'Resource',
          createdAt: r.createdAt
        });
      }
    };

    // 1. Course-level resources
    if (Array.isArray(training.resources)) {
      training.resources.forEach(r => addResource(r, 'Course Resource', 'Course'));
    }
    if (Array.isArray(training.pdfResources)) {
      training.pdfResources.forEach(r => addResource(r, 'Course Resource', 'Course'));
    }

    // 2. Section & SubSection-level resources
    if (Array.isArray(training.sections)) {
      training.sections.forEach((sec) => {
        if (Array.isArray(sec.resources)) {
          sec.resources.forEach(r => addResource(r, `Section: ${sec.title}`, 'Section'));
        }
        if (Array.isArray(sec.pdfResources)) {
          sec.pdfResources.forEach(r => addResource(r, `Section: ${sec.title}`, 'Section'));
        }
        if (Array.isArray(sec.subSections)) {
          sec.subSections.forEach((sub) => {
            if (Array.isArray(sub.pdfResources)) {
              sub.pdfResources.forEach(r => addResource(r, `${sec.title} › ${sub.title}`, 'Lecture'));
            }
            if (Array.isArray(sub.resources)) {
              sub.resources.forEach(r => addResource(r, `${sec.title} › ${sub.title}`, 'Lecture'));
            }
          });
        }
      });
    }

    return resList;
  }, [training]);

  // Helper to determine resource icon and label based on file name or URL
  const getResourceMeta = (res) => {
    const raw = (res.fileName || res.fileUrl || res.title || '').toLowerCase();
    if (raw.endsWith('.pdf') || raw.includes('/pdf') || raw.includes('application/pdf')) {
      return {
        label: 'PDF Document',
        badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
        icon: FileText,
        iconColor: 'text-rose-500'
      };
    }
    if (raw.endsWith('.doc') || raw.endsWith('.docx') || raw.includes('word') || raw.includes('msword')) {
      return {
        label: 'Word Document',
        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: FileText,
        iconColor: 'text-blue-500'
      };
    }
    if (raw.endsWith('.ppt') || raw.endsWith('.pptx') || raw.includes('powerpoint') || raw.includes('presentation')) {
      return {
        label: 'Presentation',
        badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: FileText,
        iconColor: 'text-amber-500'
      };
    }
    if (raw.endsWith('.xls') || raw.endsWith('.xlsx') || raw.endsWith('.csv') || raw.includes('spreadsheet') || raw.includes('excel')) {
      return {
        label: 'Spreadsheet',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: FileText,
        iconColor: 'text-emerald-500'
      };
    }
    if (raw.endsWith('.mp4') || raw.endsWith('.mkv') || raw.endsWith('.mov') || raw.includes('video/')) {
      return {
        label: 'Video',
        badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
        icon: Video,
        iconColor: 'text-purple-500'
      };
    }
    return {
      label: 'Document',
      badgeColor: 'bg-slate-50 text-slate-700 border-slate-200',
      icon: FileText,
      iconColor: 'text-slate-500'
    };
  };

  // Total summary statistics
  const stats = useMemo(() => {
    if (!training) {
      return { totalSections: 0, totalLectures: 0, totalQuizzes: 0, totalAssignments: 0, totalResources: 0, totalSeconds: 0, totalLengthFormatted: null };
    }
    const sections = Array.isArray(training.sections) ? training.sections : [];
    let totalLectures = 0;
    let totalSeconds = 0;

    sections.forEach(sec => {
      if (Array.isArray(sec.subSections)) {
        totalLectures += sec.subSections.length;
        sec.subSections.forEach(sub => {
          if (sub.videoDuration) {
            totalSeconds += Number(sub.videoDuration) || 0;
          }
        });
      }
    });

    let totalLengthFormatted = null;
    if (totalSeconds > 0) {
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      if (hours > 0) {
        totalLengthFormatted = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
      } else {
        totalLengthFormatted = `${minutes}m`;
      }
    }

    return {
      totalSections: sections.length,
      totalLectures,
      totalQuizzes: allQuizzes.length,
      totalAssignments: allAssignments.length,
      totalResources: allResources.length,
      totalSeconds,
      totalLengthFormatted
    };
  }, [training, allQuizzes, allAssignments, allResources]);

  // Check if all sections are currently expanded
  const allExpanded = useMemo(() => {
    if (!training?.sections || training.sections.length === 0) return false;
    return training.sections.every((s, idx) => {
      const key = s._id || s.id || String(idx);
      return Boolean(expandedSections[key]);
    });
  }, [training, expandedSections]);

  // Section Accordion handlers
  const toggleSection = (secKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [secKey]: !prev[secKey]
    }));
  };

  const expandAll = () => {
    if (!training?.sections) return;
    const all = {};
    training.sections.forEach((s, idx) => {
      all[s._id || s.id || String(idx)] = true;
    });
    setExpandedSections(all);
  };

  const collapseAll = () => {
    if (!training?.sections) return;
    const none = {};
    training.sections.forEach((s, idx) => {
      none[s._id || s.id || String(idx)] = false;
    });
    setExpandedSections(none);
  };

  // Toggle assignment instructions inspection
  const toggleAssignmentDetails = (assignmentKey) => {
    setExpandedAssignments(prev => ({
      ...prev,
      [assignmentKey]: !prev[assignmentKey]
    }));
  };

  // Format single lecture video duration (mm:ss)
  const formatLectureDuration = (seconds) => {
    if (!seconds || isNaN(seconds) || seconds <= 0) return null;
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Format section total duration (e.g. "18min" or "1h 12m")
  const formatSectionDuration = (subSecs) => {
    if (!Array.isArray(subSecs) || subSecs.length === 0) return null;
    let secTotal = 0;
    subSecs.forEach(sub => {
      if (sub.videoDuration) secTotal += Number(sub.videoDuration) || 0;
    });
    if (secTotal <= 0) return null;
    const hrs = Math.floor(secTotal / 3600);
    const mins = Math.floor((secTotal % 3600) / 60);
    if (hrs > 0) {
      return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
    }
    return `${mins}m`;
  };

  // Helper to gather only quizzes that belong to a specific section
  const getSectionQuizzes = (section) => {
    const list = [];
    const seen = new Set();
    const secId = section._id || section.id;

    if (section.quiz) {
      const qId = section.quiz._id || section.quiz.id;
      if (qId && !seen.has(qId)) {
        seen.add(qId);
        list.push(section.quiz);
      }
    }
    if (Array.isArray(section.quizzes)) {
      section.quizzes.forEach(q => {
        const qId = q._id || q.id;
        if (qId && !seen.has(qId)) {
          seen.add(qId);
          list.push(q);
        }
      });
    }
    if (Array.isArray(training?.quizzes)) {
      training.quizzes.forEach(q => {
        if (q.sectionId && (q.sectionId === secId || q.sectionId === section.id)) {
          const qId = q._id || q.id;
          if (qId && !seen.has(qId)) {
            seen.add(qId);
            list.push(q);
          }
        }
      });
    }
    return list;
  };

  if (loading) {
    return (
      <div className="py-24">
        <LoadingSpinner text="Loading course preview and syllabus content..." />
      </div>
    );
  }

  if (error || !training) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4">
        <EmptyState
          icon={AlertCircle}
          title="Course Not Found"
          description={error || "We couldn't retrieve details for this training course. It may have been removed or you may not have permission to view it."}
          action={
            <button
              onClick={() => navigate('/instructor/trainings')}
              className="inline-flex items-center px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to Course Studio
            </button>
          }
        />
      </div>
    );
  }

  const isPublished = training.status === 'published' || training.isPublished;
  const sections = Array.isArray(training.sections) ? training.sections : [];

  return (
    <div className="space-y-10 animate-fade-in max-w-7xl mx-auto pb-24 text-slate-800">
      {/* 1. TOP MINIMAL NAVIGATION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/instructor/trainings')}
            className="p-2 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
            title="Back to Course Studio"
            aria-label="Back to Course Studio"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center space-x-2 text-xs text-slate-500 flex-wrap">
            <span
              onClick={() => navigate('/instructor/trainings')}
              className="hover:text-emerald-700 cursor-pointer font-medium"
            >
              Course Studio
            </span>
            <span>&rsaquo;</span>
            <span className="font-medium text-slate-600">
              {training.categoryId?.name || training.category?.name || 'General Category'}
            </span>
            <span>&rsaquo;</span>
            <span className="font-semibold text-slate-900 truncate max-w-xs">{training.title}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold">
            <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" />
            Read-Only Course Preview
          </span>

          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
              isPublished
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isPublished ? 'bg-emerald-600' : 'bg-amber-600'}`} />
            {training.status || (isPublished ? 'Published' : 'Draft')}
          </span>

          {training.isMandatory && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold">
              Mandatory
            </span>
          )}
        </div>
      </div>

      {/* 2. UDEMY-STYLE COURSE OVERVIEW & HERO SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column (Primary Course Info & What You'll Learn) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="font-bold text-emerald-700 uppercase tracking-wider">
                {training.categoryId?.name || training.category?.name || 'Course'}
              </span>
              {(training.departmentId?.name || training.department?.name) && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-600 font-medium">
                    {training.departmentId?.name || training.department?.name}
                  </span>
                </>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight font-heading leading-tight break-words [overflow-wrap:anywhere]" title={training.title}>
              {training.title}
            </h1>

            <div className="space-y-1">
              <p className={`text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line break-words [overflow-wrap:anywhere] ${!descExpanded && (training.description?.length > 300) ? 'line-clamp-4' : ''}`}>
                {training.description || 'No detailed description provided.'}
              </p>
              {training.description && training.description.length > 300 && (
                <button
                  type="button"
                  onClick={() => setDescExpanded(!descExpanded)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
                >
                  {descExpanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>

            {/* Course Metadata Row */}
            <div className="pt-2 flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-600">
              {training.instructor && (
                <div className="flex items-center space-x-1 min-w-0">
                  <span>Created by</span>
                  <strong className="text-slate-900 font-semibold underline underline-offset-2 truncate max-w-xs" title={training.instructor.name || 'Instructor'}>
                    {training.instructor.name || 'Instructor'}
                  </strong>
                </div>
              )}

              <div className="flex items-center space-x-1 text-slate-500">
                <Calendar className="w-3.5 h-3.5 mr-1" />
                <span>Last updated {training.updatedAt ? formatDate(training.updatedAt) : 'Recently'}</span>
              </div>

              <div className="flex items-center space-x-1 text-slate-500">
                <Clock className="w-3.5 h-3.5 mr-1" />
                <span>{training.durationDays || 30} days completion window</span>
              </div>
            </div>
          </div>

          {/* WHAT YOU'LL LEARN (Udemy-Style Benefits Box) */}
          {Array.isArray(training.benefits) && training.benefits.filter(Boolean).length > 0 && (
            <div className="p-6 border border-slate-200 bg-white rounded-lg space-y-3 overflow-hidden">
              <h2 className="text-lg font-bold text-slate-900 font-heading">
                What you'll learn in this course
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-6 text-xs sm:text-sm text-slate-700">
                {training.benefits.filter(Boolean).map((benefit, bIdx) => (
                  <div key={bIdx} className="flex items-start space-x-3 min-w-0 overflow-hidden">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span
                      className="leading-snug break-words [overflow-wrap:anywhere] min-w-0 flex-1 line-clamp-2"
                      title={benefit}
                    >
                      {benefit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. COURSE CONTENT (PRIMARY UDEMY-STYLE CURRICULUM LAYOUT - NO CARDS, ONLY LECTURES & QUIZZES) */}
          <div className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-heading">Course content</h2>

            {/* Compact summary & Expand All / Collapse All link */}
            <div className="flex flex-col xs:flex-row xs:items-center justify-between text-xs sm:text-sm text-slate-600 gap-2 pb-1">
              <div>
                <span>{stats.totalSections} sections</span>
                <span className="mx-1.5">•</span>
                <span>{stats.totalLectures} lectures</span>
                {stats.totalLengthFormatted && (
                  <>
                    <span className="mx-1.5">•</span>
                    <span>{stats.totalLengthFormatted} total length</span>
                  </>
                )}
              </div>

              {sections.length > 0 && (
                <button
                  type="button"
                  onClick={allExpanded ? collapseAll : expandAll}
                  className="font-bold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer self-start xs:self-auto"
                >
                  {allExpanded ? 'Collapse all sections' : 'Expand all sections'}
                </button>
              )}
            </div>

            {/* CONTINUOUS ACCORDION CONTAINER (NO CARDS!) */}
            {sections.length === 0 ? (
              <div className="p-8 border border-slate-200 rounded-lg text-center text-slate-400 text-xs">
                No curriculum sections have been added to this course yet.
              </div>
            ) : (
          <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-200 bg-white">
            {sections.map((section, sIdx) => {
              const secKey = section._id || section.id || String(sIdx);
              const isExpanded = Boolean(expandedSections[secKey]);
              const subSecs = Array.isArray(section.subSections) ? section.subSections : [];
              const sectionDuration = formatSectionDuration(subSecs);
              const sectionQuizzes = getSectionQuizzes(section);

              return (
                <div key={secKey} className="group">
                  {/* FULL-WIDTH SECTION ACCORDION ROW */}
                  <div
                    onClick={() => toggleSection(secKey)}
                    className="w-full bg-slate-50/90 hover:bg-slate-100 transition-colors cursor-pointer px-4 sm:px-6 py-4 flex items-center justify-between text-left select-none"
                  >
                    {/* Left: Chevron on Left + Section Title */}
                    <div className="flex items-center space-x-3.5 pr-4 min-w-0 flex-1">
                      <ChevronDown
                        className={`w-4 h-4 text-slate-600 shrink-0 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                      <span className="font-bold text-sm sm:text-base text-slate-900 truncate" title={section.title}>
                        {section.title}
                      </span>
                    </div>

                    {/* Right: compact section metrics */}
                    <div className="text-xs text-slate-500 font-medium shrink-0 flex items-center space-x-1.5 ml-4">
                      <span>{subSecs.length} lectures</span>
                      {sectionDuration && (
                        <>
                          <span>•</span>
                          <span>{sectionDuration}</span>
                        </>
                      )}
                      {sectionQuizzes.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="font-semibold text-emerald-700">
                            {sectionQuizzes.length} {sectionQuizzes.length === 1 ? 'quiz' : 'quizzes'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* EXPANDED SECTION CONTENT (ONLY LECTURES & QUIZZES) */}
                  {isExpanded && (
                    <div className="divide-y divide-slate-100 bg-white">
                      {/* Section Description (Displayed only when available, with preserved formatting) */}
                      {section.description && section.description.trim() !== '' && (
                        <div className="px-4 sm:px-6 py-3 bg-slate-50/60 text-xs text-slate-600 border-b border-slate-100 whitespace-pre-line leading-relaxed break-words [overflow-wrap:anywhere]" title={section.description.trim()}>
                          {section.description.trim()}
                        </div>
                      )}

                      {/* 1. LECTURES (Strictly lectures only - NO resources between lectures) */}
                      {subSecs.length === 0 && sectionQuizzes.length === 0 ? (
                        <div className="px-6 py-4 text-xs text-slate-400 italic">
                          No lectures or quizzes added to this section.
                        </div>
                      ) : (
                        subSecs.map((subSec, subIdx) => {
                          const durationFormatted = formatLectureDuration(subSec.videoDuration);
                          const hasVideo = Boolean(subSec.videoUrl && subSec.videoUrl.trim() !== '');

                          return (
                            <div key={subSec._id || subSec.id || subIdx} className="hover:bg-slate-50/70 transition-colors">
                              <div className="px-4 sm:px-6 py-3.5 flex items-start justify-between text-xs sm:text-sm gap-4">
                                {/* Left Side: Content Icon + Title + Description underneath */}
                                <div className="flex items-start space-x-3 min-w-0 flex-1">
                                  <div className="mt-0.5 shrink-0">
                                    {hasVideo ? (
                                      <PlayCircle className="w-4 h-4 text-slate-400" />
                                    ) : (
                                      <FileText className="w-4 h-4 text-slate-400" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span className="text-slate-900 font-medium leading-normal block line-clamp-2 break-words [overflow-wrap:anywhere]" title={subSec.title}>
                                      {subSec.title}
                                    </span>
                                    {/* Lecture Description (Displayed only when available) */}
                                    {subSec.description && subSec.description.trim() !== '' && (
                                      <p className="text-xs text-slate-500 mt-1 whitespace-pre-line leading-relaxed line-clamp-3 break-words [overflow-wrap:anywhere]" title={subSec.description.trim()}>
                                        {subSec.description.trim()}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Right Side: Preview Button & Duration */}
                                <div className="flex items-center space-x-3 shrink-0 mt-0.5">
                                  {hasVideo && (
                                    <button
                                      type="button"
                                      onClick={() => setPreviewVideo({ title: subSec.title, url: subSec.videoUrl })}
                                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline underline-offset-2 cursor-pointer"
                                    >
                                      Preview
                                    </button>
                                  )}
                                  {durationFormatted && (
                                    <span className="text-xs text-slate-400 font-mono">
                                      {durationFormatted}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}

                      {/* 2. QUIZZES INSIDE SECTION (Clean row with "View All Quiz" button) */}
                      {sectionQuizzes.map((secQuiz, qIdx) => {
                        const quizKey = secQuiz._id || secQuiz.id || `${secKey}-quiz-${qIdx}`;
                        const qCount = Array.isArray(secQuiz.questions) ? secQuiz.questions.length : 0;

                        return (
                          <div
                            key={quizKey}
                            className="border-t border-slate-100 bg-emerald-50/20 hover:bg-emerald-50/35 transition-colors"
                          >
                            <div className="px-4 sm:px-6 py-3.5 flex items-center justify-between text-xs sm:text-sm gap-4">
                              {/* Left Side: Quiz Icon + Title + Quiz Type */}
                              <div className="flex items-center space-x-3 pr-4 min-w-0 flex-1">
                                <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                <div className="min-w-0 flex items-center space-x-2 flex-wrap">
                                  <span className="font-semibold text-slate-900 truncate max-w-sm sm:max-w-md block" title={secQuiz.title || `${section.title} Assessment Quiz`}>
                                    {secQuiz.title || `${section.title} Assessment Quiz`}
                                  </span>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100/70 text-emerald-800 border border-emerald-200 shrink-0">
                                    Quiz
                                  </span>
                                </div>
                              </div>

                              {/* Right Side: Summary (questions, passing %, time limit) + "View All Quiz" Button */}
                              <div className="flex items-center space-x-3 shrink-0 ml-4">
                                <span className="text-xs text-slate-500 font-medium hidden sm:inline-block">
                                  {qCount} {qCount === 1 ? 'question' : 'questions'}
                                  {secQuiz.passingScorePercent ? ` • ${secQuiz.passingScorePercent}% passing` : ''}
                                  {secQuiz.timeLimitMinutes ? ` • ${formatQuizDuration(secQuiz.timeLimitMinutes)}` : ''}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedQuiz(secQuiz)}
                                  className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                                  <span>View All Quiz</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. COURSE ASSIGNMENTS (SEPARATE SECTION - MAXIMUM SCORE REMOVED) */}
      {allAssignments.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-heading">Course Assignments</h2>
            <span className="text-xs text-slate-500 font-medium">
              {allAssignments.length} {allAssignments.length === 1 ? 'assignment' : 'assignments'}
            </span>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-200 bg-white">
            {allAssignments.map((assignment, aIdx) => {
              const aKey = assignment._id || assignment.id || aIdx;
              const isExpanded = Boolean(expandedAssignments[aKey]);

              return (
                <div key={aKey} className="group">
                  <div
                    onClick={() => toggleAssignmentDetails(aKey)}
                    className="w-full bg-slate-50/80 hover:bg-slate-100 transition-colors cursor-pointer px-4 sm:px-6 py-4 flex items-center justify-between text-left select-none"
                  >
                    <div className="flex items-center space-x-3.5 pr-4 min-w-0 flex-1">
                      <FileCheck2 className="w-4 h-4 text-teal-600 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-sm sm:text-base text-slate-900 block truncate" title={assignment.title}>
                          {assignment.title}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium block truncate" title={assignment.source || 'Practical Course Task'}>
                          {assignment.source || 'Practical Course Task'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0 ml-4">
                      <span className="text-xs font-bold text-emerald-700 hover:text-emerald-800">
                        {isExpanded ? 'Hide Details' : 'View Details'}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-600 shrink-0 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 sm:px-6 py-4 bg-white border-t border-slate-200 text-xs text-slate-700 space-y-3">
                      <div>
                        <div className="font-bold uppercase tracking-wider text-[10px] text-slate-400 mb-1">
                          Task Instructions & Details
                        </div>
                        <div className="leading-relaxed whitespace-pre-line bg-slate-50/60 p-4 rounded-xl border border-slate-100 break-words [overflow-wrap:anywhere] max-h-60 overflow-y-auto" title={assignment.instructions}>
                          {assignment.instructions || 'No detailed instructions provided.'}
                        </div>
                      </div>

                      {assignment.fileUrl && (
                        <div className="pt-2 border-t border-slate-100">
                          <div className="font-bold uppercase tracking-wider text-[10px] text-slate-400 mb-1.5">
                            Attached Assignment Document
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                            <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                              <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span className="font-semibold text-slate-900 truncate" title={assignment.fileName || 'Assignment_Document.pdf'}>
                                {assignment.fileName || 'Assignment_Document.pdf'}
                              </span>
                              {assignment.fileSize ? (
                                <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                                  ({formatFileSize(assignment.fileSize)})
                                </span>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => setPreviewDoc({
                                  fileUrl: assignment.fileUrl,
                                  fileName: assignment.fileName || 'Assignment_Document.pdf',
                                  fileType: 'pdf'
                                })}
                                className="inline-flex items-center px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-white text-xs font-semibold transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" />
                                <span>View PDF</span>
                              </button>
                              <a
                                href={assignment.id ? getAssignmentPdfDownloadUrl(assignment.id) : assignment.fileUrl}
                                download={assignment.fileName || 'Assignment_Document.pdf'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-2xs"
                              >
                                <Download className="w-3.5 h-3.5 mr-1" />
                                <span>Download</span>
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. COURSE RESOURCES (SEPARATE SECTION IMMEDIATELY BELOW COURSE ASSIGNMENTS) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-heading">Course Resources</h2>
          <span className="text-xs text-slate-500 font-medium">
            {allResources.length} {allResources.length === 1 ? 'resource' : 'resources'}
          </span>
        </div>

        {allResources.length === 0 ? (
          <div className="p-8 border border-slate-200 rounded-lg text-center bg-white space-y-2">
            <FolderDown className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500 font-medium">
              No downloadable study resources uploaded for this course.
            </p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 bg-white">
            {allResources.map((res, rIdx) => {
              const meta = getResourceMeta(res);
              const FileIcon = meta.icon;

              return (
                <div
                  key={res.id || rIdx}
                  className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-start space-x-3.5 pr-4 min-w-0 flex-1">
                    <div className="mt-0.5 shrink-0">
                      <FileIcon className={`w-5 h-5 ${meta.iconColor}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="text-slate-900 font-semibold text-sm block truncate max-w-sm sm:max-w-md" title={res.title}>
                          {res.title}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border shrink-0 ${meta.badgeColor}`}>
                          {meta.label}
                        </span>
                      </div>
                      {res.description && (
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed break-words [overflow-wrap:anywhere]" title={res.description}>
                          {res.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-1 flex-wrap">
                        <span className="truncate max-w-xs block" title={res.fileName}>{res.fileName}</span>
                        {res.source && (
                          <>
                            <span>•</span>
                            <span className="text-slate-500 truncate max-w-xs block" title={res.source}>{res.source}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center ml-0 sm:ml-4">
                    {res.fileUrl ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setPreviewDoc({
                            fileUrl: res.fileUrl,
                            fileName: res.fileName || res.title || 'Course_Resource.pdf',
                            title: res.title,
                            fileType: res.resourceType || 'pdf'
                          })}
                          className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-slate-50 border border-slate-200 text-teal-700 hover:text-teal-800 shadow-2xs transition-colors cursor-pointer"
                          title="Preview Document In-App"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1 text-teal-600" />
                          <span>Preview</span>
                        </button>
                        <a
                          href={res.fileUrl}
                          download={res.fileName || res.title || 'Course_Resource.pdf'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-slate-50 border border-slate-200 text-emerald-700 hover:text-emerald-800 shadow-2xs transition-colors cursor-pointer"
                          title="Download Resource"
                        >
                          <Download className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          <span>Download</span>
                        </a>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400 italic">No file attached</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>

    {/* Right Column: Clean Course Thumbnail & Summary Strip (NO BADGES ON THUMBNAIL) */}
    <div className="lg:col-span-4 w-full order-first lg:order-none">
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs sticky top-6 space-y-4">
        {/* CLEAN THUMBNAIL - NO OVERLAY BADGES FOR SECTIONS/LECTURES */}
        <div className="relative aspect-video bg-slate-900 overflow-hidden flex items-center justify-center">
          {training.thumbnailUrl ? (
            <img
              src={training.thumbnailUrl}
              alt={training.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="p-6 text-center text-slate-300">
              <BookOpen className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
              <span className="text-xs font-bold text-white block line-clamp-2">{training.title}</span>
            </div>
          )}
        </div>

        {/* Quick Course Features Checklist (Udemy Style) */}
        <div className="p-5 pt-0 space-y-3 text-xs text-slate-700">
          <h3 className="font-bold text-slate-900 text-sm">This course includes:</h3>
          <div className="space-y-2 text-slate-600">
            {stats.totalLengthFormatted && (
              <div className="flex items-center space-x-2.5">
                <PlayCircle className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{stats.totalLengthFormatted} on-demand video</span>
              </div>
            )}
            <div className="flex items-center space-x-2.5">
              <Layers className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{stats.totalSections} curriculum sections</span>
            </div>
            <div className="flex items-center space-x-2.5">
              <FileText className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{stats.totalLectures} lectures & lessons</span>
            </div>
            {stats.totalQuizzes > 0 && (
              <div className="flex items-center space-x-2.5">
                <Award className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{stats.totalQuizzes} assessment quizzes</span>
              </div>
            )}
            {stats.totalAssignments > 0 && (
              <div className="flex items-center space-x-2.5">
                <FileCheck2 className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{stats.totalAssignments} practical assignments</span>
              </div>
            )}
            {stats.totalResources > 0 && (
              <div className="flex items-center space-x-2.5">
                <FolderDown className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{stats.totalResources} downloadable study resources</span>
              </div>
            )}
            <div className="flex items-center space-x-2.5">
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Full completion access ({training.durationDays || 30} days)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  {/* 6. ASSIGNED LEARNERS SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-heading">
                Assigned Learners
              </h2>
              <p className="text-xs text-slate-500">
                Track individual learner progress, milestone completions, quiz results, and assignment evaluations for this course.
              </p>
            </div>
          </div>
          <span className="self-start sm:self-auto px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            {assignedLearners.length} {assignedLearners.length === 1 ? 'Learner Enrolled' : 'Learners Enrolled'}
          </span>
        </div>

        {learnersLoading ? (
          <div className="py-12">
            <LoadingSpinner message="Loading assigned learners..." />
          </div>
        ) : assignedLearners.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No learners have been assigned to this course yet.</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              When learners are assigned to this course by an Administrator or through automatic enrollment rules, their progress will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Filter and Search Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              {/* Search */}
              <div className="relative sm:col-span-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={learnerSearch}
                  onChange={(e) => setLearnerSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
                {learnerSearch && (
                  <button
                    type="button"
                    onClick={() => setLearnerSearch('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="relative sm:col-span-1">
                <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <select
                  value={learnerStatusFilter}
                  onChange={(e) => setLearnerStatusFilter(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              {/* Reset */}
              <div className="sm:col-span-1">
                <button
                  type="button"
                  onClick={handleResetLearnerFilters}
                  disabled={!hasActiveLearnerFilters}
                  className={`w-full py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center transition-all ${
                    hasActiveLearnerFilters
                      ? 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 cursor-pointer shadow-2xs'
                      : 'border-slate-200 text-slate-400 bg-slate-100/50 cursor-not-allowed opacity-60'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  Reset Filters
                </button>
              </div>
            </div>

            {/* Table or Empty search result */}
            {filteredLearners.length === 0 ? (
              <div className="py-10 px-4 text-center bg-slate-50/50 rounded-xl border border-slate-200">
                <p className="text-xs font-bold text-slate-700">No matching learners found</p>
                <p className="text-xs text-slate-500 mt-0.5">Try adjusting your search query or status filter.</p>
                <button
                  type="button"
                  onClick={handleResetLearnerFilters}
                  className="mt-3 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto min-w-0">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <th className="py-3 px-4 min-w-[200px]">Learner</th>
                        <th className="py-3 px-4 min-w-[220px]">Email</th>
                        <th className="py-3 px-4 min-w-[180px]">Progress</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedLearners.map((learner) => {
                        const initials = (learner.learnerName || 'Learner')
                          .split(' ')
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((n) => n[0].toUpperCase())
                          .join('');

                        return (
                          <tr key={learner.id} className="hover:bg-slate-50/80 transition-colors">
                            {/* Learner */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center space-x-3">
                                {learner.profilePicture ? (
                                  <img
                                    src={learner.profilePicture}
                                    alt={learner.learnerName}
                                    className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0 border border-emerald-200">
                                    {initials || 'L'}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-900 truncate">
                                    {learner.learnerName}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Email */}
                            <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                              <span className="truncate block max-w-xs" title={learner.learnerEmail}>
                                {learner.learnerEmail}
                              </span>
                            </td>

                            {/* Progress */}
                            <td className="py-3.5 px-4">
                              <div className="space-y-1.5 w-full max-w-[180px]">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-semibold text-slate-700">Completion</span>
                                  <span
                                    className={`font-bold ${
                                      learner.progressPercentage === 100
                                        ? 'text-emerald-700'
                                        : learner.progressPercentage > 0
                                        ? 'text-blue-700'
                                        : 'text-slate-500'
                                    }`}
                                  >
                                    {learner.progressPercentage}%
                                  </span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                                  <div
                                    className={`h-full transition-all duration-300 rounded-full ${
                                      learner.progressPercentage === 100
                                        ? 'bg-emerald-600'
                                        : learner.progressPercentage > 50
                                        ? 'bg-teal-600'
                                        : learner.progressPercentage > 0
                                        ? 'bg-blue-600'
                                        : 'bg-slate-300'
                                    }`}
                                    style={{ width: `${learner.progressPercentage}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls (Only when count > 10) */}
                {filteredLearners.length > learnerPageSize && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-200 bg-white">
                    <p className="text-xs text-slate-500 font-medium">
                      Showing <span className="font-bold text-slate-800">{(learnerPage - 1) * learnerPageSize + 1}</span> to{' '}
                      <span className="font-bold text-slate-800">
                        {Math.min(learnerPage * learnerPageSize, filteredLearners.length)}
                      </span> of <span className="font-bold text-slate-800">{filteredLearners.length}</span> learners
                    </p>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        disabled={learnerPage === 1}
                        onClick={() => setLearnerPage((p) => Math.max(1, p - 1))}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                        Previous
                      </button>

                      <span className="text-xs font-bold text-slate-700 px-2">
                        Page {learnerPage} of {totalLearnerPages}
                      </span>

                      <button
                        type="button"
                        disabled={learnerPage === totalLearnerPages}
                        onClick={() => setLearnerPage((p) => Math.min(totalLearnerPages, p + 1))}
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
        )}
      </div>

      {/* 7. MODAL: DEDICATED QUIZ DETAILS */}
      {selectedQuiz && (
        <Modal
          isOpen={Boolean(selectedQuiz)}
          onClose={() => setSelectedQuiz(null)}
          title={selectedQuiz.title || 'Course Assessment Quiz'}
          maxWidth="max-w-3xl"
          closeOnBackdropClick={false}
        >
          <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
            {/* Quiz Overview Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Questions</span>
                <span className="font-bold text-slate-900 text-base mt-0.5 block">
                  {Array.isArray(selectedQuiz.questions) ? selectedQuiz.questions.length : 0}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Passing Score</span>
                <span className="font-bold text-emerald-700 text-base mt-0.5 block">
                  {selectedQuiz.passingScorePercent || 70}%
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Time Limit</span>
                <span className="font-bold text-slate-900 text-base mt-0.5 block">
                  {selectedQuiz.timeLimitMinutes ? formatQuizDuration(selectedQuiz.timeLimitMinutes) : 'Unlimited'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Marks</span>
                <span className="font-bold text-slate-900 text-base mt-0.5 block">
                  {Array.isArray(selectedQuiz.questions)
                    ? selectedQuiz.questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0)
                    : 0} Marks
                </span>
              </div>
            </div>

            {/* Complete Question Details */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 font-heading">
                  Questions & Answers
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  {Array.isArray(selectedQuiz.questions) ? selectedQuiz.questions.length : 0} total questions
                </span>
              </div>

              {!selectedQuiz.questions || selectedQuiz.questions.length === 0 ? (
                <div className="p-8 border border-slate-200 rounded-xl text-center text-slate-400 text-xs italic bg-slate-50/50">
                  No questions configured for this quiz yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedQuiz.questions.map((q, qIndex) => {
                    const qType = q.questionType || (q.options?.length > 0 ? 'MCQ' : 'FILL_IN_BLANK');
                    const opts = Array.isArray(q.options) ? q.options : [];
                    const marks = Number(q.marks) || 1;

                    return (
                      <div
                        key={q._id || q.id || qIndex}
                        className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center space-x-2">
                            <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center font-mono">
                              {qIndex + 1}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
                              {qType === 'MCQ'
                                ? 'Multiple Choice'
                                : qType === 'MSQ'
                                ? 'Multiple Select'
                                : qType === 'TRUE_FALSE'
                                ? 'True / False'
                                : 'Fill in Blank'}
                            </span>
                          </div>
                          <span className="text-[11px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                            {marks} {marks === 1 ? 'Mark' : 'Marks'}
                          </span>
                        </div>

                        <div className="font-bold text-slate-900 text-sm leading-snug break-words [overflow-wrap:anywhere]">
                          {q.questionText}
                        </div>

                        {/* Options with Correct Answer Highlighted */}
                        {qType === 'TRUE_FALSE' ? (
                          <div className="grid grid-cols-2 gap-2.5 pt-1 max-w-md">
                            {['True', 'False'].map((tfOpt, tfIdx) => {
                              const isCorrect =
                                q.correctAnswerIndex === tfIdx ||
                                (q.correctAnswerText && q.correctAnswerText.toLowerCase() === tfOpt.toLowerCase());

                              return (
                                <div
                                  key={tfIdx}
                                  className={`p-3 rounded-lg border text-xs font-semibold flex items-center justify-between transition-colors ${
                                    isCorrect
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold ring-1 ring-emerald-300'
                                      : 'bg-white border-slate-200 text-slate-600'
                                  }`}
                                >
                                  <span>{tfOpt}</span>
                                  {isCorrect && (
                                    <span className="text-[10px] font-bold text-emerald-700 uppercase flex items-center bg-emerald-100/70 px-1.5 py-0.5 rounded">
                                      <Check className="w-3.5 h-3.5 mr-0.5 text-emerald-600" /> Correct
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : qType === 'FILL_IN_BLANK' ? (
                          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                              Correct Answer:
                            </span>
                            <span className="font-bold text-emerald-950 font-mono text-sm block">
                              {q.correctAnswerText || 'Answer text'}
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-2 pt-1">
                            {opts.map((opt, optIdx) => {
                              const isCorrect =
                                qType === 'MSQ'
                                  ? Array.isArray(q.correctAnswerIndices) && q.correctAnswerIndices.includes(optIdx)
                                  : q.correctAnswerIndex === optIdx;

                              return (
                                <div
                                  key={optIdx}
                                  className={`px-3.5 py-2.5 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                                    isCorrect
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold ring-1 ring-emerald-300'
                                      : 'bg-white border-slate-200 text-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                                    <span
                                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                        isCorrect
                                          ? 'bg-emerald-600 text-white'
                                          : 'border border-slate-300 text-slate-600 bg-slate-50'
                                      }`}
                                    >
                                      {String.fromCharCode(65 + optIdx)}
                                    </span>
                                    <span className="leading-snug break-words">{opt}</span>
                                  </div>

                                  {isCorrect && (
                                    <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 uppercase shrink-0 bg-emerald-100/70 px-2 py-0.5 rounded">
                                      <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Correct Answer
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {q.explanation && (
                          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                            <strong className="text-slate-800 font-semibold">Explanation:</strong> {q.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedQuiz(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold hover:bg-slate-100 text-slate-700 cursor-pointer"
              >
                Close Quiz Details
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 7. MODAL: VIDEO PREVIEW */}
      {previewVideo && (
        <Modal
          isOpen={Boolean(previewVideo)}
          onClose={() => setPreviewVideo(null)}
          title={`Lecture Video: ${previewVideo.title}`}
          maxWidth="max-w-3xl"
          closeOnBackdropClick={false}
        >
          <div className="space-y-4">
            <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-inner flex items-center justify-center">
              <video
                src={previewVideo.url}
                controls
                autoPlay
                className="w-full h-full object-contain"
              >
                Your browser does not support the video tag.
              </video>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span className="truncate max-w-md">{previewVideo.title}</span>
              <button
                type="button"
                onClick={() => setPreviewVideo(null)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold hover:bg-slate-100 text-slate-700 cursor-pointer"
              >
                Close Player
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
          fileName={previewDoc.fileName}
          title={previewDoc.title}
          fileType={previewDoc.fileType}
        />
      )}
    </div>
  );
};
