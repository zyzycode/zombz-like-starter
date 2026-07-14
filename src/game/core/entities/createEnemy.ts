import { Enemy } from '@/game/core/characters/Enemy';
import { enemyArchetypes, type EnemyArchetypeId } from '@/game/config/enemies/enemyArchetypes';
import type { EnemyState } from '@/shared/types/game';

/** Создаёт врага из archetype-конфига. */
export function createEnemy(id: string, x: number, y: number, archetypeId: EnemyArchetypeId = 'grunt') {
  const archetype = enemyArchetypes[archetypeId];
  const primaryAttack = archetype.attackDefinitions[0];
  const state: EnemyState = {
    id,
    position: { x, y },
    speed: archetype.moveSpeed,
    mass: archetype.baseStats.mass,
    hp: archetype.baseStats.hp,
    maxHp: archetype.baseStats.hp,
    radius: archetype.radius,
    facing: { x: 0, y: 1 },
    team: 'enemy',
    attack: {
      config: { ...primaryAttack.config },
      runtime: {
        isActive: false,
        elapsedMs: 0,
        cooldownRemainingMs: 0,
        hasAppliedHit: false,
        direction: 'down',
        phase: 'idle',
      },
    },
    hurtTimerMs: 0,
    hurtDurationMs: archetype.baseStats.hurtDurationMs,
    hurtFlashTimerMs: 0,
    hurtFlashDurationMs: archetype.baseStats.hurtFlashDurationMs,
    knockbackVelocity: { x: 0, y: 0 },
    state: 'idle',
    direction: 'down',
  };

  return new Enemy(state, archetype);
}
