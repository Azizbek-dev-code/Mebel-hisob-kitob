/**
 * Prep a known inventory product for browser E2E (does not cancel/delete sales).
 * Prints INVENTORY_BROWSER_PREP_OK and product details.
 */
/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const MARKER = 'INVENTORY_BROWSER_E2E';

async function main() {
  const store = await prisma.store.findFirst({ where: { isActive: true } });
  if (!store) throw new Error('No store');

  const sku = `BRW-INV-${Date.now().toString().slice(-6)}`;
  const product = await prisma.product.create({
    data: {
      storeId: store.id,
      name: `${MARKER} Spalni`,
      sku,
      costPrice: 1_000_000n,
      defaultSalePrice: 2_000_000n,
      status: 'ACTIVE',
      stockQty: 0,
      minStockQty: 2,
      trackStock: false,
    },
  });

  console.log(
    JSON.stringify({
      ok: true,
      marker: MARKER,
      productId: product.id,
      productName: product.name,
      sku: product.sku,
    }),
  );
  console.log('INVENTORY_BROWSER_PREP_OK');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
