import type { ObeliskDefinition } from '@/game/core/environment/Obelisk';
import type { ExplorationCacheDefinition } from '@/game/core/environment/ExplorationCache';
import type { ResourceNodeType, Vector2 } from '@/shared/types/game';
import type { RestorationSiteDefinition } from '@/game/core/environment/RestorationSite';
import type { ArenaHazardDefinition } from '@/game/core/environment/ArenaHazard';

export type MapRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MapMarkerDefinition = {
  id: string;
  kind: 'player_spawn' | 'enemy_spawn' | 'resource_area' | 'extraction_zone';
  position: Vector2;
  width?: number;
  height?: number;
  label?: string;
  tags?: string[];
  nodeTypes?: ResourceNodeType[];
};

export type MapPropDefinition = {
  id: string;
  kind: 'pillar' | 'crate_stack' | 'scrap_heap' | 'tree' | 'ruin' | 'foliage';
  position: Vector2;
  radius: number;
  width: number;
  height: number;
  visual?: { textureKey: string; frame: number; scale?: number; ground?: boolean; origin?: Vector2 };
};

export type CollisionShapeDefinition =
  | {
      id: string;
      kind: 'circle';
      position: Vector2;
      radius: number;
    }
  | {
      id: string;
      kind: 'rect';
      position: Vector2;
      width: number;
      height: number;
    }
  | {
      id: string;
      kind: 'polygon';
      position: Vector2;
      points: Vector2[];
    };

export type MapTilesetDefinition = {
  id: string;
  name: string;
  firstGid: number;
  source: string;
  imageKey?: string;
  imagePath?: string;
  frameWidth?: number;
  frameHeight?: number;
};

export type GroundStampDefinition = {
  textureKey: string;
  frame: number;
  position: Vector2;
  origin?: Vector2;
  scale?: number;
};

export type TileChunkDefinition = {
  x: number;
  y: number;
  width: number;
  height: number;
  data: number[];
};

export type TileLayerDefinition = {
  id: string;
  name: string;
  kind: 'tile';
  width: number;
  height: number;
  opacity: number;
  visible: boolean;
  chunks: TileChunkDefinition[];
};

export type MapDefinition = {
  palette?: { tint: number; background: number; obstacle: number; accent: number };
  id: string;
  version: number;
  width: number;
  height: number;
  originOffset: Vector2;
  renderMode: 'tiled';
  tilemapAssetKey?: string;
  tilemapAssetPath?: string;
  tileSize?: {
    width: number;
    height: number;
  };
  arena: MapRect;
  tilesets: MapTilesetDefinition[];
  tileLayers: TileLayerDefinition[];
  groundStamps?: GroundStampDefinition[];
  markers: MapMarkerDefinition[];
  props: MapPropDefinition[];
  obelisks?: ObeliskDefinition[];
  caches?: ExplorationCacheDefinition[];
  restorationSites?: RestorationSiteDefinition[];
  hazards?: ArenaHazardDefinition[];
  collision: CollisionShapeDefinition[];
};
