import {
  PLATFORM_BILLING_STATUS_LABELS,
  PLATFORM_PAYMENT_METHOD_LABELS,
  PlatformPaymentMethod,
  formatMoney,
  formatStoreCreationDate,
  type PlatformInvoiceDto,
} from '@furniture-erp/shared';
import { Loader2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { Dialog } from '@/components/ui/Dialog';
import { MoneyField } from '@/features/sales/components/MoneyField';
import { ApiClientError } from '@/lib/api-client';
import { formatDate } from '@/utils/format';

import { useRecordPayment } from '../hooks/use-platform-billing';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

interface RecordPaymentDialogProps {
  invoice: PlatformInvoiceDto | null;
  onClose: () => void;
}

export function RecordPaymentDialog({ invoice, onClose }: RecordPaymentDialogProps) {
  const record = useRecordPayment();
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<string>(PlatformPaymentMethod.CASH);
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!invoice) return null;
  const current = invoice;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await record.mutateAsync({
        id: current.id,
        body: {
          paidAt: new Date(`${paidAt}T12:00:00`).toISOString(),
          paymentMethod: paymentMethod as typeof PlatformPaymentMethod.CASH,
          reference: reference.trim() || undefined,
          note: note.trim() || undefined,
        },
      });
      onClose();
    } catch (caught) {
      setError(
        caught instanceof ApiClientError ? caught.message : "To'lovni saqlab bo'lmadi",
      );
    }
  }

  return (
    <Dialog
      open
      title="To'lovni tasdiqlaysizmi?"
      description={`${invoice.storeName} · ${invoice.planName}`}
      onClose={onClose}
    >
      <form className="space-y-3" onSubmit={(event) => void onSubmit(event)}>
        <p className="text-sm text-ink">
          Tarif: {invoice.planName}
          <br />
          Davr: {invoice.durationMonths || 1} oy
          <br />
          Summa: {formatMoney(invoice.amount)}
        </p>
        <p className="text-sm text-ink-muted">
          Billing oyi: {formatStoreCreationDate(invoice.billingPeriodStart)} –{' '}
          {formatStoreCreationDate(invoice.billingPeriodEnd)}
        </p>
        <p className="text-sm text-ink">
          Status: {PLATFORM_BILLING_STATUS_LABELS[invoice.status]} · muddat{' '}
          {formatDate(invoice.dueDate)}
        </p>
        <MoneyField label="Summa" value={invoice.amount} onChange={() => undefined} disabled />
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-ink">To'lov sanasi</span>
          <input
            type="date"
            className={fieldClass}
            value={paidAt}
            onChange={(event) => setPaidAt(event.target.value)}
            required
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-ink">To'lov usuli</span>
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
          <span className="font-medium text-ink">Reference</span>
          <input className={fieldClass} value={reference} onChange={(event) => setReference(event.target.value)} />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-ink">Izoh</span>
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
            disabled={record.isPending}
            className="inline-flex items-center gap-1.5 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {record.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            To'lovni tasdiqlash
          </button>
        </div>
      </form>
    </Dialog>
  );
}
