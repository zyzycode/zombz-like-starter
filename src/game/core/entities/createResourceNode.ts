import { ResourceNode } from '@/game/core/objects/ResourceNode';
import type { ResourceNodeState, ResourceNodeType } from '@/shared/types/game';

const resourceNodePresets: Record<ResourceNodeType, Pick<ResourceNodeState, 'radius' | 'hp' | 'maxHp' | 'lootTableId'>> = {
  ore_vein: {
    radius: 24,
    hp: 140,
    maxHp: 140,
    lootTableId: 'resource_ore_vein',
  },
  scrap_pile: {
    radius: 22,
    hp: 110,
    maxHp: 110,
    lootTableId: 'resource_scrap_pile',
  },
  bush: {
    radius: 18,
    hp: 60,
    maxHp: 60,
    lootTableId: 'resource_bush',
  },
};

export function createResourceNode(
  id: string,
  nodeType: ResourceNodeType,
  x: number,
  y: number,
) {
  const preset = resourceNodePresets[nodeType];

  return new ResourceNode({
    id,
    nodeType,
    position: { x, y },
    radius: preset.radius,
    hp: preset.hp,
    maxHp: preset.maxHp,
    lootTableId: preset.lootTableId,
  });
}
