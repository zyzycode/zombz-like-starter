import type { Damageable } from '@/game/core/contracts/GameplayContracts';
import { directionToVector } from '@/game/core/math/directions';
import type {
  AttackModifier,
  AttackPayload,
  Vector2,
} from '@/shared/types/game';

export type ResolveAttackResult = {
  hitCount: number;
};

/**
 * Отвечает за хитдетект и применение урона к целям.
 * Не знает про input, state machine и update loop.
 */
export class CombatResolver {
  resolveAttack<TTarget extends Damageable>(attack: AttackPayload, targets: TTarget[]): ResolveAttackResult {
    const resolvedAttack = this.applyModifiers(attack);
    const attackDirection = directionToVector(resolvedAttack.direction);
    const hitX = resolvedAttack.origin.x + attackDirection.x * resolvedAttack.range;
    const hitY = resolvedAttack.origin.y + attackDirection.y * resolvedAttack.range;
    let hitCount = 0;

    for (const target of targets) {
      if (!target.isAlive) {
        continue;
      }

      if (target.team === resolvedAttack.team && target.team !== 'neutral') {
        continue;
      }

      const intersects = resolvedAttack.arcDegrees === undefined
        ? Math.hypot(target.position.x - hitX, target.position.y - hitY) <= target.radius + resolvedAttack.radius
        : intersectsSector(resolvedAttack, target, attackDirection);
      if (!intersects) {
        continue;
      }

      target.applyDamage(resolvedAttack.damage, resolvedAttack.damageType);
      target.applyKnockback?.(scaleVector(attackDirection, resolvedAttack.knockback));
      hitCount += 1;
    }

    return { hitCount };
  }

  private applyModifiers(attack: AttackPayload): AttackPayload {
    if (!attack.modifiers?.length) {
      return attack;
    }

    return attack.modifiers.reduce<AttackPayload>((current, modifier) => {
      return {
        ...current,
        damage: this.applyDamageModifier(current.damage, modifier),
        range: current.range + (modifier.rangeBonus ?? 0),
        radius: current.radius + (modifier.radiusBonus ?? 0),
      };
    }, attack);
  }

  private applyDamageModifier(damage: number, modifier: AttackModifier) {
    if (modifier.damageMultiplier === undefined) {
      return damage;
    }

    return damage * modifier.damageMultiplier;
  }
}

function intersectsSector(attack: AttackPayload, target: Damageable, direction: Vector2) {
  const dx = target.position.x - attack.origin.x, dy = target.position.y - attack.origin.y;
  const distance = Math.hypot(dx, dy);
  if (distance > attack.range + attack.radius + target.radius) return false;
  if (distance <= target.radius) return true;
  const angle = Math.acos(Math.max(-1, Math.min(1, (dx * direction.x + dy * direction.y) / distance)));
  const targetMargin = Math.asin(Math.min(1, target.radius / distance));
  const halfArc = Math.max(0, Math.min(360, attack.arcDegrees ?? 0)) * Math.PI / 360;
  return angle <= halfArc + targetMargin;
}

function scaleVector(vector: Vector2, scalar: number) {
  return {
    x: vector.x * scalar,
    y: vector.y * scalar,
  };
}
