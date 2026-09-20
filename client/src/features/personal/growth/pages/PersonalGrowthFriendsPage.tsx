import type { GrowthFriendPresenceDto, GrowthFriendshipDto } from '@furniture-erp/shared';
import { UserPlus, Users } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { ApiClientError } from '@/lib/api-client';
import { ROUTES } from '@/routes/paths';
import { formatRelativeTime } from '@/utils/format';

import {
  useAcceptFriend,
  useDeclineFriend,
  useGrowthFriends,
  useGrowthFriendsPrivacy,
  useRemoveFriend,
  useSendFriendRequest,
  useUpdateFriendsPrivacy,
} from '../hooks/use-growth-friends';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

export function PersonalGrowthFriendsPage() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const canWrite = Boolean(user && 'subscription' in user && user.subscription?.canWrite);
  const list = useGrowthFriends();
  const privacy = useGrowthFriendsPrivacy();
  const send = useSendFriendRequest();
  const updatePrivacy = useUpdateFriendsPrivacy();
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [handle, setHandle] = useState('');

  async function onInvite(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await send.mutateAsync({ query: query.trim() });
      setQuery('');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('personal.friendsRequestFailed'));
    }
  }

  async function onSavePrivacy(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await updatePrivacy.mutateAsync({
        handle: handle.trim() || privacy.data?.handle || null,
        showLevel: privacy.data?.showLevel ?? true,
        showActivity: privacy.data?.showActivity ?? true,
        allowFriendRequests: privacy.data?.allowFriendRequests ?? true,
      });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('personal.friendsPrivacyFailed'));
    }
  }

  return (
    <div className="space-y-5 overflow-x-hidden">
      <div>
        <p className="text-xs font-medium text-brand-700">
          <Link to={ROUTES.personalGrowth} className="hover:underline">
            {t('personal.navGrowth')}
          </Link>
        </p>
        <h1 className="mt-1 text-lg font-semibold tracking-tight text-ink">
          {t('personal.friendsTitle')}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">{t('personal.friendsHint')}</p>
      </div>

      <form className="space-y-2 rounded-2xl border border-line bg-surface p-3" onSubmit={(e) => void onInvite(e)}>
        <label className="block space-y-1 text-sm">
          <span className="text-ink-muted">{t('personal.friendsInvite')}</span>
          <div className="flex gap-2">
            <input
              className={fieldClass}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('personal.friendsInvitePlaceholder')}
              disabled={!canWrite}
            />
            <button
              type="submit"
              disabled={!canWrite || send.isPending || query.trim().length < 2}
              className="inline-flex shrink-0 items-center gap-1 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              <UserPlus className="size-4" aria-hidden="true" />
              {t('personal.friendsSend')}
            </button>
          </div>
        </label>
      </form>

      <form
        className="space-y-2 rounded-2xl border border-line bg-surface p-3"
        onSubmit={(e) => void onSavePrivacy(e)}
      >
        <p className="text-sm font-medium text-ink">{t('personal.friendsPrivacy')}</p>
        <input
          className={fieldClass}
          value={handle || privacy.data?.handle || ''}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="@handle"
          disabled={!canWrite}
        />
        <label className="flex items-center gap-2 text-xs text-ink-soft">
          <input
            type="checkbox"
            checked={privacy.data?.showLevel ?? true}
            disabled={!canWrite || !privacy.data}
            onChange={(e) =>
              void updatePrivacy.mutateAsync({ showLevel: e.target.checked })
            }
          />
          {t('personal.friendsShowLevel')}
        </label>
        <label className="flex items-center gap-2 text-xs text-ink-soft">
          <input
            type="checkbox"
            checked={privacy.data?.allowFriendRequests ?? true}
            disabled={!canWrite || !privacy.data}
            onChange={(e) =>
              void updatePrivacy.mutateAsync({ allowFriendRequests: e.target.checked })
            }
          />
          {t('personal.friendsAllowRequests')}
        </label>
        <button
          type="submit"
          disabled={!canWrite || updatePrivacy.isPending}
          className="rounded-input border border-line px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-surface-hover disabled:opacity-60"
        >
          {t('personal.friendsSaveHandle')}
        </button>
      </form>

      {error ? (
        <p className="text-sm text-danger-700" role="alert">
          {error}
        </p>
      ) : null}

      {list.isPending && !list.data ? (
        <Skeleton className="h-40 w-full" />
      ) : list.isError ? (
        <ErrorState
          title={t('personal.friendsLoadFailed')}
          message={t('common.retry')}
          onRetry={() => void list.refetch()}
        />
      ) : (
        <>
          {(list.data?.incoming.length ?? 0) > 0 ? (
            <section>
              <h2 className="text-sm font-semibold text-ink">{t('personal.friendsIncoming')}</h2>
              <ul className="mt-2 space-y-2">
                {list.data?.incoming.map((row) => (
                  <IncomingRow key={row.id} row={row} canWrite={canWrite} />
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Users className="size-4 text-brand-700" aria-hidden="true" />
              {t('personal.friendsList', { count: list.data?.friendCount ?? 0 })}
            </h2>
            {(list.data?.friends.length ?? 0) === 0 ? (
              <p className="mt-2 text-sm text-ink-muted">{t('personal.friendsEmpty')}</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {list.data?.friends.map((row) => (
                  <FriendRow key={row.id} row={row} canWrite={canWrite} />
                ))}
              </ul>
            )}
          </section>

          {(list.data?.outgoing.length ?? 0) > 0 ? (
            <section>
              <h2 className="text-sm font-semibold text-ink">{t('personal.friendsOutgoing')}</h2>
              <ul className="mt-2 space-y-2">
                {list.data?.outgoing.map((row) => (
                  <OutgoingRow key={row.id} row={row} canWrite={canWrite} />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

function FriendRow({ row, canWrite }: { row: GrowthFriendshipDto; canWrite: boolean }) {
  const { t } = useTranslation();
  const remove = useRemoveFriend();
  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink">{row.friend.fullName}</p>
        <p className="text-[11px] text-ink-muted">
          {row.friend.handle ? `@${row.friend.handle}` : ''}
          {row.friend.level != null ? ` · Lv ${row.friend.level}` : ''}
        </p>
        <FriendPresence presence={row.friend.presence} />
      </div>
      {canWrite ? (
        <button
          type="button"
          disabled={remove.isPending}
          className="text-xs font-medium text-ink-subtle hover:text-danger-700"
          onClick={() => void remove.mutateAsync(row.id)}
        >
          {t('personal.friendsRemove')}
        </button>
      ) : null}
    </li>
  );
}

function IncomingRow({ row, canWrite }: { row: GrowthFriendshipDto; canWrite: boolean }) {
  const { t } = useTranslation();
  const accept = useAcceptFriend();
  const decline = useDeclineFriend();
  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink">{row.friend.fullName}</p>
      </div>
      {canWrite ? (
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            disabled={accept.isPending}
            className="rounded-input bg-brand-600 px-2.5 py-1 text-xs font-medium text-white"
            onClick={() => void accept.mutateAsync(row.id)}
          >
            {t('personal.friendsAccept')}
          </button>
          <button
            type="button"
            disabled={decline.isPending}
            className="rounded-input border border-line px-2.5 py-1 text-xs"
            onClick={() => void decline.mutateAsync(row.id)}
          >
            {t('personal.friendsDecline')}
          </button>
        </div>
      ) : null}
    </li>
  );
}

function OutgoingRow({ row, canWrite }: { row: GrowthFriendshipDto; canWrite: boolean }) {
  const { t } = useTranslation();
  const remove = useRemoveFriend();
  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-line bg-surface px-3 py-2.5">
      <p className="truncate text-sm text-ink-soft">{row.friend.fullName}</p>
      {canWrite ? (
        <button
          type="button"
          className="text-xs text-ink-subtle hover:text-ink"
          onClick={() => void remove.mutateAsync(row.id)}
        >
          {t('personal.friendsCancel')}
        </button>
      ) : null}
    </li>
  );
}

function FriendPresence({ presence }: { presence?: GrowthFriendPresenceDto }) {
  const { t } = useTranslation();
  if (!presence || (presence.online == null && !presence.lastSeenAt)) return null;
  if (presence.online === true) {
    return <p className="text-[11px] text-emerald-700">{t('personal.presenceOnline')}</p>;
  }
  if (presence.online === false) {
    return (
      <p className="text-[11px] text-ink-subtle">
        {t('personal.presenceOffline')}
        {presence.lastSeenAt
          ? ` · ${t('personal.presenceLastSeen', { time: formatRelativeTime(presence.lastSeenAt) })}`
          : ''}
      </p>
    );
  }
  return null;
}
