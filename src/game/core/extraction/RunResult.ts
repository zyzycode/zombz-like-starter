import type { ResourceLedger } from '@/game/core/resources/ResourceLedger';

export type RunOutcome = 'extracted' | 'died' | 'abandoned';

export type RunResult = {
  runId: string;
  outcome: RunOutcome;
  timeSurvivedMs: number;
  wavesCleared: number;
  resourcesCollected: number;
  resourceLedger: ResourceLedger;
  enemiesKilled: number;
  playerClassId: string;
};
