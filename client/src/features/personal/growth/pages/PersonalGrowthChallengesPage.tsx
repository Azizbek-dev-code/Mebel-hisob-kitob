import {
  GrowthChallengeKind,
  GrowthChallengeMetric,
  type GrowthChallengeDto,
  type GrowthFriendshipDto,
} from '@furniture-erp/shared';
import { Swords } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { ApiClientError } from '@/lib/api-client';
import { ROUTES } from '@/routes/paths';

import { useGrowthFriends } from '../hooks/use-growth-friends';
import {
  useAcceptChallenge,
  useCancelChallenge,
  useCreateChallenge,
  useDeclineChallenge,
  useGrowthChallenges,
} from '../hooks/use-growth-challenges';
import { useCreateGrowthTodo, useGrowthTodos } from '../hooks/use-growth-todos';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

const METRICS = [
  GrowthChallengeMetric.FOCUS_MINUTES,
  GrowthChallengeMetric.TASKS_COMPLETED,
  GrowthChallengeMetric.LEARNING_MINUTES,
  GrowthChallengeMetric.XP_GAINED,
] as const;

export function PersonalGrowthChallengesPage() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const canWrite = Boolean(user && 'subscription' in user && user.subscription?.canWrite);
  const list = useGrowthChallenges();
  const friends = useGrowthFriends();
  const create = useCreateChallenge();
  const [kind, setKind] = useState<'FIGHT' | 'GROUP'>('FIGHT');
  const [title, setTitle] = useState('');
  const [metric, setMetric] = useState<(typeof METRICS)[number]>(
    GrowthChallengeMetric.FOCUS_MINUTES,
  );
  const [durationDays, setDurationDays] = useState(7);
  const [targetValue, setTargetValue] = useState(600);
  const [opponentId, setOpponentId] = useState('');
  const [inviteeIds, setInviteeIds] = useState<string[]>([]);
  const [todoIds, setTodoIds] = useState<string[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [dailyTargetMinutes, setDailyTargetMinutes] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const todos = useGrowthTodos();
  const createTodo = useCreateGrowthTodo();

  const friendOptions = useMemo(
    () => friends.data?.friends ?? [],
    [friends.data?.friends],
  );

  function toggleInvitee(id: string) {
    setInviteeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 9 ? prev : [...prev, id],
    );
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const ids = kind === 'FIGHT' ? (opponentId ? [opponentId] : []) : inviteeIds;
    if (kind === 'FIGHT' && ids.length !== 1) {
      setError(t('personal.challengesNeedOpponent'));
      return;
    }
    if (kind === 'GROUP' && ids.length < 2) {
      setError(t('personal.challengesNeedGroup'));
      return;
    }
    try {
      await create.mutateAsync({
        kind: kind === 'FIGHT' ? GrowthChallengeKind.FIGHT : GrowthChallengeKind.GROUP,
        title: title.trim(),
        metric,
        durationDays,
        inviteeIds: ids,
        ...(kind === 'GROUP' ? { targetValue } : {}),
        ...(metric === GrowthChallengeMetric.TASKS_COMPLETED ? { todoIds } : {}),
        ...(metric === GrowthChallengeMetric.LEARNING_MINUTES ? { dailyTargetMinutes } : {}),
      });
      setTitle('');
      setOpponentId('');
      setInviteeIds([]);
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : t('personal.challengesCreateFailed'),
      );
    }
  }

  if (list.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (list.isError || !list.data) {
    return (
      <ErrorState
        title={t('personal.challengesLoadFailed')}
        message={t('personal.challengesLoadFailed')}
        onRetry={() => void list.refetch()}
      />
    );
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
          {t('personal.challengesTitle')}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">{t('personal.challengesHint')}</p>
      </div>

      <form
        className="space-y-3 rounded-2xl border border-line bg-surface p-3"
        onSubmit={(e) => void onCreate(e)}
      >
        <div className="flex gap-2">
          <button
            type="button"
            className={`flex-1 rounded-input px-3 py-2 text-sm font-medium ${
              kind === 'FIGHT' ? 'bg-brand-600 text-white' : 'border border-line text-ink'
            }`}
            onClick={() => setKind('FIGHT')}
          >
            {t('personal.challengesKindFight')}
          </button>
          <button
            type="button"
            className={`flex-1 rounded-input px-3 py-2 text-sm font-medium ${
              kind === 'GROUP' ? 'bg-brand-600 text-white' : 'border border-line text-ink'
            }`}
            onClick={() => setKind('GROUP')}
          >
            {t('personal.challengesKindGroup')}
          </button>
        </div>

        <label className="block space-y-1 text-sm">
          <span className="text-ink-muted">{t('personal.challengesTitleField')}</span>
          <input
            className={fieldClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('personal.challengesTitlePlaceholder')}
            disabled={!canWrite}
            required
            minLength={2}
          />
        </label>

        {kind === 'FIGHT' ? (
          <label className="block space-y-1 text-sm">
            <span className="text-ink-muted">{t('personal.challengesOpponent')}</span>
            <select
              className={fieldClass}
              value={opponentId}
              onChange={(e) => setOpponentId(e.target.value)}
              disabled={!canWrite || friendOptions.length === 0}
            >
              <option value="">{t('personal.challengesPickFriend')}</option>
              {friendOptions.map((row: GrowthFriendshipDto) => (
                <option key={row.friend.identityId} value={row.friend.identityId}>
                  {row.friend.fullName}
                  {row.friend.handle ? ` (@${row.friend.handle})` : ''}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <fieldset className="space-y-2">
            <legend className="text-sm text-ink-muted">{t('personal.challengesInvitees')}</legend>
            {friendOptions.length === 0 ? (
              <p className="text-sm text-ink-muted">{t('personal.challengesNeedFriends')}</p>
            ) : (
              <ul className="max-h-40 space-y-1 overflow-y-auto">
                {friendOptions.map((row: GrowthFriendshipDto) => {
                  const id = row.friend.identityId;
                  const checked = inviteeIds.includes(id);
                  return (
                    <li key={id}>
                      <label className="flex items-center gap-2 text-sm text-ink">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!canWrite || (!checked && inviteeIds.length >= 9)}
                          onChange={() => toggleInvitee(id)}
                        />
                        <span>
                          {row.friend.fullName}
                          {row.friend.handle ? ` (@${row.friend.handle})` : ''}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </fieldset>
        )}

        <div className="grid grid-cols-2 gap-2">
          <label className="block space-y-1 text-sm">
            <span className="text-ink-muted">{t('personal.challengesMetric')}</span>
            <select
              className={fieldClass}
              value={metric}
              onChange={(e) => setMetric(e.target.value as (typeof METRICS)[number])}
              disabled={!canWrite}
            >
              {METRICS.map((m) => (
                <option key={m} value={m}>
                  {t(`personal.challengeMetric.${m}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-ink-muted">{t('personal.challengesDays')}</span>
            <input
              className={fieldClass}
              type="number"
              min={1}
              max={30}
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value) || 7)}
              disabled={!canWrite}
            />
          </label>
        </div>

        {kind === 'GROUP' ? (
          <label className="block space-y-1 text-sm">
            <span className="text-ink-muted">{t('personal.challengesTarget')}</span>
            <input
              className={fieldClass}
              type="number"
              min={1}
              value={targetValue}
              onChange={(e) => setTargetValue(Number(e.target.value) || 1)}
              disabled={!canWrite}
            />
          </label>
        ) : null}

        {metric === GrowthChallengeMetric.TASKS_COMPLETED ? (
          <fieldset className="space-y-2">
            <legend className="text-sm text-ink-muted">{t('personal.challengesPickTasks')}</legend>
            <ul className="max-h-40 space-y-1 overflow-y-auto">
              {(todos.data?.items ?? []).map((todo) => (
                <li key={todo.id}>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={todoIds.includes(todo.id)}
                      onChange={() =>
                        setTodoIds((prev) =>
                          prev.includes(todo.id) ? prev.filter((id) => id !== todo.id) : [...prev, todo.id],
                        )
                      }
                    />
                    {todo.title}
                  </label>
                </li>
              ))}
            </ul>
            <input
              className={fieldClass}
              value={newTodo}
              placeholder={t('personal.challengesAddTask')}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                const title = newTodo.trim();
                if (!title) return;
                void createTodo.mutateAsync({ title }).then((created) => {
                  setTodoIds((prev) => [...prev, created.todo.id]);
                  setNewTodo('');
                });
              }}
            />
          </fieldset>
        ) : null}

        {metric === GrowthChallengeMetric.LEARNING_MINUTES ? (
          <label className="block space-y-1 text-sm">
            <span className="text-ink-muted">{t('personal.challengesDailyMinutes')}</span>
            <input
              className={fieldClass}
              type="number"
              min={5}
              max={240}
              value={dailyTargetMinutes}
              onChange={(e) => setDailyTargetMinutes(Number(e.target.value) || 30)}
            />
          </label>
        ) : null}

        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {friendOptions.length === 0 ? (
          <p className="text-sm text-ink-muted">
            {t('personal.challengesNeedFriends')}{' '}
            <Link to={ROUTES.personalGrowthFriends} className="text-brand-700 hover:underline">
              {t('personal.friendsTitle')}
            </Link>
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!canWrite || create.isPending || title.trim().length < 2}
          className="inline-flex w-full items-center justify-center gap-1 rounded-input bg-brand-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          <Swords className="size-4" aria-hidden="true" />
          {t('personal.challengesCreate')}
        </button>
      </form>

      <ChallengeSection
        title={t('personal.challengesIncoming')}
        items={list.data.incoming}
        canWrite={canWrite}
        mode="incoming"
      />
      <ChallengeSection
        title={t('personal.challengesActive')}
        items={list.data.active}
        canWrite={canWrite}
        mode="active"
      />
      <ChallengeSection
        title={t('personal.challengesOutgoing')}
        items={list.data.outgoing}
        canWrite={canWrite}
        mode="outgoing"
      />
      <ChallengeSection
        title={t('personal.challengesCompleted')}
        items={list.data.completed}
        canWrite={canWrite}
        mode="done"
      />
    </div>
  );
}

function ChallengeSection({
  title,
  items,
  canWrite,
  mode,
}: {
  title: string;
  items: GrowthChallengeDto[];
  canWrite: boolean;
  mode: 'incoming' | 'active' | 'outgoing' | 'done';
}) {
  const { t } = useTranslation();
  if (items.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <ul className="space-y-2">
        {items.map((row) => (
          <li key={row.id}>
            <ChallengeCard row={row} canWrite={canWrite} mode={mode} />
          </li>
        ))}
      </ul>
      {mode === 'active' && items.length === 0 ? (
        <p className="text-sm text-ink-muted">{t('personal.challengesEmpty')}</p>
      ) : null}
    </section>
  );
}

function ChallengeCard({
  row,
  canWrite,
  mode,
}: {
  row: GrowthChallengeDto;
  canWrite: boolean;
  mode: 'incoming' | 'active' | 'outgoing' | 'done';
}) {
  const { t } = useTranslation();
  const accept = useAcceptChallenge();
  const decline = useDeclineChallenge();
  const cancel = useCancelChallenge();
  const others = row.participants.filter((p) => !p.isMe);

  return (
    <div className="rounded-2xl border border-line bg-surface p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{row.title}</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {t(`personal.challengeKind.${row.kind}`)} ·{' '}
            {t(`personal.challengeMetric.${row.metric}`)} · {row.durationDays}
            {t('personal.challengesDaysShort')}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {others.map((p) => p.fullName).join(', ') || '—'}
          </p>
          {mode === 'active' &&
          row.metric === GrowthChallengeMetric.LEARNING_MINUTES &&
          row.dailyTargetMinutes ? (
            <p className="mt-1 text-xs font-medium text-brand-800">
              {t('personal.challengesTodayProgress', {
                today: row.todayScore ?? 0,
                target: row.dailyTargetMinutes,
              })}
            </p>
          ) : null}
        </div>
        <span className="shrink-0 rounded-full bg-canvas px-2 py-0.5 text-xs text-ink-muted">
          {t(`personal.challengeStatus.${row.status}`)}
        </span>
      </div>

      {(mode === 'active' || mode === 'done') && (
        <ul className="mt-2 space-y-1">
          {row.participants
            .filter((p) => p.status === 'ACCEPTED')
            .map((p) => (
              <li
                key={p.identityId}
                className="flex items-center justify-between text-sm text-ink"
              >
                <span className={p.isMe ? 'font-medium' : ''}>
                  {p.fullName}
                  {row.winnerId === p.identityId ? ` · ${t('personal.challengesWinner')}` : ''}
                </span>
                <span className="tabular-nums text-ink-muted">{p.score}</span>
              </li>
            ))}
        </ul>
      )}

      {mode === 'incoming' && canWrite ? (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            disabled={accept.isPending}
            onClick={() => void accept.mutateAsync(row.id)}
          >
            {t('personal.friendsAccept')}
          </button>
          <button
            type="button"
            className="flex-1 rounded-input border border-line px-3 py-2 text-sm disabled:opacity-60"
            disabled={decline.isPending}
            onClick={() => void decline.mutateAsync(row.id)}
          >
            {t('personal.friendsDecline')}
          </button>
        </div>
      ) : null}

      {(mode === 'outgoing' || mode === 'active') && row.iAmCreator && canWrite ? (
        <button
          type="button"
          className="mt-3 w-full rounded-input border border-line px-3 py-2 text-sm disabled:opacity-60"
          disabled={cancel.isPending}
          onClick={() => void cancel.mutateAsync(row.id)}
        >
          {t('personal.friendsCancel')}
        </button>
      ) : null}
    </div>
  );
}
