import { ELITE_MODIFIERS } from '@/game/core/enemies/eliteModifiers';
import { Enemy } from '@/game/core/characters/Enemy';
import { enemyArchetypes, type EnemyArchetypeId } from '@/game/config/enemies/enemyArchetypes';
import type { EliteModifierId, EnemyState } from '@/shared/types/game';

/** Создаёт врага из archetype-конфига. */
export function createEnemy(id: string, x: number, y: number, archetypeId: EnemyArchetypeId = 'grunt', elite?: EliteModifierId) {
  const archetype = enemyArchetypes[archetypeId];
  const modifier = elite ? ELITE_MODIFIERS[elite] : undefined;
  const hp = Math.round(archetype.baseStats.hp * (modifier?.hpMultiplier ?? 1));
  const primaryAttack = archetype.attackDefinitions[0];
  const state: EnemyState = {
    id, elite,
    position: { x, y },
    speed: archetype.moveSpeed * (modifier?.speedMultiplier ?? 1),
    mass: archetype.baseStats.mass,
    hp,
    maxHp: hp,
    radius: archetype.radius,
    facing: { x: 0, y: 1 },
    team: 'enemy',
    attack: {
      config: { ...primaryAttack.config, damage: primaryAttack.config.damage * (modifier?.damageMultiplier ?? 1) },
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
