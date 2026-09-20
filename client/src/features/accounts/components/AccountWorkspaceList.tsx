import {
  WorkspaceType,
  isPersonalAuth,
  isPlatformAdminAuth,
  type AccountWorkspaceItem,
  type AuthPrincipal,
} from '@furniture-erp/shared';
import { Building2, Check, Plus, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { useAccountWorkspaces, useSwitchWorkspace } from '@/features/accounts/hooks/use-accounts';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';

export function currentWorkspaceId(
  user: AuthPrincipal | null | undefined,
  items: AccountWorkspaceItem[],
): string | undefined {
  if (!user) return undefined;
  if (isPersonalAuth(user)) return user.workspaceId;
  return items.find((item) => item.storeId === user.storeId)?.id;
}

export function AccountWorkspaceList({ onPicked }: { onPicked?: () => void }) {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const accounts = useAccountWorkspaces();
  const switchWorkspace = useSwitchWorkspace();
  const items = accounts.data?.items ?? [];
  const currentId = currentWorkspaceId(user, items);

  if (isPlatformAdminAuth(user)) return null;

  return (
    <div className="min-w-0">
      {items.length > 0 ? (
        <>
          <p className="px-2.5 pb-1 pt-1 text-[11px] font-medium uppercase tracking-wide text-ink-muted">
            {t('personal.yourAccounts')}
          </p>
          <ul className="py-1">
            {items.map((item) => {
              const personal = item.type === WorkspaceType.PERSONAL;
              const active = item.id === currentId;
              const Icon = personal ? Wallet : Building2;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    disabled={switchWorkspace.isPending || active}
                    onClick={() => {
                      switchWorkspace.mutate(item.id, { onSettled: onPicked });
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-input px-2.5 py-2 text-left text-sm',
                      active ? 'bg-brand-50 text-brand-700' : 'text-ink hover:bg-surface-hover',
                      'disabled:cursor-default',
                    )}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink-muted">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {personal ? t('personal.switchPersonal') : item.name}
                      </span>
                      <span className="block truncate text-xs text-ink-muted">
                        {active
                          ? t('personal.currentAccount')
                          : personal
                            ? t('personal.switchPersonal')
                            : t('personal.businessAccount')}
                      </span>
                    </span>
                    {active ? <Check className="size-4 shrink-0" aria-hidden="true" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}

      <Link
        role="menuitem"
        to={ROUTES.onboarding}
        data-testid="add-account"
        onClick={onPicked}
        className="flex w-full items-center gap-2.5 rounded-input px-2.5 py-2 text-sm text-ink hover:bg-surface-hover"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-dashed border-line-strong text-ink-muted">
          <Plus className="size-4" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block font-medium">{t('personal.addAccount')}</span>
        </span>
      </Link>
    </div>
  );
}
