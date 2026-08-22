import { seedDefaultPlansAndBackfill } from '../src/services/platform-billing.service.ts';
import { prisma } from '../src/lib/prisma.ts';

await seedDefaultPlansAndBackfill();

const stores = await prisma.store.findMany({
  select: {
    id: true,
    name: true,
    subscriptions: {
      where: { isCurrent: true },
      select: { id: true, status: true, trialEndsAt: true, plan: { select: { name: true, trialDays: true, isDefaultTrial: true } } },
    },
  },
});
console.log(JSON.stringify({ storeCount: stores.length, stores }, null, 2));

const plans = await prisma.subscriptionPlan.findMany({
  select: { name: true, trialDays: true, isDefaultTrial: true, monthlyPrice: true, isActive: true },
});
console.log('plans', plans);

await prisma.$disconnect();
