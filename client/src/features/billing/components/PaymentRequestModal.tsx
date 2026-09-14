import {
  PLATFORM_PAYMENT_METHOD_LABELS,
  PlatformPaymentMethod,
  formatMoney,
  type PlatformPaymentInstructionsDto,
  type PlatformPaymentMethod as PaymentMethod,
} from '@furniture-erp/shared';
import { Loader2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { Dialog } from '@/components/ui/Dialog';
import { ApiClientError } from '@/lib/api-client';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

export interface PaymentRequestSubmit {
  paymentMethod: PaymentMethod;
  note?: string;
  payerReference?: string;
  proofUrl: string;
  proofKey: string;
}

interface PaymentRequestModalProps {
  accountName: string;
  planName: string;
  price: number;
  instructions: PlatformPaymentInstructionsDto | null;
  submitting: boolean;
  uploading: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onUploadProof: (file: File) => Promise<{ url: string; key: string }>;
  onSubmit: (body: PaymentRequestSubmit) => void;
}

export function PaymentRequestModal({
  accountName,
  planName,
  price,
  instructions,
  submitting,
  uploading,
  errorMessage,
  onClose,
  onUploadProof,
  onSubmit,
}: PaymentRequestModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PlatformPaymentMethod.CARD);
  const [note, setNote] = useState('');
  const [payerReference, setPayerReference] = useState('');
  const [proof, setProof] = useState<{ url: string; key: string; name: string } | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setLocalError(null);
    try {
      const uploaded = await onUploadProof(file);
      setProof({ ...uploaded, name: file.name });
    } catch (caught) {
      setProof(null);
      setLocalError(caught instanceof ApiClientError ? caught.message : 'Chek yuklanmadi');
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!proof) {
      setLocalError('To‘lov chekini yuklang');
      return;
    }
    onSubmit({
      paymentMethod,
      note: note.trim() || undefined,
      payerReference: payerReference.trim() || undefined,
      proofUrl: proof.url,
      proofKey: proof.key,
    });
  }

  const pending = submitting || uploading;

  return (
    <Dialog
      open
      title="To‘lov so‘rovi"
      description={`${planName} · ${formatMoney(price)}`}
      onClose={onClose}
    >
      <form className="space-y-3" onSubmit={handleSubmit}>
        <p className="text-sm text-ink">
          Hisob: <span className="font-medium">{accountName}</span>
        </p>
        <p className="text-sm text-ink-muted">
          Tarif: {planName} · narx: {formatMoney(price)}
        </p>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-ink">To‘lov usuli</span>
          <select
            className={fieldClass}
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
          >
            {Object.values(PlatformPaymentMethod).map((method) => (
              <option key={method} value={method}>
                {PLATFORM_PAYMENT_METHOD_LABELS[method]}
              </option>
            ))}
          </select>
        </label>
        <div className="rounded-input border border-line bg-surface-muted px-3 py-2 text-sm">
          <p className="font-medium text-ink">Platforma rekvizitlari</p>
          <p className="mt-1 text-ink-muted">
            Karta: {instructions?.paymentCardNumber || '—'}
          </p>
          <p className="text-ink-muted">Hisob raqami: {instructions?.paymentAccountNumber || '—'}</p>
          {instructions?.paymentInstructions ? (
            <p className="mt-1 text-ink-muted">{instructions.paymentInstructions}</p>
          ) : (
            <p className="mt-1 text-ink-muted">
              Pulni yuqoridagi karta yoki hisobga tashlang, chekni biriktiring.
            </p>
          )}
        </div>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-ink">To‘lov izohi</span>
          <textarea
            className={fieldClass}
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Masalan, to‘lov sanasi yoki karta egasi"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-ink">To‘lov raqami (ixtiyoriy)</span>
          <input
            className={fieldClass}
            value={payerReference}
            onChange={(event) => setPayerReference(event.target.value)}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-ink">To‘lov cheki / screenshot</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="block w-full text-sm"
            onChange={(event) => void onFile(event.target.files?.[0])}
          />
          {proof ? <p className="text-xs text-ink-muted">{proof.name} yuklandi</p> : null}
        </label>
        {localError || errorMessage ? (
          <p role="alert" className="text-sm text-danger-700">
            {localError || errorMessage}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <button type="button" className="rounded-input px-3 py-2 text-sm" onClick={onClose}>
            Bekor
          </button>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Yuborish
          </button>
        </div>
      </form>
    </Dialog>
  );
}
