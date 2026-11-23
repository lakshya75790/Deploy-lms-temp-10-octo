const jwt = require('jsonwebtoken');
const { prisma, withId } = require('../config/prismaClient');
const ApiError = require('../utils/apiError');
const { getCachedOrgLicenseValidity } = require('../services/licenseService');

const protect = async (req, res, next) => {
  try {
    let token = req.cookies?.jwt;

    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token && req.query?.token) {
      token = req.query.token;
    }

    if (!token) {
      throw new ApiError(401, 'Not authorized, token missing');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.id) {
      throw new ApiError(401, 'Invalid authentication token');
    }

    req.user = withId({
      id: decoded.id,
      name: decoded.name,
      role: decoded.role,
      organizationId: decoded.organizationId
    });

    if (req.user.role !== 'SuperAdmin') {
      let orgId = typeof req.user.organizationId === 'object' && req.user.organizationId !== null
        ? (req.user.organizationId.id || req.user.organizationId._id)
        : req.user.organizationId;

      if (!orgId && req.user.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: { organizationId: true, status: true }
        });
        if (dbUser) {
          orgId = dbUser.organizationId;
          req.user.organizationId = orgId;
          if (dbUser.status === 'deactivated') {
            throw new ApiError(403, 'Your account has been deactivated. Please contact your administrator.');
          }
        }
      }

      if (orgId) {
        const validity = await getCachedOrgLicenseValidity(orgId);
        if (!validity.isValid) {
          const err = new ApiError(403, validity.message);
          err.errorCode = validity.errorCode;
          throw err;
        }
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { protect };
