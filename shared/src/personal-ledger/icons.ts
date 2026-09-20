/** Fallback emoji when a category has no stored icon. Keyed by catalog `key`. */
export const PERSONAL_CATEGORY_ICON_BY_KEY = {
  SALARY: '💼',
  FREELANCE: '💻',
  BUSINESS: '🏪',
  BONUS: '🎁',
  INVESTMENT: '💰',
  EXTRA: '✨',
  INCOME_OTHER: '💵',
  FOOD: '🍔',
  TRANSPORT: '🚕',
  HOME: '🏠',
  COMMUNICATION: '📱',
  SHOPPING: '🛒',
  HEALTH: '💊',
  EDUCATION: '🎓',
  FUN: '🎮',
  EXPENSE_OTHER: '📦',
} as const;

export const PERSONAL_CATEGORY_ICON_PALETTE: readonly string[] = [
  '🍔',
  '🚕',
  '🏠',
  '📱',
  '🛒',
  '💊',
  '🎓',
  '🎮',
  '💼',
  '💻',
  '🏪',
  '🎁',
  '💰',
  '✨',
  '💵',
  '📦',
  '☕',
  '👕',
  '✈️',
  '🐾',
  '🏷️',
];

export const PERSONAL_CATEGORY_COLOR_PALETTE: readonly string[] = [
  'indigo',
  'teal',
  'slate',
  'cyan',
  'violet',
  'sky',
  'rose',
  'green',
  'amber',
  'orange',
  'blue',
  'pink',
];

export function personalCategoryIcon(input: {
  icon?: string | null;
  key?: string | null;
}): string {
  const stored = input.icon?.trim();
  if (stored) return stored;
  if (input.key && input.key in PERSONAL_CATEGORY_ICON_BY_KEY) {
    return PERSONAL_CATEGORY_ICON_BY_KEY[input.key as keyof typeof PERSONAL_CATEGORY_ICON_BY_KEY];
  }
  return '🏷️';
}

/** Lucide component name when the user picked a professional icon. */
export function personalCategoryIconName(input: {
  iconName?: string | null;
}): string | null {
  const name = input.iconName?.trim();
  return name && /^[A-Za-z][A-Za-z0-9]*$/.test(name) ? name : null;
}

export function personalCategoryIconColor(input: {
  iconColor?: string | null;
}): string | null {
  const color = input.iconColor?.trim();
  return color && /^#[0-9A-Fa-f]{6}$/.test(color) ? color : null;
}

/** Curated lucide-react names for the Telegram-style picker (tree-shaken on the client). */
export const LUCIDE_CATEGORY_ICON_NAMES = [
  'UtensilsCrossed',
  'Coffee',
  'Soup',
  'ShoppingCart',
  'Store',
  'Car',
  'Bus',
  'Fuel',
  'Bike',
  'Home',
  'Sofa',
  'Lamp',
  'Smartphone',
  'Wifi',
  'Phone',
  'Shirt',
  'Watch',
  'Gift',
  'HeartPulse',
  'Pill',
  'Stethoscope',
  'GraduationCap',
  'BookOpen',
  'Languages',
  'Dumbbell',
  'Trophy',
  'Gamepad2',
  'Film',
  'Music',
  'Plane',
  'Briefcase',
  'Laptop',
  'Code',
  'Wallet',
  'Banknote',
  'Coins',
  'PiggyBank',
  'CreditCard',
  'Building2',
  'Factory',
  'Baby',
  'PawPrint',
  'Sparkles',
  'Star',
  'Sun',
  'Moon',
  'Leaf',
  'Flower2',
  'Wrench',
  'Hammer',
  'Scissors',
  'Paintbrush',
  'Camera',
  'Headphones',
  'Tv',
  'Plug',
  'Zap',
  'Droplets',
  'Flame',
  'Umbrella',
  'MapPin',
  'Globe',
  'Users',
  'User',
  'Heart',
  'HandHeart',
  'Church',
  'Landmark',
  'Receipt',
  'Calculator',
  'ChartColumn',
  'Target',
  'Flag',
  'Bell',
  'Calendar',
  'Clock',
  'Timer',
  'Repeat',
  'Tag',
  'Tags',
  'Package',
  'Box',
  'Archive',
  'Trash2',
  'Shield',
  'Lock',
  'KeyRound',
  'Settings',
] as const;

export type LucideCategoryIconName = (typeof LUCIDE_CATEGORY_ICON_NAMES)[number];

/** Distinct hex swatches for the color picker (not the old named token list). */
export const CATEGORY_ICON_COLOR_SWATCHES = [
  '#0F766E',
  '#0D9488',
  '#2563EB',
  '#4F46E5',
  '#7C3AED',
  '#DB2777',
  '#E11D48',
  '#EA580C',
  '#D97706',
  '#65A30D',
  '#059669',
  '#0891B2',
  '#334155',
  '#57534E',
  '#111827',
] as const;
