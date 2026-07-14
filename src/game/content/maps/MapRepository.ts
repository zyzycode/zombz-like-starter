import type { MapDefinition } from '@/game/content/maps/types';

export interface MapRepository {
  getById(mapId: string): Promise<MapDefinition>;
}
