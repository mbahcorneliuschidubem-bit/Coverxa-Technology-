import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, KeyRound, Search, ShieldCheck, X, XCircle } from 'lucide-react';
import type { OwnerOverview } from '../types/cbt';
import { ApiError, apiRequest, getOwnerToken, setOwnerToken } from '../utils/api';

interface OwnerPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshCurrentUser: () => void;
}

export function OwnerPortalModal({
  isOpen,
  onClose,
  onRefreshCurrentUser,
}: OwnerPortalModalProps) {
  const [claimed, setClaimed] = useState<boolean | null>(null);
  const [passcode, setPasscode] = useState('');
  const [ownerToken, setLocalOwnerToken] = useState<string | null>(() => getOwnerToken());
  const [overview, setOverview] = useState<OwnerOverview | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'users'>('pending');
  const [studentQuery, setStudentQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const loadOverview = useCallback(async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<OwnerOverview>('/api/owner/payments', {
        ownerToken: token,
      });
      setOverview(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setOwnerToken(null);
        setLocalOwnerToken(null);
        setOverview(null);
      } else {
        setError(err instanceof ApiError ? err.message : 'Unable to load admin data.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setActionNotice(null);
    apiRequest<{ claimed: boolean }>('/api/owner/status')
      .then((res) => setClaimed(res.claimed))
      .catch(() => setClaimed(null));

    if (ownerToken) {
      void loadOverview(ownerToken);
    }
  }, [isOpen, ownerToken, loadOverview]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAuthSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = claimed === false ? '/api/owner/claim' : '/api/owner/login';
      const result = await apiRequest<{ ownerToken: string }>(endpoint, {
        method: 'POST',
        body: { passcode },
      });
      setOwnerToken(result.ownerToken);
      setLocalOwnerToken(result.ownerToken);
      setClaimed(true);
      setPasscode('');
      await loadOverview(result.ownerToken);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (paymentId: string, userName: string) => {
    if (!ownerToken) return;
    setActionNotice(null);
    try {
      await apiRequest(`/api/owner/payments/${paymentId}/approve`, {
        method: 'POST',
        ownerToken,
        body: { note: 'Confirmed PalmPay ₦1,000 transfer — 30 days access granted' },
      });
      await loadOverview(ownerToken);
      onRefreshCurrentUser();
      setActionNotice(`Confirmed payment for ${userName}. 30-day unlimited access is now active.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not confirm payment.');
    }
  };

  const handleReject = async (paymentId: string) => {
    if (!ownerToken) return;
    setActionNotice(null);
    try {
      await apiRequest(`/api/owner/payments/${paymentId}/reject`, {
        method: 'POST',
        ownerToken,
        body: { note: 'Transfer not yet matched on PalmPay 7026158630.' },
      });
      await loadOverview(ownerToken);
      onRefreshCurrentUser();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reject payment.');
    }
  };

  const handleActivateUser = async (userId: string, fullName: string) => {
    if (!ownerToken) return;
    setActionNotice(null);
    try {
      await apiRequest(`/api/owner/users/${userId}/activate`, {
        method: 'POST',
        ownerToken,
      });
      await loadOverview(ownerToken);
      onRefreshCurrentUser();
      setActionNotice(`Granted 30-day unlimited access to ${fullName}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not activate subscription.');
    }
  };

  const handleResetQuota = async (userId: string, fullName: string) => {
    if (!ownerToken) return;
    setActionNotice(null);
    try {
      await apiRequest(`/api/owner/users/${userId}/reset-quota`, {
        method: 'POST',
        ownerToken,
      });
      await loadOverview(ownerToken);
      onRefreshCurrentUser();
      setActionNotice(`Reset free usage counter (0 / 20) for ${fullName}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reset free quota.');
    }
  };

  const handleSignOutOwner = () => {
    setOwnerToken(null);
    setLocalOwnerToken(null);
    setOverview(null);
  };

  const pendingPayments = overview?.payments.filter((p) => p.status === 'pending') ?? [];
  const displayedPayments =
    activeTab === 'pending' ? pendingPayments : overview?.payments ?? [];
  const normalizedQuery = studentQuery.trim().toLowerCase();
  const filteredUsers =
    overview?.users.filter(
      (u) =>
        u.fullName.toLowerCase().includes(normalizedQuery) ||
        u.email.toLowerCase().includes(normalizedQuery),
    ) ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="owner-portal-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2
              id="owner-portal-title"
              className="text-lg font-semibold text-slate-900 dark:text-white"
            >
              Admin Payment Confirmation Console
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Confirm PalmPay transfers (7026158630 · Mbah Johnpaul Tochukwu) so students can
              continue practicing
            </p>
          </div>
          <div className="flex items-center gap-2">
            {overview && (
              <button
                type="button"
                onClick={handleSignOutOwner}
                className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Lock Console
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close admin console"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-6">
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
            >
              {error}
            </div>
          )}

          {actionNotice && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{actionNotice}</span>
            </div>
          )}

          {!overview ? (
            <form onSubmit={handleAuthSubmit} className="mx-auto max-w-sm space-y-4 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <ShieldCheck className="h-5 w-5 text-sky-600 dark:text-sky-400" aria-hidden="true" />
                <span>
                  {claimed === false
                    ? 'Set Admin Passcode (First-Time Setup)'
                    : 'Enter Admin Passcode'}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {claimed === false
                  ? 'Create a private admin passcode (minimum 6 characters) to confirm student ₦1,000 PalmPay transfers and allow continued access.'
                  : 'Enter your admin passcode to confirm submitted transfers and manage student subscriptions.'}
              </p>

              <div className="relative">
                <KeyRound
                  className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter admin passcode"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pr-3 pl-9 text-sm text-slate-900 focus:border-sky-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50 dark:bg-sky-500 dark:hover:bg-sky-600"
              >
                {loading
                  ? 'Verifying...'
                  : claimed === false
                    ? 'Configure Admin Console'
                    : 'Unlock Admin Console'}
              </button>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveTab('pending')}
                    className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                      activeTab === 'pending'
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                    }`}
                  >
                    Pending ({pendingPayments.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('all')}
                    className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                      activeTab === 'all'
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                    }`}
                  >
                    All Transfers ({overview.payments.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('users')}
                    className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                      activeTab === 'users'
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                    }`}
                  >
                    Students ({overview.users.length})
                  </button>
                </div>

                {activeTab === 'users' && (
                  <div className="relative w-full sm:w-56">
                    <Search
                      className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      value={studentQuery}
                      onChange={(e) => setStudentQuery(e.target.value)}
                      placeholder="Search student..."
                      className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pr-3 pl-9 text-xs text-slate-900 focus:border-sky-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                )}
              </div>

              {activeTab !== 'users' ? (
                <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                  {displayedPayments.length === 0 ? (
                    <p className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                      {activeTab === 'pending'
                        ? 'No pending transfers awaiting confirmation.'
                        : 'No transfer confirmations have been submitted yet.'}
                    </p>
                  ) : (
                    displayedPayments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {payment.userName}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="text-slate-500 dark:text-slate-400">
                              {payment.userEmail}
                            </span>
                          </div>
                          <p className="mt-1 font-mono text-xs font-semibold text-sky-700 dark:text-sky-400">
                            ₦{payment.amount.toLocaleString()} · Ref: {payment.reference} · Sender:{' '}
                            {payment.senderName}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            Submitted {new Date(payment.submittedAt).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          {payment.status === 'pending' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => void handleApprove(payment.id, payment.userName)}
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>Confirm Payment &amp; Allow Access</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleReject(payment.id)}
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
                              >
                                <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>Reject</span>
                              </button>
                            </>
                          ) : (
                            <span
                              className={`text-xs font-semibold ${
                                payment.status === 'approved'
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : 'text-red-700 dark:text-red-400'
                              }`}
                            >
                              {payment.status === 'approved' ? 'Confirmed' : 'Rejected'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                      <tr>
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3">Free Uses</th>
                        <th className="px-4 py-3">Access Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {filteredUsers.map((u) => (
                        <tr key={u.id}>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {u.fullName}
                            </p>
                            <p className="text-slate-500 dark:text-slate-400">{u.email}</p>
                          </td>
                          <td className="px-4 py-3 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                            {u.usageCount} / 20
                          </td>
                          <td className="px-4 py-3">
                            {u.hasActiveSubscription && u.subscriptionActiveUntil ? (
                              <span className="font-medium text-emerald-700 dark:text-emerald-400">
                                Active until{' '}
                                {new Date(u.subscriptionActiveUntil).toLocaleDateString()}
                              </span>
                            ) : (
                              <span className="text-slate-500 dark:text-slate-400">
                                {u.usageCount >= 20 ? 'Limit Reached' : 'Free Tier'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-2">
                              {u.usageCount > 0 && (
                                <button
                                  type="button"
                                  onClick={() => void handleResetQuota(u.id, u.fullName)}
                                  className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-white px-2.5 font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                >
                                  Reset Uses
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => void handleActivateUser(u.id, u.fullName)}
                                className="inline-flex h-8 items-center rounded-md bg-sky-600 px-2.5 font-semibold text-white hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600"
                              >
                                {u.hasActiveSubscription ? '+30 Days' : 'Allow 30 Days'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-6 text-center text-slate-500 dark:text-slate-400"
                          >
                            No matching students found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
