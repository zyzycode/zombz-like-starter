import { buildAnimationName } from '@/game/animation/animationNames';
import type { ActiveAttackRuntime, AttackSource, Damageable } from '@/game/core/contracts/GameplayContracts';
import type { AnimationName } from '@/shared/types/game';
import type {
  AttackOwner,
  CharacterRuntime,
  CharacterState,
  DamageType,
  Direction,
  TeamId,
  Vector2,
} from '@/shared/types/game';

/**
 * Базовая игровая сущность с анимационным состоянием.
 * Подходит и для Player, и для Enemy.
 */
export abstract class Character implements AttackOwner, Damageable, AttackSource {
  id: string;
  position: Vector2;
  speed: number;
  mass: number;
  hp: number;
  maxHp: number;
  radius: number;
  facing: Vector2;
  team: TeamId;
  attack: CharacterRuntime['attack'];
  hurtTimerMs: number;
  hurtDurationMs: number;
  hurtFlashTimerMs: number;
  hurtFlashDurationMs: number;
  knockbackVelocity: Vector2;
  state: CharacterState;
  direction: Direction;

  constructor(params: CharacterRuntime) {
    this.id = params.id;
    this.position = params.position;
    this.speed = params.speed;
    this.mass = params.mass;
    this.hp = params.hp;
    this.maxHp = params.maxHp;
    this.radius = params.radius;
    this.facing = params.facing;
    this.team = params.team;
    this.attack = params.attack;
    this.hurtTimerMs = params.hurtTimerMs;
    this.hurtDurationMs = params.hurtDurationMs;
    this.hurtFlashTimerMs = params.hurtFlashTimerMs;
    this.hurtFlashDurationMs = params.hurtFlashDurationMs;
    this.knockbackVelocity = { ...params.knockbackVelocity };
    this.state = params.state;
    this.direction = params.direction;
  }

  getAnimationName(): AnimationName {
    return buildAnimationName(this.state, this.direction);
  }

  protected move(
    intent: Vector2,
    deltaMs: number,
    movementMultiplier: number,
    resolvePosition: (nextPosition: Vector2, radius: number) => Vector2,
  ) {
    const nextPosition = {
      x: this.position.x + intent.x * this.speed * movementMultiplier * (deltaMs / 1000),
      y: this.position.y + intent.y * this.speed * movementMultiplier * (deltaMs / 1000),
    };

    const resolvedPosition = resolvePosition(nextPosition, this.radius);
    this.position.x = resolvedPosition.x;
    this.position.y = resolvedPosition.y;
  }

  protected faceTowards(x: number, y: number) {
    const cardinalDirection = toCardinalDirection(x, y);
    const direction = vectorToDirection(cardinalDirection.x, cardinalDirection.y);
    if (!direction) {
      return;
    }

    this.direction = direction;
    this.facing = directionToVector(direction);
  }

  protected updateCombatReaction(
    deltaMs: number,
    resolvePosition: (nextPosition: Vector2, radius: number) => Vector2,
  ) {
    this.hurtTimerMs = Math.max(0, this.hurtTimerMs - deltaMs);
    this.hurtFlashTimerMs = Math.max(0, this.hurtFlashTimerMs - deltaMs);

    if (this.knockbackVelocity.x === 0 && this.knockbackVelocity.y === 0) {
      return;
    }

    const nextPosition = {
      x: this.position.x + this.knockbackVelocity.x * (deltaMs / 1000),
      y: this.position.y + this.knockbackVelocity.y * (deltaMs / 1000),
    };
    const resolvedPosition = resolvePosition(nextPosition, this.radius);
    this.position.x = resolvedPosition.x;
    this.position.y = resolvedPosition.y;

    const damping = Math.max(0, 1 - 10 * (deltaMs / 1000));
    this.knockbackVelocity.x *= damping;
    this.knockbackVelocity.y *= damping;

    if (Math.abs(this.knockbackVelocity.x) < 1) {
      this.knockbackVelocity.x = 0;
    }
    if (Math.abs(this.knockbackVelocity.y) < 1) {
      this.knockbackVelocity.y = 0;
    }
  }

  toRuntime(): CharacterRuntime {
    return {
      id: this.id,
      position: { ...this.position },
      speed: this.speed,
      mass: this.mass,
      hp: this.hp,
      maxHp: this.maxHp,
      radius: this.radius,
      facing: { ...this.facing },
      team: this.team,
      attack: {
        config: { ...this.attack.config },
        runtime: { ...this.attack.runtime },
      },
      hurtTimerMs: this.hurtTimerMs,
      hurtDurationMs: this.hurtDurationMs,
      hurtFlashTimerMs: this.hurtFlashTimerMs,
      hurtFlashDurationMs: this.hurtFlashDurationMs,
      knockbackVelocity: { ...this.knockbackVelocity },
      state: this.state,
      direction: this.direction,
    };
  }

  get isAlive() {
    return this.hp > 0;
  }

  applyDamage(amount: number, _damageType: DamageType) {
    this.hp = Math.max(0, this.hp - amount);
    this.hurtTimerMs = this.hurtDurationMs;
    this.hurtFlashTimerMs = this.hurtFlashDurationMs;
    this.state = this.hp > 0 ? 'hurt' : 'death';
  }

  applyKnockback(impulse: Vector2) {
    this.knockbackVelocity.x += impulse.x;
    this.knockbackVelocity.y += impulse.y;
  }

  getActiveAttackRuntime(): ActiveAttackRuntime | null {
    if (!this.attack.runtime.isActive) {
      return null;
    }

    return {
      sourceId: this.id,
      origin: { ...this.position },
      facing: { ...this.facing },
      direction: this.attack.runtime.direction,
      team: this.team,
      config: this.attack.config,
      runtime: this.attack.runtime,
    };
  }
}

export function toCardinalDirection(x: number, y: number) {
  if (x === 0 && y === 0) {
    return { x: 0, y: 0 };
  }

  if (Math.abs(x) >= Math.abs(y)) {
    return { x: Math.sign(x), y: 0 };
  }

  return { x: 0, y: Math.sign(y) };
}

export function vectorToDirection(x: number, y: number): Direction | null {
  if (x === 0 && y === 0) {
    return null;
  }

  if (x > 0) {
    return 'right';
  }
  if (x < 0) {
    return 'left';
  }
  if (y > 0) {
    return 'down';
  }
  return 'up';
}

export function directionToVector(direction: Direction) {
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
