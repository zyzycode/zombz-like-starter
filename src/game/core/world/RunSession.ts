import type { RunOutcome, RunResult } from '@/game/core/extraction/RunResult';
import {
  createEmptyResourceLedger,
  getResourceLedgerTotal,
  type ResourceLedger,
} from '@/game/core/resources/ResourceLedger';
import type { ResourceType } from '@/shared/types/game';

export type RunStatus = 'running' | 'completed';

export type RunSessionState = {
  runId: string;
  status: RunStatus;
  elapsedMs: number;
  currentThreatLevel: number;
  currentWaveIndex: number;
  collectedResources: number;
  resourceLedger: ResourceLedger;
  killedEnemies: number;
  playerClassId: string;
  startedAt: string;
  endedAt: string | null;
};

function createRunId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Хранит мета-состояние текущего run/session и готовит данные под extraction/result flow.
 */
export class RunSession {
  private readonly runId: string;
  private status: RunStatus;
  private elapsedMs: number;
  private currentThreatLevel: number;
  private currentWaveIndex: number;
  private readonly resourceLedger: ResourceLedger;
  private killedEnemies: number;
  private readonly playerClassId: string;
  private readonly startedAt: string;
  private endedAt: string | null;
  private result: RunResult | null;

  constructor(params: {
    runId?: string;
    playerClassId: string;
    startedAt?: string;
  }) {
    this.runId = params.runId ?? createRunId();
    this.status = 'running';
    this.elapsedMs = 0;
    this.currentThreatLevel = 1;
    this.currentWaveIndex = 0;
    this.resourceLedger = createEmptyResourceLedger();
    this.killedEnemies = 0;
    this.playerClassId = params.playerClassId;
    this.startedAt = params.startedAt ?? new Date().toISOString();
    this.endedAt = null;
    this.result = null;
  }

  tick(deltaMs: number) {
    if (this.status !== 'running') {
      return;
    }

    this.elapsedMs += deltaMs;
  }

  setThreatLevel(level: number) {
    this.currentThreatLevel = Math.max(0, level);
  }

  setWaveIndex(index: number) {
    this.currentWaveIndex = Math.max(0, index);
  }

  addCollectedResource(resourceType: ResourceType, amount: number) {
    this.resourceLedger[resourceType] = Math.max(0, this.resourceLedger[resourceType] + amount);
  }

  recordEnemyKill(count = 1) {
    this.killedEnemies += Math.max(0, count);
  }

  complete(outcome: RunOutcome) {
    if (this.result) {
      return this.result;
    }

    this.status = 'completed';
    this.endedAt = new Date().toISOString();
    this.result = {
      runId: this.runId,
      outcome,
      timeSurvivedMs: this.elapsedMs,
      wavesCleared: this.currentWaveIndex,
      resourcesCollected: getResourceLedgerTotal(this.resourceLedger),
      resourceLedger: { ...this.resourceLedger },
      enemiesKilled: this.killedEnemies,
      playerClassId: this.playerClassId,
    };

    return this.result;
  }

  getResult() {
    return this.result;
  }

  toState(): RunSessionState {
    return {
      runId: this.runId,
      status: this.status,
      elapsedMs: this.elapsedMs,
      currentThreatLevel: this.currentThreatLevel,
      currentWaveIndex: this.currentWaveIndex,
      collectedResources: getResourceLedgerTotal(this.resourceLedger),
      resourceLedger: { ...this.resourceLedger },
      killedEnemies: this.killedEnemies,
      playerClassId: this.playerClassId,
      startedAt: this.startedAt,
      endedAt: this.endedAt,
    };
  }
}
