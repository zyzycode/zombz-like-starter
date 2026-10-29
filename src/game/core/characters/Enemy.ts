import { ELITE_MODIFIERS } from '@/game/core/enemies/eliteModifiers';
import { Character, directionToVector } from '@/game/core/characters/Character';
import { steerAroundCollision } from '@/game/core/enemies/steerAroundCollision';
import type { CollisionSteeringMemory } from '@/game/core/enemies/steerAroundCollision';
import type { AttackController } from '@/game/core/combat/AttackController';
import type { EnemyArchetype } from '@/game/core/enemies/EnemyArchetype';
import type { EliteModifierId, DamageType, StatusEffect, AttackPayload, EnemyState, PlayerState, Vector2 } from '@/shared/types/game';

/** Базовый класс врага, совместимый с общей системой состояний и анимаций. */
export class Enemy extends Character {
  readonly elite: EliteModifierId | undefined;
  private readonly detourSide: number;
  private readonly steering: CollisionSteeringMemory = { direction: { x: 0, y: 0 }, remainingMs: 0 };
  constructor(
    state: EnemyState,
    readonly archetype: EnemyArchetype,
  ) {
    super(state);
    this.elite = state.elite;
    this.detourSide = [...state.id].reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % 2 ? 1 : -1;
  }

  update(params: {
    player: PlayerState;
    deltaMs: number;
    chaseRange: number;
    attackDistance: number;
    attackController: AttackController;
    onHit: (attack: AttackPayload) => void;
    resolvePosition: (nextPosition: Vector2, radius: number) => Vector2;
  }) {
    const wasStunned = this.stunRemainingMs > 0;
    this.updateCombatReaction(params.deltaMs, params.resolvePosition);

    if (this.hp <= 0) {
      this.state = 'death';
      return false;
    }

    if (wasStunned || this.hurtTimerMs > 0) {
      this.state = 'hurt';
      return true;
    }

    const dx = params.player.position.x - this.position.x;
    const dy = params.player.position.y - this.position.y;
    const distanceToPlayer = Math.hypot(dx, dy);
    const shouldChase = distanceToPlayer <= params.chaseRange;
    if (!this.attack.runtime.isActive && (dx !== 0 || dy !== 0)) this.faceTowards(dx, dy);
    const attackUpdate = params.attackController.update(
      this,
      params.deltaMs,
      distanceToPlayer <= params.attackDistance,
    );

    if (attackUpdate.hit) {
      params.onHit(attackUpdate.hit);
    }

    const ranged = this.archetype.aiProfile.kind === 'ranged' ? this.archetype.aiProfile : null;
    const retreat = ranged && distanceToPlayer < ranged.preferredRange * 0.7;
    const approach = distanceToPlayer > (ranged?.preferredRange ?? params.attackDistance);
    const shouldMove = shouldChase && !attackUpdate.isAttacking && (retreat || approach);
    const sign = retreat ? -1 : 1;
    const directIntent = shouldMove && distanceToPlayer > 0
      ? { x: dx / distanceToPlayer * sign, y: dy / distanceToPlayer * sign }
      : { x: 0, y: 0 };
    const movementIntent = steerAroundCollision({
      position: this.position, intent: directIntent, radius: this.radius,
      preferredSide: this.detourSide, resolvePosition: params.resolvePosition,
      memory: this.steering, deltaMs: params.deltaMs,
    });
    const isMoving = movementIntent.x !== 0 || movementIntent.y !== 0;
    if (isMoving && !attackUpdate.isAttacking) this.faceTowards(movementIntent.x, movementIntent.y);

    this.move(movementIntent, params.deltaMs, attackUpdate.movementMultiplier, params.resolvePosition);

    this.state = attackUpdate.isAttacking ? 'attack' : isMoving ? 'walk' : 'idle';
    this.facing = directionToVector(this.direction);
    return true;
  }

  override applyDamage(amount: number, damageType: DamageType) {
    const multiplier = this.elite && damageType === 'physical' ? ELITE_MODIFIERS[this.elite].physicalDamageMultiplier : 1;
    super.applyDamage(amount * multiplier, damageType);
  }

  override applyStatus(effect: StatusEffect) {
    super.applyStatus({ ...effect, durationMs: effect.durationMs * (this.archetype.stunDurationMultiplier ?? 1) });
  }

  applyResolvedState(state: EnemyState) {
    this.stunRemainingMs = state.stunRemainingMs ?? 0;
    this.hp = state.hp;
    this.maxHp = state.maxHp;
    this.hurtTimerMs = state.hurtTimerMs;
    this.hurtFlashTimerMs = state.hurtFlashTimerMs;
  }

  toState(): EnemyState {
    return { ...this.toRuntime(), archetypeId: this.archetype.id, elite: this.elite };
  }
}
