import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { requestForgotPasswordOTP, verifyForgotPasswordOTP, resetPasswordWithOTP } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { Mail, KeyRound, Lock, ArrowLeft, ArrowRight, CheckCircle2, Circle, ShieldCheck, Eye, EyeOff, RotateCcw, AlertCircle, Check } from 'lucide-react';

export const ForgotPassword = () => {
  const { addToast } = useNotification();
  const navigate = useNavigate();

  // Step 1: email, Step 2: otp, Step 3: new password
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const passwordInputRef = useRef(null);

  const passwordCriteria = useMemo(() => [
    {
      id: 'length',
      label: 'At least 8 characters',
      met: newPassword.length >= 8 && newPassword.length <= 100
    },
    {
      id: 'uppercase',
      label: 'One uppercase letter',
      met: /[A-Z]/.test(newPassword)
    },
    {
      id: 'lowercase',
      label: 'One lowercase letter',
      met: /[a-z]/.test(newPassword)
    },
    {
      id: 'number',
      label: 'One numeric digit',
      met: /[0-9]/.test(newPassword)
    },
    {
      id: 'special',
      label: 'One special symbol',
      met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(newPassword) || /[^A-Za-z0-9]/.test(newPassword)
    }
  ], [newPassword]);

  const allRequirementsMet = useMemo(
    () => passwordCriteria.every((criterion) => criterion.met),
    [passwordCriteria]
  );

  const passwordsMatch = useMemo(
    () => Boolean(newPassword && confirmPassword && newPassword === confirmPassword),
    [newPassword, confirmPassword]
  );

  const canSubmitReset = allRequirementsMet && passwordsMatch && !loading;

  // Resend cooldown timer (60s)
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  // Step 1: Request OTP
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      addToast('error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const res = await requestForgotPasswordOTP({ email: cleanEmail });
      addToast('success', res.data?.message || 'A 6-digit OTP has been sent to your registered email address.');
      setStep(2);
      setCooldown(60);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to request OTP';
      addToast('error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Resend OTP
  const handleResendOTP = async () => {
    if (cooldown > 0) return;
    setLoading(true);
    try {
      const res = await requestForgotPasswordOTP({ email: email.trim().toLowerCase() });
      addToast('success', 'A new 6-digit OTP code has been sent to your email.');
      setCooldown(60);
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) {
      addToast('error', 'Please enter the complete 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      await verifyForgotPasswordOTP({ email: email.trim().toLowerCase(), otp: cleanOtp });
      addToast('success', 'OTP verified successfully! Now set your new password.');
      setStep(3);
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!allRequirementsMet) {
      addToast('error', 'Password does not meet all requirements');
      setIsPasswordFocused(true);
      passwordInputRef.current?.focus();
      return;
    }

    if (newPassword !== confirmPassword) {
      addToast('error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await resetPasswordWithOTP({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        newPassword
      });
      addToast('success', 'Password reset successfully! Please sign in with your new password.');
      navigate('/login');
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 md:p-10 rounded-3xl border border-slate-200 shadow-xl space-y-6 animate-auth-form-switch">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Link
            to="/login"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Back to login"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Account Recovery
          </span>
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          {step === 1 && 'Reset Your Password'}
          {step === 2 && 'Enter Verification OTP'}
          {step === 3 && 'Set New Password'}
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          {step === 1 && 'Enter your registered email address to receive a secure 6-digit verification code.'}
          {step === 2 && `We sent a 6-digit OTP code to ${email}. The code will expire in 5 minutes.`}
          {step === 3 && 'Create a new strong password for your LMS account.'}
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className={`flex items-center space-x-2 text-xs font-semibold ${step >= 1 ? 'text-emerald-600' : 'text-slate-400'}`}>
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step >= 1 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>1</span>
          <span>Email</span>
        </div>
        <div className="flex-1 mx-2 h-0.5 bg-slate-100" />
        <div className={`flex items-center space-x-2 text-xs font-semibold ${step >= 2 ? 'text-emerald-600' : 'text-slate-400'}`}>
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step >= 2 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>2</span>
          <span>OTP</span>
        </div>
        <div className="flex-1 mx-2 h-0.5 bg-slate-100" />
        <div className={`flex items-center space-x-2 text-xs font-semibold ${step >= 3 ? 'text-emerald-600' : 'text-slate-400'}`}>
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step >= 3 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>3</span>
          <span>Reset</span>
        </div>
      </div>

      {/* STEP 1: Enter Email */}
      {step === 1 && (
        <form onSubmit={handleRequestOTP} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Registered Work Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@company.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading ? (
              <span>Sending OTP...</span>
            ) : (
              <>
                <span>Send 6-Digit OTP</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* STEP 2: Verify 6-Digit OTP */}
      {step === 2 && (
        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">6-Digit Verification Code</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                required
                placeholder="123456"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white text-base font-mono tracking-[6px] font-bold text-slate-900 placeholder:tracking-normal placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
              />
            </div>
            <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 mt-2 flex items-center">
              ⏰ Code valid for 5 minutes. Check your spam/junk folder if not received.
            </p>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              Change Email
            </button>
            <button
              type="button"
              onClick={handleResendOTP}
              disabled={cooldown > 0 || loading}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 disabled:text-slate-400 flex items-center space-x-1 cursor-pointer disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}</span>
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full py-3 px-4 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading ? (
              <span>Verifying OTP...</span>
            ) : (
              <>
                <span>Verify OTP</span>
                <CheckCircle2 className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* STEP 3: Reset Password */}
      {step === 3 && (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">New Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                ref={passwordInputRef}
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                maxLength={100}
                onChange={(e) => setNewPassword(e.target.value)}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
                required
                placeholder="At least 8 characters"
                className={`w-full pl-10 pr-10 py-2.5 rounded-xl border bg-white text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all ${
                  newPassword && !allRequirementsMet
                    ? 'border-amber-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
                    : allRequirementsMet
                    ? 'border-emerald-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'
                    : 'border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'
                }`}
              />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Real-time Password Validation Requirements Card (shows on focus) */}
            {isPasswordFocused && (
              <div
                role="region"
                aria-label="Password validation requirements"
                className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 shadow-xs space-y-1.5 animate-fade-in"
              >
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                  <span>Password Requirements</span>
                  <span className="text-[10px] font-normal text-slate-500">
                    {passwordCriteria.filter((c) => c.met).length} of 5 met
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  {passwordCriteria.map((criterion) => (
                    <div
                      key={criterion.id}
                      className={`flex items-center gap-1.5 text-[11px] leading-tight transition-colors duration-150 ${
                        criterion.met ? 'text-emerald-600 font-medium' : 'text-slate-500'
                      }`}
                    >
                      {criterion.met ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                      ) : (
                        <Circle className="w-3 h-3 text-slate-300 shrink-0" />
                      )}
                      <span className="truncate">{criterion.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">Confirm New Password</label>
              {passwordsMatch && (
                <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-0.5">
                  <Check className="w-3 h-3" /> Passwords match
                </span>
              )}
            </div>
            <div className="relative">
              <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                maxLength={100}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Re-enter new password"
                className={`w-full pl-10 pr-10 py-2.5 rounded-xl border bg-white text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all ${
                  confirmPassword && !passwordsMatch
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                    : passwordsMatch
                    ? 'border-emerald-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'
                    : 'border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'
                }`}
              />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword && !passwordsMatch && (
              <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>Passwords do not match</span>
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!canSubmitReset}
            className="w-full py-3 px-4 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <span>Resetting Password...</span>
            ) : (
              <>
                <span>Complete Password Reset</span>
                <CheckCircle2 className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* Footer */}
      <div className="pt-4 border-t border-slate-100 text-center text-xs">
        <p className="text-slate-500">
          Remembered your password?{' '}
          <Link to="/login" className="text-emerald-600 hover:text-emerald-800 font-bold underline transition-colors">
            Return to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};
