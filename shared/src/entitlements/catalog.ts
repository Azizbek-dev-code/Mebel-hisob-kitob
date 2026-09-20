/**
 * Product capability registry.
 *
 * Keys are the modules that actually exist in this repository (sidebar + extra
 * ERP capabilities). Plans store enabled keys in the database; this file is only
 * the catalogue the admin UI and seed use so a new module is added in one place.
 *
 * Ishchilar / Ustalar / Yetkazib beruvchilar are intentionally NOT merged:
 * workers are User accounts, masters is a filtered workers view (ASSEMBLER),
 * and suppliers are product vendors with purchases/debt — different domains.
 */

export const FeatureKey = {
  DASHBOARD: 'dashboard',
  SALES: 'sales',
  PRODUCTS: 'products',
  INVENTORY: 'inventory',
  PURCHASES: 'purchases',
  SUPPLIERS: 'suppliers',
  CUSTOMERS: 'customers',
  DEBTS: 'debts',
  EXPENSES: 'expenses',
  WORKERS: 'workers',
  MASTERS: 'masters',
  REPORTS: 'reports',
  ANALYTICS: 'analytics',
  BACKUP: 'backup',
  COMPENSATION: 'compensation',
  INSTALLMENT: 'installment',
  AUDIT: 'audit',
  ASSEMBLY: 'assembly',
} as const;
export type FeatureKey = (typeof FeatureKey)[keyof typeof FeatureKey];

export const FEATURE_KEYS = Object.values(FeatureKey);

export const LimitResourceKey = {
  WORKERS: 'workers',
  CUSTOMERS: 'customers',
  PRODUCTS: 'products',
  SUPPLIERS: 'suppliers',
  SALES: 'sales',
} as const;
export type LimitResourceKey = (typeof LimitResourceKey)[keyof typeof LimitResourceKey];

export const LIMIT_RESOURCE_KEYS = Object.values(LimitResourceKey);

export interface FeatureCatalogEntry {
  key: FeatureKey;
  name: string;
  description: string;
  category: string;
}

export interface LimitCatalogEntry {
  key: LimitResourceKey;
  name: string;
  description: string;
}

export const FEATURE_CATALOG: readonly FeatureCatalogEntry[] = [
  {
    key: FeatureKey.DASHBOARD,
    name: 'Dashboard',
    description: 'Do‘kon bosh sahifasi va kunlik ko‘rsatkichlar',
    category: 'Asosiy',
  },
  {
    key: FeatureKey.SALES,
    name: 'Sotuvlar',
    description: 'Sotuv yaratish, to‘lov va cheklar',
    category: 'Savdo',
  },
  {
    key: FeatureKey.PRODUCTS,
    name: 'Mebellar',
    description: 'Mahsulot katalogi',
    category: 'Katalog',
  },
  {
    key: FeatureKey.INVENTORY,
    name: 'Ombor',
    description: 'Zaxira va ombor harakatlari',
    category: 'Katalog',
  },
  {
    key: FeatureKey.PURCHASES,
    name: 'Kirimlar',
    description: 'Yetkazuvchidan mahsulot qabul qilish',
    category: 'Xarid',
  },
  {
    key: FeatureKey.SUPPLIERS,
    name: 'Yetkazuvchilar',
    description: 'Mahsulot yetkazib beruvchi tashkilotlar',
    category: 'Xarid',
  },
  {
    key: FeatureKey.CUSTOMERS,
    name: 'Mijozlar',
    description: 'Mijozlar katalogi',
    category: 'Savdo',
  },
  {
    key: FeatureKey.DEBTS,
    name: 'Qarzdorlik',
    description: 'Mijoz qarzlari va to‘lovlar',
    category: 'Moliya',
  },
  {
    key: FeatureKey.EXPENSES,
    name: 'Xarajatlar',
    description: 'Do‘kon xarajatlarini yozish',
    category: 'Moliya',
  },
  {
    key: FeatureKey.WORKERS,
    name: 'Ishchilar',
    description: 'Xodimlar, login va majburiyatlar',
    category: 'Jamoa',
  },
  {
    key: FeatureKey.MASTERS,
    name: 'Ustalar',
    description: 'Teruvchilar (ASSEMBLER) ro‘yxati',
    category: 'Jamoa',
  },
  {
    key: FeatureKey.ASSEMBLY,
    name: 'Terlash',
    description: 'Yig‘ish topshiriqlari',
    category: 'Operatsiya',
  },
  {
    key: FeatureKey.REPORTS,
    name: 'Hisobotlar',
    description: 'Do‘kon hisobotlari',
    category: 'Tahlil',
  },
  {
    key: FeatureKey.ANALYTICS,
    name: 'Analytics',
    description: 'Kengaytirilgan tahlil',
    category: 'Tahlil',
  },
  {
    key: FeatureKey.BACKUP,
    name: 'Backup',
    description: 'Ma’lumotlarni eksport/tiklash',
    category: 'Tizim',
  },
  {
    key: FeatureKey.COMPENSATION,
    name: 'Compensation',
    description: 'Ish haqi qoidalari va hisob-kitob',
    category: 'Jamoa',
  },
  {
    key: FeatureKey.INSTALLMENT,
    name: 'Installment',
    description: 'Bo‘lib to‘lash rejalari',
    category: 'Savdo',
  },
  {
    key: FeatureKey.AUDIT,
    name: 'Audit',
    description: 'Do‘kon audit jurnali',
    category: 'Tizim',
  },
] as const;

export const LIMIT_CATALOG: readonly LimitCatalogEntry[] = [
  {
    key: LimitResourceKey.WORKERS,
    name: 'Ishchilar',
    description: 'Do‘kon xodimlari soni (platform admin hisobga olinmaydi)',
  },
  {
    key: LimitResourceKey.CUSTOMERS,
    name: 'Mijozlar',
    description: 'Faol mijozlar soni',
  },
  {
    key: LimitResourceKey.PRODUCTS,
    name: 'Mebellar',
    description: 'Faol mahsulotlar soni',
  },
  {
    key: LimitResourceKey.SUPPLIERS,
    name: 'Yetkazuvchilar',
    description: 'Faol yetkazuvchilar soni',
  },
  {
    key: LimitResourceKey.SALES,
    name: 'Sotuvlar',
    description: 'Bekor qilinmagan sotuvlar soni',
  },
] as const;

export const FEATURE_WRITE_MAP: Record<FeatureKey, LimitResourceKey | null> = {
  dashboard: null,
  sales: LimitResourceKey.SALES,
  products: LimitResourceKey.PRODUCTS,
  inventory: null,
  purchases: null,
  suppliers: LimitResourceKey.SUPPLIERS,
  customers: LimitResourceKey.CUSTOMERS,
  debts: null,
  expenses: null,
  workers: LimitResourceKey.WORKERS,
  masters: LimitResourceKey.WORKERS,
  reports: null,
  analytics: null,
  backup: null,
  compensation: null,
  installment: null,
  audit: null,
  assembly: null,
};

export function featureByKey(key: string): FeatureCatalogEntry | undefined {
  return FEATURE_CATALOG.find((item) => item.key === key);
}

export function limitByKey(key: string): LimitCatalogEntry | undefined {
  return LIMIT_CATALOG.find((item) => item.key === key);
}

/**
 * Plan presets — the single source of truth for what each seeded plan grants.
 *
 * Server seed, entitlement fallback and the admin plan editor all read these, so
 * a plan's capabilities cannot differ between frontend and backend.
 *
 * The free trial is deliberately the smallest set. It previously reused
 * `FEATURE_KEYS`, which is why a 7-day trial behaved exactly like a paid plan.
 */
export const TRIAL_FEATURE_KEYS: readonly FeatureKey[] = [
  FeatureKey.DASHBOARD,
  FeatureKey.SALES,
  FeatureKey.PRODUCTS,
  FeatureKey.CUSTOMERS,
  FeatureKey.EXPENSES,
  FeatureKey.REPORTS,
];

/**
 * Fallback feature set for a plan that has no PlanFeature rows.
 *
 * Kept under the old name because the seed imports it, but it is now the
 * restricted trial set rather than "everything".
 */
export const DEFAULT_TRIAL_FEATURE_KEYS: readonly FeatureKey[] = TRIAL_FEATURE_KEYS;

export const STARTER_FEATURE_KEYS: readonly FeatureKey[] = [
  FeatureKey.DASHBOARD,
  FeatureKey.SALES,
  FeatureKey.PRODUCTS,
  FeatureKey.INVENTORY,
  FeatureKey.CUSTOMERS,
  FeatureKey.EXPENSES,
  FeatureKey.WORKERS,
  // Assembling furniture is the core of a sale here, not an upsell: keeping
  // masters/assembly on the entry plan is what stores on it already rely on.
  FeatureKey.MASTERS,
  FeatureKey.ASSEMBLY,
  FeatureKey.DEBTS,
  FeatureKey.REPORTS,
];

export const PRO_FEATURE_KEYS: readonly FeatureKey[] = FEATURE_KEYS.filter(
  (key) => key !== FeatureKey.BACKUP,
);

export const BUSINESS_FEATURE_KEYS: readonly FeatureKey[] = FEATURE_KEYS;

export interface PlanLimitPreset {
  resourceKey: LimitResourceKey;
  unlimited: boolean;
  limitValue: number | null;
}

function unlimitedLimits(): PlanLimitPreset[] {
  return LIMIT_RESOURCE_KEYS.map((resourceKey) => ({
    resourceKey,
    unlimited: true,
    limitValue: null,
  }));
}

/** A trial is a demo, not a free tier: every countable resource is capped. */
export const TRIAL_LIMIT_PRESET: readonly PlanLimitPreset[] = [
  { resourceKey: LimitResourceKey.WORKERS, unlimited: false, limitValue: 2 },
  { resourceKey: LimitResourceKey.CUSTOMERS, unlimited: false, limitValue: 20 },
  { resourceKey: LimitResourceKey.PRODUCTS, unlimited: false, limitValue: 20 },
  { resourceKey: LimitResourceKey.SUPPLIERS, unlimited: false, limitValue: 3 },
  { resourceKey: LimitResourceKey.SALES, unlimited: false, limitValue: 30 },
];

export const STARTER_LIMIT_PRESET: readonly PlanLimitPreset[] = [
  { resourceKey: LimitResourceKey.WORKERS, unlimited: false, limitValue: 3 },
  { resourceKey: LimitResourceKey.CUSTOMERS, unlimited: false, limitValue: 100 },
  { resourceKey: LimitResourceKey.PRODUCTS, unlimited: false, limitValue: 80 },
  { resourceKey: LimitResourceKey.SUPPLIERS, unlimited: false, limitValue: 10 },
  { resourceKey: LimitResourceKey.SALES, unlimited: true, limitValue: null },
];

export const PRO_LIMIT_PRESET: readonly PlanLimitPreset[] = [
  { resourceKey: LimitResourceKey.WORKERS, unlimited: false, limitValue: 10 },
  { resourceKey: LimitResourceKey.CUSTOMERS, unlimited: false, limitValue: 500 },
  { resourceKey: LimitResourceKey.PRODUCTS, unlimited: false, limitValue: 400 },
  { resourceKey: LimitResourceKey.SUPPLIERS, unlimited: false, limitValue: 50 },
  { resourceKey: LimitResourceKey.SALES, unlimited: true, limitValue: null },
];

export const UNLIMITED_LIMIT_PRESET: readonly PlanLimitPreset[] = unlimitedLimits();

/**
 * Sidebar / route module key → the plan feature that unlocks it.
 *
 * `null` means the module is always available (self-service screens, the
 * subscription page itself) and must never be hidden by a plan.
 */
export const NAV_FEATURE_MAP: Record<string, FeatureKey | null> = {
  dashboard: null,
  billing: null,
  profile: null,
  settings: null,
  'my-sales': FeatureKey.SALES,
  'my-reports': FeatureKey.SALES,
  'my-finances': null,
  delivery: null,
  sales: FeatureKey.SALES,
  products: FeatureKey.PRODUCTS,
  inventory: FeatureKey.INVENTORY,
  purchases: FeatureKey.PURCHASES,
  suppliers: FeatureKey.SUPPLIERS,
  customers: FeatureKey.CUSTOMERS,
  debts: FeatureKey.DEBTS,
  expenses: FeatureKey.EXPENSES,
  workers: FeatureKey.WORKERS,
  masters: FeatureKey.MASTERS,
  assembly: FeatureKey.ASSEMBLY,
  reports: FeatureKey.REPORTS,
  analytics: FeatureKey.ANALYTICS,
  audit: FeatureKey.AUDIT,
  notifications: null,
};

/** The plan feature a nav/module key needs, or null when it is always open. */
export function featureForNavKey(navKey: string): FeatureKey | null {
  return NAV_FEATURE_MAP[navKey] ?? null;
}

export function isFreePlanMeta(plan: {
  isDefaultTrial?: boolean;
  monthlyPrice?: number | bigint | null;
}): boolean {
  if (plan.isDefaultTrial) return true;
  if (plan.monthlyPrice == null) return false;
  return Number(plan.monthlyPrice) <= 0;
}

export function featureSetEquals(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((key, index) => key === right[index]);
}

/**
 * Stored feature rows that would make a free/trial plan behave like a paid one.
 *
 * Empty (legacy unconfigured), the whole catalog (the original seed bug), or an
 * exact copy of START/PRO/BUSINESS all get rewritten to the trial preset.
 * A narrower custom set is assumed deliberate.
 */
export function isUnsafeFreePlanFeatureSet(enabled: readonly string[]): boolean {
  if (enabled.length === 0) return true;
  return [FEATURE_KEYS, STARTER_FEATURE_KEYS, PRO_FEATURE_KEYS, BUSINESS_FEATURE_KEYS].some((preset) =>
    featureSetEquals(enabled, preset),
  );
}

export interface ResolvedPlanEntitlements {
  featureKeys: string[];
  featuresRestricted: boolean;
}

/**
 * Single source of truth for what a plan actually grants.
 *
 * Frontend `/auth/me` and backend `requireFeature` must call this so a 7-day
 * trial can never silently inherit START (or "everything is open").
 */
export function resolvePlanEntitlements(input: {
  isDefaultTrial?: boolean;
  monthlyPrice?: number | bigint | null;
  enabledFeatureKeys?: readonly string[] | null;
  hasPlanFeatureRows: boolean;
}): ResolvedPlanEntitlements {
  const enabled = [...(input.enabledFeatureKeys ?? [])];
  const free = isFreePlanMeta(input);

  if (free && (!input.hasPlanFeatureRows || isUnsafeFreePlanFeatureSet(enabled))) {
    return { featureKeys: [...TRIAL_FEATURE_KEYS], featuresRestricted: true };
  }
  if (input.hasPlanFeatureRows) {
    return { featureKeys: enabled, featuresRestricted: true };
  }
  return { featureKeys: [], featuresRestricted: false };
}
