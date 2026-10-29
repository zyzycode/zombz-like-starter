import type { Vector2 } from '@/shared/types/game';

export type ExplorationCacheDefinition = { id: string; position: Vector2; radius: number };
export type ExplorationCacheState = ExplorationCacheDefinition & { opened: boolean };
