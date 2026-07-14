import type { Damageable } from '@/game/core/contracts/GameplayContracts';
import type {
  AttackModifier,
  AttackPayload,
  Direction,
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

      const hitDistance = Math.hypot(target.position.x - hitX, target.position.y - hitY);
      const hitRadius = target.radius + resolvedAttack.radius;

      if (hitDistance > hitRadius) {
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

function directionToVector(direction: Direction) {
  switch (direction) {
    case 'up':
      return { x: 0, y: -1 };
    case 'down':
      return { x: 0, y: 1 };
    case 'left':
      return { x: -1, y: 0 };
    case 'right':
      return { x: 1, y: 0 };
  }
}

function scaleVector(vector: Vector2, scalar: number) {
  return {
    x: vector.x * scalar,
    y: vector.y * scalar,
  };
}
