/**
 * Validation rules for user creation and management
 */

// List of common / compromised / easily guessable passwords
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password12', 'password123', 'password1234', '12345678', '123456789',
  '1234567890', 'qwerty123', 'qwertyuiop', 'admin123', 'admin1234', 'admin@123',
  'welcome123', 'welcome1', 'letmein123', 'letmein1', 'iloveyou', 'sunshine',
  'princess', 'football', 'monkey123', 'dragon123', 'master123', 'changeme',
  'pass1234', 'p@ssword', 'p@ssw0rd', 'p@ssword1', 'p@ssw0rd1', 'p@ssword123',
  'lmsadmin', 'lmsadmin123', 'instructor123', 'instructor1', 'test1234'
]);

// Valid name characters: letters (including accented/international letters), spaces, hyphens, periods, apostrophes
const NAME_REGEX = /^[a-zA-ZÀ-ÿ\u0100-\u024F\u1E00-\u1EFF'’.\s-]+$/;
const LETTER_REGEX = /[a-zA-ZÀ-ÿ\u0100-\u024F\u1E00-\u1EFF]/g;

// Standard RFC 5322 compatible email format regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Validates Full Name
 * @param {string} name
 * @returns {string|null} Error message or null if valid
 */
function validateName(name) {
  if (name === undefined || name === null || typeof name !== 'string') {
    return 'Full name is required';
  }
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return 'Full name is required and cannot be empty or whitespace only';
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
  if (trimmed.split(/\s+/).some(part => part.length > 35)) {
    return 'Name parts cannot exceed 35 characters';
  }
  return null;
}

/**
 * Validates Email Address
 * @param {string} email
 * @returns {string|null} Error message or null if valid
 */
function validateEmail(email) {
  if (email === undefined || email === null || typeof email !== 'string') {
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
  return null;
}

/**
 * Validates Password against Organization Security Policy
 * @param {string} password
 * @param {Object} [context] optional user context { name, email } to reject personalized passwords
 * @returns {string|null} Error message or null if valid
 */
function validatePassword(password, context = {}) {
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

  // Reject common / compromised passwords
  if (COMMON_PASSWORDS.has(lowerPass)) {
    return 'This password is too common and easily guessable. Please choose a stronger password.';
  }

  // Reject passwords containing user's name or email prefix if provided and length >= 3
  if (context.name && typeof context.name === 'string') {
    const nameParts = context.name.trim().toLowerCase().split(/\s+/);
    for (const part of nameParts) {
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

// Valid group / department name characters: letters, numbers, spaces, hyphens, periods, apostrophes, ampersands, commas, parentheses, slashes
const GROUP_NAME_REGEX = /^[a-zA-Z0-9À-ÿ\u0100-\u024F\u1E00-\u1EFF'’.,&/() -]+$/;
const CATEGORY_NAME_REGEX = /^[a-zA-Z0-9À-ÿ\u0100-\u024F\u1E00-\u1EFF'’.,&/() -]+$/;
const ALPHANUMERIC_REGEX = /[a-zA-Z0-9À-ÿ\u0100-\u024F\u1E00-\u1EFF]/g;

/**
 * Validates Group / Department Name
 * @param {string} name
 * @returns {string|null} Error message or null if valid
 */
function validateGroupName(name) {
  if (name === undefined || name === null || typeof name !== 'string') {
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
 * @returns {string|null} Error message or null if valid
 */
function validateGroupDescription(description) {
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

/**
 * Validates Course Category Name
 * @param {string} name
 * @returns {string|null} Error message or null if valid
 */
function validateCategoryName(name) {
  if (name === undefined || name === null || typeof name !== 'string') {
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
 * @returns {string|null} Error message or null if valid
 */
function validateCategoryDescription(description) {
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
 * @returns {string|null} Error message or null if valid
 */
function validateCourseTitle(title) {
  if (title === undefined || title === null || typeof title !== 'string') {
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

module.exports = {
  validateName,
  validateEmail,
  validatePassword,
  validateGroupName,
  validateGroupDescription,
  validateCategoryName,
  validateCategoryDescription,
  validateCourseTitle,
  COMMON_PASSWORDS,
  NAME_REGEX,
  EMAIL_REGEX,
  GROUP_NAME_REGEX,
  CATEGORY_NAME_REGEX
};

