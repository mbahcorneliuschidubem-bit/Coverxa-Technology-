import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, CheckCircle2, KeyRound, Lock, Mail, User, X } from 'lucide-react';
import type { PaymentDetails, UserProfile } from '../types/cbt';
import { ApiError, apiRequest, setAuthToken } from '../utils/api';

export type AuthModalTab = 'login' | 'signup' | 'forgot';

interface AuthModalProps {
  isOpen: boolean;
  initialTab?: AuthModalTab;
  reason?: string | null;
  onClose: () => void;
  onAuthenticated: (user: UserProfile, paymentDetails?: PaymentDetails) => void;
}

export function AuthModal({
  isOpen,
  initialTab = 'login',
  reason = null,
  onClose,
  onAuthenticated,
}: AuthModalProps) {
  const [tab, setTab] = useState<AuthModalTab>(initialTab);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Forgot password state
  const [resetStep, setResetStep] = useState<'request' | 'verify'>('request');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [codePreview, setCodePreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTab(initialTab);
    setError(null);
    setSuccessMessage(null);
    setResetStep('request');
    setCodePreview(null);
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const switchTab = (nextTab: AuthModalTab) => {
    setTab(nextTab);
    setError(null);
    setSuccessMessage(null);
    if (nextTab === 'forgot') {
      setResetStep('request');
      setCodePreview(null);
    }
  };

  const handleLoginSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      const result = await apiRequest<{
        token: string;
        user: UserProfile;
        paymentDetails: PaymentDetails;
      }>('/api/auth/login', {
        method: 'POST',
        body: { email, password },
        token: null,
      });
      setAuthToken(result.token);
      onAuthenticated(result.user, result.paymentDetails);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      const result = await apiRequest<{
        token: string;
        user: UserProfile;
        paymentDetails: PaymentDetails;
      }>('/api/auth/signup', {
        method: 'POST',
        body: { fullName, email, password },
        token: null,
      });
      setAuthToken(result.token);
      onAuthenticated(result.user, result.paymentDetails);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create account.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestResetCode = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      const result = await apiRequest<{
        ok: boolean;
        message: string;
        resetCodePreview?: string;
      }>('/api/auth/forgot-password', {
        method: 'POST',
        body: { email },
        token: null,
      });
      setCodePreview(result.resetCodePreview ?? null);
      setSuccessMessage(result.message);
      setResetStep('verify');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to send reset code.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteReset = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      const result = await apiRequest<{ ok: boolean; message: string }>(
        '/api/auth/reset-password',
        {
          method: 'POST',
          body: { email, code: resetCode, newPassword },
          token: null,
        },
      );
      setPassword('');
      setResetCode('');
      setNewPassword('');
      setCodePreview(null);
      setTab('login');
      setSuccessMessage(result.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
          <div>
            <h2
              id="auth-modal-title"
              className="text-lg font-semibold text-slate-900 dark:text-white"
            >
              {tab === 'login' && 'Sign In to Corvexa'}
              {tab === 'signup' && 'Create Student Account'}
              {tab === 'forgot' && 'Reset Your Password'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {tab === 'forgot'
                ? 'Verify your account email to set a new password.'
                : 'Includes 20 free UTME Chemistry practice sessions per account.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close account dialog"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {reason && (
          <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-xs font-medium text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200">
            {reason}
          </div>
        )}

        {tab !== 'forgot' && (
          <div className="mt-5 grid grid-cols-2 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => switchTab('login')}
              className={`rounded-md py-2 text-xs font-semibold transition-colors ${
                tab === 'login'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchTab('signup')}
              className={`rounded-md py-2 text-xs font-semibold transition-colors ${
                tab === 'signup'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{successMessage}</span>
          </div>
        )}

        {tab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pr-3 pl-9 text-sm text-slate-900 focus:border-sky-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => switchTab('forgot')}
                  className="text-xs font-medium text-sky-700 hover:underline dark:text-sky-400"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pr-3 pl-9 text-sm text-slate-900 focus:border-sky-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:opacity-50 dark:bg-sky-500 dark:hover:bg-sky-600"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        {tab === 'signup' && (
          <form onSubmit={handleSignupSubmit} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="signup-name"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Full Name
              </label>
              <div className="relative">
                <User
                  className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="signup-name"
                  type="text"
                  required
                  minLength={2}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Adaeze Okafor"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pr-3 pl-9 text-sm text-slate-900 focus:border-sky-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="signup-email"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="signup-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pr-3 pl-9 text-sm text-slate-900 focus:border-sky-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="signup-password"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Password (min. 6 characters)
              </label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="signup-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pr-3 pl-9 text-sm text-slate-900 focus:border-sky-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:opacity-50 dark:bg-sky-500 dark:hover:bg-sky-600"
            >
              {loading ? 'Creating account...' : 'Create Free Account'}
            </button>
          </form>
        )}

        {tab === 'forgot' && (
          <div className="mt-5 space-y-4">
            <button
              type="button"
              onClick={() => switchTab('login')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Back to Sign In</span>
            </button>

            {resetStep === 'request' ? (
              <form onSubmit={handleRequestResetCode} className="space-y-4">
                <div>
                  <label
                    htmlFor="forgot-email"
                    className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Account Email Address
                  </label>
                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <input
                      id="forgot-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your registered email"
                      className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pr-3 pl-9 text-sm text-slate-900 focus:border-sky-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:opacity-50 dark:bg-sky-500 dark:hover:bg-sky-600"
                >
                  {loading ? 'Generating code...' : 'Send Reset Verification Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleCompleteReset} className="space-y-4">
                {codePreview && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 dark:border-amber-800 dark:bg-amber-950/40">
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                      Verification Code (valid 15 minutes):
                    </p>
                    <p className="mt-1 font-mono text-2xl font-bold tracking-widest tabular-nums text-amber-950 dark:text-amber-100">
                      {codePreview}
                    </p>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="reset-code"
                    className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    6-Digit Verification Code
                  </label>
                  <div className="relative">
                    <KeyRound
                      className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <input
                      id="reset-code"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pr-3 pl-9 font-mono text-sm tracking-widest text-slate-900 focus:border-sky-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="reset-new-password"
                    className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    New Password (min. 6 characters)
                  </label>
                  <div className="relative">
                    <Lock
                      className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <input
                      id="reset-new-password"
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pr-3 pl-9 text-sm text-slate-900 focus:border-sky-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:opacity-50 dark:bg-sky-500 dark:hover:bg-sky-600"
                >
                  {loading ? 'Updating password...' : 'Update Password'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
