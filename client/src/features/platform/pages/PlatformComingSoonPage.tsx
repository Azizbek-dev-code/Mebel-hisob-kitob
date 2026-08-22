import type { LucideIcon } from 'lucide-react';

import { ModulePlaceholder } from '@/components/feedback/ModulePlaceholder';
import { PageContainer } from '@/components/layout/PageContainer';

export interface PlatformComingSoonPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

export function PlatformComingSoonPage({ title, description, icon }: PlatformComingSoonPageProps) {
  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
        <p className="mt-1 text-sm text-ink-muted">{description}</p>
      </div>
      <ModulePlaceholder
        icon={icon}
        title={title}
        description={description}
        phase="keyingi bosqich"
      />
    </PageContainer>
  );
}
