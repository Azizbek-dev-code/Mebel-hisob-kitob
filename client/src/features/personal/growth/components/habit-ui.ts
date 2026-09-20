import { isDurationUnit, isHoursUnit, type GrowthHabitDto } from '@furniture-erp/shared';
import {
  Apple,
  Banknote,
  Bike,
  BookOpen,
  Brain,
  Briefcase,
  Coffee,
  Coins,
  Droplets,
  Dumbbell,
  Flame,
  GraduationCap,
  Heart,
  HeartPulse,
  Home,
  Languages,
  Laptop,
  Leaf,
  Moon,
  PiggyBank,
  Smile,
  Smartphone,
  Sparkles,
  Star,
  Sun,
  Target,
  Timer,
  Trophy,
  User,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export const HABIT_COLORS = [
  '#4f46e5',
  '#16a34a',
  '#d97706',
  '#dc2626',
  '#0891b2',
  '#7c3aed',
  '#db2777',
  '#475569',
] as const;

export const HABIT_CATEGORIES = [
  'reading',
  'health',
  'sport',
  'work',
  'personal',
  'finance',
  'home',
  'other',
] as const;

export const HABIT_UNIT_OPTIONS = [
  'count',
  'duration',
  'hours',
  'volume',
  'distance',
  'pages',
  'custom',
] as const;

export type HabitIconCategoryId =
  | 'people'
  | 'sport'
  | 'reading'
  | 'work'
  | 'health'
  | 'food'
  | 'finance'
  | 'lifestyle'
  | 'goals'
  | 'growth'
  | 'sleep';

export const HABIT_ICON_CATEGORIES: Array<{
  id: HabitIconCategoryId;
  emoji: string;
  icons: Array<{ id: string; Icon: LucideIcon }>;
}> = [
  { id: 'people', emoji: '😀', icons: [{ id: 'user', Icon: User }, { id: 'smile', Icon: Smile }] },
  {
    id: 'sport',
    emoji: '🏃',
    icons: [
      { id: 'dumbbell', Icon: Dumbbell },
      { id: 'bike', Icon: Bike },
      { id: 'trophy', Icon: Trophy },
      { id: 'target', Icon: Target },
    ],
  },
  {
    id: 'reading',
    emoji: '📚',
    icons: [
      { id: 'book', Icon: BookOpen },
      { id: 'graduation', Icon: GraduationCap },
      { id: 'languages', Icon: Languages },
    ],
  },
  {
    id: 'work',
    emoji: '💼',
    icons: [
      { id: 'briefcase', Icon: Briefcase },
      { id: 'laptop', Icon: Laptop },
    ],
  },
  {
    id: 'health',
    emoji: '❤️',
    icons: [
      { id: 'heart', Icon: Heart },
      { id: 'pulse', Icon: HeartPulse },
    ],
  },
  {
    id: 'food',
    emoji: '🍎',
    icons: [
      { id: 'apple', Icon: Apple },
      { id: 'coffee', Icon: Coffee },
      { id: 'droplets', Icon: Droplets },
    ],
  },
  {
    id: 'finance',
    emoji: '💰',
    icons: [
      { id: 'wallet', Icon: Wallet },
      { id: 'coins', Icon: Coins },
      { id: 'piggy', Icon: PiggyBank },
      { id: 'banknote', Icon: Banknote },
    ],
  },
  {
    id: 'lifestyle',
    emoji: '🧘',
    icons: [
      { id: 'home', Icon: Home },
      { id: 'leaf', Icon: Leaf },
      { id: 'sparkles', Icon: Sparkles },
    ],
  },
  {
    id: 'goals',
    emoji: '🎯',
    icons: [
      { id: 'flame', Icon: Flame },
      { id: 'star', Icon: Star },
      { id: 'timer', Icon: Timer },
    ],
  },
  { id: 'growth', emoji: '🧠', icons: [{ id: 'brain', Icon: Brain }] },
  {
    id: 'sleep',
    emoji: '🌙',
    icons: [
      { id: 'moon', Icon: Moon },
      { id: 'sun', Icon: Sun },
      { id: 'phone', Icon: Smartphone },
    ],
  },
];

export const HABIT_ICONS: Array<{ id: string; Icon: LucideIcon }> = HABIT_ICON_CATEGORIES.flatMap(
  (group) => group.icons,
);

export const WEEKDAY_KEYS = [1, 2, 3, 4, 5, 6, 7] as const;

export function habitIcon(id: string | null | undefined): LucideIcon {
  return HABIT_ICONS.find((item) => item.id === id)?.Icon ?? Flame;
}

export function formatPct(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}

export function formatNum(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return (Math.round(value * 10) / 10).toString();
}

export function unitSelectValue(unit: string): string {
  return (HABIT_UNIT_OPTIONS as readonly string[]).includes(unit) ? unit : 'custom';
}

export function remainingHabitMinutes(habit: GrowthHabitDto): number {
  if (!isDurationUnit(habit.targetUnit)) return 25;
  const remaining = Math.max(0, habit.targetValue - habit.todayValue);
  const minutes = isHoursUnit(habit.targetUnit) ? remaining * 60 : remaining;
  return Math.min(90, Math.max(1, Math.round(minutes)));
}

export function isDurationHabit(habit: Pick<GrowthHabitDto, 'targetUnit' | 'kind'>): boolean {
  return habit.kind !== 'BAD' && isDurationUnit(habit.targetUnit);
}
