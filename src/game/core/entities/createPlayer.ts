import { Player } from '@/game/core/characters/Player';
import type { PlayerState } from '@/shared/types/game';

/** Создаёт стартовое состояние локального игрока. */
export function createPlayer() {
  const state: PlayerState = {
    id: 'local-player',
    position: { x: 960, y: 540 },
    speed: 280,
    mass: 1,
    hp: 100,
    maxHp: 100,
    radius: 16,
    facing: { x: 1, y: 0 },
    team: 'player',
    attack: {
      config: {
        type: 'melee',
        damageType: 'physical',
        damage: 50,
        range: 48,
        windupMs: 110,
        activeMs: 90,
        recoveryMs: 170,
        cooldownMs: 500,
        moveSpeedMultiplier: 0,
        radius: 14,
        knockback: 260,
        hitStopMs: 55,
        cameraShakeMs: 70,
        cameraShakeIntensity: 0.0035,
      },
      runtime: {
        isActive: false,
        elapsedMs: 0,
        cooldownRemainingMs: 0,
        hasAppliedHit: false,
        direction: 'right',
        phase: 'idle',
      },
    },
    hurtTimerMs: 0,
    hurtDurationMs: 120,
    hurtFlashTimerMs: 0,
    hurtFlashDurationMs: 110,
    knockbackVelocity: { x: 0, y: 0 },
    state: 'idle',
    direction: 'right',
  };

  return new Player(state);
}
