import { z } from 'zod';

export const updatePersonalNotificationPrefsBodySchema = z
  .object({
    notifyBudget: z.boolean().optional(),
    notifyGoals: z.boolean().optional(),
    notifyRecurring: z.boolean().optional(),
    notifyDebts: z.boolean().optional(),
  })
  .refine(
    (body) =>
      body.notifyBudget !== undefined ||
      body.notifyGoals !== undefined ||
      body.notifyRecurring !== undefined ||
      body.notifyDebts !== undefined,
    { message: 'At least one field is required' },
  );
