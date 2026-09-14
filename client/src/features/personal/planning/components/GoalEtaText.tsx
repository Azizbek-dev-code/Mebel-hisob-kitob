import { GoalEtaKind, formatMoney, type PersonalSavingGoalDto } from '@furniture-erp/shared';
import { useTranslation } from 'react-i18next';

import { formatDate } from '@/utils/format';

export function GoalEtaText({ goal }: { goal: PersonalSavingGoalDto }) {
  const { t } = useTranslation();

  if (goal.etaKind === GoalEtaKind.MET) {
    return <p className="text-xs text-ink-muted">{t('personal.goalMet')}</p>;
  }

  if (goal.etaKind === GoalEtaKind.MONTHLY && goal.estimatedReachAt && goal.monthlyContributionSom) {
    return (
      <p className="text-xs text-ink-muted">
        {t('personal.goalEtaMonthly', {
          amount: formatMoney(goal.monthlyContributionSom),
          date: formatDate(goal.estimatedReachAt),
        })}
        {goal.onTrack === false ? ` ${t('personal.goalBehind')}` : null}
      </p>
    );
  }

  if (goal.etaKind === GoalEtaKind.TARGET_DATE && goal.requiredMonthlySom != null) {
    if (!goal.estimatedReachAt) {
      return (
        <p className="text-xs text-danger-700">
          {t('personal.goalEtaOverdue', { amount: formatMoney(goal.remainingSom) })}
        </p>
      );
    }
    return (
      <p className="text-xs text-ink-muted">
        {t('personal.goalEtaTargetDate', {
          amount: formatMoney(goal.requiredMonthlySom),
          date: formatDate(goal.targetDate ?? goal.estimatedReachAt),
        })}
      </p>
    );
  }

  if (goal.etaKind === GoalEtaKind.HISTORY && goal.estimatedReachAt) {
    return (
      <p className="text-xs text-ink-muted">
        {t('personal.goalEtaHistory', { date: formatDate(goal.estimatedReachAt) })}
      </p>
    );
  }

  return <p className="text-xs text-ink-muted">{t('personal.goalEtaUnknown')}</p>;
}
