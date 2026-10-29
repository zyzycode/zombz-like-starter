import type { DamageType, Vector2 } from '@/shared/types/game';

export type ArenaHazardDefinition = {
  id: string;
  position: Vector2;
  radius: number;
  damage: number;
  damageType: DamageType;
  cooldownMs: number;
  warningMs: number;
  activeMs: number;
  initialDelayMs: number;
  theme: 'fire' | 'frost';
};

export type ArenaHazardState = ArenaHazardDefinition & {
  phase: 'cooldown' | 'warning' | 'active';
  phaseElapsedMs: number;
  pulseIndex: number;
};
