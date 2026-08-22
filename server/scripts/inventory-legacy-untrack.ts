/**
 * One-time safe backfill after inventory columns were added via db push.
 * Existing catalog rows with no stock history stay untracked until stock-in.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.product.updateMany({
    where: {
      stockQty: 0,
      trackStock: true,
      stockMovements: { none: {} },
    },
    data: { trackStock: false },
  });
  // eslint-disable-next-line no-console
  console.log(`INVENTORY_LEGACY_UNTRACKED ${result.count}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
