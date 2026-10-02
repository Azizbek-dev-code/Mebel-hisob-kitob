import type { SmmDashboardAttentionItem } from '@furniture-erp/shared';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileWarning,
  ShieldAlert,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

export interface AttentionPanelProps {
  items?: SmmDashboardAttentionItem[];
  isLoading: boolean;
}

const KIND_ICON: Record<SmmDashboardAttentionItem['kind'], LucideIcon> = {
  OVERDUE_TASKS: AlertTriangle,
  CLIENT_APPROVAL: FileWarning,
  DEADLINE: Clock,
  BUDGET: Wallet,
  INTERNAL_REVIEW: ShieldAlert,
};

const SEVERITY_TONE: Record<
  SmmDashboardAttentionItem['severity'],
  { icon: string; bg: string; border: string }
> = {
  critical: {
    icon: 'text-danger-600',
    bg: 'bg-danger-50',
    border: 'border-danger-100',
  },
  warning: {
    icon: 'text-warning-600',
    bg: 'bg-warning-50',
    border: 'border-warning-100',
  },
  info: {
    icon: 'text-info-600',
    bg: 'bg-info-50',
    border: 'border-info-100',
  },
};

export function AttentionPanel({ items, isLoading }: AttentionPanelProps) {
  const { t } = useTranslation();

  return (
    <SectionCard
      title={t('smm.attentionTitle')}
      description={t('smm.attentionHint')}
      padded={false}
    >
      {isLoading && !items ? (
        <div className="space-y-3 p-4 sm:p-5" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !items || items.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title={t('smm.attentionEmptyTitle')}
          description={t('smm.attentionEmptyHint')}
        />
      ) : (
        <ul className="divide-y divide-line">
          {items.map((item) => {
            const Icon = KIND_ICON[item.kind] ?? AlertTriangle;
            const tone = SEVERITY_TONE[item.severity];
            const body = (
              <span className="flex items-start gap-3 px-4 py-3 sm:px-5">
                <span
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-input border',
                    tone.bg,
                    tone.border,
                    tone.icon,
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink">{item.label}</span>
                  <span className="mt-0.5 block text-xs text-ink-muted">
                    {t('smm.attentionCount', { count: item.count })}
                  </span>
                </span>
              </span>
            );

            return (
              <li key={`${item.kind}-${item.label}`}>
                {item.href ? (
                  <Link to={item.href} className="block transition-colors hover:bg-surface-hover/60">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
