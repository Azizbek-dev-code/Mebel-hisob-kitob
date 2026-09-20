/** Flat usage XP — never proportional to money. */

export const XP_PLATFORM_USAGE = 5;

export const PLATFORM_XP_EVENT_TYPES = {
  SALE_CREATED: 'sale_created',
  PRODUCT_CREATED: 'product_created',
  INVENTORY_VIEWED: 'inventory_viewed',
  CUSTOMER_VIEWED: 'customer_viewed',
  DELIVERY_VIEWED: 'delivery_viewed',
  ASSEMBLY_VIEWED: 'assembly_viewed',
  REPORT_VIEWED: 'report_viewed',
  HABIT_COMPLETED: 'habit_completed',
  TODO_COMPLETED: 'todo_completed',
  FOCUS_SESSION_COMPLETED: 'focus_session_completed',
} as const;

export type PlatformXpEventType =
  (typeof PLATFORM_XP_EVENT_TYPES)[keyof typeof PLATFORM_XP_EVENT_TYPES];

type XpRule = { xp: number; dailyLimit: number };

const RULES: Record<string, XpRule> = {
  [PLATFORM_XP_EVENT_TYPES.SALE_CREATED]: { xp: XP_PLATFORM_USAGE, dailyLimit: 20 },
  [PLATFORM_XP_EVENT_TYPES.PRODUCT_CREATED]: { xp: XP_PLATFORM_USAGE, dailyLimit: 15 },
  [PLATFORM_XP_EVENT_TYPES.INVENTORY_VIEWED]: { xp: 1, dailyLimit: 3 },
  [PLATFORM_XP_EVENT_TYPES.CUSTOMER_VIEWED]: { xp: 1, dailyLimit: 3 },
  [PLATFORM_XP_EVENT_TYPES.DELIVERY_VIEWED]: { xp: 1, dailyLimit: 3 },
  [PLATFORM_XP_EVENT_TYPES.ASSEMBLY_VIEWED]: { xp: 1, dailyLimit: 3 },
  [PLATFORM_XP_EVENT_TYPES.REPORT_VIEWED]: { xp: 1, dailyLimit: 3 },
};

export function platformXpRule(eventType: string): XpRule | null {
  return RULES[eventType] ?? null;
}

export function platformXpReferenceKey(eventType: string, entityId: string): string {
  return `${eventType}:${entityId}`;
}
