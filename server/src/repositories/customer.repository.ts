import type { CustomerLookupItem } from '@furniture-erp/shared';
import { normalizeUzPhone, phoneLookupVariants } from '@furniture-erp/shared';
import type { Customer, Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma.js';

const lookupSelect = {
  id: true,
  firstName: true,
  lastName: true,
  phone: true,
  address: true,
} satisfies Prisma.CustomerSelect;

export function toCustomerLookup(customer: {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string | null;
}): CustomerLookupItem {
  return {
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phone,
    address: customer.address,
  };
}

export function findCustomerInStore(
  storeId: string,
  customerId: string,
): Promise<Customer | null> {
  return prisma.customer.findFirst({
    where: { id: customerId, storeId, status: 'ACTIVE' },
  });
}

export function findCustomerByPhone(
  storeId: string,
  phone: string,
): Promise<Customer | null> {
  return prisma.customer.findUnique({
    where: { storeId_phone: { storeId, phone } },
  });
}

export async function searchCustomers(
  storeId: string,
  query: string | undefined,
  limit = 20,
): Promise<CustomerLookupItem[]> {
  const trimmed = query?.trim();
  const phoneVariants = trimmed ? phoneLookupVariants(trimmed) : [];
  const normalised = trimmed ? normalizeUzPhone(trimmed) : '';

  const rows = await prisma.customer.findMany({
    where: {
      storeId,
      status: 'ACTIVE',
      ...(trimmed
        ? {
            OR: [
              { firstName: { contains: trimmed, mode: 'insensitive' } },
              { lastName: { contains: trimmed, mode: 'insensitive' } },
              { phone: { contains: trimmed } },
              ...(normalised && normalised !== trimmed
                ? [{ phone: { contains: normalised } }]
                : []),
              ...phoneVariants.map((v) => ({ phone: { contains: v } })),
            ],
          }
        : {}),
    },
    select: lookupSelect,
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    take: limit,
  });

  return rows.map(toCustomerLookup);
}

export async function createCustomer(
  storeId: string,
  data: {
    firstName: string;
    lastName: string;
    phone: string;
    address?: string;
    notes?: string;
  },
): Promise<CustomerLookupItem> {
  const customer = await prisma.customer.create({
    data: {
      storeId,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      address: data.address,
      notes: data.notes,
    },
    select: lookupSelect,
  });

  return toCustomerLookup(customer);
}

export async function createCustomerTx(
  tx: Prisma.TransactionClient,
  storeId: string,
  data: {
    firstName: string;
    lastName: string;
    phone: string;
    address?: string;
    notes?: string;
  },
): Promise<Customer> {
  return tx.customer.create({
    data: {
      storeId,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      address: data.address,
      notes: data.notes,
    },
  });
}
