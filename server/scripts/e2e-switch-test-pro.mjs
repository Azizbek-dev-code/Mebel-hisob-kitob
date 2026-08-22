import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const store = await prisma.store.findFirst({ where: { name: 'E2E Test Store 220822' } });
if (!store) {
  throw new Error('E2E store not found');
}

const testPro = await prisma.subscriptionPlan.findFirst({ where: { name: 'Test Pro' } });
if (!testPro) {
  throw new Error('Test Pro plan not found');
}

const current = await prisma.storeSubscription.findFirst({
  where: { storeId: store.id, isCurrent: true },
});
if (!current) {
  throw new Error('No current subscription');
}

await prisma.storeSubscription.update({
  where: { id: current.id },
  data: { planId: testPro.id },
});

const after = await prisma.storeSubscription.findUnique({
  where: { id: current.id },
  include: { plan: { select: { name: true } } },
});

console.log(
  JSON.stringify({
    storeId: store.id,
    subscriptionId: current.id,
    status: after?.status,
    plan: after?.plan.name,
    trialEndsAt: after?.trialEndsAt,
  }),
);

await prisma.$disconnect();
