import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

import { PageContainer } from '@/components/layout/PageContainer';
import { ROUTES } from '@/routes/paths';

export function ForbiddenPage() {
  return (
    <PageContainer>
      <div role="alert" className="mx-auto max-w-md rounded-panel border border-line bg-surface p-6 text-center shadow-card">
        <div className="mx-auto flex size-12 items-center justify-center rounded-card bg-danger-50 text-danger-600">
          <ShieldAlert className="size-6" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-ink">403 — Ruxsat yo‘q</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Bu bo‘lim faqat Platform Admin uchun. Sizning do‘koningizdagi huquqlar o‘zgarmaydi.
        </p>
        <Link
          to={ROUTES.dashboard}
          className="mt-5 inline-flex items-center justify-center rounded-input bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Dashboardga qaytish
        </Link>
      </div>
    </PageContainer>
  );
}
