/**
 * Privacy-safe analytics: never persist or return financial values,
 * private notes, names, or message bodies.
 */

const FINANCIAL_TOKENS = new Set([
  'amount',
  'price',
  'profit',
  'income',
  'expense',
  'balance',
  'debt',
  'salary',
  'payment',
  'revenue',
  'cost',
  'description',
  'note',
  'notes',
  'customer',
  'supplier',
  'message',
  'content',
]);

const ALLOWED_METADATA_KEYS = new Set(['feature', 'entityType', 'businessType', 'source']);

export const ANALYTICS_ALLOWED_METADATA_KEYS = [...ALLOWED_METADATA_KEYS];

export const DEFAULT_ANALYTICS_IDLE_TIMEOUT_SECONDS = 300;
export const DEFAULT_ANALYTICS_EVENT_RETENTION_DAYS = 90;

/** Split camelCase / snake_case / kebab-case into lowercase tokens. */
export function tokenizeFieldKey(key: string): string[] {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[\s_\-.]+/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

export function isForbiddenFinancialKey(key: string): boolean {
  return tokenizeFieldKey(key).some((token) => FINANCIAL_TOKENS.has(token));
}

export type JsonObject = Record<string, unknown>;

/**
 * Keep only the metadata whitelist. Financial keys are dropped rather than
 * stored — the event itself can still be recorded.
 */
export function sanitizeAnalyticsMetadata(
  metadata: unknown,
): Record<string, string> | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  const input = metadata as JsonObject;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!ALLOWED_METADATA_KEYS.has(key)) continue;
    if (isForbiddenFinancialKey(key)) continue;
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
      continue;
    }
    const text = String(value).trim();
    if (!text || text.length > 64) continue;
    out[key] = text;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * Walk a DTO and omit financial keys. Technical fields like `accountType`
 * stay — tokenisation does not treat "account" as money.
 */
export function stripFinancialFields<T>(value: T): T {
  return stripValue(value) as T;
}

function stripValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripValue);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  const out: JsonObject = {};
  for (const [key, nested] of Object.entries(value as JsonObject)) {
    if (isForbiddenFinancialKey(key)) continue;
    out[key] = stripValue(nested);
  }
  return out;
}

export function assertNoFinancialFields(payload: unknown): void {
  walkAssert(payload, '');
}

function walkAssert(value: unknown, path: string): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkAssert(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value as JsonObject)) {
    const next = path ? `${path}.${key}` : key;
    if (isForbiddenFinancialKey(key)) {
      throw new Error(`Financial field leaked in analytics payload: ${next}`);
    }
    walkAssert(nested, next);
  }
}
