import type { CustomerListItem } from '@furniture-erp/shared';
import { useEffect, useState, type FormEvent } from 'react';

import { ModalPortal } from '@/components/ui/ModalPortal';
import { ApiClientError } from '@/lib/api-client';
import { lockBodyScroll } from '@/lib/body-scroll-lock';

import {
  useCreateCustomerCatalogue,
  useUpdateCustomer,
} from '../hooks/use-customers';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

export type CustomerFormMode = 'create' | 'edit';

interface CustomerFormDialogProps {
  mode: CustomerFormMode;
  customer?: CustomerListItem | null;
  open: boolean;
  onClose: () => void;
  onSaved?: (customer: CustomerListItem) => void;
}

function fieldError(error: unknown, field: string): string | null {
  if (!(error instanceof ApiClientError) || !error.details) return null;
  return error.details.find((d) => d.field === field)?.message ?? null;
}

export function CustomerFormDialog({
  mode,
  customer,
  open,
  onClose,
  onSaved,
}: CustomerFormDialogProps) {
  const createCustomer = useCreateCustomerCatalogue();
  const updateCustomer = useUpdateCustomer();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    if (mode === 'edit' && customer) {
      setFirstName(customer.firstName);
      setLastName(customer.lastName);
      setPhone(customer.phone);
      setNotes(customer.notes ?? '');
    } else {
      setFirstName('');
      setLastName('');
      setPhone('');
      setNotes('');
    }
  }, [open, mode, customer]);

  useEffect(() => {
    if (!open) return;
    return lockBodyScroll();
  }, [open]);

  if (!open) return null;

  const busy = createCustomer.isPending || updateCustomer.isPending;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setFormError('Ism va familiya majburiy');
      return;
    }
    if (!phone.trim()) {
      setFormError('Telefon majburiy');
      return;
    }

    try {
      const saved =
        mode === 'create'
          ? await createCustomer.mutateAsync({
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              phone: phone.trim(),
              notes: notes.trim() || null,
            })
          : await updateCustomer.mutateAsync({
              id: customer!.id,
              body: {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                phone: phone.trim(),
                notes: notes.trim() || null,
              },
            });
      onSaved?.(saved);
      onClose();
    } catch (error) {
      const phoneMsg = fieldError(error, 'phone');
      const nameMsg = fieldError(error, 'firstName') ?? fieldError(error, 'lastName');
      setFormError(
        phoneMsg ||
          nameMsg ||
          (error instanceof ApiClientError ? error.message : "Saqlab bo'lmadi"),
      );
    }
  }

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-3 sm:items-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-form-title"
        data-testid="customer-form-dialog"
      >
        <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-card border border-line bg-surface p-4 shadow-lg">
          <h3 id="customer-form-title" className="text-lg font-semibold text-ink">
            {mode === 'create' ? 'Yangi mijoz' : 'Mijozni tahrirlash'}
          </h3>
          <p className="mt-1 text-sm text-ink-muted">
            Qarz va to&apos;lovlar hisobdan olinadi — bu yerda faqat aloqa ma&apos;lumotlari.
          </p>

          <form className="mt-4 space-y-3" onSubmit={(e) => void handleSubmit(e)}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-ink-soft">Ism</span>
                <input
                  className={fieldClass}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  required
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-ink-soft">Familiya</span>
                <input
                  className={fieldClass}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  required
                />
              </label>
            </div>

            <label className="block text-sm">
              <span className="mb-1 block text-ink-soft">Telefon</span>
              <input
                className={fieldClass}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+998 90 123 45 67"
                inputMode="tel"
                autoComplete="tel"
                required
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-ink-soft">Izoh</span>
              <textarea
                className={fieldClass}
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Masalan: Urgut, yangi uy"
              />
            </label>

            {formError ? (
              <p className="rounded-input border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-800">
                {formError}
              </p>
            ) : null}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="rounded-input border border-line px-3 py-2 text-sm hover:bg-surface-hover disabled:opacity-50"
              >
                Bekor
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {busy ? 'Saqlanmoqda…' : mode === 'create' ? 'Yaratish' : 'Saqlash'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
