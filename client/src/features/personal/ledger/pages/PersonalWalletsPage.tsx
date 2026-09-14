import {
  PERSONAL_WALLET_KIND_ORDER,
  PersonalWalletKind,
  formatMoney,
  isDefaultPersonalCategoryName,
  type PersonalWalletDto,
} from '@furniture-erp/shared';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { MoneyField } from '@/features/sales/components/MoneyField';
import { ApiClientError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';

import { WalletKindIcon } from '../components/WalletKindIcon';
import {
  useCreatePersonalWallet,
  usePersonalWallets,
  useUpdatePersonalWallet,
} from '../hooks/use-personal-ledger';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500';

export function PersonalWalletsPage() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const canWrite = Boolean(user?.subscription?.canWrite);
  const wallets = usePersonalWallets();
  const createWallet = useCreatePersonalWallet();
  const updateWallet = useUpdatePersonalWallet();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<PersonalWalletKind>(PersonalWalletKind.CASH);
  const [opening, setOpening] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const items = wallets.data?.items ?? [];
  const active = items.filter((wallet) => !wallet.isArchived);
  const archived = items.filter((wallet) => wallet.isArchived);
  const looksLikeCategory = isDefaultPersonalCategoryName(name);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await createWallet.mutateAsync({ name, kind, openingBalanceSom: opening });
      setName('');
      setOpening(0);
      setKind(PersonalWalletKind.CASH);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('common.retry'));
    }
  }

  async function onToggleArchive(wallet: PersonalWalletDto) {
    setError(null);
    try {
      await updateWallet.mutateAsync({ id: wallet.id, body: { isArchived: !wallet.isArchived } });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('common.retry'));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-ink">{t('personal.wallets')}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t('personal.walletsHint')}</p>
        <p className="mt-2 rounded-xl border border-line bg-surface-muted px-3 py-2 text-sm text-ink-soft">
          {t('personal.walletsVsCategories')}
        </p>
        <Link to={ROUTES.personalCategories} className="mt-2 inline-block text-sm text-brand-700 hover:underline">
          {t('personal.goToCategories')}
        </Link>
      </div>

      {error ? <p className="text-sm text-danger-700">{error}</p> : null}

      {wallets.isPending && !wallets.data ? (
        <Skeleton className="h-32 w-full" />
      ) : wallets.isError ? (
        <ErrorState
          title={t('personal.ledgerLoadFailed')}
          message={t('common.retry')}
          onRetry={() => void wallets.refetch()}
        />
      ) : (
        <>
          <WalletSection
            title={t('personal.activeWallets')}
            items={active}
            empty={t('personal.noActiveWallets')}
            canWrite={canWrite}
            onToggle={onToggleArchive}
          />
          {archived.length > 0 ? (
            <WalletSection
              title={t('personal.archivedWallets')}
              items={archived}
              empty=""
              canWrite={canWrite}
              onToggle={onToggleArchive}
            />
          ) : null}
        </>
      )}

      {canWrite ? (
        <form onSubmit={onCreate} className="space-y-3 rounded-panel border border-line bg-surface p-4 shadow-card">
          <h2 className="text-sm font-semibold text-ink">{t('personal.addWallet')}</h2>
          <p className="text-xs text-ink-muted">{t('personal.addWalletHint')}</p>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('personal.walletName')}
            className={fieldClass}
          />
          {looksLikeCategory ? (
            <p className="text-sm text-amber-800">{t('personal.walletLooksLikeCategory')}</p>
          ) : null}
          <fieldset>
            <legend className="mb-2 text-xs font-medium text-ink-muted">{t('personal.walletKindLabel')}</legend>
            <div className="flex flex-wrap gap-2">
              {PERSONAL_WALLET_KIND_ORDER.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={kind === value}
                  onClick={() => setKind(value)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium',
                    kind === value
                      ? 'border-brand-500 bg-brand-50 text-brand-800'
                      : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink',
                  )}
                >
                  <WalletKindIcon kind={value} className="size-3.5" />
                  {t(`personal.walletKind.${value}`)}
                </button>
              ))}
            </div>
          </fieldset>
          <MoneyField label={t('personal.openingBalance')} value={opening} onChange={setOpening} />
          <button
            type="submit"
            disabled={createWallet.isPending}
            className="rounded-input bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {t('common.save')}
          </button>
        </form>
      ) : (
        <p className="text-sm text-danger-700">{t('personal.trialEnded')}</p>
      )}
    </div>
  );
}

function WalletSection({
  title,
  items,
  empty,
  canWrite,
  onToggle,
}: {
  title: string;
  items: PersonalWalletDto[];
  empty: string;
  canWrite: boolean;
  onToggle: (wallet: PersonalWalletDto) => void;
}) {
  const { t } = useTranslation();
  return (
    <section className="rounded-panel border border-line bg-surface p-4 shadow-card">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((wallet) => (
            <li key={wallet.id} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                  <WalletKindIcon kind={wallet.kind} />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{wallet.name}</p>
                  <p className="text-xs text-ink-muted">{t(`personal.walletKind.${wallet.kind}`)}</p>
                  {isDefaultPersonalCategoryName(wallet.name) ? (
                    <p className="mt-0.5 text-xs text-amber-800">{t('personal.walletLooksLikeCategory')}</p>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={
                    wallet.balanceSom < 0
                      ? 'font-semibold tabular-nums pf-amount-negative'
                      : 'font-semibold tabular-nums text-ink'
                  }
                >
                  {formatMoney(wallet.balanceSom)}
                </span>
                {canWrite ? (
                  <button
                    type="button"
                    className="text-xs text-ink-muted hover:text-ink"
                    onClick={() => onToggle(wallet)}
                  >
                    {wallet.isArchived ? t('personal.restore') : t('personal.archive')}
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
