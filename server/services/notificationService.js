const { prisma, withId } = require('../config/prismaClient');
const { emitToUser, emitToRoom } = require('../config/socket');

const ACTIONABLE_NOTIFICATION_CONFIG = {
  ASSIGNMENT_SUBMITTED: {
    actionable_roles: ['Instructor'],
    action_label: 'Evaluate Submission',
    action_url: '/instructor/submissions'
  },
  ASSIGNMENT_REQUIRES_REVIEW: {
    actionable_roles: ['Instructor'],
    action_label: 'Evaluate Submission',
    action_url: '/instructor/submissions'
  },
  TRAINING_OVERDUE: {
    actionable_roles: ['Instructor'],
    action_label: 'Manage Deadlines',
    action_url: '/instructor/deadlines'
  },
  EMPLOYEE_TRAINING_OVERDUE: {
    actionable_roles: ['Instructor'],
    action_label: 'Manage Deadlines',
    action_url: '/instructor/deadlines'
  },
  MULTIPLE_EMPLOYEES_OVERDUE: {
    actionable_roles: ['Instructor'],
    action_label: 'Manage Deadlines',
    action_url: '/instructor/deadlines'
  },
  TRAINING_ASSIGNED: {
    actionable_roles: ['Employee'],
    action_label: 'Go to Training',
    action_url: '/employee/my-trainings'
  },
  NEW_TRAINING_ASSIGNED: {
    actionable_roles: ['Employee'],
    action_label: 'Go to Training',
    action_url: '/employee/my-trainings'
  },
  AUTO_ASSIGNED_TRAINING: {
    actionable_roles: ['Employee'],
    action_label: 'Go to Training',
    action_url: '/employee/my-trainings'
  }
};

const formatNotification = (n, options = null) => {
  if (!n) return null;
  const transformed = withId(n);
  transformed.relatedEntity = {
    entityType: n.relatedEntityType,
    entityId: n.relatedEntityId
  };

  const config = ACTIONABLE_NOTIFICATION_CONFIG[n.type] || {};
  const actionableRoles = options?.actionable_roles || options?.actionableRoles || config.actionable_roles || [];
  const actionLabel = options?.action_label || options?.actionLabel || config.action_label || null;
  const actionUrl = options?.action_url || options?.actionUrl || config.action_url || null;

  transformed.actionable_roles = actionableRoles;
  transformed.actionableRoles = actionableRoles;
  transformed.action_label = actionLabel;
  transformed.action_url = actionUrl;

  return transformed;
};

/**
 * Send notification to a specific user (Employee or Instructor)
 */
const sendUserNotification = async (recipientId, organizationId, role, type, title, message, relatedEntity = null, options = {}) => {
  try {
    const recId = recipientId ? String(recipientId.id || recipientId._id || recipientId) : null;
    const orgId = String(organizationId.id || organizationId._id || organizationId);

    const relType = relatedEntity?.entityType ? String(relatedEntity.entityType) : null;
    const relId = relatedEntity?.entityId ? String(relatedEntity.entityId.id || relatedEntity.entityId._id || relatedEntity.entityId) : null;

    if (recId) {
      if (options.preventDuplicates) {
        const existing = await prisma.notification.findFirst({
          where: {
            recipientId: recId,
            organizationId: orgId,
            type,
            relatedEntityType: relType,
            relatedEntityId: relId
          }
        });
        if (existing) {
          return formatNotification(existing);
        }
      }

      // 3-second debounce window to prevent rapid burst/duplicate submissions for the exact same event
      const recentWindow = new Date(Date.now() - 3000);
      const recentDuplicate = await prisma.notification.findFirst({
        where: {
          recipientId: recId,
          organizationId: orgId,
          type,
          title,
          message,
          relatedEntityType: relType,
          relatedEntityId: relId,
          createdAt: { gte: recentWindow }
        }
      });
      if (recentDuplicate) {
        return formatNotification(recentDuplicate);
      }
    }

    const notification = await prisma.notification.create({
      data: {
        recipientId: recId,
        organizationId: orgId,
        role,
        type,
        title,
        message,
        relatedEntityType: relType,
        relatedEntityId: relId
      }
    });

    const formatted = formatNotification(notification, options);

    // Real-time emit to user room
    if (recId) {
      emitToUser(recId, 'new_notification', formatted);
    }

    return formatted;
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
};

/**
 * Send notification specifically to an Instructor
 */
const sendInstructorNotification = async (instructorId, organizationId, type, title, message, relatedEntity = null, options = {}) => {
  if (!instructorId) return;
  return sendUserNotification(instructorId, organizationId, 'Instructor', type, title, message, relatedEntity, options);
};

/**
 * Send aggregated notification to all Organization Admins
 */
const sendAdminNotification = async (organizationId, type, title, message, relatedEntity = null, options = {}) => {
  try {
    const orgId = String(organizationId.id || organizationId._id || organizationId);
    const admins = await prisma.user.findMany({
      where: { organizationId: orgId, role: 'Admin' }
    });

    if (admins.length > 0) {
      const relType = relatedEntity?.entityType ? String(relatedEntity.entityType) : null;
      const relId = relatedEntity?.entityId ? String(relatedEntity.entityId.id || relatedEntity.entityId._id || relatedEntity.entityId) : null;

      for (const admin of admins) {
        if (options.preventDuplicates) {
          const existing = await prisma.notification.findFirst({
            where: {
              recipientId: admin.id,
              organizationId: orgId,
              type,
              relatedEntityType: relType,
              relatedEntityId: relId
            }
          });
          if (existing) continue;
        }

        // 3-second debounce window per admin to prevent rapid burst duplicates for the exact same event
        const recentWindow = new Date(Date.now() - 3000);
        const recentDuplicate = await prisma.notification.findFirst({
          where: {
            recipientId: admin.id,
            organizationId: orgId,
            type,
            title,
            message,
            relatedEntityType: relType,
            relatedEntityId: relId,
            createdAt: { gte: recentWindow }
          }
        });
        if (recentDuplicate) continue;

        const notification = await prisma.notification.create({
          data: {
            recipientId: admin.id,
            organizationId: orgId,
            role: 'Admin',
            type,
            title,
            message,
            relatedEntityType: relType,
            relatedEntityId: relId
          }
        });

        const formatted = formatNotification(notification, options);
        emitToUser(admin.id, 'new_notification', formatted);
      }
    }
  } catch (error) {
    console.error('Failed to send admin notification:', error);
  }
};

module.exports = {
  sendUserNotification,
  sendInstructorNotification,
  sendAdminNotification,
  formatNotification
};
