import Phaser from 'phaser';
import type { WorldState } from '@/game/core/world/WorldState';
import type { EnemyState, Vector2 } from '@/shared/types/game';
import { drawAttackShape } from '@/game/presentation/phaser/renderer/drawAttackShape';

/** Reuses two graphics buffers for telegraphs, missiles and short spell effects. */
export class CombatEffectsRenderer {
  private readonly ground: Phaser.GameObjects.Graphics;
  private readonly air: Phaser.GameObjects.Graphics;
  private lastNovaPulse: number | null = null;
  private novaRemainingMs = 0;
  private novaPosition: Vector2 = { x: 0, y: 0 };

  constructor(scene: Phaser.Scene) {
    this.ground = scene.add.graphics().setDepth(5);
    this.air = scene.add.graphics().setDepth(1800);
  }

  render(state: WorldState, deltaMs: number) {
    this.ground.clear();
    this.air.clear();
    for (const enemy of state.enemies) this.drawTelegraph(enemy, state.player.position);
    for (const projectile of state.projectiles ?? []) {
      const speed = Math.hypot(projectile.velocity.x, projectile.velocity.y) || 1;
      const dx = projectile.velocity.x / speed, dy = projectile.velocity.y / speed;
      this.air.lineStyle(projectile.radius * 1.3, projectile.color, 0.25);
      this.air.lineBetween(projectile.position.x - dx * 25, projectile.position.y - dy * 25, projectile.position.x, projectile.position.y);
      this.air.fillStyle(projectile.color, 0.25);
      this.air.fillCircle(projectile.position.x, projectile.position.y, projectile.radius + 4);
      this.air.fillStyle(projectile.color, 1);
      this.air.fillCircle(projectile.position.x, projectile.position.y, projectile.radius);
      this.air.fillStyle(0xfff6dd, 0.95);
      this.air.fillCircle(projectile.position.x, projectile.position.y, projectile.radius * 0.4);
    }

    const pulse = state.player.abilities?.novaPulse ?? 0;
    if (this.lastNovaPulse !== null && pulse !== this.lastNovaPulse) {
      this.novaPosition = { ...state.player.position };
      this.novaRemainingMs = 420;
    }
    this.lastNovaPulse = pulse;
    if (this.novaRemainingMs > 0) {
      this.novaRemainingMs = Math.max(0, this.novaRemainingMs - deltaMs);
      const progress = 1 - this.novaRemainingMs / 420;
      const radius = 30 + progress * 115;
      this.air.lineStyle(6 * (1 - progress) + 1, 0x8de7ff, 1 - progress);
      this.air.strokeCircle(this.novaPosition.x, this.novaPosition.y, radius);
      this.ground.fillStyle(0x69cbff, 0.18 * (1 - progress));
      this.ground.fillCircle(this.novaPosition.x, this.novaPosition.y, 145);
    }
    if ((state.player.abilities?.dodgeRemainingMs ?? 0) > 0) {
      this.ground.lineStyle(2, 0x9cfff4, 0.8);
      this.ground.strokeCircle(state.player.position.x, state.player.position.y, state.player.radius + 5);
    }
  }

  private drawTelegraph(enemy: EnemyState, player: Vector2) {
    const { runtime, config } = enemy.attack;
    if (!runtime.isActive || runtime.phase !== 'windup') return;
    const progress = Phaser.Math.Clamp(runtime.elapsedMs / Math.max(1, config.windupMs), 0, 1);
    if (enemy.archetypeId === 'ranged') {
      const dx = player.x - enemy.position.x, dy = player.y - enemy.position.y;
      const length = Math.hypot(dx, dy) || 1;
      this.ground.lineStyle(2, 0xdba3ff, 0.25 + 0.6 * progress);
      this.ground.lineBetween(enemy.position.x, enemy.position.y, enemy.position.x + dx / length * 340, enemy.position.y + dy / length * 340);
      this.ground.lineStyle(2, 0xe5bcff, 0.9);
      this.ground.strokeCircle(enemy.position.x, enemy.position.y, 12 + progress * 8);
      return;
    }
    const color = enemy.archetypeId === 'boss' ? 0xff4e84 : 0xff7957;
    drawAttackShape(this.ground, enemy.position, runtime.direction, config, color, .08 + progress * .16, progress);
  }

  destroy() {
    this.ground.destroy();
    this.air.destroy();
  }
}
