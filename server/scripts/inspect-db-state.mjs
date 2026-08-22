import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function tableExists(table) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
    table,
  );
  return rows.length > 0;
}

async function columnExists(table, column) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    table,
    column,
  );
  return rows.length > 0;
}

async function main() {
  try {
    const migrations = await prisma.$queryRawUnsafe(
      'SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY started_at',
    );
    console.log('prisma_migrations_count', migrations.length);
    for (const row of migrations) {
      console.log('  ', row.migration_name, row.finished_at, row.rolled_back_at);
    }
  } catch (error) {
    console.log('prisma_migrations_error', error.message);
  }

  const tables = [
    'stores',
    'users',
    'customers',
    'products',
    'sales',
    'expenses',
    'worker_financial_transactions',
    'store_creation_requests',
    'subscription_plans',
    'store_subscriptions',
    'features',
    'plan_features',
    'plan_limits',
    'subscription_requests',
    'platform_invoices',
  ];
  for (const table of tables) {
    const exists = await tableExists(table);
    if (!exists) {
      console.log(`table ${table}: MISSING`);
      continue;
    }
    const countRows = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS c FROM "${table}"`);
    console.log(`table ${table}: ${countRows[0].c}`);
  }

  console.log('col stores.accessStatus', await columnExists('stores', 'accessStatus'));
  console.log('col store_subscriptions.isCurrent', await columnExists('store_subscriptions', 'isCurrent'));
  console.log('col store_subscriptions.trialStartedAt', await columnExists('store_subscriptions', 'trialStartedAt'));
  console.log('col store_subscriptions.trialEndsAt', await columnExists('store_subscriptions', 'trialEndsAt'));
  console.log('col subscription_plans.trialDays', await columnExists('subscription_plans', 'trialDays'));
  console.log('col subscription_plans.isDefaultTrial', await columnExists('subscription_plans', 'isDefaultTrial'));

  const subCols = await prisma.$queryRawUnsafe(
    `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='store_subscriptions' ORDER BY ordinal_position`,
  );
  console.log('store_subscriptions columns', subCols.map((r) => r.column_name).join(', '));
  const planCols = await prisma.$queryRawUnsafe(
    `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='subscription_plans' ORDER BY ordinal_position`,
  );
  console.log('subscription_plans columns', planCols.map((r) => r.column_name).join(', '));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
