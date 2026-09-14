import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import { SegmentedNav } from '@/components/ui/SegmentedNav';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { hubForPath } from '@/features/platform/hubs';
import { canReviewStoreCreationRequests } from '@/routes/navigation';

export function PlatformHubChrome() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { data: user } = useCurrentUser();
  if (!canReviewStoreCreationRequests(user)) return null;
  const hub = hubForPath(pathname);
  if (!hub) return null;

  return (
    <div className="border-b border-line bg-surface">
      <div className="mx-auto w-full max-w-7xl px-4 py-3 sm:px-6">
        <SegmentedNav
          ariaLabel={t(hub.ariaLabelKey)}
          items={hub.tabs.map((tab) => ({
            to: tab.to,
            label: t(tab.labelKey),
            end: tab.end,
            matchPrefix: tab.matchPrefix,
          }))}
        />
      </div>
    </div>
  );
}
