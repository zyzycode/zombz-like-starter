import Phaser from 'phaser';
import { buildAnimationName } from '@/game/animation/animationNames';
import { createAnimatorFromConfig } from '@/game/animation/createAnimatorFromConfig';
import { characterAnimationLibrary } from '@/game/config/characterAnimations';
import type { PlayerState } from '@/shared/types/game';

const PLAYER_SPRITE_FEET_OFFSET_Y = 12;

/** Отвечает за визуал игрока в Phaser. */
export class PlayerView {
  private readonly body: Phaser.GameObjects.Sprite;
  private readonly attackArc: Phaser.GameObjects.Arc;
  private readonly animator: ReturnType<typeof createAnimatorFromConfig>;

  constructor(private readonly scene: Phaser.Scene) {
    this.animator = createAnimatorFromConfig(scene, characterAnimationLibrary);

    const initialSheet = characterAnimationLibrary.sheets.heroIdle;
    this.body = this.scene.add.sprite(0, 0, initialSheet.key, 0).setDepth(10);

    this.attackArc = this.scene.add.circle(0, 0, 12, 0xf59e0b, 0.25).setDepth(9).setVisible(false);
  }

  /** Обновляет позицию и кратковременный индикатор атаки. */
  render(player: PlayerState, deltaMs: number) {
    // Логическая позиция персонажа считается точкой у ног, поэтому спрайт рисуем чуть выше.
    this.body.setPosition(player.position.x, player.position.y - PLAYER_SPRITE_FEET_OFFSET_Y);

    const requestedAnimation = buildAnimationName(player.state, player.direction);
    const fallbackAnimation = buildAnimationName(player.state === 'walk' ? 'walk' : 'idle', player.direction);
    const animationName = this.animator.has(requestedAnimation) ? requestedAnimation : fallbackAnimation;

    this.animator.play(animationName);
    this.animator.update(deltaMs);

    const frame = this.animator.getCurrentFrame();
    if (frame) {
      this.body.setTexture(frame.textureKey, frame.frameIndex);
    }

    this.body.setTint(player.hurtFlashTimerMs > 0 ? 0xffd4d4 : 0xffffff);

    const hitX = player.position.x + player.facing.x * player.attack.config.range;
    const hitY = player.position.y + player.facing.y * player.attack.config.range;

    const isActiveFrame = player.attack.runtime.isActive && player.attack.runtime.phase === 'active';
    this.attackArc
      .setPosition(hitX, hitY)
      .setFillStyle(isActiveFrame ? 0xf97316 : 0xf59e0b, isActiveFrame ? 0.4 : 0.18)
      .setVisible(player.attack.runtime.isActive);
  }

  /** Удаляет созданные графические объекты Phaser. */
  destroy() {
    this.body.destroy();
    this.attackArc.destroy();
  }
}
