import type { SupplierListItem } from '@furniture-erp/shared';
import { useEffect, useState, type FormEvent } from 'react';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { lockBodyScroll } from '@/lib/body-scroll-lock';

import { ApiClientError } from '@/lib/api-client';

import { useCreateSupplier, useUpdateSupplier } from '../hooks/use-purchasing';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

export type SupplierFormMode = 'create' | 'edit';

interface SupplierFormDialogProps {
  mode: SupplierFormMode;
  supplier?: SupplierListItem | null;
  open: boolean;
  onClose: () => void;
  onSaved?: (supplier: SupplierListItem) => void;
}

function fieldError(error: unknown, field: string): string | null {
  if (!(error instanceof ApiClientError) || !error.details) return null;
  return error.details.find((d) => d.field === field)?.message ?? null;
}

export function SupplierFormDialog({
  mode,
  supplier,
  open,
  onClose,
  onSaved,
}: SupplierFormDialogProps) {
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    if (mode === 'edit' && supplier) {
      setName(supplier.name);
      setPhone(supplier.phone ?? '');
      setNotes(supplier.notes ?? '');
    } else {
      setName('');
      setPhone('');
      setNotes('');
    }
  }, [open, mode, supplier]);

  useEffect(() => {
    if (!open) return;
    return lockBodyScroll();
  }, [open]);

  if (!open) return null;

  const busy = createSupplier.isPending || updateSupplier.isPending;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Nomi majburiy');
      return;
    }

    try {
      const saved =
        mode === 'create'
          ? await createSupplier.mutateAsync({
              name: name.trim(),
              phone: phone.trim() || null,
              notes: notes.trim() || null,
            })
          : await updateSupplier.mutateAsync({
              id: supplier!.id,
              body: {
                name: name.trim(),
                phone: phone.trim() || null,
                notes: notes.trim() || null,
              },
            });
      onSaved?.(saved);
      onClose();
    } catch (error) {
      const nameMsg = fieldError(error, 'name');
      const phoneMsg = fieldError(error, 'phone');
      setFormError(
        nameMsg ||
          phoneMsg ||
          (error instanceof ApiClientError ? error.message : 'Saqlab bo‘lmadi'),
      );
    }
  }

  return (

    <ModalPortal>
        <div

          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-3 sm:items-center"

          role="dialog"

          aria-modal="true"

          aria-labelledby="supplier-form-title"

          data-testid="supplier-form-dialog"

        >

          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-card border border-line bg-surface p-4 shadow-lg">

            <h3 id="supplier-form-title" className="text-lg font-semibold text-ink">

              {mode === 'create' ? 'Yangi yetkazuvchi' : 'Yetkazuvchini tahrirlash'}

            </h3>

            <p className="mt-1 text-sm text-ink-muted">

              Qarz kirimlardan hisoblanadi — bu yerda faqat aloqa ma’lumotlari.

            </p>

            <form className="mt-4 space-y-3" onSubmit={(e) => void handleSubmit(e)}>

              <label className="block text-sm">

                <span className="mb-1 block text-ink-soft">Nomi</span>

                <input

                  className={fieldClass}

                  value={name}

                  onChange={(e) => setName(e.target.value)}

                  autoComplete="organization"

                  required

                />

              </label>

              <label className="block text-sm">

                <span className="mb-1 block text-ink-soft">Telefon</span>

                <input

                  className={fieldClass}

                  value={phone}

                  onChange={(e) => setPhone(e.target.value)}

                  placeholder="+998 90 123 45 67"

                  inputMode="tel"

                  autoComplete="tel"

                />

              </label>

              <label className="block text-sm">

                <span className="mb-1 block text-ink-soft">Izoh</span>

                <textarea

                  className={fieldClass}

                  rows={3}

                  value={notes}

                  onChange={(e) => setNotes(e.target.value)}

                  placeholder="Masalan: Urgut ombori"

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
