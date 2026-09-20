/**
 * Shared Telegram CTA routes. Absolute URLs are built with PUBLIC_APP_URL.
 * Never put secrets, JWTs, or query tokens on these links.
 */
export const TELEGRAM_APP_PATHS = {
  home: '/',
  login: '/login',
  dashboard: '/dashboard',
  sales: '/sales',
  saleDetail: (id: string) => `/sales/${id}`,
  purchases: '/purchases',
  purchaseDetail: (id: string) => `/purchases/${id}`,
  expenses: '/expenses',
  debts: '/debts',
  delivery: '/delivery',
  inventory: '/inventory',
  assemblyTasks: '/assembly-tasks',
  workers: '/workers',
  billing: '/billing',
  reports: '/reports',
  personalDashboard: '/personal/dashboard',
  personalHistory: '/personal/history',
  personalIncome: '/personal/income',
  personalExpenses: '/personal/expenses',
  personalBudgets: '/personal/budgets',
  personalGoals: '/personal/goals',
  personalDebts: '/personal/debts',
  personalAnalytics: '/personal/analytics',
  personalHabits: '/personal/growth/habits',
  personalHabitDetail: (id: string) => `/personal/growth/habits/${id}`,
} as const;

export const TELEGRAM_CTA_LABEL = {
  DETAIL: '📱 Batafsil ko‘rish',
  SUMMARY: '📊 Natijalarni ko‘rish',
  SYSTEM: '🚀 Dasturga kirish',
} as const;

export const DEFAULT_TELEGRAM_TIMEZONE = 'Asia/Tashkent';
