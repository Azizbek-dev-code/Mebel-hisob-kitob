/**
 * Rich demo seed (optional).
 *
 * Creates the reference catalogue and fixtures used for local demos and older
 * E2E scripts: cashier + assembler accounts, expense categories, product
 * categories, furniture SKUs, and sample customers.
 *
 * Does not replace `db:seed` — run minimal seed first or let this script
 * upsert the store + admin itself.
 *
 * Run with `npm run db:seed:demo`.
 * Remove demo/business data with `npm run db:clean-demo -- --i-understand-dev-only`.
 */
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_PRODUCT_CATEGORIES, WorkerResponsibility } from '@furniture-erp/shared';
import { PrismaClient, ProductStatus, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

import { env } from '../src/config/env.js';

const prisma = new PrismaClient();

const PASSWORD_SALT_ROUNDS = 12;

/** Development-only fixture password for the cash-desk demo account. */
const CASHIER_PASSWORD = 'Cashier123!';

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

/** Demo SKUs keyed by DEFAULT_PRODUCT_CATEGORIES.key */
const PRODUCTS = [
  {
    name: 'Bedroom Set "Milano"',
    sku: 'BR-MIL-01',
    categoryKey: 'BEDROOM',
    costPrice: 7_000_000n,
    defaultSalePrice: 9_000_000n,
    description: 'Wardrobe, double bed, two bedside tables and a dressing table.',
  },
  {
    name: 'Bedroom Set "Verona"',
    sku: 'BR-VER-01',
    categoryKey: 'BEDROOM',
    costPrice: 9_500_000n,
    defaultSalePrice: 12_500_000n,
    description: 'Full bedroom suite in dark oak.',
  },
  {
    name: 'Corner Sofa "Comfort"',
    sku: 'LR-COM-01',
    categoryKey: 'SOFT',
    costPrice: 4_200_000n,
    defaultSalePrice: 5_900_000n,
    description: 'Five-seat corner sofa with a pull-out bed.',
  },
  {
    name: 'TV Stand "Modern"',
    sku: 'LR-MOD-02',
    categoryKey: 'TV_STANDS',
    costPrice: 1_100_000n,
    defaultSalePrice: 1_750_000n,
    description: 'Wall-mounted TV unit, 180 cm.',
  },
  {
    name: 'Kitchen Set "Klassik" 3m',
    sku: 'KT-KLA-01',
    categoryKey: 'KITCHEN',
    costPrice: 6_000_000n,
    defaultSalePrice: 8_400_000n,
    description: 'Three-metre fitted kitchen with worktop.',
  },
  {
    name: 'Dining Table + 6 Chairs',
    sku: 'KT-DIN-02',
    categoryKey: 'DINING',
    costPrice: 2_300_000n,
    defaultSalePrice: 3_400_000n,
    description: 'Solid wood dining set for six.',
  },
  {
    name: 'Office Desk "Praktik"',
    sku: 'OF-PRA-01',
    categoryKey: 'OFFICE',
    costPrice: 900_000n,
    defaultSalePrice: 1_450_000n,
    description: 'Desk with three drawers, 140 cm.',
  },
  {
    name: 'Children Set "Bolajon"',
    sku: 'CH-BOL-01',
    categoryKey: 'CHILDREN',
    costPrice: 3_100_000n,
    defaultSalePrice: 4_500_000n,
    description: 'Bunk bed, desk and wardrobe.',
  },
  {
    name: 'Orthopaedic Mattress 160x200',
    sku: 'MT-ORT-01',
    categoryKey: 'MATTRESSES',
    costPrice: 1_400_000n,
    defaultSalePrice: 2_200_000n,
    description: 'Independent spring block, medium firmness.',
  },
] as const;

const CUSTOMERS = [
  {
    firstName: 'Anvar',
    lastName: 'Aliyev',
    phone: '+998901234567',
    address: 'Toshkent, Chilonzor 12-45',
  },
  {
    firstName: 'Dilnoza',
    lastName: 'Karimova',
    phone: '+998901112233',
    address: 'Toshkent, Yunusobod 4-18',
  },
  {
    firstName: 'Bekzod',
    lastName: 'Rahimov',
    phone: '+998935556677',
    address: 'Samarqand, Registon 7',
  },
] as const;

async function main(): Promise<void> {
  console.log('Seeding database (demo)…');

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

  // --- Users ----------------------------------------------------------------
  const adminPasswordHash = await bcrypt.hash(env.SEED_ADMIN_PASSWORD, PASSWORD_SALT_ROUNDS);

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
  await setResponsibilities(store.id, admin.id, [
    WorkerResponsibility.SELLER,
    WorkerResponsibility.ASSEMBLER,
    WorkerResponsibility.DELIVERY,
    WorkerResponsibility.INSTALLER,
  ]);

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

  const cashierEmail = 'cashier@furniture-erp.local';
  const cashierPasswordHash = await bcrypt.hash(CASHIER_PASSWORD, PASSWORD_SALT_ROUNDS);
  const cashier = await prisma.user.upsert({
    where: { storeId_email: { storeId: store.id, email: cashierEmail } },
    update: { username: 'cashier', passwordHash: cashierPasswordHash, isActive: true },
    create: {
      storeId: store.id,
      email: cashierEmail,
      username: 'cashier',
      passwordHash: cashierPasswordHash,
      fullName: 'Vali Sotuvchi',
      role: UserRole.CASHIER,
    },
  });
  console.log(`  cashier: ${cashier.email}`);
  await setResponsibilities(store.id, cashier.id, [WorkerResponsibility.SELLER]);

  const assemblerEmail = 'ali@furniture-erp.local';
  const assemblerPassword = 'Ali123!';
  const assemblerPasswordHash = await bcrypt.hash(assemblerPassword, PASSWORD_SALT_ROUNDS);
  const assembler = await prisma.user.upsert({
    where: { storeId_email: { storeId: store.id, email: assemblerEmail } },
    update: {
      username: 'ali',
      passwordHash: assemblerPasswordHash,
      fullName: 'Ali Usta',
      role: UserRole.EMPLOYEE,
      isActive: true,
    },
    create: {
      storeId: store.id,
      email: assemblerEmail,
      username: 'ali',
      passwordHash: assemblerPasswordHash,
      fullName: 'Ali Usta',
      role: UserRole.EMPLOYEE,
    },
  });
  console.log(`  assembler: ${assembler.email}`);
  await setResponsibilities(store.id, assembler.id, [
    WorkerResponsibility.ASSEMBLER,
    WorkerResponsibility.SELLER,
  ]);

  const shopirEmail = 'shopir@furniture-erp.local';
  const shopirPassword = 'Shopir123!';
  const shopirPasswordHash = await bcrypt.hash(shopirPassword, PASSWORD_SALT_ROUNDS);
  const shopir = await prisma.user.upsert({
    where: { storeId_email: { storeId: store.id, email: shopirEmail } },
    update: {
      username: 'shopir',
      passwordHash: shopirPasswordHash,
      fullName: 'Azizbek Shopir',
      role: UserRole.EMPLOYEE,
      isActive: true,
    },
    create: {
      storeId: store.id,
      email: shopirEmail,
      username: 'shopir',
      passwordHash: shopirPasswordHash,
      fullName: 'Azizbek Shopir',
      role: UserRole.EMPLOYEE,
    },
  });
  console.log(`  shopir: ${shopir.email} / ${shopirPassword}`);
  await setResponsibilities(store.id, shopir.id, [WorkerResponsibility.DELIVERY]);

  // --- Expense categories ----------------------------------------------------
  const defaultKeys = new Set(DEFAULT_EXPENSE_CATEGORIES.map((category) => category.key));
  for (const [index, category] of DEFAULT_EXPENSE_CATEGORIES.entries()) {
    const existing = await prisma.expenseCategory.findFirst({
      where: { storeId: store.id, key: category.key },
    });

    if (existing) {
      await prisma.expenseCategory.update({
        where: { id: existing.id },
        data: {
          name: category.name,
          color: category.color,
          sortOrder: index,
          isActive: true,
        },
      });
    } else {
      const byName = await prisma.expenseCategory.findUnique({
        where: { storeId_name: { storeId: store.id, name: category.name } },
      });
      if (byName) {
        await prisma.expenseCategory.update({
          where: { id: byName.id },
          data: {
            key: category.key,
            color: category.color,
            sortOrder: index,
            isActive: true,
          },
        });
      } else {
        await prisma.expenseCategory.create({
          data: {
            storeId: store.id,
            key: category.key,
            name: category.name,
            color: category.color,
            sortOrder: index,
          },
        });
      }
    }
  }

  await prisma.expenseCategory.updateMany({
    where: {
      storeId: store.id,
      key: { not: null, notIn: [...defaultKeys] },
    },
    data: { isActive: false },
  });
  console.log(`  expense categories: ${DEFAULT_EXPENSE_CATEGORIES.length}`);

  // --- Product categories ----------------------------------------------------
  const categoryIdByKey = new Map<string, string>();
  for (const category of DEFAULT_PRODUCT_CATEGORIES) {
    const record = await prisma.productCategory.upsert({
      where: { storeId_name: { storeId: store.id, name: category.name } },
      update: { sortOrder: category.sortOrder, isActive: true },
      create: { storeId: store.id, name: category.name, sortOrder: category.sortOrder },
    });
    categoryIdByKey.set(category.key, record.id);
  }
  console.log(`  product categories: ${DEFAULT_PRODUCT_CATEGORIES.length}`);

  // --- Products ---------------------------------------------------------------
  for (const product of PRODUCTS) {
    await prisma.product.upsert({
      where: { storeId_sku: { storeId: store.id, sku: product.sku } },
      update: {
        name: product.name,
        costPrice: product.costPrice,
        defaultSalePrice: product.defaultSalePrice,
        description: product.description,
        categoryId: categoryIdByKey.get(product.categoryKey) ?? null,
        trackStock: true,
        minStockQty: 2,
      },
      create: {
        storeId: store.id,
        name: product.name,
        sku: product.sku,
        description: product.description,
        costPrice: product.costPrice,
        defaultSalePrice: product.defaultSalePrice,
        status: ProductStatus.ACTIVE,
        categoryId: categoryIdByKey.get(product.categoryKey) ?? null,
        stockQty: 10,
        minStockQty: 2,
        trackStock: true,
      },
    });
  }
  console.log(`  products: ${PRODUCTS.length}`);

  // --- Customers ---------------------------------------------------------------
  for (const customer of CUSTOMERS) {
    await prisma.customer.upsert({
      where: { storeId_phone: { storeId: store.id, phone: customer.phone } },
      update: { firstName: customer.firstName, lastName: customer.lastName },
      create: { storeId: store.id, ...customer },
    });
  }
  console.log(`  customers: ${CUSTOMERS.length}`);

  const { seedDefaultPlansAndBackfill } = await import('../src/services/platform-billing.service.js');
  await seedDefaultPlansAndBackfill();
  console.log('  platform plans + store subscriptions backfilled');

  const { backfillAccountLayer } = await import('../src/modules/accounts/account-layer.service.js');
  const accountLayer = await backfillAccountLayer(prisma);
  console.log(
    `  account layer: ${accountLayer.identitiesCreated} identities, ${accountLayer.workspacesCreated} workspaces, ${accountLayer.membershipsCreated} memberships`,
  );

  console.log('\nDemo seed complete.');
  console.log('  Sign in at http://localhost:5173/login with either account:');
  console.log(`    admin   — ${env.SEED_ADMIN_EMAIL} / ${env.SEED_ADMIN_PASSWORD}`);
  console.log(`    cashier — ${cashierEmail} / ${CASHIER_PASSWORD}`);
  console.log(`    ali     — ${assemblerEmail} / ${assemblerPassword}`);
}

main()
  .catch((error: unknown) => {
    console.error('Demo seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
