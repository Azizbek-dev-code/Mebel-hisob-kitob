import {
  DEFAULT_STORE_TIMEZONE,
  STORE_TIMEZONE_OPTIONS,
  SUBSCRIPTION_STATUS_LABELS,
  UserRole,
  type StoreProfile,
} from '@furniture-erp/shared';
import { DatabaseBackup, Settings, Tags } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { ApiClientError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';
import { formatDate, formatDateTime } from '@/utils/format';
import { storeBillingService } from '@/services/store-billing.service';

import { useStoreSettings, useUpdateStoreSettings } from '../hooks/use-settings';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

function canManageSettings(role: string | undefined): boolean {
  return role === UserRole.ADMIN || role === UserRole.PLATFORM_ADMIN;
}

function fieldError(error: unknown, field: string): string | null {
  if (!(error instanceof ApiClientError) || !error.details) return null;
  return error.details.find((d) => d.field === field)?.message ?? null;
}

function loadErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden) return 'Do‘kon sozlamalarini ko‘rish uchun ruxsat yo‘q.';
    return error.message || 'Qayta urinib ko‘ring.';
  }
  return 'Qayta urinib ko‘ring.';
}

function timezoneLabel(value: string): string {
  if (value === DEFAULT_STORE_TIMEZONE) return 'Toshkent (Asia/Tashkent)';
  return value;
}

interface StoreSettingsFormProps {
  store: StoreProfile;
  editable: boolean;
}

function StoreSettingsForm({ store, editable }: StoreSettingsFormProps) {
  const updateStore = useUpdateStoreSettings();

  const [name, setName] = useState(store.name);
  const [phone, setPhone] = useState(store.phone ?? '');
  const [address, setAddress] = useState(store.address ?? '');
  const [timezone, setTimezone] = useState(store.timezone || DEFAULT_STORE_TIMEZONE);
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setName(store.name);
    setPhone(store.phone ?? '');
    setAddress(store.address ?? '');
    setTimezone(store.timezone || DEFAULT_STORE_TIMEZONE);
  }, [store]);

  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => setMessage(null), 3500);
    return () => window.clearTimeout(t);
  }, [message]);

  const busy = updateStore.isPending;
  const mutationError = updateStore.error;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!editable) return;

    setFormError(null);
    setMessage(null);

    if (!name.trim()) {
      setFormError('Do‘kon nomi majburiy');
      return;
    }

    try {
      await updateStore.mutateAsync({
        name: name.trim(),
        phone: phone.trim() ? phone.trim() : null,
        address: address.trim() ? address.trim() : null,
        timezone,
      });
      setMessage('Sozlamalar saqlandi');
    } catch (error) {
      if (error instanceof ApiClientError && error.isForbidden) {
        setFormError('Sozlamalarni tahrirlash uchun ruxsat yo‘q.');
        return;
      }
      if (error instanceof ApiClientError) {
        setFormError(error.message || 'Saqlashda xatolik yuz berdi.');
        return;
      }
      setFormError('Saqlashda xatolik yuz berdi.');
    }
  }

  const nameError = fieldError(mutationError, 'name');
  const phoneError = fieldError(mutationError, 'phone');
  const addressError = fieldError(mutationError, 'address');
  const timezoneError = fieldError(mutationError, 'timezone');

  return (
    <SectionCard
      title="Do‘kon profili"
      description={
        editable
          ? 'Do‘kon nomi, aloqa va vaqt mintaqasini yangilang.'
          : 'Do‘kon ma’lumotlari faqat ko‘rish uchun.'
      }
    >
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <div>
          <label className="mb-1 block text-sm text-ink-soft" htmlFor="store-name">
            Do‘kon nomi
          </label>
          <input
            id="store-name"
            className={cn(fieldClass, !editable && 'bg-surface-muted text-ink-muted')}
            value={name}
            onChange={(event) => setName(event.target.value)}
            readOnly={!editable}
            required
            maxLength={200}
          />
          {nameError ? <p className="mt-1 text-xs text-danger">{nameError}</p> : null}
        </div>

        <div>
          <label className="mb-1 block text-sm text-ink-soft" htmlFor="store-phone">
            Telefon
          </label>
          <input
            id="store-phone"
            className={cn(fieldClass, !editable && 'bg-surface-muted text-ink-muted')}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            readOnly={!editable}
            placeholder="+998 XX XXX XX XX"
            maxLength={40}
          />
          {phoneError ? <p className="mt-1 text-xs text-danger">{phoneError}</p> : null}
        </div>

        <div>
          <label className="mb-1 block text-sm text-ink-soft" htmlFor="store-address">
            Manzil
          </label>
          <textarea
            id="store-address"
            className={cn(fieldClass, 'min-h-20 resize-y', !editable && 'bg-surface-muted text-ink-muted')}
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            readOnly={!editable}
            maxLength={500}
          />
          {addressError ? <p className="mt-1 text-xs text-danger">{addressError}</p> : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-ink-soft" htmlFor="store-currency">
              Valyuta
            </label>
            <input
              id="store-currency"
              className={cn(fieldClass, 'bg-surface-muted text-ink-muted')}
              value={store.currency}
              readOnly
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-ink-soft" htmlFor="store-timezone">
              Vaqt mintaqasi
            </label>
            {editable ? (
              <select
                id="store-timezone"
                className={fieldClass}
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
              >
                {STORE_TIMEZONE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {timezoneLabel(option)}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="store-timezone"
                className={cn(fieldClass, 'bg-surface-muted text-ink-muted')}
                value={timezoneLabel(store.timezone)}
                readOnly
              />
            )}
            {timezoneError ? <p className="mt-1 text-xs text-danger">{timezoneError}</p> : null}
          </div>
        </div>

        <p className="text-xs text-ink-subtle">
          Oxirgi yangilanish: {formatDateTime(store.updatedAt)}
        </p>

        {formError ? <p className="text-sm text-danger">{formError}</p> : null}
        {message ? <p className="text-sm text-success">{message}</p> : null}

        {editable ? (
          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-input bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy}
            >
              {busy ? 'Saqlanmoqda…' : 'Saqlash'}
            </button>
          </div>
        ) : null}
      </form>
    </SectionCard>
  );
}

export function SettingsPage() {
  const { data: currentUser } = useCurrentUser();
  const settings = useStoreSettings(Boolean(currentUser));
  const editable = canManageSettings(currentUser?.role);

  if (settings.isError) {
    return (
      <PageContainer>
        <ErrorState
          title="Sozlamalarni yuklab bo‘lmadi"
          message={loadErrorMessage(settings.error)}
          onRetry={() => void settings.refetch()}
        />
      </PageContainer>
    );
  }

  if (settings.isLoading || !settings.data) {
    return (
      <PageContainer>
        <Skeleton className="h-48 w-full" />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 items-center justify-center rounded-card bg-brand-50 text-brand-600">
          <Settings className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">Sozlamalar</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Joriy do‘kon profili va standartlar.
          </p>
        </div>
      </div>

      <StoreSettingsForm store={settings.data} editable={editable} />

      {editable ? <StoreSubscriptionSettings /> : null}

      {editable ? (
        <SectionCard
          title="Zaxira nusxa"
          description="Do‘kon ma’lumotlarini eksport qilish va tiklash — faqat administrator."
        >
          <Link
            to={ROUTES.settingsBackup}
            className="inline-flex items-center gap-2 rounded-input border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink hover:border-brand-200 hover:bg-brand-50"
          >
            <DatabaseBackup className="size-4 text-brand-600" aria-hidden="true" />
            Zaxira / tiklash
          </Link>
        </SectionCard>
      ) : null}
    </PageContainer>
  );
}

function StoreSubscriptionSettings() {
  const subscription = useQuery({
    queryKey: ['store-billing-subscription'],
    queryFn: ({ signal }) => storeBillingService.getSubscription(signal),
  });
  const sub = subscription.data?.subscription;
  const isTrial = sub?.status === 'TRIAL';

  return (
    <SectionCard
      title="Tarif / Obuna"
      description="Joriy obuna holati. Tarifni o‘zgartirish billing sahifasida."
    >
      {subscription.isPending && !subscription.data ? (
        <Skeleton className="h-24 w-full" />
      ) : !sub ? (
        <p className="text-sm text-ink-muted">Obuna ma’lumoti yo‘q.</p>
      ) : (
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-input bg-brand-50 text-brand-600">
              <Tags className="size-4" aria-hidden="true" />
            </span>
            <p className="font-semibold text-ink">{isTrial ? 'FREE TRIAL' : sub.planName}</p>
            <Badge
              tone={
                sub.status === 'ACTIVE' || sub.status === 'TRIAL'
                  ? 'success'
                  : sub.status === 'EXPIRED'
                    ? 'danger'
                    : 'warning'
              }
            >
              {SUBSCRIPTION_STATUS_LABELS[sub.status]}
            </Badge>
          </div>
          {isTrial ? <p className="text-ink-muted">7 kunlik sinov</p> : null}
          <p className="text-ink-muted">
            Boshlangan: {formatDate(sub.startedAt)}
            <br />
            Tugash: {formatDate(sub.expiresAt)}
            {sub.daysRemaining != null ? (
              <>
                <br />
                Qolgan: {sub.daysRemaining} kun
              </>
            ) : null}
          </p>
          <ul className="space-y-0.5 text-ink-muted">
            {(sub.enabledFeatures ?? []).map((item) => (
              <li key={item.id}>✓ {item.name}</li>
            ))}
          </ul>
          <ul className="space-y-0.5 text-ink-muted">
            {(sub.usage ?? []).map((row) => (
              <li key={row.resourceKey}>
                {row.name}: {row.used}
                {row.unlimited ? ' / cheksiz' : row.limitValue != null ? ` / ${row.limitValue}` : ''}
              </li>
            ))}
          </ul>
          <Link
            to={ROUTES.billing}
            className="inline-flex items-center rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            {isTrial ? 'Tarif tanlash' : 'Tarifni o‘zgartirish'}
          </Link>
        </div>
      )}
    </SectionCard>
  );
}
