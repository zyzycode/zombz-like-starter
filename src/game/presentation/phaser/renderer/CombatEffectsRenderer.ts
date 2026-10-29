import Phaser from 'phaser';
import type { WorldState } from '@/game/core/world/WorldState';
import type { Direction, EnemyState, Vector2 } from '@/shared/types/game';
import { drawAttackShape } from '@/game/presentation/phaser/renderer/drawAttackShape';

type LearnedEffect = { pulse: number | null; remainingMs: number; position: Vector2; direction: Direction };
const newEffect = (): LearnedEffect => ({ pulse: null, remainingMs: 0, position: { x: 0, y: 0 }, direction: 'down' });

/** Reuses two graphics buffers for telegraphs, missiles and short spell effects. */
export class CombatEffectsRenderer {
  private readonly ground: Phaser.GameObjects.Graphics;
  private readonly air: Phaser.GameObjects.Graphics;
  private lastNovaPulse: number | null = null;
  private novaRemainingMs = 0;
  private lastShieldBashPulse: number | null = null;
  private shieldBashRemainingMs = 0;
  private shieldBashPosition: Vector2 = { x: 0, y: 0 };
  private shieldBashDirection: Direction = 'down';
  private readonly learnedEffects = {
    whirlwind: newEffect(), frostWave: newEffect(), mend: newEffect(),
    cleave: newEffect(), iceRing: newEffect(), secondWind: newEffect(),
  };
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
    const bashPulse = state.player.abilities?.shieldBashPulse ?? 0;
    if (this.lastShieldBashPulse !== null && bashPulse !== this.lastShieldBashPulse) {
      this.shieldBashPosition = { ...state.player.position };
      this.shieldBashDirection = state.player.abilities?.shieldBashDirection ?? state.player.direction;
      this.shieldBashRemainingMs = 240;
    }
    this.lastShieldBashPulse = bashPulse;
    if (this.shieldBashRemainingMs > 0) {
      this.shieldBashRemainingMs = Math.max(0, this.shieldBashRemainingMs - deltaMs);
      drawAttackShape(this.ground, this.shieldBashPosition, this.shieldBashDirection,
        { range: 0, radius: 110, arcDegrees: 120 }, 0xffd98a, .3 * this.shieldBashRemainingMs / 240);
    }
    this.drawLearnedEffects(state, deltaMs);
    if ((state.player.abilities?.dodgeRemainingMs ?? 0) > 0) {
      this.ground.lineStyle(2, 0x9cfff4, 0.8);
      this.ground.strokeCircle(state.player.position.x, state.player.position.y, state.player.radius + 5);
    }
  }

  private drawLearnedEffects(state: WorldState, deltaMs: number) {
    const abilities = state.player.abilities;
    for (const name of ['whirlwind', 'frostWave', 'mend', 'cleave', 'iceRing', 'secondWind'] as const) {
      const effect = this.learnedEffects[name];
      const pulse = abilities?.[`${name}Pulse`] ?? 0;
      const duration = name === 'mend' || name === 'secondWind' ? 600 : name === 'iceRing' ? 480 : 360;
      if (effect.pulse !== null && pulse !== effect.pulse) {
        effect.position = { ...state.player.position };
        effect.direction = (name === 'cleave' ? abilities?.cleaveDirection : abilities?.frostWaveDirection) ?? state.player.direction;
        effect.remainingMs = duration;
      }
      effect.pulse = pulse;
      if (effect.remainingMs <= 0) continue;
      effect.remainingMs = Math.max(0, effect.remainingMs - deltaMs);
      const opacity = effect.remainingMs / duration;
      const progress = 1 - opacity;
      const { x, y } = effect.position;
      if (name === 'whirlwind') {
        this.ground.fillStyle(0xffdca0, .12 * opacity).fillCircle(x, y, 125);
        this.air.lineStyle(4, 0xffdca0, opacity).beginPath();
        this.air.arc(x, y, 125, progress * Math.PI * 4, progress * Math.PI * 4 + Math.PI * 1.5);
        this.air.strokePath();
      } else if (name === 'frostWave') {
        drawAttackShape(this.ground, effect.position, effect.direction,
          { range: 0, radius: 200, arcDegrees: 90 }, 0x9defff, .25 * opacity, progress);
      } else if (name === 'cleave') {
        drawAttackShape(this.ground, effect.position, effect.direction,
          { range: 0, radius: 200, arcDegrees: 60 }, 0xffba62, .3 * opacity, progress);
      } else if (name === 'iceRing') {
        this.ground.fillStyle(0x7adfff, .12 * opacity).fillCircle(x, y, 180);
        this.ground.lineStyle(3, 0xb3f3ff, opacity).strokeCircle(x, y, 180);
        this.air.lineStyle(4, 0x7adfff, opacity).strokeCircle(x, y, 30 + progress * 150);
      } else if (name === 'secondWind') {
        this.ground.lineStyle(2, 0x83baff, opacity).strokeCircle(x, y, 18 + progress * 22);
        this.air.lineStyle(3, 0x83baff, opacity).strokeEllipse(x, y - 20 - progress * 45, 42, 14);
        this.air.lineStyle(2, 0xc5e5ff, opacity).strokeEllipse(x, y - progress * 32, 28, 10);
      } else {
        this.ground.lineStyle(3, 0x9ff1b7, opacity).strokeCircle(x, y, 20 + progress * 35);
        this.air.lineStyle(3, 0x9ff1b7, opacity);
        this.air.lineBetween(x - 6, y - 45 - progress * 15, x + 6, y - 45 - progress * 15);
        this.air.lineBetween(x, y - 51 - progress * 15, x, y - 39 - progress * 15);
      }
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
