import React, { useState, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { changePassword } from '../../services/api';
import { KeyRound, Lock, Check, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { validatePassword, evaluatePasswordStrength } from '../../utils/userValidation';

export const ChangePasswordModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { addToast } = useNotification();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const passwordStrength = useMemo(() => {
    return evaluatePasswordStrength(newPassword, { name: user?.name, email: user?.email });
  }, [newPassword, user?.name, user?.email]);

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setFieldErrors({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setShowCurrentPass(false);
    setShowNewPass(false);
    setShowConfirmPass(false);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = {};

    if (!currentPassword || currentPassword.trim() === '') {
      errors.currentPassword = 'Current password is required';
    }

    if (!newPassword || newPassword.trim() === '') {
      errors.newPassword = 'New password is required';
    } else {
      const pwdErr = validatePassword(newPassword, { name: user?.name, email: user?.email });
      if (pwdErr) {
        errors.newPassword = pwdErr;
      } else if (currentPassword && currentPassword === newPassword) {
        errors.newPassword = 'New password must be different from your current password.';
      }
    }

    if (!confirmPassword || confirmPassword.trim() === '') {
      errors.confirmPassword = 'Confirm password is required';
    } else if (newPassword && newPassword !== confirmPassword) {
      errors.confirmPassword = 'New passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      addToast('error', Object.values(errors)[0]);
      // Preserve entered values on client validation failure
      return;
    }

    setLoading(true);
    try {
      await changePassword({ currentPassword, newPassword, confirmPassword });
      addToast('success', 'Password changed successfully!');
      handleClose();
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      const serverMsg = err.response?.data?.message || 'Failed to change password';

      const mapped = {};
      if (Array.isArray(serverErrors) && serverErrors.length > 0) {
        serverErrors.forEach((item) => {
          if (item.field) {
            mapped[item.field] = item.message;
          }
        });
      } else if (typeof serverMsg === 'string') {
        const lower = serverMsg.toLowerCase();
        if (lower.includes('current password')) {
          mapped.currentPassword = serverMsg;
        } else if (lower.includes('match') || lower.includes('confirm')) {
          mapped.confirmPassword = serverMsg;
        } else if (lower.includes('different') || lower.includes('password')) {
          mapped.newPassword = serverMsg;
        }
      }

      setFieldErrors((prev) => ({ ...prev, ...mapped }));
      addToast('error', serverMsg);
      // Strictly preserve entered values on failure - fields are NOT cleared
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Change Password" maxWidth="max-w-lg" closeOnBackdropClick={false}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current Password Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Current Password <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type={showCurrentPass ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                if (fieldErrors.currentPassword) {
                  setFieldErrors((prev) => ({ ...prev, currentPassword: '' }));
                }
              }}
              placeholder="Enter current password"
              className={`w-full pl-10 pr-10 py-2.5 rounded-xl border bg-white text-sm text-slate-900 outline-none transition-all ${
                fieldErrors.currentPassword
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowCurrentPass(!showCurrentPass)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              aria-label={showCurrentPass ? 'Hide current password' : 'Show current password'}
            >
              {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {fieldErrors.currentPassword && (
            <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
              {fieldErrors.currentPassword}
            </p>
          )}
        </div>

        {/* New Password Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            New Password <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type={showNewPass ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (fieldErrors.newPassword) {
                  setFieldErrors((prev) => ({ ...prev, newPassword: '' }));
                }
              }}
              placeholder="Min. 8 characters (e.g. Pass#2026!)"
              className={`w-full pl-10 pr-10 py-2.5 rounded-xl border bg-white text-sm text-slate-900 outline-none transition-all ${
                fieldErrors.newPassword
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowNewPass(!showNewPass)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              aria-label={showNewPass ? 'Hide new password' : 'Show new password'}
            >
              {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Real-time Password Strength Meter */}
          {newPassword.length > 0 && (
            <div className="mt-2 space-y-1.5 animate-fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Password Strength:</span>
                <span
                  className={`font-bold ${
                    passwordStrength.score <= 1
                      ? 'text-rose-600'
                      : passwordStrength.score === 2
                      ? 'text-amber-600'
                      : passwordStrength.score === 3
                      ? 'text-teal-600'
                      : 'text-emerald-600'
                  }`}
                >
                  {passwordStrength.label}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-full rounded-full transition-all duration-300 ${
                      passwordStrength.score >= step
                        ? passwordStrength.score <= 1
                          ? 'bg-rose-500'
                          : passwordStrength.score === 2
                          ? 'bg-amber-500'
                          : passwordStrength.score === 3
                          ? 'bg-teal-500'
                          : 'bg-emerald-500'
                        : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Password Security Policy Checklist */}
          <div className="mt-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1 text-[11px] text-slate-600">
            <div className="font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span>Security Policy Checklist</span>
              <span className="text-[10px] text-slate-400 font-normal">Min. 8 chars & complex</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1">
              {passwordStrength.requirements.map((req) => (
                <div
                  key={req.id}
                  className={`flex items-center gap-1.5 transition-colors ${
                    req.met ? 'text-emerald-700 font-semibold' : 'text-slate-500'
                  }`}
                >
                  {req.met ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
                  )}
                  <span>{req.label}</span>
                </div>
              ))}
            </div>
          </div>

          {fieldErrors.newPassword && (
            <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
              {fieldErrors.newPassword}
            </p>
          )}
        </div>

        {/* Confirm New Password Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Confirm New Password <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type={showConfirmPass ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (fieldErrors.confirmPassword) {
                  setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
                }
              }}
              placeholder="Re-enter new password"
              className={`w-full pl-10 pr-10 py-2.5 rounded-xl border bg-white text-sm text-slate-900 outline-none transition-all ${
                fieldErrors.confirmPassword
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPass(!showConfirmPass)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              aria-label={showConfirmPass ? 'Hide confirmed password' : 'Show confirmed password'}
            >
              {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {fieldErrors.confirmPassword && (
            <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
              {fieldErrors.confirmPassword}
            </p>
          )}
        </div>

        {/* Modal Action Buttons */}
        <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors inline-flex items-center cursor-pointer disabled:opacity-50"
          >
            <Check className="w-4 h-4 mr-1.5" />
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
