import type { MapRepository } from '@/game/content/maps/MapRepository';
import type { MapDefinition } from '@/game/content/maps/types';

export class CompositeMapRepository implements MapRepository {
  constructor(private readonly repositories: MapRepository[]) {}

  async getById(mapId: string): Promise<MapDefinition> {
    for (const repository of this.repositories) {
      try {
        return await repository.getById(mapId);
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          continue;
        }

        throw error;
      }
    }

    throw new Error(`Map not found: ${mapId}`);
  }
}
