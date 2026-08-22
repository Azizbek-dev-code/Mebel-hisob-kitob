import {
  UserRole,
  WorkerResponsibility,
  type AuthUser,
} from '@furniture-erp/shared';
import {
  BarChart3,
  Boxes,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  HardHat,
  Inbox,
  LayoutDashboard,
  LineChart,
  PackagePlus,
  Settings,
  ShoppingCart,
  Sofa,
  Store,
  Tags,
  Truck,
  UserRound,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

import { ROUTES } from './paths';

export interface NavItem {
  /** Sidebar label, and the section name the header shows for every page below it. */
  label: string;
  to: string;
  icon: LucideIcon;
  /** Stable key used when filtering nav by role / responsibility. */
  key: string;
  /** Nested sidebar links. The header still names the parent module. */
  children?: readonly NavItem[];
  /** Extra paths that belong to this module but are not listed in the sidebar. */
  matchingPaths?: readonly string[];
}

/** The modules of the ERP, in the order the sidebar lists them. */
export const NAV_ITEMS: readonly NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', to: ROUTES.dashboard, icon: LayoutDashboard },
  { key: 'sales', label: 'Sotuvlar', to: ROUTES.sales, icon: ShoppingCart },
  { key: 'my-sales', label: 'Mening sotuvlarim', to: ROUTES.mySales, icon: ShoppingCart },
  { key: 'assembly', label: 'Terlash', to: ROUTES.assemblyTasks, icon: Wrench },
  { key: 'products', label: 'Mebellar', to: ROUTES.products, icon: Sofa },
  { key: 'inventory', label: 'Ombor', to: ROUTES.inventory, icon: Boxes },
  { key: 'purchases', label: 'Kirimlar', to: ROUTES.purchases, icon: PackagePlus },
  { key: 'suppliers', label: 'Yetkazuvchilar', to: ROUTES.suppliers, icon: Truck },
  { key: 'customers', label: 'Mijozlar', to: ROUTES.customers, icon: Users },
  { key: 'debts', label: 'Qarzlar', to: ROUTES.debts, icon: CircleDollarSign },
  { key: 'expenses', label: 'Xarajatlar', to: ROUTES.expenses, icon: Wallet },
  {
    key: 'workers',
    label: 'Ishchilar',
    to: ROUTES.workers,
    icon: HardHat,
    matchingPaths: [ROUTES.masters],
  },
  { key: 'reports', label: 'Hisobotlar', to: ROUTES.reports, icon: BarChart3 },
  { key: 'audit', label: 'Audit', to: ROUTES.audit, icon: ClipboardList },
  { key: 'profile', label: 'Profil', to: ROUTES.profile, icon: UserRound },
  { key: 'settings', label: 'Sozlamalar', to: ROUTES.settings, icon: Settings },
];

/** Platform control-plane modules. Visible only to PLATFORM_ADMIN. */
export const PLATFORM_NAV_ITEMS: readonly NavItem[] = [
  { key: 'platform-dashboard', label: 'Dashboard', to: ROUTES.dashboard, icon: LayoutDashboard },
  {
    key: 'store-requests',
    label: "Do'kon so'rovlari",
    to: ROUTES.platformStoreRequests,
    icon: Inbox,
  },
  {
    key: 'platform-shops',
    label: "Do'konlar",
    to: ROUTES.platformShops,
    icon: Store,
    matchingPaths: [
      ROUTES.platformShopsActive,
      ROUTES.platformShopsPendingPayment,
      ROUTES.platformShopsBlocked,
    ],
  },
  {
    key: 'platform-payments',
    label: "To'lovlar",
    to: ROUTES.platformPayments,
    icon: CreditCard,
    matchingPaths: [ROUTES.platformPaymentsPending, ROUTES.platformPaymentsOverdue],
  },
  { key: 'platform-plans', label: 'Tariflar', to: ROUTES.platformPlans, icon: Tags },
  {
    key: 'platform-expenses',
    label: 'Platforma xarajatlari',
    to: ROUTES.platformExpenses,
    icon: Wallet,
  },
  { key: 'platform-pnl', label: 'Daromad / P&L', to: ROUTES.platformPnl, icon: LineChart },
  {
    key: 'platform-analytics',
    label: 'Analytics',
    to: ROUTES.platformAnalytics,
    icon: BarChart3,
    matchingPaths: [
      ROUTES.platformAnalyticsStores,
      ROUTES.platformAnalyticsRevenue,
      ROUTES.platformAnalyticsExpenses,
      ROUTES.platformAnalyticsProfit,
    ],
  },
  {
    key: 'platform-settings',
    label: 'Platform Settings',
    to: ROUTES.platformSettings,
    icon: Settings,
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
  user: AuthUser,
  responsibility: WorkerResponsibility,
): boolean {
  return user.responsibilities.includes(responsibility);
}

function isStoreManager(user: AuthUser): boolean {
  return user.role === UserRole.ADMIN || user.role === UserRole.PLATFORM_ADMIN;
}

/**
 * Sidebar modules visible to the signed-in principal.
 *
 * System role gates admin modules; worker responsibilities gate business modules.
 * A worker with multiple responsibilities sees the union of those modules.
 */
export function navItemsForUser(user: AuthUser | null | undefined): NavItem[] {
  if (!user) return [];

  if (user.role === UserRole.PLATFORM_ADMIN) {
    return [...PLATFORM_NAV_ITEMS];
  }

  if (isStoreManager(user)) {
    return NAV_ITEMS.filter((item) => item.key !== 'my-sales' && item.key !== 'profile');
  }

  if (user.role === UserRole.CASHIER) {
    return NAV_ITEMS.filter((item) =>
      [
        'dashboard',
        'sales',
        'my-sales',
        'assembly',
        'products',
        'customers',
        'debts',
        'profile',
      ].includes(item.key),
    );
  }

  // EMPLOYEE (and any future non-admin roles): responsibility-driven.
  const keys = new Set<string>(['dashboard', 'profile']);

  if (hasResponsibility(user, WorkerResponsibility.SELLER)) {
    keys.add('sales');
    keys.add('my-sales');
    keys.add('customers');
    keys.add('debts');
  }
  if (hasResponsibility(user, WorkerResponsibility.ASSEMBLER)) {
    keys.add('assembly');
  }
  if (hasResponsibility(user, WorkerResponsibility.DELIVERY)) {
    // Delivery-specific module arrives later; sales list remains useful context.
    keys.add('sales');
  }
  if (hasResponsibility(user, WorkerResponsibility.INSTALLER)) {
    keys.add('assembly');
  }

  return NAV_ITEMS.filter((item) => keys.has(item.key));
}

export function canManageWorkers(user: AuthUser | null | undefined): boolean {
  return Boolean(user && isStoreManager(user));
}

/** Same store-admin gate used by sale cancellation (ADMIN / PLATFORM_ADMIN). */
export function canCancelSale(user: AuthUser | null | undefined): boolean {
  return Boolean(user && isStoreManager(user));
}

/** Same store-admin gate used by the expenses API (ADMIN / PLATFORM_ADMIN). */
export function canManageExpenses(user: AuthUser | null | undefined): boolean {
  return Boolean(user && isStoreManager(user));
}

/** Inventory mutations and /inventory module — ADMIN / PLATFORM_ADMIN. */
export function canManageInventory(user: AuthUser | null | undefined): boolean {
  return Boolean(user && isStoreManager(user));
}

/** Supplier purchases / payables — same store-admin gate as inventory. */
export function canManagePurchasing(user: AuthUser | null | undefined): boolean {
  return canManageInventory(user);
}

/** Store profile settings — ADMIN / PLATFORM_ADMIN. */
export function canManageStoreSettings(user: AuthUser | null | undefined): boolean {
  return Boolean(user && isStoreManager(user));
}

/** Store audit trail — same admin gate as store settings. */
export function canReadAuditLog(user: AuthUser | null | undefined): boolean {
  return canManageStoreSettings(user);
}

/** Logical backup / restore — same admin gate as store settings. */
export function canManageBackups(user: AuthUser | null | undefined): boolean {
  return canManageStoreSettings(user);
}

/** Store-creation inbox — PLATFORM_ADMIN only. Store ADMIN is 403. */
export function canReviewStoreCreationRequests(user: AuthUser | null | undefined): boolean {
  return Boolean(user && user.role === UserRole.PLATFORM_ADMIN);
}

/**
 * The module a path belongs to.
 *
 * Nested pages count as part of their module — `/sales/new` is still "Sotuvlar" —
 * so the header keeps naming the section once the feature phases add detail pages.
 */
export function navItemForPath(
  pathname: string,
  items: readonly NavItem[] = [...NAV_ITEMS, ...PLATFORM_NAV_ITEMS],
): NavItem | undefined {
  const matches = items.filter((item) => itemMatchesPath(item, pathname));
  if (matches.length === 0) return undefined;
  return [...matches].sort((a, b) => longestMatchLength(b, pathname) - longestMatchLength(a, pathname))[0];
}
