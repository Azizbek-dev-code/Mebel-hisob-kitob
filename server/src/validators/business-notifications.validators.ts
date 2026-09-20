import { z } from 'zod';

export const updateBusinessNotificationPrefsBodySchema = z
  .object({
    notifySales: z.boolean().optional(),
    notifyInventory: z.boolean().optional(),
    notifyDelivery: z.boolean().optional(),
    notifyAssembly: z.boolean().optional(),
    notifyWorkers: z.boolean().optional(),
    notifyBilling: z.boolean().optional(),
    notifyImportant: z.boolean().optional(),
  })
  .refine(
    (body) => Object.values(body).some((value) => value !== undefined),
    { message: 'At least one field is required' },
  );

export const markBusinessNotificationsReadBodySchema = z.object({
  keys: z.array(z.string().min(1).max(120)).max(200).optional(),
});
