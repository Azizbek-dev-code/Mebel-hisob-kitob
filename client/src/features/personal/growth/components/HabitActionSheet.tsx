import type { GrowthHabitDto } from '@furniture-erp/shared';
import { useTranslation } from 'react-i18next';

import { Dialog } from '@/components/ui/Dialog';

export type HabitMenuAction =
  | 'complete'
  | 'uncomplete'
  | 'skip'
  | 'fail'
  | 'log'
  | 'timer'
  | 'note'
  | 'notes'
  | 'edit';

export function HabitActionSheet({
  habit,
  open,
  canWrite,
  onClose,
  onAction,
}: {
  habit: GrowthHabitDto;
  open: boolean;
  canWrite: boolean;
  onClose: () => void;
  onAction: (action: HabitMenuAction) => void;
}) {
  const { t } = useTranslation();
  if (!open) return null;

  const done = habit.todayStatus === 'COMPLETED' || habit.todayStatus === 'SKIPPED';
  const items: Array<{ id: HabitMenuAction; label: string; danger?: boolean; hidden?: boolean }> = [
    {
      id: done ? 'uncomplete' : 'complete',
      label: done ? t('personal.habitUncomplete') : t('personal.habitCheckIn'),
      hidden: !canWrite,
    },
    { id: 'skip', label: t('personal.habitSkip'), hidden: !canWrite || done },
    { id: 'fail', label: t('personal.habitMarkFailed'), hidden: !canWrite || done, danger: true },
    { id: 'log', label: t('personal.habitLogAdd'), hidden: !canWrite },
    { id: 'timer', label: t('personal.habitStartTimer') },
    { id: 'note', label: t('personal.habitAddNote'), hidden: !canWrite },
    { id: 'notes', label: t('personal.habitViewNotes') },
    { id: 'edit', label: t('common.edit'), hidden: !canWrite },
  ];

  return (
    <Dialog open title={habit.title} onClose={onClose} className="sm:max-w-sm">
      <ul className="divide-y divide-line px-1 py-1">
        {items
          .filter((item) => !item.hidden)
          .map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={
                  item.danger
                    ? 'flex w-full px-4 py-3.5 text-left text-sm font-medium text-danger-700 hover:bg-danger-50'
                    : 'flex w-full px-4 py-3.5 text-left text-sm font-medium text-ink hover:bg-surface-hover'
                }
                onClick={() => {
                  onClose();
                  onAction(item.id);
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
      </ul>
    </Dialog>
  );
}
