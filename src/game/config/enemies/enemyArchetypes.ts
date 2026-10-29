import type { EnemyArchetype } from '@/game/core/enemies/EnemyArchetype';
import type { AttackConfig } from '@/shared/types/game';

const claw: AttackConfig = {
  type: 'melee', damageType: 'physical', damage: 12, range: 38,
  windupMs: 400, activeMs: 100, recoveryMs: 240, cooldownMs: 1000,
  moveSpeedMultiplier: 0, radius: 23, knockback: 100, hitStopMs: 25,
};
function enemy(id: string, hp: number, speed: number, radius: number, attack: Partial<AttackConfig>, aiProfile: EnemyArchetype['aiProfile']): EnemyArchetype {
  return {
    stunDurationMultiplier: id === 'boss' ? 0.25 : 1,
    id, name: id, baseStats: { hp, hurtDurationMs: 160, hurtFlashDurationMs: 120, mass: radius / 20 },
    moveSpeed: speed, radius, aggroRange: 3000,
    attackDefinitions: [{ id: `${id}-attack`, config: { ...claw, ...attack } }],
    lootTableId: null, aiProfile, animationProfile: `enemy_${id}`,
  };
}

export const enemyArchetypes = {
  grunt: enemy('grunt', 100, 110, 18, { arcDegrees: 90 }, { kind: 'melee_chase', aggroRange: 3000, attackRangeBuffer: 0 }),
  runner: enemy('runner', 65, 180, 16,
    { damage: 8, range: 30, arcDegrees: 90, windupMs: 250, recoveryMs: 150, cooldownMs: 800 },
    { kind: 'runner', aggroRange: 3000, attackRangeBuffer: 0 }),
  brute: enemy('brute', 250, 75, 25,
    { damage: 24, range: 0, radius: 95, windupMs: 850, recoveryMs: 450, cooldownMs: 1800, knockback: 180, hitStopMs: 60, cameraShakeMs: 120, cameraShakeIntensity: 0.004 },
    { kind: 'brute', aggroRange: 3000, attackRangeBuffer: -12 }),
  ranged: enemy('ranged', 85, 105, 17,
    { damage: 13, windupMs: 650, recoveryMs: 300, cooldownMs: 1600 },
    { kind: 'ranged', aggroRange: 3000, preferredRange: 260, projectileId: 'enemy_bolt' }),
  boss: enemy('boss', 1100, 70, 38,
    { damage: 30, range: 0, radius: 130, windupMs: 1100, recoveryMs: 650, cooldownMs: 2400, knockback: 230, hitStopMs: 70, cameraShakeMs: 150, cameraShakeIntensity: 0.006 },
    { kind: 'brute', aggroRange: 3000, attackRangeBuffer: 140 }),
} satisfies Record<string, EnemyArchetype>;

export type EnemyArchetypeId = keyof typeof enemyArchetypes;
