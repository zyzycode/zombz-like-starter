import { CombatResolver } from '@/game/core/combat/CombatResolver';
import type { Damageable } from '@/game/core/contracts/GameplayContracts';
import type { ProjectileState, Vector2 } from '@/shared/types/game';

type ProjectileSpawn = Omit<ProjectileState, 'id'>;

/** Swept collision keeps fast missiles reliable at low and high frame rates. */
export class ProjectileSystem {
  private projectiles: ProjectileState[] = [];
  private sequence = 0;
  private readonly resolver = new CombatResolver();

  spawn(projectile: ProjectileSpawn) {
    this.projectiles.push({ ...projectile, position: { ...projectile.position }, velocity: { ...projectile.velocity }, id: `projectile-${++this.sequence}` });
  }

  getState(): ProjectileState[] { return structuredClone(this.projectiles); }

  update(deltaMs: number, targets: Damageable[], resolvePosition?: (position: Vector2, radius: number) => Vector2) {
    this.projectiles = this.projectiles.filter((projectile) => {
      const stepMs = Math.min(deltaMs, projectile.ttlMs);
      const start = projectile.position;
      const end = { x: start.x + projectile.velocity.x * stepMs / 1000, y: start.y + projectile.velocity.y * stepMs / 1000 };
      let hit: Damageable | null = null;
      let hitT = Infinity;
      for (const target of targets) {
        if (!target.isAlive || target.id === projectile.sourceId || target.team === projectile.team) continue;
        const t = intersection(start, end, target.position, target.radius + projectile.radius);
        if (t !== null && t < hitT) { hit = target; hitT = t; }
      }
      // Sample the same swept path against world collision, stopping at the first obstruction.
      const length = Math.hypot(end.x - start.x, end.y - start.y);
      const steps = Math.max(1, Math.ceil(length / Math.max(4, projectile.radius)));
      if (resolvePosition) {
        for (let step = 1; step <= steps; step++) {
          const t = step / steps;
          if (t > hitT) break;
          const point = { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t };
          const resolved = resolvePosition(point, projectile.radius);
          if (Math.hypot(resolved.x - point.x, resolved.y - point.y) > 0.5) return false;
        }
      }
      if (hit) {
        this.resolver.resolveAttack({
          sourceId: projectile.sourceId, team: projectile.team, type: 'melee', damageType: 'magic',
          damage: projectile.damage, range: 0, radius: projectile.radius + 0.01, direction: 'down',
          origin: { x: start.x + (end.x - start.x) * hitT, y: start.y + (end.y - start.y) * hitT },
          knockback: 0, hitStopMs: 0,
        }, [hit]);
        return false;
      }
      projectile.position = end;
      projectile.ttlMs -= deltaMs;
      return projectile.ttlMs > 0;
    });
  }
}

function intersection(start: Vector2, end: Vector2, center: Vector2, radius: number): number | null {
  const dx = end.x - start.x, dy = end.y - start.y;
  const ox = start.x - center.x, oy = start.y - center.y;
  const c = ox * ox + oy * oy - radius * radius;
  if (c <= 0) return 0;
  const a = dx * dx + dy * dy;
  if (a === 0) return null;
  const b = 2 * (ox * dx + oy * dy);
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const t = (-b - Math.sqrt(discriminant)) / (2 * a);
  return t >= 0 && t <= 1 ? t : null;
}
