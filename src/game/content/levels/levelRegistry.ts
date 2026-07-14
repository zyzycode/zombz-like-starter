import { myFirstMapLevelDefinition } from '@/game/content/levels/definitions/myFirstMap.level';
import type { LevelDefinition } from '@/game/content/levels/types';

export type LevelRegistryEntry = {
  id: string;
  label: string;
  description: string;
  definition: LevelDefinition;
};

export const levelRegistry: LevelRegistryEntry[] = [
  {
    id: myFirstMapLevelDefinition.id,
    label: 'Tiled My First Map',
    description: 'Карта, загружаемая из public/assets/maps/my_first_map/my_first_map.tmj.',
    definition: myFirstMapLevelDefinition,
  },
];
