import type { ReactNode } from 'react';

import { MoneyField } from './MoneyField';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

export interface WorkerOption {
  id: string;
  fullName: string;
}

/**
 * One worker role + optional fee — single place to enter both.
 * Fee is shown only when a worker is selected.
 */
export function WorkerFeeRow({
  workerLabel,
  feeLabel,
  workerId,
  onWorkerChange,
  workers,
  noneLabel,
  fee,
  onFeeChange,
  selectTestId,
  feeTestId,
  extra,
}: {
  workerLabel: string;
  feeLabel: string;
  workerId: string;
  onWorkerChange: (id: string) => void;
  workers: WorkerOption[];
  noneLabel: string;
  fee: number;
  onFeeChange: (value: number) => void;
  selectTestId?: string;
  feeTestId?: string;
  /** Optional row under the pair (e.g. delivery due date). */
  extra?: ReactNode;
}) {
  const selected = Boolean(workerId);

  return (
    <div className="space-y-3 sm:col-span-2" data-testid={selectTestId ? `${selectTestId}-row` : undefined}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-ink">{workerLabel}</label>
          <select
            className={fieldClass}
            value={workerId}
            onChange={(event) => onWorkerChange(event.target.value)}
            data-testid={selectTestId}
          >
            <option value="">{noneLabel}</option>
            {workers.map((worker) => (
              <option key={worker.id} value={worker.id}>
                {worker.fullName}
              </option>
            ))}
          </select>
        </div>
        {selected ? (
          <div className="space-y-1.5" data-testid={feeTestId}>
            <MoneyField label={feeLabel} value={fee} onChange={onFeeChange} />
          </div>
        ) : null}
      </div>
      {selected && extra ? <div className="grid gap-3 sm:grid-cols-2">{extra}</div> : null}
    </div>
  );
}
