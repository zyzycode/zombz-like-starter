import Phaser from 'phaser';
import type { MapDefinition, MapTilesetDefinition, TileLayerDefinition } from '@/game/content/maps/types';

export class TiledMapView {
  private layers: Phaser.GameObjects.RenderTexture[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  initialize(map: MapDefinition) {
    this.destroy();

    if (!map.tileSize) {
      throw new Error(`Missing tile size for tiled map: ${map.id}`);
    }

    const tileSize = map.tileSize;
    const sortedTilesets = [...map.tilesets]
      .filter((tileset) => Boolean(tileset.imageKey))
      .sort((left, right) => left.firstGid - right.firstGid);

    console.info('[TiledMapView] Initializing tiled map', {
      mapId: map.id,
      layers: map.tileLayers.map((layer) => layer.name),
      tilesets: sortedTilesets.map((tileset) => ({
        name: tileset.name,
        firstGid: tileset.firstGid,
        imageKey: tileset.imageKey,
        hasTexture: tileset.imageKey ? this.scene.textures.exists(tileset.imageKey) : false,
      })),
    });

    for (const layer of map.tileLayers) {
      if (!layer.visible) {
        continue;
      }

      const renderTexture = this.scene.add
        .renderTexture(0, 0, map.width, map.height)
        .setOrigin(0, 0)
        .setAlpha(layer.opacity)
        .setDepth(0);

      const stats = this.drawLayer(
        renderTexture,
        layer,
        sortedTilesets,
        tileSize.width,
        tileSize.height,
        map.originOffset,
      );
      console.info('[TiledMapView] Layer draw stats', {
        layer: layer.name,
        drawnTiles: stats.drawnTiles,
        missingTilesets: [...stats.missingTilesets],
      });
      this.layers.push(renderTexture);
    }
  }

  destroy() {
    for (const layer of this.layers) {
      layer.destroy();
    }

    this.layers = [];
  }

  private drawLayer(
    renderTexture: Phaser.GameObjects.RenderTexture,
    layer: TileLayerDefinition,
    tilesets: MapTilesetDefinition[],
    tileWidth: number,
    tileHeight: number,
    originOffset: { x: number; y: number },
  ) {
    let drawnTiles = 0;
    const missingTilesets = new Set<string>();

    for (const chunk of layer.chunks) {
      for (let index = 0; index < chunk.data.length; index += 1) {
        const rawGid = chunk.data[index];
        const gid = rawGid & 0x1fffffff;
        if (gid === 0) {
          continue;
        }

        const tileset = this.resolveTileset(gid, tilesets);
        if (!tileset?.imageKey) {
          missingTilesets.add(`gid:${gid}`);
          continue;
        }

        const frame = gid - tileset.firstGid;
        const localX = index % chunk.width;
        const localY = Math.floor(index / chunk.width);
        const worldX = (chunk.x + localX) * tileWidth + originOffset.x;
        const worldY = (chunk.y + localY) * tileHeight + originOffset.y;

        renderTexture.drawFrame(tileset.imageKey, frame, worldX, worldY);
        drawnTiles += 1;
      }
    }

    return {
      drawnTiles,
      missingTilesets,
    };
  }

  private resolveTileset(gid: number, tilesets: MapTilesetDefinition[]) {
    for (let index = tilesets.length - 1; index >= 0; index -= 1) {
      const tileset = tilesets[index];
      if (gid >= tileset.firstGid) {
        return tileset;
      }
    }

    return null;
  }
}
