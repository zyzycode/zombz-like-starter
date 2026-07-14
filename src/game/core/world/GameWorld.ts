import { Player } from '@/game/core/characters/Player';
import { ExtractionSystem } from '@/game/core/extraction/ExtractionSystem';
import { ExtractionZone } from '@/game/core/extraction/ExtractionZone';
import { LocalRunResultGateway } from '@/game/core/extraction/LocalRunResultGateway';
import { LootResolver } from '@/game/core/extraction/LootResolver';
import { Enemy } from '@/game/core/characters/Enemy';
import { DroppedResource } from '@/game/core/objects/DroppedResource';
import { ResourceNode } from '@/game/core/objects/ResourceNode';
import { RunSession } from '@/game/core/world/RunSession';
import { Destructible } from '@/game/core/objects/Destructible';
import { CleanupSystem } from '@/game/core/systems/CleanupSystem';
import { CollisionSystem } from '@/game/core/systems/CollisionSystem';
import { CombatSystem } from '@/game/core/systems/CombatSystem';
import { EnemyAiSystem } from '@/game/core/systems/EnemyAiSystem';
import { InteractionSystem } from '@/game/core/systems/InteractionSystem';
import { SeparationSystem } from '@/game/core/systems/SeparationSystem';
import { WaveSystem } from '@/game/core/systems/WaveSystem';
import type { MapDefinition } from '@/game/content/maps/types';
import type { RunResultGateway } from '@/game/core/extraction/RunResultGateway';
import type { WorldState } from '@/game/core/world/WorldState';
import type { CollisionGrid } from '@/game/world/collision/CollisionGrid';
import type { SpatialGrid } from '@/game/world/spatial/SpatialGrid';
import type { BuiltLevel } from '@/game/world/level/types';
import type { InputState, Vector2 } from '@/shared/types/game';

/**
 * Контейнер чистой игровой логики:
 * обновляет движение/атаку игрока и состояние разрушаемых объектов.
 */
export class GameWorld {
  private readonly levelId: string;
  private readonly map: MapDefinition;
  private readonly collisionGrid: CollisionGrid;
  private readonly spatialGrid: SpatialGrid;
  private readonly enemySpawnPoints: Vector2[];
  private readonly player: Player;
  private enemies: Enemy[];
  private destructibles: Destructible[];
  private resourceNodes: ResourceNode[];
  private extractionZones: ExtractionZone[];
  private droppedResources: DroppedResource[];
  private timeMs: number;
  private readonly runSession: RunSession;
  private readonly runResultGateway: RunResultGateway;
  private submittedRunResultId: string | null = null;
  private hitStopRemainingMs = 0;
  private impactPulse = 0;
  private cameraShakePulse = 0;
  private cameraShakeMs = 0;
  private cameraShakeIntensity = 0;
  private readonly combatSystem = new CombatSystem();
  private readonly enemyAiSystem = new EnemyAiSystem();
  private readonly cleanupSystem = new CleanupSystem();
  private readonly collisionSystem = new CollisionSystem();
  private readonly separationSystem = new SeparationSystem();
  private readonly lootResolver = new LootResolver();
  private readonly interactionSystem = new InteractionSystem();
  private readonly waveSystem: WaveSystem;
  private readonly extractionSystem = new ExtractionSystem();
  private currentWaveIndex: number;
  private maxWaves: number;
  private nextWaveInMs: number;
  private threatLevel: number;

  constructor(params: {
    builtLevel: BuiltLevel;
    runSession: RunSession;
    runResultGateway?: RunResultGateway;
  }) {
    const { builtLevel } = params;
    const state = builtLevel.initialState;

    this.map = builtLevel.map;
    this.levelId = builtLevel.level.id;
    this.collisionGrid = builtLevel.collisionGrid;
    this.spatialGrid = builtLevel.spatialGrid;
    this.enemySpawnPoints = builtLevel.enemySpawnPoints;
    this.player = new Player(state.player);
    this.enemies = [];
    this.destructibles = state.destructibles.map((item) => new Destructible(item));
    this.resourceNodes = state.resourceNodes.map((item) => new ResourceNode(item));
    this.extractionZones = state.extractionZones.map((item) => new ExtractionZone(item));
    this.droppedResources = state.droppedResources.map((item) => new DroppedResource(item));
    this.timeMs = state.timeMs;
    this.runSession = params.runSession;
    this.runResultGateway = params.runResultGateway ?? new LocalRunResultGateway();
    this.waveSystem = new WaveSystem({
      enabled: builtLevel.level.rules.waves.enabled,
      waveTable: builtLevel.level.rules.waves.table,
    });
    this.currentWaveIndex = state.wave.currentWaveIndex;
    this.maxWaves = state.wave.maxWaves;
    this.nextWaveInMs = state.wave.nextWaveInMs;
    this.threatLevel = state.wave.threatLevel;
    this.rebuildSpatialGrid();
  }

  getState(): WorldState {
    return structuredClone({
      refs: {
        mapId: this.map.id,
        levelId: this.levelId,
      },
      player: this.player.toState(),
      enemies: this.enemies.map((enemy) => enemy.toState()),
      destructibles: this.destructibles.map((item) => item.toState()),
      resourceNodes: this.resourceNodes.map((item) => item.toState()),
      droppedResources: this.droppedResources.map((item) => item.toState()),
      extractionZones: this.extractionZones.map((item) => item.toState()),
      timeMs: this.timeMs,
      runSession: this.runSession.toState(),
      runResult: this.runSession.getResult(),
      wave: {
        maxWaves: this.maxWaves,
        currentWaveIndex: this.currentWaveIndex,
        nextWaveInMs: this.nextWaveInMs,
        threatLevel: this.threatLevel,
        activeEnemies: this.enemies.length,
      },
      combat: {
        hitStopRemainingMs: this.hitStopRemainingMs,
        impactPulse: this.impactPulse,
        cameraShakePulse: this.cameraShakePulse,
        cameraShakeMs: this.cameraShakeMs,
        cameraShakeIntensity: this.cameraShakeIntensity,
      },
    });
  }

  update(deltaMs: number, input: InputState) {
    if (this.hitStopRemainingMs > 0) {
      this.hitStopRemainingMs = Math.max(0, this.hitStopRemainingMs - deltaMs);
      this.timeMs += deltaMs;
      this.runSession.tick(deltaMs);
      return;
    }

    if (this.runSession.getResult()) {
      this.submitRunResultIfNeeded();
      this.timeMs += deltaMs;
      return;
    }

    this.timeMs += deltaMs;
    this.runSession.tick(deltaMs);
    this.tickDroppedResources(deltaMs);
    const waveResult = this.waveSystem.update({
      deltaMs,
      enemies: this.enemies,
      player: this.player.toState(),
      map: this.map,
      spawnPoints: this.enemySpawnPoints,
    });
    this.enemies = waveResult.enemies;
    this.currentWaveIndex = waveResult.currentWaveIndex;
    this.maxWaves = waveResult.maxWaves;
    this.nextWaveInMs = waveResult.timeUntilNextWaveMs;
    this.threatLevel = waveResult.currentThreatLevel;
    this.runSession.setWaveIndex(waveResult.currentWaveIndex);
    this.runSession.setThreatLevel(waveResult.currentThreatLevel);

    const playerHits = this.combatSystem.updatePlayer({
      player: this.player,
      input,
      deltaMs,
      resolvePosition: this.resolveCharacterCollision,
    });

    const enemyHits = this.enemyAiSystem.update({
      enemies: this.enemies,
      player: this.player.toState(),
      deltaMs,
      resolvePosition: this.resolveCharacterCollision,
    });

    this.separationSystem.separate({
      units: [this.player, ...this.enemies],
      resolvePosition: this.resolveCharacterCollision,
    });

    const playerCombatResult = this.combatSystem.applyPlayerHits({
      hits: playerHits,
      enemies: this.enemies,
      destructibles: this.destructibles,
      resourceNodes: this.resourceNodes,
    });
    this.enemies = playerCombatResult.enemies;
    this.destructibles = playerCombatResult.destructibles;
    this.resourceNodes = playerCombatResult.resourceNodes;

    const playerHpBeforeEnemyHits = this.player.hp;
    const enemyCombatResult = this.combatSystem.applyEnemyHits({
      hits: enemyHits,
      player: this.player,
    });
    const playerTookDamage = this.player.hp < playerHpBeforeEnemyHits;

    this.resolveWorldDrops(
      playerCombatResult.destroyedDestructibles,
      playerCombatResult.destroyedResourceNodes,
    );
    const interactionResult = this.interactionSystem.update({
      actor: this.player,
      input,
      runSession: this.runSession,
      droppedResources: this.droppedResources,
      interactables: [...this.resourceNodes],
    });
    this.droppedResources = interactionResult.droppedResources;

    this.extractionSystem.update({
      actor: this.player,
      zones: this.extractionZones,
      deltaMs,
      playerTookDamage,
      runSession: this.runSession,
    });

    const cleanupResult = this.cleanupSystem.cleanup({
      enemies: this.enemies,
      destructibles: this.destructibles,
      resourceNodes: this.resourceNodes,
      droppedResources: this.droppedResources,
    });
    const removedEnemyCount = this.enemies.length - cleanupResult.enemies.length;
    this.enemies = cleanupResult.enemies;
    this.destructibles = cleanupResult.destructibles;
    this.resourceNodes = cleanupResult.resourceNodes;
    this.droppedResources = cleanupResult.droppedResources;
    if (removedEnemyCount > 0) {
      this.runSession.recordEnemyKill(removedEnemyCount);
    }

    if (!this.player.isAlive) {
      this.runSession.complete('died');
    }
    this.submitRunResultIfNeeded();

    const strongestHitStopMs = Math.max(
      playerCombatResult.feedback.hitStopMs,
      enemyCombatResult.feedback.hitStopMs,
    );
    if (strongestHitStopMs > 0) {
      this.hitStopRemainingMs = strongestHitStopMs;
    }

    const totalImpactCount =
      playerCombatResult.feedback.impactCount + enemyCombatResult.feedback.impactCount;
    if (totalImpactCount > 0) {
      this.impactPulse += 1;
    }

    const shakeMs = Math.max(
      playerCombatResult.feedback.cameraShakeMs,
      enemyCombatResult.feedback.cameraShakeMs,
    );
    const shakeIntensity = Math.max(
      playerCombatResult.feedback.cameraShakeIntensity,
      enemyCombatResult.feedback.cameraShakeIntensity,
    );
    if (shakeMs > 0 && shakeIntensity > 0) {
      this.cameraShakePulse += 1;
      this.cameraShakeMs = shakeMs;
      this.cameraShakeIntensity = shakeIntensity;
    }

    this.rebuildSpatialGrid();
  }

  private submitRunResultIfNeeded() {
    const result = this.runSession.getResult();
    if (!result || this.submittedRunResultId === result.runId) {
      return;
    }

    this.submittedRunResultId = result.runId;
    void this.runResultGateway.submitRunResult(result).catch((error: unknown) => {
      this.submittedRunResultId = null;
      console.error('[GameWorld] Failed to submit run result', error);
    });
  }

  /**
   * Не даёт игроку войти внутрь разрушаемых объектов.
   * Объекты считаются кругами по их размеру, что даёт стабильную и простую коллизию.
   */
  private resolveCharacterCollision = (position: { x: number; y: number }, radius: number) => {
    return this.collisionSystem.resolveCharacterCollision({
      position,
      radius,
      collisionGrid: this.collisionGrid,
      destructibles: this.destructibles,
      resourceNodes: this.resourceNodes,
    });
  };

  private resolveWorldDrops(
    destroyedDestructibles: Destructible[],
    destroyedNodes: ResourceNode[],
  ) {
    for (const source of [...destroyedDestructibles, ...destroyedNodes]) {
      this.droppedResources.push(
        ...this.lootResolver.resolveDrops({
          lootTableId: source.getLootTableId(),
          position: source.position,
          sourceId: source.id,
        }),
      );
    }
  }

  private tickDroppedResources(deltaMs: number) {
    for (const resource of this.droppedResources) {
      resource.tick(deltaMs);
    }
  }

  private rebuildSpatialGrid() {
    this.spatialGrid.rebuild([
      {
        id: this.player.id,
        kind: 'player',
        position: { ...this.player.position },
        radius: this.player.radius,
      },
      ...this.enemies.map((enemy) => ({
        id: enemy.id,
        kind: 'enemy' as const,
        position: { ...enemy.position },
        radius: enemy.radius,
      })),
      ...this.destructibles.map((item) => ({
        id: item.id,
        kind: 'destructible' as const,
        position: { ...item.position },
        radius: item.radius,
      })),
      ...this.resourceNodes.map((item) => ({
        id: item.id,
        kind: 'resource' as const,
        position: { ...item.position },
        radius: item.radius,
      })),
      ...this.droppedResources.map((item) => ({
        id: item.id,
        kind: 'drop' as const,
        position: { ...item.position },
        radius: item.pickupRadius,
      })),
      ...this.extractionZones.map((item) => ({
        id: item.id,
        kind: 'zone' as const,
        position: { ...item.position },
        radius: item.radius,
      })),
    ]);
  }
}
