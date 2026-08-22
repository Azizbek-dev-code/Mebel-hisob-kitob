/**
 * After db:clear-demo: refresh PLATFORM_ADMIN password + plan/feature catalogue
 * without creating a tenant store or store ADMIN.
 */
import bcrypt from 'bcryptjs';
import { PrismaClient, UserRole } from '@prisma/client';

import { env } from '../src/config/env.ts';
import { seedDefaultPlansAndBackfill } from '../src/services/platform-billing.service.ts';

const prisma = new PrismaClient();
const SALT = 12;

const platform = await prisma.user.findFirst({
  where: { role: UserRole.PLATFORM_ADMIN },
});
if (!platform) {
  throw new Error('No PLATFORM_ADMIN found — run seed first or create platform user.');
}

const passwordHash = await bcrypt.hash(env.SEED_PLATFORM_ADMIN_PASSWORD, SALT);
await prisma.user.update({
  where: { id: platform.id },
  data: {
    username: 'platform',
    email: env.SEED_PLATFORM_ADMIN_EMAIL,
    passwordHash,
    isActive: true,
    fullName: 'Platform Administrator',
  },
});

await seedDefaultPlansAndBackfill();

const tenants = await prisma.store.count({
  where: { users: { some: { role: UserRole.ADMIN } } },
});
const plans = await prisma.subscriptionPlan.findMany({
  select: { name: true, isDefaultTrial: true, trialDays: true },
  orderBy: { name: 'asc' },
});

console.log(
  JSON.stringify(
    {
      platform: {
        username: 'platform',
        email: env.SEED_PLATFORM_ADMIN_EMAIL,
        passwordReset: true,
      },
      tenantStores: tenants,
      plans,
    },
    null,
    2,
  ),
);

await prisma.$disconnect();
