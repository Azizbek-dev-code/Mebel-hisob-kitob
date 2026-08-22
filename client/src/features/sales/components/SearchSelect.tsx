import { ChevronDown, Loader2, Search, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { cn } from '@/lib/cn';

export interface SearchSelectOption {
  id: string;
  label: string;
  description?: string;
}

interface SearchSelectProps {
  label: string;
  placeholder?: string;
  value: SearchSelectOption | null;
  options: SearchSelectOption[];
  isLoading?: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  onChange: (value: SearchSelectOption | null) => void;
  error?: string;
  disabled?: boolean;
  emptyMessage?: string;
}

/**
 * Combobox-style select used on sale/expense forms.
 *
 * Important for DOM stability: option activation uses `mousedown` + preventDefault
 * so React does not tear down the option node (and swap the input/chip branch)
 * in the middle of a click — that race is a common source of
 * `insertBefore` / `NotFoundError` during sale & customer flows.
 */
export function SearchSelect({
  label,
  placeholder = 'Search…',
  value,
  options,
  isLoading,
  query,
  onQueryChange,
  onChange,
  error,
  disabled,
  emptyMessage = 'No matches',
}: SearchSelectProps) {
  const id = useId();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  function selectOption(option: SearchSelectOption) {
    onChange(option);
    onQueryChange('');
    setOpen(false);
  }

  // Prefer stable ids; fall back so duplicate/missing ids cannot collide in the list.
  const keyedOptions = options.map((option, index) => ({
    option,
    key: option.id ? option.id : `${option.label}-${index}`,
  }));

  return (
    <div ref={rootRef} className="relative space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>

      {/*
        Keep control + listbox under one stable relative wrapper so React always
        reconciles the same parent when swapping the chip/input branch and when
        the listbox mounts/unmounts after a selection.
      */}
      <div className="relative">
        {value ? (
          <div className="flex items-center gap-2 rounded-input border border-line bg-surface px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{value.label}</p>
              {value.description ? (
                <p className="truncate text-xs text-ink-muted">{value.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(null)}
              className="rounded-input p-1 text-ink-muted hover:bg-surface-hover hover:text-ink"
              aria-label="Clear selection"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-subtle" />
            <input
              id={id}
              value={query}
              disabled={disabled}
              placeholder={placeholder}
              role="combobox"
              aria-expanded={open}
              aria-controls={listId}
              aria-autocomplete="list"
              onFocus={() => setOpen(true)}
              onChange={(event) => {
                onQueryChange(event.target.value);
                setOpen(true);
              }}
              aria-invalid={Boolean(error)}
              className={cn(
                'w-full rounded-input border bg-surface py-2.5 pr-9 pl-9 text-sm text-ink outline-none transition-colors',
                'placeholder:text-ink-subtle focus:border-brand-400 focus:ring-2 focus:ring-brand-100',
                error ? 'border-danger-500' : 'border-line',
                disabled && 'opacity-60',
              )}
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-subtle">
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : <ChevronDown className="size-4" />}
            </span>
          </div>
        )}

        {open && !value ? (
          <div
            id={listId}
            className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-card border border-line bg-surface shadow-overlay"
            role="listbox"
          >
            {keyedOptions.length === 0 ? (
              <p className="px-3 py-2.5 text-sm text-ink-muted">{isLoading ? 'Searching…' : emptyMessage}</p>
            ) : (
              <ul>
                {keyedOptions.map(({ option, key }) => (
                  <li key={key} role="option" aria-selected={false}>
                    <button
                      type="button"
                      className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-brand-50"
                      onMouseDown={(event) => {
                        // Prevent input blur + click racing a commit that removes this node.
                        event.preventDefault();
                        selectOption(option);
                      }}
                    >
                      <span className="text-sm font-medium text-ink">{option.label}</span>
                      {option.description ? (
                        <span className="text-xs text-ink-muted">{option.description}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>

      {error ? <p className="text-xs text-danger-600">{error}</p> : null}
    </div>
  );
}
