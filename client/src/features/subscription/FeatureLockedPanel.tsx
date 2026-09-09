import { Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

import { PageContainer } from '@/components/layout/PageContainer';
import { ROUTES } from '@/routes/paths';

export function FeatureLockedPanel() {
  return (
    <PageContainer className="space-y-4">
      <div className="rounded-panel border border-line bg-surface p-6 shadow-card">
        <Lock className="size-6 text-ink-muted" aria-hidden="true" />
        <h2 className="mt-3 text-lg font-semibold text-ink">Bu funksiya tarifingizda yo‘q</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Joriy tarif bu bo‘limni ochmaydi. Davom etish uchun tarifni o‘zgartirish so‘rovini yuboring.
        </p>
        <Link
          to={ROUTES.billing}
          className="mt-4 inline-flex rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Tariflarni ko‘rish
        </Link>
      </div>
    </PageContainer>
  );
}
