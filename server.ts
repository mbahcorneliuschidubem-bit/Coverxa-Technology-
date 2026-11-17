import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';

dotenv.config();

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const FREE_USAGE_LIMIT = 20;
const MONTHLY_SUBSCRIPTION_DAYS = 30;
const RESET_CODE_TTL_MS = 15 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const PAYMENT_DETAILS = {
  amount: 1000,
  currency: 'NGN',
  formattedAmount: '₦1,000',
  interval: 'monthly',
  bankName: 'PalmPay',
  accountNumber: '7026158630',
  accountName: 'Mbah Johnpaul Tochukwu',
};

interface StoredUser {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  usageCount: number;
  subscriptionActiveUntil: string | null;
  resetCodeHash: string | null;
  resetCodeExpiresAt: string | null;
  createdAt: string;
}

interface StoredSession {
  tokenHash: string;
  userId: string;
  expiresAt: string;
}

interface StoredOwnerSession {
  tokenHash: string;
  expiresAt: string;
}

interface StoredPayment {
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

interface StoredExamHistory {
  id: string;
  userId: string;
  year: number;
  mode: 'timed' | 'practice';
  score: number;
  correct: number;
  totalQuestions: number;
  elapsedSeconds: number;
  completedAt: string;
}

interface StoredMissedQuestion {
  id: string;
  userId: string;
  year: number;
  topic: string;
  text: string;
  options: string[];
  correct: number;
  userAnswer: number | null;
  explanation: string;
  recordedAt: string;
}

interface DatabaseStore {
  users: StoredUser[];
  sessions: StoredSession[];
  payments: StoredPayment[];
  examHistory: StoredExamHistory[];
  missedQuestions: StoredMissedQuestion[];
  ownerPasscodeHash: string | null;
  ownerSessions: StoredOwnerSession[];
}

let resolvedDataDir = path.resolve(__dirname, 'data');
let resolvedStorePath = path.join(resolvedDataDir, 'corvexa-store.json');

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(resolvedDataDir)) {
      fs.mkdirSync(resolvedDataDir, { recursive: true });
    }
  } catch {
    resolvedDataDir = path.join(os.tmpdir(), 'corvexa-data');
    resolvedStorePath = path.join(resolvedDataDir, 'corvexa-store.json');
    if (!fs.existsSync(resolvedDataDir)) {
      fs.mkdirSync(resolvedDataDir, { recursive: true });
    }
  }
}

function readStore(): DatabaseStore {
  ensureDataDir();
  if (!fs.existsSync(resolvedStorePath)) {
    const empty: DatabaseStore = {
      users: [],
      sessions: [],
      payments: [],
      examHistory: [],
      missedQuestions: [],
      ownerPasscodeHash: process.env.OWNER_PASSCODE
        ? hashSecret(process.env.OWNER_PASSCODE)
        : null,
      ownerSessions: [],
    };
    writeStore(empty);
    return empty;
  }

  try {
    const raw = fs.readFileSync(resolvedStorePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<DatabaseStore>;
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      payments: Array.isArray(parsed.payments) ? parsed.payments : [],
      examHistory: Array.isArray(parsed.examHistory) ? parsed.examHistory : [],
      missedQuestions: Array.isArray(parsed.missedQuestions) ? parsed.missedQuestions : [],
      ownerPasscodeHash:
        typeof parsed.ownerPasscodeHash === 'string'
          ? parsed.ownerPasscodeHash
          : process.env.OWNER_PASSCODE
            ? hashSecret(process.env.OWNER_PASSCODE)
            : null,
      ownerSessions: Array.isArray(parsed.ownerSessions) ? parsed.ownerSessions : [],
    };
  } catch {
    const fallback: DatabaseStore = {
      users: [],
      sessions: [],
      payments: [],
      examHistory: [],
      missedQuestions: [],
      ownerPasscodeHash: null,
      ownerSessions: [],
    };
    writeStore(fallback);
    return fallback;
  }
}

function writeStore(store: DatabaseStore): void {
  ensureDataDir();
  const tempPath = `${resolvedStorePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(store, null, 2), 'utf8');
  fs.renameSync(tempPath, resolvedStorePath);
}

function hashSecret(secret: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(secret, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifySecret(secret: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  const keyBuffer = Buffer.from(keyHex, 'hex');
  const derived = crypto.scryptSync(secret, salt, 64);
  if (keyBuffer.length !== derived.length) return false;
  return crypto.timingSafeEqual(keyBuffer, derived);
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function isSubscriptionActive(user: StoredUser): boolean {
  if (!user.subscriptionActiveUntil) return false;
  return new Date(user.subscriptionActiveUntil).getTime() > Date.now();
}

function sanitizeUser(user: StoredUser, store: DatabaseStore) {
  const activeSub = isSubscriptionActive(user);
  const remainingFreeUses = Math.max(0, FREE_USAGE_LIMIT - user.usageCount);
  const userPayments = store.payments
    .filter((p) => p.userId === user.id)
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    usageCount: user.usageCount,
    freeLimit: FREE_USAGE_LIMIT,
    remainingFreeUses,
    hasActiveSubscription: activeSub,
    subscriptionActiveUntil: user.subscriptionActiveUntil,
    quotaExhausted: !activeSub && user.usageCount >= FREE_USAGE_LIMIT,
    latestPayment: userPayments[0] ?? null,
    payments: userPayments.slice(0, 10),
    createdAt: user.createdAt,
  };
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

interface AuthenticatedRequest extends Request {
  authUser?: StoredUser;
  authStore?: DatabaseStore;
  authTokenHash?: string;
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Please sign in to continue.' });
    return;
  }

  const store = readStore();
  const now = Date.now();
  store.sessions = store.sessions.filter((s) => new Date(s.expiresAt).getTime() > now);

  const tokenHash = hashToken(token);
  const session = store.sessions.find((s) => s.tokenHash === tokenHash);
  if (!session) {
    writeStore(store);
    res.status(401).json({ error: 'SESSION_EXPIRED', message: 'Your session expired. Please sign in again.' });
    return;
  }

  const user = store.users.find((u) => u.id === session.userId);
  if (!user) {
    res.status(401).json({ error: 'USER_NOT_FOUND', message: 'Account not found. Please sign in again.' });
    return;
  }

  req.authUser = user;
  req.authStore = store;
  req.authTokenHash = tokenHash;
  next();
}

function requireOwner(req: Request, res: Response, next: NextFunction): void {
  const ownerToken = String(req.headers['x-owner-token'] || '').trim();
  if (!ownerToken) {
    res.status(401).json({ error: 'OWNER_UNAUTHORIZED', message: 'Owner authentication required.' });
    return;
  }

  const store = readStore();
  const now = Date.now();
  store.ownerSessions = store.ownerSessions.filter((s) => new Date(s.expiresAt).getTime() > now);
  const tokenHash = hashToken(ownerToken);
  const valid = store.ownerSessions.some((s) => s.tokenHash === tokenHash);
  if (!valid) {
    writeStore(store);
    res.status(401).json({ error: 'OWNER_SESSION_EXPIRED', message: 'Owner session expired. Sign in again.' });
    return;
  }
  next();
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Billing info (public)
  app.get('/api/billing/info', (_req, res) => {
    res.json({
      freeLimit: FREE_USAGE_LIMIT,
      paymentDetails: PAYMENT_DETAILS,
    });
  });

  // Sign Up
  app.post('/api/auth/signup', (req, res) => {
    const fullName = String(req.body?.fullName || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (fullName.length < 2) {
      res.status(400).json({ error: 'INVALID_NAME', message: 'Please enter your full name.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'INVALID_EMAIL', message: 'Please enter a valid email address.' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({
        error: 'WEAK_PASSWORD',
        message: 'Password must be at least 6 characters long.',
      });
      return;
    }

    const store = readStore();
    if (store.users.some((u) => u.email === email)) {
      res.status(409).json({
        error: 'EMAIL_EXISTS',
        message: 'An account with this email already exists. Please sign in.',
      });
      return;
    }

    const newUser: StoredUser = {
      id: crypto.randomUUID(),
      fullName,
      email,
      passwordHash: hashSecret(password),
      usageCount: 0,
      subscriptionActiveUntil: null,
      resetCodeHash: null,
      resetCodeExpiresAt: null,
      createdAt: new Date().toISOString(),
    };

    const rawToken = crypto.randomBytes(32).toString('hex');
    store.users.push(newUser);
    store.sessions.push({
      tokenHash: hashToken(rawToken),
      userId: newUser.id,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    });
    writeStore(store);

    res.status(201).json({
      token: rawToken,
      user: sanitizeUser(newUser, store),
      paymentDetails: PAYMENT_DETAILS,
    });
  });

  // Login
  app.post('/api/auth/login', (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    const store = readStore();
    const user = store.users.find((u) => u.email === email);
    if (!user || !verifySecret(password, user.passwordHash)) {
      res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Incorrect email address or password.',
      });
      return;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    store.sessions = store.sessions.filter((s) => new Date(s.expiresAt).getTime() > now);
    store.sessions.push({
      tokenHash: hashToken(rawToken),
      userId: user.id,
      expiresAt: new Date(now + SESSION_TTL_MS).toISOString(),
    });
    writeStore(store);

    res.json({
      token: rawToken,
      user: sanitizeUser(user, store),
      paymentDetails: PAYMENT_DETAILS,
    });
  });

  // Logout
  app.post('/api/auth/logout', (req, res) => {
    const token = extractBearerToken(req);
    if (token) {
      const store = readStore();
      const tokenHash = hashToken(token);
      store.sessions = store.sessions.filter((s) => s.tokenHash !== tokenHash);
      writeStore(store);
    }
    res.json({ ok: true });
  });

  // Current User Profile & Usage
  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.authUser!;
    const store = req.authStore!;
    res.json({
      user: sanitizeUser(user, store),
      paymentDetails: PAYMENT_DETAILS,
    });
  });

  // Forgot Password — generates a 6-digit expiring verification code
  app.post('/api/auth/forgot-password', (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'INVALID_EMAIL', message: 'Please enter a valid email address.' });
      return;
    }

    const store = readStore();
    const user = store.users.find((u) => u.email === email);
    if (!user) {
      res.status(404).json({
        error: 'ACCOUNT_NOT_FOUND',
        message: 'No Corvexa account was found for that email address.',
      });
      return;
    }

    const resetCode = String(crypto.randomInt(100000, 999999));
    user.resetCodeHash = hashSecret(resetCode);
    user.resetCodeExpiresAt = new Date(Date.now() + RESET_CODE_TTL_MS).toISOString();
    writeStore(store);

    res.json({
      ok: true,
      message: 'A 6-digit password reset code has been generated and is valid for 15 minutes.',
      resetCodePreview: resetCode,
    });
  });

  // Reset Password — verifies code and updates password
  app.post('/api/auth/reset-password', (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const code = String(req.body?.code || '').trim();
    const newPassword = String(req.body?.newPassword || '');

    if (newPassword.length < 6) {
      res.status(400).json({
        error: 'WEAK_PASSWORD',
        message: 'New password must be at least 6 characters long.',
      });
      return;
    }

    const store = readStore();
    const user = store.users.find((u) => u.email === email);
    if (!user || !user.resetCodeHash || !user.resetCodeExpiresAt) {
      res.status(400).json({
        error: 'INVALID_RESET_REQUEST',
        message: 'No active password reset request found. Request a new code.',
      });
      return;
    }

    if (new Date(user.resetCodeExpiresAt).getTime() < Date.now()) {
      user.resetCodeHash = null;
      user.resetCodeExpiresAt = null;
      writeStore(store);
      res.status(400).json({
        error: 'CODE_EXPIRED',
        message: 'This verification code has expired. Please request a new one.',
      });
      return;
    }

    if (!verifySecret(code, user.resetCodeHash)) {
      res.status(400).json({
        error: 'INVALID_CODE',
        message: 'The 6-digit verification code is incorrect.',
      });
      return;
    }

    user.passwordHash = hashSecret(newPassword);
    user.resetCodeHash = null;
    user.resetCodeExpiresAt = null;
    // Revoke existing sessions for security
    store.sessions = store.sessions.filter((s) => s.userId !== user.id);
    writeStore(store);

    res.json({
      ok: true,
      message: 'Password updated successfully. You can now sign in with your new password.',
    });
  });

  // Start Exam — enforces 20 free uses, then requires ₦1,000/month PalmPay subscription
  app.post('/api/exams/start', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = req.authStore!;
    const user = store.users.find((u) => u.id === req.authUser!.id)!;

    const activeSub = isSubscriptionActive(user);
    if (!activeSub && user.usageCount >= FREE_USAGE_LIMIT) {
      res.status(402).json({
        error: 'QUOTA_EXCEEDED',
        message:
          'You have completed all 20 free practice sessions. Pay ₦1,000/month to continue.',
        user: sanitizeUser(user, store),
        paymentDetails: PAYMENT_DETAILS,
      });
      return;
    }

    if (!activeSub) {
      user.usageCount += 1;
      writeStore(store);
    }

    res.json({
      allowed: true,
      user: sanitizeUser(user, store),
    });
  });

  // Exam History
  app.get('/api/exams/history', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = req.authStore!;
    const userId = req.authUser!.id;
    const history = store.examHistory
      .filter((entry) => entry.userId === userId)
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
    res.json({ history });
  });

  app.post('/api/exams/history', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = req.authStore!;
    const userId = req.authUser!.id;
    const year = Number(req.body?.year);
    const mode = req.body?.mode === 'practice' ? 'practice' : 'timed';
    const score = Number(req.body?.score);
    const correct = Number(req.body?.correct);
    const totalQuestions = Number(req.body?.totalQuestions || 40);
    const elapsedSeconds = Number(req.body?.elapsedSeconds || 0);
    const completedAt = String(req.body?.completedAt || new Date().toISOString());

    const entry: StoredExamHistory = {
      id: `${year}-${Date.now()}-${crypto.randomInt(1000, 9999)}`,
      userId,
      year,
      mode,
      score,
      correct,
      totalQuestions,
      elapsedSeconds,
      completedAt,
    };

    store.examHistory.unshift(entry);

    if (Array.isArray(req.body?.missedQuestions)) {
      const incoming = req.body.missedQuestions as Array<{
        topic?: string;
        text?: string;
        options?: string[];
        correct?: number;
        userAnswer?: number | null;
        explanation?: string;
      }>;
      for (const item of incoming) {
        if (!item.text || !Array.isArray(item.options) || typeof item.correct !== 'number') {
          continue;
        }
        const existingIdx = store.missedQuestions.findIndex(
          (m) => m.userId === userId && m.text === item.text && m.year === year,
        );
        const record: StoredMissedQuestion = {
          id: existingIdx >= 0 ? store.missedQuestions[existingIdx].id : crypto.randomUUID(),
          userId,
          year,
          topic: String(item.topic || 'Chemistry'),
          text: String(item.text),
          options: item.options.map(String),
          correct: item.correct,
          userAnswer: typeof item.userAnswer === 'number' ? item.userAnswer : null,
          explanation: String(item.explanation || ''),
          recordedAt: completedAt,
        };
        if (existingIdx >= 0) {
          store.missedQuestions[existingIdx] = record;
        } else {
          store.missedQuestions.unshift(record);
        }
      }
      store.missedQuestions = store.missedQuestions.slice(0, 500);
    }

    writeStore(store);
    res.status(201).json({ entry });
  });

  app.get('/api/exams/missed', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = req.authStore!;
    const userId = req.authUser!.id;
    const missed = store.missedQuestions
      .filter((m) => m.userId === userId)
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
    res.json({ missed });
  });

  app.delete('/api/exams/missed/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = req.authStore!;
    const userId = req.authUser!.id;
    const missedId = req.params.id;
    store.missedQuestions = store.missedQuestions.filter(
      (m) => !(m.userId === userId && m.id === missedId),
    );
    writeStore(store);
    res.json({ ok: true });
  });

  app.delete('/api/exams/history', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = req.authStore!;
    const userId = req.authUser!.id;
    store.examHistory = store.examHistory.filter((entry) => entry.userId !== userId);
    writeStore(store);
    res.json({ ok: true });
  });

  // AI Chemistry Tutor — helps students learn failed/missed questions interactively
  app.post('/api/ai/learn-question', requireAuth, async (req: AuthenticatedRequest, res) => {
    const question = req.body?.question as
      | {
          topic?: string;
          text?: string;
          options?: string[];
          correctIndex?: number;
          userAnswerIndex?: number | null;
          explanation?: string;
        }
      | undefined;

    if (!question?.text || !Array.isArray(question.options) || typeof question.correctIndex !== 'number') {
      res.status(400).json({
        error: 'INVALID_QUESTION',
        message: 'Question details are required to start an AI lesson.',
      });
      return;
    }

    const messages = Array.isArray(req.body?.messages)
      ? (req.body.messages as Array<{ role?: string; content?: string }>)
      : [];

    const labels = ['A', 'B', 'C', 'D'];
    const optionsText = question.options
      .map((opt, idx) => `${labels[idx] ?? idx + 1}. ${opt}`)
      .join('\n');
    const correctOption = `${labels[question.correctIndex] ?? ''}. ${
      question.options[question.correctIndex] ?? ''
    }`;
    const studentOption =
      typeof question.userAnswerIndex === 'number' && question.options[question.userAnswerIndex]
        ? `${labels[question.userAnswerIndex] ?? ''}. ${question.options[question.userAnswerIndex]}`
        : 'Unanswered (skipped)';

    const systemInstruction = [
      'You are an expert, encouraging JAMB UTME Chemistry tutor inside the Corvexa CBT platform.',
      'Your job is to help a student thoroughly understand a Chemistry question they missed (or want to master).',
      'Write clearly in concise, well-structured sections with plain formatting (short headings, numbered steps, and clear chemical notation like H2O, CaCO3, or Unicode subscripts).',
      'Keep explanations focused, practical for Nigerian JAMB UTME Chemistry, and under ~260 words unless the student asks for deeper detail.',
      'Never fabricate references; stick strictly to established Chemistry principles.',
    ].join(' ');

    const contextHeader = [
      `Topic: ${question.topic || 'Chemistry'}`,
      `Question: ${question.text}`,
      `Options:\n${optionsText}`,
      `Student's Answer: ${studentOption}`,
      `Correct Answer: ${correctOption}`,
      question.explanation ? `Reference Note: ${question.explanation}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const conversationLines = messages
      .filter((m) => m && typeof m.content === 'string' && m.content.trim().length > 0)
      .slice(-10)
      .map((m) => `${m.role === 'assistant' ? 'Tutor' : 'Student'}: ${m.content!.trim()}`)
      .join('\n\n');

    const prompt =
      messages.length === 0
        ? `${contextHeader}\n\nPlease teach me this question step by step:\n1. Why my chosen answer (${studentOption}) is incorrect (or what trap to avoid if unanswered).\n2. How to work out the correct answer (${correctOption}) clearly.\n3. One quick UTME memory tip or rule for this topic.`
        : `${contextHeader}\n\nConversation so far:\n${conversationLines}\n\nRespond directly to the Student's latest message clearly and helpfully.`;

    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction,
        },
      });

      const reply = (response.text ?? '').trim();
      if (!reply) {
        res.status(502).json({
          error: 'EMPTY_AI_RESPONSE',
          message: 'The AI tutor returned an empty response. Please try again.',
        });
        return;
      }

      res.json({ reply });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message === 'GEMINI_API_KEY_MISSING') {
        res.status(503).json({
          error: 'GEMINI_API_KEY_MISSING',
          message:
            'Gemini API key is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets.',
        });
        return;
      }
      console.error('Gemini AI tutor error:', err);
      res.status(502).json({
        error: 'AI_TUTOR_FAILED',
        message: 'Could not reach the AI Chemistry tutor right now. Please try again shortly.',
      });
    }
  });

  // Submit PalmPay Transfer Proof for Monthly Subscription
  app.post('/api/billing/submit-payment', requireAuth, (req: AuthenticatedRequest, res) => {
    const senderName = String(req.body?.senderName || '').trim();
    const reference = String(req.body?.reference || '').trim();

    if (senderName.length < 2) {
      res.status(400).json({
        error: 'INVALID_SENDER',
        message: 'Please enter the PalmPay / bank sender account name.',
      });
      return;
    }
    if (reference.length < 4) {
      res.status(400).json({
        error: 'INVALID_REFERENCE',
        message: 'Please enter a valid transfer reference or transaction ID.',
      });
      return;
    }

    const store = req.authStore!;
    const user = store.users.find((u) => u.id === req.authUser!.id)!;

    const payment: StoredPayment = {
      id: crypto.randomUUID(),
      userId: user.id,
      userEmail: user.email,
      userName: user.fullName,
      amount: PAYMENT_DETAILS.amount,
      currency: PAYMENT_DETAILS.currency,
      bankName: PAYMENT_DETAILS.bankName,
      accountNumber: PAYMENT_DETAILS.accountNumber,
      accountName: PAYMENT_DETAILS.accountName,
      senderName,
      reference,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      reviewedAt: null,
      reviewNote: null,
    };

    store.payments.unshift(payment);
    writeStore(store);

    res.status(201).json({
      payment,
      user: sanitizeUser(user, store),
    });
  });

  // Owner Billing Portal Routes (for Mbah Johnpaul Tochukwu to verify transfers)
  app.get('/api/owner/status', (_req, res) => {
    const store = readStore();
    res.json({ claimed: Boolean(store.ownerPasscodeHash) });
  });

  app.post('/api/owner/claim', (req, res) => {
    const passcode = String(req.body?.passcode || '').trim();
    if (passcode.length < 6) {
      res.status(400).json({
        error: 'WEAK_PASSCODE',
        message: 'Owner passcode must be at least 6 characters.',
      });
      return;
    }

    const store = readStore();
    if (store.ownerPasscodeHash) {
      res.status(409).json({
        error: 'ALREADY_CLAIMED',
        message: 'Owner portal is already configured. Please sign in with your owner passcode.',
      });
      return;
    }

    store.ownerPasscodeHash = hashSecret(passcode);
    const rawToken = crypto.randomBytes(32).toString('hex');
    store.ownerSessions.push({
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    });
    writeStore(store);

    res.status(201).json({ ownerToken: rawToken });
  });

  app.post('/api/owner/login', (req, res) => {
    const passcode = String(req.body?.passcode || '').trim();
    const store = readStore();
    if (!store.ownerPasscodeHash || !verifySecret(passcode, store.ownerPasscodeHash)) {
      res.status(401).json({
        error: 'INVALID_PASSCODE',
        message: 'Incorrect owner passcode.',
      });
      return;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    store.ownerSessions = store.ownerSessions.filter((s) => new Date(s.expiresAt).getTime() > now);
    store.ownerSessions.push({
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(now + 12 * 60 * 60 * 1000).toISOString(),
    });
    writeStore(store);

    res.json({ ownerToken: rawToken });
  });

  app.get('/api/owner/payments', requireOwner, (_req, res) => {
    const store = readStore();
    const users = store.users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      usageCount: u.usageCount,
      hasActiveSubscription: isSubscriptionActive(u),
      subscriptionActiveUntil: u.subscriptionActiveUntil,
      createdAt: u.createdAt,
    }));

    res.json({
      paymentDetails: PAYMENT_DETAILS,
      payments: store.payments,
      users,
    });
  });

  app.post('/api/owner/payments/:id/approve', requireOwner, (req, res) => {
    const paymentId = req.params.id;
    const store = readStore();
    const payment = store.payments.find((p) => p.id === paymentId);
    if (!payment) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Payment record not found.' });
      return;
    }

    const user = store.users.find((u) => u.id === payment.userId);
    if (!user) {
      res.status(404).json({ error: 'USER_NOT_FOUND', message: 'User account not found.' });
      return;
    }

    const now = Date.now();
    const currentExpiry = user.subscriptionActiveUntil
      ? new Date(user.subscriptionActiveUntil).getTime()
      : 0;
    const baseTime = Math.max(now, currentExpiry);
    const nextExpiry = new Date(
      baseTime + MONTHLY_SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    user.subscriptionActiveUntil = nextExpiry;
    payment.status = 'approved';
    payment.reviewedAt = new Date().toISOString();
    payment.reviewNote = String(req.body?.note || 'Verified PalmPay transfer (₦1,000)');

    writeStore(store);
    res.json({ payment, subscriptionActiveUntil: nextExpiry });
  });

  app.post('/api/owner/payments/:id/reject', requireOwner, (req, res) => {
    const paymentId = req.params.id;
    const store = readStore();
    const payment = store.payments.find((p) => p.id === paymentId);
    if (!payment) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Payment record not found.' });
      return;
    }

    payment.status = 'rejected';
    payment.reviewedAt = new Date().toISOString();
    payment.reviewNote = String(
      req.body?.note || 'Transfer could not be matched. Please verify the reference.',
    );

    writeStore(store);
    res.json({ payment });
  });

  // Also allow Owner to manually grant/renew 30-day subscription for any user by userId
  app.post('/api/owner/users/:id/activate', requireOwner, (req, res) => {
    const userId = req.params.id;
    const store = readStore();
    const user = store.users.find((u) => u.id === userId);
    if (!user) {
      res.status(404).json({ error: 'USER_NOT_FOUND', message: 'User account not found.' });
      return;
    }

    const now = Date.now();
    const currentExpiry = user.subscriptionActiveUntil
      ? new Date(user.subscriptionActiveUntil).getTime()
      : 0;
    const baseTime = Math.max(now, currentExpiry);
    user.subscriptionActiveUntil = new Date(
      baseTime + MONTHLY_SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    writeStore(store);
    res.json({ ok: true, subscriptionActiveUntil: user.subscriptionActiveUntil });
  });

  app.post('/api/owner/users/:id/reset-quota', requireOwner, (req, res) => {
    const userId = req.params.id;
    const store = readStore();
    const user = store.users.find((u) => u.id === userId);
    if (!user) {
      res.status(404).json({ error: 'USER_NOT_FOUND', message: 'User account not found.' });
      return;
    }

    user.usageCount = 0;
    writeStore(store);
    res.json({ ok: true, usageCount: user.usageCount });
  });

  // Vite / Static Serving
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Corvexa CBT server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Corvexa server:', err);
  process.exit(1);
});
