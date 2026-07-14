import { createPlayer } from '@/game/core/entities/createPlayer';
import { createResourceNode } from '@/game/core/entities/createResourceNode';
import type { LevelRepository } from '@/game/content/levels/LevelRepository';
import type { LevelDefinition } from '@/game/content/levels/types';
import type { MapRepository } from '@/game/content/maps/MapRepository';
import type { MapDefinition, MapMarkerDefinition } from '@/game/content/maps/types';
import type { RunSession } from '@/game/core/world/RunSession';
import { CollisionGrid } from '@/game/world/collision/CollisionGrid';
import type { BuiltLevel } from '@/game/world/level/types';
import { SpatialGrid, type SpatialGridRecord } from '@/game/world/spatial/SpatialGrid';

export class LevelBuilder {
  constructor(
    private readonly mapRepository: MapRepository,
    private readonly levelRepository: LevelRepository,
  ) {}

  async build(params: { levelId: string; runSession: RunSession }): Promise<BuiltLevel> {
    const level = await this.levelRepository.getById(params.levelId);
    const map = await this.mapRepository.getById(level.mapId);
    const playerSpawnMarker = this.getSingleMarker(map, level.playerSpawn, 'player_spawn');

    const player = createPlayer();
    player.position.x = playerSpawnMarker.position.x;
    player.position.y = playerSpawnMarker.position.y;

    const resourceNodes = this.buildResourceNodes(map, level, player.position);
    const extractionZones = level.extractionZones.map((zone) => {
      const marker = this.getSingleMarker(map, zone.marker, 'extraction_zone');
      return {
        id: zone.id,
        position: { ...marker.position },
        radius: zone.radius,
        channelDurationMs: zone.channelDurationMs,
        isActive: zone.isActive,
        progressMs: 0,
      };
    });
    const enemySpawnPoints = level.enemySpawners.flatMap((selector) =>
      this.getMarkers(map, selector, 'enemy_spawn').map((marker) => ({ ...marker.position })),
    );
    const spatialGrid = new SpatialGrid(160);
    spatialGrid.rebuild(this.createInitialSpatialRecords(player.toState(), resourceNodes, extractionZones));

    return {
      map,
      level,
      collisionGrid: new CollisionGrid(map.width, map.height, map.collision),
      spatialGrid,
      enemySpawnPoints,
      initialState: {
        refs: {
          mapId: map.id,
          levelId: level.id,
        },
        player: player.toState(),
        enemies: [],
        destructibles: [],
        resourceNodes: resourceNodes.map((node) => node.toState()),
        droppedResources: [],
        extractionZones,
        timeMs: 0,
        runSession: params.runSession.toState(),
        runResult: null,
        wave: {
          maxWaves: level.rules.waves.table.length,
          currentWaveIndex: 0,
          nextWaveInMs: 0,
          threatLevel: 0,
          activeEnemies: 0,
        },
        combat: {
          hitStopRemainingMs: 0,
          impactPulse: 0,
          cameraShakePulse: 0,
          cameraShakeMs: 0,
          cameraShakeIntensity: 0,
        },
      },
    };
  }

  private buildResourceNodes(map: MapDefinition, level: LevelDefinition, playerSpawn: { x: number; y: number }) {
    const result = [];
    let nodeIndex = 0;

    for (const spawn of level.resourceSpawns) {
      const zone = this.getSingleMarker(map, spawn.marker, 'resource_area');

      result.push(
        ...this.createResourceNodesForZone(zone, spawn.nodeTypes, playerSpawn, spawn.minDistanceFromPlayer ?? 0, spawn.padding ?? 0, nodeIndex),
      );
      nodeIndex = result.length;
    }

    return result;
  }

  private createResourceNodesForZone(
    zone: MapMarkerDefinition,
    nodeTypes: LevelDefinition['resourceSpawns'][number]['nodeTypes'],
    playerSpawn: { x: number; y: number },
    minDistanceFromPlayer: number,
    padding: number,
    startIndex: number,
  ) {
    const nodes = [];
    let localIndex = startIndex;
    const zoneWidth = zone.width ?? 0;
    const zoneHeight = zone.height ?? 0;
    const originX = zone.position.x - zoneWidth / 2;
    const originY = zone.position.y - zoneHeight / 2;

    for (const nodeType of nodeTypes) {
      const x = originX + padding + Math.random() * Math.max(1, zoneWidth - padding * 2);
      const y = originY + padding + Math.random() * Math.max(1, zoneHeight - padding * 2);
      const distanceToPlayerSpawn = Math.hypot(x - playerSpawn.x, y - playerSpawn.y);
      if (distanceToPlayerSpawn < minDistanceFromPlayer) {
        continue;
      }

      nodes.push(createResourceNode(`node-${localIndex}`, nodeType, x, y));
      localIndex += 1;
    }

    return nodes;
  }

  private createInitialSpatialRecords(
    player: ReturnType<ReturnType<typeof createPlayer>['toState']>,
    resourceNodes: ReturnType<typeof createResourceNode>[],
    extractionZones: Array<{
      id: string;
      position: { x: number; y: number };
      radius: number;
    }>,
  ): SpatialGridRecord[] {
    return [
      {
        id: player.id,
        kind: 'player',
        position: player.position,
        radius: player.radius,
      },
      ...resourceNodes.map((node) => ({
        id: node.id,
        kind: 'resource' as const,
        position: { ...node.position },
        radius: node.radius,
      })),
      ...extractionZones.map((zone) => ({
        id: zone.id,
        kind: 'zone' as const,
        position: { ...zone.position },
        radius: zone.radius,
      })),
    ];
  }

  private getSingleMarker(
    map: MapDefinition,
    selector: LevelDefinition['playerSpawn'],
    expectedKind?: MapMarkerDefinition['kind'],
  ) {
    const markers = this.getMarkers(map, selector, expectedKind);
    const marker = markers[0];
    if (!marker) {
      throw new Error(
        `Map marker not found for selector: ${JSON.stringify(selector)}`,
      );
    }

    return marker;
  }

  private getMarkers(
    map: MapDefinition,
    selector: LevelDefinition['playerSpawn'],
    expectedKind?: MapMarkerDefinition['kind'],
  ) {
    let markers = selector.markerId
      ? map.markers.filter((item) => item.id === selector.markerId)
      : selector.markerKind
        ? map.markers.filter((item) => item.kind === selector.markerKind)
        : [];

    if (expectedKind) {
      markers = markers.filter((item) => item.kind === expectedKind);
    }

    if (markers.length === 0) {
      throw new Error(`Map marker not found for selector: ${JSON.stringify(selector)}`);
    }

    return markers;
  }
}
