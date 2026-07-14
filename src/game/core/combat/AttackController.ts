import type {
  AttackConfig,
  AttackOwner,
  AttackPhase,
  AttackPayload,
  Direction,
} from '@/shared/types/game';

export type AttackUpdateResult = {
  isAttacking: boolean;
  movementMultiplier: number;
  phase: AttackPhase;
  hit?: AttackPayload;
};

/**
 * Управляет жизненным циклом атаки:
 * старт, блокировка состояния, окно попадания и завершение.
 */
export class AttackController {
  update(actor: AttackOwner, deltaMs: number, wantsAttack: boolean): AttackUpdateResult {
    const runtime = actor.attack.runtime;
    const config = actor.attack.config;

    runtime.cooldownRemainingMs = Math.max(0, runtime.cooldownRemainingMs - deltaMs);

    if (wantsAttack && this.canStart(actor)) {
      this.start(actor);
    }

    let hit: AttackPayload | undefined;

    if (runtime.isActive) {
      const previousElapsedMs = runtime.elapsedMs;
      runtime.elapsedMs += deltaMs;
      runtime.phase = this.resolvePhase(config, runtime.elapsedMs);

      if (!runtime.hasAppliedHit && this.isInsideHitWindow(config, previousElapsedMs, runtime.elapsedMs)) {
        runtime.hasAppliedHit = true;
        hit = this.createPayload(actor);
      }

      if (runtime.elapsedMs >= this.getDurationMs(config)) {
        runtime.isActive = false;
        runtime.elapsedMs = 0;
        runtime.hasAppliedHit = false;
        runtime.phase = 'idle';
      }
    }

    return {
      isAttacking: runtime.isActive,
      movementMultiplier: runtime.isActive ? config.moveSpeedMultiplier : 1,
      phase: runtime.phase,
      hit,
    };
  }

  canStart(actor: AttackOwner) {
    return !actor.attack.runtime.isActive && actor.attack.runtime.cooldownRemainingMs === 0;
  }

  private start(actor: AttackOwner) {
    const runtime = actor.attack.runtime;
    const config = actor.attack.config;

    runtime.isActive = true;
    runtime.elapsedMs = 0;
    runtime.hasAppliedHit = false;
    runtime.cooldownRemainingMs = config.cooldownMs;
    runtime.direction = actor.direction;
    runtime.phase = 'windup';
    actor.facing = directionToVector(runtime.direction);
  }

  private createPayload(actor: AttackOwner): AttackPayload {
    const { config, runtime } = actor.attack;
    return {
      sourceId: actor.id,
      type: config.type,
      damageType: config.damageType,
      damage: config.damage,
      range: config.range,
      radius: config.radius,
      knockback: config.knockback,
      hitStopMs: config.hitStopMs,
      cameraShakeMs: config.cameraShakeMs,
      cameraShakeIntensity: config.cameraShakeIntensity,
      direction: runtime.direction,
      origin: { ...actor.position },
      team: actor.team,
    };
  }

  private isInsideHitWindow(config: AttackConfig, previousElapsedMs: number, currentElapsedMs: number) {
    const hitWindowStartMs = config.windupMs;
    const hitWindowEndMs = config.windupMs + config.activeMs;

    return previousElapsedMs < hitWindowEndMs && currentElapsedMs >= hitWindowStartMs;
  }

  private getDurationMs(config: AttackConfig) {
    return config.windupMs + config.activeMs + config.recoveryMs;
  }

  private resolvePhase(config: AttackConfig, elapsedMs: number): AttackPhase {
    if (elapsedMs < config.windupMs) {
      return 'windup';
    }
    if (elapsedMs < config.windupMs + config.activeMs) {
      return 'active';
    }
    if (elapsedMs < this.getDurationMs(config)) {
      return 'recovery';
    }
    return 'idle';
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
