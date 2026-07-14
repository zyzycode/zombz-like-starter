import type { EnemyArchetypeId } from '@/game/config/enemies/enemyArchetypes';

export type WaveSpawnEntry = {
  archetypeId: EnemyArchetypeId;
  count: number;
};

export type WaveDefinition = {
  waveIndex: number;
  delayMs: number;
  spawnBudget: number;
  spawns: WaveSpawnEntry[];
};

export type WaveAdvanceResult = {
  spawnedWave: WaveDefinition | null;
};

/**
 * Хранит таймер волн и решает, когда наступает следующая волна.
 */
export class WaveDirector {
  private currentWaveIndex = 0;
  private timeUntilNextWaveMs: number;
  private threatLevel = 0;
  private spawnBudget = 0;

  constructor(private readonly waveTable: WaveDefinition[]) {
    this.timeUntilNextWaveMs = waveTable[0]?.delayMs ?? 0;
  }

  update(deltaMs: number, activeEnemyCount: number): WaveAdvanceResult {
    if (this.currentWaveIndex >= this.waveTable.length) {
      return { spawnedWave: null };
    }

    // Следующая волна не может начаться, пока жива предыдущая.
    // Таймер между волнами идёт только в "тихом окне" после полной зачистки.
    if (activeEnemyCount > 0) {
      return { spawnedWave: null };
    }

    this.timeUntilNextWaveMs = Math.max(0, this.timeUntilNextWaveMs - deltaMs);
    if (this.timeUntilNextWaveMs > 0) {
      return { spawnedWave: null };
    }

    const nextWave = this.waveTable[this.currentWaveIndex];
    this.currentWaveIndex = nextWave.waveIndex;
    this.threatLevel = nextWave.spawnBudget;
    this.spawnBudget = nextWave.spawnBudget;

    const upcomingWave = this.waveTable[this.currentWaveIndex];
    this.timeUntilNextWaveMs = upcomingWave?.delayMs ?? 0;

    return {
      spawnedWave: nextWave,
    };
  }

  getCurrentWaveIndex() {
    return this.currentWaveIndex;
  }

  getThreatLevel(activeEnemyCount: number) {
    return Math.max(this.threatLevel, activeEnemyCount);
  }

  getSpawnBudget() {
    return this.spawnBudget;
  }

  getTimeUntilNextWaveMs() {
    return this.timeUntilNextWaveMs;
  }

  isCompleted() {
    return this.currentWaveIndex >= this.waveTable.length && this.timeUntilNextWaveMs === 0;
  }
}
