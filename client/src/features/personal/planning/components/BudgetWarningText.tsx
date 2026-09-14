import { BudgetWarningLevel, formatMoney, type PersonalBudgetDto } from '@furniture-erp/shared';
import { useTranslation } from 'react-i18next';

export function BudgetWarningText({ budget }: { budget: PersonalBudgetDto }) {
  const { t } = useTranslation();
  if (budget.warningLevel === BudgetWarningLevel.NONE) return null;

  const message =
    budget.warningLevel === BudgetWarningLevel.NEAR
      ? t('personal.budgetWarnNear', { percent: budget.percent })
      : budget.warningLevel === BudgetWarningLevel.LIMIT
        ? t('personal.budgetWarnLimit')
        : t('personal.budgetWarnOver', { amount: formatMoney(budget.overspentSom) });

  const tone =
    budget.warningLevel === BudgetWarningLevel.NEAR ? 'text-warning-700' : 'text-danger-700';

  return (
    <p role="status" className={`text-xs ${tone}`}>
      {message}
    </p>
  );
}
