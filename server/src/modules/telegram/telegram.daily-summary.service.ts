import { runTelegramAutomationTick } from './telegram.automation.service.js';

/**
 * Backward-compatible cron entry. Daily/weekly/monthly sends are timezone-aware
 * automations; this path stays so existing Vercel cron keeps working.
 */
export async function runTelegramDailySummaries(): Promise<{ sent: number }> {
  const result = await runTelegramAutomationTick();
  return { sent: result.sent };
}
