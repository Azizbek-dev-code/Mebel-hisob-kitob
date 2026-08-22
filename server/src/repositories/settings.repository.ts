import type { StoreProfile } from '@furniture-erp/shared';

import { prisma } from '../lib/prisma.js';

const storeProfileSelect = {
  id: true,
  name: true,
  phone: true,
  address: true,
  currency: true,
  timezone: true,
  updatedAt: true,
} as const;

type StoreProfileRecord = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  currency: string;
  timezone: string;
  updatedAt: Date;
};

function mapStoreProfile(record: StoreProfileRecord): StoreProfile {
  return {
    id: record.id,
    name: record.name,
    phone: record.phone,
    address: record.address,
    currency: record.currency,
    timezone: record.timezone,
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function findStoreProfile(storeId: string): Promise<StoreProfile | null> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: storeProfileSelect,
  });
  return store ? mapStoreProfile(store) : null;
}

export interface UpdateStoreProfileData {
  name?: string;
  phone?: string | null;
  address?: string | null;
  timezone?: string;
}

export async function updateStoreProfile(
  storeId: string,
  data: UpdateStoreProfileData,
): Promise<StoreProfile> {
  const store = await prisma.store.update({
    where: { id: storeId },
    data,
    select: storeProfileSelect,
  });
  return mapStoreProfile(store);
}
