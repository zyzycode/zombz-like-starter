import { levelRegistry } from '@/game/content/levels/levelRegistry';

export type LevelCatalogEntry = Pick<
  (typeof levelRegistry)[number],
  'id' | 'label' | 'description'
>;

export const levelCatalog: LevelCatalogEntry[] = levelRegistry.map((entry) => ({
  id: entry.id,
  label: entry.label,
  description: entry.description,
}));
