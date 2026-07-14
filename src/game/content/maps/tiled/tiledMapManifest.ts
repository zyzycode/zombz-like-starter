import type { TiledMapAssetEntry } from '@/game/content/maps/tiled/HttpTiledMapRepository';

export const tiledMapManifest: Record<string, TiledMapAssetEntry> = {
  'my-first-map': {
    tilemapUrl: '/assets/maps/my_first_map/my_first_map.tmj',
    tilesets: [],
  },
};
