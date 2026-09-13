/**
 * Product categories are store-scoped DB rows. Every new store is seeded with
 * this furniture catalogue so the product form has groupings on day one.
 */
export interface DefaultProductCategory {
  /** Stable key for seeds / migrations; not shown in the UI. */
  readonly key: string;
  /** Display name (Uzbek) shown in the product form. */
  readonly name: string;
  readonly sortOrder: number;
}

export const DEFAULT_PRODUCT_CATEGORIES: readonly DefaultProductCategory[] = [
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
  { key: 'DIVAN', name: 'Divan', sortOrder: 19 },
  { key: 'KROVAT', name: 'Krovat', sortOrder: 20 },
  { key: 'SHKAF', name: 'Shkaf', sortOrder: 21 },
  { key: 'STOL', name: 'Stol', sortOrder: 22 },
  { key: 'STUL', name: 'Stul', sortOrder: 23 },
  { key: 'KITCHEN_FURNITURE', name: 'Oshxona mebeli', sortOrder: 24 },
  { key: 'OFFICE_FURNITURE', name: 'Ofis mebeli', sortOrder: 25 },
] as const;
