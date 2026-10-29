import type { Player } from '@/game/core/characters/Player';
import type { InputState } from '@/shared/types/game';
import type { ExplorationCacheDefinition, ExplorationCacheState } from './ExplorationCache';

/** Level-local discovery state; the session grants the actual item. */
export class CacheSystem {
  private readonly caches: ExplorationCacheState[];

  constructor(definitions: readonly ExplorationCacheDefinition[]) {
    this.caches = definitions.map((cache) => ({ ...structuredClone(cache), opened: false }));
  }

  getState(): ExplorationCacheState[] { return structuredClone(this.caches); }

  tryOpen(player: Player, input: InputState): string | null {
    if (!input.interactPressed || !player.isAlive) return null;
    let nearest: ExplorationCacheState | undefined;
    let nearestDistance = Infinity;
    for (const cache of this.caches) {
      if (cache.opened) continue;
      const distance = Math.hypot(cache.position.x - player.position.x, cache.position.y - player.position.y);
      if (distance <= cache.radius + player.radius && distance < nearestDistance) {
        nearest = cache;
        nearestDistance = distance;
      }
    }
    if (!nearest) return null;
    nearest.opened = true;
    return nearest.id;
  }
}
