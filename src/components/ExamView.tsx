import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookOpen,
  CheckCircle2,
  Clock,
  Eraser,
  Flag,
  HelpCircle,
  XCircle,
} from 'lucide-react';
import { EXAM_DURATION_SECONDS, TOTAL_QUESTIONS } from '../data/questionBank';
import type { ExamMode, Question } from '../types/cbt';
import { formatDuration } from '../utils/exportScorecard';

interface ExamViewProps {
  year: number;
  mode: ExamMode;
  questions: Question[];
  onSubmit: (
    userAnswers: Record<number, number>,
    flaggedQuestions: Record<number, boolean>,
    elapsedSeconds: number,
  ) => void;
  onExit: () => void;
  onOpenReference: () => void;
  isReferenceOpen: boolean;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

export function ExamView({
  year,
  mode,
  questions,
  onSubmit,
  onExit,
  onOpenReference,
  isReferenceOpen,
}: ExamViewProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<number, boolean>>({});
  const [revealedQuestions, setRevealedQuestions] = useState<Record<number, boolean>>({});
  const [timeRemaining, setTimeRemaining] = useState(EXAM_DURATION_SECONDS);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [timeExpired, setTimeExpired] = useState(false);

  const currentQuestion = questions[currentIdx];
  const answeredCount = Object.keys(userAnswers).length;
  const flaggedCount = Object.values(flaggedQuestions).filter(Boolean).length;
  const unansweredCount = TOTAL_QUESTIONS - answeredCount;
  const isLowTime = mode === 'timed' && timeRemaining <= 300 && !timeExpired;

  // Timer effect
  useEffect(() => {
    if (timeExpired || showSubmitModal) return;

    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
      if (mode === 'timed') {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            window.clearInterval(timer);
            setTimeExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [mode, timeExpired, showSubmitModal]);

  const selectOption = useCallback(
    (optionIdx: number) => {
      if (timeExpired) return;
      setUserAnswers((prev) => ({
        ...prev,
        [currentIdx]: optionIdx,
      }));
    },
    [currentIdx, timeExpired],
  );

  const clearCurrentSelection = useCallback(() => {
    if (timeExpired) return;
    setUserAnswers((prev) => {
      const next = { ...prev };
      delete next[currentIdx];
      return next;
    });
  }, [currentIdx, timeExpired]);

  const toggleFlag = useCallback(() => {
    setFlaggedQuestions((prev) => ({
      ...prev,
      [currentIdx]: !prev[currentIdx],
    }));
  }, [currentIdx]);

  // Keyboard shortcuts for authentic CBT navigation
  useEffect(() => {
    if (showSubmitModal || showExitModal || timeExpired || isReferenceOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === 'a' || key === '1') {
        selectOption(0);
      } else if (key === 'b' || key === '2') {
        selectOption(1);
      } else if (key === 'c' || key === '3') {
        selectOption(2);
      } else if (key === 'd' || key === '4') {
        selectOption(3);
      } else if (event.key === 'ArrowLeft' || key === 'p') {
        setCurrentIdx((prev) => Math.max(0, prev - 1));
      } else if (event.key === 'ArrowRight' || key === 'n') {
        setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1));
      } else if (key === 'f') {
        toggleFlag();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isReferenceOpen,
    questions.length,
    selectOption,
    showExitModal,
    showSubmitModal,
    timeExpired,
    toggleFlag,
  ]);

  if (!currentQuestion) return null;

  const selectedOption = userAnswers[currentIdx];
  const isFlagged = Boolean(flaggedQuestions[currentIdx]);
  const isRevealed = mode === 'practice' && Boolean(revealedQuestions[currentIdx]);
  const progressPct = ((currentIdx + 1) / TOTAL_QUESTIONS) * 100;

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {/* Main Question Stage */}
        <section
          aria-label="Examination question workspace"
          className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 lg:col-span-8 dark:border-slate-800 dark:bg-slate-900"
        >
          {/* Question Meta Header — clean unboxed typography */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <span className="font-mono font-semibold text-sky-700 dark:text-sky-400">
                  {year} UTME
                </span>
                <span aria-hidden="true">·</span>
                <span>{currentQuestion.topic}</span>
                <span aria-hidden="true">·</span>
                <span>{mode === 'timed' ? 'Timed Exam' : 'Study Mode'}</span>
              </div>
              <h1 className="mt-1.5 text-xl font-semibold tabular-nums text-slate-900 dark:text-white">
                Question {currentIdx + 1} of {TOTAL_QUESTIONS}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleFlag}
                aria-pressed={isFlagged}
                className={`inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border px-3.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-sky-600 ${
                  isFlagged
                    ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Bookmark
                  className={`h-4 w-4 ${isFlagged ? 'fill-current' : ''}`}
                  aria-hidden="true"
                />
                <span>{isFlagged ? 'Flagged for Review' : 'Flag Question'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowExitModal(true)}
                className="inline-flex h-10 shrink-0 items-center whitespace-nowrap rounded-lg border border-slate-200 px-3.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-sky-600 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                Exit
              </button>
            </div>
          </div>

          {/* Linear Progress */}
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Paper Progress</span>
              <span className="font-mono tabular-nums">
                {currentIdx + 1} / {TOTAL_QUESTIONS}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full bg-sky-600 transition-all duration-200 dark:bg-sky-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Question Prompt */}
          <div className="mt-7 mb-6">
            <p className="text-lg leading-relaxed font-medium text-slate-900 dark:text-slate-100">
              {currentQuestion.text}
            </p>
          </div>

          {/* Answer Options */}
          <div className="space-y-3" role="radiogroup" aria-label="Answer choices">
            {currentQuestion.options.map((option, optIdx) => {
              const isSelected = selectedOption === optIdx;
              const isCorrectChoice = optIdx === currentQuestion.correct;

              let optionStyles =
                'border-slate-200 bg-white text-slate-900 hover:border-sky-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:hover:border-sky-500 dark:hover:bg-slate-800';
              let badgeStyles =
                'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200';

              if (isRevealed) {
                if (isCorrectChoice) {
                  optionStyles =
                    'border-emerald-500 bg-emerald-50/70 text-emerald-950 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-100';
                  badgeStyles = 'bg-emerald-600 text-white';
                } else if (isSelected && !isCorrectChoice) {
                  optionStyles =
                    'border-red-500 bg-red-50/70 text-red-950 dark:border-red-600 dark:bg-red-950/40 dark:text-red-100';
                  badgeStyles = 'bg-red-600 text-white';
                }
              } else if (isSelected) {
                optionStyles =
                  'border-sky-600 bg-sky-50/80 text-slate-950 dark:border-sky-500 dark:bg-sky-950/50 dark:text-white';
                badgeStyles = 'bg-sky-600 text-white dark:bg-sky-500';
              }

              return (
                <button
                  key={`${currentQuestion.id}-${optIdx}`}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => selectOption(optIdx)}
                  className={`flex min-h-[56px] w-full items-center justify-between gap-4 rounded-xl border px-4 py-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${optionStyles}`}
                >
                  <div className="flex items-center gap-3.5">
                    <span
                      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-semibold ${badgeStyles}`}
                    >
                      {OPTION_LABELS[optIdx]}
                    </span>
                    <span className="text-base leading-snug font-medium">{option}</span>
                  </div>

                  {isRevealed && isCorrectChoice && (
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      <span>Correct</span>
                    </span>
                  )}
                  {isRevealed && isSelected && !isCorrectChoice && (
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-red-700 dark:text-red-300">
                      <XCircle className="h-4 w-4" aria-hidden="true" />
                      <span>Incorrect</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Study Mode Immediate Check & Explanation */}
          {mode === 'practice' && (
            <div className="mt-5">
              {!isRevealed ? (
                <button
                  type="button"
                  onClick={() =>
                    setRevealedQuestions((prev) => ({ ...prev, [currentIdx]: true }))
                  }
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Check Answer &amp; Explanation</span>
                </button>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">
                    Explanation
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    {currentQuestion.explanation}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Navigation Controls */}
          <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                className="inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-sky-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span>Previous</span>
              </button>

              {selectedOption !== undefined && (
                <button
                  type="button"
                  onClick={clearCurrentSelection}
                  className="inline-flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 px-3.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Eraser className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="inline-flex h-11 shrink-0 items-center whitespace-nowrap rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-red-600 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300 dark:hover:bg-red-950"
              >
                Submit Exam
              </button>

              <button
                type="button"
                disabled={currentIdx === TOTAL_QUESTIONS - 1}
                onClick={() =>
                  setCurrentIdx((prev) => Math.min(TOTAL_QUESTIONS - 1, prev + 1))
                }
                className="inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-sky-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:bg-sky-500 dark:hover:bg-sky-600"
              >
                <span>Next</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <p className="mt-4 hidden text-xs text-slate-400 sm:block dark:text-slate-500">
            Keyboard shortcuts: A–D or 1–4 to answer · Left / Right arrows to navigate · F to flag
          </p>
        </section>

        {/* Right Control & Question Palette Sidebar */}
        <aside
          aria-label="Timer and question palette"
          className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 lg:sticky lg:top-22 lg:col-span-4 dark:border-slate-800 dark:bg-slate-900"
        >
          {/* Timer Block */}
          <div
            className={`rounded-xl border p-4 text-center ${
              isLowTime
                ? 'border-amber-300 bg-amber-50/70 dark:border-amber-800 dark:bg-amber-950/40'
                : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              {mode === 'timed' ? (
                <>
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{isLowTime ? 'Low Time Remaining' : 'Time Remaining'}</span>
                </>
              ) : (
                <>
                  <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Study Timer Elapsed</span>
                </>
              )}
            </div>

            <div
              className={`mt-1.5 font-mono text-4xl font-bold tabular-nums ${
                isLowTime
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {mode === 'timed'
                ? formatDuration(timeRemaining)
                : formatDuration(elapsedSeconds)}
            </div>
          </div>

          {/* Question Palette */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Question Palette
              </h2>
              <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                {answeredCount} / {TOTAL_QUESTIONS} answered
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-5">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIdx;
                const isAnswered = userAnswers[idx] !== undefined;
                const qFlagged = Boolean(flaggedQuestions[idx]);

                let stateClasses =
                  'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';

                if (qFlagged) {
                  stateClasses =
                    'border-amber-400 bg-amber-100 text-amber-950 dark:border-amber-600 dark:bg-amber-950/70 dark:text-amber-200';
                } else if (isAnswered) {
                  stateClasses =
                    'border-sky-600 bg-sky-600 text-white dark:border-sky-500 dark:bg-sky-500';
                }

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIdx(idx)}
                    aria-label={`Question ${idx + 1}${isAnswered ? ', answered' : ', unanswered'}${
                      qFlagged ? ', flagged' : ''
                    }${isCurrent ? ', current' : ''}`}
                    className={`relative flex h-10 items-center justify-center rounded-lg border font-mono text-xs font-semibold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-sky-600 ${stateClasses} ${
                      isCurrent
                        ? 'ring-2 ring-slate-900 ring-offset-2 dark:ring-white dark:ring-offset-slate-900'
                        : ''
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {qFlagged && isAnswered && (
                      <span
                        aria-hidden="true"
                        className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-sky-600 dark:bg-sky-300"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Palette Legend */}
          <div className="grid grid-cols-3 gap-2 border-t border-slate-200 pt-4 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 shrink-0 rounded-xs bg-sky-600 dark:bg-sky-500" />
              <span className="truncate">Answered ({answeredCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 shrink-0 rounded-xs border border-slate-300 bg-slate-100 dark:border-slate-600 dark:bg-slate-800" />
              <span className="truncate">Left ({unansweredCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 shrink-0 rounded-xs border border-amber-400 bg-amber-100 dark:border-amber-600 dark:bg-amber-950" />
              <span className="truncate">Flagged ({flaggedCount})</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenReference}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-sky-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <span>Open Constants &amp; Elements</span>
          </button>
        </aside>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-dialog-title"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h2
              id="submit-dialog-title"
              className="text-lg font-semibold text-slate-900 dark:text-white"
            >
              Submit {year} Chemistry Paper?
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Review your completion status before finalizing your score.
            </p>

            <dl className="mt-5 grid grid-cols-3 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-center dark:border-slate-800 dark:bg-slate-800/50">
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">Answered</dt>
                <dd className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-sky-700 dark:text-sky-400">
                  {answeredCount}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">Unanswered</dt>
                <dd className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-slate-900 dark:text-white">
                  {unansweredCount}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">Flagged</dt>
                <dd className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                  {flaggedCount}
                </dd>
              </div>
            </dl>

            {unansweredCount > 0 && (
              <p className="mt-4 flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  You still have {unansweredCount} unanswered{' '}
                  {unansweredCount === 1 ? 'question' : 'questions'}.
                </span>
              </p>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Return to Exam
              </button>
              <button
                type="button"
                onClick={() => onSubmit(userAnswers, flaggedQuestions, elapsedSeconds)}
                className="inline-flex h-10 items-center rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600"
              >
                Confirm &amp; Grade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="exit-dialog-title"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h2
              id="exit-dialog-title"
              className="text-lg font-semibold text-slate-900 dark:text-white"
            >
              Leave Current Examination?
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Your answers from this {year} session will not be saved if you exit without
              submitting.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Continue Exam
              </button>
              <button
                type="button"
                onClick={onExit}
                className="inline-flex h-10 items-center rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              >
                Exit to Years
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time Expired Modal */}
      {timeExpired && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="timeout-dialog-title"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2.5 text-amber-700 dark:text-amber-400">
              <Flag className="h-5 w-5" aria-hidden="true" />
              <h2 id="timeout-dialog-title" className="text-lg font-semibold">
                Examination Time Ended
              </h2>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Your 40-minute timer for the {year} Chemistry paper has elapsed. You answered{' '}
              <span className="font-mono font-semibold">{answeredCount}</span> of{' '}
              <span className="font-mono font-semibold">{TOTAL_QUESTIONS}</span> questions.
            </p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => onSubmit(userAnswers, flaggedQuestions, EXAM_DURATION_SECONDS)}
                className="inline-flex h-10 items-center rounded-lg bg-sky-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600"
              >
                View Performance Scorecard
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
