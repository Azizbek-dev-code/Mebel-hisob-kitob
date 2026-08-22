import { useId } from 'react';

import { cn } from '@/lib/cn';
import { formatMoneyNumber, parseMoneyInput } from '@/utils/format';

interface MoneyFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  error?: string;
  disabled?: boolean;
  hint?: string;
}

export function MoneyField({ label, value, onChange, error, disabled, hint }: MoneyFieldProps) {
  const id = useId();

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          inputMode="numeric"
          disabled={disabled}
          value={value === 0 ? '' : formatMoneyNumber(value)}
          onChange={(event) => {
            const parsed = parseMoneyInput(event.target.value);
            onChange(parsed ?? 0);
          }}
          placeholder="0"
          aria-invalid={Boolean(error)}
          className={cn(
            'w-full rounded-input border bg-surface py-2.5 pr-14 pl-3 text-sm text-ink outline-none',
            'placeholder:text-ink-subtle focus:border-brand-400 focus:ring-2 focus:ring-brand-100',
            error ? 'border-danger-500' : 'border-line',
            disabled && 'opacity-60',
          )}
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-ink-muted">
          so&apos;m
        </span>
      </div>
      {hint ? <p className="text-xs text-ink-muted">{hint}</p> : null}
      {error ? <p className="text-xs text-danger-600">{error}</p> : null}
    </div>
  );
}
