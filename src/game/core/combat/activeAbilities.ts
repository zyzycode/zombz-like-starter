import type { AbilityLoadout, ActiveAbilityId, ActiveAbilitySlot } from '@/game/core/progression/types';

export const ACTIVE_ABILITY_SLOTS: readonly ActiveAbilitySlot[] = ['z', 'x', 'c'];
export const DEFAULT_ABILITY_LOADOUT: Readonly<AbilityLoadout> = { z: 'whirlwind', x: 'frostWave', c: 'mend' };

export const ACTIVE_ABILITY_IDS: readonly ActiveAbilityId[] = ['whirlwind', 'frostWave', 'mend', 'cleave', 'iceRing', 'secondWind'];

/** Shared resource rules and labels; effects are resolved by AbilitySystem. */
export const ACTIVE_ABILITIES = {
  whirlwind: { name: 'Вихрь', manaCost: 30, cooldownMs: 4000, cooldownKey: 'whirlwindCooldownMs', pulseKey: 'whirlwindPulse' },
  frostWave: { name: 'Ледяная волна', manaCost: 30, cooldownMs: 7000, cooldownKey: 'frostWaveCooldownMs', pulseKey: 'frostWavePulse' },
  mend: { name: 'Восстановление', manaCost: 45, cooldownMs: 12000, cooldownKey: 'mendCooldownMs', pulseKey: 'mendPulse' },
  cleave: { name: 'Раскол', manaCost: 35, cooldownMs: 6500, cooldownKey: 'cleaveCooldownMs', pulseKey: 'cleavePulse' },
  iceRing: { name: 'Ледяное кольцо', manaCost: 45, cooldownMs: 11000, cooldownKey: 'iceRingCooldownMs', pulseKey: 'iceRingPulse' },
  secondWind: { name: 'Второе дыхание', manaCost: 0, cooldownMs: 18000, cooldownKey: 'secondWindCooldownMs', pulseKey: 'secondWindPulse' },
} as const;

export function isActiveAbility(id: string): id is ActiveAbilityId {
  return ACTIVE_ABILITY_IDS.some((ability) => ability === id);
}
