import Phaser from 'phaser';
import { characterAnimationLibrary, enemyAnimationLibrary } from '@/game/config/characterAnimations';
import { LOOT_TEXTURE_KEY, LOOT_TEXTURE_PATH } from '@/game/config/loot/lootTexture';
import {
  DESTRUCTIBLE_TEXTURE_ALT_KEY,
  DESTRUCTIBLE_TEXTURE_ALT_PATH,
  DESTRUCTIBLE_TEXTURE_KEY,
  DESTRUCTIBLE_TEXTURE_PATH,
} from '@/game/config/playerTexture';

/**
 * Сцена загрузки ассетов перед стартом основной игры.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload() {
    const animationLibraries = [characterAnimationLibrary, enemyAnimationLibrary];

    for (const library of animationLibraries) {
      for (const sheet of Object.values(library.sheets)) {
        this.load.spritesheet(sheet.key, sheet.path, {
          frameWidth: sheet.frameWidth,
          frameHeight: sheet.frameHeight,
        });
      }
    }

    this.load.image(DESTRUCTIBLE_TEXTURE_KEY, DESTRUCTIBLE_TEXTURE_PATH);
    this.load.image(DESTRUCTIBLE_TEXTURE_ALT_KEY, DESTRUCTIBLE_TEXTURE_ALT_PATH);
    this.load.image(LOOT_TEXTURE_KEY, LOOT_TEXTURE_PATH);

    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      const isCharacterSheet = animationLibraries.some((library) =>
        Object.values(library.sheets).some((sheet) => sheet.key === file.key),
      );
      const isDestructibleTexture =
        file.key === DESTRUCTIBLE_TEXTURE_KEY || file.key === DESTRUCTIBLE_TEXTURE_ALT_KEY;
      const isLootTexture = file.key === LOOT_TEXTURE_KEY;
      if (isCharacterSheet) {
        console.warn(`[BootScene] Спрайтшит персонажа не загружен для ключа: ${file.key}`);
      }
      if (isDestructibleTexture) {
        console.warn(
          `[BootScene] PNG объекта не загружена. Проверены пути: ${DESTRUCTIBLE_TEXTURE_PATH}, ${DESTRUCTIBLE_TEXTURE_ALT_PATH}`,
        );
      }
      if (isLootTexture) {
        console.warn(`[BootScene] PNG лута не загружена. Проверен путь: ${LOOT_TEXTURE_PATH}`);
      }
    });
  }

  create() {
    this.scene.start('game');
  }
}
