import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle, Trash2 } from 'lucide-react';

/**
 * Accessible Custom Confirmation Modal
 * Replaces native window.confirm() dialogs with an in-app styled modal matching the LMS design system.
 */
export const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  variant = 'danger', // 'danger' | 'warning' | 'info'
  icon: CustomIcon,
  loading = false,
  maxWidth = 'max-w-md',
  closeOnBackdropClick = false,
  closeOnEscape = false
}) => {
  if (!isOpen) return null;

  const isDanger = variant === 'danger';

  const iconBg = isDanger
    ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900'
    : 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900';

  const confirmBtnBg = isDanger
    ? 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500'
    : 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500';

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? () => {} : onClose}
      title={title}
      maxWidth={maxWidth}
      closeOnBackdropClick={closeOnBackdropClick}
      closeOnEscape={closeOnEscape}
    >
      <div className="space-y-5">
        <div className="flex items-start space-x-3.5">
          <div className={`p-3 rounded-2xl border ${iconBg} shrink-0`}>
            {CustomIcon ? (
              <CustomIcon className="w-6 h-6" />
            ) : isDanger ? (
              <Trash2 className="w-6 h-6" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed break-words [overflow-wrap:anywhere]">
              {message}
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-3">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition-colors cursor-pointer shadow-xs disabled:opacity-50 ${confirmBtnBg}`}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

