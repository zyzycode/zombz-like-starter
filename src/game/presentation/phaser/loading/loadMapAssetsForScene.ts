import Phaser from 'phaser';
import type { MapDefinition } from '@/game/content/maps/types';

type MapAssets = Pick<MapDefinition, 'renderMode' | 'tilesets' | 'tileSize'>;

/** Scene owns the loader; abort cancels this wait, never another scene's requests. */
export async function loadMapAssetsForScene(
  scene: Phaser.Scene,
  map: MapAssets,
  signal: AbortSignal,
): Promise<void> {
  signal.throwIfAborted();
  if (map.renderMode !== 'tiled' || !map.tileSize) return;

  let needsLoad = false;
  for (const tileset of map.tilesets) {
    if (!tileset.imageKey || !tileset.imagePath || scene.textures.exists(tileset.imageKey)) continue;
    scene.load.spritesheet(tileset.imageKey, tileset.imagePath, {
      frameWidth: tileset.frameWidth ?? map.tileSize.width,
      frameHeight: tileset.frameHeight ?? map.tileSize.height,
    });
    needsLoad = true;
  }
  if (!needsLoad) return;

  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      scene.load.off(Phaser.Loader.Events.COMPLETE, onComplete);
      scene.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, onError);
      signal.removeEventListener('abort', onAbort);
    };
    const onComplete = () => { cleanup(); resolve(); };
    const onError = () => { cleanup(); reject(new Error('Failed to load map assets')); };
    const onAbort = () => { cleanup(); reject(signal.reason); };
    scene.load.once(Phaser.Loader.Events.COMPLETE, onComplete);
    scene.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, onError);
    signal.addEventListener('abort', onAbort, { once: true });
    try {
      scene.load.start();
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}
