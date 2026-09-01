/**
 * Upsert DEFAULT_PRODUCT_CATEGORIES into every store (safe to re-run).
 * Usage: node scripts/seed-product-categories.mjs
 */
import { PrismaClient } from '@prisma/client';

const DEFAULT_PRODUCT_CATEGORIES = [
  { key: 'BEDROOM', name: 'Yotoqxona', sortOrder: 1 },
  { key: 'LIVING_ROOM', name: 'Mehmoxona', sortOrder: 2 },
  { key: 'SOFT', name: 'Soft mebel', sortOrder: 3 },
  { key: 'KITCHEN', name: 'Oshxona', sortOrder: 4 },
  { key: 'DINING', name: 'Ovqatlanish mebeli', sortOrder: 5 },
  { key: 'OFFICE', name: 'Ofis / Kabinet', sortOrder: 6 },
  { key: 'CHILDREN', name: 'Bolalar mebeli', sortOrder: 7 },
  { key: 'MATTRESSES', name: 'Matraslar', sortOrder: 8 },
  { key: 'BEDS', name: 'Karavotlar', sortOrder: 9 },
  { key: 'WARDROBES', name: 'Shkaflar / Garderob', sortOrder: 10 },
  { key: 'CHESTS', name: 'Komodlar / Tumbochkalar', sortOrder: 11 },
  { key: 'TABLES', name: 'Stollar', sortOrder: 12 },
  { key: 'CHAIRS', name: 'Stullar', sortOrder: 13 },
  { key: 'TV_STANDS', name: 'TV tumba / Stendlar', sortOrder: 14 },
  { key: 'HALLWAY', name: 'Koridor / Prihojaya', sortOrder: 15 },
  { key: 'OUTDOOR', name: "Balkon / Bog' mebeli", sortOrder: 16 },
  { key: 'ACCESSORIES', name: 'Aksessuarlar', sortOrder: 17 },
  { key: 'OTHER', name: 'Boshqa', sortOrder: 18 },
];

const prisma = new PrismaClient();

const stores = await prisma.store.findMany({ select: { id: true, name: true } });
let _created = 0;

for (const store of stores) {
  for (const category of DEFAULT_PRODUCT_CATEGORIES) {
    const result = await prisma.productCategory.upsert({
      where: { storeId_name: { storeId: store.id, name: category.name } },
      update: { sortOrder: category.sortOrder, isActive: true },
      create: {
        storeId: store.id,
        name: category.name,
        sortOrder: category.sortOrder,
      },
    });
    if (result.createdAt.getTime() === result.updatedAt.getTime()) _created += 1;
  }
  console.log(`  ${store.name}: ${DEFAULT_PRODUCT_CATEGORIES.length} categories`);
}

console.log(`Done. Stores: ${stores.length}.`);
await prisma.$disconnect();
