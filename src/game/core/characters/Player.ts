import { Character } from '@/game/core/characters/Character';
import type { AttackController } from '@/game/core/combat/AttackController';
import type { AttackPayload, InputState, PlayerState, Vector2 } from '@/shared/types/game';

/** Игрок использует общую систему состояний/анимаций, но управляется input-ом. */
export class Player extends Character {
  constructor(state: PlayerState) {
    super(state);
  }

  update(params: {
    input: InputState;
    deltaMs: number;
    attackController: AttackController;
    onHit: (attack: AttackPayload) => void;
    resolvePosition: (nextPosition: Vector2, radius: number) => Vector2;
  }) {
    this.updateCombatReaction(params.deltaMs, params.resolvePosition);

    if (this.hp <= 0) {
      this.state = 'death';
      return;
    }

    if (this.hurtTimerMs > 0) {
      this.state = 'hurt';
      return;
    }

    const attackUpdate = params.attackController.update(this, params.deltaMs, params.input.attackPressed);
    const horizontal = Number(params.input.right) - Number(params.input.left);
    const vertical = Number(params.input.down) - Number(params.input.up);
    const movementIntent = horizontal !== 0 ? { x: horizontal, y: 0 } : { x: 0, y: vertical };
    const isMoving = movementIntent.x !== 0 || movementIntent.y !== 0;

    this.move(movementIntent, params.deltaMs, attackUpdate.movementMultiplier, params.resolvePosition);

    if (!attackUpdate.isAttacking && isMoving) {
      this.faceTowards(movementIntent.x, movementIntent.y);
    }

    if (attackUpdate.hit) {
      params.onHit(attackUpdate.hit);
    }

    this.state = attackUpdate.isAttacking ? 'attack' : isMoving ? 'walk' : 'idle';
  }

  applyResolvedState(state: PlayerState) {
    this.hp = state.hp;
    this.maxHp = state.maxHp;
    this.hurtTimerMs = state.hurtTimerMs;
    this.hurtFlashTimerMs = state.hurtFlashTimerMs;
  }

  toState(): PlayerState {
    return this.toRuntime();
  }
}
