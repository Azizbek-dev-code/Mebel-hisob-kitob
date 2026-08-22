/**
 * Minimal database seed.
 *
 * Creates only what a fresh local store needs to sign in: the store row and an
 * admin account from `SEED_*` env vars. No catalogue, customers, workers, or
 * transactional demo data.
 *
 * For the rich furniture catalogue + cashier/ali fixtures, run `npm run db:seed:demo`.
 *
 * Every write is an upsert keyed on a natural key, so running this repeatedly is
 * safe and will not duplicate rows.
 *
 * Run with `npm run db:seed`.
 */
import { WorkerResponsibility } from '@furniture-erp/shared';
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

import { env } from '../src/config/env.js';

const prisma = new PrismaClient();

const PASSWORD_SALT_ROUNDS = 12;

async function setResponsibilities(
  storeId: string,
  userId: string,
  responsibilities: WorkerResponsibility[],
): Promise<void> {
  await prisma.userResponsibility.deleteMany({ where: { userId, storeId } });
  if (responsibilities.length === 0) return;
  await prisma.userResponsibility.createMany({
    data: responsibilities.map((responsibility) => ({
      storeId,
      userId,
      responsibility,
    })),
  });
}

async function main(): Promise<void> {
  console.log('Seeding database (minimal)…');

  // --- Store ----------------------------------------------------------------
  const existingStore = await prisma.store.findFirst({ where: { name: env.SEED_STORE_NAME } });
  const store =
    existingStore ??
    (await prisma.store.create({
      data: {
        name: env.SEED_STORE_NAME,
        phone: '+998712000000',
        address: "Toshkent shahri, Mebel ko'chasi 1",
      },
    }));
  console.log(`  store: ${store.name}`);

  // --- Admin ----------------------------------------------------------------
  const adminPasswordHash = await bcrypt.hash(env.SEED_ADMIN_PASSWORD, PASSWORD_SALT_ROUNDS);

  // Password is reset on every run so printed credentials always match env.
  const admin = await prisma.user.upsert({
    where: { storeId_email: { storeId: store.id, email: env.SEED_ADMIN_EMAIL } },
    update: {
      username: 'admin',
      passwordHash: adminPasswordHash,
      fullName: 'Store Administrator',
      role: UserRole.ADMIN,
      isActive: true,
    },
    create: {
      storeId: store.id,
      email: env.SEED_ADMIN_EMAIL,
      username: 'admin',
      passwordHash: adminPasswordHash,
      fullName: 'Store Administrator',
      role: UserRole.ADMIN,
    },
  });
  console.log(`  admin: ${admin.email}`);

  // Admin can operate the cash desk alone on an empty store (no demo workers).
  await setResponsibilities(store.id, admin.id, [
    WorkerResponsibility.SELLER,
    WorkerResponsibility.ASSEMBLER,
    WorkerResponsibility.DELIVERY,
    WorkerResponsibility.INSTALLER,
  ]);

  // Separate principal: never promote the store ADMIN. Existing stores keep
  // working; this account only adds platform-level store-request review.
  const platformPasswordHash = await bcrypt.hash(
    env.SEED_PLATFORM_ADMIN_PASSWORD,
    PASSWORD_SALT_ROUNDS,
  );
  const platformAdmin = await prisma.user.upsert({
    where: { storeId_email: { storeId: store.id, email: env.SEED_PLATFORM_ADMIN_EMAIL } },
    update: {
      username: 'platform',
      passwordHash: platformPasswordHash,
      fullName: 'Platform Administrator',
      role: UserRole.PLATFORM_ADMIN,
      isActive: true,
    },
    create: {
      storeId: store.id,
      email: env.SEED_PLATFORM_ADMIN_EMAIL,
      username: 'platform',
      passwordHash: platformPasswordHash,
      fullName: 'Platform Administrator',
      role: UserRole.PLATFORM_ADMIN,
    },
  });
  console.log(`  platform admin: ${platformAdmin.email}`);

  const { seedDefaultPlansAndBackfill } = await import('../src/services/platform-billing.service.js');
  await seedDefaultPlansAndBackfill();
  console.log('  platform plans + store subscriptions backfilled');

  console.log('\nMinimal seed complete.');
  console.log('  Sign in at http://localhost:5173/login:');
  console.log(`    admin — ${env.SEED_ADMIN_EMAIL} / ${env.SEED_ADMIN_PASSWORD}`);
  console.log(
    `    platform — ${env.SEED_PLATFORM_ADMIN_EMAIL} / ${env.SEED_PLATFORM_ADMIN_PASSWORD}`,
  );
  console.log('  Optional rich demo data: npm run db:seed:demo');
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
