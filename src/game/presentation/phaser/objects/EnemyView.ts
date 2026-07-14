import Phaser from 'phaser';
import { buildAnimationName } from '@/game/animation/animationNames';
import { createAnimatorFromConfig } from '@/game/animation/createAnimatorFromConfig';
import { enemyAnimationLibrary } from '@/game/config/characterAnimations';
import type { EnemyState } from '@/shared/types/game';

type EnemyGraphics = {
  body: Phaser.GameObjects.Sprite;
  hpBarBg: Phaser.GameObjects.Rectangle;
  hpBar: Phaser.GameObjects.Rectangle;
  animator: ReturnType<typeof createAnimatorFromConfig>;
};

/** Рендерит врагов, их анимации и полоски здоровья. */
export class EnemyView {
  private readonly items = new Map<string, EnemyGraphics>();

  constructor(private readonly scene: Phaser.Scene) {}

  render(enemies: EnemyState[], deltaMs: number) {
    const aliveIds = new Set(enemies.map((enemy) => enemy.id));

    for (const [id, graphics] of this.items.entries()) {
      if (!aliveIds.has(id)) {
        graphics.body.destroy();
        graphics.hpBar.destroy();
        graphics.hpBarBg.destroy();
        this.items.delete(id);
      }
    }

    for (const enemy of enemies) {
      let graphics = this.items.get(enemy.id);

      if (!graphics) {
        const initialSheet = enemyAnimationLibrary.sheets.enemyIdle;
        const animator = createAnimatorFromConfig(this.scene, enemyAnimationLibrary);
        const body = this.scene.add.sprite(enemy.position.x, enemy.position.y, initialSheet.key, 0).setDepth(8);
        const hpBarBg = this.scene.add.rectangle(enemy.position.x, enemy.position.y - 26, 32, 6, 0x111827).setDepth(9);
        const hpBar = this.scene.add
          .rectangle(enemy.position.x - 16, enemy.position.y - 26, 32, 4, 0xef4444)
          .setOrigin(0, 0.5)
          .setDepth(10);

        graphics = { body, hpBarBg, hpBar, animator };
        this.items.set(enemy.id, graphics);
      }

      graphics.body.setPosition(enemy.position.x, enemy.position.y);

      const requestedAnimation = buildAnimationName(enemy.state, enemy.direction);
      const animationName = graphics.animator.has(requestedAnimation)
        ? requestedAnimation
        : buildAnimationName('idle', enemy.direction);

      graphics.animator.play(animationName);
      graphics.animator.update(deltaMs);

      const frame = graphics.animator.getCurrentFrame();
      if (frame) {
        graphics.body.setTexture(frame.textureKey, frame.frameIndex);
      }

      graphics.body.setTint(enemy.hurtFlashTimerMs > 0 ? 0xffb4b4 : 0xffffff);

      const hpRatio = Phaser.Math.Clamp(enemy.hp / enemy.maxHp, 0, 1);
      graphics.hpBarBg.setPosition(enemy.position.x, enemy.position.y - 26).setVisible(hpRatio < 1);
      graphics.hpBar.setPosition(enemy.position.x - 16, enemy.position.y - 26).setSize(32 * hpRatio, 4);
      graphics.hpBar.setVisible(hpRatio < 1);
    }
  }

  destroy() {
    for (const graphics of this.items.values()) {
      graphics.body.destroy();
      graphics.hpBar.destroy();
      graphics.hpBarBg.destroy();
    }
    this.items.clear();
  }
}
