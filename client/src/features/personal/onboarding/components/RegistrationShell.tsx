import { ChevronLeft, Loader2 } from 'lucide-react';
import type { KeyboardEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';

type RegistrationShellProps = {
  title: string;
  subtitle?: string;
  progress?: { current: number; total: number } | null;
  onBack?: () => void;
  backDisabled?: boolean;
  children: ReactNode;
  /** Sticky primary action area (Continue / Create). */
  footer?: ReactNode;
  className?: string;
  /** Animate step content. */
  contentKey?: string;
};

export function RegistrationShell({
  title,
  subtitle,
  progress,
  onBack,
  backDisabled,
  children,
  footer,
  className,
  contentKey,
}: RegistrationShellProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        'flex min-h-[min(100dvh,720px)] flex-col sm:min-h-0',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            disabled={backDisabled}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors duration-200 hover:bg-surface-muted hover:text-ink disabled:opacity-50"
            aria-label={t('common.back')}
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
        ) : (
          <span className="size-10 shrink-0" aria-hidden="true" />
        )}
        {progress ? (
          <p
            className="flex-1 text-center text-xs tabular-nums text-ink-subtle"
            data-testid="onboarding-progress"
          >
            {t('onboarding.step', { current: progress.current, total: progress.total })}
          </p>
        ) : (
          <span className="flex-1" />
        )}
        <span className="size-10 shrink-0" aria-hidden="true" />
      </div>

      <div
        key={contentKey}
        className="pf-reg-step mt-4 flex-1"
      >
        <h2 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">{title}</h2>
        {subtitle ? <p className="mt-2 text-sm leading-relaxed text-ink-muted">{subtitle}</p> : null}
        <div className="mt-6">{children}</div>
      </div>

      {footer ? (
        <div
          className="sticky bottom-0 z-10 -mx-6 mt-8 border-t border-line/80 bg-surface/95 px-6 pt-4 backdrop-blur-sm sm:-mx-8 sm:px-8"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}

type ContinueButtonProps = {
  label?: string;
  busy?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
};

export function ContinueButton({
  label,
  busy,
  disabled,
  onClick,
  type = 'button',
}: ContinueButtonProps) {
  const { t } = useTranslation();
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || busy}
      className="pf-btn-primary inline-flex w-full items-center justify-center gap-2 rounded-input px-4 py-3 text-sm font-medium disabled:opacity-60"
    >
      {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
      {label ?? t('common.continue')}
    </button>
  );
}

/** Desktop Enter-to-continue for text inputs. */
export function onEnterKey(event: KeyboardEvent, onContinue: () => void) {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  onContinue();
}

export function fieldClass(hasError: boolean): string {
  return cn(
    'w-full rounded-input border bg-surface px-3 py-3 text-base text-ink transition-colors duration-150 sm:text-sm',
    hasError
      ? 'border-danger-500'
      : 'border-line-strong hover:border-ink-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100',
  );
}
