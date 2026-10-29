import type { EnemyArchetypeId } from '@/game/config/enemies/enemyArchetypes';
import type { MapMarkerDefinition } from '@/game/content/maps/types';
import type { EliteModifierId, ResourceNodeType } from '@/shared/types/game';

export type LevelWaveDefinition = {
  waveIndex: number;
  delayMs: number;
  spawnBudget: number;
  spawns: Array<{
    archetypeId: EnemyArchetypeId;
    count: number;
    elite?: EliteModifierId;
  }>;
};

export type LevelMarkerSelector = {
  markerId?: string;
  markerKind?: MapMarkerDefinition['kind'];
};

export type LevelDefinition = {
  id: string;
  version: number;
  mapId: string;
  playerSpawn: LevelMarkerSelector;
  extractionZones: Array<{
    id: string;
    marker: LevelMarkerSelector;
    radius: number;
    channelDurationMs: number;
    isActive: boolean;
  }>;
  resourceSpawns: Array<{
    id: string;
    marker: LevelMarkerSelector;
    nodeTypes: ResourceNodeType[];
    minDistanceFromPlayer?: number;
    padding?: number;
  }>;
  enemySpawners: LevelMarkerSelector[];
  rules: {
    waves: {
      enabled: boolean;
      table: LevelWaveDefinition[];
    };
  };
};
