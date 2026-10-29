import type { AbilityLoadout, ActiveAbilityId, ActiveAbilitySlot } from '@/game/core/progression/types';

export const ACTIVE_ABILITY_SLOTS: readonly ActiveAbilitySlot[] = ['z', 'x', 'c'];
export const DEFAULT_ABILITY_LOADOUT: Readonly<AbilityLoadout> = { z: 'whirlwind', x: 'frostWave', c: 'mend' };

export const ACTIVE_ABILITY_IDS: readonly ActiveAbilityId[] = ['whirlwind', 'frostWave', 'mend'];

/** Shared resource rules and labels; effects are resolved by AbilitySystem. */
export const ACTIVE_ABILITIES = {
  whirlwind: { name: 'Вихрь', manaCost: 30, cooldownMs: 4000, cooldownKey: 'whirlwindCooldownMs', pulseKey: 'whirlwindPulse' },
  frostWave: { name: 'Ледяная волна', manaCost: 30, cooldownMs: 7000, cooldownKey: 'frostWaveCooldownMs', pulseKey: 'frostWavePulse' },
  mend: { name: 'Восстановление', manaCost: 45, cooldownMs: 12000, cooldownKey: 'mendCooldownMs', pulseKey: 'mendPulse' },
} as const;

export function isActiveAbility(id: string): id is ActiveAbilityId {
  return id === 'whirlwind' || id === 'frostWave' || id === 'mend';
}
