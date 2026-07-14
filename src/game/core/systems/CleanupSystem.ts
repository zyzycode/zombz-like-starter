import { Enemy } from '@/game/core/characters/Enemy';
import { Destructible } from '@/game/core/objects/Destructible';
import { DroppedResource } from '@/game/core/objects/DroppedResource';
import { ResourceNode } from '@/game/core/objects/ResourceNode';

/**
 * Чистит коллекции мира от уже мёртвых или уничтоженных сущностей.
 */
export class CleanupSystem {
  cleanup(params: {
    enemies: Enemy[];
    destructibles: Destructible[];
    resourceNodes: ResourceNode[];
    droppedResources: DroppedResource[];
  }) {
    return {
      enemies: params.enemies.filter((enemy) => enemy.isAlive),
      destructibles: params.destructibles.filter((item) => item.isAlive),
      resourceNodes: params.resourceNodes.filter((item) => item.isAlive),
      droppedResources: params.droppedResources.filter((item) => !item.isExpired),
    };
  }
}
