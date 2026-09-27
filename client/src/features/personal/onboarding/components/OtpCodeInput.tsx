import {
  useCallback,
  useEffect,
  useRef,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react';

import { cn } from '@/lib/cn';

const LENGTH = 6;

type OtpCodeInputProps = {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  error?: boolean;
  'aria-label'?: string;
};

function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, LENGTH);
}

export function OtpCodeInput({
  value,
  onChange,
  disabled,
  autoFocus = true,
  error,
  'aria-label': ariaLabel = 'Verification code',
}: OtpCodeInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const chars = Array.from({ length: LENGTH }, (_, i) => value[i] ?? '');

  useEffect(() => {
    if (!autoFocus || disabled) return;
    const firstEmpty = chars.findIndex((c) => !c);
    const index = firstEmpty >= 0 ? firstEmpty : LENGTH - 1;
    refs.current[index]?.focus();
  }, [autoFocus, disabled]); // eslint-disable-line react-hooks/exhaustive-deps -- focus once on mount

  const setAt = useCallback(
    (index: number, digit: string) => {
      const next = chars.map((c, i) => (i === index ? digit : c));
      onChange(next.join('').replace(/\D/g, '').slice(0, LENGTH));
    },
    [chars, onChange],
  );

  function handleChange(index: number, raw: string) {
    const cleaned = digitsOnly(raw);
    if (cleaned.length > 1) {
      // Mobile autofill / multi-digit paste into one box
      onChange(cleaned);
      const focusAt = Math.min(cleaned.length, LENGTH - 1);
      refs.current[focusAt]?.focus();
      return;
    }
    setAt(index, cleaned);
    if (cleaned && index < LENGTH - 1) {
      refs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !chars[index] && index > 0) {
      event.preventDefault();
      setAt(index - 1, '');
      refs.current[index - 1]?.focus();
      return;
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      refs.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowRight' && index < LENGTH - 1) {
      event.preventDefault();
      refs.current[index + 1]?.focus();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = digitsOnly(event.clipboardData.getData('text'));
    if (!pasted) return;
    onChange(pasted);
    const focusAt = Math.min(pasted.length, LENGTH - 1);
    refs.current[focusAt]?.focus();
  }

  return (
    <div className="flex justify-center gap-2 sm:gap-2.5" role="group" aria-label={ariaLabel}>
      {chars.map((char, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={LENGTH}
          value={char}
          disabled={disabled}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          aria-label={`${ariaLabel} ${index + 1}`}
          className={cn(
            'size-11 rounded-input border bg-surface text-center text-lg font-semibold tabular-nums text-ink transition-colors duration-150 sm:size-12',
            error
              ? 'border-danger-500'
              : 'border-line-strong focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100',
            disabled && 'opacity-60',
          )}
        />
      ))}
    </div>
  );
}
