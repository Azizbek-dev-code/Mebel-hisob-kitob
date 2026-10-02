import { FeatureKey } from '@furniture-erp/shared';
import { Clapperboard, FolderKanban, ListTodo, Plus, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { SectionCard } from '@/components/ui/SectionCard';
import { WriteGuard } from '@/features/subscription/WriteGuard';
import { ROUTES } from '@/routes/paths';

export interface QuickActionsBarProps {
  onNewProject: () => void;
}

export function QuickActionsBar({ onNewProject }: QuickActionsBarProps) {
  const { t } = useTranslation();

  const actions = [
    {
      key: 'project',
      label: t('smm.quickNewProject'),
      description: t('smm.quickNewProjectHint'),
      icon: FolderKanban,
      feature: FeatureKey.SMM_PROJECTS,
      onClick: onNewProject,
    },
    {
      key: 'content',
      label: t('smm.quickNewContent'),
      description: t('smm.quickNewContentHint'),
      icon: Clapperboard,
      feature: FeatureKey.SMM_PROJECTS,
      to: ROUTES.smmProjects,
    },
    {
      key: 'task',
      label: t('smm.quickNewTask'),
      description: t('smm.quickNewTaskHint'),
      icon: ListTodo,
      feature: FeatureKey.SMM_PROJECTS,
      to: ROUTES.smmProjects,
    },
    {
      key: 'expense',
      label: t('smm.quickNewExpense'),
      description: t('smm.quickNewExpenseHint'),
      icon: Wallet,
      feature: FeatureKey.EXPENSES,
      to: ROUTES.smmExpenses,
    },
  ] as const;

  return (
    <SectionCard title={t('smm.quickActionsTitle')} description={t('smm.quickActionsHint')}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;
          const className =
            'group flex flex-col items-start gap-2 rounded-card border border-line bg-surface-muted px-3 py-3 transition-colors hover:border-brand-200 hover:bg-brand-50';

          if ('onClick' in action && action.onClick) {
            return (
              <WriteGuard
                key={action.key}
                feature={action.feature}
                onClick={action.onClick}
                className={className}
              >
                <ActionBody Icon={Icon} label={action.label} description={action.description} />
              </WriteGuard>
            );
          }

          return (
            <WriteGuard
              key={action.key}
              feature={action.feature}
              to={'to' in action ? action.to : undefined}
              className={className}
            >
              <ActionBody Icon={Icon} label={action.label} description={action.description} />
            </WriteGuard>
          );
        })}
      </div>
    </SectionCard>
  );
}

function ActionBody({
  Icon,
  label,
  description,
}: {
  Icon: typeof Plus;
  label: string;
  description: string;
}) {
  return (
    <>
      <span className="flex size-8 items-center justify-center rounded-input bg-surface text-ink-soft shadow-card transition-colors group-hover:text-brand-600">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span className="mt-0.5 block text-xs text-ink-muted">{description}</span>
      </span>
    </>
  );
}
