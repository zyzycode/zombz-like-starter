import Phaser from 'phaser';
import { TiledMapView } from '@/game/presentation/phaser/objects/TiledMapView';
import type { MapDefinition, MapPropDefinition } from '@/game/content/maps/types';

/** Static art reads declarative props; only map.collision defines gameplay cover. */
export class MapRenderer {
  private readonly tiledMapView: TiledMapView;
  private readonly scenery: Phaser.GameObjects.Graphics;
  private readonly mapBackground: Phaser.GameObjects.Rectangle;
  private props: Phaser.GameObjects.Image[] = [];
  private groundTexture: Phaser.GameObjects.RenderTexture | null = null;

  constructor(private readonly scene: Phaser.Scene) {
    this.scenery = scene.add.graphics().setDepth(2);
    this.tiledMapView = new TiledMapView(scene);
    this.mapBackground = scene.add.rectangle(0, 0, 1, 1, 0x243447).setOrigin(0, 0);
  }

  initialize(map: MapDefinition) {
    for (const prop of this.props) prop.destroy();
    this.props = [];
    this.groundTexture?.destroy();
    this.groundTexture = null;
    this.mapBackground.setSize(map.width, map.height).setFillStyle(map.palette?.background ?? 0x243447).setDepth(-2);
    this.scenery.clear();
    this.tiledMapView.initialize(map);
    if (map.groundStamps?.length) {
      this.groundTexture = this.scene.add.renderTexture(0, 0, map.width, map.height).setOrigin(0, 0).setDepth(0);
      const brush = this.scene.make.image({ key: map.groundStamps[0].textureKey, add: false });
      for (const stamp of map.groundStamps) {
        const origin = stamp.origin ?? { x: .5, y: .5 };
        brush.setTexture(stamp.textureKey, stamp.frame).setOrigin(origin.x, origin.y).setScale(stamp.scale ?? 1);
        this.groundTexture.draw(brush, stamp.position.x, stamp.position.y);
      }
      brush.destroy();
    }
    for (const prop of map.props) {
      if (prop.visual) {
        const { textureKey, frame, scale = 1, ground = false, origin = { x: .5, y: ground ? .5 : 1 } } = prop.visual;
        const art = this.scene.add.image(prop.position.x, prop.position.y, textureKey, frame)
          .setOrigin(origin.x, origin.y).setScale(scale)
          .setDepth(ground ? 1 : 100 + prop.position.y);
        this.props.push(art);
        if (!ground) {
          this.scenery.fillStyle(0x16232c, .18)
            .fillEllipse(prop.position.x + 3, prop.position.y - 4, prop.width * .68, 12 * scale);
        }
      } else {
        this.drawLegacyProp(prop, map);
      }
    }
  }

  destroy() {
    for (const prop of this.props) prop.destroy();
    this.props = [];
    this.groundTexture?.destroy();
    this.groundTexture = null;
    this.tiledMapView.destroy();
    this.mapBackground.destroy();
    this.scenery.destroy();
  }

  private drawLegacyProp(prop: MapPropDefinition, map: MapDefinition) {
    if (!map.palette) return;
    const { x, y } = prop.position;
    const g = this.scenery;
    g.fillStyle(0x101b20, .3).fillEllipse(x + 4, y + 18, prop.radius * 2 + 12, prop.radius * 1.4);
    g.fillStyle(map.palette.obstacle).fillRoundedRect(x - prop.radius, y - prop.radius, prop.radius * 2, prop.radius * 2, 14);
    g.lineStyle(3, map.palette.accent, .6).strokeRoundedRect(x - prop.radius + 5, y - prop.radius + 5, prop.radius * 2 - 10, prop.radius * 2 - 10, 10);
  }
}
