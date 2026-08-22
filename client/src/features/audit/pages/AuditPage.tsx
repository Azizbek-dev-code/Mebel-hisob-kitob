import {
  AUDIT_ENTITY_TYPES,
  AUDIT_EVENT_TYPES,
  type AuditLogItem,
} from '@furniture-erp/shared';
import { ClipboardList, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiClientError } from '@/lib/api-client';

import { useAuditList } from '../hooks/use-audit';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

const PAGE_SIZE = 25;

function listErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden) return 'Faqat administrator audit jurnalini ko‘ra oladi.';
    if (error.isUnauthorized) return 'Please sign in again.';
    return error.message || 'Try again.';
  }
  return 'Try again.';
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

function AuditRow({ item }: { item: AuditLogItem }) {
  return (
    <tr className="border-b border-line/70 last:border-0">
      <td className="whitespace-nowrap px-2 py-2.5 align-top text-xs text-ink-muted tabular-nums">
        {formatWhen(item.createdAt)}
      </td>
      <td className="px-2 py-2.5 align-top text-sm text-ink">{item.actor?.fullName ?? '—'}</td>
      <td className="px-2 py-2.5 align-top">
        <span className="font-mono text-xs text-ink">{item.eventType}</span>
      </td>
      <td className="px-2 py-2.5 align-top text-sm text-ink-muted">{item.entityType}</td>
      <td className="px-2 py-2.5 align-top text-sm text-ink">{item.summary}</td>
    </tr>
  );
}

export function AuditPage() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [eventType, setEventType] = useState('');
  const [entityType, setEntityType] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const query = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      from: fromDate || undefined,
      to: toDate || undefined,
      eventType: eventType || undefined,
      entityType: entityType || undefined,
      search: search.trim() || undefined,
    }),
    [page, fromDate, toDate, eventType, entityType, search],
  );

  const list = useAuditList(query);

  const items = list.data?.items ?? [];
  const meta = list.data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  return (
    <PageContainer className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-ink">Audit</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Do&apos;kon bo&apos;yicha kim nima o&apos;zgartirganini ko&apos;ring. Yozuvlar faqat
          qo&apos;shiladi — tahrirlash yoki o&apos;chirish yo&apos;q.
        </p>
      </div>

      <SectionCard title="Filtrlar">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block space-y-1 text-sm">
            <span className="text-ink-muted">Dan</span>
            <input
              type="date"
              value={fromDate}
              onChange={(event) => {
                setFromDate(event.target.value);
                setPage(1);
              }}
              className={fieldClass}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-ink-muted">Gacha</span>
            <input
              type="date"
              value={toDate}
              onChange={(event) => {
                setToDate(event.target.value);
                setPage(1);
              }}
              className={fieldClass}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-ink-muted">Hodisa</span>
            <select
              value={eventType}
              onChange={(event) => {
                setEventType(event.target.value);
                setPage(1);
              }}
              className={fieldClass}
            >
              <option value="">Hammasi</option>
              {AUDIT_EVENT_TYPES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-ink-muted">Ob&apos;ekt</span>
            <select
              value={entityType}
              onChange={(event) => {
                setEntityType(event.target.value);
                setPage(1);
              }}
              className={fieldClass}
            >
              <option value="">Hammasi</option>
              {AUDIT_ENTITY_TYPES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm sm:col-span-2 lg:col-span-1">
            <span className="text-ink-muted">Qidiruv</span>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Xulosa bo‘yicha…"
                className={`${fieldClass} pl-9`}
              />
            </div>
          </label>
        </div>
      </SectionCard>

      <SectionCard title="Jurnal">
        {list.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : list.isError ? (
          <ErrorState title="Audit yuklanmadi" message={listErrorMessage(list.error)} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Yozuvlar yo‘q"
            description="Tanlangan filtrlar bo‘yicha audit yozuvi topilmadi."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th className="px-2 py-2 font-medium">Vaqt</th>
                    <th className="px-2 py-2 font-medium">Foydalanuvchi</th>
                    <th className="px-2 py-2 font-medium">Hodisa</th>
                    <th className="px-2 py-2 font-medium">Ob&apos;ekt</th>
                    <th className="px-2 py-2 font-medium">Xulosa</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <AuditRow key={item.id} item={item} />
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 ? (
              <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                <p className="text-ink-muted">
                  Sahifa {page} / {totalPages}
                  {meta?.totalItems != null ? ` · ${meta.totalItems} yozuv` : null}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="rounded-input border border-line px-3 py-1.5 disabled:opacity-40"
                  >
                    Oldingi
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((current) => current + 1)}
                    className="rounded-input border border-line px-3 py-1.5 disabled:opacity-40"
                  >
                    Keyingi
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </SectionCard>
    </PageContainer>
  );
}
