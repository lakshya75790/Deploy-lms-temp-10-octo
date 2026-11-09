import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { formatDisplayText } from '../../utils/formatters';
import {
  Bell,
  Check,
  CheckCheck,
  CheckCircle,
  XCircle,
  BookOpen,
  FileCheck2,
  Clock,
  UserPlus,
  Lock,
  Unlock,
  Sparkles,
  AlertCircle,
  ArrowRight
} from 'lucide-react';

export const NotificationsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotification();
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.isRead)
    : notifications;

  const isActionableForUser = (n) => {
    if (!n || !user?.role) return false;
    const allowedRoles = n.actionable_roles || n.actionableRoles;
    if (Array.isArray(allowedRoles)) {
      return allowedRoles.includes(user.role);
    }
    // Safe fallback if not explicitly populated on legacy/cached records
    const fallbackRoles = {
      ASSIGNMENT_SUBMITTED: ['Instructor'],
      ASSIGNMENT_REQUIRES_REVIEW: ['Instructor'],
      TRAINING_OVERDUE: ['Instructor'],
      EMPLOYEE_TRAINING_OVERDUE: ['Instructor'],
      MULTIPLE_EMPLOYEES_OVERDUE: ['Instructor'],
      TRAINING_ASSIGNED: ['Employee'],
      NEW_TRAINING_ASSIGNED: ['Employee'],
      AUTO_ASSIGNED_TRAINING: ['Employee']
    };
    const fallback = fallbackRoles[n.type];
    if (Array.isArray(fallback)) {
      return fallback.includes(user.role);
    }
    return false;
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'QUIZ_FOCUS_ALERT':
        return <AlertCircle className="w-5 h-5 text-amber-600" />;
      case 'NEW_EMPLOYEE_REGISTERED':
      case 'NEW_EMPLOYEE_ADDED':
      case 'INSTRUCTOR_ADDED':
      case 'EMPLOYEE_ACTIVATED':
      case 'INSTRUCTOR_ACTIVATED':
        return <UserPlus className="w-5 h-5 text-teal-600" />;
      case 'EMPLOYEE_DEACTIVATED':
      case 'INSTRUCTOR_DEACTIVATED':
      case 'ACCOUNT_LOCKED':
        return <Lock className="w-5 h-5 text-rose-600" />;
      case 'ACCOUNT_UNLOCKED':
        return <Unlock className="w-5 h-5 text-emerald-600" />;
      case 'NEW_TRAINING_CREATED':
      case 'TRAINING_CREATED':
      case 'TRAINING_UPDATED':
      case 'TRAINING_PUBLISHED':
      case 'TRAINING_ASSIGNED':
      case 'NEW_TRAINING_ASSIGNED':
      case 'AUTO_ASSIGNED_TRAINING':
        return <BookOpen className="w-5 h-5 text-emerald-600" />;
      case 'ASSIGNMENT_SUBMITTED':
      case 'ASSIGNMENT_REQUIRES_REVIEW':
      case 'ASSIGNMENT_REVIEWED':
      case 'INSTRUCTOR_FEEDBACK':
        return <FileCheck2 className="w-5 h-5 text-emerald-600" />;
      case 'QUIZ_PASSED':
      case 'TRAINING_COMPLETED':
      case 'EMPLOYEE_COMPLETED_TRAINING':
      case 'EMPLOYEE_COMPLETED_ALL_REQUIRED_TRAINING':
      case 'CERTIFICATE_AVAILABLE':
        return <CheckCircle className="w-5 h-5 text-emerald-600" />;
      case 'QUIZ_FAILED':
        return <XCircle className="w-5 h-5 text-rose-600" />;
      case 'DEADLINE_EXTENDED':
      case 'DEADLINE_APPROACHING_7_DAYS':
      case 'DEADLINE_APPROACHING_3_DAYS':
      case 'DEADLINE_APPROACHING_2_DAYS':
      case 'DEADLINE_APPROACHING_1_DAY':
      case 'TRAINING_DUE_TODAY':
      case 'TRAINING_DEADLINE_APPROACHING':
      case 'TRAINING_DEADLINE_REACHED':
        return <Clock className="w-5 h-5 text-amber-600" />;
      case 'TRAINING_OVERDUE':
      case 'EMPLOYEE_TRAINING_OVERDUE':
      case 'MULTIPLE_EMPLOYEES_OVERDUE':
      case 'EMPLOYEES_WITH_OVERDUE_TRAINING':
      case 'TRAINING_LOCKED':
        return <Lock className="w-5 h-5 text-rose-600" />;
      case 'TRAINING_UNLOCKED':
        return <Unlock className="w-5 h-5 text-emerald-600" />;
      default:
        return <Bell className="w-5 h-5 text-emerald-600" />;
    }
  };

  const handleNotificationClick = (n) => {
    // Navigation on click without automatically changing read status
    if (isActionableForUser(n)) {
      const targetUrl = n.action_url || (n.type?.includes('ASSIGNMENT') ? '/instructor/submissions' : null);
      if (targetUrl) {
        navigate(targetUrl);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in p-2 sm:p-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="p-4 xs:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <Bell className="w-6 h-6 xs:w-7 xs:h-7 text-emerald-600 shrink-0" />
            <h1 className="text-xl xs:text-2xl font-extrabold text-slate-900 tracking-tight font-heading">Notifications Center</h1>
          </div>
          <p className="text-xs text-slate-500">
            Real-time updates, activity alerts, and operational notifications for your LMS account.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="py-2.5 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-semibold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark All as Read ({unreadCount})</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 sm:space-x-3 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 xs:px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            filter === 'all'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3 xs:px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            filter === 'unread'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          Unread Only ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-8 sm:p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <Sparkles className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No notifications found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {filter === 'unread' ? "You've read all your notifications!" : "You don't have any notifications right now."}
            </p>
          </div>
        ) : (
          filteredNotifications.map((n) => (
            <div
              key={n.id || n._id}
              onClick={() => handleNotificationClick(n)}
              className={`group relative p-3.5 xs:p-5 rounded-2xl border transition-all cursor-pointer flex items-start space-x-3 xs:space-x-4 hover:shadow-md ${
                !n.isRead
                  ? 'border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/40 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className="p-2 xs:p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex-shrink-0 mt-0.5">
                {getNotifIcon(n.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{formatDisplayText(n.title)}</h4>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {!n.isRead && (
                      <button
                        type="button"
                        title="Mark as Read"
                        aria-label="Mark as Read"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(n.id || n._id);
                        }}
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-150 inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-900/60 dark:hover:bg-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 cursor-pointer shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Mark as Read</span>
                      </button>
                    )}
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                      {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-2">{formatDisplayText(n.message)}</p>

                <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-1">
                  <div className="flex items-center space-x-2">
                    {!n.isRead && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        Unread
                      </span>
                    )}
                    {isActionableForUser(n) && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        Action Required
                      </span>
                    )}
                  </div>

                  {isActionableForUser(n) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const targetUrl = n.action_url || (n.type?.includes('ASSIGNMENT') ? '/instructor/submissions' : null);
                        if (targetUrl) navigate(targetUrl);
                      }}
                      className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
                    >
                      <span>{n.action_label || (n.type?.includes('ASSIGNMENT') ? 'Evaluate Submission' : 'View Action')}</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

