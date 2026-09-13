import { ACCOUNT_DELETION_REASON_LABELS, type AccountDeletionItem } from '@furniture-erp/shared';
import { Inbox } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { accountService } from '@/services/account.service';
import { formatDateTime } from '@/utils/format';

function reasonLabel(row: AccountDeletionItem): string {
  const label = ACCOUNT_DELETION_REASON_LABELS[row.reasonCode] ?? row.reasonCode;
  if (row.reasonCode === 'OTHER' && row.reasonDetail) {
    return `${label}: ${row.reasonDetail}`;
  }
  return label;
}

export function PlatformAccountDeletionsPage() {
  const query = useQuery({
    queryKey: ['platform', 'account-deletions'],
    queryFn: ({ signal }) => accountService.listDeletions(signal),
  });

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">Akkaunt o‘chirish sabablari</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Foydalanuvchilar o‘z akkauntini o‘chirganda qoldirgan feedback. Login ma’lumotlari
          saqlanmaydi — faqat snapshot va sabab.
        </p>
      </div>

      <SectionCard title="So‘nggi so‘rovlar">
        {query.isPending && !query.data ? (
          <Skeleton className="h-24 w-full" />
        ) : query.isError ? (
          <ErrorState
            title="Ro‘yxat yuklanmadi"
            message="Qayta urinib ko‘ring."
            onRetry={() => void query.refetch()}
          />
        ) : (query.data?.length ?? 0) === 0 ? (
          <EmptyState icon={Inbox} title="Hali sabab yo‘q" description="O‘chirilgan akkauntlar shu yerda ko‘rinadi." />
        ) : (
          <ul className="divide-y divide-line">
            {query.data?.map((row) => (
              <li key={row.id} className="min-w-0 py-3">
                <p className="truncate text-sm font-medium text-ink">{row.fullNameSnapshot}</p>
                <p className="mt-0.5 break-words text-sm text-ink-muted">{reasonLabel(row)}</p>
                <p className="mt-1 text-xs text-ink-subtle">
                  {row.role} · {formatDateTime(row.createdAt)}
                  {row.emailSnapshot ? ` · ${row.emailSnapshot}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </PageContainer>
  );
}
