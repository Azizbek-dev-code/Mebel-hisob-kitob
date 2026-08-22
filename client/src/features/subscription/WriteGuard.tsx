import { Lock } from 'lucide-react';
import { type MouseEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/cn';

import { useSubscription } from './subscription-context';

interface WriteGuardProps {
  children: ReactNode;
  className?: string;
  to?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  /** Feature catalog key. Missing keys open the upgrade modal even while subscribed. */
  feature?: string;
  title?: string;
}

/**
 * Single write-action wrapper. Expired trials and missing plan features open
 * SubscriptionGate instead of navigating or submitting.
 */
export function WriteGuard({
  children,
  className,
  to,
  onClick,
  disabled,
  type = 'button',
  feature,
  title,
}: WriteGuardProps) {
  const { canWrite, hasFeature, openGate } = useSubscription();
  const featureAllowed = !feature || hasFeature(feature);
  const locked = !canWrite || !featureAllowed;
  const reason = !canWrite ? 'expired' : 'feature';
  const hint = !canWrite ? 'Tarifni yangilang' : 'Bu funksiya tarifingizda yo‘q';

  function intercept(event: MouseEvent) {
    if (!locked) return;
    event.preventDefault();
    event.stopPropagation();
    openGate(reason);
  }

  const lockedClass = cn(className, locked && 'relative opacity-70');

  const inner = (
    <>
      {children}
      {locked ? <Lock className="size-3.5 shrink-0 opacity-80" aria-hidden="true" /> : null}
    </>
  );

  if (to) {
    if (locked) {
      return (
        <button
          type="button"
          className={lockedClass}
          disabled={disabled}
          title={title ?? hint}
          onClick={() => openGate(reason)}
        >
          {inner}
        </button>
      );
    }
    return (
      <Link to={to} className={className} onClick={onClick} title={title}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={lockedClass}
      disabled={disabled}
      title={title ?? (locked ? hint : undefined)}
      onClick={(event) => {
        intercept(event);
        if (!locked) onClick?.();
      }}
    >
      {inner}
    </button>
  );
}
