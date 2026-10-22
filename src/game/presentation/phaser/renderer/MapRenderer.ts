import Phaser from 'phaser';
import { TiledMapView } from '@/game/presentation/phaser/objects/TiledMapView';
import type { MapDefinition } from '@/game/content/maps/types';

export class MapRenderer {
  private readonly tiledMapView: TiledMapView;
  private readonly scenery: Phaser.GameObjects.Graphics;
  private readonly mapBackground: Phaser.GameObjects.Rectangle;

  constructor(private readonly scene: Phaser.Scene) {
    this.scenery = scene.add.graphics().setDepth(2);
    this.tiledMapView = new TiledMapView(scene);
    this.mapBackground = scene.add.rectangle(0, 0, 1, 1, 0x243447).setOrigin(0, 0);
  }

  initialize(map: MapDefinition) {
    this.mapBackground.setSize(map.width, map.height).setFillStyle(map.palette?.background ?? 0x243447).setDepth(-2);
    this.scenery.clear();
    if (map.palette) {
      const g = this.scenery;
      g.lineStyle(6, map.palette.accent, 0.45);
      g.strokeRect(8, 8, map.width - 16, map.height - 16);
      for (const prop of map.props) {
        const { x, y } = prop.position;
        g.fillStyle(0x101b20, 0.3).fillEllipse(x + 4, y + 18, prop.radius * 2 + 12, prop.radius * 1.4);
        g.fillStyle(map.palette.obstacle).fillRoundedRect(x - prop.radius, y - prop.radius, prop.radius * 2, prop.radius * 2, 14);
        g.lineStyle(3, map.palette.accent, 0.6).strokeRoundedRect(x - prop.radius + 5, y - prop.radius + 5, prop.radius * 2 - 10, prop.radius * 2 - 10, 10);
        g.lineStyle(2, 0xffffff, 0.16).lineBetween(x - 12, y - 17, x + 12, y - 17);
      }
    }
    this.tiledMapView.destroy();
    this.tiledMapView.initialize(map);
  }

  destroy() {
    this.tiledMapView.destroy();
    this.mapBackground.destroy();
    this.scenery.destroy();
  }
}
