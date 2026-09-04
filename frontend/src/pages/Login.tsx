import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HeartPulse, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

import { authApi } from '../api/endpoints';

declare global {
  interface Window {
    google?: any;
  }
}

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [googleClientId, setGoogleClientId] = useState<string>('');
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();

  // Dynamically fetch Google Client ID from backend so only 1 env file is needed
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const cfg = await authApi.getConfig();
        const cid = cfg.google_client_id || import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
        setGoogleClientId(cid);

        if (window.google?.accounts?.id && cid) {
          window.google.accounts.id.initialize({
            client_id: cid,
            callback: async (response: any) => {
              if (response?.credential) {
                try {
                  setIsLoading(true);
                  setError(null);
                  await googleLogin(response.credential);
                  navigate('/');
                } catch (err: any) {
                  setError(err.response?.data?.detail || 'Google authentication failed');
                } finally {
                  setIsLoading(false);
                }
              }
            },
          });

          const googleBtn = document.getElementById('googleSignInDiv');
          if (googleBtn) {
            window.google.accounts.id.renderButton(googleBtn, {
              theme: 'outline',
              size: 'large',
              width: 320,
              text: 'continue_with',
              shape: 'pill',
            });
          }
        }
      } catch (e) {
        console.warn('Google Identity initialization notice:', e);
      }
    };

    fetchConfig();
  }, [googleLogin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomGoogleClick = () => {
    if (!googleClientId) {
      setError('Google Client ID is not configured yet. Please add VITE_GOOGLE_CLIENT_ID to frontend/.env.');
      return;
    }

    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      setError('Google Identity Service script is loading. Please try again in a few seconds.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-pharmacy-teal-500 to-pharmacy-mint-400 flex items-center justify-center text-white shadow-xl shadow-teal-900/40 mb-4">
          <HeartPulse className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-black tracking-tight text-white">PharmaLedger</h2>
        <p className="mt-1 text-sm text-teal-200/80">Pharmacy Accounting & Clinical Management System</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-3xl sm:px-10 border border-slate-100">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-slate-900">Sign in to your account</h3>
            <p className="text-xs text-slate-500 mt-1">Access inventory, accounting ledgers, and clinical records</p>
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
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-pharmacy-teal-500 focus:ring-2 focus:ring-pharmacy-teal-400/30 outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-pharmacy-teal-600 to-pharmacy-mint-600 hover:from-pharmacy-teal-700 hover:to-pharmacy-mint-700 shadow-md shadow-teal-700/20 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Divider */}
          <div className="my-5 relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full"></div>
            <span className="bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider absolute">
              or continue with
            </span>
          </div>

          {/* Google Sign-In section right below email/password fields */}
          <div className="space-y-2">
            <div id="googleSignInDiv" className="w-full flex justify-center"></div>

            {/* Custom Google Button Fallback / Prompt Trigger */}
            {(!googleClientId || !window.google?.accounts?.id) && (
              <button
                type="button"
                onClick={handleCustomGoogleClick}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm shadow-xs transition-colors"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Continue with Google</span>
              </button>
            )}
          </div>

          {/* Register Link */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-pharmacy-teal-600 hover:text-pharmacy-teal-700">
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
