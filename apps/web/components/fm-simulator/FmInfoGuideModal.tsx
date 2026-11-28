'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Calculator, Info, Lightbulb, Sparkles, X } from 'lucide-react';
import { FM_GUIDE_CATALOG, type FmGuideId } from './fm-guide-content-pillars';
import { FmGuideIllustration } from './FmGuideIllustration';

interface FmGuideContextValue {
  readonly activeGuideId: FmGuideId | null;
  readonly openGuide: (id: FmGuideId) => void;
  readonly closeGuide: () => void;
}

const FmGuideContext = createContext<FmGuideContextValue | null>(null);

export function FmGuideProvider({ children }: { readonly children: React.ReactNode }) {
  const [activeGuideId, setActiveGuideId] = useState<FmGuideId | null>(null);

  const openGuide = useCallback((id: FmGuideId) => {
    setActiveGuideId(id);
  }, []);

  const closeGuide = useCallback(() => {
    setActiveGuideId(null);
  }, []);

  return (
    <FmGuideContext.Provider value={{ activeGuideId, openGuide, closeGuide }}>
      {children}
      <FmInfoGuideModal guideId={activeGuideId} onClose={closeGuide} />
    </FmGuideContext.Provider>
  );
}

export function FmInfoTrigger({ guideId, label }: { readonly guideId: FmGuideId; readonly label?: string }) {
  const ctx = useContext(FmGuideContext);
  if (!ctx) return null;

  return (
    <button
      type="button"
      aria-label={label ? `Giải thích ${label}` : `Xem hướng dẫn ${guideId}`}
      title="Xem giải thích cách tính & triết lý"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        ctx.openGuide(guideId);
      }}
      className="inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-neutral-200/80 text-neutral-500 transition hover:bg-blue-500/15 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-blue-500/20 dark:hover:text-blue-400"
    >
      <Info className="h-3 w-3" />
    </button>
  );
}

export function FmInfoGuideModal({
  guideId,
  onClose,
}: {
  readonly guideId: FmGuideId | null;
  readonly onClose: () => void;
}) {
  useEffect(() => {
    if (!guideId) return undefined;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [guideId, onClose]);

  if (!guideId) return null;
  const entry = FM_GUIDE_CATALOG[guideId];
  if (!entry) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="fm-guide-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-black/10 bg-white p-5 shadow-2xl dark:border-white/15 dark:bg-neutral-900 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with top-right close icon */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
              <Sparkles className="h-3 w-3" />
              {entry.badge}
            </span>
            <h2
              id="fm-guide-modal-title"
              className="mt-2 text-lg font-bold tracking-tight text-neutral-900 dark:text-white"
            >
              {entry.title}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">{entry.summary}</p>
          </div>
          <button
            type="button"
            aria-label="Đóng hướng dẫn"
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition hover:bg-neutral-200 hover:text-neutral-900 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Visual Illustration */}
        <div className="mt-4 rounded-2xl border border-black/5 bg-neutral-100/80 p-3.5 dark:border-white/10 dark:bg-neutral-800/60">
          <FmGuideIllustration kind={entry.illustration} />
        </div>

        {/* Formula & How it works */}
        <div className="mt-4 space-y-2.5">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-900 dark:text-white">
            <Calculator className="h-3.5 w-3.5 text-blue-500" />
            <span>Quy tắc &amp; Cách tính chi tiết</span>
          </div>

          {entry.formula ? (
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300">
              {entry.formula}
            </div>
          ) : null}

          <ul className="space-y-1.5 text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
            {entry.howItWorks.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Concrete Worked Example */}
        <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
          <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{entry.example.title}</div>
          <div className="mt-1.5 space-y-1 text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
            {entry.example.lines.map((line) => (
              <div key={line} className="tabular-nums">
                {line}
              </div>
            ))}
          </div>
          <div className="mt-2.5 rounded-xl bg-emerald-500/15 px-3 py-2 text-xs font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
            → {entry.example.result}
          </div>
        </div>

        {/* Wings Philosophy */}
        <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
            <Lightbulb className="h-3.5 w-3.5" />
            <span>Triết lý Wings Lashes</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">{entry.philosophy}</p>
        </div>
      </div>
    </div>
  );
}
