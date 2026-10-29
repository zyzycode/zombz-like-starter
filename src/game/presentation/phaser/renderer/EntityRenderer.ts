import Phaser from 'phaser';
import { DestructibleView } from '@/game/presentation/phaser/objects/DestructibleView';
import { DroppedResourceView } from '@/game/presentation/phaser/objects/DroppedResourceView';
import { EnemyView } from '@/game/presentation/phaser/objects/EnemyView';
import { ExtractionZoneView } from '@/game/presentation/phaser/objects/ExtractionZoneView';
import { PlayerView } from '@/game/presentation/phaser/objects/PlayerView';
import { ResourceNodeView } from '@/game/presentation/phaser/objects/ResourceNodeView';
import { RestorationSiteView } from '@/game/presentation/phaser/objects/RestorationSiteView';
import type { WorldState } from '@/game/core/world/WorldState';

export class EntityRenderer {
  private readonly playerView: PlayerView;
  private readonly enemyView: EnemyView;
  private readonly destructibleView: DestructibleView;
  private readonly resourceNodeView: ResourceNodeView;
  private readonly droppedResourceView: DroppedResourceView;
  private readonly extractionZoneView: ExtractionZoneView;
  private readonly restorationSiteView: RestorationSiteView;

  constructor(scene: Phaser.Scene) {
    this.playerView = new PlayerView(scene);
    this.enemyView = new EnemyView(scene);
    this.destructibleView = new DestructibleView(scene);
    this.resourceNodeView = new ResourceNodeView(scene);
    this.droppedResourceView = new DroppedResourceView(scene);
    this.extractionZoneView = new ExtractionZoneView(scene);
    this.restorationSiteView = new RestorationSiteView(scene);
  }

  render(state: WorldState, deltaMs: number) {
    this.extractionZoneView.render(state.extractionZones);
    this.droppedResourceView.render(state.droppedResources);
    this.resourceNodeView.render(state.resourceNodes);
    this.restorationSiteView.render(state.restorationSites ?? [], state.player, state.timeMs);
    this.playerView.render(state.player, deltaMs);
    this.enemyView.render(state.enemies, deltaMs);
    this.destructibleView.render(state.destructibles);
  }

  destroy() {
    this.playerView.destroy();
    this.enemyView.destroy();
    this.destructibleView.destroy();
    this.resourceNodeView.destroy();
    this.droppedResourceView.destroy();
    this.extractionZoneView.destroy();
    this.restorationSiteView.destroy();
  }
}
