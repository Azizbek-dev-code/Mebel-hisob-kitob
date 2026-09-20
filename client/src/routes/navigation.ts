import {
  UserRole,
  WorkerResponsibility,
  BusinessType,
  WorkspaceType,
  featureForNavKey,
  isPersonalAuth,
  planAllowsFeature,
  type AuthPrincipal,
} from '@furniture-erp/shared';
import {
  BarChart3,
  Boxes,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  Gift,
  HardHat,
  LayoutDashboard,
  LineChart,
  Activity,
  PackagePlus,
  MessageCircle,
  Rocket,
  Settings,
  ShoppingCart,
  Sofa,
  Sprout,
  Truck,
  UserRound,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

import { ROUTES } from './paths';

export interface NavItem {
  /** i18n key under `nav.*` — sidebar label and header section title. */
  labelKey: string;
  to: string;
  icon: LucideIcon;
  /** Stable key used when filtering nav by role / responsibility. */
  key: string;
  /** Nested sidebar links. The header still names the parent module. */
  children?: readonly NavItem[];
  /** Extra paths that belong to this module but are not listed in the sidebar. */
  matchingPaths?: readonly string[];
}

/**
 * Finance pages stay routed and reachable from reports / workers / profile,
 * but they are not primary Business sidebar items.
 */
const BUSINESS_SIDEBAR_EXCLUDED_KEYS = new Set([
  'purchases',
  'suppliers',
  'debts',
  'expenses',
  'my-finances',
]);

/** The modules of the ERP, in the order the sidebar lists them. */
export const NAV_ITEMS: readonly NavItem[] = [
  { key: 'dashboard', labelKey: 'nav.dashboard', to: ROUTES.dashboard, icon: LayoutDashboard },
  { key: 'sales', labelKey: 'nav.sales', to: ROUTES.sales, icon: ShoppingCart },
  { key: 'my-sales', labelKey: 'nav.mySales', to: ROUTES.mySales, icon: ShoppingCart },
  { key: 'my-reports', labelKey: 'nav.myReports', to: ROUTES.myReports, icon: BarChart3 },
  { key: 'products', labelKey: 'nav.products', to: ROUTES.products, icon: Sofa },
  { key: 'inventory', labelKey: 'nav.inventory', to: ROUTES.inventory, icon: Boxes },
  { key: 'delivery', labelKey: 'nav.delivery', to: ROUTES.delivery, icon: Truck },
  { key: 'assembly', labelKey: 'nav.assembly', to: ROUTES.assemblyTasks, icon: Wrench },
  { key: 'customers', labelKey: 'nav.customers', to: ROUTES.customers, icon: Users },
  {
    key: 'workers',
    labelKey: 'nav.workers',
    to: ROUTES.workers,
    icon: HardHat,
    matchingPaths: [ROUTES.masters, ROUTES.workersReconciliation],
  },
  { key: 'reports', labelKey: 'nav.reports', to: ROUTES.reports, icon: BarChart3 },
  {
    key: 'profile',
    labelKey: 'nav.profile',
    to: ROUTES.profile,
    icon: UserRound,
    matchingPaths: [ROUTES.profileFinances, ROUTES.notifications],
  },
  {
    key: 'settings',
    labelKey: 'nav.profile',
    to: ROUTES.settings,
    icon: UserRound,
    matchingPaths: [
      ROUTES.billing,
      ROUTES.storeReferral,
      ROUTES.audit,
      ROUTES.settingsBackup,
      ROUTES.settingsAccount,
      ROUTES.settingsSecurity,
      ROUTES.settingsShop,
      ROUTES.settingsDanger,
      ROUTES.notifications,
    ],
  },
  { key: 'purchases', labelKey: 'nav.purchases', to: ROUTES.purchases, icon: PackagePlus },
  { key: 'suppliers', labelKey: 'nav.suppliers', to: ROUTES.suppliers, icon: Truck },
  { key: 'debts', labelKey: 'nav.debts', to: ROUTES.debts, icon: CircleDollarSign },
  { key: 'expenses', labelKey: 'nav.expenses', to: ROUTES.expenses, icon: Wallet },
  { key: 'my-finances', labelKey: 'nav.myFinances', to: ROUTES.profileFinances, icon: Wallet },
];

/** Platform control-plane modules. Visible only to PLATFORM_ADMIN. */
export const PLATFORM_NAV_ITEMS: readonly NavItem[] = [
  { key: 'platform-dashboard', labelKey: 'nav.dashboard', to: ROUTES.dashboard, icon: LayoutDashboard },
  {
    key: 'platform-accounts',
    labelKey: 'nav.accounts',
    to: ROUTES.platformAccounts,
    icon: Users,
    matchingPaths: [
      ROUTES.platformAccountsPersonal,
      ROUTES.platformAccountsBusiness,
      ROUTES.platformStoreRequests,
      ROUTES.platformShops,
      ROUTES.platformShopsActive,
      ROUTES.platformShopsPendingPayment,
      ROUTES.platformShopsBlocked,
      ROUTES.adminStores,
      ROUTES.platformPersonal,
    ],
  },
  {
    key: 'platform-subscriptions',
    labelKey: 'nav.subscriptions',
    to: ROUTES.platformSubscriptions,
    icon: CreditCard,
    matchingPaths: [
      ROUTES.platformSubscriptionRequests,
      ROUTES.adminSubscriptionRequests,
      ROUTES.platformPayments,
      ROUTES.platformPaymentsPending,
      ROUTES.platformPaymentsOverdue,
      ROUTES.platformPlans,
    ],
  },
  {
    key: 'platform-onboarding',
    labelKey: 'nav.onboarding',
    to: ROUTES.platformOnboarding,
    icon: Rocket,
    matchingPaths: [
      ROUTES.platformOnboardingQuestions,
      ROUTES.platformOnboardingAnswers,
      ROUTES.platformOnboardingNeeds,
      ROUTES.platformOnboardingSolutions,
    ],
  },
  {
    key: 'platform-finance',
    labelKey: 'nav.finance',
    to: ROUTES.platformFinance,
    icon: LineChart,
    matchingPaths: [
      ROUTES.platformFinanceIncome,
      ROUTES.platformExpenses,
      ROUTES.platformPnl,
      ROUTES.platformAnalytics,
      ROUTES.platformAnalyticsStores,
      ROUTES.platformAnalyticsRevenue,
      ROUTES.platformAnalyticsExpenses,
      ROUTES.platformAnalyticsProfit,
    ],
  },
  {
    key: 'platform-referral',
    labelKey: 'nav.referral',
    to: ROUTES.platformReferral,
    icon: Gift,
    matchingPaths: [
      ROUTES.platformReferralUsers,
      ROUTES.platformReferralWithdrawals,
      ROUTES.platformReferralSettings,
    ],
  },
  {
    key: 'platform-usage',
    labelKey: 'nav.usageAnalytics',
    to: ROUTES.platformUsage,
    icon: Activity,
    matchingPaths: [
      ROUTES.platformUsageUsers,
      ROUTES.platformUsageFeatures,
      ROUTES.platformUsageRetention,
      ROUTES.platformUsageSessions,
    ],
  },
  {
    key: 'platform-telegram',
    labelKey: 'nav.telegram',
    to: ROUTES.platformTelegram,
    icon: MessageCircle,
    matchingPaths: [
      ROUTES.platformTelegramBot,
      ROUTES.platformTelegramStart,
      ROUTES.platformTelegramMenu,
      ROUTES.platformTelegramBroadcast,
      ROUTES.platformTelegramAutomations,
      ROUTES.platformTelegramStats,
      ROUTES.platformTelegramUsers,
    ],
  },
  {
    key: 'platform-settings',
    labelKey: 'nav.settings',
    to: ROUTES.platformSettings,
    icon: Settings,
    matchingPaths: [ROUTES.platformAccountDeletions],
  },
];

export const PERSONAL_NAV_ITEMS: readonly NavItem[] = [
  {
    key: 'personal-home',
    labelKey: 'personal.home',
    to: ROUTES.personalDashboard,
    icon: LayoutDashboard,
    matchingPaths: [ROUTES.personalRanking, ROUTES.personalGrowthFriends],
  },
  {
    key: 'personal-plan',
    labelKey: 'personal.navPlan',
    to: ROUTES.personalPlan,
    icon: CalendarDays,
  },
  {
    key: 'personal-growth',
    labelKey: 'personal.navGrowth',
    to: ROUTES.personalGrowth,
    icon: Sprout,
    matchingPaths: [
      ROUTES.personalGrowthTodos,
      ROUTES.personalGrowthFocus,
      ROUTES.personalGrowthHabits,
      ROUTES.personalGrowthLearning,
      ROUTES.personalGrowthGoals,
      ROUTES.personalGrowthLevel,
      ROUTES.personalGrowthAchievements,
      ROUTES.personalGrowthChallenges,
      ROUTES.personalGrowthSocial,
      ROUTES.personalGrowthNotifications,
      ROUTES.personalGrowthReviews,
    ],
  },
  {
    key: 'personal-finance',
    labelKey: 'personal.navFinance',
    to: ROUTES.personalFinance,
    icon: Wallet,
    matchingPaths: [
      ROUTES.personalHistory,
      ROUTES.personalIncome,
      ROUTES.personalExpenses,
      ROUTES.personalAccounts,
      ROUTES.personalCategories,
      ROUTES.personalBudgets,
      ROUTES.personalGoals,
      ROUTES.personalAnalytics,
      ROUTES.personalRecurring,
      ROUTES.personalDebts,
    ],
  },
  {
    key: 'personal-profile',
    labelKey: 'personal.navProfile',
    to: ROUTES.personalProfile,
    icon: UserRound,
    matchingPaths: [
      ROUTES.personalSettings,
      ROUTES.personalBilling,
      ROUTES.personalNotifications,
      ROUTES.personalReferral,
      ROUTES.personalProfileEdit,
      ROUTES.personalSecurity,
      ROUTES.personalFeedback,
      ROUTES.personalPrivacy,
      ROUTES.personalGrowthFriends,
    ],
  },
];

export function flattenNavItems(items: readonly NavItem[]): NavItem[] {
  const flattened: NavItem[] = [];
  for (const item of items) {
    flattened.push(item);
    if (item.children?.length) {
      flattened.push(...flattenNavItems(item.children));
    }
  }
  return flattened;
}

function itemMatchesPath(item: NavItem, pathname: string): boolean {
  const paths = [
    ...flattenNavItems([item]).map((entry) => entry.to),
    ...(item.matchingPaths ?? []),
  ];
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function longestMatchLength(item: NavItem, pathname: string): number {
  const paths = [...flattenNavItems([item]).map((entry) => entry.to), ...(item.matchingPaths ?? [])];
  return paths.reduce((longest, entry) => {
    if (pathname === entry || pathname.startsWith(`${entry}/`)) {
      return Math.max(longest, entry.length);
    }
    return longest;
  }, 0);
}

function hasResponsibility(
  user: AuthPrincipal,
  responsibility: WorkerResponsibility,
): boolean {
  if (isPersonalAuth(user)) return false;
  return user.responsibilities.includes(responsibility);
}

function isStoreManager(user: AuthPrincipal): boolean {
  if (isPersonalAuth(user)) return false;
  return user.role === UserRole.ADMIN || user.role === UserRole.PLATFORM_ADMIN;
}

function allowedByPlan(user: AuthPrincipal, item: NavItem): boolean {
  if (isPersonalAuth(user)) return true;
  if (user.role === UserRole.PLATFORM_ADMIN) return true;
  const feature = featureForNavKey(item.key);
  if (!feature) return true;
  if (!user.subscription) return true;
  return planAllowsFeature(user.subscription.featureKeys, feature, user.subscription.featuresRestricted);
}

/**
 * ERP modules for a BUSINESS workspace. Every current vertical shares the
 * furniture catalog; add a case here when a dedicated vertical ships.
 */
export function businessNavItems(_businessType: BusinessType = BusinessType.FURNITURE): readonly NavItem[] {
  return NAV_ITEMS;
}

export function navItemsForAccountType(
  type: WorkspaceType,
  businessType: BusinessType = BusinessType.FURNITURE,
): readonly NavItem[] {
  if (type === WorkspaceType.PERSONAL) return PERSONAL_NAV_ITEMS;
  return businessNavItems(businessType);
}

/**
 * Sidebar modules visible to the signed-in principal.
 *
 * System role gates admin modules; worker responsibilities gate business modules.
 * A worker with multiple responsibilities sees the union of those modules.
 * Plan features then hide modules the current tariff does not include.
 */
export function navItemsForUser(user: AuthPrincipal | null | undefined): NavItem[] {
  if (!user) return [];
  if (isPersonalAuth(user)) return [...navItemsForAccountType(WorkspaceType.PERSONAL)];

  const erpNav = businessNavItems(user.businessType ?? BusinessType.FURNITURE);

  let items: NavItem[];

  if (user.role === UserRole.PLATFORM_ADMIN) {
    items = [...PLATFORM_NAV_ITEMS];
  } else if (isStoreManager(user)) {
    items = erpNav.filter((item) => item.key !== 'my-sales' && item.key !== 'my-reports' && item.key !== 'profile');
  } else if (user.role === UserRole.CASHIER) {
    items = erpNav.filter((item) =>
      [
        'dashboard',
        'sales',
        'my-sales',
        'my-reports',
        'assembly',
        'products',
        'customers',
        'debts',
        'profile',
      ].includes(item.key),
    );
  } else {
    const keys = new Set<string>(['dashboard', 'profile', 'my-finances']);

    if (hasResponsibility(user, WorkerResponsibility.SELLER)) {
      keys.add('sales');
      keys.add('my-sales');
      keys.add('my-reports');
      keys.add('customers');
      keys.add('debts');
    }
    if (hasResponsibility(user, WorkerResponsibility.ASSEMBLER)) {
      keys.add('assembly');
    }
    if (hasResponsibility(user, WorkerResponsibility.DELIVERY)) {
      keys.add('delivery');
      keys.add('sales');
    }
    if (hasResponsibility(user, WorkerResponsibility.INSTALLER)) {
      keys.add('assembly');
    }

    items = erpNav.filter((item) => keys.has(item.key));
  }

  return items.filter(
    (item) => allowedByPlan(user, item) && !BUSINESS_SIDEBAR_EXCLUDED_KEYS.has(item.key),
  );
}

export function canManageWorkers(user: AuthPrincipal | null | undefined): boolean {
  return Boolean(user && isStoreManager(user));
}

/** Same store-admin gate used by sale cancellation (ADMIN / PLATFORM_ADMIN). */
export function canCancelSale(user: AuthPrincipal | null | undefined): boolean {
  return Boolean(user && isStoreManager(user));
}

/** Same store-admin gate used by the expenses API (ADMIN / PLATFORM_ADMIN). */
export function canManageExpenses(user: AuthPrincipal | null | undefined): boolean {
  return Boolean(user && isStoreManager(user));
}

/** Inventory mutations and /inventory module — ADMIN / PLATFORM_ADMIN. */
export function canManageInventory(user: AuthPrincipal | null | undefined): boolean {
  return Boolean(user && isStoreManager(user));
}

/** Supplier purchases / payables — same store-admin gate as inventory. */
export function canManagePurchasing(user: AuthPrincipal | null | undefined): boolean {
  return canManageInventory(user);
}

/** Store profile settings — ADMIN / PLATFORM_ADMIN. */
export function canManageStoreSettings(user: AuthPrincipal | null | undefined): boolean {
  return Boolean(user && isStoreManager(user));
}

/** Store audit trail — same admin gate as store settings. */
export function canReadAuditLog(user: AuthPrincipal | null | undefined): boolean {
  return canManageStoreSettings(user);
}

/** Logical backup / restore — same admin gate as store settings. */
export function canManageBackups(user: AuthPrincipal | null | undefined): boolean {
  return canManageStoreSettings(user);
}

/** Store-creation inbox — PLATFORM_ADMIN only. Store ADMIN is 403. */
export function canReviewStoreCreationRequests(user: AuthPrincipal | null | undefined): boolean {
  return Boolean(user && !isPersonalAuth(user) && user.role === UserRole.PLATFORM_ADMIN);
}

/**
 * The module a path belongs to.
 *
 * Nested pages count as part of their module — `/sales/new` is still "Sotuvlar" —
 * so the header keeps naming the section once the feature phases add detail pages.
 */
export function navItemForPath(
  pathname: string,
  items: readonly NavItem[] = [...NAV_ITEMS, ...PLATFORM_NAV_ITEMS, ...PERSONAL_NAV_ITEMS],
): NavItem | undefined {
  const matches = items.filter((item) => itemMatchesPath(item, pathname));
  if (matches.length === 0) return undefined;
  return [...matches].sort((a, b) => longestMatchLength(b, pathname) - longestMatchLength(a, pathname))[0];
}
