import { prisma } from '../lib/prisma.js';

export async function listPlatformShops() {
  return prisma.store.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      phone: true,
      address: true,
      isActive: true,
      createdAt: true,
    },
  });
}
