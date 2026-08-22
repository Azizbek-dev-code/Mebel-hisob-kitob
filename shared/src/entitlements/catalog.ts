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

/** Core ERP set used when a plan has no PlanFeature rows yet (legacy / trial). */
export const DEFAULT_TRIAL_FEATURE_KEYS: readonly FeatureKey[] = FEATURE_KEYS;

export const STARTER_FEATURE_KEYS: readonly FeatureKey[] = [
  FeatureKey.DASHBOARD,
  FeatureKey.SALES,
  FeatureKey.PRODUCTS,
  FeatureKey.INVENTORY,
  FeatureKey.CUSTOMERS,
  FeatureKey.EXPENSES,
  FeatureKey.WORKERS,
  FeatureKey.DEBTS,
  FeatureKey.REPORTS,
];
