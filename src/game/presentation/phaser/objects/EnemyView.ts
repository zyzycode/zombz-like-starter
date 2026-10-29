import Phaser from 'phaser';
import { buildAnimationName } from '@/game/animation/animationNames';
import { createAnimatorFromConfig } from '@/game/animation/createAnimatorFromConfig';
import { getEnemyAppearance } from '@/game/config/enemies/enemyAnimations';
import type { EnemyAppearance } from '@/game/config/enemies/enemyAnimations';
import type { EnemyState } from '@/shared/types/game';

type EnemyGraphics = {
  body: Phaser.GameObjects.Sprite;
  hpBarBg: Phaser.GameObjects.Rectangle;
  hpBar: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text | null;
  animator: ReturnType<typeof createAnimatorFromConfig>;
};

/** Distinct CC0 monsters share the domain's combat phases, not its collision geometry. */
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
      const appearance = getEnemyAppearance(enemy.archetypeId);
      const barWidth = boss ? 116 : enemy.archetypeId === 'brute' ? 42 : 32;
      const barY = enemy.position.y - appearance.height - 8;
      let graphics = this.items.get(enemy.id);
      if (!graphics) {
        const body = this.scene.add.sprite(enemy.position.x, enemy.position.y, appearance.initialTexture, 0)
          .setOrigin(appearance.feetOrigin.x, appearance.feetOrigin.y).setScale(appearance.scale);
        body.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        const hpBarBg = this.scene.add.rectangle(0, 0, barWidth + 4, boss ? 10 : 6, 0x111827).setDepth(2000);
        const hpBar = this.scene.add.rectangle(0, 0, barWidth, boss ? 6 : 4, boss ? 0xff628a : 0xef7d72).setOrigin(0, 0.5).setDepth(2001);
        const label = boss ? this.scene.add.text(0, 0, 'СТРАЖ РАЗЛОМА', {
          fontFamily: 'system-ui, sans-serif', fontSize: '11px', color: '#ffe2ea',
          stroke: '#1c1121', strokeThickness: 3,
        }).setOrigin(0.5, 1).setDepth(2001) : null;
        graphics = { body, hpBarBg, hpBar, label, animator: createAnimatorFromConfig(this.scene, appearance.library) };
        this.items.set(enemy.id, graphics);
      }
      const leaning = enemy.attack.runtime.isActive && enemy.attack.runtime.phase === 'windup';
      const lunge = !boss && enemy.attack.runtime.isActive && enemy.attack.runtime.phase === 'active' ? 5 : 0;
      graphics.body.setPosition(enemy.position.x + enemy.facing.x * lunge, enemy.position.y + enemy.facing.y * lunge)
        .setScale(appearance.scale * (leaning && !boss ? 1.06 : 1)).setDepth(100 + enemy.position.y);
      const requested = buildAnimationName(enemy.state, enemy.direction);
      graphics.animator.play(graphics.animator.has(requested) ? requested : buildAnimationName('idle', enemy.direction));
      graphics.animator.update(deltaMs);
      const frame = graphics.animator.getCurrentFrame();
      if (frame) graphics.body.setTexture(frame.textureKey, frame.frameIndex);
      this.renderBossAttack(graphics.body, appearance, enemy);
      graphics.body.setTint(enemy.hurtFlashTimerMs > 0 ? 0xffb9b9 : 0xffffff);
      const hpRatio = Phaser.Math.Clamp(enemy.hp / enemy.maxHp, 0, 1);
      const showBar = boss || hpRatio < 1;
      graphics.hpBarBg.setPosition(enemy.position.x, barY).setVisible(showBar);
      graphics.hpBar.setPosition(enemy.position.x - barWidth / 2, barY).setSize(barWidth * hpRatio, boss ? 6 : 4).setVisible(showBar);
      graphics.label?.setPosition(enemy.position.x, barY - 9);
    }
  }

  private renderBossAttack(body: Phaser.GameObjects.Sprite, appearance: EnemyAppearance, enemy: EnemyState) {
    const { config, runtime } = enemy.attack;
    if (!appearance.bossAttack || !runtime.isActive || enemy.state !== 'attack') return;
    const windup = runtime.phase === 'windup';
    const duration = windup ? config.windupMs : config.activeMs;
    const elapsed = windup ? runtime.elapsedMs : runtime.elapsedMs - config.windupMs;
    const count = windup ? 3 : 4;
    const column = runtime.phase === 'recovery' ? count - 1
      : Math.min(count - 1, Math.floor(Math.max(0, elapsed) / Math.max(1, duration) * count));
    const texture = windup ? appearance.bossAttack.charge[runtime.direction] : appearance.bossAttack.swing[runtime.direction];
    body.setTexture(texture, column);
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
