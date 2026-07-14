import { CompositeMapRepository } from '@/game/content/maps/CompositeMapRepository';
import { HttpTiledMapRepository } from '@/game/content/maps/tiled/HttpTiledMapRepository';
import { tiledMapManifest } from '@/game/content/maps/tiled/tiledMapManifest';

export function createMapRepository() {
  return new CompositeMapRepository([
    new HttpTiledMapRepository(tiledMapManifest),
  ]);
}
