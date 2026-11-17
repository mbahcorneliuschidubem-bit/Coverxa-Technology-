import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { FIRST_20_ELEMENTS, PHYSICAL_CONSTANTS } from '../data/questionBank';

interface ReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ReferenceTab = 'constants' | 'elements';

export function ReferenceModal({ isOpen, onClose }: ReferenceModalProps) {
  const [activeTab, setActiveTab] = useState<ReferenceTab>('constants');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const normalized = query.trim().toLowerCase();
  const filteredElements = FIRST_20_ELEMENTS.filter(
    (el) =>
      el.name.toLowerCase().includes(normalized) ||
      el.symbol.toLowerCase().includes(normalized) ||
      String(el.atomicNumber) === normalized,
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reference-modal-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2
              id="reference-modal-title"
              className="text-lg font-semibold text-slate-900 dark:text-white"
            >
              Chemistry Reference Data
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Standard UTME physical constants and atomic masses (Z = 1–20)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close reference data"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-sky-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-3 dark:border-slate-800">
          <div className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('constants')}
              className={`shrink-0 whitespace-nowrap rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === 'constants'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              Physical Constants
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('elements')}
              className={`shrink-0 whitespace-nowrap rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === 'elements'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              First 20 Elements
            </button>
          </div>

          {activeTab === 'elements' && (
            <div className="relative w-full sm:w-56">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter symbol or name..."
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pr-3 pl-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          )}
        </div>

        <div className="overflow-y-auto p-6">
          {activeTab === 'constants' ? (
            <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {PHYSICAL_CONSTANTS.map((item) => (
                <div
                  key={item.symbol}
                  className="flex items-center justify-between gap-4 px-4 py-3.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-8 w-10 items-center justify-center rounded-md bg-slate-100 font-mono text-sm font-semibold text-slate-900 dark:bg-slate-800 dark:text-sky-300">
                      {item.symbol}
                    </span>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {item.name}
                    </span>
                  </div>
                  <span className="font-mono text-sm font-medium tabular-nums text-slate-900 dark:text-slate-100">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-2.5">Atomic No.</th>
                    <th className="px-4 py-2.5">Symbol</th>
                    <th className="px-4 py-2.5">Element</th>
                    <th className="px-4 py-2.5">IUPAC Group</th>
                    <th className="px-4 py-2.5 text-right">Rel. Atomic Mass</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredElements.map((el) => (
                    <tr
                      key={el.atomicNumber}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-2.5 font-mono tabular-nums text-slate-600 dark:text-slate-400">
                        {el.atomicNumber}
                      </td>
                      <td className="px-4 py-2.5 font-mono font-semibold text-sky-700 dark:text-sky-400">
                        {el.symbol}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                        {el.name}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-slate-600 dark:text-slate-300">
                        Group {el.group}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-900 dark:text-slate-100">
                        {el.mass}
                      </td>
                    </tr>
                  ))}
                  {filteredElements.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400"
                      >
                        No elements match &ldquo;{query}&rdquo;.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
