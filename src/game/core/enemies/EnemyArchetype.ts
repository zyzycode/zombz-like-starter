import type { AttackConfig } from '@/shared/types/game';

export type EnemyBaseStats = {
  hp: number;
  hurtDurationMs: number;
  hurtFlashDurationMs: number;
  mass: number;
};

export type EnemyAttackDefinition = {
  id: string;
  config: AttackConfig;
};

export type EnemyAiProfile =
  | {
      kind: 'melee_chase';
      aggroRange: number;
      attackRangeBuffer: number;
    }
  | {
      kind: 'brute';
      aggroRange: number;
      attackRangeBuffer: number;
    }
  | {
      kind: 'runner';
      aggroRange: number;
      attackRangeBuffer: number;
    }
  | {
      kind: 'ranged';
      aggroRange: number;
      preferredRange: number;
      projectileId: string;
    };

export type EnemyArchetype = {
  id: string;
  name: string;
  baseStats: EnemyBaseStats;
  moveSpeed: number;
  radius: number;
  aggroRange: number;
  attackDefinitions: EnemyAttackDefinition[];
  lootTableId: string | null;
  aiProfile: EnemyAiProfile;
  animationProfile: string;
};
