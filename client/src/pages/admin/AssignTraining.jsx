import React, { useEffect, useState } from 'react';
import { useInvalidateLmsQueries } from '../../hooks/useLmsQueries';
import {
  getTrainings,
  getDepartments,
  getEmployees,
  assignTraining,
  getAllAssignments,
  createAutoRule,
  getAutoRules,
  deactivateAutoRule,
  reactivateAutoRule
} from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { useNotification } from '../../context/NotificationContext';
import { formatAssignmentType, formatDate } from '../../utils/formatters';
import { CourseSelectDropdown } from '../../components/common/CourseSelectDropdown';
import { CustomSelectDropdown } from '../../components/common/CustomSelectDropdown';
import {
  Zap,
  Target,
  BookOpen,
  Building2,
  Calendar,
  Check,
  Users,
  Search,
  ShieldCheck,
  AlertTriangle,
  Power,
  Sparkles,
  Clock,
  Filter,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  X
} from 'lucide-react';

export const AssignTraining = () => {
  const { addToast } = useNotification();
  const invalidateQueries = useInvalidateLmsQueries();

  // Active Tab: 'auto' | 'targeted'
  const [activeTab, setActiveTab] = useState('auto');

  // Common Data State
  const [trainings, setTrainings] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [existingAssignments, setExistingAssignments] = useState([]);
  const [autoRules, setAutoRules] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tab 1: Auto-Assignment Form & Modal State
  const [autoTrainingId, setAutoTrainingId] = useState('');
  const [autoDeadlineMonths, setAutoDeadlineMonths] = useState('1');
  const [autoDeadlineDays, setAutoDeadlineDays] = useState('0');
  const [deadlineError, setDeadlineError] = useState('');
  const [submittingAuto, setSubmittingAuto] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [selectedRule, setSelectedRule] = useState(null);
  const [submittingRuleAction, setSubmittingRuleAction] = useState(false);

  // Tab 2: Targeted Assignment Form State
  const [targetedTrainingId, setTargetedTrainingId] = useState('');
  const [targetMode, setTargetMode] = useState('dept_role'); // 'dept_role' | 'individual'
  const [departmentId, setDepartmentId] = useState('');
  const [jobRole, setJobRole] = useState('ALL_ROLES');
  const [availableJobRoles, setAvailableJobRoles] = useState([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [customDeadline, setCustomDeadline] = useState('');
  const [dateError, setDateError] = useState('');
  const [deactivatedWarning, setDeactivatedWarning] = useState('');
  const [submittingTargeted, setSubmittingTargeted] = useState(false);

  // View All Auto Rules Modal State
  const [showAllAutoRulesModal, setShowAllAutoRulesModal] = useState(false);
  const [autoRulesSearch, setAutoRulesSearch] = useState('');
  const [autoRulesStatusFilter, setAutoRulesStatusFilter] = useState('all'); // 'all' | 'active' | 'deactivated'
  const [autoRulesPage, setAutoRulesPage] = useState(1);
  const autoRulesPerPage = 6;

  // View All Dispatched Assignments Modal State
  const [showAllAssignmentsModal, setShowAllAssignmentsModal] = useState(false);
  const [assignmentsSearch, setAssignmentsSearch] = useState('');
  const [assignmentsStatusFilter, setAssignmentsStatusFilter] = useState('all'); // 'all' | 'Assigned' | 'Completed' | 'Overdue'
  const [assignmentsPage, setAssignmentsPage] = useState(1);
  const assignmentsPerPage = 10;

  // Bulk Auto Assignment Learners Details Modal State
  const [selectedBulkGroup, setSelectedBulkGroup] = useState(null);
  const [bulkLearnersSearch, setBulkLearnersSearch] = useState('');
  const [bulkLearnersPage, setBulkLearnersPage] = useState(1);
  const bulkLearnersPerPage = 8;

  // In-flight tracking for optimistic auto-rule toggle
  const [togglingRuleIds, setTogglingRuleIds] = useState(new Set());

  // Helper: check whether an auto rule is active (handles both 'active' and 'inactive' / 'deactivated')
  const isRuleActive = (rule) => String(rule?.status || '').toLowerCase() === 'active';

  // Compute today's date in YYYY-MM-DD format for input min constraint
  const getMinDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const validateDeadline = (dateVal) => {
    if (!dateVal) return '';
    const parts = dateVal.split('-');
    if (parts.length !== 3) {
      return 'Please enter a valid completion deadline date';
    }
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const selectedDate = new Date(year, month, day, 23, 59, 59, 999);
    if (isNaN(selectedDate.getTime())) {
      return 'Please enter a valid completion deadline date';
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      return 'Completion deadline cannot be in the past. Please select today or a future date.';
    }
    return '';
  };

  const handleDateChange = (e) => {
    const val = e.target.value;
    setCustomDeadline(val);
    const err = validateDeadline(val);
    setDateError(err);
  };

  const fetchAllData = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const [tRes, dRes, eRes, aRes, rRes] = await Promise.all([
        getTrainings(),
        getDepartments(),
        getEmployees(),
        getAllAssignments(),
        getAutoRules()
      ]);

      const published = (tRes.data.data.trainings || []).filter(
        t => t.status === 'published' && t.isPublished === true
      );
      setTrainings(published);
      setDepartments(dRes.data.data.departments || []);
      setEmployees(eRes.data.data.employees || []);
      setExistingAssignments(aRes.data.data.assignments || []);
      setAutoRules(rRes.data.data.rules || []);
    } catch (err) {
      addToast('error', 'Failed to load assignment engine data');
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData(true);
  }, []);

  // Dynamically compute available job roles whenever departmentId, departments, or employees change
  useEffect(() => {
    if (!departmentId) {
      setAvailableJobRoles([]);
      return;
    }

    const selectedDept = departments.find(d => String(d._id) === String(departmentId));
    const deptJobRoles = selectedDept?.jobRoles || [];

    const empJobRoles = employees
      .filter(emp => {
        const empDeptId = typeof emp.departmentId === 'object' ? emp.departmentId?._id : emp.departmentId;
        return String(empDeptId) === String(departmentId) && emp.jobRole;
      })
      .map(emp => emp.jobRole);

    const combined = Array.from(new Set([...deptJobRoles, ...empJobRoles])).filter(Boolean);
    setAvailableJobRoles(combined);
  }, [departmentId, departments, employees]);

  // Department selection handler
  const handleDeptChange = (val) => {
    const dId = val?.target?.value !== undefined ? val.target.value : val;
    setDepartmentId(dId);
    setJobRole('ALL_ROLES');
  };

  // Filter employees for Department + Job Role match count (active learners only)
  const matchedDeptRoleEmployees = employees.filter(emp => {
    if (!departmentId) return false;
    const isActive = emp.status && emp.status.toLowerCase() === 'active';
    if (!isActive) return false;
    const empDeptId = typeof emp.departmentId === 'object' ? emp.departmentId?._id : emp.departmentId;
    if (String(empDeptId) !== String(departmentId)) return false;
    if (jobRole && jobRole !== 'ALL_ROLES' && emp.jobRole !== jobRole) return false;
    return true;
  });

  // Filter individual employees by search term
  const filteredEmployeesForSelection = employees.filter(emp => {
    const term = employeeSearch.toLowerCase();
    const matchesName = emp.name.toLowerCase().includes(term);
    const matchesEmail = emp.email.toLowerCase().includes(term);
    const matchesDept = emp.departmentId?.name?.toLowerCase().includes(term);
    const matchesRole = emp.jobRole?.toLowerCase().includes(term);
    return matchesName || matchesEmail || matchesDept || matchesRole;
  });

  // Individual employee checkbox handlers
  const handleToggleEmployee = (id) => {
    const targetEmp = employees.find(e => String(e._id) === String(id));
    if (targetEmp && targetEmp.status && targetEmp.status.toLowerCase() !== 'active') {
      const msg = `User ${targetEmp.name} is currently deactivated/blocked and cannot be assigned courses`;
      setDeactivatedWarning(msg);
      addToast('error', msg);
      return;
    }
    setDeactivatedWarning('');
    setSelectedEmployeeIds(prev =>
      prev.includes(id) ? prev.filter(eId => eId !== id) : [...prev, id]
    );
  };

  const handleSelectAllEmployees = () => {
    const visibleActive = filteredEmployeesForSelection.filter(
      e => e.status && e.status.toLowerCase() === 'active'
    );
    const inactiveInFiltered = filteredEmployeesForSelection.filter(
      e => e.status && e.status.toLowerCase() !== 'active'
    );

    if (visibleActive.length === 0 && inactiveInFiltered.length > 0) {
      const msg = `User ${inactiveInFiltered[0].name} is currently deactivated/blocked and cannot be assigned courses`;
      setDeactivatedWarning(msg);
      addToast('error', msg);
      return;
    }

    if (inactiveInFiltered.length > 0) {
      addToast('info', `Excluded ${inactiveInFiltered.length} deactivated/blocked learner(s) from selection.`);
    }

    setDeactivatedWarning('');
    const visibleIds = visibleActive.map(e => e._id);
    setSelectedEmployeeIds(Array.from(new Set([...selectedEmployeeIds, ...visibleIds])));
  };

  const handleClearEmployeeSelection = () => {
    setSelectedEmployeeIds([]);
    setDeactivatedWarning('');
  };

  // SUBMIT TAB 1: Auto Assignment
  const handleAutoSubmit = async (e) => {
    e.preventDefault();
    if (!autoTrainingId) {
      addToast('error', 'Please select a published training course');
      return;
    }

    const monthsNum = parseInt(autoDeadlineMonths || '0', 10);
    const daysNum = parseInt(autoDeadlineDays || '0', 10);

    if (isNaN(monthsNum) || isNaN(daysNum) || monthsNum < 0 || daysNum < 0) {
      setDeadlineError('Please enter valid positive whole numbers for months and days.');
      addToast('error', 'Please enter valid positive whole numbers for months and days.');
      return;
    }

    const totalDays = monthsNum * 30 + daysNum;
    if (totalDays < 1) {
      setDeadlineError('Completion deadline window must be at least 1 day.');
      addToast('error', 'Completion deadline window must be at least 1 day.');
      return;
    }

    if (totalDays > 365) {
      setDeadlineError('Completion deadline window cannot exceed 12 months (365 days).');
      addToast('error', 'Completion deadline window cannot exceed 12 months (365 days).');
      return;
    }

    setDeadlineError('');
    setSubmittingAuto(true);
    try {
      await createAutoRule({
        trainingId: autoTrainingId,
        months: monthsNum,
        days: daysNum,
        customDeadlineDays: totalDays
      });
      addToast('success', 'Automatic training assignment enabled successfully for all existing and future learners!');
      setAutoTrainingId('');
      setAutoDeadlineMonths('1');
      setAutoDeadlineDays('0');
      setDeadlineError('');
      invalidateQueries(['auto-rules', 'admin-dashboard']);
      fetchAllData(false);
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to create auto-assignment rule');
    } finally {
      setSubmittingAuto(false);
    }
  };

  // Optimistic Toggle Handler for Activate/Deactivate Auto Rule (instant response + DB update + rollback on error)
  const handleToggleAutoRule = async (rule) => {
    const ruleId = rule._id || rule.id;
    if (!ruleId || togglingRuleIds.has(ruleId)) return;

    const wasActive = isRuleActive(rule);
    const newStatus = wasActive ? 'inactive' : 'active';

    // 1. Optimistic UI update: instantly update autoRules state
    setAutoRules((prevRules) =>
      prevRules.map((r) =>
        (r._id === ruleId || r.id === ruleId) ? { ...r, status: newStatus } : r
      )
    );

    // 2. Prevent duplicate API requests while in-flight
    setTogglingRuleIds((prev) => new Set(prev).add(ruleId));

    // 3. Make API call through existing endpoints
    try {
      if (wasActive) {
        await deactivateAutoRule(ruleId);
        addToast('success', 'Auto-assignment rule deactivated successfully');
      } else {
        const res = await reactivateAutoRule(ruleId);
        addToast('success', res.data?.message || 'Auto-assignment rule activated successfully');
      }
      invalidateQueries(['auto-rules', 'admin-dashboard']);
    } catch (err) {
      // 4. Revert optimistic update on failure and display error toast
      setAutoRules((prevRules) =>
        prevRules.map((r) =>
          (r._id === ruleId || r.id === ruleId) ? { ...r, status: wasActive ? 'active' : 'inactive' } : r
        )
      );
      addToast(
        'error',
        err.response?.data?.message ||
          `Failed to ${wasActive ? 'deactivate' : 'activate'} auto-assignment rule`
      );
    } finally {
      setTogglingRuleIds((prev) => {
        const next = new Set(prev);
        next.delete(ruleId);
        return next;
      });
    }
  };

  // Modal Handlers for Deactivate & Reactivate Auto Rule
  const handleOpenDeactivateModal = (rule) => {
    setSelectedRule(rule);
    setShowDeactivateModal(true);
  };

  const handleConfirmDeactivate = async () => {
    if (!selectedRule) return;
    setSubmittingRuleAction(true);
    try {
      await deactivateAutoRule(selectedRule._id);
      addToast('success', 'Auto-assignment rule deactivated');
      setShowDeactivateModal(false);
      setSelectedRule(null);
      invalidateQueries(['auto-rules', 'admin-dashboard']);
      fetchAllData(false);
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to deactivate rule');
    } finally {
      setSubmittingRuleAction(false);
    }
  };

  const handleOpenReactivateModal = (rule) => {
    setSelectedRule(rule);
    setShowReactivateModal(true);
  };

  const handleConfirmReactivate = async () => {
    if (!selectedRule) return;
    setSubmittingRuleAction(true);
    try {
      const res = await reactivateAutoRule(selectedRule._id);
      addToast('success', res.data.message || 'Auto-assignment rule reactivated!');
      setShowReactivateModal(false);
      setSelectedRule(null);
      invalidateQueries(['auto-rules', 'admin-dashboard']);
      fetchAllData(false);
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to reactivate rule');
    } finally {
      setSubmittingRuleAction(false);
    }
  };

  // SUBMIT TAB 2: Targeted Assignment
  const handleTargetedSubmit = async (e) => {
    e.preventDefault();
    if (!targetedTrainingId) {
      addToast('error', 'Please select a published training course');
      return;
    }

    if (targetMode === 'dept_role') {
      if (!departmentId) {
        addToast('error', 'Please select a Group');
        return;
      }
      if (matchedDeptRoleEmployees.length === 0) {
        addToast('error', 'No active learners match the selected group and subgroup criteria');
        return;
      }
    } else {
      if (selectedEmployeeIds.length === 0) {
        addToast('error', 'Please select at least one learner from the list');
        return;
      }

      // Check if any selected learner account is deactivated or blocked
      const deactivatedTarget = employees.find(
        e => selectedEmployeeIds.includes(e._id) && e.status && e.status.toLowerCase() !== 'active'
      );
      if (deactivatedTarget) {
        const msg = `User ${deactivatedTarget.name} is currently deactivated/blocked and cannot be assigned courses`;
        setDeactivatedWarning(msg);
        addToast('error', msg);
        return;
      }
    }

    if (customDeadline) {
      const err = validateDeadline(customDeadline);
      if (err) {
        setDateError(err);
        addToast('error', err);
        return;
      }
    }

    setSubmittingTargeted(true);
    try {
      const payload = {
        trainingId: targetedTrainingId,
        assignmentType: targetMode === 'dept_role' ? 'dept_role' : 'specific',
        departmentId: targetMode === 'dept_role' ? departmentId : undefined,
        jobRole: targetMode === 'dept_role' ? (jobRole || 'ALL_ROLES') : undefined,
        employeeIds: targetMode === 'individual' ? selectedEmployeeIds : undefined,
        customDeadline: customDeadline || null
      };

      const res = await assignTraining(payload);
      addToast('success', res.data.message || 'Training assigned successfully!');

      // Reset Form
      setTargetedTrainingId('');
      setDepartmentId('');
      setJobRole('ALL_ROLES');
      setSelectedEmployeeIds([]);
      setCustomDeadline('');
      setDateError('');
      setDeactivatedWarning('');
      setEmployeeSearch('');

      fetchAllData(false);
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to dispatch assignment');
    } finally {
      setSubmittingTargeted(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading Training Assignment Engine..." />;

  const activeAutoRulesCount = autoRules.filter(isRuleActive).length;
  const deactivatedAutoRulesCount = autoRules.filter((r) => !isRuleActive(r)).length;

  // Filtered & Paginated Auto Rules for View All Modal
  const filteredAutoRules = autoRules.filter((rule) => {
    const searchLower = autoRulesSearch.trim().toLowerCase();
    const matchesSearch =
      !searchLower ||
      (rule.trainingId?.title || '').toLowerCase().includes(searchLower) ||
      (rule.trainingId?.category?.name || '').toLowerCase().includes(searchLower);

    const matchesStatus =
      autoRulesStatusFilter === 'all' ||
      (autoRulesStatusFilter === 'active' && isRuleActive(rule)) ||
      (autoRulesStatusFilter === 'deactivated' && !isRuleActive(rule));

    return matchesSearch && matchesStatus;
  });

  const totalAutoRulePages = Math.max(1, Math.ceil(filteredAutoRules.length / autoRulesPerPage));
  const paginatedAutoRules = filteredAutoRules.slice(
    (autoRulesPage - 1) * autoRulesPerPage,
    autoRulesPage * autoRulesPerPage
  );

  // Group automatic assignments belonging to the same dispatch event and training into a single bulk row
  const groupDispatchedAssignments = (assignments) => {
    if (!assignments || assignments.length === 0) return [];

    const result = [];
    const autoGroups = new Map();

    for (const a of assignments) {
      const isAuto = String(a.assignmentType || '').toLowerCase() === 'auto';
      if (isAuto) {
        const tId = String(a.trainingId?._id || a.trainingId?.id || a.trainingId || '');
        const dateVal = a.assignedDate || a.createdAt;
        // Group by trainingId and 10-second time window of the dispatch event
        const timeBucket = dateVal ? Math.floor(new Date(dateVal).getTime() / 10000) * 10000 : 0;
        const key = `${tId}_${timeBucket}`;

        if (!autoGroups.has(key)) {
          const groupObj = {
            isBulkAuto: true,
            _id: `bulk_${key}`,
            trainingId: a.trainingId,
            assignmentType: a.assignmentType,
            assignments: [a],
            deadline: a.deadline,
            assignedDate: a.assignedDate,
            createdAt: a.createdAt,
            status: a.status
          };
          autoGroups.set(key, groupObj);
          result.push(groupObj);
        } else {
          autoGroups.get(key).assignments.push(a);
        }
      } else {
        result.push({ isBulkAuto: false, ...a });
      }
    }

    // If an auto group has only 1 assignment, keep it as a standard individual row
    return result.map((item) => {
      if (item.isBulkAuto && item.assignments.length === 1) {
        return { isBulkAuto: false, ...item.assignments[0] };
      }
      return item;
    });
  };

  const groupedAssignments = groupDispatchedAssignments(existingAssignments);

  // Filtered & Paginated Dispatched Assignments for View All Modal
  const filteredAssignments = groupedAssignments.filter((item) => {
    const searchLower = assignmentsSearch.trim().toLowerCase();
    const matchesSearch =
      !searchLower ||
      (item.trainingId?.title || '').toLowerCase().includes(searchLower) ||
      (item.isBulkAuto
        ? item.assignments.some(
            (a) =>
              (a.employeeId?.name || '').toLowerCase().includes(searchLower) ||
              (a.employeeId?.email || '').toLowerCase().includes(searchLower)
          )
        : (item.employeeId?.name || '').toLowerCase().includes(searchLower) ||
          (item.employeeId?.email || '').toLowerCase().includes(searchLower));

    const matchesStatus =
      assignmentsStatusFilter === 'all' ||
      (item.isBulkAuto
        ? item.assignments.some((a) => a.status === assignmentsStatusFilter)
        : item.status === assignmentsStatusFilter);

    return matchesSearch && matchesStatus;
  });

  const totalAssignmentPages = Math.max(1, Math.ceil(filteredAssignments.length / assignmentsPerPage));
  const paginatedAssignments = filteredAssignments.slice(
    (assignmentsPage - 1) * assignmentsPerPage,
    assignmentsPage * assignmentsPerPage
  );

  // Filtered & Paginated Learners for selectedBulkGroup Details Modal
  const filteredBulkLearners = (selectedBulkGroup?.assignments || []).filter((a) => {
    const search = bulkLearnersSearch.trim().toLowerCase();
    if (!search) return true;
    return (
      (a.employeeId?.name || '').toLowerCase().includes(search) ||
      (a.employeeId?.email || '').toLowerCase().includes(search)
    );
  });

  const totalBulkPages = Math.max(1, Math.ceil(filteredBulkLearners.length / bulkLearnersPerPage));
  const paginatedBulkLearners = filteredBulkLearners.slice(
    (bulkLearnersPage - 1) * bulkLearnersPerPage,
    bulkLearnersPage * bulkLearnersPerPage
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-16">
      {/* SECTION 1: Deep Emerald -> Teal Gradient Hero Banner */}
      <div className="relative overflow-hidden p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-[#064E3B] via-[#0D5C46] to-[#0F766E] border border-emerald-800/60 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-400/15 border border-emerald-300/30 text-emerald-100 text-xs font-bold backdrop-blur-xs">
            <Zap className="w-3.5 h-3.5 mr-1.5 text-emerald-300" />
            Training Assignment Engine
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-heading">
            Training Assignment Engine
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
            Configure organization-wide, group-based, role-based, or individual training assignments for learners.
          </p>
        </div>

        <div className="relative z-10 flex items-center space-x-3 shrink-0">
          <span className="px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-bold backdrop-blur-md">
            {trainings.length} Published Courses
          </span>
        </div>
      </div>

      {/* SECTION 2: Modern Segmented Control Tab Switcher */}
      <div className="flex flex-col sm:inline-flex sm:flex-row p-1.5 rounded-2xl bg-slate-100 border border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('auto')}
          className={`flex items-center justify-center sm:justify-start px-4 sm:px-5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'auto'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Zap className="w-4 h-4 mr-2 text-amber-500 shrink-0" />
          <span className="truncate">Automatic Training Assignment</span>
          {activeAutoRulesCount > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold border border-amber-200 shrink-0">
              {activeAutoRulesCount} Active
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('targeted')}
          className={`flex items-center justify-center sm:justify-start px-4 sm:px-5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'targeted'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Target className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
          <span className="truncate">Targeted Training Assignment</span>
        </button>
      </div>

      {/* SECTION 3: TAB CONFIGURATION & RULES FORMS */}
      {/* ================================================== */}
      {/* TAB 1: AUTO ASSIGNMENT */}
      {/* ================================================== */}
      {activeTab === 'auto' && (
        <div className="space-y-6 animate-fade-in">
          {/* Explanation Callout Card */}
          <div className="p-5 rounded-2xl bg-purple-50/70 border border-purple-200/90 text-purple-950 space-y-2 shadow-xs">
            <div className="flex items-center space-x-2 font-bold text-purple-900 text-sm font-heading">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>Automatic Training Assignment</span>
            </div>
            <p className="text-xs text-purple-800 leading-relaxed max-w-4xl">
              Automatically assign selected mandatory training to all current and newly added learners.
            </p>
          </div>

          {/* Configure Auto Assignment Form Card */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base font-heading">
                  Configure Automatic Training Assignment
                </h3>
                <p className="text-xs text-slate-500">
                  Select a published training course and set mandatory deadline days
                </p>
              </div>
            </div>

            {trainings.length === 0 ? (
              <EmptyState
                icon={AlertTriangle}
                title="No Published Trainings Available"
                description="You must publish at least one training course before configuring an auto-assignment rule."
              />
            ) : (
              <form onSubmit={handleAutoSubmit} className="space-y-4 max-w-3xl">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Select Published Training Course <span className="text-rose-500">*</span>
                  </label>
                  <CourseSelectDropdown
                    trainings={trainings}
                    value={autoTrainingId}
                    onChange={(id) => setAutoTrainingId(id)}
                    placeholder="Choose Mandatory Published Course"
                    required
                    accentColor="indigo"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Completion Deadline Window (from Assignment) <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-medium text-slate-600">Months</span>
                        <span className="text-[10px] text-slate-400">0 – 12 months</span>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={autoDeadlineMonths}
                          onChange={(e) => {
                            const clean = e.target.value.replace(/[^0-9]/g, '');
                            const num = clean === '' ? '' : Math.min(12, parseInt(clean, 10)).toString();
                            setAutoDeadlineMonths(num);
                            setDeadlineError('');
                          }}
                          onKeyDown={(e) => {
                            if (['e', 'E', '+', '-', '.', ','].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          placeholder="0"
                          maxLength={2}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                        />
                        <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 pointer-events-none">
                          mo
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-medium text-slate-600">Days</span>
                        <span className="text-[10px] text-slate-400">0 – 31 days</span>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={autoDeadlineDays}
                          onChange={(e) => {
                            const clean = e.target.value.replace(/[^0-9]/g, '');
                            const num = clean === '' ? '' : Math.min(31, parseInt(clean, 10)).toString();
                            setAutoDeadlineDays(num);
                            setDeadlineError('');
                          }}
                          onKeyDown={(e) => {
                            if (['e', 'E', '+', '-', '.', ','].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          placeholder="0"
                          maxLength={2}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                        />
                        <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 pointer-events-none">
                          days
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Summary preview of deadline calculation */}
                  <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span>
                      Total Window:{' '}
                      <strong className="text-slate-800">
                        {parseInt(autoDeadlineMonths || '0', 10) * 30 + parseInt(autoDeadlineDays || '0', 10)} days
                      </strong>{' '}
                      (~{autoDeadlineMonths || '0'} month{autoDeadlineMonths === '1' ? '' : 's'} {autoDeadlineDays || '0'} day{autoDeadlineDays === '1' ? '' : 's'})
                    </span>
                    <span className="text-[11px] text-slate-400">1 month = 30 days</span>
                  </div>

                  {deadlineError && (
                    <p className="text-xs text-rose-500 font-medium flex items-center gap-1.5 mt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{deadlineError}</span>
                    </p>
                  )}

                  <p className="text-xs text-slate-500 mt-0.5">
                    Learners receive this exact deadline window starting from when the training is automatically assigned to them.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submittingAuto}
                    className="py-2.5 px-5 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-all inline-flex items-center cursor-pointer disabled:opacity-50"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    {submittingAuto ? 'Enabling Auto-Assignment...' : 'Enable Automatic Training Assignment'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Currently Configured Auto Assignments Table Card */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base font-heading">
                    Configured Auto-Assignment Rules
                  </h3>
                  <p className="text-xs text-slate-500">
                    Active and deactivated compulsory organization rules
                    {autoRules.length > 3 ? ` (Showing latest 3 of ${autoRules.length})` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-semibold text-slate-500">
                  {autoRules.length} Total Rules
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAutoRulesSearch('');
                    setAutoRulesStatusFilter('all');
                    setAutoRulesPage(1);
                    setShowAllAutoRulesModal(true);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors inline-flex items-center cursor-pointer shadow-2xs"
                >
                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                  View All
                </button>
              </div>
            </div>

            {autoRules.length === 0 ? (
              <EmptyState
                icon={Zap}
                title="No Auto Assignments Configured"
                description="Configure an auto-assignment rule above to automatically assign compulsory courses to all learners."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Training Course</th>
                      <th className="px-4 py-3">Coverage</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Created Date</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {autoRules.slice(0, 3).map((rule) => (
                      <tr key={rule._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-sm text-slate-900">
                            {rule.trainingId?.title || 'Training Course'}
                          </div>
                          <div className="text-xs font-medium text-indigo-600">
                            {rule.trainingId?.category?.name || 'Compulsory'}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-slate-700">
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200">
                            {rule.coverageCount || 0} Learners
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          {isRuleActive(rule) ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5 animate-pulse" />
                              ACTIVE
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                              DEACTIVATED
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-slate-500">
                          {new Date(rule.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            disabled={togglingRuleIds.has(rule._id || rule.id)}
                            onClick={() => handleToggleAutoRule(rule)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors inline-flex items-center cursor-pointer disabled:opacity-50 ${
                              isRuleActive(rule)
                                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                            }`}
                            title={isRuleActive(rule) ? 'Deactivate auto-assignment' : 'Activate auto-assignment'}
                          >
                            {isRuleActive(rule) ? (
                              <>
                                <Power className="w-3.5 h-3.5 mr-1 text-rose-600" /> Deactivate
                              </>
                            ) : (
                              <>
                                <Zap className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Activate
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* TAB 2: TARGETED ASSIGNMENT */}
      {/* ================================================== */}
      {activeTab === 'targeted' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6 animate-fade-in">
          <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base font-heading">
                Targeted Training Assignment
              </h3>
              <p className="text-xs text-slate-500">
                Assign training to learners based on groups, roles, or individual selection.
              </p>
            </div>
          </div>

          {trainings.length === 0 ? (
            <EmptyState
              icon={AlertTriangle}
              title="No Published Trainings Available"
              description="You must publish at least one training course before dispatching targeted assignments."
            />
          ) : (
            <form onSubmit={handleTargetedSubmit} className="space-y-6 max-w-4xl">
              {/* STEP 1: Select Training */}
              <div className="space-y-2 p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-700">
                  STEP 1 — Select Published Training Course <span className="text-rose-500">*</span>
                </label>
                <CourseSelectDropdown
                  trainings={trainings}
                  value={targetedTrainingId}
                  onChange={(id) => setTargetedTrainingId(id)}
                  placeholder="Choose Published Course"
                  required
                  accentColor="emerald"
                />
              </div>

              {/* STEP 2: Assignment Target Mode */}
              <div className="space-y-4 p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-700">
                  STEP 2 — Choose Assignment Target Criteria *
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option A Card */}
                  <div
                    onClick={() => setTargetMode('dept_role')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      targetMode === 'dept_role'
                        ? 'bg-emerald-50/80 border-emerald-600 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-slate-900 flex items-center">
                        <Building2 className="w-4 h-4 mr-2 text-emerald-600" />
                        Option A: Group & Subgroup Match
                      </span>
                      <input
                        type="radio"
                        name="targetMode"
                        checked={targetMode === 'dept_role'}
                        onChange={() => setTargetMode('dept_role')}
                        className="w-4 h-4 text-emerald-600 cursor-pointer"
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      Assign this course to all learners matching a group and subgroup.
                    </p>
                  </div>

                  {/* Option B Card */}
                  <div
                    onClick={() => setTargetMode('individual')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      targetMode === 'individual'
                        ? 'bg-emerald-50/80 border-emerald-600 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-slate-900 flex items-center">
                        <Users className="w-4 h-4 mr-2 text-teal-600" />
                        Option B: Individual Learner Selection
                      </span>
                      <input
                        type="radio"
                        name="targetMode"
                        checked={targetMode === 'individual'}
                        onChange={() => setTargetMode('individual')}
                        className="w-4 h-4 text-emerald-600 cursor-pointer"
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      Select one or more specific learners from a searchable list.
                    </p>
                  </div>
                </div>

                {/* STEP 3: Configure Target Fields */}
                {targetMode === 'dept_role' ? (
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="min-w-0 w-full">
                        <label htmlFor="target-group-select" className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Select Group *
                        </label>
                        <CustomSelectDropdown
                          id="target-group-select"
                          options={departments.map(d => ({ value: d._id, label: d.name }))}
                          value={departmentId}
                          onChange={handleDeptChange}
                          placeholder="Choose Group"
                          required={targetMode === 'dept_role'}
                          accentColor="emerald"
                        />
                      </div>

                      <div className="min-w-0 w-full">
                        <label htmlFor="target-role-select" className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Select Subgroup *
                        </label>
                        <CustomSelectDropdown
                          id="target-role-select"
                          options={
                            !departmentId
                              ? []
                              : [
                                  { value: 'ALL_ROLES', label: 'All Subgroups in Group' },
                                  ...availableJobRoles.map(r => ({ value: r, label: r }))
                                ]
                          }
                          value={jobRole}
                          onChange={(val) => setJobRole(val)}
                          placeholder="Select Subgroup"
                          disabled={!departmentId}
                          disabledPlaceholder="Select Group First"
                          required={targetMode === 'dept_role'}
                          accentColor="indigo"
                        />
                      </div>
                    </div>

                    {departmentId && (
                      <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
                        matchedDeptRoleEmployees.length > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        <span className="flex items-center">
                          <Users className="w-4 h-4 mr-2" />
                          Matched Active Learners:
                        </span>
                        <span className="font-bold text-sm">{matchedDeptRoleEmployees.length} Learners</span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Option B: Individual Selection Card */
                  <div className="space-y-3 pt-2">
                    <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center">
                          <Users className="w-4 h-4 mr-1.5 text-indigo-600" />
                          Select Learners ({selectedEmployeeIds.length} Selected)
                        </h4>

                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={handleSelectAllEmployees}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 cursor-pointer"
                          >
                            Select All Filtered
                          </button>
                          <button
                            type="button"
                            onClick={handleClearEmployeeSelection}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
                          >
                            Clear Selection
                          </button>
                        </div>
                      </div>

                      {/* Search Input */}
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          value={employeeSearch}
                          onChange={(e) => setEmployeeSearch(e.target.value)}
                          placeholder="Search learners by name, email, group, or subgroup..."
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs focus:border-indigo-600 outline-none"
                        />
                      </div>

                      {/* Deactivated User Inline Warning Banner */}
                      {deactivatedWarning && (
                        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between animate-fade-in">
                          <div className="flex items-center space-x-2">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>{deactivatedWarning}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDeactivatedWarning('')}
                            className="text-rose-500 hover:text-rose-700 text-xs cursor-pointer font-bold px-1"
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      {/* Employee List with Checkboxes */}
                      <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                        {filteredEmployeesForSelection.length === 0 ? (
                          <p className="text-xs text-slate-400 text-center py-6">No matching learners found.</p>
                        ) : (
                          filteredEmployeesForSelection.map((emp) => {
                            const isSelected = selectedEmployeeIds.includes(emp._id);
                            const isDeactivated = emp.status && emp.status.toLowerCase() !== 'active';
                            return (
                              <div
                                key={emp._id}
                                onClick={() => handleToggleEmployee(emp._id)}
                                className={`p-3 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                                  isDeactivated
                                    ? 'bg-slate-50/70 opacity-75 hover:bg-rose-50/40'
                                    : isSelected
                                    ? 'bg-indigo-50'
                                    : 'hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex items-center space-x-3">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    disabled={isDeactivated}
                                    onChange={() => handleToggleEmployee(emp._id)}
                                    className="w-4 h-4 text-indigo-600 rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                                  />
                                  <img
                                    src={emp.profilePicture || `https://api.dicebear.com/7.x/initials/svg?seed=${emp.name}`}
                                    alt={emp.name}
                                    className="w-8 h-8 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0"
                                  />
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <p className={`font-bold ${isDeactivated ? 'text-slate-600 line-through' : 'text-slate-900'}`}>{emp.name}</p>
                                      {isDeactivated && (
                                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200">
                                          Deactivated
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-500">{emp.email}</p>
                                  </div>
                                </div>

                                <div className="text-right text-[11px]">
                                  <p className="font-semibold text-indigo-600">
                                    {emp.departmentId?.name || 'No Group'}
                                  </p>
                                  <p className="text-slate-400">{emp.jobRole || 'No Subgroup'}</p>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 3: Completion Deadline */}
              <div className="space-y-2 p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-700">
                    STEP 3 — Custom Completion Deadline (Optional)
                  </label>
                  <span className="text-[10px] text-slate-400">Today or future date</span>
                </div>
                <input
                  type="date"
                  min={getMinDateString()}
                  value={customDeadline}
                  onChange={handleDateChange}
                  className={`w-full px-4 py-2.5 rounded-xl border bg-white text-sm text-slate-900 outline-none transition-all ${
                    dateError
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                      : 'border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'
                  }`}
                />
                {dateError ? (
                  <p className="text-xs text-rose-500 font-medium flex items-center gap-1.5 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {dateError}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">
                    If left blank, the default deadline (30 days) will be automatically applied.
                  </p>
                )}
              </div>

              {/* STEP 4: Dispatch Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submittingTargeted}
                  className="py-3 px-6 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all inline-flex items-center justify-center cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4 mr-2" />
                  {submittingTargeted ? 'Dispatching Training Assignment...' : 'Dispatch Training Assignment'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* SECTION 4: RECENT DISPATCHED ASSIGNMENTS (FULL-WIDTH BELOW FORMS) */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base font-heading">
                Recent Dispatched Assignments
              </h3>
              <p className="text-xs text-slate-500">
                Real-time log of assigned training courses across learners
                {groupedAssignments.length > 3 ? ` (Showing latest 3 of ${groupedAssignments.length})` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-slate-500 font-semibold">
              {existingAssignments.length} Assignments Dispatched
            </span>
            <button
              type="button"
              onClick={() => {
                setAssignmentsSearch('');
                setAssignmentsStatusFilter('all');
                setAssignmentsPage(1);
                setShowAllAssignmentsModal(true);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors inline-flex items-center cursor-pointer shadow-2xs"
            >
              <Eye className="w-3.5 h-3.5 mr-1.5" />
              View All
            </button>
          </div>
        </div>

        {groupedAssignments.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No Dispatched Assignments"
            description="Dispatched training assignments will appear here in real time."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Training Course</th>
                  <th className="px-4 py-3">Assigned Learner</th>
                  <th className="px-4 py-3">Target Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Deadline</th>
                  <th className="px-4 py-3 text-right">Assigned Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groupedAssignments.slice(0, 3).map((a) => (
                  <tr key={a._id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Course */}
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-sm text-slate-900">
                        {a.trainingId?.title || 'Course'}
                      </div>
                      <div className="text-xs font-medium text-indigo-600">
                        {a.trainingId?.categoryId?.name || a.trainingId?.category?.name || 'General'}
                      </div>
                    </td>

                    {/* Assigned Learner */}
                    <td className="px-4 py-3.5">
                      {a.isBulkAuto ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBulkGroup(a);
                            setBulkLearnersSearch('');
                            setBulkLearnersPage(1);
                          }}
                          className="group flex items-center space-x-2.5 text-left p-1.5 -m-1.5 rounded-xl hover:bg-indigo-50/90 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                          title="Click to view all assigned learners"
                        >
                          <div className="w-7 h-7 rounded-lg bg-indigo-100 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <Users className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm text-indigo-600 group-hover:text-indigo-800 underline decoration-indigo-300 underline-offset-2 decoration-1 group-hover:decoration-2 transition-all">
                                All Learners
                              </span>
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                                {a.assignments.length} Learners
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 group-hover:text-indigo-600/80 transition-colors">
                              Click to view details
                            </p>
                          </div>
                        </button>
                      ) : (
                        <div className="flex items-center space-x-2.5">
                          <img
                            src={
                              a.employeeId?.profilePicture ||
                              `https://api.dicebear.com/7.x/initials/svg?seed=${a.employeeId?.name}`
                            }
                            alt={a.employeeId?.name}
                            className="w-7 h-7 rounded-lg object-cover border border-slate-200 bg-slate-100 shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-slate-900">{a.employeeId?.name || 'Learner'}</p>
                              {a.employeeId?.status && a.employeeId.status.toLowerCase() !== 'active' && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                                  Deactivated
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400">{a.employeeId?.email}</p>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Target Type */}
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {formatAssignmentType(a.assignmentType)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      {a.isBulkAuto ? (
                        (() => {
                          const completed = a.assignments.filter((x) => x.status === 'Completed').length;
                          const inProg = a.assignments.filter((x) => x.status === 'In Progress').length;
                          const overdue = a.assignments.filter((x) => x.status === 'Overdue').length;
                          const assigned = a.assignments.filter((x) => x.status === 'Assigned' || !x.status).length;

                          if (completed === a.assignments.length) {
                            return (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Completed ({a.assignments.length})
                              </span>
                            );
                          }
                          if (assigned === a.assignments.length) {
                            return (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                                Assigned ({a.assignments.length})
                              </span>
                            );
                          }
                          return (
                            <div className="flex flex-wrap items-center gap-1">
                              {completed > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {completed} Completed
                                </span>
                              )}
                              {inProg > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                                  {inProg} In Progress
                                </span>
                              )}
                              {assigned > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                                  {assigned} Assigned
                                </span>
                              )}
                              {overdue > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                                  {overdue} Overdue
                                </span>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            a.status === 'Completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : a.status === 'In Progress'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : a.status === 'Overdue'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {a.status || 'Assigned'}
                        </span>
                      )}
                    </td>

                    {/* Deadline */}
                    <td className="px-4 py-3.5 font-medium text-slate-700">
                      <span className="inline-flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        {formatDate(a.deadline)}
                      </span>
                    </td>

                    {/* Assigned Date */}
                    <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-500">
                      {formatDate(a.createdAt || a.assignedDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================================================== */}
      {/* MODAL: VIEW ALL CONFIGURED AUTO-ASSIGNMENT RULES */}
      {/* ================================================== */}
      <Modal
        isOpen={showAllAutoRulesModal}
        onClose={() => setShowAllAutoRulesModal(false)}
        title="All Configured Auto-Assignment Rules"
        maxWidth="max-w-4xl"
        closeOnBackdropClick={false}
        closeOnEscape={false}
        showCloseButton={true}
      >
        <div className="space-y-4">
          {/* Header Controls: Search + Filter Pills */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={autoRulesSearch}
                onChange={(e) => {
                  setAutoRulesSearch(e.target.value);
                  setAutoRulesPage(1);
                }}
                placeholder="Search by training course or category..."
                className="w-full pl-9 pr-8 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50 hover:bg-white transition-colors"
              />
              {autoRulesSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setAutoRulesSearch('');
                    setAutoRulesPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setAutoRulesStatusFilter('all');
                  setAutoRulesPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  autoRulesStatusFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                All ({autoRules.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setAutoRulesStatusFilter('active');
                  setAutoRulesPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                  autoRulesStatusFilter === 'active'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Active ({activeAutoRulesCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setAutoRulesStatusFilter('deactivated');
                  setAutoRulesPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  autoRulesStatusFilter === 'deactivated'
                    ? 'bg-slate-700 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
                }`}
              >
                Deactivated ({deactivatedAutoRulesCount})
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            {filteredAutoRules.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-700">No matching auto-assignment rules</p>
                <p className="text-xs text-slate-400 mt-1">
                  Try adjusting your search query or filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[50vh]">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold text-[11px] border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 bg-slate-50">Training Course</th>
                      <th className="px-4 py-3 bg-slate-50">Coverage</th>
                      <th className="px-4 py-3 bg-slate-50">Status</th>
                      <th className="px-4 py-3 bg-slate-50">Created Date</th>
                      <th className="px-4 py-3 bg-slate-50 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedAutoRules.map((rule) => (
                      <tr key={rule._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-sm text-slate-900">
                            {rule.trainingId?.title || 'Training Course'}
                          </div>
                          <div className="text-xs font-medium text-indigo-600">
                            {rule.trainingId?.category?.name || 'Compulsory'}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-slate-700">
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200">
                            {rule.coverageCount || 0} Learners
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          {isRuleActive(rule) ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5 animate-pulse" />
                              ACTIVE
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                              DEACTIVATED
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-slate-500">
                          {new Date(rule.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            disabled={togglingRuleIds.has(rule._id || rule.id)}
                            onClick={() => handleToggleAutoRule(rule)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors inline-flex items-center cursor-pointer disabled:opacity-50 ${
                              isRuleActive(rule)
                                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                            }`}
                            title={isRuleActive(rule) ? 'Deactivate auto-assignment' : 'Activate auto-assignment'}
                          >
                            {isRuleActive(rule) ? (
                              <>
                                <Power className="w-3.5 h-3.5 mr-1 text-rose-600" /> Deactivate
                              </>
                            ) : (
                              <>
                                <Zap className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Activate
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {filteredAutoRules.length > autoRulesPerPage && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
              <span>
                Showing {(autoRulesPage - 1) * autoRulesPerPage + 1} to{' '}
                {Math.min(autoRulesPage * autoRulesPerPage, filteredAutoRules.length)} of{' '}
                {filteredAutoRules.length} rules
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  disabled={autoRulesPage === 1}
                  onClick={() => setAutoRulesPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-semibold text-slate-700 px-1">
                  Page {autoRulesPage} of {totalAutoRulePages}
                </span>
                <button
                  type="button"
                  disabled={autoRulesPage === totalAutoRulePages}
                  onClick={() => setAutoRulesPage((p) => Math.min(totalAutoRulePages, p + 1))}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ================================================== */}
      {/* MODAL: VIEW ALL DISPATCHED ASSIGNMENTS */}
      {/* ================================================== */}
      <Modal
        isOpen={showAllAssignmentsModal}
        onClose={() => setShowAllAssignmentsModal(false)}
        title="All Dispatched Training Assignments"
        maxWidth="max-w-5xl"
        closeOnBackdropClick={false}
        closeOnEscape={false}
        showCloseButton={true}
      >
        <div className="space-y-4">
          {/* Header Controls: Search + Filter Pills */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={assignmentsSearch}
                onChange={(e) => {
                  setAssignmentsSearch(e.target.value);
                  setAssignmentsPage(1);
                }}
                placeholder="Search by course title, learner name, or email..."
                className="w-full pl-9 pr-8 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-slate-50/50 hover:bg-white transition-colors"
              />
              {assignmentsSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setAssignmentsSearch('');
                    setAssignmentsPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setAssignmentsStatusFilter('all');
                  setAssignmentsPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  assignmentsStatusFilter === 'all'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                All ({existingAssignments.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setAssignmentsStatusFilter('Assigned');
                  setAssignmentsPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  assignmentsStatusFilter === 'Assigned'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                }`}
              >
                Assigned ({existingAssignments.filter((a) => a.status === 'Assigned').length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setAssignmentsStatusFilter('Completed');
                  setAssignmentsPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  assignmentsStatusFilter === 'Completed'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                }`}
              >
                Completed ({existingAssignments.filter((a) => a.status === 'Completed').length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setAssignmentsStatusFilter('Overdue');
                  setAssignmentsPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  assignmentsStatusFilter === 'Overdue'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                }`}
              >
                Overdue ({existingAssignments.filter((a) => a.status === 'Overdue').length})
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            {filteredAssignments.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-700">No matching assignments found</p>
                <p className="text-xs text-slate-400 mt-1">
                  Try adjusting your search query or filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[50vh]">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 font-bold tracking-wider border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 bg-slate-50">Training Course</th>
                      <th className="px-4 py-3 bg-slate-50">Assigned Learner</th>
                      <th className="px-4 py-3 bg-slate-50">Target Type</th>
                      <th className="px-4 py-3 bg-slate-50">Status</th>
                      <th className="px-4 py-3 bg-slate-50">Deadline</th>
                      <th className="px-4 py-3 bg-slate-50 text-right">Assigned Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedAssignments.map((a) => (
                      <tr key={a._id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Course */}
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-sm text-slate-900">
                            {a.trainingId?.title || 'Course'}
                          </div>
                          <div className="text-xs font-medium text-indigo-600">
                            {a.trainingId?.categoryId?.name || 'General'}
                          </div>
                        </td>

                        {/* Assigned Learner */}
                        <td className="px-4 py-3.5">
                          {a.isBulkAuto ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBulkGroup(a);
                                setBulkLearnersSearch('');
                                setBulkLearnersPage(1);
                              }}
                              className="group flex items-center space-x-2.5 text-left p-1.5 -m-1.5 rounded-xl hover:bg-indigo-50/90 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                              title="Click to view all assigned learners"
                            >
                              <div className="w-7 h-7 rounded-lg bg-indigo-100 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <Users className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-sm text-indigo-600 group-hover:text-indigo-800 underline decoration-indigo-300 underline-offset-2 decoration-1 group-hover:decoration-2 transition-all">
                                    All Learners
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                                    {a.assignments.length} Learners
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400 group-hover:text-indigo-600/80 transition-colors">
                                  Click to view details
                                </p>
                              </div>
                            </button>
                          ) : (
                            <div className="flex items-center space-x-2.5">
                              <img
                                src={
                                  a.employeeId?.profilePicture ||
                                  `https://api.dicebear.com/7.x/initials/svg?seed=${a.employeeId?.name}`
                                }
                                alt={a.employeeId?.name}
                                className="w-7 h-7 rounded-lg object-cover border border-slate-200 bg-slate-100 shrink-0"
                              />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="font-bold text-slate-900">{a.employeeId?.name || 'Learner'}</p>
                                  {a.employeeId?.status && a.employeeId.status.toLowerCase() !== 'active' && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                                      Deactivated
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-400">{a.employeeId?.email}</p>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Target Type */}
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {formatAssignmentType(a.assignmentType)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5">
                          {a.isBulkAuto ? (
                            (() => {
                              const completed = a.assignments.filter((x) => x.status === 'Completed').length;
                              const inProg = a.assignments.filter((x) => x.status === 'In Progress').length;
                              const overdue = a.assignments.filter((x) => x.status === 'Overdue').length;
                              const assigned = a.assignments.filter((x) => x.status === 'Assigned' || !x.status).length;

                              if (completed === a.assignments.length) {
                                return (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Completed ({a.assignments.length})
                                  </span>
                                );
                              }
                              if (assigned === a.assignments.length) {
                                return (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                                    Assigned ({a.assignments.length})
                                  </span>
                                );
                              }
                              return (
                                <div className="flex flex-wrap items-center gap-1">
                                  {completed > 0 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      {completed} Completed
                                    </span>
                                  )}
                                  {inProg > 0 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                                      {inProg} In Progress
                                    </span>
                                  )}
                                  {assigned > 0 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                                      {assigned} Assigned
                                    </span>
                                  )}
                                  {overdue > 0 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                                      {overdue} Overdue
                                    </span>
                                  )}
                                </div>
                              );
                            })()
                          ) : (
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                a.status === 'Completed'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : a.status === 'In Progress'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : a.status === 'Overdue'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {a.status || 'Assigned'}
                            </span>
                          )}
                        </td>

                        {/* Deadline */}
                        <td className="px-4 py-3.5 font-medium text-slate-700">
                          <span className="inline-flex items-center">
                            <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                            {formatDate(a.deadline)}
                          </span>
                        </td>

                        {/* Assigned Date */}
                        <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-500">
                          {formatDate(a.createdAt || a.assignedDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {filteredAssignments.length > assignmentsPerPage && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
              <span>
                Showing {(assignmentsPage - 1) * assignmentsPerPage + 1} to{' '}
                {Math.min(assignmentsPage * assignmentsPerPage, filteredAssignments.length)} of{' '}
                {filteredAssignments.length} assignments
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  disabled={assignmentsPage === 1}
                  onClick={() => setAssignmentsPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-semibold text-slate-700 px-1">
                  Page {assignmentsPage} of {totalAssignmentPages}
                </span>
                <button
                  type="button"
                  disabled={assignmentsPage === totalAssignmentPages}
                  onClick={() => setAssignmentsPage((p) => Math.min(totalAssignmentPages, p + 1))}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ================================================== */}
      {/* MODAL: ALL LEARNERS DETAILS (BULK AUTO ASSIGNMENT) */}
      {/* ================================================== */}
      {selectedBulkGroup && (
        <Modal
          isOpen={!!selectedBulkGroup}
          onClose={() => setSelectedBulkGroup(null)}
          title={`All Learners · ${selectedBulkGroup.trainingId?.title || 'Training Course'}`}
          maxWidth="max-w-4xl"
          closeOnBackdropClick={false}
          closeOnEscape={false}
          showCloseButton={true}
          zIndex="z-[10001]"
        >
          <div className="space-y-4">
            {/* Header Controls: Total Count + Live Search */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 inline-flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-600" />
                  Total Assigned Learners: <strong>{selectedBulkGroup.assignments?.length || 0}</strong>
                </span>
                {selectedBulkGroup.deadline && (
                  <span className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Deadline: {formatDate(selectedBulkGroup.deadline)}
                  </span>
                )}
              </div>

              {/* Search input */}
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={bulkLearnersSearch}
                  onChange={(e) => {
                    setBulkLearnersSearch(e.target.value);
                    setBulkLearnersPage(1);
                  }}
                  placeholder="Search learner by name or email..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50 hover:bg-white transition-colors"
                />
                {bulkLearnersSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setBulkLearnersSearch('');
                      setBulkLearnersPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Learners Table Container */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              {filteredBulkLearners.length === 0 ? (
                <div className="py-12 px-4 text-center">
                  <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No learners found</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Try adjusting your search query.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[50vh]">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 font-bold tracking-wider border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 bg-slate-50">Learner Name</th>
                        <th className="px-4 py-3 bg-slate-50">Email Address</th>
                        <th className="px-4 py-3 bg-slate-50">Assignment Status</th>
                        <th className="px-4 py-3 bg-slate-50">Deadline</th>
                        <th className="px-4 py-3 bg-slate-50 text-right">Assigned Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedBulkLearners.map((item) => (
                        <tr key={item._id || item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center space-x-2.5">
                              <img
                                src={
                                  item.employeeId?.profilePicture ||
                                  `https://api.dicebear.com/7.x/initials/svg?seed=${item.employeeId?.name}`
                                }
                                alt={item.employeeId?.name}
                                className="w-7 h-7 rounded-lg object-cover border border-slate-200 bg-slate-100 shrink-0"
                              />
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900">{item.employeeId?.name || 'Learner'}</span>
                                {item.employeeId?.status && item.employeeId.status.toLowerCase() !== 'active' && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                                    Deactivated
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500 font-mono">
                            {item.employeeId?.email || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                item.status === 'Completed'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : item.status === 'In Progress'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : item.status === 'Overdue'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {item.status || 'Assigned'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-700">
                            <span className="inline-flex items-center">
                              <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                              {formatDate(item.deadline)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-slate-500">
                            {formatDate(item.createdAt || item.assignedDate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {filteredBulkLearners.length > bulkLearnersPerPage && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                <span>
                  Showing {(bulkLearnersPage - 1) * bulkLearnersPerPage + 1} to{' '}
                  {Math.min(bulkLearnersPage * bulkLearnersPerPage, filteredBulkLearners.length)} of{' '}
                  {filteredBulkLearners.length} learners
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    disabled={bulkLearnersPage === 1}
                    onClick={() => setBulkLearnersPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-semibold text-slate-700 px-1">
                    Page {bulkLearnersPage} of {totalBulkPages}
                  </span>
                  <button
                    type="button"
                    disabled={bulkLearnersPage === totalBulkPages}
                    onClick={() => setBulkLearnersPage((p) => Math.min(totalBulkPages, p + 1))}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* CONFIRMATION MODAL: DEACTIVATE AUTO-ASSIGNMENT */}
      {showDeactivateModal && selectedRule && (
        <Modal
          isOpen={showDeactivateModal}
          onClose={() => !submittingRuleAction && setShowDeactivateModal(false)}
          title="Deactivate Auto-Assignment?"
          zIndex="z-[10001]"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs space-y-1">
              <span className="font-bold text-rose-700 uppercase text-[10px] tracking-wider">
                Compulsory Training Rule
              </span>
              <h4 className="text-sm font-extrabold text-slate-900">
                {selectedRule.trainingId?.title || 'Course'}
              </h4>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Future eligible learners will no longer receive this training automatically while this rule is inactive.
            </p>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
              <button
                type="button"
                disabled={submittingRuleAction}
                onClick={() => setShowDeactivateModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingRuleAction}
                onClick={handleConfirmDeactivate}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 shadow-xs cursor-pointer inline-flex items-center"
              >
                <Power className="w-3.5 h-3.5 mr-1.5" />
                {submittingRuleAction ? 'Deactivating...' : 'Deactivate'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* CONFIRMATION MODAL: REACTIVATE AUTO-ASSIGNMENT */}
      {showReactivateModal && selectedRule && (
        <Modal
          isOpen={showReactivateModal}
          onClose={() => !submittingRuleAction && setShowReactivateModal(false)}
          title="Reactivate Auto-Assignment?"
          zIndex="z-[10001]"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
              <span className="font-bold text-emerald-700 uppercase text-[10px] tracking-wider">
                Compulsory Training Rule
              </span>
              <h4 className="text-sm font-extrabold text-slate-900">
                {selectedRule.trainingId?.title || 'Course'}
              </h4>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This will reactivate automatic assignment for this training for future eligible learners.
            </p>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
              <button
                type="button"
                disabled={submittingRuleAction}
                onClick={() => setShowReactivateModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingRuleAction}
                onClick={handleConfirmReactivate}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs cursor-pointer inline-flex items-center"
              >
                <Zap className="w-3.5 h-3.5 mr-1.5" />
                {submittingRuleAction ? 'Reactivating...' : 'Reactivate'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

