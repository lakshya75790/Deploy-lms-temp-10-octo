/**
 * Maps internal backend assignmentType enums to human-readable labels
 * - dept_role -> "Group & Subgroup"
 * - specific / individual -> "Individual Learners"
 * - auto / mandatory -> "All Learners (Automatic)"
 */
export const formatAssignmentType = (type) => {
  if (!type) return 'Unknown Target';
  const lower = String(type).toLowerCase();
  if (lower === 'dept_role') return 'Group & Subgroup';
  if (lower === 'specific' || lower === 'individual') return 'Individual Learners';
  if (lower === 'auto' || lower === 'mandatory') return 'All Learners (Automatic)';
  return type;
};

/**
 * Formats date strings to clean readable date e.g. "10 Sep 2026"
 */
export const formatDate = (dateInput) => {
  if (!dateInput) return 'N/A';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

/**
 * Formats audit log timestamps to clean date & time e.g. "Aug 11, 2026 · 5:59 PM"
 */
export const formatAuditDate = (dateInput) => {
  if (!dateInput) return 'N/A';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'N/A';
  const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${dateStr} · ${timeStr}`;
};

/**
 * Utility to format user-facing text references of Employee/Employees to Learner/Learners.
 * Preserves sentence casing and word boundaries.
 */
export const formatDisplayText = (text) => {
  if (!text || typeof text !== 'string') return text || '';
  return text
    .replace(/\bEmployees\b/g, 'Learners')
    .replace(/\bEmployee\b/g, 'Learner')
    .replace(/\bemployees\b/g, 'learners')
    .replace(/\bemployee\b/g, 'learner')
    .replace(/\bEMPLOYEES\b/g, 'LEARNERS')
    .replace(/\bEMPLOYEE\b/g, 'LEARNER')
    .replace(/\bDepartments\b/g, 'Groups')
    .replace(/\bDepartment\b/g, 'Group')
    .replace(/\bdepartments\b/g, 'groups')
    .replace(/\bdepartment\b/g, 'group')
    .replace(/\bDEPARTMENTS\b/g, 'GROUPS')
    .replace(/\bDEPARTMENT\b/g, 'GROUP')
    .replace(/\bJob Roles\b/g, 'Subgroups')
    .replace(/\bJob Role\b/g, 'Subgroup')
    .replace(/\bjob roles\b/g, 'subgroups')
    .replace(/\bjob role\b/g, 'subgroup');
};

/**
 * Maps backend audit action enums to human-readable titles
 */
export const formatAuditAction = (action) => {
  if (!action) return 'System Activity';
  const raw = String(action).trim();

  const actionMap = {
    CREATE_ORGANIZATION: 'Create Organization',
    UPDATE_ORGANIZATION_LICENSE_DATES: 'Update Organization License',
    CHANGE_PASSWORD: 'Change Password',
    CREATE_USER: 'Create User',
    UPDATE_USER: 'Update User',
    DELETE_USER: 'Delete User',
    REACTIVATE_AUTO_ASSIGNMENT_RULE: 'Reactivate Auto-Assignment Rule',
    DEACTIVATE_AUTO_ASSIGNMENT_RULE: 'Deactivate Auto-Assignment Rule',
    CREATE_AUTO_ASSIGNMENT_RULE: 'Create Auto-Assignment Rule',
    CREATE_TRAINING: 'Create Training',
    UPDATE_TRAINING: 'Update Training',
    DELETE_TRAINING: 'Delete Training',
    CREATE_EMPLOYEE: 'Create Learner',
    UPDATE_EMPLOYEE: 'Update Learner',
    DELETE_EMPLOYEE: 'Delete Learner',
    EMPLOYEE_CREATED: 'Learner Created',
    EMPLOYEE_UPDATED: 'Learner Updated',
    EMPLOYEE_DELETED: 'Learner Deleted',
    EMPLOYEE_ACTIVATED: 'Learner Activated',
    EMPLOYEE_DEACTIVATED: 'Learner Deactivated',
    EMPLOYEE_ASSIGNED: 'Learner Assigned',
    EMPLOYEE_ASSIGNED_TRAINING: 'Learner Assigned Training',
    EMPLOYEE_COMPLETED_TRAINING: 'Learner Completed Training',
    CREATE_INSTRUCTOR: 'Create Instructor',
    UPDATE_INSTRUCTOR: 'Update Instructor',
    DELETE_INSTRUCTOR: 'Delete Instructor',
    ASSIGN_TRAINING: 'Assign Training',
    SUBMIT_ASSIGNMENT: 'Submit Assignment',
    REVIEW_ASSIGNMENT: 'Review Assignment',
    LOCK_TRAINING: 'Lock Training Access',
    UNLOCK_TRAINING: 'Unlock Training Access',
    EXTEND_DEADLINE: 'Extend Training Deadline',
    LOGIN_SUCCESS: 'Successful Login',
    LOGIN_FAILED: 'Failed Login',
    SETUP_ORG: 'Organization Setup',
    CREATE_GROUP: 'Create Group',
    UPDATE_GROUP: 'Update Group',
    DELETE_GROUP: 'Delete Group',
    DEACTIVATE_GROUP: 'Deactivate Group',
    ACTIVATE_GROUP: 'Activate Group',
    GROUP_CREATED: 'Group Created',
    GROUP_UPDATED: 'Group Updated',
    GROUP_DELETED: 'Group Deleted',
    GROUP_DEACTIVATED: 'Group Deactivated',
    GROUP_ACTIVATED: 'Group Activated',
    CREATE_DEPARTMENT: 'Create Group',
    UPDATE_DEPARTMENT: 'Update Group',
    DELETE_DEPARTMENT: 'Delete Group',
    DEACTIVATE_DEPARTMENT: 'Deactivate Group',
    ACTIVATE_DEPARTMENT: 'Activate Group'
  };

  let result = actionMap[raw];

  if (!result) {
    // Fallback formatter: convert ALL_CAPS_UNDERSCORE to Title Case
    result = raw
      .toLowerCase()
      .split('_')
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  return formatDisplayText(result);
};

/**
 * Maps database model names to human-readable target entity titles
 */
export const formatTargetEntity = (targetType) => {
  if (!targetType) return 'General Resource';
  const raw = String(targetType).trim();

  const entityMap = {
    AutoAssignmentRule: 'Auto-Assignment Rule',
    TrainingAssignment: 'Training Assignment',
    AssignmentSubmission: 'Assignment Submission',
    Training: 'Training Course',
    User: 'User Profile',
    Department: 'Group',
    Departments: 'Groups',
    Group: 'Group',
    Groups: 'Groups',
    Role: 'Subgroup',
    Roles: 'Subgroups',
    Subgroup: 'Subgroup',
    Subgroups: 'Subgroups',
    Category: 'Training Category',
    Organization: 'Organization',
    Employee: 'Learner',
    Employees: 'Learners'
  };

  let result = entityMap[raw];

  if (!result) {
    // Fallback: split CamelCase into spaced words
    result = raw.replace(/([a-z])([A-Z])/g, '$1 $2');
  }

  return formatDisplayText(result);
};

/**
 * Safely format quiz duration to an integer followed by 'Mins'.
 * Clamps to 1-600 to prevent scientific notation (e.g., 1e+55) or invalid legacy values.
 */
export const formatQuizDuration = (duration, unit = 'Mins') => {
  if (duration === undefined || duration === null || duration === '') {
    return `15 ${unit}`;
  }
  const num = Number(duration);
  if (!Number.isFinite(num) || isNaN(num) || num < 1) {
    return `15 ${unit}`;
  }
  const clamped = Math.min(600, Math.max(1, Math.floor(num)));
  return `${clamped} ${unit}`;
};

/**
 * Sanitize quiz duration to a valid integer between 1 and 600.
 * Safely falls back to 15 for invalid legacy data.
 */
export const sanitizeQuizDuration = (duration) => {
  if (duration === undefined || duration === null || duration === '') return 15;
  const num = Number(duration);
  if (!Number.isFinite(num) || isNaN(num) || num < 1) return 15;
  if (num > 600) return 600;
  return Math.floor(num);
};

/**
 * Validates a quiz duration value against LMS constraints (1 to 600 minutes).
 * Rejects empty values, non-integers, negative/zero numbers, numbers > 600, and scientific notation.
 * Returns null if valid, or a descriptive error string if invalid.
 */
export const validateQuizDuration = (val) => {
  if (val === '' || val === null || val === undefined) {
    return 'Quiz duration is required';
  }
  const str = String(val).trim();
  if (str === '') {
    return 'Quiz duration is required';
  }
  // Check for scientific notation or invalid characters like 'e', 'E'
  if (/[eE]/.test(str)) {
    return 'Scientific notation is not allowed. Enter a whole number up to 600.';
  }
  if (str.includes('.')) {
    return 'Quiz duration must be a whole number of minutes (no decimals)';
  }
  const num = Number(str);
  if (!Number.isFinite(num) || isNaN(num)) {
    return 'Please enter a valid numeric duration';
  }
  if (!Number.isInteger(num)) {
    return 'Quiz duration must be a whole number';
  }
  if (num < 1) {
    return 'Quiz duration must be at least 1 minute';
  }
  if (num > 600) {
    return 'Quiz duration cannot exceed 600 minutes (maximum 10 hours)';
  }
  return null;
};

/**
 * Format raw byte size into human readable string e.g. "2.4 MB" or "512 KB"
 */
export const formatFileSize = (bytes) => {
  if (!bytes || isNaN(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};


