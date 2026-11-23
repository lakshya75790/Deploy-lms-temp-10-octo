import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getTrainingById,
  saveFullCourse,
  getCategories,
  uploadImage,
  uploadVideo,
  uploadPdf,
  uploadAssignmentPdf,
  deleteMedia
} from '../../services/api';
import { validateImageFile, validateVideoFile, validatePdfFile, validateAssignmentPdfFile } from '../../utils/fileValidation';
import { formatQuizDuration, sanitizeQuizDuration, validateQuizDuration, formatFileSize } from '../../utils/formatters';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Modal } from '../../components/common/Modal';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { DocumentPreviewModal } from '../../components/common/DocumentPreviewModal';
import { useNotification } from '../../context/NotificationContext';
import {
  ArrowLeft,
  BookOpen,
  Layers,
  HelpCircle,
  FileCheck2,
  CheckCircle2,
  Plus,
  Trash2,
  Edit3,
  Upload,
  Video,
  FileText,
  Save,
  Send,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Eye,
  RefreshCw
} from 'lucide-react';

const formatVideoDuration = (seconds) => {
  if (!seconds || isNaN(seconds) || seconds <= 0) return null;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
};

export const CourseBuilder = () => {
  const { id: routeTrainingId } = useParams();
  const isEditMode = routeTrainingId && routeTrainingId !== 'new';
  const navigate = useNavigate();
  const { addToast } = useNotification();

  const [loading, setLoading] = useState(isEditMode);
  const [categories, setCategories] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // STEP 1 — BASIC INFORMATION
  const [trainingId, setTrainingId] = useState(isEditMode ? routeTrainingId : null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [thumbnailPublicId, setThumbnailPublicId] = useState('');
  const [benefits, setBenefits] = useState([]);
  const [benefitInput, setBenefitInput] = useState('');
  const [uploadingThumb, setUploadingThumb] = useState(false);

  // STEP 2 — COURSE BUILDER (SECTIONS & LECTURES)
  const [sections, setSections] = useState([]);
  // Section Modal state
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSectionIdx, setEditingSectionIdx] = useState(null);
  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionDesc, setSectionDesc] = useState('');

  // Lecture Modal state
  const [showLectureModal, setShowLectureModal] = useState(false);
  const [targetSectionIdx, setTargetSectionIdx] = useState(null);
  const [editingLectureIdx, setEditingLectureIdx] = useState(null);
  const [lectureTitle, setLectureTitle] = useState('');
  const [lectureDesc, setLectureDesc] = useState('');
  const [lectureVideoUrl, setLectureVideoUrl] = useState('');
  const [lectureVideoPublicId, setLectureVideoPublicId] = useState('');
  const [lectureVideoDuration, setLectureVideoDuration] = useState(0);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [videoUploadState, setVideoUploadState] = useState('idle'); // 'idle' | 'uploading' | 'success' | 'error'
  const [videoUploadError, setVideoUploadError] = useState('');
  const [showCancelUploadConfirm, setShowCancelUploadConfirm] = useState(false);
  const videoUploadAbortControllerRef = useRef(null);

  // Browser Navigation Protection during active video upload
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (uploadingVideo) {
        e.preventDefault();
        e.returnValue = 'Video upload is in progress. Leaving now will cancel the upload.';
        return e.returnValue;
      }
    };

    if (uploadingVideo) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [uploadingVideo]);

  // Section Quiz Modal state
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDurationMinutes, setQuizDurationMinutes] = useState(15);
  const [quizDurationError, setQuizDurationError] = useState('');
  const [quizPassingScorePercent, setQuizPassingScorePercent] = useState('');
  const [quizPassingScoreError, setQuizPassingScoreError] = useState('');
  const [quizQuestions, setQuizQuestions] = useState([
    {
      questionText: '',
      questionType: 'MCQ',
      options: ['', '', '', ''],
      correctAnswerIndex: 0,
      correctAnswerText: ''
    }
  ]);

  // STEP 3 — ASSIGNMENT & RESOURCES (OPTIONAL)
  const [addAssignmentEnabled, setAddAssignmentEnabled] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentInstructions, setAssignmentInstructions] = useState('');
  const [assignmentPdf, setAssignmentPdf] = useState(null); // { fileUrl, fileName, fileSize, filePublicId }
  const [uploadingAssignmentPdf, setUploadingAssignmentPdf] = useState(false);

  const [addResourcesEnabled, setAddResourcesEnabled] = useState(false);
  const [resources, setResources] = useState([]); // [{ title, fileUrl, filePublicId }]
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  // Confirmation Modal State
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Delete',
    onConfirm: null
  });

  const openConfirmDialog = ({ title, message, confirmText = 'Delete', onConfirm }) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      confirmText,
      onConfirm
    });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false, onConfirm: null }));
  };

  // Load Categories & Existing Training (if edit)
  useEffect(() => {
    const init = async () => {
      try {
        const catRes = await getCategories();
        setCategories(catRes.data.data.categories || []);

        if (isEditMode) {
          const tRes = await getTrainingById(routeTrainingId);
          const t = tRes.data.data.training;
          if (t) {
            setTrainingId(t._id);
            setTitle(t.title || '');
            setDescription(t.description || '');
            setCategoryId(t.categoryId?._id || t.categoryId || '');
            setThumbnailUrl(t.thumbnailUrl || '');
            setThumbnailPublicId(t.thumbnailPublicId || '');
            setBenefits(t.benefits || []);

            // Populate Sections, Lectures & Section Quizzes
            if (t.sections && t.sections.length > 0) {
              const loadedSections = t.sections.map((sec) => {
                const secQuiz = sec.quiz ||
                  (sec.quizzes && sec.quizzes[0]) ||
                  t.quizzes?.find(q => (q.sectionId && (q.sectionId === sec._id || q.sectionId === sec.id))) ||
                  sec.subSections?.find(sub => sub.quizId)?.quizId || null;

                let mappedQuiz = null;
                if (secQuiz) {
                  mappedQuiz = {
                    id: secQuiz._id || secQuiz.id,
                    title: secQuiz.title || `${sec.title || 'Section'} Quiz`,
                    timeLimitMinutes: sanitizeQuizDuration(secQuiz.timeLimitMinutes),
                    passingScorePercent: secQuiz.passingScorePercent || 70,
                    questions: Array.isArray(secQuiz.questions) && secQuiz.questions.length > 0
                      ? secQuiz.questions.map(q => {
                          const qType = q.questionType || (q.options?.length > 0 ? 'MCQ' : 'FILL_IN_BLANK');
                          return {
                            id: q._id || q.id,
                            questionText: q.questionText || '',
                            questionType: qType,
                            options: Array.isArray(q.options) && q.options.length > 0
                              ? [...q.options]
                              : (qType === 'ONE_WORD' || qType === 'FILL_IN_BLANK' ? [] : ['', '', '', '']),
                            correctAnswerIndex: q.correctAnswerIndex !== undefined && q.correctAnswerIndex !== null ? Number(q.correctAnswerIndex) : 0,
                            correctAnswerIndices: Array.isArray(q.correctAnswerIndices) ? q.correctAnswerIndices : [],
                            correctAnswerText: q.correctAnswerText || '',
                            score: q.score !== undefined && q.score !== null ? Number(q.score) : 1,
                            explanation: q.explanation || ''
                          };
                        })
                      : []
                  };
                }

                return {
                  id: sec._id || sec.id,
                  title: sec.title || '',
                  description: sec.description || '',
                  quiz: mappedQuiz,
                  lectures: sec.subSections ? sec.subSections.map(sub => ({
                    id: sub._id || sub.id,
                    title: sub.title || '',
                    description: sub.description || '',
                    videoUrl: sub.videoUrl || '',
                    videoPublicId: sub.videoPublicId || '',
                    videoDuration: sub.videoDuration || 0
                  })) : []
                };
              });

              // Backward compatibility fallback: if course has an unmapped quiz, attach to first section
              if (t.quizzes && t.quizzes.length > 0 && !loadedSections.some(s => s.quiz)) {
                const legacyQuiz = t.quizzes[0];
                loadedSections[0].quiz = {
                  id: legacyQuiz._id || legacyQuiz.id,
                  title: legacyQuiz.title || `${loadedSections[0].title} Quiz`,
                  timeLimitMinutes: sanitizeQuizDuration(legacyQuiz.timeLimitMinutes),
                  passingScorePercent: legacyQuiz.passingScorePercent || 70,
                  questions: Array.isArray(legacyQuiz.questions)
                    ? legacyQuiz.questions.map(q => {
                        const qType = q.questionType || (q.options?.length > 0 ? 'MCQ' : 'FILL_IN_BLANK');
                        return {
                          id: q._id || q.id,
                          questionText: q.questionText || '',
                          questionType: qType,
                          options: Array.isArray(q.options) && q.options.length > 0
                            ? [...q.options]
                            : (qType === 'ONE_WORD' || qType === 'FILL_IN_BLANK' ? [] : ['', '', '', '']),
                          correctAnswerIndex: q.correctAnswerIndex !== undefined && q.correctAnswerIndex !== null ? Number(q.correctAnswerIndex) : 0,
                          correctAnswerIndices: Array.isArray(q.correctAnswerIndices) ? q.correctAnswerIndices : [],
                          correctAnswerText: q.correctAnswerText || '',
                          score: q.score !== undefined && q.score !== null ? Number(q.score) : 1,
                          explanation: q.explanation || ''
                        };
                      })
                    : []
                };
              }

              setSections(loadedSections);
            }

            // Populate Assignment
            const firstAss = t.sections?.flatMap(s => s.subSections || []).find(sub => sub.assignmentId)?.assignmentId;
            if (firstAss) {
              setAddAssignmentEnabled(true);
              setAssignmentTitle(firstAss.title || '');
              setAssignmentInstructions(firstAss.instructions || '');
              if (firstAss.fileUrl) {
                setAssignmentPdf({
                  fileUrl: firstAss.fileUrl,
                  fileName: firstAss.fileName || 'Assignment_Document.pdf',
                  fileSize: firstAss.fileSize || null,
                  filePublicId: firstAss.filePublicId || null
                });
              }
            }

            // Populate Resources
            const pdfs = t.sections?.flatMap(s => s.subSections || []).flatMap(sub => sub.pdfResources || []);
            if (pdfs && pdfs.length > 0) {
              setAddResourcesEnabled(true);
              setResources(pdfs.map(p => ({ title: p.title, fileUrl: p.fileUrl, filePublicId: p.filePublicId })));
            }
          }
        }
      } catch (err) {
        addToast('error', 'Failed to load course details');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [routeTrainingId, isEditMode]);

  // BENEFIT HANDLERS
  const handleAddBenefit = () => {
    const trimmed = benefitInput.trim();
    if (!trimmed) return;
    if (benefits.length >= 10) {
      addToast('warning', 'Maximum 10 benefits allowed.');
      return;
    }
    if (trimmed.length > 150) {
      addToast('error', 'Benefit cannot exceed 150 characters');
      return;
    }
    setBenefits([...benefits, trimmed]);
    setBenefitInput('');
  };

  const handleDeleteBenefit = (idx) => {
    setBenefits(benefits.filter((_, i) => i !== idx));
  };

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      addToast('error', validation.error);
      e.target.value = null;
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    setUploadingThumb(true);
    try {
      const res = await uploadImage(formData);
      const newPublicId = res.data.data.publicId || res.data.data.public_id || res.data.data.url;
      const oldTarget = thumbnailPublicId || thumbnailUrl;
      if (oldTarget && oldTarget !== newPublicId) {
        deleteMedia(oldTarget, 'image').catch(err => console.warn('Failed to delete old thumbnail from Cloudinary:', err));
      }
      setThumbnailUrl(res.data.data.url);
      setThumbnailPublicId(newPublicId);
      addToast('success', 'Thumbnail uploaded successfully!');
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to upload thumbnail');
    } finally {
      setUploadingThumb(false);
      e.target.value = null;
    }
  };

  const handleDeleteThumbnail = () => {
    openConfirmDialog({
      title: 'Delete Thumbnail',
      message: 'Are you sure you want to delete this course thumbnail image? You can upload a new one at any time.',
      confirmText: 'Delete Thumbnail',
      onConfirm: async () => {
        const target = thumbnailPublicId || thumbnailUrl;
        try {
          if (target) {
            await deleteMedia(target, 'image');
          }
          setThumbnailUrl('');
          setThumbnailPublicId('');
          addToast('success', 'File deleted successfully.');
        } catch (err) {
          addToast('error', err.response?.data?.message || 'Unable to delete the file. Please try again.');
        } finally {
          closeConfirmDialog();
        }
      }
    });
  };

  // SECTION HANDLERS
  const openAddSectionModal = () => {
    setEditingSectionIdx(null);
    setSectionTitle('');
    setSectionDesc('');
    setShowSectionModal(true);
  };

  const openEditSectionModal = (idx) => {
    setEditingSectionIdx(idx);
    setSectionTitle(sections[idx].title);
    setSectionDesc(sections[idx].description || '');
    setShowSectionModal(true);
  };

  const handleSaveSection = (e) => {
    e.preventDefault();
    const trimmedTitle = sectionTitle.trim();
    if (!trimmedTitle) {
      addToast('error', 'Section title is required');
      return;
    }
    if (trimmedTitle.length > 100) {
      addToast('error', 'Section title cannot exceed 100 characters');
      return;
    }
    if (sectionDesc && sectionDesc.trim().length > 500) {
      addToast('error', 'Section description cannot exceed 500 characters');
      return;
    }

    if (editingSectionIdx !== null) {
      const updated = [...sections];
      updated[editingSectionIdx].title = trimmedTitle;
      updated[editingSectionIdx].description = sectionDesc.trim();
      setSections(updated);
      addToast('success', 'Section updated successfully');
    } else {
      setSections([...sections, { title: trimmedTitle, description: sectionDesc.trim(), lectures: [] }]);
      addToast('success', 'Section added successfully');
    }
    setShowSectionModal(false);
  };

  const handleDeleteSection = (idx) => {
    const sectionTitle = sections[idx]?.title || 'this section';
    openConfirmDialog({
      title: 'Delete Section Module',
      message: `Are you sure you want to delete "${sectionTitle}" and all of its lectures? This action cannot be undone.`,
      confirmText: 'Delete Section',
      onConfirm: () => {
        setSections(sections.filter((_, i) => i !== idx));
        addToast('success', 'Section deleted');
        closeConfirmDialog();
      }
    });
  };

  // LECTURE HANDLERS
  const openAddLectureModal = (sIdx) => {
    setTargetSectionIdx(sIdx);
    setEditingLectureIdx(null);
    setLectureTitle('');
    setLectureDesc('');
    setLectureVideoUrl('');
    setLectureVideoPublicId('');
    setLectureVideoDuration(0);
    setVideoUploadProgress(0);
    setVideoUploadState('idle');
    setVideoUploadError('');
    setShowLectureModal(true);
  };

  const openEditLectureModal = (sIdx, lIdx) => {
    setTargetSectionIdx(sIdx);
    setEditingLectureIdx(lIdx);
    const lec = sections[sIdx].lectures[lIdx];
    setLectureTitle(lec.title);
    setLectureDesc(lec.description || '');
    setLectureVideoUrl(lec.videoUrl || '');
    setLectureVideoPublicId(lec.videoPublicId || '');
    setLectureVideoDuration(lec.videoDuration || 0);
    setVideoUploadProgress(lec.videoUrl ? 100 : 0);
    setVideoUploadState(lec.videoUrl ? 'success' : 'idle');
    setVideoUploadError('');
    setShowLectureModal(true);
  };

  const handleAttemptCloseLectureModal = () => {
    if (uploadingVideo) {
      setShowCancelUploadConfirm(true);
    } else {
      handleCloseLectureModal();
    }
  };

  const handleCloseLectureModal = () => {
    setShowLectureModal(false);
    setUploadingVideo(false);
    setVideoUploadProgress(0);
    setVideoUploadState('idle');
    setVideoUploadError('');
  };

  const handleConfirmCancelUpload = () => {
    if (videoUploadAbortControllerRef.current) {
      videoUploadAbortControllerRef.current.abort();
      videoUploadAbortControllerRef.current = null;
    }
    setUploadingVideo(false);
    setVideoUploadProgress(0);
    setVideoUploadState('idle');
    setVideoUploadError('');
    setShowCancelUploadConfirm(false);
    setShowLectureModal(false);
    addToast('info', 'Video upload cancelled');
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (uploadingVideo) return;

    const validation = validateVideoFile(file);
    if (!validation.valid) {
      addToast('error', validation.error);
      e.target.value = null;
      return;
    }

    if (videoUploadAbortControllerRef.current) {
      videoUploadAbortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    videoUploadAbortControllerRef.current = abortController;

    const formData = new FormData();
    formData.append('file', file);
    setUploadingVideo(true);
    setVideoUploadProgress(0);
    setVideoUploadState('uploading');
    setVideoUploadError('');

    try {
      const res = await uploadVideo(formData, {
        signal: abortController.signal,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.min(99, Math.round((progressEvent.loaded * 100) / progressEvent.total));
            setVideoUploadProgress(percent);
          }
        }
      });

      const newPublicId = res.data.data.publicId || res.data.data.public_id || res.data.data.url;
      const oldTarget = lectureVideoPublicId || lectureVideoUrl;
      if (oldTarget && oldTarget !== newPublicId) {
        deleteMedia(oldTarget, 'video').catch(err => console.warn('Failed to delete old video from Cloudinary:', err));
      }

      setLectureVideoUrl(res.data.data.url);
      setLectureVideoPublicId(newPublicId);
      setLectureVideoDuration(res.data.data.duration || 0);
      setVideoUploadProgress(100);
      setVideoUploadState('success');
      setVideoUploadError('');
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
        setVideoUploadProgress(0);
        setVideoUploadState('idle');
        setVideoUploadError('');
      } else {
        const errorMsg = err.response?.data?.message || 'Failed to upload video';
        setVideoUploadState('error');
        setVideoUploadError(errorMsg);
        setLectureVideoUrl('');
        setLectureVideoPublicId('');
        setLectureVideoDuration(0);
        addToast('error', errorMsg);
      }
    } finally {
      setUploadingVideo(false);
      videoUploadAbortControllerRef.current = null;
      if (e.target) {
        e.target.value = null;
      }
    }
  };

  const handleDeleteLectureVideo = () => {
    openConfirmDialog({
      title: 'Delete Video File',
      message: 'Are you sure you want to delete this lecture video? You will need to upload a replacement video.',
      confirmText: 'Delete Video',
      onConfirm: async () => {
        const target = lectureVideoPublicId || lectureVideoUrl;
        try {
          if (target) {
            await deleteMedia(target, 'video');
          }
          setLectureVideoUrl('');
          setLectureVideoPublicId('');
          setLectureVideoDuration(0);
          setVideoUploadProgress(0);
          setVideoUploadState('idle');
          setVideoUploadError('');
          addToast('success', 'File deleted successfully.');
        } catch (err) {
          addToast('error', err.response?.data?.message || 'Unable to delete the file. Please try again.');
        } finally {
          closeConfirmDialog();
        }
      }
    });
  };

  const handleSaveLecture = (e) => {
    e.preventDefault();
    if (uploadingVideo) {
      addToast('warning', 'Please wait until the video upload finishes before saving the lecture');
      return;
    }

    const trimmedTitle = lectureTitle.trim();
    if (!trimmedTitle) {
      addToast('error', 'Lecture title is required');
      return;
    }
    if (trimmedTitle.length > 120) {
      addToast('error', 'Lecture title cannot exceed 120 characters');
      return;
    }
    if (lectureDesc && lectureDesc.trim().length > 1000) {
      addToast('error', 'Lecture description cannot exceed 1,000 characters');
      return;
    }

    if (!lectureVideoUrl) {
      addToast('error', 'Please upload a video for this lecture before saving');
      return;
    }

    const updated = [...sections];
    const lecObj = {
      title: trimmedTitle,
      description: lectureDesc.trim(),
      videoUrl: lectureVideoUrl,
      videoPublicId: lectureVideoPublicId,
      videoDuration: Number(lectureVideoDuration) || 0
    };

    if (editingLectureIdx !== null) {
      updated[targetSectionIdx].lectures[editingLectureIdx] = lecObj;
      addToast('success', 'Lecture updated successfully');
    } else {
      updated[targetSectionIdx].lectures.push(lecObj);
      addToast('success', 'Lecture added successfully');
    }

    setSections(updated);
    handleCloseLectureModal();
  };

  const handleDeleteLecture = (sIdx, lIdx) => {
    const lectureTitle = sections[sIdx]?.lectures?.[lIdx]?.title || 'this lecture';
    openConfirmDialog({
      title: 'Delete Lecture Video',
      message: `Are you sure you want to delete "${lectureTitle}"? The associated video asset will also be removed.`,
      confirmText: 'Delete Lecture',
      onConfirm: async () => {
        const lec = sections[sIdx]?.lectures?.[lIdx];
        if (lec && lec.videoPublicId) {
          try {
            await deleteMedia(lec.videoPublicId, 'video');
          } catch (err) {
            console.warn('Failed to delete lecture video asset from Cloudinary:', err);
          }
        }
        const updated = [...sections];
        updated[sIdx].lectures = updated[sIdx].lectures.filter((_, i) => i !== lIdx);
        setSections(updated);
        addToast('success', 'Lecture deleted');
        closeConfirmDialog();
      }
    });
  };

  // SECTION QUIZ HANDLERS
  const openAddQuizModal = (sIdx) => {
    setTargetSectionIdx(sIdx);
    const sec = sections[sIdx];
    setQuizTitle(sec ? `${sec.title} Quiz` : 'Section Quiz');
    setQuizDurationMinutes(15);
    setQuizDurationError('');
    setQuizPassingScorePercent('');
    setQuizPassingScoreError('');
    setQuizQuestions([
      {
        questionText: '',
        questionType: 'MCQ',
        options: ['', '', '', ''],
        correctAnswerIndex: 0,
        correctAnswerIndices: [0],
        correctAnswerText: '',
        score: 1,
        explanation: ''
      }
    ]);
    setShowQuizModal(true);
  };

  const openEditQuizModal = (sIdx) => {
    setTargetSectionIdx(sIdx);
    const sec = sections[sIdx];
    const quiz = sec?.quiz;
    if (quiz) {
      setQuizTitle(quiz.title || `${sec.title} Quiz`);
      setQuizDurationMinutes(sanitizeQuizDuration(quiz.timeLimitMinutes));
      setQuizDurationError('');
      setQuizPassingScorePercent(
        quiz.passingScorePercent !== undefined && quiz.passingScorePercent !== null
          ? String(quiz.passingScorePercent)
          : ''
      );
      setQuizPassingScoreError('');
      if (quiz.questions && quiz.questions.length > 0) {
        setQuizQuestions(quiz.questions.map(q => {
          const qType = q.questionType || (q.options?.length > 0 ? 'MCQ' : 'FILL_IN_BLANK');
          const opts = Array.isArray(q.options) && q.options.length > 0
            ? [...q.options]
            : (qType === 'FILL_IN_BLANK' || qType === 'ONE_WORD' ? [] : ['', '', '', '']);
          let indices = [];
          if (Array.isArray(q.correctAnswerIndices) && q.correctAnswerIndices.length > 0) {
            indices = q.correctAnswerIndices.map(Number);
          } else if (q.correctAnswerIndex !== undefined && q.correctAnswerIndex !== null) {
            indices = [Number(q.correctAnswerIndex)];
          } else {
            indices = (qType === 'FILL_IN_BLANK' || qType === 'ONE_WORD') ? [] : [0];
          }

          return {
            id: q.id || q._id,
            questionText: q.questionText || '',
            questionType: qType,
            options: opts,
            correctAnswerIndex: indices.length > 0 ? indices[0] : ((qType === 'FILL_IN_BLANK' || qType === 'ONE_WORD') ? null : 0),
            correctAnswerIndices: indices,
            correctAnswerText: q.correctAnswerText || '',
            score: q.score !== undefined && q.score !== null ? Number(q.score) : 1,
            explanation: q.explanation || ''
          };
        }));
      } else {
        setQuizQuestions([
          {
            questionText: '',
            questionType: 'MCQ',
            options: ['', '', '', ''],
            correctAnswerIndex: 0,
            correctAnswerIndices: [0],
            correctAnswerText: '',
            score: 1,
            explanation: ''
          }
        ]);
      }
    } else {
      openAddQuizModal(sIdx);
      return;
    }
    setShowQuizModal(true);
  };

  const handleSaveSectionQuiz = (e) => {
    e.preventDefault();
    const trimmedQuizTitle = quizTitle.trim();
    if (!trimmedQuizTitle) {
      addToast('error', 'Quiz Title is required');
      return;
    }
    if (trimmedQuizTitle.length > 120) {
      addToast('error', 'Quiz Title cannot exceed 120 characters');
      return;
    }

    // Validate Quiz Duration (1 to 600 minutes)
    const durationErr = validateQuizDuration(quizDurationMinutes);
    if (durationErr) {
      addToast('error', durationErr);
      setQuizDurationError(durationErr);
      return;
    }
    const finalDurationMinutes = parseInt(String(quizDurationMinutes).trim(), 10);

    // Validate Quiz Passing Score (1 to 100)
    const passingScoreTrimmed = String(quizPassingScorePercent === undefined || quizPassingScorePercent === null ? '' : quizPassingScorePercent).trim();
    if (!passingScoreTrimmed) {
      addToast('error', 'Passing Score is required');
      setQuizPassingScoreError('Please enter a passing score percentage between 1 and 100');
      return;
    }
    const parsedPassingScore = parseInt(passingScoreTrimmed, 10);
    if (isNaN(parsedPassingScore) || parsedPassingScore < 1 || parsedPassingScore > 100) {
      addToast('error', 'Passing score must be between 1% and 100%');
      setQuizPassingScoreError('Passing score must be between 1% and 100%');
      return;
    }

    const validQuestions = quizQuestions.filter(q => q.questionText && q.questionText.trim());
    if (validQuestions.length === 0) {
      addToast('error', 'Please provide at least one question with question text');
      return;
    }

    for (let i = 0; i < validQuestions.length; i++) {
      const q = validQuestions[i];
      if (q.questionText.trim().length > 500) {
        addToast('error', `Question #${i + 1}: Question text cannot exceed 500 characters`);
        return;
      }
      if (q.questionType === 'MCQ' || q.questionType === 'MSQ') {
        const filledOpts = (q.options || []).filter(o => o && o.trim());
        if (filledOpts.length < 2) {
          addToast('error', `Question #${i + 1}: Multiple choice/select questions must have at least 2 options`);
          return;
        }
        for (let j = 0; j < (q.options || []).length; j++) {
          if (q.options[j] && q.options[j].length > 200) {
            addToast('error', `Question #${i + 1}, Option ${String.fromCharCode(65 + j)}: Option text cannot exceed 200 characters`);
            return;
          }
        }
        if (q.questionType === 'MSQ') {
          const selectedIndices = (q.correctAnswerIndices || []).filter(idx => idx >= 0 && idx < (q.options || []).length);
          if (selectedIndices.length === 0) {
            addToast('error', `Question #${i + 1}: Please select at least one correct answer for Multiple Select`);
            return;
          }
        }
      }
      if (q.questionType === 'ONE_WORD') {
        const trimmedExpected = (q.correctAnswerText || '').trim();
        if (!trimmedExpected) {
          addToast('error', `Question #${i + 1}: Expected Answer is required for One-Word Answer`);
          return;
        }
        if (trimmedExpected.length > 100) {
          addToast('error', `Question #${i + 1}: Expected Answer cannot exceed 100 characters`);
          return;
        }

        const normalizeStr = (str) => (str || '').trim().toLowerCase().replace(/\s+/g, ' ');
        const expectedNorm = normalizeStr(trimmedExpected);

        const rawVariations = Array.isArray(q.options) ? q.options : [];
        const filledVariations = rawVariations.map(v => (typeof v === 'string' ? v.trim() : '')).filter(Boolean);

        if (filledVariations.length > 5) {
          addToast('error', `Question #${i + 1}: Maximum 5 additional accepted answers allowed.`);
          return;
        }

        const seenNorms = new Set();
        for (let j = 0; j < filledVariations.length; j++) {
          const varText = filledVariations[j];
          if (varText.length > 100) {
            addToast('error', `Question #${i + 1}, Accepted Variation #${j + 1}: Cannot exceed 100 characters`);
            return;
          }
          const varNorm = normalizeStr(varText);
          if (varNorm === expectedNorm) {
            addToast('error', `Question #${i + 1}: Accepted variation "${varText}" is identical to the primary Expected Answer. Duplicates are not allowed.`);
            return;
          }
          if (seenNorms.has(varNorm)) {
            addToast('error', `Question #${i + 1}: Duplicate accepted variation "${varText}" found. Each accepted answer must be unique.`);
            return;
          }
          seenNorms.add(varNorm);
        }
      }
      if (q.questionType === 'FILL_IN_BLANK' && q.correctAnswerText && q.correctAnswerText.length > 200) {
        addToast('error', `Question #${i + 1}: Correct answer text cannot exceed 200 characters`);
        return;
      }
    }

    const updated = [...sections];
    const existingSecQuiz = updated[targetSectionIdx]?.quiz;
    updated[targetSectionIdx].quiz = {
      ...(existingSecQuiz || {}),
      title: trimmedQuizTitle,
      timeLimitMinutes: finalDurationMinutes,
      passingScorePercent: parsedPassingScore,
      questions: validQuestions.map((q, qIdx) => {
        const qType = q.questionType || 'MCQ';
        let indices = Array.isArray(q.correctAnswerIndices) ? q.correctAnswerIndices.map(Number) : [];
        if (indices.length === 0 && q.correctAnswerIndex !== undefined && q.correctAnswerIndex !== null) {
          indices = [Number(q.correctAnswerIndex)];
        }
        indices = Array.from(new Set(indices)).sort((a, b) => a - b);
        const correctText = qType === 'MSQ'
          ? indices.map(idx => q.options?.[idx]).filter(Boolean).join(', ')
          : qType === 'MCQ'
            ? (q.options?.[indices[0]] || '')
            : (q.correctAnswerText || '');

        const cleanOptions = qType === 'ONE_WORD'
          ? (Array.isArray(q.options) ? q.options.map(o => (typeof o === 'string' ? o.trim() : '')).filter(Boolean).slice(0, 5) : [])
          : (q.options || []);

        const qScore = (!isNaN(parseInt(q.score, 10)) && parseInt(q.score, 10) > 0) ? parseInt(q.score, 10) : 1;
        const qExplanation = qType === 'ONE_WORD' ? null : (q.explanation || '').trim();

        return {
          ...q,
          order: qIdx + 1,
          questionType: qType,
          options: cleanOptions,
          correctAnswerIndices: indices,
          correctAnswerIndex: indices.length > 0 ? indices[0] : ((qType === 'FILL_IN_BLANK' || qType === 'ONE_WORD') ? null : 0),
          correctAnswerText: qType === 'ONE_WORD' ? (q.correctAnswerText || '').trim() : correctText,
          score: qScore,
          explanation: qExplanation
        };
      })
    };

    setSections(updated);
    setShowQuizModal(false);
    addToast('success', 'Quiz added successfully');
  };

  const handleRemoveSectionQuiz = (sIdx) => {
    const sectionTitle = sections[sIdx]?.title || 'this section';
    openConfirmDialog({
      title: 'Remove Section Quiz',
      message: `Are you sure you want to remove the quiz from "${sectionTitle}"? All questions in this section quiz will be removed.`,
      confirmText: 'Delete Quiz',
      onConfirm: () => {
        const updated = [...sections];
        updated[sIdx].quiz = null;
        setSections(updated);
        addToast('success', 'Quiz removed from section');
        closeConfirmDialog();
      }
    });
  };

  // QUIZ QUESTION BUILDER HANDLERS
  const handleAddQuestion = () => {
    setQuizQuestions([
      ...quizQuestions,
      {
        questionText: '',
        questionType: 'MCQ',
        options: ['', '', '', ''],
        correctAnswerIndex: 0,
        correctAnswerIndices: [0],
        correctAnswerText: '',
        score: 1,
        explanation: ''
      }
    ]);
  };

  const handleDeleteQuestion = (idx) => {
    setQuizQuestions(quizQuestions.filter((_, i) => i !== idx));
  };

  // ASSIGNMENT PDF UPLOAD HANDLERS
  const handleAssignmentPdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate PDF MIME type, extension, and 5 MB size limit
    const validation = validateAssignmentPdfFile(file);
    if (!validation.valid) {
      addToast('error', validation.error);
      e.target.value = null;
      return;
    }

    setUploadingAssignmentPdf(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await uploadAssignmentPdf(formData);
      const data = res.data?.data || {};
      setAssignmentPdf({
        fileUrl: data.fileUrl || data.url,
        fileName: data.fileName || file.name,
        fileSize: data.fileSize || file.size,
        filePublicId: data.filePublicId || data.publicId
      });
      addToast('success', 'Assignment PDF document attached successfully!');
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to upload assignment PDF');
    } finally {
      setUploadingAssignmentPdf(false);
      e.target.value = null;
    }
  };

  const handleRemoveAssignmentPdf = () => {
    setAssignmentPdf(null);
    addToast('info', 'Assignment PDF attachment removed.');
  };

  // RESOURCE UPLOAD HANDLERS
  const handlePdfUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Strictly validate PDF MIME type, extension, and size
    const validFiles = [];
    for (const file of files) {
      const validation = validatePdfFile(file);
      if (!validation.valid) {
        addToast('error', validation.error === 'Only PDF files are allowed.' ? `${file.name}: Only PDF files are allowed.` : `${file.name}: ${validation.error}`);
      } else {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) {
      e.target.value = null;
      return;
    }

    setUploadingPdf(true);
    try {
      const uploadedList = [];
      for (const file of validFiles) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await uploadPdf(formData);
        const pId = res.data.data.publicId || res.data.data.public_id || res.data.data.url;
        uploadedList.push({
          title: file.name,
          fileUrl: res.data.data.url,
          filePublicId: pId,
          originalName: file.name
        });
      }
      setResources([...resources, ...uploadedList]);
      addToast('success', `${uploadedList.length} PDF resource(s) uploaded successfully!`);
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to upload PDF resources');
    } finally {
      setUploadingPdf(false);
      e.target.value = null;
    }
  };

  const handleDeleteResource = (idx) => {
    const resourceTitle = resources[idx]?.title || 'this resource';
    openConfirmDialog({
      title: 'Delete Resource File',
      message: `Are you sure you want to delete "${resourceTitle}"?`,
      confirmText: 'Delete Resource',
      onConfirm: async () => {
        const targetRes = resources[idx];
        try {
          const target = targetRes?.filePublicId || targetRes?.pdfPublicId || targetRes?.fileUrl || targetRes?.pdfUrl;
          if (target) {
            await deleteMedia(target, 'raw');
          }
          setResources(resources.filter((_, i) => i !== idx));
          addToast('success', 'File deleted successfully.');
        } catch (err) {
          addToast('error', err.response?.data?.message || 'Unable to delete the file. Please try again.');
        } finally {
          closeConfirmDialog();
        }
      }
    });
  };

  // STEP NAVIGATION VALIDATION
  const handleNextStep = () => {
    if (currentStep === 1) {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        addToast('error', 'Training Title is required');
        return;
      }
      if (trimmedTitle.length < 2) {
        addToast('error', 'Training Title must be at least 2 characters long');
        return;
      }
      if (trimmedTitle.length > 150) {
        addToast('error', 'Training Title cannot exceed 150 characters');
        return;
      }
      if (description && description.trim().length > 300) {
        addToast('error', 'Short Description cannot exceed 300 characters');
        return;
      }
      if (benefits.length > 10) {
        addToast('error', 'Maximum 10 benefits allowed');
        return;
      }
      for (let i = 0; i < benefits.length; i++) {
        if (benefits[i].length > 150) {
          addToast('error', `Benefit #${i + 1} exceeds 150 characters`);
          return;
        }
      }
      if (!categoryId) {
        addToast('error', 'Please select a Category');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (sections.length === 0) {
        addToast('error', 'Please add at least one Section to your course structure');
        return;
      }
      const hasAnyLectures = sections.some(s => s.lectures && s.lectures.length > 0);
      if (!hasAnyLectures) {
        addToast('error', 'Please add at least one Lecture inside your section');
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (addAssignmentEnabled) {
        if (assignmentTitle.trim().length > 150) {
          addToast('error', 'Assignment title cannot exceed 150 characters');
          return;
        }
        if (assignmentInstructions.trim().length > 2000) {
          addToast('error', 'Assignment instructions cannot exceed 2,000 characters');
          return;
        }
      }
      setCurrentStep(4);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  // SUBMIT COURSE (SAVE AS DRAFT / PUBLISH)
  const handleFinalSubmit = async (targetStatus) => {
    if (submitting) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle || !categoryId) {
      addToast('error', 'Basic details missing. Please complete Step 1.');
      setCurrentStep(1);
      return;
    }

    if (trimmedTitle.length < 2) {
      addToast('error', 'Training Title must be at least 2 characters long');
      setCurrentStep(1);
      return;
    }

    if (trimmedTitle.length > 150) {
      addToast('error', 'Training Title cannot exceed 150 characters');
      setCurrentStep(1);
      return;
    }

    if (description && description.trim().length > 300) {
      addToast('error', 'Short Description cannot exceed 300 characters');
      setCurrentStep(1);
      return;
    }

    if (benefits.length > 10) {
      addToast('error', 'Maximum 10 benefits allowed');
      setCurrentStep(1);
      return;
    }

    if (sections.length === 0) {
      addToast('error', 'Please add at least one Section in Step 2.');
      setCurrentStep(2);
      return;
    }

    if (addAssignmentEnabled) {
      if (uploadingAssignmentPdf) {
        addToast('error', 'Please wait for the assignment PDF upload to finish.');
        setCurrentStep(3);
        return;
      }
      if (assignmentTitle.trim().length > 150) {
        addToast('error', 'Assignment title cannot exceed 150 characters');
        setCurrentStep(3);
        return;
      }
      if (assignmentInstructions.trim().length > 2000) {
        addToast('error', 'Assignment instructions cannot exceed 2,000 characters');
        setCurrentStep(3);
        return;
      }
    }

    setSubmitting(true);

    try {
      // Prepare sections with section-wise quizzes
      let preparedSections = sections.map((sec) => {
        let secQuiz = null;
        if (sec.quiz && sec.quiz.questions && sec.quiz.questions.length > 0) {
          secQuiz = {
            id: sec.quiz.id || sec.quiz._id,
            title: sec.quiz.title || `${sec.title} Quiz`,
            timeLimitMinutes: sanitizeQuizDuration(sec.quiz.timeLimitMinutes),
            passingScorePercent: Number(sec.quiz.passingScorePercent) || 70,
            questions: sec.quiz.questions.filter(q => q.questionText && q.questionText.trim()).map((q, qIdx) => {
              const qType = q.questionType || (q.options?.length > 0 ? 'MCQ' : 'FILL_IN_BLANK');
              const qScore = (!isNaN(parseInt(q.score, 10)) && parseInt(q.score, 10) > 0) ? parseInt(q.score, 10) : 1;
              const qExplanation = (q.explanation || '').trim();

              if (qType === 'ONE_WORD') {
                const cleanOptions = Array.isArray(q.options)
                  ? q.options.map(o => (typeof o === 'string' ? o.trim() : '')).filter(Boolean).slice(0, 5)
                  : [];
                return {
                  id: q.id || q._id,
                  questionText: (q.questionText || '').trim(),
                  questionType: 'ONE_WORD',
                  options: cleanOptions,
                  correctAnswerIndex: null,
                  correctAnswerIndices: [],
                  correctAnswerText: (q.correctAnswerText || '').trim(),
                  score: qScore,
                  explanation: null,
                  order: q.order !== undefined ? Number(q.order) : qIdx + 1
                };
              } else if (qType === 'TRUE_FALSE') {
                const idx = Number(q.correctAnswerIndex) === 1 ? 1 : 0;
                return {
                  id: q.id || q._id,
                  questionText: q.questionText,
                  questionType: 'TRUE_FALSE',
                  options: ['True', 'False'],
                  correctAnswerIndex: idx,
                  correctAnswerIndices: [idx],
                  correctAnswerText: idx === 0 ? 'True' : 'False',
                  score: qScore,
                  explanation: qExplanation,
                  order: q.order !== undefined ? Number(q.order) : qIdx + 1
                };
              } else if (qType === 'FILL_IN_BLANK') {
                return {
                  id: q.id || q._id,
                  questionText: q.questionText,
                  questionType: 'FILL_IN_BLANK',
                  options: [],
                  correctAnswerIndex: null,
                  correctAnswerIndices: [],
                  correctAnswerText: (q.correctAnswerText || '').trim(),
                  score: qScore,
                  explanation: qExplanation,
                  order: q.order !== undefined ? Number(q.order) : qIdx + 1
                };
              } else if (qType === 'MSQ') {
                const opts = Array.isArray(q.options) ? q.options : [];
                const indices = Array.isArray(q.correctAnswerIndices) ? q.correctAnswerIndices.map(Number) : [];
                return {
                  id: q.id || q._id,
                  questionText: q.questionText,
                  questionType: 'MSQ',
                  options: opts,
                  correctAnswerIndex: indices.length > 0 ? indices[0] : null,
                  correctAnswerIndices: indices,
                  correctAnswerText: indices.map(i => opts[i]).filter(Boolean).join(', '),
                  score: qScore,
                  explanation: qExplanation,
                  order: q.order !== undefined ? Number(q.order) : qIdx + 1
                };
              } else {
                const idx = Number(q.correctAnswerIndex) || 0;
                const opts = Array.isArray(q.options) ? q.options : [];
                return {
                  id: q.id || q._id,
                  questionText: q.questionText,
                  questionType: 'MCQ',
                  options: opts,
                  correctAnswerIndex: idx,
                  correctAnswerIndices: [idx],
                  correctAnswerText: opts[idx] || '',
                  score: qScore,
                  explanation: qExplanation,
                  order: q.order !== undefined ? Number(q.order) : qIdx + 1
                };
              }
            })
          };
        }
        return {
          id: sec.id || sec._id,
          title: sec.title,
          description: sec.description,
          lectures: sec.lectures ? sec.lectures.map(lec => ({
            id: lec.id || lec._id,
            title: lec.title,
            description: lec.description,
            videoUrl: lec.videoUrl,
            videoPublicId: lec.videoPublicId,
            videoDuration: lec.videoDuration
          })) : [],
          quiz: secQuiz
        };
      });

      const payload = {
        trainingId,
        title: title.trim(),
        description: description.trim() || title.trim(),
        categoryId,
        thumbnailUrl,
        thumbnailPublicId,
        benefits,
        durationDays: 30,
        status: targetStatus, // 'draft' | 'published'
        sections: preparedSections,
        assignment: addAssignmentEnabled && (assignmentInstructions.trim() || assignmentPdf) ? {
          title: assignmentTitle.trim() || `${title} Project Assignment`,
          instructions: assignmentInstructions.trim(),
          fileUrl: assignmentPdf?.fileUrl || null,
          fileName: assignmentPdf?.fileName || null,
          fileSize: assignmentPdf?.fileSize || null,
          filePublicId: assignmentPdf?.filePublicId || null
        } : null,
        resources: addResourcesEnabled ? resources : []
      };

      await saveFullCourse(payload);
      addToast('success', `Training successfully ${targetStatus === 'published' ? 'published' : 'saved as draft'}!`);
      navigate('/instructor/trainings');
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to save training course');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading course builder details..." />;

  const stepsList = [
    { step: 1, label: 'Basic Info' },
    { step: 2, label: 'Course Builder' },
    { step: 3, label: 'Assignment & Resources' },
    { step: 4, label: 'Review & Publish' }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Header Bar */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-hidden">
        <div className="flex items-start sm:items-center space-x-3 min-w-0 flex-1">
          <button
            onClick={() => navigate('/instructor/trainings')}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer flex-shrink-0 mt-0.5 sm:mt-0"
            title="Back to Trainings"
            aria-label="Back to Trainings"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center text-[11px] font-bold text-emerald-700">
              <Sparkles className="w-3 h-3 mr-1" /> {isEditMode ? 'Edit Course' : 'Create New Course'}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-heading break-words [overflow-wrap:anywhere] min-w-0">
              {title || 'Untitled Course'}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0 self-start sm:self-center">
          <button
            onClick={() => handleFinalSubmit('draft')}
            disabled={submitting}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            {submitting ? 'Saving...' : 'Save Draft'}
          </button>
        </div>
      </div>

      {/* Stepper Navigation */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between relative overflow-x-auto">
          {stepsList.map((st, idx) => {
            const isActive = currentStep === st.step;
            const isDone = currentStep > st.step;
            return (
              <div key={st.step} className="flex items-center space-x-2 flex-shrink-0 px-2">
                <button
                  onClick={() => {
                    if (st.step < currentStep || isDone) setCurrentStep(st.step);
                  }}
                  disabled={st.step > currentStep}
                  className={`flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : isDone
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-400 opacity-60'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                    isActive ? 'bg-white text-emerald-700' : isDone ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-600'
                  }`}>
                    {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : st.step}
                  </span>
                  <span className="whitespace-nowrap">{st.label}</span>
                </button>
                {idx < stepsList.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 1 — BASIC INFORMATION */}
      {currentStep === 1 && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-emerald-600" />
              Step 1: Basic Information
            </h2>
            <p className="text-xs text-slate-500">Provide the title, category, description, and thumbnail for this course.</p>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Course Title <span className="text-rose-500">*</span>
                </label>
                <span className={`text-[10px] ${title.length > 150 ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                  {title.length}/150 characters
                </span>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={150}
                placeholder="e.g. Master React 19 & Next.js Architecture"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:border-emerald-600 outline-none"
              />
              <div className="flex justify-between items-center mt-1">
                <span className="text-[10px] text-slate-400">Minimum 2 characters required</span>
                <span className="text-[10px] text-slate-400">{title.length}/150 characters</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Short Description
                </label>
                <span className={`text-[10px] ${description.length > 300 ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                  {description.length}/300 characters
                </span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={300}
                rows={3}
                placeholder="A concise overview of what learners will gain from this course..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:border-emerald-600 outline-none resize-none"
              />
              <div className="flex justify-end mt-1">
                <span className="text-[10px] text-slate-400">{description.length}/300 characters</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:border-emerald-600 outline-none cursor-pointer"
              >
                <option value="">-- Choose Category --</option>
                {categories.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Thumbnail Upload */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Course Thumbnail Image
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                {thumbnailUrl ? (
                  <img src={thumbnailUrl} alt="Thumbnail preview" className="w-28 h-20 rounded-xl object-cover border border-slate-200" />
                ) : (
                  <div className="w-28 h-20 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400 text-xs font-bold">
                    No Preview
                  </div>
                )}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors">
                      <Upload className="w-4 h-4 mr-1.5" />
                      {uploadingThumb ? 'Uploading...' : 'Upload Thumbnail Image'}
                      <input type="file" accept="image/*" onChange={handleThumbnailUpload} className="hidden" disabled={uploadingThumb} />
                    </label>

                    {thumbnailUrl && (
                      <button
                        type="button"
                        onClick={handleDeleteThumbnail}
                        disabled={uploadingThumb}
                        className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        Delete Image
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">Supports PNG, JPG, WEBP. Max file size 5MB.</p>
                </div>
              </div>
            </div>

            {/* Benefits Multi-Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Benefits of the Course <span className="text-[11px] font-normal text-slate-500">({benefits.length}/10)</span>
                </label>
                <span className="text-[10px] text-slate-400">Max 10 benefits</span>
              </div>
              <div className="flex items-center space-x-2 mb-1">
                <input
                  type="text"
                  value={benefitInput}
                  onChange={(e) => setBenefitInput(e.target.value)}
                  maxLength={150}
                  disabled={benefits.length >= 10}
                  placeholder={benefits.length >= 10 ? 'Maximum 10 benefits reached' : 'e.g. Learn modern React state management'}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddBenefit(); } }}
                  className="flex-1 px-4 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:border-emerald-600 outline-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={handleAddBenefit}
                  disabled={benefits.length >= 10 || !benefitInput.trim()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed whitespace-nowrap transition-colors"
                >
                  + Add Benefit
                </button>
              </div>

              <div className="flex items-center justify-between mb-3">
                {benefits.length >= 10 ? (
                  <span className="text-[11px] font-semibold text-amber-600 flex items-center">
                    <AlertCircle className="w-3.5 h-3.5 mr-1 inline shrink-0" /> Maximum 10 benefits allowed.
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">Add up to 10 key course learning outcomes</span>
                )}
                <span className={`text-[10px] ${benefitInput.length > 150 ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                  {benefitInput.length}/150 characters
                </span>
              </div>

              {benefits.length > 0 && (
                <div className="space-y-1.5">
                  {benefits.map((b, bIdx) => (
                    <div key={bIdx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs min-w-0 overflow-hidden">
                      <span className="font-semibold text-slate-800 break-words [overflow-wrap:anywhere] mr-2 line-clamp-2 min-w-0 flex-1" title={b}>
                        • {b}
                      </span>
                      <button
                        onClick={() => handleDeleteBenefit(bIdx)}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer shrink-0"
                        title="Delete Benefit"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 2 — COURSE BUILDER */}
      {currentStep === 2 && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center">
                <Layers className="w-5 h-5 mr-2 text-emerald-600" />
                Step 2: Course Builder
              </h2>
              <p className="text-xs text-slate-500">Structure your course into Sections and Add Video Lectures inside each section.</p>
            </div>
            <button
              onClick={openAddSectionModal}
              className="inline-flex items-center px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Section
            </button>
          </div>

          {sections.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <Layers className="w-10 h-10 text-emerald-600 mx-auto" />
              <h3 className="font-bold text-slate-900 text-sm">No Sections Added Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Click "+ Add Section" above to create module sections for your course.
              </p>
              <button
                onClick={openAddSectionModal}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
              >
                Add Section
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {sections.map((sec, sIdx) => (
                <div key={sIdx} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-slate-200 pb-3 gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start">
                        <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 font-extrabold text-xs flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                          {sIdx + 1}
                        </span>
                        <h3
                          className="font-bold text-slate-900 text-base break-words [overflow-wrap:anywhere] min-w-0 flex-1 line-clamp-2"
                          title={sec.title}
                        >
                          {sec.title}
                        </h3>
                      </div>
                      {sec.description && (
                        <p
                          className="text-xs text-slate-500 mt-1 ml-8 break-words [overflow-wrap:anywhere] line-clamp-3"
                          title={sec.description}
                        >
                          {sec.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center flex-wrap gap-2 flex-shrink-0 self-start sm:self-auto sm:ml-auto">
                      <button
                        type="button"
                        onClick={() => openAddLectureModal(sIdx)}
                        className="px-3 py-1.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 text-xs font-semibold hover:bg-teal-100 transition-colors cursor-pointer inline-flex items-center whitespace-nowrap shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Lecture
                      </button>
                      {!sec.quiz && (
                        <button
                          type="button"
                          onClick={() => openAddQuizModal(sIdx)}
                          className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold hover:bg-amber-100 transition-colors cursor-pointer inline-flex items-center whitespace-nowrap shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" /> Add Quiz
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openEditSectionModal(sIdx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 cursor-pointer shrink-0"
                        title="Edit Section"
                        aria-label="Edit Section"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSection(sIdx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer shrink-0"
                        title="Delete Section"
                        aria-label="Delete Section"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Lectures List */}
                  <div className="space-y-2 pl-4 border-l-2 border-slate-200">
                    {(!sec.lectures || sec.lectures.length === 0) ? (
                      <p className="text-xs text-slate-400 italic py-1">No lectures added to this section yet.</p>
                    ) : (
                      sec.lectures.map((lec, lIdx) => (
                        <div key={lIdx} className="p-3 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs overflow-hidden">
                          <div className="flex items-start space-x-3 min-w-0 flex-1">
                            <Video className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-slate-900 break-words [overflow-wrap:anywhere] line-clamp-2" title={lec.title}>
                                {lec.title}
                              </p>
                              {lec.description && (
                                <p className="text-[11px] text-slate-500 break-words [overflow-wrap:anywhere] line-clamp-3" title={lec.description}>
                                  {lec.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 flex-shrink-0 self-end sm:self-auto">
                            {lec.videoUrl && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold whitespace-nowrap">
                                Video Attached
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => openEditLectureModal(sIdx, lIdx)}
                              className="p-1 text-slate-400 hover:text-emerald-600 cursor-pointer"
                              title="Edit Lecture"
                              aria-label="Edit Lecture"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteLecture(sIdx, lIdx)}
                              className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                              title="Delete Lecture"
                              aria-label="Delete Lecture"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Section Quiz (Configured independently per section) */}
                  {sec.quiz && (
                    <div className="pt-2 pl-4 border-l-2 border-slate-200 dark:border-slate-700">
                      <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs overflow-hidden shadow-xs">
                        <div className="flex items-start space-x-3 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center flex-shrink-0 font-bold mt-0.5 border border-amber-200/60 dark:border-amber-700/50">
                            <HelpCircle className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-200 text-amber-900 dark:bg-amber-800/90 dark:text-amber-100 dark:border dark:border-amber-600/60 flex-shrink-0">
                                Section Quiz
                              </span>
                              <p
                                className="font-bold text-slate-900 dark:text-slate-100 text-sm break-words [overflow-wrap:anywhere] min-w-0 flex-1 line-clamp-2"
                                title={sec.quiz.title || `${sec.title} Quiz`}
                              >
                                {sec.quiz.title || `${sec.title} Quiz`}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                              <span>{sec.quiz.questions?.length || 0} Questions</span>
                              <span>•</span>
                              <span>{formatQuizDuration(sec.quiz.timeLimitMinutes)}</span>
                              <span>•</span>
                              <span>Pass: {sec.quiz.passingScorePercent || 70}%</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 flex-shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => openEditQuizModal(sIdx)}
                            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700/70 text-amber-800 dark:text-amber-300 font-semibold text-xs hover:bg-amber-50 dark:hover:bg-amber-950/50 cursor-pointer inline-flex items-center shadow-xs whitespace-nowrap transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit Quiz
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveSectionQuiz(sIdx)}
                            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 font-semibold text-xs hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer inline-flex items-center shadow-xs whitespace-nowrap transition-colors"
                            title="Remove Quiz"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STEP 3 — ASSIGNMENT & RESOURCES (OPTIONAL) */}
      {currentStep === 3 && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="border-b border-slate-200 pb-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center">
                <FileCheck2 className="w-5 h-5 mr-2 text-emerald-600" />
                Step 3: Assignment & Resources (Optional)
              </h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Optional Step
              </span>
            </div>
          </div>

          <div className="space-y-6">
            {/* Section A: Assignment */}
            <div className="space-y-4">
              <label className="flex items-center space-x-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addAssignmentEnabled}
                  onChange={(e) => setAddAssignmentEnabled(e.target.checked)}
                  className="w-5 h-5 text-emerald-600 rounded cursor-pointer"
                />
                <div>
                  <span className="font-bold text-slate-900 text-sm">Add Project Assignment</span>
                  <p className="text-xs text-slate-500">Require students to submit practical project work for review.</p>
                </div>
              </label>

              {addAssignmentEnabled && (
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">Assignment Title</label>
                      <span className={`text-[10px] ${assignmentTitle.length > 150 ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                        {assignmentTitle.length}/150 characters
                      </span>
                    </div>
                    <input
                      type="text"
                      value={assignmentTitle}
                      onChange={(e) => setAssignmentTitle(e.target.value)}
                      maxLength={150}
                      placeholder="e.g. Build a Full Stack React & Node Application"
                      className="w-full px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">Assignment Question / Instructions</label>
                      <span className={`text-[10px] ${assignmentInstructions.length > 2000 ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                        {assignmentInstructions.length}/2000 characters
                      </span>
                    </div>
                    <textarea
                      value={assignmentInstructions}
                      onChange={(e) => setAssignmentInstructions(e.target.value)}
                      maxLength={2000}
                      rows={5}
                      placeholder="Detailed project guidelines and requirements..."
                      className="w-full px-4 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none resize-none focus:border-emerald-600"
                    />
                  </div>

                  {/* Section: Upload Assignment PDF */}
                  <div className="pt-2 border-t border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700">
                        Assignment Document / Brief (Optional PDF)
                      </label>
                      <span className="text-[10px] text-slate-400 font-medium">Max 5 MB • PDF only</span>
                    </div>

                    {!assignmentPdf ? (
                      <div>
                        <label className={`cursor-pointer inline-flex items-center px-4 py-2.5 rounded-xl text-white font-semibold text-xs transition-colors shadow-xs ${
                          uploadingAssignmentPdf ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}>
                          {uploadingAssignmentPdf ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4 mr-2" />
                          )}
                          {uploadingAssignmentPdf ? 'Uploading PDF...' : 'Upload Assignment PDF'}
                          <input
                            type="file"
                            accept=".pdf,application/pdf"
                            onChange={handleAssignmentPdfUpload}
                            className="hidden"
                            disabled={uploadingAssignmentPdf}
                          />
                        </label>
                        <p className="text-[11px] text-slate-500 mt-1.5">
                          Attach an assignment brief, rubric, project specification, or case study (single PDF, up to 5 MB).
                        </p>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs shadow-2xs space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-slate-900 block truncate" title={assignmentPdf.fileName}>
                                {assignmentPdf.fileName}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5">
                                {assignmentPdf.fileSize ? (
                                  <span className="text-[10px] font-semibold text-slate-500">
                                    {formatFileSize(assignmentPdf.fileSize)}
                                  </span>
                                ) : null}
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  PDF Attached
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                            <button
                              type="button"
                              onClick={() => setPreviewDoc({
                                fileUrl: assignmentPdf.fileUrl,
                                fileName: assignmentPdf.fileName || 'Assignment_Brief.pdf',
                                fileType: 'pdf'
                              })}
                              className="inline-flex items-center px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
                              title="Preview Assignment PDF In-App"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" />
                              <span>View</span>
                            </button>

                            <label className="inline-flex items-center px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer">
                              <RefreshCw className="w-3.5 h-3.5 mr-1 text-slate-500" />
                              <span>Replace</span>
                              <input
                                type="file"
                                accept=".pdf,application/pdf"
                                onChange={handleAssignmentPdfUpload}
                                className="hidden"
                                disabled={uploadingAssignmentPdf}
                              />
                            </label>

                            <button
                              type="button"
                              onClick={handleRemoveAssignmentPdf}
                              className="inline-flex items-center px-2.5 py-1.5 rounded-lg border border-rose-200 hover:border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer"
                              title="Remove Attached PDF"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" />
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Section B: Resources */}
            <div className="space-y-4">
              <label className="flex items-center space-x-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addResourcesEnabled}
                  onChange={(e) => setAddResourcesEnabled(e.target.checked)}
                  className="w-5 h-5 text-teal-600 rounded cursor-pointer"
                />
                <div>
                  <span className="font-bold text-slate-900 text-sm">Add Downloadable PDF Resources</span>
                  <p className="text-xs text-slate-500">Attach course guides, cheat sheets, or reference documentation.</p>
                </div>
              </label>

              {addResourcesEnabled && (
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                  <div>
                    <label className="cursor-pointer inline-flex items-center px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition-colors shadow-xs">
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingPdf ? 'Uploading PDFs...' : 'Upload PDF Files'}
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        multiple
                        onChange={handlePdfUpload}
                        className="hidden"
                        disabled={uploadingPdf}
                      />
                    </label>
                  </div>

                  {resources.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-xs text-slate-700">Selected PDF Resources:</h4>
                      {resources.map((res, rIdx) => (
                        <div key={rIdx} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 text-xs">
                          <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            <span className="font-bold text-slate-900">{res.title}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => setPreviewDoc({
                                fileUrl: res.fileUrl,
                                fileName: res.title || 'Course_Resource.pdf',
                                fileType: 'pdf'
                              })}
                              className="p-1 rounded text-slate-400 hover:text-teal-600 transition-colors cursor-pointer"
                              title="Preview PDF Resource In-App"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteResource(rIdx)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Delete Resource"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 4 — FINAL REVIEW & PUBLISH */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center">
                  <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-600" />
                  Step 4: Final Review & Publish
                </h2>
                <p className="text-xs text-slate-500">Review your complete course configuration before saving as draft or publishing.</p>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-auto">
                <Sparkles className="w-3.5 h-3.5 mr-1" /> Ready for Review
              </span>
            </div>
          </div>

          {/* CARD 1: COURSE OVERVIEW */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center">
                <BookOpen className="w-4 h-4 mr-2 text-emerald-600" />
                1. Course Overview
              </h3>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 truncate max-w-[200px]" title={categories.find(c => String(c._id) === String(categoryId))?.name || 'Category'}>
                {categories.find(c => String(c._id) === String(categoryId))?.name || 'Category'}
              </span>
            </div>

            <div className="flex flex-col md:flex-row gap-5 items-start">
              {thumbnailUrl ? (
                <div className="w-full md:w-52 h-32 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
                  <img src={thumbnailUrl} alt={title} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-full md:w-52 h-32 rounded-xl border border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-400 text-xs flex-shrink-0">
                  <BookOpen className="w-8 h-8 mb-1 opacity-40 text-slate-400" />
                  <span>No Thumbnail Provided</span>
                </div>
              )}

              <div className="flex-1 space-y-2 min-w-0">
                <h4 className="text-base font-extrabold text-slate-900 break-words [overflow-wrap:anywhere] line-clamp-2" title={title}>
                  {title}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed break-words [overflow-wrap:anywhere] line-clamp-4" title={description}>
                  {description || 'No description provided.'}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800">
                  Course Benefits ({benefits.length}/10)
                </span>
              </div>
              {benefits.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {benefits.map((b, i) => (
                    <div
                      key={i}
                      className="flex items-start space-x-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 min-w-0 overflow-hidden"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span
                        className="break-words [overflow-wrap:anywhere] min-w-0 flex-1 line-clamp-2 leading-relaxed"
                        title={b}
                      >
                        {b}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No course benefits added.</p>
              )}
            </div>
          </div>

          {/* CARD 2: COURSE STRUCTURE */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center">
                <Layers className="w-4 h-4 mr-2 text-emerald-600" />
                2. Course Structure
              </h3>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 shrink-0">
                  {sections.length} {sections.length === 1 ? 'Section' : 'Sections'}
                </span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 shrink-0">
                  {sections.reduce((acc, s) => acc + (s.lectures?.length || 0), 0)} Lectures
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {sections.map((sec, sIdx) => (
                <div key={sIdx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-slate-200/70 pb-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start space-x-2">
                        <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 font-extrabold text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5">
                          {sIdx + 1}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm break-words [overflow-wrap:anywhere] line-clamp-2 min-w-0 flex-1" title={sec.title}>
                          {sec.title}
                        </h4>
                      </div>
                      {sec.description && (
                        <p className="text-xs text-slate-500 mt-1 ml-7 break-words [overflow-wrap:anywhere] line-clamp-3" title={sec.description}>
                          {sec.description}
                        </p>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap self-start sm:self-auto ml-7 sm:ml-0 shrink-0">
                      {sec.lectures?.length || 0} Lectures
                    </span>
                  </div>

                  {/* Lectures */}
                  <div className="space-y-2 ml-2 sm:ml-4">
                    {(!sec.lectures || sec.lectures.length === 0) ? (
                      <p className="text-xs text-slate-400 italic">No lectures in this section.</p>
                    ) : (
                      sec.lectures.map((lec, lIdx) => (
                        <div key={lIdx} className="p-2.5 rounded-lg bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs overflow-hidden">
                          <div className="flex items-start space-x-2.5 min-w-0 flex-1">
                            <Video className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-slate-800 break-words [overflow-wrap:anywhere] line-clamp-2" title={lec.title}>
                                {lec.title}
                              </p>
                              {lec.description && (
                                <p className="text-[11px] text-slate-500 line-clamp-2 break-words [overflow-wrap:anywhere]" title={lec.description}>
                                  {lec.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0 self-end sm:self-auto">
                            {lec.videoDuration > 0 && (
                              <span className="text-[10px] text-slate-500 font-mono shrink-0">
                                {formatVideoDuration(lec.videoDuration)}
                              </span>
                            )}
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap shrink-0">
                              Video Attached
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Section Quiz */}
                  {sec.quiz ? (
                    <div className="ml-2 sm:ml-4 p-3 rounded-lg bg-amber-50/70 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs overflow-hidden">
                      <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                        <HelpCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 break-words [overflow-wrap:anywhere] line-clamp-2" title={sec.quiz.title}>
                            {sec.quiz.title}
                          </p>
                          <p className="text-[11px] text-slate-600">
                            {sec.quiz.questions?.length || 0} Questions • {formatQuizDuration(sec.quiz.timeLimitMinutes)} • Passing Score: {sec.quiz.passingScorePercent || 70}%
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-200 text-amber-900 flex-shrink-0 self-start sm:self-auto">
                        Quiz Configured
                      </span>
                    </div>
                  ) : (
                    <div className="ml-2 sm:ml-4 text-[11px] text-slate-400 italic">
                      No section quiz configured.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* CARD 3: ASSIGNMENT DETAILS */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center">
                <FileCheck2 className="w-4 h-4 mr-2 text-emerald-600" />
                3. Assignment Details
              </h3>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${addAssignmentEnabled && (assignmentTitle.trim() || assignmentInstructions.trim() || assignmentPdf) ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                {addAssignmentEnabled && (assignmentTitle.trim() || assignmentInstructions.trim() || assignmentPdf) ? 'Included' : 'Not Included'}
              </span>
            </div>

            {addAssignmentEnabled && (assignmentTitle.trim() || assignmentInstructions.trim() || assignmentPdf) ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h4 className="font-bold text-slate-900 text-sm break-words [overflow-wrap:anywhere] line-clamp-2 min-w-0 flex-1" title={assignmentTitle || `${title} Project Assignment`}>
                    {assignmentTitle || `${title} Project Assignment`}
                  </h4>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap self-start sm:self-auto shrink-0">
                    URL / Link or File Submission
                  </span>
                </div>
                <div className="max-h-56 overflow-y-auto pr-1">
                  <p className="text-slate-600 leading-relaxed whitespace-pre-line break-words [overflow-wrap:anywhere]" title={assignmentInstructions}>
                    {assignmentInstructions || 'No additional instructions specified.'}
                  </p>
                </div>

                {assignmentPdf && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 text-xs">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-slate-900 truncate" title={assignmentPdf.fileName}>
                        Attached PDF: {assignmentPdf.fileName}
                      </span>
                      {assignmentPdf.fileSize ? (
                        <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                          ({formatFileSize(assignmentPdf.fileSize)})
                        </span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewDoc({
                        fileUrl: assignmentPdf.fileUrl,
                        fileName: assignmentPdf.fileName || 'Assignment_Brief.pdf',
                        fileType: 'pdf'
                      })}
                      className="ml-2 text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer shrink-0"
                    >
                      Preview
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>No Project Assignment Included</span>
              </div>
            )}
          </div>

          {/* CARD 4: COURSE RESOURCES */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center">
                <FileText className="w-4 h-4 mr-2 text-emerald-600" />
                4. Course Resources ({resources.length})
              </h3>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${addResourcesEnabled && resources.length > 0 ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-slate-100 text-slate-500'}`}>
                {addResourcesEnabled && resources.length > 0 ? `${resources.length} Attached` : 'None'}
              </span>
            </div>

            {addResourcesEnabled && resources.length > 0 ? (
              <div className="space-y-2">
                {resources.map((res, rIdx) => (
                  <div key={rIdx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs overflow-hidden">
                    <div className="flex items-center space-x-2.5 min-w-0 flex-1 mr-3">
                      <FileText className="w-4 h-4 text-teal-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 break-words [overflow-wrap:anywhere] truncate" title={res.title || 'Course Resource'}>
                          {res.title || 'Course Resource'}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 flex-shrink-0">
                        PDF
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewDoc({
                        fileUrl: res.fileUrl,
                        fileName: res.title || 'Course_Resource.pdf',
                        fileType: 'pdf'
                      })}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer flex items-center space-x-1 flex-shrink-0"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>No Downloadable Resources Attached</span>
              </div>
            )}
          </div>

          {/* CARD 5: PUBLISHING SUMMARY (DUPLICATE BUTTONS & TEXT REMOVED) */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-emerald-50/40 border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center">
                  <Sparkles className="w-4 h-4 mr-2 text-emerald-600" />
                  5. Publishing Summary
                </h3>
                <p className="text-xs text-slate-500">Review readiness before saving as draft or publishing.</p>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 self-start sm:self-auto shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                Ready to Publish
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-center">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Sections</span>
                <span className="text-xl font-extrabold text-slate-900">{sections.length}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-center">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Lectures</span>
                <span className="text-xl font-extrabold text-emerald-600">
                  {sections.reduce((acc, s) => acc + (s.lectures?.length || 0), 0)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-center">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Quizzes</span>
                <span className="text-xl font-extrabold text-amber-600">
                  {sections.filter(s => !!s.quiz).length}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-center">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Resources</span>
                <span className="text-xl font-extrabold text-teal-600">{resources.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Controls (Prev, Next, Save Draft, Publish) */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          onClick={handlePrevStep}
          disabled={currentStep === 1 || submitting}
          className="inline-flex items-center px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold disabled:opacity-40 cursor-pointer hover:bg-slate-50 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Previous Step
        </button>

        <div className="flex items-center space-x-3">
          {currentStep < 4 ? (
            <button
              onClick={handleNextStep}
              className="inline-flex items-center px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
            >
              Next Step <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleFinalSubmit('draft')}
                disabled={submitting}
                className="inline-flex items-center px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <Save className="w-4 h-4 mr-1.5 text-slate-500" />
                {submitting ? 'Saving...' : 'Save as Draft'}
              </button>
              <button
                type="button"
                onClick={() => handleFinalSubmit('published')}
                disabled={submitting}
                className="inline-flex items-center px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4 mr-1.5" />
                {submitting ? 'Saving Changes...' : (isEditMode ? 'Save Changes' : 'Publish Course')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SECTION MODAL */}
      <Modal
        isOpen={showSectionModal}
        onClose={() => setShowSectionModal(false)}
        title={editingSectionIdx !== null ? 'Edit Section' : 'Add Section Module'}
        closeOnBackdropClick={false}
      >
        <form onSubmit={handleSaveSection} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">Section Title *</label>
              <span className={`text-[10px] ${sectionTitle.length > 100 ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                {sectionTitle.length}/100 characters
              </span>
            </div>
            <input
              type="text"
              value={sectionTitle}
              onChange={(e) => setSectionTitle(e.target.value)}
              required
              maxLength={100}
              placeholder="e.g. Module 1: Introduction & Environment Setup"
              className="w-full px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">Optional Section Description</label>
              <span className={`text-[10px] ${sectionDesc.length > 500 ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                {sectionDesc.length}/500 characters
              </span>
            </div>
            <textarea
              value={sectionDesc}
              onChange={(e) => setSectionDesc(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Section goals and objectives..."
              className="w-full px-4 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none resize-none focus:border-emerald-600"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
            <button type="button" onClick={() => setShowSectionModal(false)} className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white cursor-pointer hover:bg-emerald-700">
              Save Section
            </button>
          </div>
        </form>
      </Modal>

      {/* LECTURE MODAL */}
      <Modal
        isOpen={showLectureModal}
        onClose={handleAttemptCloseLectureModal}
        title={editingLectureIdx !== null ? 'Edit Lecture' : 'Add Lecture Video'}
        closeOnBackdropClick={false}
      >
        <form onSubmit={handleSaveLecture} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">Lecture Title *</label>
              <span className={`text-[10px] ${lectureTitle.length > 120 ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                {lectureTitle.length}/120 characters
              </span>
            </div>
            <input
              type="text"
              value={lectureTitle}
              onChange={(e) => setLectureTitle(e.target.value)}
              required
              maxLength={120}
              placeholder="e.g. Lecture 1.1: What is React?"
              className="w-full px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">Lecture Description</label>
              <span className={`text-[10px] ${lectureDesc.length > 1000 ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                {lectureDesc.length}/1000 characters
              </span>
            </div>
            <textarea
              value={lectureDesc}
              onChange={(e) => setLectureDesc(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Lecture notes and summary..."
              className="w-full px-4 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none resize-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Lecture Video *</label>
            <div className="flex flex-wrap items-center gap-3">
              <label
                className={`inline-flex items-center px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-xs border-2 border-emerald-600 dark:border-emerald-500 ${
                  uploadingVideo
                    ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600 cursor-not-allowed'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/50 cursor-pointer'
                }`}
              >
                <Upload className="w-4 h-4 mr-1.5 text-emerald-600 dark:text-emerald-400" />
                {uploadingVideo ? `Uploading (${videoUploadProgress}%)...` : (lectureVideoUrl ? 'Replace Video' : 'Upload Video File')}
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  className="hidden"
                  disabled={uploadingVideo}
                />
              </label>

              {lectureVideoUrl && !uploadingVideo && (
                <div className="flex items-center space-x-2">
                  <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{videoUploadState === 'success' ? 'Upload Complete' : 'Video Attached'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteLectureVideo}
                    className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Delete Video
                  </button>
                </div>
              )}
            </div>

            {/* Actual Linear Progress Bar during upload */}
            {uploadingVideo && (
              <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 flex items-center">
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600 animate-spin" />
                    Uploading Video File...
                  </span>
                  <span className="font-bold text-emerald-600 font-mono">
                    Uploading {videoUploadProgress}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all duration-150 ease-out"
                    style={{ width: `${videoUploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Upload Error Banner if upload fails */}
            {!uploadingVideo && videoUploadError && (
              <div className="mt-2 text-xs text-rose-600 flex items-center font-medium bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                <AlertCircle className="w-4 h-4 mr-1.5 shrink-0 text-rose-500" />
                <span>{videoUploadError}</span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleAttemptCloseLectureModal}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploadingVideo || !lectureVideoUrl || !lectureTitle.trim()}
              className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition-colors shadow-xs ${
                uploadingVideo || !lectureVideoUrl || !lectureTitle.trim()
                  ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
              }`}
            >
              {uploadingVideo ? (
                <span className="inline-flex items-center">
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Uploading ({videoUploadProgress}%)...
                </span>
              ) : (
                'Save Lecture'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* CANCEL UPLOAD CONFIRMATION MODAL */}
      <ConfirmationModal
        isOpen={showCancelUploadConfirm}
        onClose={() => setShowCancelUploadConfirm(false)}
        onConfirm={handleConfirmCancelUpload}
        title="Cancel Video Upload?"
        message="Video upload is in progress. Leaving now will cancel the upload. Are you sure?"
        confirmText="Yes, Cancel Upload"
        cancelText="Stay / Continue Upload"
        variant="warning"
        closeOnBackdropClick={false}
      />

      {/* SECTION QUIZ MODAL */}
      <Modal
        isOpen={showQuizModal}
        onClose={() => setShowQuizModal(false)}
        title={targetSectionIdx !== null && sections[targetSectionIdx]?.quiz ? `Edit Quiz — ${sections[targetSectionIdx]?.title}` : `Add Quiz — ${sections[targetSectionIdx]?.title || 'Section'}`}
        maxWidth="max-w-2xl"
        contentClassName="flex-1 flex flex-col min-h-0 overflow-hidden p-0 text-slate-800 dark:text-slate-200"
        closeOnBackdropClick={false}
      >
        <form onSubmit={handleSaveSectionQuiz} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Quiz Title <span className="text-rose-500">*</span>
                </label>
                <span className={`text-[10px] ${quizTitle.length > 120 ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                  {quizTitle.length}/120 characters
                </span>
              </div>
              <input
                type="text"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                required
                maxLength={120}
                placeholder="e.g. Section Assessment Quiz"
                className="w-full px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Duration (Minutes) <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400">1 to 600 Mins (Max 10 hrs)</span>
              </div>
              <input
                type="number"
                min={1}
                max={600}
                step={1}
                value={quizDurationMinutes}
                onKeyDown={(e) => {
                  if (['e', 'E', '+', '-', '.'].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                onPaste={(e) => {
                  const paste = e.clipboardData.getData('text');
                  if (/[eE+\-.]/.test(paste)) {
                    e.preventDefault();
                    const sanitized = paste.replace(/[^0-9]/g, '');
                    if (sanitized) {
                      setQuizDurationMinutes(sanitized);
                      setQuizDurationError(validateQuizDuration(sanitized) || '');
                    }
                  }
                }}
                onChange={(e) => {
                  const val = e.target.value;
                  setQuizDurationMinutes(val);
                  setQuizDurationError(validateQuizDuration(val) || '');
                }}
                className={`w-full px-4 py-2 rounded-xl border text-xs text-slate-900 outline-none transition-all ${
                  quizDurationError
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                    : 'border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'
                }`}
              />
              {quizDurationError && (
                <p className="text-xs text-rose-600 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                  {quizDurationError}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Passing Score (%) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                value={quizPassingScorePercent}
                onChange={(e) => {
                  const val = e.target.value;
                  setQuizPassingScoreError('');
                  if (val === '') {
                    setQuizPassingScorePercent('');
                    return;
                  }
                  const sanitized = val.replace(/[^0-9]/g, '');
                  if (sanitized === '') {
                    setQuizPassingScorePercent('');
                    return;
                  }
                  const num = parseInt(sanitized, 10);
                  if (num > 100) {
                    setQuizPassingScorePercent(100);
                  } else {
                    setQuizPassingScorePercent(sanitized);
                  }
                }}
                min={1}
                max={100}
                placeholder="e.g. 70"
                className={`w-full px-4 py-2 rounded-xl border text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 outline-none transition-all ${
                  quizPassingScoreError
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                    : 'border-slate-300 dark:border-slate-700 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'
                }`}
              />
              {quizPassingScoreError && (
                <p className="text-xs text-rose-600 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                  {quizPassingScoreError}
                </p>
              )}
            </div>
          </div>

          {/* Question Builder */}
          <div className="space-y-4 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Questions ({quizQuestions.length})
              </h4>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-3 py-1 rounded-xl bg-amber-50 text-amber-700 font-semibold text-xs hover:bg-amber-100 border border-amber-200 cursor-pointer inline-flex items-center"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Question
              </button>
            </div>

            {quizQuestions.map((q, qIdx) => {
              const currentType = q.questionType || (q.options?.length > 0 ? 'MCQ' : 'FILL_IN_BLANK');

              return (
                <div key={qIdx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-amber-700">Question #{qIdx + 1}</span>
                    <div className="flex items-center space-x-2">
                      <select
                        value={currentType}
                        onChange={(e) => {
                          const newType = e.target.value;
                          const updated = [...quizQuestions];
                          updated[qIdx].questionType = newType;
                          if (newType === 'ONE_WORD') {
                            updated[qIdx].options = Array.isArray(updated[qIdx].options) ? updated[qIdx].options.filter(Boolean) : [];
                            updated[qIdx].correctAnswerIndex = null;
                            updated[qIdx].correctAnswerIndices = [];
                            if (!updated[qIdx].score) updated[qIdx].score = 1;
                          } else if (newType === 'TRUE_FALSE') {
                            updated[qIdx].options = ['True', 'False'];
                            updated[qIdx].correctAnswerIndex = 0;
                            updated[qIdx].correctAnswerIndices = [0];
                            updated[qIdx].correctAnswerText = 'True';
                          } else if (newType === 'FILL_IN_BLANK') {
                            updated[qIdx].options = [];
                            updated[qIdx].correctAnswerIndex = null;
                            updated[qIdx].correctAnswerIndices = [];
                            updated[qIdx].correctAnswerText = '';
                          } else if (newType === 'MSQ') {
                            if (!updated[qIdx].options || updated[qIdx].options.length < 2) {
                              updated[qIdx].options = ['', '', '', ''];
                            }
                            const existing = (updated[qIdx].correctAnswerIndices && updated[qIdx].correctAnswerIndices.length > 0)
                              ? updated[qIdx].correctAnswerIndices
                              : (updated[qIdx].correctAnswerIndex !== null && updated[qIdx].correctAnswerIndex !== undefined ? [updated[qIdx].correctAnswerIndex] : [0]);
                            updated[qIdx].correctAnswerIndices = existing;
                            updated[qIdx].correctAnswerIndex = existing[0] ?? 0;
                            updated[qIdx].correctAnswerText = existing.map(i => updated[qIdx].options[i]).filter(Boolean).join(', ');
                          } else {
                            if (!updated[qIdx].options || updated[qIdx].options.length < 2) {
                              updated[qIdx].options = ['', '', '', ''];
                            }
                            const firstIdx = updated[qIdx].correctAnswerIndices?.[0] ?? updated[qIdx].correctAnswerIndex ?? 0;
                            updated[qIdx].correctAnswerIndex = firstIdx;
                            updated[qIdx].correctAnswerIndices = [firstIdx];
                            updated[qIdx].correctAnswerText = updated[qIdx].options[firstIdx] || '';
                          }
                          setQuizQuestions(updated);
                        }}
                        className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-700 outline-none cursor-pointer"
                      >
                        <option value="MCQ">Multiple Choice (Single Answer)</option>
                        <option value="MSQ">Multiple Select (Checkboxes)</option>
                        <option value="TRUE_FALSE">True / False</option>
                        <option value="FILL_IN_BLANK">Fill in the Blank</option>
                        <option value="ONE_WORD">One-Word Answer</option>
                      </select>

                      {quizQuestions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(qIdx)}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                          title="Delete Question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Question Text <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-slate-400">{(q.questionText || '').length}/500</span>
                    </div>
                    <textarea
                      rows={2}
                      maxLength={500}
                      value={q.questionText}
                      onInput={(e) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = `${e.target.scrollHeight}px`;
                      }}
                      onChange={(e) => {
                        const updated = [...quizQuestions];
                        updated[qIdx].questionText = e.target.value;
                        setQuizQuestions(updated);
                      }}
                      required
                      placeholder="Enter the question text..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600 resize-y min-h-[56px] leading-relaxed break-words"
                    />
                  </div>

                  {/* MCQ Options Rendering */}
                  {currentType === 'MCQ' && (
                    <div className="space-y-2">
                      <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Options (select radio for correct answer):
                      </span>
                      {(q.options || ['', '', '', '']).map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-start space-x-2.5 bg-white p-2.5 rounded-lg border border-slate-200">
                          <input
                            type="radio"
                            name={`correct_opt_${qIdx}`}
                            checked={Number(q.correctAnswerIndex) === optIdx}
                            onChange={() => {
                              const updated = [...quizQuestions];
                              updated[qIdx].correctAnswerIndex = optIdx;
                              updated[qIdx].correctAnswerIndices = [optIdx];
                              updated[qIdx].correctAnswerText = opt;
                              setQuizQuestions(updated);
                            }}
                            className="text-amber-600 cursor-pointer mt-2 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0 flex flex-col">
                            <textarea
                              rows={1}
                              maxLength={200}
                              value={opt}
                              onInput={(e) => {
                                e.target.style.height = 'auto';
                                e.target.style.height = `${e.target.scrollHeight}px`;
                              }}
                              onChange={(e) => {
                                const updated = [...quizQuestions];
                                if (!updated[qIdx].options) updated[qIdx].options = ['', '', '', ''];
                                updated[qIdx].options[optIdx] = e.target.value;
                                if (Number(updated[qIdx].correctAnswerIndex) === optIdx) {
                                  updated[qIdx].correctAnswerText = e.target.value;
                                }
                                setQuizQuestions(updated);
                              }}
                              placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                              className="w-full bg-transparent border-none text-xs text-slate-900 outline-none focus:ring-0 resize-y min-h-[32px] leading-relaxed break-words p-0"
                            />
                            <div className="flex justify-end pt-0.5">
                              <span className="text-[9px] text-slate-400">{(opt || '').length}/200</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* MSQ Options Rendering (Checkboxes) */}
                  {currentType === 'MSQ' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Options (Select checkboxes for all correct answers):
                        </span>
                        <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {(q.correctAnswerIndices || []).length} Correct Selected
                        </span>
                      </div>
                      {(q.options || ['', '', '', '']).map((opt, optIdx) => {
                        const isChecked = (q.correctAnswerIndices || []).includes(optIdx);
                        return (
                          <div key={optIdx} className="flex items-start space-x-2.5 bg-white p-2.5 rounded-lg border border-slate-200">
                            <input
                              type="checkbox"
                              name={`correct_msq_${qIdx}_${optIdx}`}
                              checked={isChecked}
                              onChange={() => {
                                const updated = [...quizQuestions];
                                const currentIndices = updated[qIdx].correctAnswerIndices || [];
                                let nextIndices;
                                if (currentIndices.includes(optIdx)) {
                                  nextIndices = currentIndices.filter(i => i !== optIdx);
                                } else {
                                  nextIndices = [...currentIndices, optIdx].sort((a, b) => a - b);
                                }
                                updated[qIdx].correctAnswerIndices = nextIndices;
                                updated[qIdx].correctAnswerIndex = nextIndices.length > 0 ? nextIndices[0] : null;
                                updated[qIdx].correctAnswerText = nextIndices.map(i => updated[qIdx].options[i]).filter(Boolean).join(', ');
                                setQuizQuestions(updated);
                              }}
                              className="text-emerald-600 rounded cursor-pointer mt-2 flex-shrink-0 w-4 h-4 accent-emerald-600"
                            />
                            <div className="flex-1 min-w-0 flex flex-col">
                              <textarea
                                rows={1}
                                maxLength={200}
                                value={opt}
                                onInput={(e) => {
                                  e.target.style.height = 'auto';
                                  e.target.style.height = `${e.target.scrollHeight}px`;
                                }}
                                onChange={(e) => {
                                  const updated = [...quizQuestions];
                                  if (!updated[qIdx].options) updated[qIdx].options = ['', '', '', ''];
                                  updated[qIdx].options[optIdx] = e.target.value;
                                  updated[qIdx].correctAnswerText = (updated[qIdx].correctAnswerIndices || [])
                                    .map(i => updated[qIdx].options[i])
                                    .filter(Boolean)
                                    .join(', ');
                                  setQuizQuestions(updated);
                                }}
                                placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                                className="w-full bg-transparent border-none text-xs text-slate-900 outline-none focus:ring-0 resize-y min-h-[32px] leading-relaxed break-words p-0"
                              />
                              <div className="flex justify-end pt-0.5">
                                <span className="text-[9px] text-slate-400">{(opt || '').length}/200</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* True / False Field Rendering */}
                  {currentType === 'TRUE_FALSE' && (
                    <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-2">
                      <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Select Correct Answer:</span>
                      <div className="flex space-x-4">
                        <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name={`tf_correct_${qIdx}`}
                            checked={Number(q.correctAnswerIndex) === 0}
                            onChange={() => {
                              const updated = [...quizQuestions];
                              updated[qIdx].correctAnswerIndex = 0;
                              updated[qIdx].correctAnswerText = 'True';
                              setQuizQuestions(updated);
                            }}
                            className="text-amber-600 cursor-pointer"
                          />
                          <span>True</span>
                        </label>
                        <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name={`tf_correct_${qIdx}`}
                            checked={Number(q.correctAnswerIndex) === 1}
                            onChange={() => {
                              const updated = [...quizQuestions];
                              updated[qIdx].correctAnswerIndex = 1;
                              updated[qIdx].correctAnswerText = 'False';
                              setQuizQuestions(updated);
                            }}
                            className="text-amber-600 cursor-pointer"
                          />
                          <span>False</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Fill in the Blank Field Rendering */}
                  {currentType === 'FILL_IN_BLANK' && (
                    <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Correct Answer Text:</label>
                        <span className="text-[10px] text-slate-400">{(q.correctAnswerText || '').length}/200</span>
                      </div>
                      <textarea
                        rows={1}
                        maxLength={200}
                        value={q.correctAnswerText || ''}
                        onInput={(e) => {
                          e.target.style.height = 'auto';
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        onChange={(e) => {
                          const updated = [...quizQuestions];
                          updated[qIdx].correctAnswerText = e.target.value;
                          setQuizQuestions(updated);
                        }}
                        placeholder="Enter expected correct text (evaluation is case-insensitive)..."
                        className="w-full px-3 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600 resize-y min-h-[36px] leading-relaxed break-words"
                      />
                    </div>
                  )}

                  {/* One-Word Answer Field Rendering */}
                  {currentType === 'ONE_WORD' && (
                    <div className="space-y-3 p-3.5 rounded-lg bg-white border border-slate-200">
                      {/* Expected Answer (Required) */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                            Expected Answer <span className="text-rose-500">*</span>
                          </label>
                          <span className="text-[10px] text-slate-400 font-mono">{(q.correctAnswerText || '').length}/100</span>
                        </div>
                        <input
                          type="text"
                          maxLength={100}
                          value={q.correctAnswerText || ''}
                          onChange={(e) => {
                            const updated = [...quizQuestions];
                            updated[qIdx].correctAnswerText = e.target.value.slice(0, 100);
                            setQuizQuestions(updated);
                          }}
                          placeholder="Enter primary expected answer (e.g. Mitochondria)"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          Answer evaluation is automatically case-insensitive and trims leading, trailing, and internal multiple spaces.
                        </p>
                      </div>

                      {/* Additional Accepted Answers (Optional Variations, Max 5) */}
                      <div className="space-y-2 pt-1 border-t border-slate-100">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center space-x-2">
                            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                              Additional Accepted Answers <span className="text-slate-400 font-normal lowercase">(optional variations)</span>
                            </label>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({(q.options || []).length}/5)
                            </span>
                          </div>

                          {(q.options || []).length < 5 ? (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...quizQuestions];
                                if (!Array.isArray(updated[qIdx].options)) updated[qIdx].options = [];
                                if (updated[qIdx].options.length < 5) {
                                  updated[qIdx].options.push('');
                                  setQuizQuestions(updated);
                                }
                              }}
                              className="inline-flex items-center text-[11px] font-bold text-amber-600 hover:text-amber-700 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5 mr-1" /> Add Accepted Variation
                            </button>
                          ) : (
                            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                              Maximum 5 additional accepted answers allowed.
                            </span>
                          )}
                        </div>

                        {(q.options || []).length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic">
                            No variations added. Only the primary expected answer will be accepted.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {(q.options || []).map((variation, varIdx) => (
                              <div key={varIdx} className="flex items-center space-x-2">
                                <div className="flex-1 relative flex items-center">
                                  <input
                                    type="text"
                                    maxLength={100}
                                    value={variation}
                                    onChange={(e) => {
                                      const updated = [...quizQuestions];
                                      updated[qIdx].options[varIdx] = e.target.value.slice(0, 100);
                                      setQuizQuestions(updated);
                                    }}
                                    placeholder={`Accepted variation #${varIdx + 1} (e.g. Mitochondrion)`}
                                    className="w-full px-3 py-1.5 pr-14 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20"
                                  />
                                  <span className="absolute right-2.5 text-[10px] text-slate-400 pointer-events-none font-mono">
                                    {(variation || '').length}/100
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...quizQuestions];
                                    updated[qIdx].options = updated[qIdx].options.filter((_, i) => i !== varIdx);
                                    setQuizQuestions(updated);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Remove Variation"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          </div>

          {/* Fixed Footer Action Buttons */}
          <div className="flex-shrink-0 px-4 sm:px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowQuizModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 text-white cursor-pointer hover:bg-amber-700 transition-colors shadow-xs"
            >
              Save Section Quiz
            </button>
          </div>
        </form>
      </Modal>

      {/* REUSABLE CUSTOM CONFIRMATION MODAL */}
      <ConfirmationModal
        isOpen={confirmDialog.isOpen}
        onClose={closeConfirmDialog}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
      />

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
