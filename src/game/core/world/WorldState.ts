import type { ExplorationCacheState } from '@/game/core/environment/ExplorationCache';
import type { RunResult } from '@/game/core/extraction/RunResult';
import type { RunSessionState } from '@/game/core/world/RunSession';
import type { RestorationSiteState } from '@/game/core/environment/RestorationSite';
import type { ArenaHazardState } from '@/game/core/environment/ArenaHazard';
import type {
  DestructibleState,
  DroppedResourceState,
  EnemyState,
  ExtractionZoneState,
  PlayerState,
  ProjectileState,
  ResourceNodeState,
} from '@/shared/types/game';

export type WorldState = {
  eliteObjective?: { total: number; defeated: number };
  status?: 'active' | 'cleared' | 'dead';
  projectiles?: ProjectileState[];
  caches?: ExplorationCacheState[];
  restorationSites?: RestorationSiteState[];
  hazards?: ArenaHazardState[];
  refs: {
    mapId: string;
    levelId: string;
  };
  player: PlayerState;
  enemies: EnemyState[];
  destructibles: DestructibleState[];
  resourceNodes: ResourceNodeState[];
  droppedResources: DroppedResourceState[];
  extractionZones: ExtractionZoneState[];
  timeMs: number;
  runSession: RunSessionState;
  runResult: RunResult | null;
  wave: {
    maxWaves: number;
    currentWaveIndex: number;
    nextWaveInMs: number;
    threatLevel: number;
    activeEnemies: number;
  };
  combat: {
    hitStopRemainingMs: number;
    impactPulse: number;
    cameraShakePulse: number;
    cameraShakeMs: number;
    cameraShakeIntensity: number;
  };
};
