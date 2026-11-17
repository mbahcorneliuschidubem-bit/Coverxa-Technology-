import { useState } from 'react';
import type { AppView, UserProfile } from '../types/cbt';

const LOGO_SRC = '/assets/aistudio/file_00000000042881f484878ada2ab99358_24218f09.png';

interface TopBarProps {
  activeView: AppView;
  isDark: boolean;
  user: UserProfile | null;
  onToggleTheme: () => void;
  onNavigateDashboard: () => void;
  onOpenReference: () => void;
  onOpenBilling: () => void;
  onOpenOwnerPortal: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export function TopBar({
  activeView,
  isDark,
  user,
  onToggleTheme,
  onNavigateDashboard,
  onOpenReference,
  onOpenBilling,
  onOpenOwnerPortal,
  onOpenAuth,
  onLogout,
}: TopBarProps) {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onNavigateDashboard}
          className="flex shrink-0 items-center gap-2.5 whitespace-nowrap text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-600"
        >
          {!logoFailed ? (
            <img
              src={LOGO_SRC}
              alt="Corvexa logo"
              referrerPolicy="no-referrer"
              onError={() => setLogoFailed(true)}
              className="h-9 w-9 shrink-0 rounded-lg bg-white object-contain p-0.5 ring-1 ring-slate-200 dark:ring-slate-700"
            />
          ) : (
            <span
              aria-hidden="true"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-600 font-mono text-sm font-bold text-white"
            >
              C
            </span>
          )}
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            Corvexa
          </span>
        </button>

        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex dark:text-slate-300"
        >
          <button
            type="button"
            onClick={onNavigateDashboard}
            className={`shrink-0 whitespace-nowrap transition-colors hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-600 dark:hover:text-white ${
              activeView === 'dashboard'
                ? 'text-slate-900 underline decoration-sky-600 decoration-2 underline-offset-8 dark:text-white dark:decoration-sky-400'
                : ''
            }`}
          >
            Exam Years
          </button>
          <button
            type="button"
            onClick={onOpenReference}
            className="shrink-0 whitespace-nowrap transition-colors hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-600 dark:hover:text-white"
          >
            Constants
          </button>
          <button
            type="button"
            onClick={onOpenBilling}
            className="shrink-0 whitespace-nowrap transition-colors hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-600 dark:hover:text-white"
          >
            Subscription
          </button>
          <button
            type="button"
            onClick={onOpenOwnerPortal}
            className="shrink-0 whitespace-nowrap transition-colors hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-600 dark:hover:text-white"
          >
            Admin
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            className="shrink-0 whitespace-nowrap transition-colors hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-600 dark:hover:text-white"
          >
            {isDark ? 'Light Theme' : 'Dark Theme'}
          </button>
        </nav>

        <div className="flex shrink-0 items-center">
          {user ? (
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex h-10 shrink-0 items-center whitespace-nowrap rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Sign Out
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="inline-flex h-10 shrink-0 items-center whitespace-nowrap rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:bg-sky-500 dark:hover:bg-sky-600"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
