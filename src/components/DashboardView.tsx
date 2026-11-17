import { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Bot,
  Clock,
  CreditCard,
  Lock,
  RotateCcw,
  Search,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { EXAM_YEARS } from '../data/questionBank';
import type {
  ExamHistoryEntry,
  ExamMode,
  MissedQuestionItem,
  UserProfile,
  YearDecadeFilter,
} from '../types/cbt';
import { formatDuration } from '../utils/exportScorecard';

interface DashboardViewProps {
  user: UserProfile | null;
  examMode: ExamMode;
  startingYear: number | null;
  isDark: boolean;
  onToggleTheme: () => void;
  onChangeMode: (mode: ExamMode) => void;
  onStartExam: (year: number) => void;
  history: ExamHistoryEntry[];
  missedQuestions: MissedQuestionItem[];
  onOpenAiTutor: (items: MissedQuestionItem[], startIndex: number) => void;
  onClearHistory: () => void;
  onOpenReference: () => void;
  onOpenAuth: (tab?: 'login' | 'signup') => void;
  onOpenBilling: () => void;
  onOpenOwnerPortal: () => void;
}

const DECADE_FILTERS: Array<{ id: YearDecadeFilter; label: string }> = [
  { id: 'all', label: 'All Years (27)' },
  { id: '2000s', label: '2000–2009' },
  { id: '2010s', label: '2010–2019' },
  { id: '2020s', label: '2020–2026' },
];

export function DashboardView({
  user,
  examMode,
  startingYear,
  isDark,
  onToggleTheme,
  onChangeMode,
  onStartExam,
  history,
  missedQuestions,
  onOpenAiTutor,
  onClearHistory,
  onOpenReference,
  onOpenAuth,
  onOpenBilling,
  onOpenOwnerPortal,
}: DashboardViewProps) {
  const [decadeFilter, setDecadeFilter] = useState<YearDecadeFilter>('all');
  const [searchYear, setSearchYear] = useState('');

  const bestScoreByYear = useMemo(() => {
    const map = new Map<number, number>();
    for (const entry of history) {
      const currentBest = map.get(entry.year);
      if (currentBest === undefined || entry.score > currentBest) {
        map.set(entry.year, entry.score);
      }
    }
    return map;
  }, [history]);

  const filteredYears = useMemo(() => {
    const query = searchYear.trim();
    return EXAM_YEARS.filter((year) => {
      if (decadeFilter === '2000s' && (year < 2000 || year > 2009)) return false;
      if (decadeFilter === '2010s' && (year < 2010 || year > 2019)) return false;
      if (decadeFilter === '2020s' && year < 2020) return false;
      if (query && !String(year).includes(query)) return false;
      return true;
    });
  }, [decadeFilter, searchYear]);

  const averageScore = useMemo(() => {
    if (history.length === 0) return null;
    const total = history.reduce((sum, item) => sum + item.score, 0);
    return Math.round(total / history.length);
  }, [history]);

  return (
    <div className="space-y-8">
      {/* Overview Section */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-wider text-sky-700 uppercase dark:text-sky-400">
              JAMB UTME Chemistry
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              Computer-Based Examination Practice
            </h1>
            <p className="mt-2.5 text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
              Practice 40-question Chemistry examinations from 2000 to 2026 with topic analytics
              and worked solutions. Every account receives 20 free practice sessions before
              ₦1,000/month subscription access.
            </p>
          </div>

          <div className="flex flex-col items-start gap-2.5 sm:flex-row sm:items-center">
            <div
              role="group"
              aria-label="Session mode"
              className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800"
            >
              <button
                type="button"
                onClick={() => onChangeMode('timed')}
                className={`inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3.5 text-xs font-semibold transition-colors ${
                  examMode === 'timed'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Timed Exam (40m)</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeMode('practice')}
                className={`inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3.5 text-xs font-semibold transition-colors ${
                  examMode === 'practice'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Untimed Study</span>
              </button>
            </div>
          </div>
        </div>

        {/* Account & Quota Bar */}
        <div className="mt-6 flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-800/40">
          {user ? (
            <>
              <div className="flex items-start gap-3">
                <UserCheck
                  className="mt-0.5 h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400"
                  aria-hidden="true"
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <span>{user.fullName}</span>
                    <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                      ({user.email})
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                    {user.hasActiveSubscription && user.subscriptionActiveUntil ? (
                      <span className="font-medium text-emerald-700 dark:text-emerald-400">
                        Monthly Plan Active — Unlimited access until{' '}
                        {new Date(user.subscriptionActiveUntil).toLocaleDateString()}
                      </span>
                    ) : user.quotaExhausted ? (
                      <span className="font-medium text-red-700 dark:text-red-400">
                        20 / 20 free sessions used — Pay ₦1,000/month to PalmPay (7026158630) to
                        continue
                      </span>
                    ) : (
                      <span>
                        Free Access:{' '}
                        <strong className="font-mono tabular-nums text-slate-900 dark:text-white">
                          {user.usageCount} / {user.freeLimit}
                        </strong>{' '}
                        used ({user.remainingFreeUses} free{' '}
                        {user.remainingFreeUses === 1 ? 'session' : 'sessions'} left)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenBilling}
                className={`inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-4 text-xs font-semibold transition-colors ${
                  user.quotaExhausted
                    ? 'bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{user.quotaExhausted ? 'Pay ₦1,000 / Month' : 'Subscription & Quota'}</span>
              </button>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <Lock
                  className="mt-0.5 h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Sign in or create an account to begin
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                    Track your 20 free examination uses, save scores, and manage monthly access.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  className="inline-flex h-10 shrink-0 items-center rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('signup')}
                  className="inline-flex h-10 shrink-0 items-center rounded-lg bg-sky-600 px-4 text-xs font-semibold text-white hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600"
                >
                  Create Free Account
                </button>
              </div>
            </>
          )}
        </div>

        {/* Mobile Quick Utilities */}
        <div className="mt-4 flex flex-wrap gap-2 md:hidden">
          <button
            type="button"
            onClick={onOpenReference}
            className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            Constants &amp; Elements
          </button>
          <button
            type="button"
            onClick={onOpenBilling}
            className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            Subscription
          </button>
          <button
            type="button"
            onClick={onOpenOwnerPortal}
            className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            Admin Console
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {isDark ? 'Light Theme' : 'Dark Theme'}
          </button>
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-6 border-t border-slate-200 pt-6 sm:grid-cols-4 dark:border-slate-800">
          <div>
            <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Examination Archive
            </dt>
            <dd className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
              27 Years
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Questions Per Paper
            </dt>
            <dd className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
              40 Items
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Free Trial Limit
            </dt>
            <dd className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
              {user ? `${user.usageCount} / ${user.freeLimit}` : '20 Uses'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {averageScore !== null ? 'Your Average Score' : 'Monthly Plan'}
            </dt>
            <dd className="mt-1 font-mono text-2xl font-semibold tabular-nums text-sky-700 dark:text-sky-400">
              {averageScore !== null ? `${averageScore} / 100` : '₦1,000/mo'}
            </dd>
          </div>
        </dl>
      </section>

      {/* Year Selection Grid */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center dark:border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Select Examination Year
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Choose a past paper to begin in{' '}
              {examMode === 'timed' ? '40-minute timed' : 'untimed study'} mode.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex flex-wrap rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              {DECADE_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setDecadeFilter(filter.id)}
                  className={`shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    decadeFilter === filter.id
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-40">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={searchYear}
                onChange={(event) => setSearchYear(event.target.value.replace(/\D/g, ''))}
                placeholder="Find year..."
                aria-label="Filter examination year"
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pr-3 pl-9 font-mono text-xs text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-sky-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7">
          {filteredYears.map((year) => {
            const best = bestScoreByYear.get(year);
            const isStarting = startingYear === year;
            return (
              <button
                key={year}
                type="button"
                disabled={startingYear !== null}
                onClick={() => onStartExam(year)}
                className="group flex min-h-[76px] flex-col items-start justify-between rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 text-left transition-colors hover:border-sky-600 hover:bg-sky-50/70 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:border-slate-800 dark:bg-slate-800/50 dark:hover:border-sky-500 dark:hover:bg-sky-950/40"
              >
                <div className="flex w-full items-center justify-between">
                  <span className="font-mono text-base font-semibold tabular-nums text-slate-900 group-hover:text-sky-700 dark:text-white dark:group-hover:text-sky-300">
                    {year}
                  </span>
                  <ArrowRight
                    className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-sky-600 dark:group-hover:text-sky-400"
                    aria-hidden="true"
                  />
                </div>
                <span className="mt-2 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                  {isStarting
                    ? 'Starting...'
                    : best !== undefined
                      ? `Best: ${best}%`
                      : '40 Questions'}
                </span>
              </button>
            );
          })}
        </div>

        {filteredYears.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No examination papers match &ldquo;{searchYear}&rdquo;.
            </p>
            <button
              type="button"
              onClick={() => {
                setDecadeFilter('all');
                setSearchYear('');
              }}
              className="mt-3 text-xs font-semibold text-sky-700 hover:underline dark:text-sky-400"
            >
              Reset year filter
            </button>
          </div>
        )}
      </section>

      {/* Score History Section */}
      {history.length > 0 && (
        <section
          id="score-history-section"
          className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Recent Practice History
              </h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                Saved to your account across {history.length} completed{' '}
                {history.length === 1 ? 'session' : 'sessions'}.
              </p>
            </div>
            <button
              type="button"
              onClick={onClearHistory}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 transition-colors hover:border-red-300 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-sky-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-red-800 dark:hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Clear History</span>
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <tr>
                  <th className="py-3 pr-4">Year</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Correct</th>
                  <th className="px-4 py-3">Time Used</th>
                  <th className="px-4 py-3">Completed</th>
                  <th className="py-3 pl-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {history.slice(0, 8).map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                    <td className="py-3 pr-4 font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                      {entry.year}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {entry.mode === 'timed' ? 'Timed Exam' : 'Study Mode'}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold tabular-nums text-sky-700 dark:text-sky-400">
                      {entry.score}%
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      {entry.correct} / {entry.totalQuestions}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      {formatDuration(entry.elapsedSeconds)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {new Date(entry.completedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <button
                        type="button"
                        onClick={() => onStartExam(entry.year)}
                        className="inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition-colors hover:border-sky-600 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:text-sky-300"
                      >
                        <RotateCcw className="h-3 w-3" aria-hidden="true" />
                        <span>Retake</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {/* Failed Questions Review with AI */}
      {missedQuestions.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center dark:border-slate-800">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Failed Questions to Master ({missedQuestions.length})
              </h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                Revisit questions you previously missed and learn each step interactively with the
                AI Chemistry Tutor.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenAiTutor(missedQuestions, 0)}
              className="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-sky-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600"
            >
              <Bot className="h-4 w-4" aria-hidden="true" />
              <span>Learn Failed Questions with AI</span>
            </button>
          </div>

          <div className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
            {missedQuestions.slice(0, 6).map((item, idx) => (
              <div
                key={item.id}
                className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono font-semibold text-sky-700 dark:text-sky-400">
                      {item.year} UTME
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{item.topic}</span>
                  </div>
                  <p className="mt-1 truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                    {item.text}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenAiTutor(missedQuestions, idx)}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:border-sky-600 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:text-sky-300"
                >
                  <Bot className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Learn with AI</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
