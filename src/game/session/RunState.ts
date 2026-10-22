import type { WorldState } from '@/game/core/world/WorldState';
import type { RunBuild } from '@/game/core/progression/RunBuild';
import type { Item, SkillId } from '@/game/core/progression/types';
import type { MetaProgression } from '@/game/core/meta/MetaProgression';

export type RunPhase = 'menu' | 'loading' | 'playing' | 'paused' | 'reward' | 'won' | 'lost' | 'error';
import type { StageInfo } from '@/game/content/campaign/campaign';
export type RunSnapshot = {
  phase: RunPhase;
  depth: number;
  totalLevels: number;
  clearedLevels: number;
  stage: StageInfo;
  world: WorldState | null;
  build: ReturnType<RunBuild['getState']>;
  rewards: Item[];
  meta: ReturnType<MetaProgression['getState']>;
  metaError: string | null;
  error: string | null;
  earnedShards: number;
};
export type RunActions = {
  startRun(): void;
  chooseReward(id: string): void;
  equip(id: string): void;
  learn(id: SkillId): void;
  buyMetaUpgrade(id: 'vitality' | 'might' | 'wisdom'): void;
  togglePause(): void;
  returnToMenu(): void;
};
