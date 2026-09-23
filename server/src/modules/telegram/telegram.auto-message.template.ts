import type {
  TelegramAutoMessageThresholdConfig,
} from '@furniture-erp/shared';

import type { ResolvedAutoMessageResult } from './telegram.auto-message.resolver.js';

const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export function extractPlaceholders(template: string): string[] {
  const found = new Set<string>();
  for (const match of template.matchAll(PLACEHOLDER_RE)) {
    if (match[1]) found.add(match[1]);
  }
  return [...found];
}

/** Replace {{key}} only — does not append unused result rows. */
export function renderPlaceholdersOnly(
  template: string,
  results: ResolvedAutoMessageResult[],
): string {
  const byKey = new Map(results.map((row) => [row.key, row]));
  return template.replace(PLACEHOLDER_RE, (full, key: string) => {
    const row = byKey.get(key);
    return row ? row.formatted : full;
  });
}

/**
 * Render message body with {{key}} placeholders.
 * Missing placeholders are left as-is and reported — never silently swallowed.
 */
export function renderAutoMessageTemplate(
  template: string,
  results: ResolvedAutoMessageResult[],
): { text: string; unresolvedPlaceholders: string[] } {
  const byKey = new Map(results.map((row) => [row.key, row]));
  const unresolved: string[] = [];

  const text = template.replace(PLACEHOLDER_RE, (full, key: string) => {
    const row = byKey.get(key);
    if (!row) {
      unresolved.push(key);
      return full;
    }
    return row.formatted;
  });

  // Append any selected results that were not referenced via placeholders,
  // preserving selected order — useful when body is empty or partial.
  const used = new Set(extractPlaceholders(template));
  const trailing = results.filter((row) => !used.has(row.key)).map((row) => row.formatted);

  let finalText = text.trim();
  if (trailing.length) {
    finalText = finalText ? `${finalText}\n\n${trailing.join('\n')}` : trailing.join('\n');
  }

  return { text: finalText, unresolvedPlaceholders: [...new Set(unresolved)] };
}

/**
 * Pick HIGH / MEDIUM / LOW band message for the configured result key.
 * Empty / missing threshold config → null (no error, no message).
 * Threshold text may include {{placeholders}} from selected results.
 */
export function pickThresholdMessage(
  results: ResolvedAutoMessageResult[],
  config: TelegramAutoMessageThresholdConfig | null | undefined,
): string | null {
  if (!config?.resultKey) return null;
  const hasAnyBand =
    (config.high != null && Boolean(config.highMessage?.trim())) ||
    (config.medium != null && Boolean(config.mediumMessage?.trim())) ||
    (config.low != null && Boolean(config.lowMessage?.trim()));
  if (!hasAnyBand) return null;

  const row = results.find((item) => item.key === config.resultKey);
  if (!row || row.rawValue == null || !Number.isFinite(row.rawValue)) return null;

  const value = row.rawValue;
  const high = config.high;
  const medium = config.medium;
  const low = config.low;

  let raw: string | null = null;
  if (high != null && value >= high && config.highMessage?.trim()) {
    raw = config.highMessage.trim();
  } else if (medium != null && value >= medium && config.mediumMessage?.trim()) {
    raw = config.mediumMessage.trim();
  } else if (low != null && value >= low && config.lowMessage?.trim()) {
    raw = config.lowMessage.trim();
  } else if (
    low != null &&
    value < low &&
    config.lowMessage?.trim() &&
    high == null &&
    medium == null
  ) {
    // Below low — still show low message if only low is configured.
    raw = config.lowMessage.trim();
  }

  if (!raw) return null;
  return renderPlaceholdersOnly(raw, results);
}

export function describeThresholdMiss(
  results: ResolvedAutoMessageResult[],
  config: TelegramAutoMessageThresholdConfig | null | undefined,
): string | null {
  if (!config?.resultKey) return null;
  const hasAnyBand =
    (config.high != null && Boolean(config.highMessage?.trim())) ||
    (config.medium != null && Boolean(config.mediumMessage?.trim())) ||
    (config.low != null && Boolean(config.lowMessage?.trim()));
  if (!hasAnyBand) {
    return 'Chegara xabari uchun kamida bitta HIGH/MEDIUM/LOW qiymat va matn kerak.';
  }
  if (pickThresholdMessage(results, config)) return null;
  const row = results.find((item) => item.key === config.resultKey);
  const sample = row?.rawValue;
  return `Namuna qiymat (${sample ?? '—'}) hech qaysi chegaraga yetmadi — shu sababli qo‘shimcha matn qo‘shilmadi.`;
}

export function composeAutoMessageText(opts: {
  title: string;
  messageBody: string;
  results: ResolvedAutoMessageResult[];
  thresholdConfig?: TelegramAutoMessageThresholdConfig | null;
  previewBanner?: boolean;
}): {
  text: string;
  unresolvedPlaceholders: string[];
  thresholdApplied: string | null;
  thresholdNote: string | null;
} {
  const rendered = renderAutoMessageTemplate(opts.messageBody, opts.results);
  const threshold = pickThresholdMessage(opts.results, opts.thresholdConfig);
  const parts: string[] = [];
  if (opts.previewBanner) {
    parts.push('👁 <b>PREVIEW</b> (namuna ma’lumot)');
  }
  if (opts.title.trim()) {
    parts.push(`<b>${escapeHtml(opts.title.trim())}</b>`);
  }
  if (rendered.text) parts.push(rendered.text);
  if (threshold) parts.push(threshold);
  return {
    text: parts.join('\n\n'),
    unresolvedPlaceholders: rendered.unresolvedPlaceholders,
    thresholdApplied: threshold,
    thresholdNote: opts.previewBanner
      ? describeThresholdMiss(opts.results, opts.thresholdConfig)
      : null,
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
