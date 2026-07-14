import { createEnemy } from '@/game/core/entities/createEnemy';
import type { LevelWaveDefinition } from '@/game/content/levels/types';
import { WaveDirector, type WaveDefinition } from '@/game/core/waves/WaveDirector';
import { Enemy } from '@/game/core/characters/Enemy';
import type { PlayerState, Vector2 } from '@/shared/types/game';

/**
 * Наступление волн и спавн врагов для extraction-lite pressure loop.
 */
export class WaveSystem {
  private readonly director: WaveDirector;
  private readonly wavesEnabled: boolean;
  private readonly maxWaves: number;
  private spawnSequence = 0;

  constructor(params?: {
    waveTable?: LevelWaveDefinition[];
    enabled?: boolean;
  }) {
    const waveTable = (params?.waveTable ?? []).map((wave): WaveDefinition => ({
      waveIndex: wave.waveIndex,
      delayMs: wave.delayMs,
      spawnBudget: wave.spawnBudget,
      spawns: wave.spawns.map((spawn) => ({
        archetypeId: spawn.archetypeId,
        count: spawn.count,
      })),
    }));

    this.director = new WaveDirector(waveTable);
    this.wavesEnabled = params?.enabled ?? true;
    this.maxWaves = waveTable.length;
  }

  update(params: {
    deltaMs: number;
    enemies: Enemy[];
    player: PlayerState;
    map: { width: number; height: number };
    spawnPoints: Vector2[];
  }) {
    if (!this.wavesEnabled || this.maxWaves === 0) {
      return {
        enemies: params.enemies,
        currentWaveIndex: 0,
        currentThreatLevel: params.enemies.length,
        timeUntilNextWaveMs: 0,
        spawnBudget: 0,
        maxWaves: 0,
      };
    }

    const waveResult = this.director.update(params.deltaMs, params.enemies.length);
    if (!waveResult.spawnedWave) {
      return {
        enemies: params.enemies,
        currentWaveIndex: this.director.getCurrentWaveIndex(),
        currentThreatLevel: this.director.getThreatLevel(params.enemies.length),
        timeUntilNextWaveMs: this.director.getTimeUntilNextWaveMs(),
        spawnBudget: this.director.getSpawnBudget(),
        maxWaves: this.maxWaves,
      };
    }

    const spawnedEnemies = this.spawnWaveEnemies(
      waveResult.spawnedWave,
      params.player,
      params.map,
      params.spawnPoints,
    );

    return {
      enemies: [...params.enemies, ...spawnedEnemies],
      currentWaveIndex: this.director.getCurrentWaveIndex(),
      currentThreatLevel: this.director.getThreatLevel(params.enemies.length + spawnedEnemies.length),
      timeUntilNextWaveMs: this.director.getTimeUntilNextWaveMs(),
      spawnBudget: this.director.getSpawnBudget(),
      maxWaves: this.maxWaves,
    };
  }

  private spawnWaveEnemies(
    wave: WaveDefinition,
    player: PlayerState,
    map: { width: number; height: number },
    spawnPoints: Vector2[],
  ) {
    const enemies: Enemy[] = [];

    for (const spawn of wave.spawns) {
      for (let i = 0; i < spawn.count; i += 1) {
        const position = this.getSpawnPosition(player.position, map, spawnPoints, this.spawnSequence + i);
        enemies.push(
          createEnemy(
            `wave-${wave.waveIndex}-enemy-${this.spawnSequence + i}`,
            position.x,
            position.y,
            spawn.archetypeId,
          ),
        );
      }

      this.spawnSequence += spawn.count;
    }

    return enemies;
  }

  private getSpawnPosition(
    playerPosition: Vector2,
    map: { width: number; height: number },
    spawnPoints: Vector2[],
    seed: number,
  ) {
    if (spawnPoints.length > 0) {
      const spawnPoint = spawnPoints[seed % spawnPoints.length];
      return {
        x: clamp(spawnPoint.x + randomOffset() * 0.22, 80, map.width - 80),
        y: clamp(spawnPoint.y + randomOffset() * 0.22, 80, map.height - 80),
      };
    }

    const side = seed % 4;
    const padding = 80;

    switch (side) {
      case 0:
        return { x: padding, y: clamp(playerPosition.y + randomOffset(), padding, map.height - padding) };
      case 1:
        return { x: map.width - padding, y: clamp(playerPosition.y + randomOffset(), padding, map.height - padding) };
      case 2:
        return { x: clamp(playerPosition.x + randomOffset(), padding, map.width - padding), y: padding };
      default:
        return { x: clamp(playerPosition.x + randomOffset(), padding, map.width - padding), y: map.height - padding };
    }
  }
}

function randomOffset() {
  return (Math.random() - 0.5) * 520;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
