import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  RefreshCw,
  X,
  XCircle,
} from 'lucide-react';
import type { PaymentDetails, PaymentRecord, UserProfile } from '../types/cbt';
import { ApiError, apiRequest } from '../utils/api';

interface SubscriptionModalProps {
  isOpen: boolean;
  user: UserProfile | null;
  paymentDetails: PaymentDetails;
  onClose: () => void;
  onUserUpdated: (user: UserProfile) => void;
  onRequireAuth: () => void;
}

export function SubscriptionModal({
  isOpen,
  user,
  paymentDetails,
  onClose,
  onUserUpdated,
  onRequireAuth,
}: SubscriptionModalProps) {
  const [senderName, setSenderName] = useState('');
  const [reference, setReference] = useState('');
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hasPendingPayment = Boolean(
    user?.payments?.some((payment) => payment.status === 'pending'),
  );

  const refreshProfileStatus = useCallback(
    async (manual = false) => {
      if (!user) return;
      if (manual) setCheckingStatus(true);
      try {
        const res = await apiRequest<{ user: UserProfile }>('/api/auth/me');
        onUserUpdated(res.user);
        if (manual && res.user.hasActiveSubscription) {
          setSuccess('Your payment has been confirmed. Unlimited access is now active.');
        }
      } catch {
        // Ignore transient polling errors
      } finally {
        if (manual) setCheckingStatus(false);
      }
    },
    [user, onUserUpdated],
  );

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSuccess(null);
    if (user?.fullName && !senderName) {
      setSenderName(user.fullName);
    }
  }, [isOpen, user?.fullName, senderName]);

  // Poll every 5 seconds while waiting for admin payment confirmation
  useEffect(() => {
    if (!isOpen || !user || !hasPendingPayment || user.hasActiveSubscription) return;
    const interval = window.setInterval(() => {
      void refreshProfileStatus(false);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [isOpen, user, hasPendingPayment, refreshProfileStatus]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyAccount = async () => {
    try {
      await navigator.clipboard.writeText(paymentDetails.accountNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore if clipboard unavailable
    }
  };

  const handleSubmitPayment = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const result = await apiRequest<{ payment: PaymentRecord; user: UserProfile }>(
        '/api/billing/submit-payment',
        {
          method: 'POST',
          body: { senderName, reference },
        },
      );
      onUserUpdated(result.user);
      setReference('');
      setSuccess(
        'Transfer submitted. Once the admin confirms your PalmPay transfer, your account will unlock automatically.',
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to submit payment details.');
    } finally {
      setSubmitting(false);
    }
  };

  const usagePercentage = user
    ? Math.min(100, Math.round((user.usageCount / user.freeLimit) * 100))
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="billing-modal-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2
              id="billing-modal-title"
              className="text-lg font-semibold text-slate-900 dark:text-white"
            >
              Monthly Subscription &amp; Usage Quota
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              20 free examinations per account · ₦1,000/month thereafter for unlimited access
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close subscription dialog"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto p-6">
          {/* Usage Status Banner */}
          {user ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              {user.hasActiveSubscription && user.subscriptionActiveUntil ? (
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      <span>Payment Confirmed · Monthly Subscription Active</span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                      Unlimited examinations enabled until{' '}
                      {new Date(user.subscriptionActiveUntil).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-9 shrink-0 items-center rounded-lg bg-emerald-600 px-3.5 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    Continue to Exams
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span
                      className={
                        user.quotaExhausted
                          ? 'text-red-700 dark:text-red-400'
                          : 'text-slate-700 dark:text-slate-200'
                      }
                    >
                      {user.quotaExhausted
                        ? 'Free Limit Reached — Monthly Plan Required'
                        : 'Free Trial Usage'}
                    </span>
                    <span className="font-mono tabular-nums text-slate-900 dark:text-white">
                      {user.usageCount} / {user.freeLimit} used
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className={`h-full transition-all duration-300 ${
                        user.quotaExhausted ? 'bg-red-600' : 'bg-sky-600 dark:bg-sky-500'
                      }`}
                      style={{ width: `${usagePercentage}%` }}
                    />
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {user.quotaExhausted
                        ? 'Transfer ₦1,000 below and submit your reference for admin confirmation.'
                        : `${user.remainingFreeUses} free examination ${
                            user.remainingFreeUses === 1 ? 'session' : 'sessions'
                          } remaining.`}
                    </p>
                    {hasPendingPayment && (
                      <button
                        type="button"
                        disabled={checkingStatus}
                        onClick={() => void refreshProfileStatus(true)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        <RefreshCw
                          className={`h-3 w-3 ${checkingStatus ? 'animate-spin' : ''}`}
                          aria-hidden="true"
                        />
                        <span>Check Status</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Sign in or create an account to track your 20 free uses and activate monthly access.
              </p>
              <button
                type="button"
                onClick={onRequireAuth}
                className="inline-flex h-9 shrink-0 items-center rounded-lg bg-sky-600 px-3.5 text-xs font-semibold text-white hover:bg-sky-700"
              >
                Sign In
              </button>
            </div>
          )}

          {/* PalmPay Payment Account Details */}
          <div className="rounded-xl border border-slate-200 p-5 dark:border-slate-800">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <CreditCard className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
              <span>Monthly Transfer Account Details</span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Transfer <strong className="text-slate-900 dark:text-white">₦1,000</strong> monthly
              to the PalmPay account below, then submit your transfer reference.
            </p>

            <dl className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-slate-50/70 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-800/40">
              <div className="flex items-center justify-between px-4 py-3 text-sm">
                <dt className="text-slate-500 dark:text-slate-400">Monthly Fee</dt>
                <dd className="font-mono font-semibold text-slate-900 dark:text-white">
                  ₦1,000 / month
                </dd>
              </div>
              <div className="flex items-center justify-between px-4 py-3 text-sm">
                <dt className="text-slate-500 dark:text-slate-400">Bank Name</dt>
                <dd className="font-semibold text-slate-900 dark:text-white">
                  {paymentDetails.bankName}
                </dd>
              </div>
              <div className="flex items-center justify-between px-4 py-3 text-sm">
                <dt className="text-slate-500 dark:text-slate-400">Account Number</dt>
                <dd className="flex items-center gap-2">
                  <span className="font-mono text-base font-bold tracking-wider tabular-nums text-sky-700 dark:text-sky-400">
                    {paymentDetails.accountNumber}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyAccount}
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </dd>
              </div>
              <div className="flex items-center justify-between px-4 py-3 text-sm">
                <dt className="text-slate-500 dark:text-slate-400">Account Name</dt>
                <dd className="font-semibold text-slate-900 dark:text-white">
                  {paymentDetails.accountName}
                </dd>
              </div>
            </dl>
          </div>

          {/* Submit Payment Proof Form */}
          {user && !user.hasActiveSubscription && (
            <form onSubmit={handleSubmitPayment} className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Confirm Your ₦1,000 Transfer
              </h3>

              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
                >
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                  {success}
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="payment-sender"
                    className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Sender Name
                  </label>
                  <input
                    id="payment-sender"
                    type="text"
                    required
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Account name you sent from"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:border-sky-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label
                    htmlFor="payment-reference"
                    className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    PalmPay Transfer Reference / ID
                  </label>
                  <input
                    id="payment-reference"
                    type="text"
                    required
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="e.g. PP-20261117-8841"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono text-sm text-slate-900 focus:border-sky-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:opacity-50 dark:bg-sky-500 dark:hover:bg-sky-600"
              >
                {submitting ? 'Submitting confirmation...' : 'Submit Transfer for Verification'}
              </button>
            </form>
          )}

          {/* User Payment History */}
          {user && user.payments.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                Your Payment Submissions
              </h3>
              <div className="mt-2.5 divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {user.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-xs"
                  >
                    <div>
                      <p className="font-mono font-semibold text-slate-900 dark:text-white">
                        ₦{payment.amount.toLocaleString()} · {payment.reference}
                      </p>
                      <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                        From {payment.senderName} ·{' '}
                        {new Date(payment.submittedAt).toLocaleDateString()}
                      </p>
                      {payment.reviewNote && (
                        <p className="mt-0.5 text-slate-600 dark:text-slate-300">
                          {payment.reviewNote}
                        </p>
                      )}
                    </div>
                    {payment.status === 'approved' && (
                      <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Confirmed</span>
                      </span>
                    )}
                    {payment.status === 'pending' && (
                      <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Awaiting Admin</span>
                      </span>
                    )}
                    {payment.status === 'rejected' && (
                      <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-red-700 dark:text-red-400">
                        <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Rejected</span>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
