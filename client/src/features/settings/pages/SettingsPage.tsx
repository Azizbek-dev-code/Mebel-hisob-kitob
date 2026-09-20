import {
  DEFAULT_STORE_TIMEZONE,
  STORE_RESET_CONFIRMATION,
  STORE_TIMEZONE_OPTIONS,
  SUBSCRIPTION_STATUS_LABELS,
  UserRole,
  type StoreProfile,
} from '@furniture-erp/shared';
import { AlertTriangle, Tags } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { useBusinessUnreadCount } from '@/features/notifications/use-business-notifications';
import { canReadAuditLog } from '@/routes/navigation';
import { ApiClientError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';
import { formatDate, formatDateTime } from '@/utils/format';
import { storeBillingService } from '@/services/store-billing.service';

import { useResetStore, useUpdateStoreSettings } from '../hooks/use-settings';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

export function canManageSettings(role: string | undefined): boolean {
  return role === UserRole.ADMIN || role === UserRole.PLATFORM_ADMIN;
}

function fieldError(error: unknown, field: string): string | null {
  if (!(error instanceof ApiClientError) || !error.details) return null;
  return error.details.find((d) => d.field === field)?.message ?? null;
}

export function loadErrorMessage(error: unknown, t: (key: string) => string): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden) return t('settings.forbiddenView');
    return error.message || t('common.retry');
  }
  return t('common.retry');
}

function timezoneLabel(value: string, t: (key: string) => string): string {
  if (value === DEFAULT_STORE_TIMEZONE) return t('settings.timezoneTashkent');
  return value;
}

interface StoreSettingsFormProps {
  store: StoreProfile;
  editable: boolean;
}

export function StoreSettingsForm({ store, editable }: StoreSettingsFormProps) {
  const { t } = useTranslation();
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
    const timer = window.setTimeout(() => setMessage(null), 3500);
    return () => window.clearTimeout(timer);
  }, [message]);

  const busy = updateStore.isPending;
  const mutationError = updateStore.error;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!editable) return;

    setFormError(null);
    setMessage(null);

    if (!name.trim()) {
      setFormError(t('settings.storeNameRequired'));
      return;
    }

    try {
      await updateStore.mutateAsync({
        name: name.trim(),
        phone: phone.trim() ? phone.trim() : null,
        address: address.trim() ? address.trim() : null,
        timezone,
      });
      setMessage(t('settings.saved'));
    } catch (error) {
      if (error instanceof ApiClientError && error.isForbidden) {
        setFormError(t('settings.forbiddenEdit'));
        return;
      }
      if (error instanceof ApiClientError) {
        setFormError(error.message || t('settings.saveError'));
        return;
      }
      setFormError(t('settings.saveError'));
    }
  }

  const nameError = fieldError(mutationError, 'name');
  const phoneError = fieldError(mutationError, 'phone');
  const addressError = fieldError(mutationError, 'address');
  const timezoneError = fieldError(mutationError, 'timezone');

  return (
    <SectionCard
      title={t('settings.storeProfile')}
      description={
        editable ? t('settings.storeProfileEditHint') : t('settings.storeProfileViewHint')
      }
    >
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <div>
          <label className="mb-1 block text-sm text-ink-soft" htmlFor="store-name">
            {t('settings.storeName')}
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
            {t('common.phone')}
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
            {t('sales.address')}
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
              {t('settings.currency')}
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
              {t('settings.timezone')}
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
                    {timezoneLabel(option, t)}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="store-timezone"
                className={cn(fieldClass, 'bg-surface-muted text-ink-muted')}
                value={timezoneLabel(store.timezone, t)}
                readOnly
              />
            )}
            {timezoneError ? <p className="mt-1 text-xs text-danger">{timezoneError}</p> : null}
          </div>
        </div>

        <p className="text-xs text-ink-subtle">
          {t('settings.lastUpdated', { date: formatDateTime(store.updatedAt) })}
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
              {busy ? t('common.saving') : t('common.save')}
            </button>
          </div>
        ) : null}
      </form>
    </SectionCard>
  );
}

export function SettingsPage() {
  const { t } = useTranslation();
  const { data: currentUser, isPending } = useCurrentUser();
  const editable = canManageSettings(currentUser?.role);
  const unread = useBusinessUnreadCount();

  const links: { to: string; labelKey: string; hintKey: string; show?: boolean }[] = [
    { to: ROUTES.settingsAccount, labelKey: 'settings.hubAccount', hintKey: 'settings.hubAccountHint' },
    { to: ROUTES.settingsSecurity, labelKey: 'settings.hubSecurity', hintKey: 'settings.hubSecurityHint' },
    { to: ROUTES.settingsShop, labelKey: 'settings.hubShop', hintKey: 'settings.hubShopHint', show: editable },
    { to: ROUTES.billing, labelKey: 'settings.hubBilling', hintKey: 'settings.hubBillingHint', show: editable },
    { to: ROUTES.storeReferral, labelKey: 'settings.hubReferral', hintKey: 'settings.hubReferralHint', show: editable },
    { to: ROUTES.notifications, labelKey: 'settings.hubNotifications', hintKey: 'settings.hubNotificationsHint' },
    { to: ROUTES.settingsBackup, labelKey: 'settings.hubBackup', hintKey: 'settings.backupHint', show: editable },
    { to: ROUTES.audit, labelKey: 'nav.audit', hintKey: 'settings.accountHubHint', show: editable && canReadAuditLog(currentUser) },
    { to: ROUTES.settingsDanger, labelKey: 'settings.hubDanger', hintKey: 'settings.hubDangerHint' },
  ];

  if (isPending) {
    return (
      <PageContainer>
        <Skeleton className="h-48 w-full" />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-ink">{t('nav.profile')}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t('settings.profileSubtitle')}</p>
      </div>

      <section className="rounded-2xl border border-line bg-surface px-4 py-3.5">
        <p className="truncate text-lg font-semibold text-ink">{currentUser?.fullName ?? t('nav.profile')}</p>
        {currentUser?.email ? <p className="mt-0.5 truncate text-xs text-ink-muted">{currentUser.email}</p> : null}
        {currentUser && 'storeName' in currentUser && currentUser.storeName ? (
          <p className="mt-1 text-sm text-ink-muted">{currentUser.storeName}</p>
        ) : null}
      </section>

      <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
        {links
          .filter((item) => item.show !== false)
          .map((item) => (
            <li key={item.to} className="border-b border-line last:border-b-0">
              <Link to={item.to} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-hover">
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="block text-sm font-medium text-ink">{t(item.labelKey)}</span>
                    {item.to === ROUTES.notifications && unread.badge ? (
                      <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                        {unread.badge}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-muted">{t(item.hintKey)}</span>
                </span>
              </Link>
            </li>
          ))}
      </ul>
    </PageContainer>
  );
}

export function StoreResetSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const resetStore = useResetStore();
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  const busy = resetStore.isPending;
  const phraseOk = confirmation === STORE_RESET_CONFIRMATION;

  async function handleReset(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setDoneMessage(null);

    if (!phraseOk) {
      setError(t('settings.resetConfirmMismatch'));
      return;
    }

    try {
      const result = await resetStore.mutateAsync({ confirmation });
      setConfirmation('');
      setDoneMessage(
        t('settings.resetSuccess', { count: result.totalDeletedRows }),
      );
      navigate(ROUTES.dashboard, { replace: true });
    } catch (err) {
      if (err instanceof ApiClientError && err.isForbidden) {
        setError(t('settings.forbiddenEdit'));
        return;
      }
      if (err instanceof ApiClientError) {
        setError(err.message || t('settings.resetFailed'));
        return;
      }
      setError(t('settings.resetFailed'));
    }
  }

  return (
    <SectionCard title={t('settings.resetTitle')} description={t('settings.resetHint')}>
      <div className="space-y-4">
        <div className="flex gap-3 rounded-input border border-danger-100 bg-danger-50 px-3 py-3 text-sm text-danger-700">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger-600" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-medium">{t('settings.resetWarning')}</p>
            <p>{t('settings.resetKeeps')}</p>
          </div>
        </div>

        <form className="space-y-3" onSubmit={(event) => void handleReset(event)}>
          <div>
            <label className="mb-1 block text-sm text-ink-soft" htmlFor="store-reset-confirm">
              {t('settings.resetTypePhrase', { phrase: STORE_RESET_CONFIRMATION })}
            </label>
            <input
              id="store-reset-confirm"
              className={fieldClass}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder={STORE_RESET_CONFIRMATION}
              disabled={busy}
            />
          </div>

          {error ? <p className="text-sm text-danger">{error}</p> : null}
          {doneMessage ? <p className="text-sm text-success">{doneMessage}</p> : null}

          <button
            type="submit"
            className="rounded-input bg-danger-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-danger-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy || !phraseOk}
          >
            {busy ? t('settings.resetting') : t('settings.resetAction')}
          </button>
        </form>
      </div>
    </SectionCard>
  );
}

export function StoreSubscriptionSettings() {
  const { t } = useTranslation();
  const subscription = useQuery({
    queryKey: ['store-billing-subscription'],
    queryFn: ({ signal }) => storeBillingService.getSubscription(signal),
  });
  const sub = subscription.data?.subscription;
  const isTrial = sub?.status === 'TRIAL';

  return (
    <SectionCard title={t('settings.subscription')} description={t('settings.subscriptionHint')}>
      {subscription.isPending && !subscription.data ? (
        <Skeleton className="h-24 w-full" />
      ) : !sub ? (
        <p className="text-sm text-ink-muted">{t('settings.noSubscription')}</p>
      ) : (
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-input bg-brand-50 text-brand-600">
              <Tags className="size-4" aria-hidden="true" />
            </span>
            <p className="font-semibold text-ink">
              {isTrial ? t('settings.freeTrial') : sub.planName}
            </p>
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
          {isTrial ? <p className="text-ink-muted">{t('settings.trialDays')}</p> : null}
          <p className="text-ink-muted">
            {t('settings.started', { date: formatDate(sub.startedAt) })}
            <br />
            {t('settings.expires', { date: formatDate(sub.expiresAt) })}
            {sub.daysRemaining != null ? (
              <>
                <br />
                {t('settings.daysLeft', { count: sub.daysRemaining })}
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
                {row.unlimited
                  ? ` / ${t('settings.unlimited')}`
                  : row.limitValue != null
                    ? ` / ${row.limitValue}`
                    : ''}
              </li>
            ))}
          </ul>
          <Link
            to={ROUTES.billing}
            className="inline-flex items-center rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            {isTrial ? t('settings.choosePlan') : t('settings.changePlan')}
          </Link>
        </div>
      )}
    </SectionCard>
  );
}
