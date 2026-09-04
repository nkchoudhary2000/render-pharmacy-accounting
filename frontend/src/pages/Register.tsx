import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HeartPulse, Lock, Mail, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await register(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-pharmacy-teal-500 to-pharmacy-mint-400 flex items-center justify-center text-white shadow-xl shadow-teal-900/40 mb-4">
          <HeartPulse className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-black tracking-tight text-white">PharmaLedger</h2>
        <p className="mt-1 text-sm text-teal-200/80">Account Registration</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-3xl sm:px-10 border border-slate-100">
          <div className="mb-5">
            <h3 className="text-xl font-bold text-slate-900">Create New Account</h3>
            <p className="text-xs text-slate-500 mt-1">Join PharmaLedger management network</p>
          </div>

          {/* Admin Initialization Notification */}
          <div className="mb-5 p-3.5 rounded-xl bg-teal-50 border border-teal-200 flex items-start gap-2.5 text-xs text-teal-900">
            <ShieldCheck className="w-4 h-4 shrink-0 text-pharmacy-teal-600 mt-0.5" />
            <p>
              <strong>First-User Rule:</strong> The first registered user automatically acquires the <strong>ADMIN</strong> role. All subsequent registrations default to <strong>STAFF</strong>.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-xs text-rose-700 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@pharmacy.com"
                  className="block w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-pharmacy-teal-500 focus:ring-2 focus:ring-pharmacy-teal-400/30 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="block w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-pharmacy-teal-500 focus:ring-2 focus:ring-pharmacy-teal-400/30 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Confirm Password
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="block w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-pharmacy-teal-500 focus:ring-2 focus:ring-pharmacy-teal-400/30 outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-pharmacy-teal-600 to-pharmacy-mint-600 hover:from-pharmacy-teal-700 hover:to-pharmacy-mint-700 shadow-md shadow-teal-700/20 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {isLoading ? 'Creating Account...' : 'Register Account'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-pharmacy-teal-600 hover:text-pharmacy-teal-700">
              Sign in instead
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
