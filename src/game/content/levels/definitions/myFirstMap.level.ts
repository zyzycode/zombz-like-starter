import type { LevelDefinition } from '@/game/content/levels/types';

export const myFirstMapLevelDefinition: LevelDefinition = {
  id: 'my-first-map',
  version: 1,
  mapId: 'my-first-map',
  playerSpawn: {
    markerKind: 'player_spawn',
  },
  extractionZones: [
    {
      id: 'extract-northwest',
      marker: {
        markerKind: 'extraction_zone',
      },
      radius: 44,
      channelDurationMs: 4_000,
      isActive: true,
    },
  ],
  resourceSpawns: [],
  enemySpawners: [
    {
      markerKind: 'enemy_spawn',
    },
  ],
  rules: {
    waves: {
      enabled: true,
      table: [
        {
          waveIndex: 1,
          delayMs: 4_000,
          spawnBudget: 3,
          spawns: [{ archetypeId: 'grunt', count: 3 }],
        },
        {
          waveIndex: 2,
          delayMs: 8_000,
          spawnBudget: 5,
          spawns: [{ archetypeId: 'grunt', count: 5 }],
        },
      ],
    },
  },
};
