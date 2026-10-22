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
  private spawnedWaveCount = 0;
  private clearedWaveCount = 0;
  private timeUntilNextWaveMs: number;
  private threatLevel = 0;
  private spawnBudget = 0;

  constructor(private readonly waveTable: WaveDefinition[]) {
    this.timeUntilNextWaveMs = waveTable[0]?.delayMs ?? 0;
  }

  update(deltaMs: number, activeEnemyCount: number): WaveAdvanceResult {
    this.recordClearedWave(activeEnemyCount);
    if (this.spawnedWaveCount >= this.waveTable.length) {
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

    const nextWave = this.waveTable[this.spawnedWaveCount];
    this.currentWaveIndex = nextWave.waveIndex;
    this.spawnedWaveCount += 1;
    this.threatLevel = nextWave.spawnBudget;
    this.spawnBudget = nextWave.spawnBudget;

    const upcomingWave = this.waveTable[this.spawnedWaveCount];
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

  recordClearedWave(activeEnemyCount: number) {
    if (activeEnemyCount === 0) this.clearedWaveCount = this.spawnedWaveCount;
  }

  getClearedWaveCount() {
    return this.clearedWaveCount;
  }

  isCompleted() {
    return this.clearedWaveCount === this.waveTable.length;
  }
}
