import type { ResourceType } from '@/shared/types/game';

export type LootTableEntry = {
  resourceType: ResourceType;
  min: number;
  max: number;
  chance: number;
};

export type LootTableId = 'resource_scrap_pile' | 'resource_ore_vein' | 'resource_bush' | 'crate_basic';

export const lootTables = {
  resource_scrap_pile: [
    { resourceType: 'scrap', min: 3, max: 7, chance: 1 },
    { resourceType: 'essence', min: 1, max: 2, chance: 0.15 },
  ],
  resource_ore_vein: [
    { resourceType: 'ore', min: 2, max: 5, chance: 1 },
    { resourceType: 'scrap', min: 1, max: 2, chance: 0.2 },
  ],
  resource_bush: [
    { resourceType: 'essence', min: 1, max: 3, chance: 0.65 },
  ],
  crate_basic: [
    { resourceType: 'scrap', min: 2, max: 5, chance: 1 },
  ],
} satisfies Record<LootTableId, LootTableEntry[]>;
