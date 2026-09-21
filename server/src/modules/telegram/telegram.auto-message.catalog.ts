import {
  TelegramAutoMessageAccountType,
  type TelegramAutoMessageResultCatalogItem,
} from '@furniture-erp/shared';

/**
 * Authoritative Auto Message result catalog.
 * Only keys backed by real Personal/Business providers belong here.
 */
export const PERSONAL_AUTO_MESSAGE_RESULTS: TelegramAutoMessageResultCatalogItem[] = [
  {
    key: 'balance',
    label: 'Balance',
    description: 'Barcha shaxsiy hamyonlar jami balansi',
    accountType: TelegramAutoMessageAccountType.PERSONAL,
    dataType: 'money',
  },
  {
    key: 'income',
    label: 'Income',
    description: 'Davr bo‘yicha daromad',
    accountType: TelegramAutoMessageAccountType.PERSONAL,
    dataType: 'money',
  },
  {
    key: 'expense',
    label: 'Expense',
    description: 'Davr bo‘yicha xarajat',
    accountType: TelegramAutoMessageAccountType.PERSONAL,
    dataType: 'money',
  },
  {
    key: 'remaining',
    label: 'Remaining Money',
    description: 'Daromad − xarajat (sof qoldiq)',
    accountType: TelegramAutoMessageAccountType.PERSONAL,
    dataType: 'money',
  },
  {
    key: 'budget',
    label: 'Budget',
    description: 'Faol budjetlar limiti',
    accountType: TelegramAutoMessageAccountType.PERSONAL,
    dataType: 'money',
  },
  {
    key: 'budget_usage',
    label: 'Budget Usage',
    description: 'Budjetdan sarflangan foiz',
    accountType: TelegramAutoMessageAccountType.PERSONAL,
    dataType: 'percent',
  },
  {
    key: 'goals',
    label: 'Goals',
    description: 'Jamg‘arma maqsadlari soni',
    accountType: TelegramAutoMessageAccountType.PERSONAL,
    dataType: 'count',
  },
  {
    key: 'goal_progress',
    label: 'Goal Progress',
    description: 'Maqsadlar bo‘yicha o‘rtacha progress',
    accountType: TelegramAutoMessageAccountType.PERSONAL,
    dataType: 'percent',
  },
  {
    key: 'tasks',
    label: 'Tasks',
    description: 'Bugungi vazifalar',
    accountType: TelegramAutoMessageAccountType.PERSONAL,
    dataType: 'count',
  },
  {
    key: 'completed_tasks',
    label: 'Completed Tasks',
    description: 'Bajarilgan vazifalar',
    accountType: TelegramAutoMessageAccountType.PERSONAL,
    dataType: 'count',
  },
  {
    key: 'habits',
    label: 'Habits',
    description: 'Faol odatlar',
    accountType: TelegramAutoMessageAccountType.PERSONAL,
    dataType: 'count',
  },
  {
    key: 'habit_completion',
    label: 'Habit Completion',
    description: 'Bugun bajarilgan odatlar',
    accountType: TelegramAutoMessageAccountType.PERSONAL,
    dataType: 'text',
  },
  {
    key: 'focus_time',
    label: 'Focus Time',
    description: 'Bugungi fokus daqiqalari',
    accountType: TelegramAutoMessageAccountType.PERSONAL,
    dataType: 'duration',
  },
];

export const BUSINESS_AUTO_MESSAGE_RESULTS: TelegramAutoMessageResultCatalogItem[] = [
  {
    key: 'sales',
    label: 'Sales',
    description: 'Sotuvlar soni',
    accountType: TelegramAutoMessageAccountType.BUSINESS,
    dataType: 'count',
  },
  {
    key: 'revenue',
    label: 'Revenue',
    description: 'Tushum',
    accountType: TelegramAutoMessageAccountType.BUSINESS,
    dataType: 'money',
  },
  {
    key: 'expenses',
    label: 'Expenses',
    description: 'Xarajatlar',
    accountType: TelegramAutoMessageAccountType.BUSINESS,
    dataType: 'money',
  },
  {
    key: 'profit',
    label: 'Profit',
    description: 'Tushum − xarajat',
    accountType: TelegramAutoMessageAccountType.BUSINESS,
    dataType: 'money',
  },
  {
    key: 'debt',
    label: 'Debt',
    description: 'Mijozlardan qarz qoldig‘i',
    accountType: TelegramAutoMessageAccountType.BUSINESS,
    dataType: 'money',
  },
  {
    key: 'inventory',
    label: 'Inventory',
    description: 'Mahsulotlar / unitlar / past zaxira',
    accountType: TelegramAutoMessageAccountType.BUSINESS,
    dataType: 'text',
  },
  {
    key: 'customers',
    label: 'Customers',
    description: 'Yangi mijozlar (davr)',
    accountType: TelegramAutoMessageAccountType.BUSINESS,
    dataType: 'count',
  },
  {
    key: 'products',
    label: 'Products',
    description: 'Faol mahsulotlar soni',
    accountType: TelegramAutoMessageAccountType.BUSINESS,
    dataType: 'count',
  },
  {
    key: 'workers',
    label: 'Workers',
    description: 'Faol xodimlar',
    accountType: TelegramAutoMessageAccountType.BUSINESS,
    dataType: 'count',
  },
];

export function getAutoMessageResultCatalog(
  accountType: TelegramAutoMessageAccountType | string,
): TelegramAutoMessageResultCatalogItem[] {
  return accountType === TelegramAutoMessageAccountType.BUSINESS
    ? BUSINESS_AUTO_MESSAGE_RESULTS
    : PERSONAL_AUTO_MESSAGE_RESULTS;
}

export function isValidAutoMessageResultKey(
  accountType: TelegramAutoMessageAccountType | string,
  key: string,
): boolean {
  return getAutoMessageResultCatalog(accountType).some((item) => item.key === key);
}

export function assertAutoMessageResultKeys(
  accountType: TelegramAutoMessageAccountType | string,
  keys: string[],
): { ok: true } | { ok: false; invalid: string[] } {
  const invalid = keys.filter((key) => !isValidAutoMessageResultKey(accountType, key));
  return invalid.length ? { ok: false, invalid } : { ok: true };
}
