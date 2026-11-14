const { prisma, withId } = require('../config/prismaClient');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const { formatNotification } = require('../services/notificationService');

/**
 * @desc    Get Notifications for Logged-In User
 * @route   GET /api/notifications
 * @access  Private
 */
const getNotifications = async (req, res, next) => {
  try {
    if (req.user.role === 'SuperAdmin' || !req.user.organizationId) {
      return res.status(200).json(
        new ApiResponse(200, { notifications: [], unreadCount: 0 }, 'SuperAdmin has no notifications')
      );
    }

    const orgId = String(req.user.organizationId?.id || req.user.organizationId?._id || req.user.organizationId);
    const userId = String(req.user.id || req.user._id);

    // Safely delete notifications older than 30 days from database
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await prisma.notification.deleteMany({
      where: {
        organizationId: orgId,
        createdAt: { lt: thirtyDaysAgo }
      }
    }).catch(err => console.error('Error auto-cleaning old notifications:', err));

    const whereClause = { organizationId: orgId };

    if (req.user.role === 'Admin') {
      whereClause.OR = [{ recipientId: userId }, { recipientId: null, role: 'Admin' }];
    } else {
      whereClause.recipientId = userId;
    }

    const [notificationsList, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        select: {
          id: true,
          title: true,
          message: true,
          type: true,
          isRead: true,
          role: true,
          recipientId: true,
          organizationId: true,
          relatedEntityType: true,
          relatedEntityId: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 30
      }),
      prisma.notification.count({
        where: {
          ...whereClause,
          isRead: false
        }
      })
    ]);

    const notifications = notificationsList.map(formatNotification);

    res.status(200).json(
      new ApiResponse(
        200,
        { notifications, unreadCount },
        'Notifications retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark Notification as Read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
const markAsRead = async (req, res, next) => {
  try {
    if (req.user.role === 'SuperAdmin' || !req.user.organizationId) {
      return res.status(200).json(new ApiResponse(200, { notification: null }, 'SuperAdmin notification updated'));
    }

    const orgId = String(req.user.organizationId?.id || req.user.organizationId?._id || req.user.organizationId);
    const notifId = String(req.params.id);

    const notification = await prisma.notification.findFirst({
      where: {
        id: notifId,
        organizationId: orgId
      }
    });

    if (!notification) {
      throw new ApiError(404, 'Notification not found');
    }

    const updated = await prisma.notification.update({
      where: { id: notification.id },
      data: { isRead: true }
    });

    res.status(200).json(new ApiResponse(200, { notification: formatNotification(updated) }, 'Notification marked as read'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark All Notifications as Read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
const markAllAsRead = async (req, res, next) => {
  try {
    if (req.user.role === 'SuperAdmin' || !req.user.organizationId) {
      return res.status(200).json(new ApiResponse(200, {}, 'SuperAdmin notifications updated'));
    }

    const orgId = String(req.user.organizationId?.id || req.user.organizationId?._id || req.user.organizationId);
    const userId = String(req.user.id || req.user._id);

    const whereClause = { organizationId: orgId, isRead: false };

    if (req.user.role === 'Admin') {
      whereClause.OR = [{ recipientId: userId }, { recipientId: null, role: 'Admin' }];
    } else {
      whereClause.recipientId = userId;
    }

    await prisma.notification.updateMany({
      where: whereClause,
      data: { isRead: true }
    });

    res.status(200).json(new ApiResponse(200, {}, 'All notifications marked as read'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete Notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
const deleteNotification = async (req, res, next) => {
  try {
    if (req.user.role === 'SuperAdmin' || !req.user.organizationId) {
      return res.status(200).json(new ApiResponse(200, {}, 'SuperAdmin notification deleted'));
    }

    const orgId = String(req.user.organizationId?.id || req.user.organizationId?._id || req.user.organizationId);
    const userId = String(req.user.id || req.user._id);
    const notifId = String(req.params.id);

    const whereClause = {
      id: notifId,
      organizationId: orgId
    };

    if (req.user.role === 'Admin') {
      whereClause.OR = [{ recipientId: userId }, { recipientId: null, role: 'Admin' }];
    } else {
      whereClause.recipientId = userId;
    }

    const notification = await prisma.notification.findFirst({
      where: whereClause
    });

    if (!notification) {
      throw new ApiError(404, 'Notification not found');
    }

    await prisma.notification.delete({
      where: { id: notification.id }
    });

    res.status(200).json(new ApiResponse(200, { id: notifId }, 'Notification deleted successfully'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
};
