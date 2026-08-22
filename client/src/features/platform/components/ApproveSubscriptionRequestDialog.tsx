import {
  PLATFORM_PAYMENT_METHOD_LABELS,
  PlatformPaymentMethod,
  formatMoney,
  type ApproveSubscriptionRequestBody,
  type SubscriptionRequestDto,
} from '@furniture-erp/shared';
import { Loader2 } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';

import { Dialog } from '@/components/ui/Dialog';
import { ApiClientError } from '@/lib/api-client';
import { formatDate } from '@/utils/format';

import { useApproveSubscriptionRequest } from '../hooks/use-platform-billing';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

function toDateInput(iso: string): string {
  return iso.slice(0, 10);
}

function addOneMonth(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setMonth(date.getMonth() + 1);
  return date.toISOString().slice(0, 10);
}

interface ApproveSubscriptionRequestDialogProps {
  request: SubscriptionRequestDto | null;
  onClose: () => void;
}

export function ApproveSubscriptionRequestDialog({
  request,
  onClose,
}: ApproveSubscriptionRequestDialogProps) {
  const approve = useApproveSubscriptionRequest();
  const defaults = useMemo(() => {
    const start = new Date().toISOString().slice(0, 10);
    return { start, end: addOneMonth(start) };
  }, []);
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [paymentMethod, setPaymentMethod] = useState<string>(PlatformPaymentMethod.CASH);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!request) return null;
  const current = request;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const body: ApproveSubscriptionRequestBody = {
      startDate: new Date(`${startDate}T00:00:00`).toISOString(),
      endDate: new Date(`${endDate}T00:00:00`).toISOString(),
      paymentMethod: paymentMethod as typeof PlatformPaymentMethod.CASH,
      note: note.trim() || undefined,
    };
    try {
      await approve.mutateAsync({ id: current.id, body });
      onClose();
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : 'Tasdiqlab bo‘lmadi');
    }
  }

  return (
    <Dialog
      open
      title="Obunani tasdiqlash"
      description={`${request.storeName} · ${request.planName}`}
      onClose={onClose}
    >
      <form className="space-y-3" onSubmit={(event) => void onSubmit(event)}>
        <p className="text-sm text-ink">
          Do&apos;kon: {request.storeName}
          <br />
          Tarif: {request.planName}
          <br />
          Narx: {formatMoney(request.requestedPriceSnapshot)}
          <br />
          Muddat: 1 oy
        </p>
        <p className="text-sm text-ink-muted">
          Hozirgi tarif: {request.currentPlanName ?? '—'}
          {request.ownerPhone ? ` · ${request.ownerPhone}` : ''}
        </p>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-ink">Boshlanish</span>
          <input
            type="date"
            className={fieldClass}
            value={toDateInput(startDate)}
            onChange={(event) => {
              setStartDate(event.target.value);
              setEndDate(addOneMonth(event.target.value));
            }}
            required
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-ink">Tugash</span>
          <input
            type="date"
            className={fieldClass}
            value={toDateInput(endDate)}
            onChange={(event) => setEndDate(event.target.value)}
            required
          />
        </label>
        <p className="text-xs text-ink-muted">
          {formatDate(startDate)} → {formatDate(endDate)}
        </p>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-ink">To&apos;lov usuli</span>
          <select
            className={fieldClass}
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value)}
          >
            {Object.entries(PLATFORM_PAYMENT_METHOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-ink">Izoh (ixtiyoriy)</span>
          <textarea
            className={fieldClass}
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        {error ? (
          <p role="alert" className="text-sm text-danger-700">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="rounded-input px-3 py-2 text-sm text-ink-muted" onClick={onClose}>
            Bekor
          </button>
          <button
            type="submit"
            disabled={approve.isPending}
            className="inline-flex items-center gap-1.5 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {approve.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Tasdiqlash
          </button>
        </div>
      </form>
    </Dialog>
  );
}
