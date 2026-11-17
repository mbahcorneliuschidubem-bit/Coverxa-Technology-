import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  Bot,
  CheckCircle2,
  Download,
  MinusCircle,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import type { ExamResult, MissedQuestionItem, ReviewFilter } from '../types/cbt';
import {
  downloadScorecardReport,
  formatDuration,
  getPerformanceBand,
} from '../utils/exportScorecard';

interface ResultViewProps {
  result: ExamResult;
  onRetake: () => void;
  onSelectAnotherYear: () => void;
  onOpenAiTutor: (items: MissedQuestionItem[], startIndex: number) => void;
}

export function ResultView({
  result,
  onRetake,
  onSelectAnotherYear,
  onOpenAiTutor,
}: ResultViewProps) {
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all');

  const band = getPerformanceBand(result.score);

  const failedItems: MissedQuestionItem[] = useMemo(() => {
    return result.questions
      .map((q, idx) => ({ q, idx }))
      .filter(({ q, idx }) => result.userAnswers[idx] !== q.correct)
      .map(({ q, idx }) => ({
        id: `${result.year}-${q.id}`,
        year: result.year,
        topic: q.topic,
        text: q.text,
        options: q.options,
        correct: q.correct,
        userAnswer: result.userAnswers[idx] ?? null,
        explanation: q.explanation,
      }));
  }, [result]);

  const filterCounts = useMemo(() => {
    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;
    let flagged = 0;

    result.questions.forEach((q, idx) => {
      const answer = result.userAnswers[idx];
      if (result.flaggedQuestions[idx]) flagged++;
      if (answer === undefined) {
        unanswered++;
      } else if (answer === q.correct) {
        correct++;
      } else {
        incorrect++;
      }
    });

    return {
      all: result.questions.length,
      incorrect,
      correct,
      unanswered,
      flagged,
    };
  }, [result]);

  const filteredQuestions = useMemo(() => {
    return result.questions
      .map((q, idx) => ({ q, idx }))
      .filter(({ q, idx }) => {
        const answer = result.userAnswers[idx];
        if (reviewFilter === 'incorrect') return answer !== undefined && answer !== q.correct;
        if (reviewFilter === 'correct') return answer === q.correct;
        if (reviewFilter === 'unanswered') return answer === undefined;
        if (reviewFilter === 'flagged') return Boolean(result.flaggedQuestions[idx]);
        return true;
      });
  }, [result, reviewFilter]);

  const filterTabs: Array<{ id: ReviewFilter; label: string; count: number }> = [
    { id: 'all', label: 'All Questions', count: filterCounts.all },
    { id: 'incorrect', label: 'Incorrect', count: filterCounts.incorrect },
    { id: 'correct', label: 'Correct', count: filterCounts.correct },
    { id: 'unanswered', label: 'Unanswered', count: filterCounts.unanswered },
    { id: 'flagged', label: 'Flagged', count: filterCounts.flagged },
  ];

  const handleOpenQuestionTutor = (questionId: number) => {
    const failedIdx = failedItems.findIndex((item) => item.id === `${result.year}-${questionId}`);
    if (failedIdx >= 0) {
      onOpenAiTutor(failedItems, failedIdx);
      return;
    }

    const qIdx = result.questions.findIndex((q) => q.id === questionId);
    if (qIdx < 0) return;
    const q = result.questions[qIdx];
    onOpenAiTutor(
      [
        {
          id: `${result.year}-${q.id}`,
          year: result.year,
          topic: q.topic,
          text: q.text,
          options: q.options,
          correct: q.correct,
          userAnswer: result.userAnswers[qIdx] ?? null,
          explanation: q.explanation,
        },
      ],
      0,
    );
  };

  return (
    <div className="space-y-8">
      {/* Scorecard Summary */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center dark:border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span className="font-mono font-semibold text-sky-700 dark:text-sky-400">
                {result.year} UTME Chemistry
              </span>
              <span aria-hidden="true">·</span>
              <span>{result.mode === 'timed' ? 'Timed Exam' : 'Study Mode'}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                Time Used: {formatDuration(result.elapsedSeconds)}
              </span>
            </div>
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Performance Scorecard
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => downloadScorecardReport(result)}
              className="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Download Scorecard</span>
            </button>
            <button
              type="button"
              onClick={onRetake}
              className="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Retake {result.year}</span>
            </button>
            <button
              type="button"
              onClick={onSelectAnotherYear}
              className="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-sky-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-sky-600 dark:bg-sky-500 dark:hover:bg-sky-600"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Select Another Year</span>
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 lg:col-span-5 dark:border-slate-800 dark:bg-slate-800/40">
            <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Final Score
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-5xl font-bold tabular-nums text-slate-900 dark:text-white">
                {result.score}
              </span>
              <span className="font-mono text-xl font-medium text-slate-400 dark:text-slate-500">
                / 100
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold text-sky-700 dark:text-sky-400">
              {band.label} · {result.score}% Accuracy
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {band.summary}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:col-span-7">
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Correct</span>
              </dt>
              <dd className="mt-2 font-mono text-3xl font-semibold tabular-nums text-slate-900 dark:text-white">
                {result.correct}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-red-700 dark:text-red-400">
                <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Incorrect</span>
              </dt>
              <dd className="mt-2 font-mono text-3xl font-semibold tabular-nums text-slate-900 dark:text-white">
                {result.incorrect}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <MinusCircle className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Unanswered</span>
              </dt>
              <dd className="mt-2 font-mono text-3xl font-semibold tabular-nums text-slate-900 dark:text-white">
                {result.unanswered}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Total Items
              </dt>
              <dd className="mt-2 font-mono text-3xl font-semibold tabular-nums text-slate-900 dark:text-white">
                {result.totalQuestions}
              </dd>
            </div>
          </dl>
        </div>

        {failedItems.length > 0 && (
          <div className="mt-6 flex flex-col justify-between gap-4 rounded-xl border border-sky-200 bg-sky-50/70 p-4 sm:flex-row sm:items-center dark:border-sky-900/60 dark:bg-sky-950/30">
            <div className="flex items-start gap-3">
              <Bot
                className="mt-0.5 h-5 w-5 shrink-0 text-sky-700 dark:text-sky-400"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Learn Your {failedItems.length} Failed{' '}
                  {failedItems.length === 1 ? 'Question' : 'Questions'} with AI
                </p>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                  Step through each missed or skipped question with the AI Chemistry Tutor to see
                  why your choice missed and how to solve it.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenAiTutor(failedItems, 0)}
              className="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-sky-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600"
            >
              <Bot className="h-4 w-4" aria-hidden="true" />
              <span>Start AI Lesson</span>
            </button>
          </div>
        )}
      </section>

      {/* Topic Performance Breakdown */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Topic Performance Analytics
        </h2>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          Accuracy breakdown across Chemistry syllabus topics in this examination paper.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
          {result.topicStats.map((stat) => {
            const barColor =
              stat.percentage >= 70
                ? 'bg-emerald-600 dark:bg-emerald-500'
                : stat.percentage >= 40
                  ? 'bg-sky-600 dark:bg-sky-500'
                  : 'bg-amber-600 dark:bg-amber-500';

            return (
              <div key={stat.topic}>
                <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {stat.topic}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-slate-600 dark:text-slate-400">
                    {stat.correct}/{stat.total} ({stat.percentage}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full transition-all duration-300 ${barColor}`}
                    style={{ width: `${stat.percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Detailed Question Review */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center dark:border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Detailed Question Review
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Filter by response outcome or launch the AI Tutor on any question.
            </p>
          </div>

          <div className="inline-flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setReviewFilter(tab.id)}
                className={`shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium tabular-nums transition-colors ${
                  reviewFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 divide-y divide-slate-200 dark:divide-slate-800">
          {filteredQuestions.map(({ q, idx }) => {
            const answer = result.userAnswers[idx];
            const isUnanswered = answer === undefined;
            const isCorrect = answer === q.correct;
            const wasFlagged = Boolean(result.flaggedQuestions[idx]);

            return (
              <article key={q.id} className="py-6 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">
                      Question {idx + 1}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{q.topic}</span>
                    {wasFlagged && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                          <Bookmark className="h-3 w-3 fill-current" aria-hidden="true" />
                          <span>Flagged</span>
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {isCorrect ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        <span>Correct</span>
                      </span>
                    ) : isUnanswered ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        <MinusCircle className="h-4 w-4" aria-hidden="true" />
                        <span>Unanswered</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-400">
                        <XCircle className="h-4 w-4" aria-hidden="true" />
                        <span>Incorrect</span>
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenQuestionTutor(q.id)}
                      className={`inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-xs font-semibold transition-colors ${
                        !isCorrect
                          ? 'bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600'
                          : 'border border-slate-200 bg-white text-slate-700 hover:border-sky-500 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <Bot className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{!isCorrect ? 'Learn with AI' : 'Ask AI'}</span>
                    </button>
                  </div>
                </div>

                <p className="mt-2.5 text-base leading-relaxed font-medium text-slate-900 dark:text-slate-100">
                  {q.text}
                </p>

                <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-800/40">
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      Your Answer
                    </span>
                    <span
                      className={`mt-0.5 block font-medium ${
                        isCorrect
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : isUnanswered
                            ? 'text-slate-500 dark:text-slate-400'
                            : 'text-red-700 dark:text-red-400'
                      }`}
                    >
                      {isUnanswered ? 'Not answered' : q.options[answer]}
                    </span>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-800/40">
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      Correct Answer
                    </span>
                    <span className="mt-0.5 block font-semibold text-emerald-700 dark:text-emerald-400">
                      {q.options[q.correct]}
                    </span>
                  </div>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Explanation:{' '}
                  </span>
                  {q.explanation}
                </p>
              </article>
            );
          })}

          {filteredQuestions.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No questions match this filter.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
