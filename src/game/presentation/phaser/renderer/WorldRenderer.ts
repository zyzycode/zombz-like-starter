import Phaser from 'phaser';
import { Camera } from '@/game/camera/Camera';
import type { MapDefinition } from '@/game/content/maps/types';
import type { WorldState } from '@/game/core/world/WorldState';
import { CombatEffectsRenderer } from '@/game/presentation/phaser/renderer/CombatEffectsRenderer';
import { EntityRenderer } from '@/game/presentation/phaser/renderer/EntityRenderer';
import { MapRenderer } from '@/game/presentation/phaser/renderer/MapRenderer';
import { CacheView } from '@/game/presentation/phaser/objects/CacheView';
import { HazardView } from '@/game/presentation/phaser/objects/HazardView';

const CAMERA_ZOOM = 1.5;

/**
 * Рендерит объекты мира и применяет логическую камеру к Phaser.
 * UI остаётся вне этого класса.
 */
export class WorldRenderer {
  private readonly mapRenderer: MapRenderer;
  private readonly entityRenderer: EntityRenderer;
  private readonly effectRenderer: CombatEffectsRenderer;
  private readonly hazardView: HazardView;
  private readonly cacheView: CacheView;

  constructor(private readonly scene: Phaser.Scene) {
    this.mapRenderer = new MapRenderer(scene);
    this.entityRenderer = new EntityRenderer(scene);
    this.effectRenderer = new CombatEffectsRenderer(scene);
    this.hazardView = new HazardView(scene);
    this.cacheView = new CacheView(scene);
  }

  initialize(map: MapDefinition, initialState: WorldState, camera: Camera) {
    this.mapRenderer.initialize(map);
    this.render(initialState, 0);
    this.applyCamera(camera);
  }

  render(state: WorldState, deltaMs: number) {
    this.entityRenderer.render(state, deltaMs);
    this.effectRenderer.render(state.status === 'cleared' ? { ...state, projectiles: [] } : state, deltaMs);
    this.hazardView.render(state.status === 'cleared' ? [] : state.hazards ?? []);
    this.cacheView.render(state.caches ?? [], state.player);
  }

  applyCamera(camera: Camera) {
    const phaserCamera = this.scene.cameras.main;
    const bounds = camera.getBounds();

    phaserCamera.setViewport(0, 0, camera.width, camera.height);
    phaserCamera.setZoom(CAMERA_ZOOM);
    if (bounds) {
      phaserCamera.setBounds(
        bounds.minX,
        bounds.minY,
        bounds.maxX - bounds.minX,
        bounds.maxY - bounds.minY,
      );
    }
    phaserCamera.centerOn(camera.x, camera.y);
  }

  destroy() {
    this.mapRenderer.destroy();
    this.entityRenderer.destroy();
    this.effectRenderer.destroy();
    this.hazardView.destroy();
    this.cacheView.destroy();
  }
}
