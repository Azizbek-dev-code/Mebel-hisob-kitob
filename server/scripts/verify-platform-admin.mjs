import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const users = await prisma.user.findMany({
  where: { role: 'PLATFORM_ADMIN' },
  select: {
    id: true,
    username: true,
    email: true,
    role: true,
    isActive: true,
    passwordHash: true,
    fullName: true,
  },
});

const expectedPassword = process.env.SEED_PLATFORM_ADMIN_PASSWORD || 'Platform123!';
const expectedEmail = process.env.SEED_PLATFORM_ADMIN_EMAIL || 'platform@furniture-erp.local';

const report = [];
for (const u of users) {
  report.push({
    username: u.username,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    isActive: u.isActive,
    passwordMatchesSeedDefault: await bcrypt.compare(expectedPassword, u.passwordHash),
  });
}

console.log(
  JSON.stringify(
    {
      count: users.length,
      expectedUsername: 'platform',
      expectedEmail,
      expectedPasswordSource:
        process.env.SEED_PLATFORM_ADMIN_PASSWORD
          ? 'SEED_PLATFORM_ADMIN_PASSWORD env'
          : 'env.ts default Platform123!',
      users: report,
    },
    null,
    2,
  ),
);

await prisma.$disconnect();
