import {
  PlatformBillingCycle,
  PlatformBillingStatus,
  PlatformDatePreset,
  PlatformExpenseCategory,
  PlatformPaymentMethod,
} from '@furniture-erp/shared';
import { z } from 'zod';

import { paginationQuerySchema } from './common.validators.js';

export const createPlanBodySchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().max(500).optional(),
  monthlyPrice: z.number().int().min(0),
  currency: z.string().trim().min(3).max(8).optional(),
  trialDays: z.number().int().min(0).max(90).optional(),
  isDefaultTrial: z.boolean().optional(),
  rank: z.number().int().min(0).max(100).optional(),
  featureKeys: z.array(z.string().trim().min(1).max(40)).max(40).optional(),
  limits: z
    .array(
      z.object({
        resourceKey: z.string().trim().min(1).max(40),
        unlimited: z.boolean(),
        limitValue: z.number().int().positive().nullable().optional(),
      }),
    )
    .max(20)
    .optional(),
  features: z
    .object({
      highlights: z.array(z.string().trim().max(120)).max(12).optional(),
      maxUsers: z.number().int().positive().nullable().optional(),
      maxProducts: z.number().int().positive().nullable().optional(),
    })
    .optional(),
});

export const updatePlanBodySchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().max(500).optional(),
  monthlyPrice: z.number().int().min(0).optional(),
  trialDays: z.number().int().min(0).max(90).optional(),
  isActive: z.boolean().optional(),
  isDefaultTrial: z.boolean().optional(),
  rank: z.number().int().min(0).max(100).optional(),
  featureKeys: z.array(z.string().trim().min(1).max(40)).max(40).optional(),
  limits: z
    .array(
      z.object({
        resourceKey: z.string().trim().min(1).max(40),
        unlimited: z.boolean(),
        limitValue: z.number().int().positive().nullable().optional(),
      }),
    )
    .max(20)
    .optional(),
  features: z
    .object({
      highlights: z.array(z.string().trim().max(120)).max(12).optional(),
      maxUsers: z.number().int().positive().nullable().optional(),
      maxProducts: z.number().int().positive().nullable().optional(),
    })
    .optional(),
});

export const assignPlanBodySchema = z.object({
  planId: z.string().cuid(),
});

export const manualBlockBodySchema = z.object({
  blocked: z.boolean(),
});

export const invoiceListQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(PlatformBillingStatus).optional(),
  storeId: z.string().cuid().optional(),
  planId: z.string().cuid().optional(),
  search: z.string().trim().max(120).optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export const recordPaymentBodySchema = z.object({
  paidAt: z.string().min(1),
  paymentMethod: z.nativeEnum(PlatformPaymentMethod),
  reference: z.string().max(120).optional(),
  note: z.string().max(500).optional(),
});

export const createExpenseBodySchema = z.object({
  category: z.nativeEnum(PlatformExpenseCategory),
  amount: z.number().int().positive(),
  date: z.string().min(1),
  description: z.string().max(500).optional(),
  vendor: z.string().max(120).optional(),
  reference: z.string().max(120).optional(),
});

export const updateExpenseBodySchema = createExpenseBodySchema.partial();

export const updateSettingsBodySchema = z.object({
  platformName: z.string().trim().min(1).max(80).optional(),
  defaultCurrency: z.string().trim().min(3).max(8).optional(),
  gracePeriodDays: z.number().int().min(0).max(90).optional(),
  billingCycle: z.nativeEnum(PlatformBillingCycle).optional(),
  paymentRemindersEnabled: z.boolean().optional(),
  reminderDaysBeforeDue: z.number().int().min(0).max(30).optional(),
  paymentCardNumber: z.string().trim().max(80).optional(),
  paymentAccountNumber: z.string().trim().max(80).optional(),
  paymentInstructions: z.string().trim().max(1000).optional(),
  referralCommissionPercent: z.number().int().min(0).max(100).optional(),
  referralMinWithdrawalSom: z.number().int().min(0).max(999_999_999_999).optional(),
  referralProgramActive: z.boolean().optional(),
});

export const pnlQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  preset: z.nativeEnum(PlatformDatePreset).optional(),
});

export const rejectPaymentBodySchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export const requestStoreSubscriptionBodySchema = z.object({
  planId: z.string().cuid(),
  note: z.string().trim().max(500).optional(),
  paymentMethod: z.nativeEnum(PlatformPaymentMethod),
  payerReference: z.string().trim().max(120).optional(),
  proofUrl: z.string().trim().min(8).max(2000),
  proofKey: z.string().trim().min(1).max(500),
});

export const requestPersonalSubscriptionBodySchema = z.object({
  note: z.string().trim().max(500).optional(),
  paymentMethod: z.nativeEnum(PlatformPaymentMethod),
  payerReference: z.string().trim().max(120).optional(),
  proofUrl: z.string().trim().min(8).max(2000),
  proofKey: z.string().trim().min(1).max(500),
});

export const approveSubscriptionRequestBodySchema = z.object({
  // Optional so a one-click Accept works: the service defaults to now plus one
  // billing month.
  startDate: z.string().min(1).optional(),
  endDate: z.string().min(1).optional(),
  paymentMethod: z.nativeEnum(PlatformPaymentMethod),
  note: z.string().max(500).optional(),
});

export const subscriptionRequestListQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
});

export const manualActivateBodySchema = z.object({
  planId: z.string().cuid(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});
