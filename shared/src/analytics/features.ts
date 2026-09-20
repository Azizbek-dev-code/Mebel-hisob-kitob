/** Stable feature keys used in admin adoption stats. Page-view / usage events. */

export const ANALYTICS_FEATURES = {
  DASHBOARD: 'dashboard',
  SALES: 'sales',
  INVENTORY: 'inventory',
  CUSTOMERS: 'customers',
  DELIVERY: 'delivery',
  ASSEMBLY: 'assembly',
  PRODUCTS: 'products',
  REPORTS: 'reports',
  PERSONAL_DASHBOARD: 'personal_dashboard',
  TRANSACTIONS: 'transactions',
  HABITS: 'habits',
  TODO: 'todo',
  FOCUS: 'focus',
  BUDGETS: 'budgets',
  GOALS: 'goals',
} as const;

export type AnalyticsFeature = (typeof ANALYTICS_FEATURES)[keyof typeof ANALYTICS_FEATURES];

const EVENT_TO_FEATURE: Record<string, AnalyticsFeature> = {
  login: ANALYTICS_FEATURES.DASHBOARD,
  dashboard_viewed: ANALYTICS_FEATURES.DASHBOARD,
  business_dashboard_viewed: ANALYTICS_FEATURES.DASHBOARD,
  personal_dashboard_viewed: ANALYTICS_FEATURES.PERSONAL_DASHBOARD,
  sale_created: ANALYTICS_FEATURES.SALES,
  product_created: ANALYTICS_FEATURES.PRODUCTS,
  product_viewed: ANALYTICS_FEATURES.PRODUCTS,
  inventory_viewed: ANALYTICS_FEATURES.INVENTORY,
  customer_viewed: ANALYTICS_FEATURES.CUSTOMERS,
  delivery_viewed: ANALYTICS_FEATURES.DELIVERY,
  assembly_viewed: ANALYTICS_FEATURES.ASSEMBLY,
  report_viewed: ANALYTICS_FEATURES.REPORTS,
  transaction_created: ANALYTICS_FEATURES.TRANSACTIONS,
  transaction_list_viewed: ANALYTICS_FEATURES.TRANSACTIONS,
  habit_completed: ANALYTICS_FEATURES.HABITS,
  todo_completed: ANALYTICS_FEATURES.TODO,
  focus_session_completed: ANALYTICS_FEATURES.FOCUS,
  budget_viewed: ANALYTICS_FEATURES.BUDGETS,
  goal_updated: ANALYTICS_FEATURES.GOALS,
};

export function featureForAnalyticsEvent(eventType: string): AnalyticsFeature | null {
  return EVENT_TO_FEATURE[eventType] ?? null;
}

export function featureFromRoute(route: string): AnalyticsFeature | null {
  if (route.startsWith('/personal/dashboard')) return ANALYTICS_FEATURES.PERSONAL_DASHBOARD;
  if (route.startsWith('/personal/history') || route.startsWith('/personal/income') || route.startsWith('/personal/expenses')) {
    return ANALYTICS_FEATURES.TRANSACTIONS;
  }
  if (route.startsWith('/personal/growth/habits')) return ANALYTICS_FEATURES.HABITS;
  if (route.startsWith('/personal/growth/todos')) return ANALYTICS_FEATURES.TODO;
  if (route.startsWith('/personal/growth/focus')) return ANALYTICS_FEATURES.FOCUS;
  if (route.startsWith('/personal/budgets')) return ANALYTICS_FEATURES.BUDGETS;
  if (route.startsWith('/personal/goals')) return ANALYTICS_FEATURES.GOALS;
  if (route.startsWith('/dashboard')) return ANALYTICS_FEATURES.DASHBOARD;
  if (route.startsWith('/sales')) return ANALYTICS_FEATURES.SALES;
  if (route.startsWith('/inventory')) return ANALYTICS_FEATURES.INVENTORY;
  if (route.startsWith('/customers')) return ANALYTICS_FEATURES.CUSTOMERS;
  if (route.startsWith('/delivery')) return ANALYTICS_FEATURES.DELIVERY;
  if (route.startsWith('/assembly')) return ANALYTICS_FEATURES.ASSEMBLY;
  if (route.startsWith('/products')) return ANALYTICS_FEATURES.PRODUCTS;
  if (route.startsWith('/reports')) return ANALYTICS_FEATURES.REPORTS;
  return null;
}

export const PERSONAL_ADOPTION_FEATURES = [
  ANALYTICS_FEATURES.PERSONAL_DASHBOARD,
  ANALYTICS_FEATURES.TRANSACTIONS,
  ANALYTICS_FEATURES.HABITS,
  ANALYTICS_FEATURES.TODO,
  ANALYTICS_FEATURES.FOCUS,
  ANALYTICS_FEATURES.GOALS,
  ANALYTICS_FEATURES.BUDGETS,
] as const;

export const BUSINESS_ADOPTION_FEATURES = [
  ANALYTICS_FEATURES.DASHBOARD,
  ANALYTICS_FEATURES.SALES,
  ANALYTICS_FEATURES.INVENTORY,
  ANALYTICS_FEATURES.CUSTOMERS,
  ANALYTICS_FEATURES.DELIVERY,
  ANALYTICS_FEATURES.ASSEMBLY,
] as const;
