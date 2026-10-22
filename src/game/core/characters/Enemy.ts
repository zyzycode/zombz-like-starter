import { Character, directionToVector } from '@/game/core/characters/Character';
import type { AttackController } from '@/game/core/combat/AttackController';
import type { EnemyArchetype } from '@/game/core/enemies/EnemyArchetype';
import type { AttackPayload, EnemyState, PlayerState, Vector2 } from '@/shared/types/game';

/** Базовый класс врага, совместимый с общей системой состояний и анимаций. */
export class Enemy extends Character {
  constructor(
    state: EnemyState,
    readonly archetype: EnemyArchetype,
  ) {
    super(state);
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
    this.updateCombatReaction(params.deltaMs, params.resolvePosition);

    if (this.hp <= 0) {
      this.state = 'death';
      return false;
    }

    if (this.hurtTimerMs > 0) {
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
    const movementIntent = shouldMove && distanceToPlayer > 0
      ? { x: dx / distanceToPlayer * sign, y: dy / distanceToPlayer * sign }
      : { x: 0, y: 0 };
    const isMoving = movementIntent.x !== 0 || movementIntent.y !== 0;

    this.move(movementIntent, params.deltaMs, attackUpdate.movementMultiplier, params.resolvePosition);

    this.state = attackUpdate.isAttacking ? 'attack' : isMoving ? 'walk' : 'idle';
    this.facing = directionToVector(this.direction);
    return true;
  }

  applyResolvedState(state: EnemyState) {
    this.hp = state.hp;
    this.maxHp = state.maxHp;
    this.hurtTimerMs = state.hurtTimerMs;
    this.hurtFlashTimerMs = state.hurtFlashTimerMs;
  }

  toState(): EnemyState {
    return { ...this.toRuntime(), archetypeId: this.archetype.id };
  }
}
