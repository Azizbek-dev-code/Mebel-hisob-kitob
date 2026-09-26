import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { ModalPortal } from '@/components/ui/ModalPortal';
import { lockBodyScroll } from '@/lib/body-scroll-lock';
import { ROUTES } from '@/routes/paths';

import { useGrowthProgress } from '../hooks/use-growth-xp';

const STORAGE_KEY = 'balancy:personal-last-level';

/**
 * Frontend-only celebration when growth progress level increases.
 * Does not change XP/level math — only reacts to already-fetched progress.
 */
export function LevelUpOverlay() {
  const { t } = useTranslation();
  const progress = useGrowthProgress();
  const [level, setLevel] = useState<number | null>(null);
  const [fromLevel, setFromLevel] = useState<number | null>(null);

  useEffect(() => {
    const next = progress.data?.level;
    if (next == null || !Number.isFinite(next)) return;

    let previous: number | null = null;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      previous = raw ? Number(raw) : null;
    } catch {
      previous = null;
    }

    try {
      sessionStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      /* ignore quota */
    }

    if (previous != null && Number.isFinite(previous) && next > previous) {
      setFromLevel(previous);
      setLevel(next);
    }
  }, [progress.data?.level]);

  useEffect(() => {
    if (level == null) return;
    const unlock = lockBodyScroll();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLevel(null);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      unlock();
      document.removeEventListener('keydown', onKey);
    };
  }, [level]);

  if (level == null) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/55 p-6 backdrop-blur-[2px]">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pf-level-up-title"
          className="pf-level-up relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-brand-800 px-6 py-8 text-center text-white shadow-overlay"
        >
          <div className="pf-level-up-glow" aria-hidden="true" />
          <div className="pf-level-up-particles" aria-hidden="true" />
          <div className="relative mx-auto flex size-14 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
            <Sparkles className="size-6 text-emerald-200" aria-hidden="true" />
          </div>
          <p className="relative mt-4 text-xs font-medium uppercase tracking-[0.14em] text-white/70">
            {t('personal.levelUpEyebrow')}
          </p>
          <h2 id="pf-level-up-title" className="relative mt-2 text-2xl font-semibold tracking-tight">
            {fromLevel != null
              ? t('personal.levelUpTransition', { from: fromLevel, to: level })
              : t('personal.levelUpTitle', { level })}
          </h2>
          <p className="relative mt-2 text-sm text-white/75">{t('personal.levelUpHint')}</p>
          {progress.data?.nextUnlock && progress.data.nextUnlock.minLevel === level ? (
            <p className="relative mt-3 text-sm font-medium text-emerald-200">
              {t('personal.levelUpNewUnlock')}:{' '}
              {t(`personal.levelUnlock.${progress.data.nextUnlock.titleKey}`)}
            </p>
          ) : progress.data?.unlockedKeys?.length ? (
            <p className="relative mt-3 text-sm text-white/80">{t('personal.levelUpNewUnlock')}</p>
          ) : null}
          <div className="relative mt-6 flex flex-col gap-2">
            <Link
              to={ROUTES.personalGrowthLevel}
              className="pf-btn-primary w-full bg-white text-brand-800 hover:bg-white/95"
              onClick={() => setLevel(null)}
            >
              {t('personal.levelUpCta')}
            </Link>
            <button
              type="button"
              className="min-h-11 rounded-xl text-sm font-medium text-white/80 hover:text-white"
              onClick={() => setLevel(null)}
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
