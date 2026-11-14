import React, { useEffect, useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import {
  getOrgCertificates,
  getCertificateTemplate,
  updateCertificateTemplate,
  resetCertificateTemplate,
  getBackfillEligible,
  backfillCertificates,
  uploadImage,
  deleteMedia
} from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { Pagination } from '../../components/common/Pagination';
import { useNotification } from '../../context/NotificationContext';
import { validateImageFile } from '../../utils/fileValidation';
import { useAuth } from '../../context/AuthContext';
import { CertificateCanvas, exportCertificatePNG, exportCertificatePDF } from '../../components/common/CertificateCanvas';
import { AdvancedCertificateEditor } from '../../components/admin/certificateDesigner/AdvancedCertificateEditor';
import { TEMPLATE_PRESETS, BLANK_CANVAS_DESIGN } from '../../components/admin/certificateDesigner/designerConstants';
import { formatDate } from '../../utils/formatters';
import {
  Award,
  Search,
  Download,
  Eye,
  X,
  Palette,
  RotateCcw,
  Save,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  FileText,
  Upload,
  Trash2,
  Image as ImageIcon,
  FileSignature,
  Sliders,
  CheckCircle2,
  Loader2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Users,
  Calendar,
  Filter,
  Building2,
  User
} from 'lucide-react';
import { processTransparentSignature } from '../../utils/signatureProcessor';

export const AdminCertificates = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('issued'); // 'issued' | 'designer'
  const [designerSubTab, setDesignerSubTab] = useState('assets'); // 'assets' | 'styling'
  const [loading, setLoading] = useState(true);
  const { addToast } = useNotification();

  // Issued Certificates State
  const [certificates, setCertificates] = useState([]);
  const [selectedCert, setSelectedCert] = useState(null);

  // Level 1: Course Listing Filters & Pagination
  const [courseSearch, setCourseSearch] = useState('');
  const [courseCountFilter, setCourseCountFilter] = useState('all'); // 'all' | '1-5' | '6-15' | '16+'
  const [courseSortBy, setCourseSortBy] = useState('most_certs'); // 'most_certs' | 'least_certs' | 'title_asc' | 'recent'
  const [coursePage, setCoursePage] = useState(1);
  const COURSES_PER_PAGE = 10;

  // Level 2: Selected Course & Certificate Holders Filters & Pagination
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [learnerSearch, setLearnerSearch] = useState('');
  const [certIdSearch, setCertIdSearch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | '7d' | '30d' | '90d' | '1y'
  const [certPage, setCertPage] = useState(1);
  const CERTS_PER_PAGE = 10;

  // Group all issued certificates by course/training
  const courseGroups = useMemo(() => {
    if (!Array.isArray(certificates) || certificates.length === 0) return [];

    const map = new Map();
    certificates.forEach((cert) => {
      const courseId = cert.training?.id || cert.trainingId || cert.training?.title || 'unknown';
      const courseTitle = cert.training?.title || 'Untitled Course';

      if (!map.has(courseId)) {
        map.set(courseId, {
          courseId,
          courseTitle,
          thumbnailUrl: cert.training?.thumbnailUrl || null,
          categoryName: cert.training?.category?.name || cert.training?.categoryId?.name || null,
          certificates: [],
          lastIssuedDate: cert.completionDate
        });
      }

      const group = map.get(courseId);
      group.certificates.push(cert);
      if (new Date(cert.completionDate) > new Date(group.lastIssuedDate)) {
        group.lastIssuedDate = cert.completionDate;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.certificates.length - a.certificates.length);
  }, [certificates]);

  // Filtered and sorted courses for Level 1 (Course Listing)
  const filteredCourseGroups = useMemo(() => {
    let result = [...courseGroups];

    // Search by course / training title
    if (courseSearch.trim()) {
      const q = courseSearch.toLowerCase().trim();
      result = result.filter(
        (cg) =>
          cg.courseTitle.toLowerCase().includes(q) ||
          cg.categoryName?.toLowerCase().includes(q)
      );
    }

    // Certificate count filter
    if (courseCountFilter === '1-5') {
      result = result.filter((cg) => cg.certificates.length >= 1 && cg.certificates.length <= 5);
    } else if (courseCountFilter === '6-15') {
      result = result.filter((cg) => cg.certificates.length >= 6 && cg.certificates.length <= 15);
    } else if (courseCountFilter === '16+') {
      result = result.filter((cg) => cg.certificates.length >= 16);
    }

    // Sort options
    if (courseSortBy === 'most_certs') {
      result.sort((a, b) => b.certificates.length - a.certificates.length);
    } else if (courseSortBy === 'least_certs') {
      result.sort((a, b) => a.certificates.length - b.certificates.length);
    } else if (courseSortBy === 'title_asc') {
      result.sort((a, b) => a.courseTitle.localeCompare(b.courseTitle));
    } else if (courseSortBy === 'recent') {
      result.sort((a, b) => new Date(b.lastIssuedDate) - new Date(a.lastIssuedDate));
    }

    return result;
  }, [courseGroups, courseSearch, courseCountFilter, courseSortBy]);

  const totalCoursePages = Math.max(1, Math.ceil(filteredCourseGroups.length / COURSES_PER_PAGE));
  const paginatedCourseGroups = useMemo(() => {
    const start = (coursePage - 1) * COURSES_PER_PAGE;
    return filteredCourseGroups.slice(start, start + COURSES_PER_PAGE);
  }, [filteredCourseGroups, coursePage]);

  const hasCourseFilters = Boolean(
    courseSearch.trim() || courseCountFilter !== 'all' || courseSortBy !== 'most_certs'
  );

  const handleResetCourseFilters = () => {
    setCourseSearch('');
    setCourseCountFilter('all');
    setCourseSortBy('most_certs');
    setCoursePage(1);
  };

  // Selected course group for Level 2 (Certificate Holders)
  const selectedCourseGroup = useMemo(() => {
    if (!selectedCourseId) return null;
    return courseGroups.find((cg) => cg.courseId === selectedCourseId) || null;
  }, [courseGroups, selectedCourseId]);

  // Unique departments for the selected course
  const courseDepartments = useMemo(() => {
    if (!selectedCourseGroup) return [];
    const depts = new Set();
    selectedCourseGroup.certificates.forEach((c) => {
      const d = c.employee?.department?.name;
      if (d) depts.add(d);
    });
    return Array.from(depts).sort();
  }, [selectedCourseGroup]);

  // Filtered certificate holders for Level 2
  const filteredCertificates = useMemo(() => {
    if (!selectedCourseGroup) return [];
    let list = [...selectedCourseGroup.certificates];

    // Search by learner name / email
    if (learnerSearch.trim()) {
      const q = learnerSearch.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.employee?.name?.toLowerCase().includes(q) ||
          c.employee?.email?.toLowerCase().includes(q)
      );
    }

    // Search by Certificate ID
    if (certIdSearch.trim()) {
      const q = certIdSearch.toLowerCase().trim();
      list = list.filter((c) => c.certificateId?.toLowerCase().includes(q));
    }

    // Group / Department filter
    if (selectedDepartment !== 'all') {
      list = list.filter((c) => (c.employee?.department?.name || 'N/A') === selectedDepartment);
    }

    // Completion date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      let cutoff = new Date();
      if (dateFilter === '7d') cutoff.setDate(now.getDate() - 7);
      else if (dateFilter === '30d') cutoff.setDate(now.getDate() - 30);
      else if (dateFilter === '90d') cutoff.setDate(now.getDate() - 90);
      else if (dateFilter === '1y') cutoff.setFullYear(now.getFullYear() - 1);

      list = list.filter((c) => new Date(c.completionDate) >= cutoff);
    }

    return list;
  }, [selectedCourseGroup, learnerSearch, certIdSearch, selectedDepartment, dateFilter]);

  const totalCertPages = Math.max(1, Math.ceil(filteredCertificates.length / CERTS_PER_PAGE));
  const paginatedCertificates = useMemo(() => {
    const start = (certPage - 1) * CERTS_PER_PAGE;
    return filteredCertificates.slice(start, start + CERTS_PER_PAGE);
  }, [filteredCertificates, certPage]);

  const hasCertFilters = Boolean(
    learnerSearch.trim() || certIdSearch.trim() || selectedDepartment !== 'all' || dateFilter !== 'all'
  );

  const handleResetCertFilters = () => {
    setLearnerSearch('');
    setCertIdSearch('');
    setSelectedDepartment('all');
    setDateFilter('all');
    setCertPage(1);
  };

  const handleSelectCourse = (courseId) => {
    setSelectedCourseId(courseId);
    setLearnerSearch('');
    setCertIdSearch('');
    setSelectedDepartment('all');
    setDateFilter('all');
    setCertPage(1);
  };

  const handleBackToCourses = () => {
    setSelectedCourseId(null);
    setLearnerSearch('');
    setCertIdSearch('');
    setSelectedDepartment('all');
    setDateFilter('all');
    setCertPage(1);
  };

  const handleViewCert = (cert) => {
    setSelectedCert(cert);
  };

  const handleDownloadPNG = (cert) => {
    setSelectedCert(cert);
    setTimeout(() => {
      exportCertificatePNG(`admin_cert_${cert.id}`, `Certificate_${cert.certificateId}.png`);
    }, 150);
  };

  const handleDownloadPDF = (cert) => {
    setSelectedCert(cert);
    setTimeout(() => {
      exportCertificatePDF(`admin_cert_${cert.id}`, `Certificate_${cert.certificateId}.pdf`);
    }, 150);
  };

  // Template Designer State
  const [template, setTemplate] = useState({
    title: 'CERTIFICATE OF COMPLETION',
    primaryColor: '#1E3A8A',
    accentColor: '#D97706',
    fontFamily: 'Inter',
    borderStyle: 'classic_gold',
    layoutStyle: 'centered',
    logoUrl: '',
    logoPublicId: '',
    logoPosition: 'center',
    logoWidth: 130,
    signatureUrl: '',
    signaturePublicId: '',
    signatureName: ''
  });
  const [designerMode, setDesignerMode] = useState('editor'); // 'select' | 'editor'
  const [selectedTemplateForEditor, setSelectedTemplateForEditor] = useState(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);

  // Backfill State
  const [backfillCount, setBackfillCount] = useState(0);
  const [runningBackfill, setRunningBackfill] = useState(false);

  // Custom Confirmation Modal for Certificate Image Deletion
  const [deleteImageModal, setDeleteImageModal] = useState({
    isOpen: false,
    imageType: null, // 'logo' | 'signature'
    title: '',
    message: '',
    loading: false
  });
  const [showResetTemplateModal, setShowResetTemplateModal] = useState(false);

  const fetchCertificatesData = async () => {
    try {
      const [certRes, tplRes, backfillRes] = await Promise.all([
        getOrgCertificates(),
        getCertificateTemplate(),
        getBackfillEligible()
      ]);
      setCertificates(certRes.data.data.certificates || []);
      if (tplRes.data.data.template) {
        setTemplate(prev => ({
          ...prev,
          ...tplRes.data.data.template
        }));
      }
      setBackfillCount(backfillRes.data.data.count || 0);
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to load certification data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificatesData();
  }, []);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('error', 'Please select a valid image file (PNG, JPG, SVG, WebP)');
      e.target.value = '';
      return;
    }

    const validation = validateImageFile(file);
    if (!validation.valid) {
      addToast('error', validation.error);
      e.target.value = '';
      return;
    }

    setUploadingLogo(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await uploadImage(formData);
      const { url, publicId } = res.data.data;

      const oldPublicId = template.logoPublicId;
      setTemplate(prev => ({ ...prev, logoUrl: url, logoPublicId: publicId }));
      addToast('success', 'Organization logo uploaded successfully!');

      if (oldPublicId && oldPublicId !== publicId) {
        deleteMedia(oldPublicId, 'image').catch(err => console.warn('Failed to delete old logo asset:', err));
      }
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to upload logo image');
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  const handleLogoDelete = () => {
    setDeleteImageModal({
      isOpen: true,
      imageType: 'logo',
      title: 'Delete Organization Logo',
      message: 'Are you sure you want to delete this certificate logo image? This action will remove the logo from the certificate template.',
      loading: false
    });
  };

  const handleSignatureUpload = async (e) => {
    const originalFile = e.target.files?.[0];
    if (!originalFile) return;

    if (!originalFile.type.startsWith('image/')) {
      addToast('error', 'Please select a valid image file (PNG, JPG, SVG, WebP)');
      e.target.value = '';
      return;
    }

    const validation = validateImageFile(originalFile);
    if (!validation.valid) {
      addToast('error', validation.error);
      e.target.value = '';
      return;
    }

    setUploadingSignature(true);

    try {
      // Process client-side transparent background removal
      const fileToUpload = await processTransparentSignature(originalFile);

      const formData = new FormData();
      formData.append('file', fileToUpload);

      const res = await uploadImage(formData);
      const url = res.data.data.url;
      const publicId = res.data.data.publicId || res.data.data.public_id || url;

      const oldTarget = template.signaturePublicId || template.signatureUrl;
      setTemplate(prev => ({ ...prev, signatureUrl: url, signaturePublicId: publicId }));
      addToast('success', 'Transparent signature image uploaded successfully!');

      if (oldTarget && oldTarget !== publicId) {
        deleteMedia(oldTarget, 'image').catch(err => console.warn('Failed to delete old signature asset:', err));
      }
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to upload signature image');
    } finally {
      setUploadingSignature(false);
      e.target.value = '';
    }
  };

  const handleSignatureDelete = () => {
    setDeleteImageModal({
      isOpen: true,
      imageType: 'signature',
      title: 'Delete Signature Image',
      message: 'Are you sure you want to delete this authorized signature image? This action will remove the signature from the certificate template.',
      loading: false
    });
  };

  const handleConfirmDeleteImage = async () => {
    const isLogo = deleteImageModal.imageType === 'logo';
    const target = isLogo
      ? (template.logoPublicId || template.logoUrl)
      : (template.signaturePublicId || template.signatureUrl);

    setDeleteImageModal(prev => ({ ...prev, loading: true }));
    try {
      if (target) {
        await deleteMedia(target, 'image');
      }
      if (isLogo) {
        setTemplate(prev => ({ ...prev, logoUrl: null, logoPublicId: null }));
      } else {
        setTemplate(prev => ({ ...prev, signatureUrl: null, signaturePublicId: null }));
      }
      addToast('success', `${isLogo ? 'Organization logo' : 'Signature'} image deleted successfully.`);
      setDeleteImageModal({ isOpen: false, imageType: null, title: '', message: '', loading: false });
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Unable to delete the file. Please try again.');
      setDeleteImageModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleCancelDeleteImage = () => {
    if (deleteImageModal.loading) return;
    setDeleteImageModal({ isOpen: false, imageType: null, title: '', message: '', loading: false });
  };

  const handleSaveTemplate = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (savingTemplate) return;
    setSavingTemplate(true);
    try {
      const res = await updateCertificateTemplate(template);
      setTemplate(prev => ({ ...prev, ...res.data.data.template }));
      addToast('success', 'Certificate template settings saved successfully!');
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to save template settings');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleSaveCustomDesign = async (customDesign) => {
    if (savingTemplate) return;
    setSavingTemplate(true);
    try {
      const payload = {
        ...template,
        customDesign
      };
      const res = await updateCertificateTemplate(payload);
      setTemplate(prev => ({
        ...prev,
        ...res.data.data.template,
        customDesign
      }));
      addToast('success', 'Custom certificate design saved successfully!');
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to save certificate design');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleResetTemplate = () => {
    setShowResetTemplateModal(true);
  };

  const handleConfirmResetTemplate = async () => {
    setSavingTemplate(true);
    try {
      const res = await resetCertificateTemplate();
      setTemplate(prev => ({ ...prev, ...res.data.data.template }));
      addToast('success', 'Template settings reset to default values.');
      setShowResetTemplateModal(false);
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to reset template');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleRunBackfill = async () => {
    setRunningBackfill(true);
    try {
      const res = await backfillCertificates();
      addToast('success', res.data.message || 'Backfill completed!');
      await fetchCertificatesData();
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to execute backfill');
    } finally {
      setRunningBackfill(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading organization certificates & settings..." />;

  return (
    <div className="space-y-6 animate-fade-in pb-16 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Organization Governance</span>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-heading mt-1">Certificates & Designer</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage organization completion certificates, customize template logos, signatures, styles, and trigger backfill generation.
          </p>
        </div>

        {/* Main Tab Navigation Controls */}
        <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
          <button
            onClick={() => {
              setActiveTab('issued');
              setSelectedCourseId(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'issued'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Course Certificates ({courseGroups.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('designer')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'designer'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Certificate Designer</span>
          </button>
        </div>
      </div>

      {/* BACKFILL NOTICE BANNER FOR MISSING CERTIFICATES */}
      {backfillCount > 0 && (
        <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-scale-up">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center flex-shrink-0">
              <RefreshCw className={`w-5 h-5 ${runningBackfill ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h4 className="font-bold text-xs text-emerald-800 uppercase tracking-wider flex items-center">
                <Sparkles className="w-3.5 h-3.5 mr-1" /> Missing Certificates Found ({backfillCount})
              </h4>
              <p className="text-xs text-slate-700 mt-0.5">
                {backfillCount} completed training assignment{backfillCount === 1 ? '' : 's'} in your organization do not have certificates issued yet.
              </p>
            </div>
          </div>

          <button
            onClick={handleRunBackfill}
            disabled={runningBackfill}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 flex-shrink-0"
          >
            {runningBackfill ? 'Generating Certificates...' : `Generate ${backfillCount} Missing Certificate${backfillCount === 1 ? '' : 's'}`}
          </button>
        </div>
      )}

      {/* TAB 1: COURSE-WISE CERTIFICATES (TWO LEVELS: LEVEL 1 COURSE CARDS, LEVEL 2 CERTIFICATE HOLDERS) */}
      {activeTab === 'issued' && (
        <>
          {/* LEVEL 1: COURSE LISTING (MAIN VIEW) */}
          {!selectedCourseGroup ? (
            <div className="space-y-4">
              {/* Level 1: Filter Toolbar */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Search by Course/Training Title */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/60 focus-within:bg-white focus-within:border-emerald-500 transition-colors">
                    <Search className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={courseSearch}
                      onChange={(e) => {
                        setCourseSearch(e.target.value);
                        setCoursePage(1);
                      }}
                      placeholder="Search courses by title..."
                      className="w-full bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-400"
                    />
                    {courseSearch && (
                      <button
                        onClick={() => {
                          setCourseSearch('');
                          setCoursePage(1);
                        }}
                        className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
                        title="Clear course search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter Controls */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Certificate Count Filter */}
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">Certificates:</span>
                    <select
                      value={courseCountFilter}
                      onChange={(e) => {
                        setCourseCountFilter(e.target.value);
                        setCoursePage(1);
                      }}
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 outline-none hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <option value="all">All Counts</option>
                      <option value="1-5">1 - 5 Issued</option>
                      <option value="6-15">6 - 15 Issued</option>
                      <option value="16+">16+ Issued</option>
                    </select>
                  </div>

                  {/* Sort Dropdown */}
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">Sort:</span>
                    <select
                      value={courseSortBy}
                      onChange={(e) => {
                        setCourseSortBy(e.target.value);
                        setCoursePage(1);
                      }}
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 outline-none hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <option value="most_certs">Most Certificates</option>
                      <option value="least_certs">Least Certificates</option>
                      <option value="title_asc">Course Title (A-Z)</option>
                      <option value="recent">Recently Issued</option>
                    </select>
                  </div>

                  {/* Reset Filters */}
                  {hasCourseFilters && (
                    <button
                      onClick={handleResetCourseFilters}
                      className="px-3 py-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition-colors cursor-pointer flex items-center space-x-1"
                      title="Reset all course filters"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Summary Counter Bar */}
              <div className="px-1 flex items-center justify-between text-xs text-slate-500">
                <div>
                  Showing <span className="font-bold text-slate-900">{filteredCourseGroups.length}</span> {filteredCourseGroups.length === 1 ? 'course' : 'courses'} with issued certificates
                  {hasCourseFilters && <span className="text-emerald-700 ml-1.5 font-semibold">(filtered)</span>}
                </div>
                <div className="font-medium text-slate-400 hidden sm:block">
                  Total <span className="font-bold text-slate-700">{certificates.length}</span> certificates across organization
                </div>
              </div>

              {/* Compact Course Cards Grid (No Thumbnails) */}
              {filteredCourseGroups.length === 0 ? (
                <div className="p-12 rounded-2xl bg-white border border-slate-200 shadow-xs text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
                    <Award className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {hasCourseFilters ? 'No Courses Match Your Filters' : 'No Certificates Issued Yet'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {hasCourseFilters
                      ? 'No courses found matching your current search and filter criteria. Try adjusting your filters.'
                      : 'Certificates will automatically appear here grouped by course once learners complete their training assignments.'}
                  </p>
                  {hasCourseFilters && (
                    <button
                      onClick={handleResetCourseFilters}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
                    >
                      Reset Course Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {paginatedCourseGroups.map((group) => (
                    <div
                      key={group.courseId}
                      onClick={() => handleSelectCourse(group.courseId)}
                      className="group bg-white rounded-xl border border-slate-200 hover:border-emerald-400 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer p-4 flex flex-col justify-between"
                    >
                      <div>
                        {/* Top Row: Mini Icon + Certificate Count Badge */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <Award className="w-4 h-4" />
                          </div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                            {group.certificates.length} {group.certificates.length === 1 ? 'Certificate' : 'Certificates'}
                          </span>
                        </div>

                        {/* Course Category & Title */}
                        <div className="mt-3">
                          {group.categoryName && (
                            <span className="text-[10px] uppercase font-bold text-slate-400 block truncate mb-1">
                              {group.categoryName}
                            </span>
                          )}
                          <h3
                            className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug"
                            title={group.courseTitle}
                          >
                            {group.courseTitle}
                          </h3>
                        </div>
                      </div>

                      {/* Card Footer: Metadata & View Link */}
                      <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-xs font-semibold text-emerald-700 group-hover:text-emerald-800">
                        <span className="text-[11px] text-slate-400 font-normal truncate max-w-[130px]">
                          {group.lastIssuedDate ? `Latest: ${formatDate(group.lastIssuedDate)}` : `${group.certificates.length} Issued`}
                        </span>
                        <span className="inline-flex items-center space-x-1 shrink-0">
                          <span>View</span>
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Level 1: Pagination */}
              <Pagination
                currentPage={coursePage}
                totalItems={filteredCourseGroups.length}
                pageSize={COURSES_PER_PAGE}
                onPageChange={setCoursePage}
                itemLabel="courses"
                className="rounded-2xl border border-slate-200 bg-white"
              />
            </div>
          ) : (
            /* LEVEL 2: CERTIFICATE HOLDERS TABLE FOR SELECTED COURSE */
            <div className="space-y-4 animate-fade-in">
              {/* Back Navigation & Course Header Bar */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-3 min-w-0">
                  <button
                    onClick={handleBackToCourses}
                    className="p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer shrink-0"
                    title="Back to Course Listing"
                    aria-label="Back to Course Listing"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2 text-xs text-slate-500 mb-0.5">
                      <span
                        onClick={handleBackToCourses}
                        className="hover:text-emerald-700 cursor-pointer font-medium"
                      >
                        All Courses
                      </span>
                      <span>&rsaquo;</span>
                      <span className="font-semibold text-slate-700 truncate max-w-xs sm:max-w-md">
                        {selectedCourseGroup.courseTitle}
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight font-heading truncate">
                      {selectedCourseGroup.courseTitle}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 self-start md:self-auto">
                  <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold shadow-2xs">
                    <Award className="w-4 h-4 mr-1.5" />
                    {selectedCourseGroup.certificates.length} Total {selectedCourseGroup.certificates.length === 1 ? 'Certificate' : 'Certificates'}
                  </span>
                  <button
                    onClick={handleBackToCourses}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer inline-flex items-center"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                    Back to Courses
                  </button>
                </div>
              </div>

              {/* Level 2: Filter Toolbar (Learner, Certificate ID, Group, Date) */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Search Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1 min-w-0">
                  {/* Learner Name Search */}
                  <div className="flex items-center space-x-2.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/60 focus-within:bg-white focus-within:border-emerald-500 transition-colors">
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={learnerSearch}
                      onChange={(e) => {
                        setLearnerSearch(e.target.value);
                        setCertPage(1);
                      }}
                      placeholder="Search learner name or email..."
                      className="w-full bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-400"
                    />
                    {learnerSearch && (
                      <button
                        onClick={() => {
                          setLearnerSearch('');
                          setCertPage(1);
                        }}
                        className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                        title="Clear learner search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Certificate ID Search */}
                  <div className="flex items-center space-x-2.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/60 focus-within:bg-white focus-within:border-emerald-500 transition-colors">
                    <Award className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={certIdSearch}
                      onChange={(e) => {
                        setCertIdSearch(e.target.value);
                        setCertPage(1);
                      }}
                      placeholder="Search Certificate ID..."
                      className="w-full bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-400 font-mono"
                    />
                    {certIdSearch && (
                      <button
                        onClick={() => {
                          setCertIdSearch('');
                          setCertPage(1);
                        }}
                        className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                        title="Clear certificate ID search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Dropdown Filters */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Group / Department Filter */}
                  <div className="flex items-center space-x-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
                    <select
                      value={selectedDepartment}
                      onChange={(e) => {
                        setSelectedDepartment(e.target.value);
                        setCertPage(1);
                      }}
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 outline-none hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <option value="all">All Groups</option>
                      {courseDepartments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Completion Date Filter */}
                  <div className="flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
                    <select
                      value={dateFilter}
                      onChange={(e) => {
                        setDateFilter(e.target.value);
                        setCertPage(1);
                      }}
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 outline-none hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <option value="all">All Dates</option>
                      <option value="7d">Last 7 Days</option>
                      <option value="30d">Last 30 Days</option>
                      <option value="90d">Last 90 Days</option>
                      <option value="1y">Last 1 Year</option>
                    </select>
                  </div>

                  {/* Reset Filters */}
                  {hasCertFilters && (
                    <button
                      onClick={handleResetCertFilters}
                      className="px-3 py-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition-colors cursor-pointer flex items-center space-x-1"
                      title="Reset all filters for this course"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider text-[11px]">
                        <th className="p-4">Certificate ID</th>
                        <th className="p-4">Learner</th>
                        <th className="p-4">Group</th>
                        <th className="p-4">Completion Date</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredCertificates.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="p-8 text-center text-slate-400">
                            {hasCertFilters ? (
                              <div className="space-y-2">
                                <p>No certificates match your active search and filter criteria.</p>
                                <button
                                  onClick={handleResetCertFilters}
                                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                                >
                                  Clear Filters
                                </button>
                              </div>
                            ) : (
                              'No certificates issued for this course yet.'
                            )}
                          </td>
                        </tr>
                      ) : (
                        paginatedCertificates.map((cert) => (
                          <tr key={cert.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-4 font-mono font-bold text-emerald-700">
                              {cert.certificateId}
                            </td>
                            <td className="p-4">
                              <div className="font-bold text-slate-900">{cert.employee?.name || 'Unknown Learner'}</div>
                              {cert.employee?.email && (
                                <div className="text-[11px] text-slate-400 font-normal">{cert.employee.email}</div>
                              )}
                            </td>
                            <td className="p-4 text-slate-500">
                              {cert.employee?.department?.name || 'N/A'}
                            </td>
                            <td className="p-4 text-slate-500 font-mono">
                              {formatDate(cert.completionDate)}
                            </td>
                            <td className="p-4 text-right space-x-2">
                              <button
                                onClick={() => handleViewCert(cert)}
                                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer inline-flex items-center"
                                title="View Certificate"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDownloadPNG(cert)}
                                className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer inline-flex items-center border border-emerald-200"
                                title="Download PNG"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDownloadPDF(cert)}
                                className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 transition-colors cursor-pointer inline-flex items-center border border-red-200"
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
              </div>

              {/* Level 2: Pagination */}
              <Pagination
                currentPage={certPage}
                totalItems={filteredCertificates.length}
                pageSize={CERTS_PER_PAGE}
                onPageChange={setCertPage}
                itemLabel="certificates"
                className="rounded-2xl border border-slate-200 bg-white"
              />
            </div>
          )}
        </>
      )}

      {/* TAB 2: CERTIFICATE DESIGNER (ADVANCED CANVA-LIKE EDITOR) */}
      {activeTab === 'designer' && (
        <div className="space-y-6 animate-fade-in">
          {designerMode === 'select' ? (
            /* CREATION OPTIONS VIEW (OPTION A & OPTION B) */
            <div className="space-y-6">
              {/* Studio Header */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      Canva-Like Editor
                    </span>
                    <span className="text-xs text-slate-400">• Full Element-Level Creative Freedom</span>
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                    Certificate Design Studio
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Select a professionally designed template or start with a clean blank canvas to design your custom certificate.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setDesignerMode('editor')}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 self-start md:self-auto"
                >
                  <Palette className="w-4 h-4 text-emerald-400" />
                  <span>Open Active Editor</span>
                </button>
              </div>

              {/* OPTION A: CUSTOM CREATION FROM SCRATCH */}
              <div className="p-6 rounded-2xl border-2 border-dashed border-emerald-500/80 bg-gradient-to-r from-emerald-50/60 via-white to-emerald-50/30 dark:from-emerald-950/20 dark:via-slate-900 dark:to-emerald-950/10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-600 text-white">
                      Option A
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                      Create Custom Certificate from Scratch
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                    Start with a 100% clean blank canvas. Add custom headings, dynamic recipient placeholders (<code>&#123;&#123;learnerName&#125;&#125;</code>, <code>&#123;&#123;courseName&#125;&#125;</code>, <code>&#123;&#123;adminName&#125;&#125;</code>), shapes, decorative borders, logos, and signatures with complete creative freedom.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedTemplateForEditor(BLANK_CANVAS_DESIGN);
                    setDesignerMode('editor');
                  }}
                  className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Start Blank Canvas</span>
                </button>
              </div>

              {/* OPTION B: USE PRE-MADE TEMPLATES */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-600 text-white shrink-0 whitespace-nowrap shadow-2xs">
                        Option B
                      </span>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-wide shrink-0 whitespace-nowrap">
                        OPTION B – PRE-MADE TEMPLATES
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Select any existing template to open it in the advanced editor. Every element is freely movable, resizable, and editable.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {TEMPLATE_PRESETS.map((tmpl) => (
                    <div
                      key={tmpl.id}
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {tmpl.category}
                          </span>
                          <div className="flex items-center space-x-1.5">
                            {tmpl.previewColors.map((color, i) => (
                              <span
                                key={i}
                                className="w-3 h-3 rounded-full border border-black/10 inline-block"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        </div>

                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 transition-colors">
                          {tmpl.name}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          {tmpl.description}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTemplateForEditor(tmpl.design);
                          setDesignerMode('editor');
                        }}
                        className="w-full py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 hover:text-emerald-700 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Palette className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Customize in Advanced Editor</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ADVANCED CANVA-LIKE EDITOR */
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={() => setDesignerMode('select')}
                  className="text-xs font-bold text-slate-600 hover:text-emerald-600 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Template Options (Option A & B)</span>
                </button>
                <span className="text-[11px] font-medium text-slate-400">
                  Tip: Use Ctrl+Z to undo, Ctrl+Y to redo, and click canvas elements to customize.
                </span>
              </div>

              <AdvancedCertificateEditor
                initialDesign={selectedTemplateForEditor || template.customDesign}
                initialTemplateSettings={template}
                onSaveDesign={handleSaveCustomDesign}
                saving={savingTemplate}
                sampleData={{
                  organizationName: user?.organization?.name || template?.organization?.name || 'Enterprise Organization',
                  employeeName: 'Sarah Jenkins',
                  trainingTitle: 'Advanced Cloud Architecture & Security Mastery',
                  certificateId: 'CERT-2026-A8F3B9',
                  completionDate: 'March 15, 2026',
                  adminName: user?.name || template.signatureName || 'Organization Administrator',
                  instructorName: user?.name || template.signatureName || 'Organization Administrator',
                  logoUrl: template.logoUrl,
                  signatureUrl: template.signatureUrl
                }}
              />
            </div>
          )}
        </div>
      )}

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
                <span className="text-[11px] font-bold text-emerald-700 font-mono tracking-wider">{selectedCert.certificateId}</span>
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
                  onClick={() => exportCertificatePNG(`admin_cert_${selectedCert.id}`, `Certificate_${selectedCert.certificateId}.png`)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200 transition-colors cursor-pointer inline-flex items-center space-x-1"
                  title="Download as PNG"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">PNG</span>
                </button>
                <button
                  onClick={() => exportCertificatePDF(`admin_cert_${selectedCert.id}`, `Certificate_${selectedCert.certificateId}.pdf`)}
                  className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold border border-red-200 transition-colors cursor-pointer inline-flex items-center space-x-1"
                  title="Download as PDF"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">PDF</span>
                </button>
                <button
                  onClick={() => setSelectedCert(null)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                  aria-label="Close Certificate View"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 min-w-0 p-2 sm:p-4 flex items-center justify-center bg-slate-900/5 border border-slate-200/80 rounded-xl overflow-hidden mt-3 sm:mt-4">
              <CertificateCanvas
                certificate={selectedCert}
                elementId={`admin_cert_${selectedCert.id}`}
                className="w-full h-full"
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirmation Modal for Certificate Image Deletion */}
      <ConfirmationModal
        isOpen={deleteImageModal.isOpen}
        onClose={handleCancelDeleteImage}
        onConfirm={handleConfirmDeleteImage}
        title={deleteImageModal.title}
        message={deleteImageModal.message}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={deleteImageModal.loading}
        closeOnBackdropClick={false}
        closeOnEscape={false}
        showCloseButton={false}
      />

      {/* Confirmation Modal for Resetting Certificate Template */}
      <ConfirmationModal
        isOpen={showResetTemplateModal}
        onClose={() => !savingTemplate && setShowResetTemplateModal(false)}
        onConfirm={handleConfirmResetTemplate}
        title="Reset Certificate Template"
        message="Are you sure you want to reset the certificate template to default colors, layout, and clear uploaded assets?"
        confirmText="Reset Template"
        cancelText="Cancel"
        variant="danger"
        loading={savingTemplate}
        closeOnBackdropClick={false}
        closeOnEscape={false}
        showCloseButton={false}
      />
    </div>
  );
};
