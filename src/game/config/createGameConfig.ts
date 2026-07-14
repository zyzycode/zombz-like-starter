import Phaser from 'phaser';
import { BootScene } from '@/game/presentation/phaser/scenes/BootScene';
import { GameScene } from '@/game/presentation/phaser/scenes/GameScene';

/** Создаёт базовую конфигурацию Phaser-игры для текущего контейнера. */
export function createGameConfig(
  parent: HTMLElement,
  options: { initialLevelId: string },
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#1f2937',
    width: window.innerWidth,
    height: window.innerHeight,
    scene: [BootScene, GameScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: {
        debug: false,
      },
    },
    callbacks: {
      postBoot: (game) => {
        game.registry.set('selectedLevelId', options.initialLevelId);
      },
    },
  };
}
