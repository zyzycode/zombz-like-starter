import type Phaser from 'phaser';
import { directionToVector } from '@/game/core/math/directions';
import type { AttackConfig, Direction, Vector2 } from '@/shared/types/game';

/** Uses the same origin, reach and angle as the domain's attack shape. */
export function drawAttackShape(
  g: Phaser.GameObjects.Graphics, origin: Vector2, direction: Direction,
  config: Pick<AttackConfig, 'range' | 'radius' | 'arcDegrees'>,
  color: number, fillAlpha: number, progress?: number,
) {
  const facing = directionToVector(direction);
  g.fillStyle(color, fillAlpha).lineStyle(2, color, .8);
  if (config.arcDegrees !== undefined) {
    const radius = config.range + config.radius;
    const angle = Math.atan2(facing.y, facing.x);
    const half = config.arcDegrees * Math.PI / 360;
    g.beginPath();
    g.moveTo(origin.x, origin.y);
    g.arc(origin.x, origin.y, radius, angle - half, angle + half);
    g.closePath(); g.fillPath(); g.strokePath();
    if (progress !== undefined) {
      g.lineStyle(4, color, 1).beginPath();
      g.arc(origin.x, origin.y, radius, angle - half, angle - half + half * 2 * progress);
      g.strokePath();
    }
  } else {
    const x = origin.x + facing.x * config.range, y = origin.y + facing.y * config.range;
    g.fillCircle(x, y, config.radius); g.strokeCircle(x, y, config.radius);
    if (progress !== undefined) {
      g.lineStyle(3, color, 1).beginPath();
      g.arc(x, y, config.radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
      g.strokePath();
    }
  }
}
