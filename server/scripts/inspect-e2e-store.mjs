import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const store = await prisma.store.findFirst({
  where: { name: 'E2E Test Store 220822' },
  include: {
    users: { select: { username: true, role: true, isActive: true, email: true } },
    subscriptions: {
      orderBy: { createdAt: 'desc' },
      include: {
        plan: {
          select: {
            name: true,
            trialDays: true,
            planFeatures: { include: { feature: { select: { key: true } } } },
            limits: true,
          },
        },
      },
    },
  },
});

console.log(
  JSON.stringify(
    {
      store: store && {
        id: store.id,
        name: store.name,
        accessStatus: store.accessStatus,
        users: store.users,
        subscriptions: store.subscriptions.map((s) => ({
          id: s.id,
          status: s.status,
          isCurrent: s.isCurrent,
          startedAt: s.startedAt,
          trialStartedAt: s.trialStartedAt,
          trialEndsAt: s.trialEndsAt,
          currentPeriodEnd: s.currentPeriodEnd,
          plan: s.plan.name,
          trialDays: s.plan.trialDays,
          features: s.plan.planFeatures.filter((f) => f.enabled).map((f) => f.feature.key),
          limits: s.plan.limits,
        })),
      },
    },
    null,
    2,
  ),
);

await prisma.$disconnect();
