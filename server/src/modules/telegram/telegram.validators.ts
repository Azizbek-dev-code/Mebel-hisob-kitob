import { z } from 'zod';

/**
 * Telegram Bot API updates are loosely shaped. Extra fields are kept for
 * command / deep-link handling without rejecting unknown keys.
 */
export const telegramUpdateSchema = z
  .object({
    update_id: z.number().int(),
    message: z.unknown().optional(),
    edited_message: z.unknown().optional(),
    callback_query: z.unknown().optional(),
    inline_query: z.unknown().optional(),
    my_chat_member: z.unknown().optional(),
  })
  .passthrough();

export type TelegramUpdateBody = z.infer<typeof telegramUpdateSchema>;

const optionalBoolean = z.boolean().optional();

export const updateTelegramPrefsSchema = z
  .object({
    notifyBusiness: optionalBoolean,
    notifyPersonal: optionalBoolean,
    bizNotifySales: optionalBoolean,
    bizNotifyInventory: optionalBoolean,
    bizNotifyDelivery: optionalBoolean,
    bizNotifyAssembly: optionalBoolean,
    bizNotifyWorkers: optionalBoolean,
    bizNotifyBilling: optionalBoolean,
    bizNotifyImportant: optionalBoolean,
    personalNotifyBudget: optionalBoolean,
    personalNotifyGoals: optionalBoolean,
    personalNotifyRecurring: optionalBoolean,
    personalNotifyDebts: optionalBoolean,
    notifyDailySummaryBusiness: optionalBoolean,
    notifyDailySummaryPersonal: optionalBoolean,
    notifyWeeklySummaryBusiness: optionalBoolean,
    notifyWeeklySummaryPersonal: optionalBoolean,
    notifyMonthlySummaryBusiness: optionalBoolean,
    notifyMonthlySummaryPersonal: optionalBoolean,
    accountPrefs: z
      .array(
        z.object({
          workspaceId: z.string().trim().min(1).max(64),
          notifyEnabled: z.boolean(),
        }),
      )
      .max(50)
      .optional(),
  })
  .strict();

export type UpdateTelegramPrefsBody = z.infer<typeof updateTelegramPrefsSchema>;
