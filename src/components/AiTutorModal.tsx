import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  Loader2,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import type { AiTutorMessage, MissedQuestionItem } from '../types/cbt';
import { ApiError, apiRequest } from '../utils/api';

interface AiTutorModalProps {
  isOpen: boolean;
  items: MissedQuestionItem[];
  initialIndex: number;
  allowMarkMastered?: boolean;
  onMarkMastered?: (id: string) => void;
  onClose: () => void;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

const QUICK_PROMPTS = [
  'Why was my answer wrong?',
  'Break down the formula step by step',
  'Give me a similar practice question',
  'Share a quick UTME memory tip',
];

export function AiTutorModal({
  isOpen,
  items,
  initialIndex,
  allowMarkMastered = false,
  onMarkMastered,
  onClose,
}: AiTutorModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [conversations, setConversations] = useState<Record<string, AiTutorMessage[]>>({});
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setCurrentIndex(Math.min(Math.max(0, initialIndex), Math.max(0, items.length - 1)));
    setError(null);
  }, [isOpen, initialIndex, items.length]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const currentItem = items[currentIndex] ?? null;
  const itemKey = currentItem ? `${currentItem.id}-${currentItem.text}` : '';
  const currentMessages = itemKey ? conversations[itemKey] ?? [] : [];

  const fetchTutorReply = useCallback(
    async (item: MissedQuestionItem, key: string, nextMessages: AiTutorMessage[]) => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiRequest<{ reply: string }>('/api/ai/learn-question', {
          method: 'POST',
          body: {
            question: {
              topic: item.topic,
              text: item.text,
              options: item.options,
              correctIndex: item.correct,
              userAnswerIndex: item.userAnswer,
              explanation: item.explanation,
            },
            messages: nextMessages,
          },
        });

        setConversations((prev) => ({
          ...prev,
          [key]: [...nextMessages, { role: 'assistant', content: res.reply }],
        }));
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Unable to reach the AI Chemistry tutor right now.',
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Auto-explain when opening a question that hasn't been explained yet
  useEffect(() => {
    if (!isOpen || !currentItem || !itemKey) return;
    if (conversations[itemKey]?.length) return;
    void fetchTutorReply(currentItem, itemKey, []);
  }, [isOpen, currentItem, itemKey, conversations, fetchTutorReply]);

  if (!isOpen || !currentItem) return null;

  const handleSendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const updated: AiTutorMessage[] = [
      ...currentMessages,
      { role: 'user', content: trimmed },
    ];
    setConversations((prev) => ({ ...prev, [itemKey]: updated }));
    setInputText('');
    await fetchTutorReply(currentItem, itemKey, updated);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void handleSendMessage(inputText);
  };

  const userAnswerLabel =
    currentItem.userAnswer !== null && currentItem.options[currentItem.userAnswer]
      ? `${OPTION_LABELS[currentItem.userAnswer]}. ${currentItem.options[currentItem.userAnswer]}`
      : 'Not answered';
  const correctAnswerLabel = `${OPTION_LABELS[currentItem.correct]}. ${
    currentItem.options[currentItem.correct]
  }`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-tutor-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
              <Bot className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2
                id="ai-tutor-title"
                className="text-base font-semibold text-slate-900 dark:text-white"
              >
                AI Chemistry Tutor
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {currentItem.year} UTME · {currentItem.topic}
                {items.length > 1 ? ` · Question ${currentIndex + 1} of ${items.length}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {allowMarkMastered && onMarkMastered && (
              <button
                type="button"
                onClick={() => onMarkMastered(currentItem.id)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Mark Mastered</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close AI tutor"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Question Context Summary */}
        <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/40">
          <p className="text-sm leading-relaxed font-medium text-slate-900 dark:text-slate-100">
            {currentItem.text}
          </p>
          <div className="mt-2.5 flex flex-wrap gap-x-6 gap-y-1 text-xs">
            <span className="text-red-700 dark:text-red-400">
              Your answer: <strong>{userAnswerLabel}</strong>
            </span>
            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                Correct answer: <strong>{correctAnswerLabel}</strong>
              </span>
            </span>
          </div>
        </div>

        {/* AI Lesson & Conversation */}
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {currentMessages.map((msg, idx) => (
            <div
              key={idx}
              className={
                msg.role === 'user'
                  ? 'ml-auto max-w-[85%] rounded-xl bg-sky-600 px-4 py-3 text-sm text-white dark:bg-sky-500'
                  : 'rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm leading-relaxed text-slate-800 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-200'
              }
            >
              {msg.role === 'assistant' ? (
                <div className="space-y-2 whitespace-pre-wrap">{msg.content}</div>
              ) : (
                <p>{msg.content}</p>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin text-sky-600 dark:text-sky-400" />
              <span>Preparing clear Chemistry explanation...</span>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
            >
              <p>{error}</p>
              <button
                type="button"
                onClick={() => void fetchTutorReply(currentItem, itemKey, currentMessages)}
                className="mt-2 font-semibold underline"
              >
                Try again
              </button>
            </div>
          )}
        </div>

        {/* Footer Controls: Quick Prompts + Follow-up Input + Prev/Next */}
        <div className="space-y-3 border-t border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={loading}
                onClick={() => void handleSendMessage(prompt)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-sky-500 hover:text-sky-700 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-300"
              >
                {prompt}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask a follow-up question about this topic..."
              className="h-11 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 focus:border-sky-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              aria-label="Send question to AI tutor"
              className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:opacity-40 dark:bg-sky-500 dark:hover:bg-sky-600"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          </form>

          {items.length > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Previous Missed</span>
              </button>
              <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                {currentIndex + 1} / {items.length}
              </span>
              <button
                type="button"
                disabled={currentIndex === items.length - 1}
                onClick={() => setCurrentIndex((prev) => Math.min(items.length - 1, prev + 1))}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <span>Next Missed</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
