import type { LevelDefinition } from '@/game/content/levels/types';
import type { MapDefinition } from '@/game/content/maps/types';
import type { WorldState } from '@/game/core/world/WorldState';
import type { CollisionGrid } from '@/game/world/collision/CollisionGrid';
import type { SpatialGrid } from '@/game/world/spatial/SpatialGrid';
import type { Vector2 } from '@/shared/types/game';

export type BuiltLevel = {
  map: MapDefinition;
  level: LevelDefinition;
  initialState: WorldState;
  collisionGrid: CollisionGrid;
  spatialGrid: SpatialGrid;
  enemySpawnPoints: Vector2[];
};
