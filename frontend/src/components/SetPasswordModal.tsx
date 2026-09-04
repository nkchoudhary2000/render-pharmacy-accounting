import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/endpoints';

export const SetPasswordModal: React.FC = () => {
  const { user, updateUser, requiresPasswordSetup, setRequiresPasswordSetup } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!requiresPasswordSetup || !user || user.has_password) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.changePassword({ new_password: newPassword });
      // Fetch refreshed user which now has has_password=true and auth_provider=LOCAL
      const refreshedUser = await authApi.getMe();
      updateUser(refreshedUser);
      setSuccess(true);
      setTimeout(() => {
        setRequiresPasswordSetup(false);
        setSuccess(false);
        setNewPassword('');
        setConfirmPassword('');
      }, 1800);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to set password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-teal-800 to-slate-900 p-6 text-white relative">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-pharmacy-teal-500/20 border border-pharmacy-teal-400/30 rounded-2xl text-pharmacy-teal-300">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-400/20 text-teal-200 border border-teal-400/30 mb-1">
                External Login Detected
              </span>
              <h2 className="text-xl font-bold tracking-tight">Set Account Password</h2>
            </div>
          </div>
          <p className="text-xs text-teal-100/80 mt-2.5 leading-relaxed">
            You signed in through an external Google portal. Set a password now so your account is treated as a <strong>local user</strong> and you can log in directly anytime with your email & password.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {success ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Account Converted to Local User!</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Your password has been saved. You can now log into PharmaLedger directly with <strong>{user.email}</strong> and your new password.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* User Email Banner */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">User Account:</span>
                <span className="font-bold text-slate-800 font-mono">{user.email}</span>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter at least 6 characters"
                    required
                    className="w-full pl-3.5 pr-10 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pharmacy-teal-500 font-medium text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your new password"
                    required
                    className="w-full pl-3.5 pr-10 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pharmacy-teal-500 font-medium text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setRequiresPasswordSetup(false)}
                  className="w-1/3 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Remind Later
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-2/3 py-2.5 text-xs font-bold bg-pharmacy-teal-600 hover:bg-pharmacy-teal-700 text-white rounded-xl shadow-md shadow-teal-900/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Save & Activate Local User
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
