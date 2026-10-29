import Phaser from 'phaser';
import { buildAnimationName } from '@/game/animation/animationNames';
import { createAnimatorFromConfig } from '@/game/animation/createAnimatorFromConfig';
import { enemyAnimationLibrary } from '@/game/config/characterAnimations';
import type { EnemyState } from '@/shared/types/game';

type EnemyGraphics = {
  body: Phaser.GameObjects.Sprite;
  hpBarBg: Phaser.GameObjects.Rectangle;
  hpBar: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text | null;
  animator: ReturnType<typeof createAnimatorFromConfig>;
};

const appearances: Record<string, { tint: number; scale: number }> = {
  grunt: { tint: 0xb5dca4, scale: 1 },
  runner: { tint: 0xffd277, scale: 0.85 },
  ranged: { tint: 0xd8adff, scale: 1 },
  brute: { tint: 0xf49e71, scale: 1.25 },
  boss: { tint: 0xff819f, scale: 1.75 },
};

/** Existing enemy sprites are tinted/scaled as explicit alpha archetype variants. */
export class EnemyView {
  private readonly items = new Map<string, EnemyGraphics>();
  constructor(private readonly scene: Phaser.Scene) {}

  render(enemies: EnemyState[], deltaMs: number) {
    const aliveIds = new Set(enemies.map((enemy) => enemy.id));
    for (const [id, graphics] of this.items.entries()) {
      if (!aliveIds.has(id)) { this.destroyItem(graphics); this.items.delete(id); }
    }
    for (const enemy of enemies) {
      const boss = enemy.archetypeId === 'boss';
      const appearance = appearances[enemy.archetypeId ?? 'grunt'] ?? appearances.grunt;
      const barWidth = boss ? 116 : enemy.archetypeId === 'brute' ? 42 : 32;
      const barY = enemy.position.y - (boss ? 70 : 36 * appearance.scale);
      let graphics = this.items.get(enemy.id);
      if (!graphics) {
        const body = this.scene.add.sprite(enemy.position.x, enemy.position.y, enemyAnimationLibrary.sheets.enemyIdle.key, 0).setDepth(8);
        const hpBarBg = this.scene.add.rectangle(0, 0, barWidth + 4, boss ? 10 : 6, 0x111827).setDepth(2000);
        const hpBar = this.scene.add.rectangle(0, 0, barWidth, boss ? 6 : 4, boss ? 0xff628a : 0xef7d72).setOrigin(0, 0.5).setDepth(2001);
        const label = boss ? this.scene.add.text(0, 0, 'СТРАЖ РАЗЛОМА', {
          fontFamily: 'system-ui, sans-serif', fontSize: '11px', color: '#ffe2ea',
          stroke: '#1c1121', strokeThickness: 3,
        }).setOrigin(0.5, 1).setDepth(2001) : null;
        graphics = { body, hpBarBg, hpBar, label, animator: createAnimatorFromConfig(this.scene, enemyAnimationLibrary) };
        this.items.set(enemy.id, graphics);
      }
      graphics.body.setPosition(enemy.position.x, enemy.position.y - 10 * appearance.scale).setScale(appearance.scale).setDepth(100 + enemy.position.y);
      const requested = buildAnimationName(enemy.state, enemy.direction);
      graphics.animator.play(graphics.animator.has(requested) ? requested : buildAnimationName('idle', enemy.direction));
      graphics.animator.update(deltaMs);
      const frame = graphics.animator.getCurrentFrame();
      if (frame) graphics.body.setTexture(frame.textureKey, frame.frameIndex);
      graphics.body.setTint(enemy.hurtFlashTimerMs > 0 ? 0xffffff : appearance.tint);
      const hpRatio = Phaser.Math.Clamp(enemy.hp / enemy.maxHp, 0, 1);
      const showBar = boss || hpRatio < 1;
      graphics.hpBarBg.setPosition(enemy.position.x, barY).setVisible(showBar);
      graphics.hpBar.setPosition(enemy.position.x - barWidth / 2, barY).setSize(barWidth * hpRatio, boss ? 6 : 4).setVisible(showBar);
      graphics.label?.setPosition(enemy.position.x, barY - 9);
    }
  }

  private destroyItem(graphics: EnemyGraphics) {
    graphics.body.destroy();
    graphics.hpBar.destroy();
    graphics.hpBarBg.destroy();
    graphics.label?.destroy();
  }

  destroy() {
    for (const graphics of this.items.values()) this.destroyItem(graphics);
    this.items.clear();
  }
}
