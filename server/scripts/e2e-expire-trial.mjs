import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const store = await prisma.store.findFirst({ where: { name: 'E2E Test Store 220822' } });
if (!store) throw new Error('E2E store not found');

const expired = new Date('2020-01-02T00:00:00.000Z');
const current = await prisma.storeSubscription.findFirst({
  where: { storeId: store.id, isCurrent: true },
});
if (!current) throw new Error('No current subscription');

await prisma.storeSubscription.update({
  where: { id: current.id },
  data: {
    status: 'EXPIRED',
    trialEndsAt: expired,
    currentPeriodEnd: expired,
    nextPaymentDue: expired,
  },
});

console.log(
  JSON.stringify({
    id: current.id,
    store: store.name,
    status: 'EXPIRED',
    trialEndsAt: expired.toISOString(),
  }),
);

await prisma.$disconnect();
