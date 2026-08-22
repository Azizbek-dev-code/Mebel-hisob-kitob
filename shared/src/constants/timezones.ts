/**
 * IANA zones the store settings API accepts.
 *
 * Today every seeded store uses Asia/Tashkent; the allowlist keeps PATCH
 * validation explicit when more regions are added later.
 */
export const STORE_TIMEZONE_OPTIONS = ['Asia/Tashkent'] as const;

export type StoreTimezone = (typeof STORE_TIMEZONE_OPTIONS)[number];

export const DEFAULT_STORE_TIMEZONE: StoreTimezone = 'Asia/Tashkent';

export function isAllowedStoreTimezone(value: string): value is StoreTimezone {
  return (STORE_TIMEZONE_OPTIONS as readonly string[]).includes(value);
}
