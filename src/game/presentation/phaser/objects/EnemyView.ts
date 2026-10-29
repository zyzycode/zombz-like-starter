import Phaser from 'phaser';
import { buildAnimationName } from '@/game/animation/animationNames';
import { createAnimatorFromConfig } from '@/game/animation/createAnimatorFromConfig';
import { getEnemyAppearance } from '@/game/config/enemies/enemyAnimations';
import { flareAttackFrame } from '@/game/config/flareAnimations';
import type { EnemyState } from '@/shared/types/game';

type EnemyGraphics = {
  body: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  hpBarBg: Phaser.GameObjects.Rectangle;
  hpBar: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text | null;
  stunLabel: Phaser.GameObjects.Text;
  animator: ReturnType<typeof createAnimatorFromConfig>;
};

/** Authored eight-way Flare creatures; collision sizes stay in domain archetypes. */
export class EnemyView {
  private readonly items = new Map<string, EnemyGraphics>();
  constructor(private readonly scene: Phaser.Scene) {}

  render(enemies: EnemyState[], deltaMs: number) {
    const aliveIds = new Set(enemies.map((enemy) => enemy.id));
    for (const [id, graphics] of this.items) {
      if (!aliveIds.has(id)) { this.destroyItem(graphics); this.items.delete(id); }
    }
    for (const enemy of enemies) {
      const boss = enemy.archetypeId === 'boss';
      const appearance = getEnemyAppearance(enemy.archetypeId);
      const barWidth = boss ? 116 : enemy.archetypeId === 'brute' ? 46 : 34;
      const barY = enemy.position.y - appearance.height - 8;
      let graphics = this.items.get(enemy.id);
      if (!graphics) {
        const body = this.scene.add.sprite(0, 0, appearance.initialTexture, 0)
          .setOrigin(appearance.feetOrigin.x, appearance.feetOrigin.y);
        const shadow = this.scene.add.ellipse(0, 0, enemy.radius * 1.8, enemy.radius * .7, 0x050909, .4).setDepth(3);
        const hpBarBg = this.scene.add.rectangle(0, 0, barWidth + 4, boss ? 10 : 6, 0x111827).setDepth(2000);
        const hpBar = this.scene.add.rectangle(0, 0, barWidth, boss ? 6 : 4, boss ? 0xff628a : 0xef7d72).setOrigin(0, .5).setDepth(2001);
        const label = boss ? this.scene.add.text(0, 0, 'ХРАНИТЕЛЬ РАЗЛОМА', {
          fontFamily: 'system-ui, sans-serif', fontSize: '11px', color: '#ffe2ea', stroke: '#1c1121', strokeThickness: 3,
        }).setOrigin(.5, 1).setDepth(2001) : null;
        const stunLabel = this.scene.add.text(0, 0, '', {
          fontFamily: 'system-ui, sans-serif', fontSize: '11px', color: '#ffe5a1', stroke: '#211c13', strokeThickness: 3,
        }).setOrigin(.5, 1).setDepth(2002).setVisible(false);
        graphics = { body, shadow, hpBarBg, hpBar, label, stunLabel, animator: createAnimatorFromConfig(this.scene, appearance.library) };
        this.items.set(enemy.id, graphics);
      }
      graphics.body.setPosition(enemy.position.x, enemy.position.y).setDepth(100 + enemy.position.y);
      graphics.shadow.setPosition(enemy.position.x, enemy.position.y + 2);
      graphics.animator.play(buildAnimationName(enemy.state, enemy.direction));
      graphics.animator.update(deltaMs);
      const frame = enemy.state === 'attack' && enemy.attack.runtime.isActive
        ? flareAttackFrame(appearance, enemy.attack) : graphics.animator.getCurrentFrame();
      if (frame) graphics.body.setTexture(frame.textureKey, frame.frameIndex);
      graphics.body.setTint(enemy.hurtFlashTimerMs > 0 ? 0xffb9b9 : 0xffffff);
      const hpRatio = Phaser.Math.Clamp(enemy.hp / enemy.maxHp, 0, 1);
      const showBar = boss || hpRatio < 1;
      graphics.hpBarBg.setPosition(enemy.position.x, barY).setVisible(showBar);
      graphics.hpBar.setPosition(enemy.position.x - barWidth / 2, barY).setSize(barWidth * hpRatio, boss ? 6 : 4).setVisible(showBar);
      graphics.label?.setPosition(enemy.position.x, barY - 9);
      const stunMs = enemy.stunRemainingMs ?? 0;
      graphics.stunLabel.setPosition(enemy.position.x, barY - (boss ? 25 : 9))
        .setText(`СТАН ${(stunMs / 1000).toFixed(1)} с`).setVisible(enemy.hp > 0 && stunMs > 0);
    }
  }

  private destroyItem(graphics: EnemyGraphics) {
    graphics.body.destroy(); graphics.shadow.destroy(); graphics.hpBar.destroy(); graphics.hpBarBg.destroy(); graphics.label?.destroy(); graphics.stunLabel.destroy();
  }
  destroy() { for (const graphics of this.items.values()) this.destroyItem(graphics); this.items.clear(); }
}
