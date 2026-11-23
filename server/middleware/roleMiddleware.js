const ApiError = require('../utils/apiError');

const normalizeRole = (role) => {
  if (!role) return '';
  const r = String(role).trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (r === 'admin' || r === 'orgadmin' || r === 'organizationadmin') return 'Admin';
  if (r === 'superadmin') return 'SuperAdmin';
  if (r === 'instructor') return 'Instructor';
  if (r === 'employee') return 'Employee';
  return role;
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user ? req.user.role : 'Guest';
    const normalizedUserRole = normalizeRole(userRole);
    const normalizedAllowedRoles = roles.map(normalizeRole);

    if (!req.user || (!roles.includes(userRole) && !normalizedAllowedRoles.includes(normalizedUserRole))) {
      return next(
        new ApiError(
          403,
          `Role (${userRole}) is not authorized to access this resource`
        )
      );
    }
    next();
  };
};

module.exports = { authorizeRoles };
