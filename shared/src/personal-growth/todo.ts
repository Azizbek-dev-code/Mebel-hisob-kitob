import { GrowthEventPriority, type GrowthEventPriority as Priority } from '../constants/enums.js';
import type { SuggestGrowthTodoResponse } from '../types/personal-growth.js';

/**
 * Rule-based “smart task” hints — no AI. Helps prefill estimated time / priority.
 */
export function suggestTodoFromTitle(rawTitle: string, now = new Date()): SuggestGrowthTodoResponse {
  const title = rawTitle.trim().replace(/\s+/g, ' ');
  const lower = title.toLowerCase();

  let estimatedMinutes: number | null = null;
  const hourMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:soat|hour|h)\b/);
  const minMatch = lower.match(/(\d+)\s*(?:daq|min|minute)/);
  if (hourMatch) {
    estimatedMinutes = Math.round(parseFloat(hourMatch[1]!.replace(',', '.')) * 60);
  } else if (minMatch) {
    estimatedMinutes = Number(minMatch[1]);
  } else if (/\b(pomodoro|25)\b/.test(lower)) {
    estimatedMinutes = 25;
  }

  let priority: Priority = GrowthEventPriority.MEDIUM;
  if (/\b(urgent|muhim|asap|deadline|imtihon|exam)\b/.test(lower)) {
    priority = GrowthEventPriority.HIGH;
  } else if (/\b(keyinroq|someday|ixtiyoriy|optional)\b/.test(lower)) {
    priority = GrowthEventPriority.LOW;
  }

  let dueHint: SuggestGrowthTodoResponse['dueHint'] = null;
  if (/\b(bugun|today)\b/.test(lower)) dueHint = 'TODAY';
  else if (/\b(ertaga|tomorrow)\b/.test(lower)) dueHint = 'TOMORROW';
  else if (estimatedMinutes != null || priority === GrowthEventPriority.HIGH) dueHint = 'TODAY';

  let category: string | null = null;
  if (/\b(ielts|english|vocabulary|ingliz)\b/.test(lower)) category = 'IELTS';
  else if (/\b(react|code|dastur|programm|api|auth)\b/.test(lower)) category = 'Dasturlash';
  else if (/\b(kitob|read|o‘qish|oqish)\b/.test(lower)) category = 'O‘qish';
  else if (/\b(gym|sport|yugur|workout)\b/.test(lower)) category = 'Sport';
  else if (/\b(xarajat|budget|pul|moliya)\b/.test(lower)) category = 'Moliya';

  void now;
  return {
    title,
    estimatedMinutes,
    priority,
    dueHint,
    category,
  };
}

export function dueAtFromHint(
  hint: SuggestGrowthTodoResponse['dueHint'],
  now = new Date(),
): Date | null {
  if (!hint) return null;
  const day = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 18, 0, 0, 0),
  );
  if (hint === 'TOMORROW') day.setUTCDate(day.getUTCDate() + 1);
  return day;
}
