import { useCallback, useEffect, useState } from 'react';
import { AiTutorModal } from './components/AiTutorModal';
import { AuthModal, type AuthModalTab } from './components/AuthModal';
import { DashboardView } from './components/DashboardView';
import { ExamView } from './components/ExamView';
import { OwnerPortalModal } from './components/OwnerPortalModal';
import { ReferenceModal } from './components/ReferenceModal';
import { ResultView } from './components/ResultView';
import { SubscriptionModal } from './components/SubscriptionModal';
import { TopBar } from './components/TopBar';
import {
  EXAM_DURATION_SECONDS,
  TOTAL_QUESTIONS,
  generateYearQuestions,
} from './data/questionBank';
import type {
  AppView,
  ExamHistoryEntry,
  ExamMode,
  ExamResult,
  MissedQuestionItem,
  PaymentDetails,
  Question,
  TopicStat,
  UserProfile,
} from './types/cbt';
import { ApiError, apiRequest, getAuthToken, setAuthToken } from './utils/api';

const THEME_STORAGE_KEY = 'corvexa-cbt-theme';

const DEFAULT_PAYMENT_DETAILS: PaymentDetails = {
  amount: 1000,
  currency: 'NGN',
  formattedAmount: '₦1,000',
  interval: 'monthly',
  bankName: 'PalmPay',
  accountNumber: '7026158630',
  accountName: 'Mbah Johnpaul Tochukwu',
};

export default function App() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  const [user, setUser] = useState<UserProfile | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>(DEFAULT_PAYMENT_DETAILS);
  const [history, setHistory] = useState<ExamHistoryEntry[]>([]);
  const [missedQuestions, setMissedQuestions] = useState<MissedQuestionItem[]>([]);

  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [examMode, setExamMode] = useState<ExamMode>('timed');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [examSessionKey, setExamSessionKey] = useState<number>(0);
  const [latestResult, setLatestResult] = useState<ExamResult | null>(null);
  const [startingYear, setStartingYear] = useState<number | null>(null);

  // Modals
  const [isReferenceOpen, setIsReferenceOpen] = useState(false);
  const [isBillingOpen, setIsBillingOpen] = useState(false);
  const [isOwnerPortalOpen, setIsOwnerPortalOpen] = useState(false);
  const [aiTutorState, setAiTutorState] = useState<{
    open: boolean;
    items: MissedQuestionItem[];
    initialIndex: number;
    allowMarkMastered: boolean;
  }>({
    open: false,
    items: [],
    initialIndex: 0,
    allowMarkMastered: false,
  });

  const [authModalState, setAuthModalState] = useState<{
    open: boolean;
    tab: AuthModalTab;
    reason: string | null;
    pendingYear: number | null;
  }>({
    open: false,
    tab: 'login',
    reason: null,
    pendingYear: null,
  });

  // Sync .dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch {
      // Ignore storage failures
    }
  }, [isDark]);

  const loadUserAndHistory = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setHistory([]);
      setMissedQuestions([]);
      return;
    }

    try {
      const [meRes, historyRes, missedRes] = await Promise.all([
        apiRequest<{ user: UserProfile; paymentDetails: PaymentDetails }>('/api/auth/me'),
        apiRequest<{ history: ExamHistoryEntry[] }>('/api/exams/history'),
        apiRequest<{ missed: MissedQuestionItem[] }>('/api/exams/missed'),
      ]);
      setUser(meRes.user);
      if (meRes.paymentDetails) {
        setPaymentDetails(meRes.paymentDetails);
      }
      setHistory(historyRes.history);
      setMissedQuestions(missedRes.missed);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setAuthToken(null);
        setUser(null);
        setHistory([]);
        setMissedQuestions([]);
      }
    }
  }, []);

  useEffect(() => {
    void loadUserAndHistory();
  }, [loadUserAndHistory]);

  const launchYearExam = useCallback(
    async (year: number) => {
      setStartingYear(year);
      try {
        const res = await apiRequest<{ allowed: boolean; user: UserProfile }>(
          '/api/exams/start',
          {
            method: 'POST',
            body: { year, mode: examMode },
          },
        );
        setUser(res.user);
        const generated = generateYearQuestions(year);
        setSelectedYear(year);
        setExamQuestions(generated);
        setExamSessionKey((prev) => prev + 1);
        setActiveView('exam');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          setAuthToken(null);
          setUser(null);
          setAuthModalState({
            open: true,
            tab: 'login',
            reason: `Sign in or create a free account to start the ${year} Chemistry exam.`,
            pendingYear: year,
          });
        } else if (err instanceof ApiError && err.status === 402) {
          if (err.data.user) {
            setUser(err.data.user as UserProfile);
          }
          if (err.data.paymentDetails) {
            setPaymentDetails(err.data.paymentDetails as PaymentDetails);
          }
          setIsBillingOpen(true);
        }
      } finally {
        setStartingYear(null);
      }
    },
    [examMode],
  );

  const handleStartExam = (year: number) => {
    if (!user) {
      setAuthModalState({
        open: true,
        tab: 'login',
        reason: `Sign in or create an account to take the ${year} UTME Chemistry exam (20 free sessions included).`,
        pendingYear: year,
      });
      return;
    }
    void launchYearExam(year);
  };

  const handleAuthenticated = async (
    loggedInUser: UserProfile,
    details?: PaymentDetails,
  ) => {
    setUser(loggedInUser);
    if (details) {
      setPaymentDetails(details);
    }

    const pendingYear = authModalState.pendingYear;
    setAuthModalState({
      open: false,
      tab: 'login',
      reason: null,
      pendingYear: null,
    });

    try {
      const [historyRes, missedRes] = await Promise.all([
        apiRequest<{ history: ExamHistoryEntry[] }>('/api/exams/history'),
        apiRequest<{ missed: MissedQuestionItem[] }>('/api/exams/missed'),
      ]);
      setHistory(historyRes.history);
      setMissedQuestions(missedRes.missed);
    } catch {
      // Non-fatal
    }

    if (pendingYear !== null) {
      void launchYearExam(pendingYear);
    }
  };

  const handleLogout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    }
    setAuthToken(null);
    setUser(null);
    setHistory([]);
    setMissedQuestions([]);
    setActiveView('dashboard');
  };

  const handleSubmitExam = async (
    userAnswers: Record<number, number>,
    flaggedQuestions: Record<number, boolean>,
    elapsedSeconds: number,
  ) => {
    let correct = 0;
    const topicMap = new Map<string, { total: number; correct: number }>();
    const newlyMissed: Array<{
      topic: string;
      text: string;
      options: string[];
      correct: number;
      userAnswer: number | null;
      explanation: string;
    }> = [];

    examQuestions.forEach((q, idx) => {
      const answer = userAnswers[idx];
      const isCorrect = answer === q.correct;
      if (isCorrect) {
        correct++;
      } else {
        newlyMissed.push({
          topic: q.topic,
          text: q.text,
          options: q.options,
          correct: q.correct,
          userAnswer: answer ?? null,
          explanation: q.explanation,
        });
      }

      const currentTopic = topicMap.get(q.topic) ?? { total: 0, correct: 0 };
      currentTopic.total += 1;
      if (isCorrect) currentTopic.correct += 1;
      topicMap.set(q.topic, currentTopic);
    });

    const answeredCount = Object.keys(userAnswers).length;
    const unanswered = TOTAL_QUESTIONS - answeredCount;
    const incorrect = answeredCount - correct;
    const score = Math.round((correct / TOTAL_QUESTIONS) * 100);

    const topicStats: TopicStat[] = Array.from(topicMap.entries())
      .map(([topic, data]) => ({
        topic,
        total: data.total,
        correct: data.correct,
        percentage: Math.round((data.correct / data.total) * 100),
      }))
      .sort((a, b) => a.percentage - b.percentage || a.topic.localeCompare(b.topic));

    const completedAt = new Date().toISOString();

    const result: ExamResult = {
      year: selectedYear,
      mode: examMode,
      score,
      correct,
      incorrect,
      unanswered,
      totalQuestions: TOTAL_QUESTIONS,
      durationSeconds: EXAM_DURATION_SECONDS,
      elapsedSeconds,
      completedAt,
      questions: examQuestions,
      userAnswers,
      flaggedQuestions,
      topicStats,
    };

    setLatestResult(result);
    setActiveView('result');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const saved = await apiRequest<{ entry: ExamHistoryEntry }>('/api/exams/history', {
        method: 'POST',
        body: {
          year: selectedYear,
          mode: examMode,
          score,
          correct,
          totalQuestions: TOTAL_QUESTIONS,
          elapsedSeconds,
          completedAt,
          missedQuestions: newlyMissed,
        },
      });
      setHistory((prev) => [saved.entry, ...prev]);

      const missedRes = await apiRequest<{ missed: MissedQuestionItem[] }>('/api/exams/missed');
      setMissedQuestions(missedRes.missed);
    } catch {
      // Keep result visible even if history save fails
    }
  };

  const handleMarkMissedMastered = async (id: string) => {
    try {
      await apiRequest(`/api/exams/missed/${id}`, { method: 'DELETE' });
      setMissedQuestions((prev) => {
        const next = prev.filter((item) => item.id !== id);
        setAiTutorState((tutor) => {
          if (!tutor.open || !tutor.allowMarkMastered) return tutor;
          if (next.length === 0) {
            return { ...tutor, open: false, items: [] };
          }
          return {
            ...tutor,
            items: next,
            initialIndex: Math.min(tutor.initialIndex, next.length - 1),
          };
        });
        return next;
      });
    } catch {
      // Ignore error
    }
  };

  const handleClearHistory = async () => {
    try {
      await apiRequest('/api/exams/history', { method: 'DELETE' });
      setHistory([]);
    } catch {
      // Ignore error
    }
  };

  const handleNavigateDashboard = () => {
    if (activeView === 'exam') return;
    setActiveView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <TopBar
        activeView={activeView}
        isDark={isDark}
        user={user}
        onToggleTheme={() => setIsDark((prev) => !prev)}
        onNavigateDashboard={handleNavigateDashboard}
        onOpenReference={() => setIsReferenceOpen(true)}
        onOpenBilling={() => setIsBillingOpen(true)}
        onOpenOwnerPortal={() => setIsOwnerPortalOpen(true)}
        onOpenAuth={() =>
          setAuthModalState({
            open: true,
            tab: 'login',
            reason: null,
            pendingYear: null,
          })
        }
        onLogout={() => void handleLogout()}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {activeView === 'dashboard' && (
          <DashboardView
            user={user}
            examMode={examMode}
            startingYear={startingYear}
            isDark={isDark}
            onToggleTheme={() => setIsDark((prev) => !prev)}
            onChangeMode={setExamMode}
            onStartExam={handleStartExam}
            history={history}
            missedQuestions={missedQuestions}
            onOpenAiTutor={(items, startIndex) =>
              setAiTutorState({
                open: true,
                items,
                initialIndex: startIndex,
                allowMarkMastered: true,
              })
            }
            onClearHistory={() => void handleClearHistory()}
            onOpenReference={() => setIsReferenceOpen(true)}
            onOpenAuth={(tab = 'login') =>
              setAuthModalState({
                open: true,
                tab,
                reason: null,
                pendingYear: null,
              })
            }
            onOpenBilling={() => setIsBillingOpen(true)}
            onOpenOwnerPortal={() => setIsOwnerPortalOpen(true)}
          />
        )}

        {activeView === 'exam' && (
          <ExamView
            key={examSessionKey}
            year={selectedYear}
            mode={examMode}
            questions={examQuestions}
            onSubmit={(answers, flagged, elapsed) =>
              void handleSubmitExam(answers, flagged, elapsed)
            }
            onExit={() => setActiveView('dashboard')}
            onOpenReference={() => setIsReferenceOpen(true)}
            isReferenceOpen={isReferenceOpen}
          />
        )}

        {activeView === 'result' && latestResult && (
          <ResultView
            result={latestResult}
            onRetake={() => handleStartExam(latestResult.year)}
            onSelectAnotherYear={() => setActiveView('dashboard')}
            onOpenAiTutor={(items, startIndex) =>
              setAiTutorState({
                open: true,
                items,
                initialIndex: startIndex,
                allowMarkMastered: false,
              })
            }
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 text-xs text-slate-500 sm:flex-row sm:px-6 lg:px-8 dark:text-slate-400">
          <p>© 2026 Corvexa Academic Solutions. All rights reserved.</p>
          <p>JAMB UTME Chemistry CBT Practice (2000–2026)</p>
        </div>
      </footer>

      <ReferenceModal
        isOpen={isReferenceOpen}
        onClose={() => setIsReferenceOpen(false)}
      />

      <AuthModal
        isOpen={authModalState.open}
        initialTab={authModalState.tab}
        reason={authModalState.reason}
        onClose={() =>
          setAuthModalState((prev) => ({ ...prev, open: false, pendingYear: null }))
        }
        onAuthenticated={(loggedInUser, details) =>
          void handleAuthenticated(loggedInUser, details)
        }
      />

      <SubscriptionModal
        isOpen={isBillingOpen}
        user={user}
        paymentDetails={paymentDetails}
        onClose={() => setIsBillingOpen(false)}
        onUserUpdated={setUser}
        onRequireAuth={() => {
          setIsBillingOpen(false);
          setAuthModalState({
            open: true,
            tab: 'login',
            reason: 'Sign in or create an account to submit your PalmPay transfer confirmation.',
            pendingYear: null,
          });
        }}
      />

      <OwnerPortalModal
        isOpen={isOwnerPortalOpen}
        onClose={() => setIsOwnerPortalOpen(false)}
        onRefreshCurrentUser={() => void loadUserAndHistory()}
      />

      <AiTutorModal
        isOpen={aiTutorState.open}
        items={aiTutorState.items}
        initialIndex={aiTutorState.initialIndex}
        allowMarkMastered={aiTutorState.allowMarkMastered}
        onMarkMastered={(id) => void handleMarkMissedMastered(id)}
        onClose={() => setAiTutorState((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
