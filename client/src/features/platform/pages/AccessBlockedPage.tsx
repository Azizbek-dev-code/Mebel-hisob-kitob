import { formatMoney } from '@furniture-erp/shared';

import { PageContainer } from '@/components/layout/PageContainer';
import { useLogout } from '@/features/auth/hooks/use-auth';
import { useStoreAccess } from '@/features/platform/hooks/use-platform-billing';
import { formatDate } from '@/utils/format';

export function AccessBlockedPage() {
  const access = useStoreAccess();
  const logout = useLogout();
  const data = access.data?.access;

  return (
    <PageContainer className="flex min-h-[70vh] items-center justify-center overflow-x-hidden">
      <section className="w-full max-w-lg rounded-panel border border-line bg-surface p-6 shadow-card">
        <h1 className="text-lg font-semibold text-ink">Do&apos;koningiz vaqtinchalik bloklangan</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Platformadan foydalanishni davom ettirish uchun oylik to&apos;lovni amalga oshiring.
        </p>
        <dl className="mt-4 space-y-2 text-sm">
          <Row label="Do'kon" value={data?.storeName ?? '—'} />
          <Row label="Tarif" value={data?.planName ?? '—'} />
          <Row label="Qarzdorlik" value={formatMoney(data?.outstandingAmount ?? 0)} />
          <Row label="Muddat" value={data?.dueDate ? formatDate(data.dueDate) : '—'} />
          <Row label="Kechikish" value={`${data?.daysOverdue ?? 0} kun`} />
        </dl>
        <p className="mt-4 text-sm text-ink">
          Onlayn to&apos;lov hali mavjud emas. Platforma administratori bilan bog&apos;laning.
        </p>
        <button
          type="button"
          className="mt-4 w-full rounded-input border border-line px-3 py-2 text-sm font-medium hover:bg-surface-hover"
        >
          To&apos;lov haqida ma&apos;lumot
        </button>
        <p className="mt-3 text-center text-xs text-ink-subtle">
          <button type="button" className="hover:underline" onClick={() => void logout.mutateAsync()}>
            Chiqish
          </button>
        </p>
      </section>
    </PageContainer>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}
