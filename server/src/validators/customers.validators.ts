import { CustomerStatus, type CreateCustomerCatalogueRequest, type UpdateCustomerRequest } from '@furniture-erp/shared';
import { z } from 'zod';

import { cuidSchema, paginationQuerySchema } from './common.validators.js';

export const createCustomerCatalogueBodySchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(80),
  lastName: z.string().trim().min(1, 'Last name is required').max(80),
  phone: z.string().trim().min(5).max(40),
  notes: z.string().trim().max(1000).nullable().optional(),
  address: z.string().trim().max(300).nullable().optional(),
}) satisfies z.ZodType<CreateCustomerCatalogueRequest>;

export const updateCustomerBodySchema = z
  .object({
    firstName: z.string().trim().min(1).max(80).optional(),
    lastName: z.string().trim().min(1).max(80).optional(),
    phone: z.string().trim().min(5).max(40).optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
    address: z.string().trim().max(300).nullable().optional(),
  })
  .refine(
    (body) =>
      body.firstName !== undefined ||
      body.lastName !== undefined ||
      body.phone !== undefined ||
      body.notes !== undefined ||
      body.address !== undefined,
    { message: 'At least one field is required' },
  ) satisfies z.ZodType<UpdateCustomerRequest>;

export const customerListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(200).optional(),
  status: z.union([z.nativeEnum(CustomerStatus), z.literal('ALL')]).optional(),
  debtFilter: z.enum(['ALL', 'CLEAR', 'IN_DEBT', 'OVERDUE']).optional(),
  sort: z.enum(['name', 'debt', 'lastSale']).optional(),
});

export type CreateCustomerCatalogueBody = z.infer<typeof createCustomerCatalogueBodySchema>;
export type UpdateCustomerBody = z.infer<typeof updateCustomerBodySchema>;
export type CustomerListQueryBody = z.infer<typeof customerListQuerySchema>;

void cuidSchema;
