import { Loader2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { Dialog } from '@/components/ui/Dialog';
import { ApiClientError } from '@/lib/api-client';
import { platformBillingService } from '@/services/platform-billing.service';
import { formatMoney } from '@furniture-erp/shared';
import type { PlatformInvoiceDto } from '@furniture-erp/shared';

interface RejectPaymentDialogProps {
  invoice: PlatformInvoiceDto | null;
  onClose: () => void;
}

export function RejectPaymentDialog({ invoice, onClose }: RejectPaymentDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const queryClient = useQueryClient();

  if (!invoice) return null;
  const current = invoice;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (reason.trim().length < 3) {
      setError('Rad etish sababi kerak');
      return;
    }
    setPending(true);
    try {
      await platformBillingService.rejectPayment(current.id, { reason: reason.trim() });
      await queryClient.invalidateQueries({ queryKey: ['platform-invoices'] });
      onClose();
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "Rad etib bo'lmadi");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open
      title="So'rovni rad etish"
      description={`${invoice.storeName} · ${formatMoney(invoice.amount)}`}
      onClose={onClose}
    >
      <form className="space-y-3" onSubmit={(event) => void onSubmit(event)}>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-ink">Sabab</span>
          <textarea
            className="w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm"
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
            minLength={3}
          />
        </label>
        {error ? (
          <p role="alert" className="text-sm text-danger-700">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <button type="button" className="rounded-input px-3 py-2 text-sm" onClick={onClose}>
            Bekor
          </button>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-input bg-danger-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Rad etish
          </button>
        </div>
      </form>
    </Dialog>
  );
}
