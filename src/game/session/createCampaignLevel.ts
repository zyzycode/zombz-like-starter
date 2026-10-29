import { resolveCampaignStage } from '@/game/content/campaign/campaignRoutes';
import { createMazeMap } from '@/game/content/campaign/createMazeMap';
import { LevelBuilder } from '@/game/world/level/LevelBuilder';
import type { LevelDefinition } from '@/game/content/levels/types';
import type { RunSession } from '@/game/core/world/RunSession';
import type { PlayerState } from '@/shared/types/game';

export async function createCampaignLevel(depth: number, runSession: RunSession, previousPlayer?: PlayerState, stageId?: string) {
  const stage = resolveCampaignStage(depth, stageId);
  if (!stage) throw new Error('Неизвестный уровень');
  const map = createMazeMap(stage, depth);
  const level: LevelDefinition = {
    id: stage.id, version: 1, mapId: map.id,
    playerSpawn: { markerKind: 'player_spawn' }, extractionZones: [], resourceSpawns: [], enemySpawners: [{ markerKind: 'enemy_spawn' }],
    rules: { waves: { enabled: true, table: stage.encounters.map((spawns, i) => ({ waveIndex: i + 1, delayMs: i === 0 ? 1400 : 1800, spawnBudget: spawns.reduce((n, s) => n + s.count, 0), spawns })) } },
  };
  const built = await new LevelBuilder({ getById: async () => map }, { getById: async () => level }).build({ levelId: level.id, runSession });
  if (previousPlayer) {
    const spawn = built.initialState.player;
    built.initialState.player = {
      ...structuredClone(previousPlayer), position: spawn.position, facing: spawn.facing,
      state: 'idle', direction: 'down', hurtTimerMs: 0, hurtFlashTimerMs: 0, knockbackVelocity: { x: 0, y: 0 },
      attack: { config: { ...previousPlayer.attack.config }, runtime: spawn.attack.runtime },
    };
  }
  return built;
}
