import React, { useState, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { User, Mail, Lock, Building, ArrowRight, Eye, EyeOff, CheckCircle2, Circle, AlertCircle, Check } from 'lucide-react';

export const EmployeeRegister = () => {
  const { registerEmp } = useAuth();
  const { addToast } = useNotification();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [orgCode, setOrgCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [errors, setErrors] = useState({});
  const passwordInputRef = useRef(null);

  const passwordCriteria = useMemo(() => [
    {
      id: 'length',
      label: 'At least 8 characters',
      met: password.length >= 8 && password.length <= 100
    },
    {
      id: 'uppercase',
      label: 'One uppercase letter',
      met: /[A-Z]/.test(password)
    },
    {
      id: 'lowercase',
      label: 'One lowercase letter',
      met: /[a-z]/.test(password)
    },
    {
      id: 'number',
      label: 'One numeric digit',
      met: /[0-9]/.test(password)
    },
    {
      id: 'special',
      label: 'One special symbol',
      met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(password) || /[^A-Za-z0-9]/.test(password)
    }
  ], [password]);

  const allRequirementsMet = useMemo(
    () => passwordCriteria.every((criterion) => criterion.met),
    [passwordCriteria]
  );

  const validateField = (fieldName, val, allValues = {}) => {
    switch (fieldName) {
      case 'orgCode': {
        const trimmed = (val || '').trim();
        if (!trimmed) return 'Organization code is required';
        if (trimmed.length > 20) return 'Organization code cannot exceed 20 characters';
        return '';
      }
      case 'name': {
        const trimmed = (val || '').trim();
        if (!trimmed) return 'Full name is required';
        if (trimmed.length < 2) return 'Full name must be at least 2 characters';
        if (trimmed.length > 50) return 'Full name cannot exceed 50 characters';
        if (!/^[a-zA-ZÀ-ÿ\u0100-\u024F\u1E00-\u1EFF'’.\s-]+$/.test(trimmed)) {
          return 'Full name can only contain letters and spaces';
        }
        const letters = trimmed.match(/[a-zA-ZÀ-ÿ\u0100-\u024F\u1E00-\u1EFF]/g);
        if (!letters || letters.length < 2) {
          return 'Full name must contain at least 2 letters';
        }
        return '';
      }
      case 'email': {
        const trimmed = (val || '').trim();
        if (!trimmed) return 'Email address is required';
        if (trimmed.length > 100) return 'Email address cannot exceed 100 characters';
        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed) || trimmed.includes('..')) {
          return 'Please enter a valid email address';
        }
        return '';
      }
      case 'password': {
        if (!val) return 'Password is required';
        if (val.length < 8) return 'Password must be at least 8 characters';
        if (val.length > 100) return 'Password cannot exceed 100 characters';
        if (!allRequirementsMet) {
          return 'Password does not meet all requirements';
        }
        return '';
      }
      case 'confirmPassword': {
        if (!val) return 'Please confirm your password';
        const targetPass = allValues.password !== undefined ? allValues.password : password;
        if (val !== targetPass) return 'Passwords do not match';
        return '';
      }
      default:
        return '';
    }
  };

  const clearError = (field) => {
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    const orgCodeErr = validateField('orgCode', orgCode);
    if (orgCodeErr) newErrors.orgCode = orgCodeErr;

    const nameErr = validateField('name', name);
    if (nameErr) newErrors.name = nameErr;

    const emailErr = validateField('email', email);
    if (emailErr) newErrors.email = emailErr;

    const passwordErr = validateField('password', password);
    if (passwordErr) newErrors.password = passwordErr;

    const confirmPasswordErr = validateField('confirmPassword', confirmPassword, { password });
    if (confirmPasswordErr) newErrors.confirmPassword = confirmPasswordErr;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstError = Object.values(newErrors)[0];
      addToast('error', firstError);
      if (newErrors.password) {
        setIsPasswordFocused(true);
        passwordInputRef.current?.focus();
      }
      return;
    }

    setLoading(true);
    try {
      await registerEmp({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        orgCode: orgCode.trim()
      });
      addToast('success', 'Registration successful! Complete your profile to get started.');
      navigate('/employee');
    } catch (err) {
      addToast('error', err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const passwordsMatch = Boolean(confirmPassword && password && confirmPassword === password);

  return (
    <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-3 sm:space-y-3.5 animate-auth-form-switch max-w-[420px] sm:max-w-[440px] w-full mx-auto md:scale-[0.96] lg:scale-100 origin-center transition-all">
      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Learner Registration
        </h2>
        <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-normal">
          Enter your organization code and credentials to create your portal.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2.5">
        {/* Organization Code */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Organization Code
          </label>
          <div className="relative">
            <Building className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={orgCode}
              maxLength={20}
              onChange={(e) => {
                setOrgCode(e.target.value.toUpperCase());
                clearError('orgCode');
              }}
              required
              placeholder="e.g. TC100"
              className={`w-full pl-9 pr-3.5 py-1.5 sm:py-2 rounded-xl border bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 uppercase tracking-widest font-mono placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-all ${
                errors.orgCode
                  ? 'border-rose-400 dark:border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-slate-300 dark:border-slate-700 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'
              }`}
            />
          </div>
          {errors.orgCode && (
            <p className="text-[10px] text-rose-500 dark:text-rose-400 mt-0.5 flex items-center gap-1 font-medium leading-tight">
              <AlertCircle className="w-2.5 h-2.5 shrink-0" />
              <span>{errors.orgCode}</span>
            </p>
          )}
        </div>

        {/* Full Name */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Full Name
          </label>
          <div className="relative">
            <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={name}
              maxLength={50}
              onChange={(e) => {
                setName(e.target.value);
                clearError('name');
              }}
              required
              placeholder="John Doe"
              className={`w-full pl-9 pr-3.5 py-1.5 sm:py-2 rounded-xl border bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-all ${
                errors.name
                  ? 'border-rose-400 dark:border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-slate-300 dark:border-slate-700 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'
              }`}
            />
          </div>
          {errors.name && (
            <p className="text-[10px] text-rose-500 dark:text-rose-400 mt-0.5 flex items-center gap-1 font-medium leading-tight">
              <AlertCircle className="w-2.5 h-2.5 shrink-0" />
              <span>{errors.name}</span>
            </p>
          )}
        </div>

        {/* Email Address */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="email"
              value={email}
              maxLength={100}
              onChange={(e) => {
                setEmail(e.target.value);
                clearError('email');
              }}
              required
              placeholder="john@company.com"
              className={`w-full pl-9 pr-3.5 py-1.5 sm:py-2 rounded-xl border bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-all ${
                errors.email
                  ? 'border-rose-400 dark:border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-slate-300 dark:border-slate-700 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'
              }`}
            />
          </div>
          {errors.email && (
            <p className="text-[10px] text-rose-500 dark:text-rose-400 mt-0.5 flex items-center gap-1 font-medium leading-tight">
              <AlertCircle className="w-2.5 h-2.5 shrink-0" />
              <span>{errors.email}</span>
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Password
          </label>
          <div className="relative">
            <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              ref={passwordInputRef}
              type={showPassword ? 'text' : 'password'}
              value={password}
              maxLength={100}
              onChange={(e) => {
                setPassword(e.target.value);
                clearError('password');
                if (confirmPassword && e.target.value !== confirmPassword) {
                  setErrors((prev) => ({ ...prev, confirmPassword: 'Passwords do not match' }));
                } else if (confirmPassword && e.target.value === confirmPassword) {
                  clearError('confirmPassword');
                }
              }}
              onFocus={() => setIsPasswordFocused(true)}
              onBlur={() => setIsPasswordFocused(false)}
              required
              placeholder="At least 8 characters"
              className={`w-full pl-9 pr-9 py-1.5 sm:py-2 rounded-xl border bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-all ${
                errors.password
                  ? 'border-rose-400 dark:border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-slate-300 dark:border-slate-700 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'
              }`}
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Real-time Password Validation Requirements Card (shows on focus) */}
          {isPasswordFocused && (
            <div
              role="region"
              aria-label="Password validation"
              className="mt-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-1 animate-fade-in"
            >
              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                <span>Password Requirements</span>
                <span className="text-[9px] font-normal text-slate-400 dark:text-slate-500">
                  {passwordCriteria.filter((c) => c.met).length} of 5 met
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                {passwordCriteria.map((criterion) => (
                  <div
                    key={criterion.id}
                    className={`flex items-center gap-1.5 text-[10px] leading-tight transition-colors duration-150 ${
                      criterion.met
                        ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {criterion.met ? (
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <Circle className="w-2.5 h-2.5 text-slate-300 dark:text-slate-600 shrink-0" />
                    )}
                    <span className="truncate">{criterion.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {errors.password && (
            <p className="text-[10px] text-rose-500 dark:text-rose-400 mt-0.5 flex items-center gap-1 font-medium leading-tight">
              <AlertCircle className="w-2.5 h-2.5 shrink-0" />
              <span>{errors.password}</span>
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              Confirm Password
            </label>
            {passwordsMatch && (
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                <Check className="w-2.5 h-2.5" /> Passwords match
              </span>
            )}
          </div>
          <div className="relative">
            <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              maxLength={100}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (e.target.value && password && e.target.value !== password) {
                  setErrors((prev) => ({ ...prev, confirmPassword: 'Passwords do not match' }));
                } else {
                  clearError('confirmPassword');
                }
              }}
              required
              placeholder="Re-enter your password"
              className={`w-full pl-9 pr-9 py-1.5 sm:py-2 rounded-xl border bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-all ${
                errors.confirmPassword
                  ? 'border-rose-400 dark:border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                  : passwordsMatch
                  ? 'border-emerald-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'
                  : 'border-slate-300 dark:border-slate-700 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'
              }`}
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-[10px] text-rose-500 dark:text-rose-400 mt-0.5 flex items-center gap-1 font-medium leading-tight">
              <AlertCircle className="w-2.5 h-2.5 shrink-0" />
              <span>{errors.confirmPassword}</span>
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 sm:py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 mt-1"
        >
          {loading ? (
            <span>Registering...</span>
          ) : (
            <>
              <span>Create Learner Account</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </form>

      {/* Footer Sign-in Link */}
      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 text-center text-xs">
        <p className="text-slate-500 dark:text-slate-400">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-bold underline transition-colors"
          >
            Sign In here
          </Link>
        </p>
      </div>
    </div>
  );
};