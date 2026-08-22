import {
  WORKER_RESPONSIBILITY_LABELS,
  WorkerResponsibility,
  type WorkerResponsibility as WorkerResponsibilityType,
} from '@furniture-erp/shared';

import { cn } from '@/lib/cn';

const ALL = Object.values(WorkerResponsibility);

export interface ResponsibilityPickerProps {
  value: WorkerResponsibilityType[];
  onChange: (next: WorkerResponsibilityType[]) => void;
  disabled?: boolean;
}

export function ResponsibilityPicker({ value, onChange, disabled }: ResponsibilityPickerProps) {
  function toggle(item: WorkerResponsibilityType) {
    if (value.includes(item)) {
      onChange(value.filter((entry) => entry !== item));
    } else {
      onChange([...value, item]);
    }
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {ALL.map((item) => {
        const checked = value.includes(item);
        return (
          <label
            key={item}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-input border px-3 py-2 text-sm',
              checked ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-line text-ink',
              disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            <input
              type="checkbox"
              className="size-4 accent-brand-600"
              checked={checked}
              disabled={disabled}
              onChange={() => toggle(item)}
            />
            {WORKER_RESPONSIBILITY_LABELS[item]}
          </label>
        );
      })}
    </div>
  );
}
