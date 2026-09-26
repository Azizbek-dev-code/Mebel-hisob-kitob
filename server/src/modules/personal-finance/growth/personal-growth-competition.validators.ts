import {
  GlobalCompetitionStatus,
  GlobalRewardDeliveryStatus,
  GLOBAL_COMPETITION_STATUSES,
  GLOBAL_REWARD_DELIVERY_STATUSES,
  GLOBAL_REWARD_PLACES,
} from '@furniture-erp/shared';
import { z } from 'zod';

export const upsertCompetitionBodySchema = z.object({
  periodKey: z.string().regex(/^\d{4}-\d{2}$/),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  status: z.enum(GLOBAL_COMPETITION_STATUSES as [string, ...string[]]).optional(),
});

export const upsertRewardBodySchema = z.object({
  place: z.enum(GLOBAL_REWARD_PLACES as [string, ...string[]]),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  valueText: z.string().trim().max(120).nullable().optional(),
  imageUrl: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .optional()
    .transform((value) => (value === '' ? null : value)),
});

export const updateWinnerDeliveryBodySchema = z.object({
  deliveryStatus: z.enum(GLOBAL_REWARD_DELIVERY_STATUSES as [string, ...string[]]),
});

void GlobalCompetitionStatus;
void GlobalRewardDeliveryStatus;
