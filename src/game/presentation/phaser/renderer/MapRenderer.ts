import Phaser from 'phaser';
import { TiledMapView } from '@/game/presentation/phaser/objects/TiledMapView';
import type { MapDefinition } from '@/game/content/maps/types';

export class MapRenderer {
  private readonly tiledMapView: TiledMapView;
  private readonly mapBackground: Phaser.GameObjects.Rectangle;

  constructor(private readonly scene: Phaser.Scene) {
    this.tiledMapView = new TiledMapView(scene);
    this.mapBackground = scene.add.rectangle(0, 0, 1, 1, 0x243447).setOrigin(0, 0);
  }

  initialize(map: MapDefinition) {
    this.mapBackground.setSize(map.width, map.height);
    this.tiledMapView.destroy();
    this.tiledMapView.initialize(map);
  }

  destroy() {
    this.tiledMapView.destroy();
    this.mapBackground.destroy();
  }
}
