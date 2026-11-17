export type ExamMode = 'timed' | 'practice';

export type AppView = 'dashboard' | 'exam' | 'result';

export type YearDecadeFilter = 'all' | '2000s' | '2010s' | '2020s';

export type ReviewFilter = 'all' | 'incorrect' | 'correct' | 'unanswered' | 'flagged';

export interface Question {
  id: number;
  topic: string;
  text: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface TopicStat {
  topic: string;
  total: number;
  correct: number;
  percentage: number;
}

export interface ExamResult {
  year: number;
  mode: ExamMode;
  score: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  totalQuestions: number;
  durationSeconds: number;
  elapsedSeconds: number;
  completedAt: string;
  questions: Question[];
  userAnswers: Record<number, number>;
  flaggedQuestions: Record<number, boolean>;
  topicStats: TopicStat[];
}

export interface ExamHistoryEntry {
  id: string;
  year: number;
  mode: ExamMode;
  score: number;
  correct: number;
  totalQuestions: number;
  elapsedSeconds: number;
  completedAt: string;
}

export interface PaymentDetails {
  amount: number;
  currency: string;
  formattedAmount: string;
  interval: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  amount: number;
  currency: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  senderName: string;
  reference: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  usageCount: number;
  freeLimit: number;
  remainingFreeUses: number;
  hasActiveSubscription: boolean;
  subscriptionActiveUntil: string | null;
  quotaExhausted: boolean;
  latestPayment: PaymentRecord | null;
  payments: PaymentRecord[];
  createdAt: string;
}

export interface OwnerUserSummary {
  id: string;
  fullName: string;
  email: string;
  usageCount: number;
  hasActiveSubscription: boolean;
  subscriptionActiveUntil: string | null;
  createdAt: string;
}

export interface OwnerOverview {
  paymentDetails: PaymentDetails;
  payments: PaymentRecord[];
  users: OwnerUserSummary[];
}

export interface MissedQuestionItem {
  id: string;
  year: number;
  topic: string;
  text: string;
  options: string[];
  correct: number;
  userAnswer: number | null;
  explanation: string;
  recordedAt?: string;
}

export interface AiTutorMessage {
  role: 'user' | 'assistant';
  content: string;
}

