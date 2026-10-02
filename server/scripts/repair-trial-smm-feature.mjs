import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const FEATURE = 'smm_projects';

const plans = await prisma.subscriptionPlan.findMany({
  where: {
    audience: 'STORE',
    OR: [{ isDefaultTrial: true }, { monthlyPrice: 0n }],
  },
  include: { planFeatures: true },
});

for (const plan of plans) {
  const existing = plan.planFeatures.find((f) => f.featureKey === FEATURE);
  if (!existing || !existing.enabled) {
    await prisma.planFeature.upsert({
      where: { planId_featureKey: { planId: plan.id, featureKey: FEATURE } },
      create: { planId: plan.id, featureKey: FEATURE, enabled: true },
      update: { enabled: true },
    });
    console.log('enabled', plan.name, FEATURE);
  } else {
    console.log('already', plan.name, FEATURE);
  }
}

const after = await prisma.subscriptionPlan.findMany({
  where: { audience: 'STORE', OR: [{ isDefaultTrial: true }, { monthlyPrice: 0n }] },
  include: { planFeatures: true },
});
console.log(
  JSON.stringify(
    after.map((p) => ({
      name: p.name,
      isDefaultTrial: p.isDefaultTrial,
      features: p.planFeatures.filter((f) => f.enabled).map((f) => f.featureKey),
    })),
    null,
    2,
  ),
);
await prisma.$disconnect();
