/**
 * Client-side user & instructor form validation rules and password strength evaluations
 */

export const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password12', 'password123', 'password1234', '12345678', '123456789',
  '1234567890', 'qwerty123', 'qwertyuiop', 'admin123', 'admin1234', 'admin@123',
  'welcome123', 'welcome1', 'letmein123', 'letmein1', 'iloveyou', 'sunshine',
  'princess', 'football', 'monkey123', 'dragon123', 'master123', 'changeme',
  'pass1234', 'p@ssword', 'p@ssw0rd', 'p@ssword1', 'p@ssw0rd1', 'p@ssword123',
  'lmsadmin', 'lmsadmin123', 'instructor123', 'instructor1', 'test1234'
]);

export const NAME_REGEX = /^[a-zA-ZÀ-ÿ\u0100-\u024F\u1E00-\u1EFF'’.\s-]+$/;
export const LETTER_REGEX = /[a-zA-ZÀ-ÿ\u0100-\u024F\u1E00-\u1EFF]/g;
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Validates Full Name
 * @param {string} name
 * @returns {string|null} Error string or null
 */
export function validateName(name) {
  if (!name || typeof name !== 'string') {
    return 'Full name is required';
  }
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return 'Full name is required and cannot be whitespace only';
  }
  if (trimmed.length < 2) {
    return 'Full name must be at least 2 characters long';
  }
  if (trimmed.length > 100) {
    return 'Full name must not exceed 100 characters';
  }
  if (!NAME_REGEX.test(trimmed)) {
    return 'Full name can only contain letters, spaces, hyphens, periods, and apostrophes';
  }
  const letters = trimmed.match(LETTER_REGEX);
  if (!letters || letters.length < 2) {
    return 'Full name must contain at least 2 alphabetic letters';
  }
  if (/[-'.’]{2,}/.test(trimmed)) {
    return 'Full name cannot contain consecutive punctuation marks';
  }
  if (trimmed.split(/\s+/).some((part) => part.length > 35)) {
    return 'Name parts cannot exceed 35 characters';
  }
  return null;
}

/**
 * Validates Email Address
 * @param {string} email
 * @param {string[]} [existingEmails] optional list of existing emails in organization
 * @returns {string|null} Error string or null
 */
export function validateEmail(email, existingEmails = []) {
  if (!email || typeof email !== 'string') {
    return 'Email address is required';
  }
  const trimmed = email.trim();
  if (trimmed.length === 0) {
    return 'Email address is required';
  }
  if (trimmed.length > 254) {
    return 'Email address cannot exceed 254 characters';
  }
  if (!EMAIL_REGEX.test(trimmed) || trimmed.includes('..')) {
    return 'Please enter a valid email address (e.g. name@company.com)';
  }
  const lower = trimmed.toLowerCase();
  if (existingEmails.some((e) => (e || '').toLowerCase() === lower)) {
    return 'An account with this email address already exists';
  }
  return null;
}

/**
 * Evaluates password strength and requirements breakdown
 * @param {string} password
 * @param {Object} [context] { name, email }
 */
export function evaluatePasswordStrength(password = '', context = {}) {
  const pwd = password || '';
  const lowerPass = pwd.toLowerCase();

  const lengthMet = pwd.length >= 8 && pwd.length <= 100;
  const uppercaseMet = /[A-Z]/.test(pwd);
  const lowercaseMet = /[a-z]/.test(pwd);
  const numberMet = /[0-9]/.test(pwd);
  const specialMet = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd);

  let notCommonMet = true;
  if (COMMON_PASSWORDS.has(lowerPass)) {
    notCommonMet = false;
  }
  if (context.name && typeof context.name === 'string') {
    const parts = context.name.trim().toLowerCase().split(/\s+/);
    for (const part of parts) {
      if (part.length >= 3 && lowerPass.includes(part)) {
        notCommonMet = false;
        break;
      }
    }
  }
  if (context.email && typeof context.email === 'string') {
    const emailPrefix = context.email.trim().toLowerCase().split('@')[0];
    if (emailPrefix.length >= 3 && lowerPass.includes(emailPrefix)) {
      notCommonMet = false;
    }
  }

  const requirements = [
    { id: 'length', label: 'At least 8 characters', met: lengthMet },
    { id: 'uppercase', label: 'One uppercase letter (A-Z)', met: uppercaseMet },
    { id: 'lowercase', label: 'One lowercase letter (a-z)', met: lowercaseMet },
    { id: 'number', label: 'One number (0-9)', met: numberMet },
    { id: 'special', label: 'One special symbol (!@#$%^&*)', met: specialMet },
    { id: 'notCommon', label: 'Not a common or guessable password', met: notCommonMet }
  ];

  const metCount = requirements.filter((r) => r.met).length;

  let score = 0;
  let label = 'Too Weak';
  let color = 'rose';

  if (pwd.length === 0) {
    score = 0;
    label = 'Enter Password';
    color = 'slate';
  } else if (!lengthMet || metCount <= 2) {
    score = 1;
    label = 'Weak';
    color = 'rose';
  } else if (metCount <= 4) {
    score = 2;
    label = 'Fair';
    color = 'amber';
  } else if (metCount === 5) {
    score = 3;
    label = 'Good';
    color = 'teal';
  } else {
    score = 4;
    label = 'Strong';
    color = 'emerald';
  }

  return {
    score,
    label,
    color,
    requirements,
    allMet: metCount === requirements.length
  };
}

/**
 * Validates Password against Organization Security Policy
 * @param {string} password
 * @param {Object} [context]
 * @returns {string|null}
 */
export function validatePassword(password, context = {}) {
  if (!password || typeof password !== 'string') {
    return 'Password is required';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (password.length > 100) {
    return 'Password cannot exceed 100 characters';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter (A-Z)';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter (a-z)';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number (0-9)';
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    return 'Password must contain at least one special character (!@#$%^&*...)';
  }

  const lowerPass = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lowerPass)) {
    return 'This password is too common and easily guessable. Please choose a stronger password.';
  }

  if (context.name && typeof context.name === 'string') {
    const parts = context.name.trim().toLowerCase().split(/\s+/);
    for (const part of parts) {
      if (part.length >= 3 && lowerPass.includes(part)) {
        return 'Password cannot contain your name';
      }
    }
  }

  if (context.email && typeof context.email === 'string') {
    const emailPrefix = context.email.trim().toLowerCase().split('@')[0];
    if (emailPrefix.length >= 3 && lowerPass.includes(emailPrefix)) {
      return 'Password cannot contain your email username';
    }
  }

  return null;
}

/**
 * Validates Assigned Group selection
 * @param {string} departmentId
 * @param {Array} availableDepartments
 * @returns {string|null}
 */
export function validateAssignedGroup(departmentId, availableDepartments = []) {
  if (!departmentId || departmentId.trim() === '') {
    return null; // Group is optional (can be general/unassigned)
  }
  const trimmed = departmentId.trim();
  const exists = availableDepartments.some(
    (d) => String(d._id || d.id) === trimmed
  );
  if (!exists) {
    return 'Selected group does not exist in your organization or you are not authorized to assign it';
  }
  return null;
}

// Valid group / department name characters: letters, numbers, spaces, hyphens, periods, apostrophes, ampersands, commas, parentheses, slashes
export const GROUP_NAME_REGEX = /^[a-zA-Z0-9À-ÿ\u0100-\u024F\u1E00-\u1EFF'’.,&/() -]+$/;
export const ALPHANUMERIC_REGEX = /[a-zA-Z0-9À-ÿ\u0100-\u024F\u1E00-\u1EFF]/g;

/**
 * Validates Group / Department Name
 * @param {string} name
 * @returns {string|null} Error string or null
 */
export function validateGroupName(name) {
  if (!name || typeof name !== 'string') {
    return 'Group name is required';
  }
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return 'Group name is required and cannot be empty or whitespace only';
  }
  if (trimmed.length < 2) {
    return 'Group name must be at least 2 characters long';
  }
  if (trimmed.length > 60) {
    return 'Group name must not exceed 60 characters';
  }
  if (!GROUP_NAME_REGEX.test(trimmed)) {
    return 'Group name contains invalid characters. Allowed: letters, numbers, spaces, hyphens, periods, ampersands, commas, parentheses, and slashes';
  }
  const alphanumeric = trimmed.match(ALPHANUMERIC_REGEX);
  if (!alphanumeric || alphanumeric.length < 2) {
    return 'Group name must contain at least 2 alphanumeric characters';
  }
  if (/[-'.’&/()]{3,}/.test(trimmed)) {
    return 'Group name cannot contain excessive consecutive punctuation marks';
  }
  if (trimmed.split(/\s+/).some((part) => part.length > 30)) {
    return 'Group name contains words that are excessively long (max 30 characters per word)';
  }
  return null;
}

/**
 * Validates Group / Department Description
 * @param {string} description
 * @returns {string|null} Error string or null
 */
export function validateGroupDescription(description) {
  if (description === undefined || description === null || description === '') {
    return null; // Optional
  }
  if (typeof description !== 'string') {
    return 'Group description must be a string';
  }
  const trimmed = description.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length > 300) {
    return 'Group description must not exceed 300 characters';
  }
  if (trimmed.split(/\s+/).some((part) => part.length > 45)) {
    return 'Group description contains words that are excessively long (max 45 characters per word)';
  }
  return null;
}

export const CATEGORY_NAME_REGEX = /^[a-zA-Z0-9À-ÿ\u0100-\u024F\u1E00-\u1EFF'’.,&/() -]+$/;

/**
 * Validates Course Category Name
 * @param {string} name
 * @returns {string|null} Error string or null
 */
export function validateCategoryName(name) {
  if (!name || typeof name !== 'string') {
    return 'Category name is required';
  }
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return 'Category name is required and cannot be empty or whitespace only';
  }
  if (trimmed.length < 2) {
    return 'Category name must be at least 2 characters long';
  }
  if (trimmed.length > 60) {
    return 'Category name must not exceed 60 characters';
  }
  if (!CATEGORY_NAME_REGEX.test(trimmed)) {
    return 'Category name contains invalid characters. Allowed: letters, numbers, spaces, hyphens, periods, ampersands, commas, parentheses, and slashes';
  }
  const alphanumeric = trimmed.match(ALPHANUMERIC_REGEX);
  if (!alphanumeric || alphanumeric.length < 2) {
    return 'Category name must contain at least 2 alphanumeric characters';
  }
  if (/[-'.’&/()]{3,}/.test(trimmed)) {
    return 'Category name cannot contain excessive consecutive punctuation marks';
  }
  if (trimmed.split(/\s+/).some((part) => part.length > 30)) {
    return 'Category name contains words that are excessively long (max 30 characters per word)';
  }
  return null;
}

/**
 * Validates Course Category Description
 * @param {string} description
 * @returns {string|null} Error string or null
 */
export function validateCategoryDescription(description) {
  if (description === undefined || description === null || description === '') {
    return null; // Optional
  }
  if (typeof description !== 'string') {
    return 'Category description must be a string';
  }
  const trimmed = description.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length > 300) {
    return 'Category description must not exceed 300 characters';
  }
  if (trimmed.split(/\s+/).some((part) => part.length > 45)) {
    return 'Category description contains words that are excessively long (max 45 characters per word)';
  }
  return null;
}

/**
 * Validates Training / Course Title
 * @param {string} title
 * @returns {string|null} Error string or null
 */
export function validateCourseTitle(title) {
  if (!title || typeof title !== 'string') {
    return 'Course title is required';
  }
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    return 'Course title is required and cannot be empty or whitespace only';
  }
  if (trimmed.length < 2) {
    return 'Course title must be at least 2 characters long';
  }
  if (trimmed.length > 100) {
    return 'Course title cannot exceed 100 characters';
  }
  return null;
}

