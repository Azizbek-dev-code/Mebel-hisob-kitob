import { PrismaClient, UserRole } from '@prisma/client';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:4000';
const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN, isActive: true },
  });
  if (!admin) throw new Error('no admin');

  const login = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: admin.username ?? admin.email,
      password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!',
    }),
  });
  const cookie = login.headers.get('set-cookie')?.split(';')[0] ?? '';

  const sales = await prisma.sale.findMany({
    where: { notes: { contains: 'SALE_CANCEL_BROWSER_TEMP' } },
  });

  for (const sale of sales) {
    if (sale.status === 'CANCELLED') {
      console.log(JSON.stringify({ id: sale.id, already: true }));
      continue;
    }
    const res = await fetch(`${BASE}/api/sales/${sale.id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ reason: 'Browser E2E leftover cleanup' }),
    });
    console.log(JSON.stringify({ id: sale.id, status: res.status }));
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
