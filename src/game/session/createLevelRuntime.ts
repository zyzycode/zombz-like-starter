import type { MapDefinition } from '@/game/content/maps/types';
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

export async function loadMapAssetsForScene(
  scene: Phaser.Scene,
  map: Pick<MapDefinition, 'renderMode' | 'tilemapAssetKey' | 'tilemapAssetPath' | 'tilesets' | 'tileSize'>,
) {
  if (map.renderMode !== 'tiled' || !map.tileSize) {
    return;
  }

  console.info('[loadMapAssetsForScene] Loading tiled assets', {
    tilemapAssetKey: map.tilemapAssetKey,
    tilemapAssetPath: map.tilemapAssetPath,
    tilesets: map.tilesets.map((tileset) => ({
      name: tileset.name,
      imageKey: tileset.imageKey,
      imagePath: tileset.imagePath,
    })),
  });

  let needsLoad = false;

  for (const tileset of map.tilesets) {
    if (!tileset.imageKey || !tileset.imagePath || scene.textures.exists(tileset.imageKey)) {
      continue;
    }

    scene.load.spritesheet(tileset.imageKey, tileset.imagePath, {
      frameWidth: map.tileSize.width,
      frameHeight: map.tileSize.height,
    });
    needsLoad = true;
  }

  if (!needsLoad) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    scene.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());
    scene.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, () =>
      reject(new Error('Failed to load map assets')),
    );
    scene.load.start();
  });
}
