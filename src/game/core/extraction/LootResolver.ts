import { lootTables, type LootTableEntry, type LootTableId } from '@/game/config/loot/lootTables';
import { DroppedResource } from '@/game/core/objects/DroppedResource';
import type { Vector2 } from '@/shared/types/game';

export class LootResolver {
  resolveDrops(params: {
    lootTableId: string | null;
    position: Vector2;
    sourceId: string;
  }) {
    if (!params.lootTableId) {
      return [];
    }

    const entries = lootTables[params.lootTableId as LootTableId];
    if (!entries) {
      return [];
    }

    return entries.flatMap((entry: LootTableEntry, index: number) => {
      if (Math.random() > entry.chance) {
        return [];
      }

      const amount = randomInt(entry.min, entry.max);
      const spreadX = (Math.random() - 0.5) * 28;
      const spreadY = (Math.random() - 0.5) * 28;

      return [
        new DroppedResource({
          id: `${params.sourceId}-drop-${entry.resourceType}-${index}`,
          resourceType: entry.resourceType,
          amount,
          position: {
            x: params.position.x + spreadX,
            y: params.position.y + spreadY,
          },
          pickupRadius: 28,
          pickupDelayMs: 350,
          ttlMs: 12_000,
        }),
      ];
    });
  }
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
