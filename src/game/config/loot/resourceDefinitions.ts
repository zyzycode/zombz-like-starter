import type { ResourceType } from '@/shared/types/game';

export type ResourceDefinition = {
  id: ResourceType;
  name: string;
  color: number;
};

export const resourceDefinitions = {
  scrap: {
    id: 'scrap',
    name: 'Scrap',
    color: 0x94a3b8,
  },
  ore: {
    id: 'ore',
    name: 'Ore',
    color: 0xf59e0b,
  },
  essence: {
    id: 'essence',
    name: 'Essence',
    color: 0x22c55e,
  },
} satisfies Record<ResourceType, ResourceDefinition>;
