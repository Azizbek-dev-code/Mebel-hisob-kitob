/**
 * Uzbekistan administrative regions offered on the store-creation form.
 *
 * District / city remains free text: the catalogue of tumanlar is large and
 * changes, and over-constraining it would reject legitimate addresses.
 */
export const UZBEKISTAN_REGIONS = [
  'Toshkent shahri',
  'Toshkent viloyati',
  'Andijon',
  'Buxoro',
  "Farg'ona",
  'Jizzax',
  'Namangan',
  'Navoiy',
  'Qashqadaryo',
  "Qoraqalpog'iston",
  'Samarqand',
  'Sirdaryo',
  'Surxondaryo',
  'Xorazm',
] as const;

export type UzbekistanRegion = (typeof UZBEKISTAN_REGIONS)[number];

export function isUzbekistanRegion(value: string): value is UzbekistanRegion {
  return (UZBEKISTAN_REGIONS as readonly string[]).includes(value);
}
