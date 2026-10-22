import { createLevelRepository } from '@/game/content/levels/createLevelRepository';
import { createMapRepository } from '@/game/content/maps/createMapRepository';
import { RunSession } from '@/game/core/world/RunSession';
import { LevelBuilder } from '@/game/world/level/LevelBuilder';

export async function createLevelRuntime(params: { levelId: string }) {
  console.info('[createLevelRuntime] Building level runtime', params.levelId);
  const runSession = new RunSession({
    playerClassId: 'survivor',
  });
  const levelBuilder = new LevelBuilder(
    createMapRepository(),
    createLevelRepository(),
  );
  const builtLevel = await levelBuilder.build({
    levelId: params.levelId,
    runSession,
  });
  console.info('[createLevelRuntime] Built level', {
    levelId: builtLevel.level.id,
    mapId: builtLevel.map.id,
    renderMode: builtLevel.map.renderMode,
    markers: builtLevel.map.markers.length,
    tilesets: builtLevel.map.tilesets.length,
    tileLayers: builtLevel.map.tileLayers.length,
  });

  return {
    builtLevel,
    runSession,
  };
}
