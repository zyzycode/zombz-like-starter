import Phaser from 'phaser';
import { Camera, type CameraTarget } from '@/game/camera/Camera';
import { GameWorld } from '@/game/core/world/GameWorld';
import { KeyboardController } from '@/game/presentation/phaser/input/KeyboardController';
import { WorldRenderer } from '@/game/presentation/phaser/renderer/WorldRenderer';
import { createLevelRuntime, loadMapAssetsForScene } from '@/game/session/createLevelRuntime';
import { useHudStore } from '@/ui/hud/useHudStore';

function formatWaveCountdown(ms: number) {
  if (ms <= 0) {
    return 'now';
  }

  return `${(ms / 1000).toFixed(1)}s`;
}

function formatExtractionProgress(progressMs: number, durationMs: number) {
  return `${(progressMs / 1000).toFixed(1)}/${(durationMs / 1000).toFixed(1)}s`;
}

/** Основная игровая сцена: обновление мира, рендер и камера. */
export class GameScene extends Phaser.Scene {
  private world: GameWorld | null = null;
  private controller: KeyboardController | null = null;
  private worldRenderer: WorldRenderer | null = null;
  private cameraModel: Camera | null = null;
  private cameraTarget: CameraTarget | null = null;
  private lastCameraShakePulse = 0;

  constructor() {
    super('game');
  }

  create() {
    this.controller = new KeyboardController(this);
    useHudStore.getState().setErrorMessage(null);
    void this.bootWorld();
  }

  update(_: number, delta: number) {
    if (!this.world || !this.controller || !this.worldRenderer || !this.cameraModel || !this.cameraTarget) {
      return;
    }

    const input = this.controller.read();
    this.world.update(delta, input);

    const state = this.world.getState();
    this.cameraTarget.position.x = state.player.position.x;
    this.cameraTarget.position.y = state.player.position.y;
    this.cameraModel.update();

    this.worldRenderer.render(state, delta);
    this.worldRenderer.applyCamera(this.cameraModel);

    if (state.combat.cameraShakePulse !== this.lastCameraShakePulse) {
      this.lastCameraShakePulse = state.combat.cameraShakePulse;
      this.cameras.main.shake(state.combat.cameraShakeMs, state.combat.cameraShakeIntensity);
    }

    const firstEnemy = state.enemies[0];
    const firstExtractionZone = state.extractionZones[0];
    const extractionStatus = state.runResult?.outcome === 'extracted'
      ? 'extracted'
      : firstExtractionZone && firstExtractionZone.progressMs > 0
        ? 'channeling'
        : 'idle';

    useHudStore.getState().setStats({
      hp: state.player.hp,
      maxHp: state.player.maxHp,
      attackReady:
        !state.player.attack.runtime.isActive && state.player.attack.runtime.cooldownRemainingMs === 0,
      scrap: state.runSession.resourceLedger.scrap,
      ore: state.runSession.resourceLedger.ore,
      essence: state.runSession.resourceLedger.essence,
      totalResources: state.runSession.collectedResources,
      currentWave: state.wave.currentWaveIndex,
      maxWaves: state.wave.maxWaves,
      nextWaveLabel: formatWaveCountdown(state.wave.nextWaveInMs),
      threatLevel: state.wave.threatLevel,
      activeEnemies: state.wave.activeEnemies,
      resourceNodes: state.resourceNodes.length,
      droppedResources: state.droppedResources.length,
      extractionZones: state.extractionZones.length,
      extractionProgressLabel: firstExtractionZone
        ? formatExtractionProgress(firstExtractionZone.progressMs, firstExtractionZone.channelDurationMs)
        : '-',
      extractionStatus,
      x: Math.round(state.player.position.x),
      y: Math.round(state.player.position.y),
      fps: Math.round(this.game.loop.actualFps),
      enemyState: firstEnemy?.state ?? '-',
      enemyDirection: firstEnemy?.direction ?? '-',
      enemyHp: firstEnemy ? `${firstEnemy.hp}/${firstEnemy.maxHp}` : '-',
      enemyAttackActive: firstEnemy ? String(firstEnemy.attack.runtime.isActive) : '-',
    });
  }

  private async bootWorld() {
    try {
      const selectedLevelId = this.game.registry.get('selectedLevelId') as string | undefined;
      const { builtLevel, runSession } = await createLevelRuntime({
        levelId: selectedLevelId ?? 'my-first-map',
      });
      await loadMapAssetsForScene(this, builtLevel.map);
      this.world = new GameWorld({
        builtLevel,
        runSession,
      });

      const state = this.world.getState();
      this.cameraTarget = { position: { ...state.player.position } };
      this.cameraModel = new Camera({
        x: state.player.position.x,
        y: state.player.position.y,
        width: this.scale.width,
        height: this.scale.height,
        options: {
          bounds: {
            minX: 0,
            minY: 0,
            maxX: builtLevel.map.width,
            maxY: builtLevel.map.height,
          },
        },
      });
      this.cameraModel.setTarget(this.cameraTarget);

      this.worldRenderer = new WorldRenderer(this);
      this.worldRenderer.initialize(builtLevel.map, state, this.cameraModel);

      this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown level boot error';
      console.error('[GameScene] Failed to boot world', error);
      useHudStore.getState().setErrorMessage(message);
    }
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    if (!this.cameraModel || !this.worldRenderer) {
      return;
    }

    this.cameraModel.setViewportSize(gameSize.width, gameSize.height);
    this.worldRenderer.applyCamera(this.cameraModel);
  }

  shutdown() {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.worldRenderer?.destroy();
  }
}
