import Phaser from 'phaser';
import { buildAnimationName } from '@/game/animation/animationNames';
import { createAnimatorFromConfig } from '@/game/animation/createAnimatorFromConfig';
import { characterAnimationLibrary, heroAttackFrame, heroSheet } from '@/game/config/characterAnimations';
import type { PlayerState } from '@/shared/types/game';

const PLAYER_SPRITE_FEET_ORIGIN_Y = 48 / 64;

/** Отвечает за визуал игрока в Phaser. */
export class PlayerView {
  private readonly body: Phaser.GameObjects.Sprite;
  private readonly attackArc: Phaser.GameObjects.Arc;
  private readonly animator: ReturnType<typeof createAnimatorFromConfig>;

  constructor(private readonly scene: Phaser.Scene) {
    this.animator = createAnimatorFromConfig(scene, characterAnimationLibrary);

    this.body = this.scene.add.sprite(0, 0, heroSheet.key, 0)
      .setOrigin(0.5, PLAYER_SPRITE_FEET_ORIGIN_Y).setScale(2).setDepth(10);
    this.body.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

    this.attackArc = this.scene.add.circle(0, 0, 12, 0xf59e0b, 0.25).setDepth(9).setVisible(false);
  }

  /** Обновляет позицию и кратковременный индикатор атаки. */
  render(player: PlayerState, deltaMs: number) {
    // Логическая позиция персонажа считается точкой у ног, поэтому спрайт рисуем чуть выше.
    this.body.setPosition(player.position.x, player.position.y).setDepth(100 + player.position.y);

    const requestedAnimation = buildAnimationName(player.state, player.direction);
    const fallbackAnimation = buildAnimationName(player.state === 'walk' ? 'walk' : 'idle', player.direction);
    const animationName = this.animator.has(requestedAnimation) ? requestedAnimation : fallbackAnimation;

    this.animator.play(animationName);
    this.animator.update(deltaMs);

    const frame = this.animator.getCurrentFrame();
    if (frame) {
      this.body.setTexture(frame.textureKey, frame.frameIndex);
    }

    this.body.setFlipX(player.direction === 'left');
    if (player.state === 'attack' && player.attack.runtime.isActive) {
      // Show the swing only during the domain hit window; recovery holds its last frame.
      const { config, runtime } = player.attack;
      const activeProgress = (runtime.elapsedMs - config.windupMs) / Math.max(1, config.activeMs);
      const column = runtime.phase === 'windup' ? 0 : runtime.phase === 'active'
        ? 1 + Math.min(1, Math.floor(Math.max(0, activeProgress) * 2)) : 3;
      this.body.setTexture(heroSheet.key, heroAttackFrame(runtime.direction, column));
      this.body.setFlipX(runtime.direction === 'left');
    }

    const dodging = (player.abilities?.dodgeRemainingMs ?? 0) > 0;
    this.body.setTint(dodging ? 0x9cfff4 : player.hurtFlashTimerMs > 0 ? 0xffd4d4 : 0xffffff);
    this.body.setAlpha(dodging ? 0.7 : 1);

    const hitX = player.position.x + player.facing.x * player.attack.config.range;
    const hitY = player.position.y + player.facing.y * player.attack.config.range;

    const isActiveFrame = player.attack.runtime.isActive && player.attack.runtime.phase === 'active';
    this.attackArc
      .setPosition(hitX, hitY)
      .setRadius(player.attack.config.radius)
      .setFillStyle(isActiveFrame ? 0xf97316 : 0xf59e0b, isActiveFrame ? 0.4 : 0.18)
      .setVisible(player.attack.runtime.isActive);
  }

  /** Удаляет созданные графические объекты Phaser. */
  destroy() {
    this.body.destroy();
    this.attackArc.destroy();
  }
}
