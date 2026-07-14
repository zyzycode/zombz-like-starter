import type {
  CollisionShapeDefinition,
  MapDefinition,
  MapMarkerDefinition,
  MapTilesetDefinition,
  TileChunkDefinition,
  TileLayerDefinition,
} from '@/game/content/maps/types';
import type { TiledMapAssetEntry } from '@/game/content/maps/tiled/HttpTiledMapRepository';
import type {
  TiledMapJson,
  TiledObject,
  TiledObjectLayer,
  TiledTileLayer,
} from '@/game/content/maps/tiled/types';

export class TiledMapAdapter {
  toMapDefinition(params: {
    mapId: string;
    tiled: TiledMapJson;
    assetEntry: TiledMapAssetEntry;
  }): MapDefinition {
    const assetTilesets = params.assetEntry.tilesets ?? [];
    const tileLayers = params.tiled.layers.filter(
      (layer): layer is TiledTileLayer => layer.type === 'tilelayer',
    );
    const objectLayers = params.tiled.layers.filter(
      (layer): layer is TiledObjectLayer => layer.type === 'objectgroup',
    );
    const collisionObjectLayers = objectLayers.filter((layer) => this.isCollisionObjectLayer(layer));
    const markerObjectLayers = objectLayers.filter((layer) => !this.isCollisionObjectLayer(layer));

    const worldBounds = this.computeWorldBounds(params.tiled, tileLayers, objectLayers);
    const markers = markerObjectLayers.flatMap((layer) =>
      layer.objects.map((object) => this.toMarker(object, worldBounds.offset)),
    );
    const collisionLayer = tileLayers.find((layer) => layer.name.toLowerCase() === 'collision');

    return {
      id: params.mapId,
      version: 1,
      width: worldBounds.width,
      height: worldBounds.height,
      originOffset: worldBounds.offset,
      renderMode: 'tiled',
      tilemapAssetKey: params.mapId,
      tilemapAssetPath: params.assetEntry.tilemapUrl,
      tileSize: {
        width: params.tiled.tilewidth,
        height: params.tiled.tileheight,
      },
      arena: {
        x: 0,
        y: 0,
        width: worldBounds.width,
        height: worldBounds.height,
      },
      tilesets: params.tiled.tilesets.map((tileset, index): MapTilesetDefinition => ({
        id: `tileset-${index}`,
        name: assetTilesets[index]?.name ?? this.basenameWithoutExtension(tileset.source),
        firstGid: tileset.firstgid,
        source: tileset.source,
        imageKey: assetTilesets[index]?.imageKey,
        imagePath: assetTilesets[index]?.imagePath,
      })),
      tileLayers: tileLayers.map((layer): TileLayerDefinition => ({
          id: String(layer.id),
          name: layer.name,
          kind: 'tile',
          width: layer.width,
          height: layer.height,
          opacity: layer.opacity ?? 1,
          visible: layer.visible,
          chunks: this.toChunks(layer),
        })),
      markers,
      props: [],
      collision: [
        ...(collisionLayer
          ? this.toCollisionShapes(
              collisionLayer,
              params.tiled.tilewidth,
              params.tiled.tileheight,
              worldBounds.offset,
              assetTilesets,
            )
          : []),
        ...collisionObjectLayers.flatMap((layer) =>
          layer.objects.flatMap((object) =>
            this.toObjectCollisionShapes(object, worldBounds.offset, `layer-${layer.id}`),
          ),
        ),
        ...tileLayers.flatMap((layer) =>
          this.toTilesetCollisionShapes(
            layer,
            params.tiled.tilewidth,
            params.tiled.tileheight,
            worldBounds.offset,
            assetTilesets,
          ),
        ),
      ],
    };
  }

  private toChunks(layer: TiledTileLayer): TileChunkDefinition[] {
    if (layer.chunks) {
      return layer.chunks.map((chunk) => ({
        x: chunk.x,
        y: chunk.y,
        width: chunk.width,
        height: chunk.height,
        data: [...chunk.data],
      }));
    }

    return [
      {
        x: layer.startx ?? 0,
        y: layer.starty ?? 0,
        width: layer.width,
        height: layer.height,
        data: [...(layer.data ?? [])],
      },
    ];
  }

  private toMarker(object: TiledObject, offset: { x: number; y: number }): MapMarkerDefinition {
    const width = object.width ?? 0;
    const height = object.height ?? 0;

    return {
      id: `${object.name || 'marker'}-${object.id}`,
      kind: this.toMarkerKind(object.name),
      position: {
        x: object.x + width / 2 + offset.x,
        y: object.y + height / 2 + offset.y,
      },
      width: width || undefined,
      height: height || undefined,
      label: object.name || undefined,
    };
  }

  private toMarkerKind(name: string): MapMarkerDefinition['kind'] {
    switch (name) {
      case 'player_spawn':
        return 'player_spawn';
      case 'enemy_spawn':
        return 'enemy_spawn';
      case 'extraction_zone':
        return 'extraction_zone';
      default:
        return 'resource_area';
    }
  }

  private toCollisionShapes(
    layer: TiledTileLayer,
    tileWidth: number,
    tileHeight: number,
    offset: { x: number; y: number },
    tilesets: NonNullable<TiledMapAssetEntry['tilesets']>,
  ): CollisionShapeDefinition[] {
    const shapes: CollisionShapeDefinition[] = [];
    const chunks = this.toChunks(layer);
    let shapeIndex = 0;

    for (const chunk of chunks) {
      for (let index = 0; index < chunk.data.length; index += 1) {
        const rawGid = chunk.data[index];
        const gid = rawGid & 0x1fffffff;
        if (gid === 0) {
          continue;
        }

        const tileCollision = this.findTileCollision(gid, tilesets);
        if (tileCollision) {
          continue;
        }

        const localX = index % chunk.width;
        const localY = Math.floor(index / chunk.width);
        shapes.push({
          id: `collision-${shapeIndex}`,
          kind: 'rect',
          position: {
            x: (chunk.x + localX) * tileWidth + tileWidth / 2 + offset.x,
            y: (chunk.y + localY) * tileHeight + tileHeight / 2 + offset.y,
          },
          width: tileWidth,
          height: tileHeight,
        });
        shapeIndex += 1;
      }
    }

    return shapes;
  }

  private toObjectCollisionShapes(
    object: TiledObject,
    offset: { x: number; y: number },
    sourcePrefix: string,
  ): CollisionShapeDefinition[] {
    if (object.ellipse) {
      const width = object.width ?? 0;
      const height = object.height ?? 0;
      return [{
        id: `${sourcePrefix}-object-${object.id}`,
        kind: 'circle',
        position: {
          x: object.x + width / 2 + offset.x,
          y: object.y + height / 2 + offset.y,
        },
        radius: Math.max(width, height) / 2,
      }];
    }

    if (object.polygon && object.polygon.length > 0) {
      return [{
        id: `${sourcePrefix}-object-${object.id}`,
        kind: 'polygon',
        position: {
          x: object.x + offset.x,
          y: object.y + offset.y,
        },
        points: object.polygon.map((point) => ({ x: point.x, y: point.y })),
      }];
    }

    const width = object.width ?? 0;
    const height = object.height ?? 0;
    if (width === 0 && height === 0) {
      return [];
    }

    return [{
      id: `${sourcePrefix}-object-${object.id}`,
      kind: 'rect',
      position: {
        x: object.x + width / 2 + offset.x,
        y: object.y + height / 2 + offset.y,
      },
      width,
      height,
    }];
  }

  private toTilesetCollisionShapes(
    layer: TiledTileLayer,
    tileWidth: number,
    tileHeight: number,
    offset: { x: number; y: number },
    tilesets: NonNullable<TiledMapAssetEntry['tilesets']>,
  ) {
    const shapes: CollisionShapeDefinition[] = [];
    const chunks = this.toChunks(layer);

    for (const chunk of chunks) {
      for (let index = 0; index < chunk.data.length; index += 1) {
        const rawGid = chunk.data[index];
        const gid = rawGid & 0x1fffffff;
        if (gid === 0) {
          continue;
        }

        const tileCollision = this.findTileCollision(gid, tilesets);
        if (!tileCollision) {
          continue;
        }

        const localX = index % chunk.width;
        const localY = Math.floor(index / chunk.width);
        const tileOrigin = {
          x: (chunk.x + localX) * tileWidth + offset.x,
          y: (chunk.y + localY) * tileHeight + offset.y,
        };

        for (const object of tileCollision.objects) {
          shapes.push(
            ...this.toObjectCollisionShapes(
              {
                ...object,
                x: tileOrigin.x + object.x,
                y: tileOrigin.y + object.y,
              },
              { x: 0, y: 0 },
              `tile-${layer.id}-${index}`,
            ),
          );
        }
      }
    }

    return shapes;
  }

  private computeWorldBounds(
    tiled: TiledMapJson,
    tileLayers: TiledTileLayer[],
    objectLayers: TiledObjectLayer[],
  ) {
    let minX = 0;
    let minY = 0;
    let maxX = tiled.width * tiled.tilewidth;
    let maxY = tiled.height * tiled.tileheight;

    for (const layer of tileLayers) {
      for (const chunk of this.toChunks(layer)) {
        minX = Math.min(minX, chunk.x * tiled.tilewidth);
        minY = Math.min(minY, chunk.y * tiled.tileheight);
        maxX = Math.max(maxX, (chunk.x + chunk.width) * tiled.tilewidth);
        maxY = Math.max(maxY, (chunk.y + chunk.height) * tiled.tileheight);
      }
    }

    for (const layer of objectLayers) {
      for (const object of layer.objects) {
        minX = Math.min(minX, object.x);
        minY = Math.min(minY, object.y);
        maxX = Math.max(maxX, object.x + (object.width ?? 0));
        maxY = Math.max(maxY, object.y + (object.height ?? 0));
      }
    }

    return {
      width: Math.max(tiled.width * tiled.tilewidth, maxX - minX),
      height: Math.max(tiled.height * tiled.tileheight, maxY - minY),
      offset: {
        x: -minX,
        y: -minY,
      },
    };
  }

  private basenameWithoutExtension(path: string) {
    const segments = path.split('/');
    const filename = segments[segments.length - 1] ?? path;
    return filename.replace(/\.[^.]+$/, '');
  }

  private isCollisionObjectLayer(layer: TiledObjectLayer) {
    const name = layer.name.toLowerCase();
    return name.includes('collision') || name.includes('collider');
  }

  private resolveTilesetIndex(
    gid: number,
    tilesets: NonNullable<TiledMapAssetEntry['tilesets']>,
  ) {
    for (let index = tilesets.length - 1; index >= 0; index -= 1) {
      const tileset = tilesets[index];
      if (tileset && gid >= (tileset.firstGid ?? 0)) {
        return index;
      }
    }

    return -1;
  }

  private findTileCollision(
    gid: number,
    tilesets: NonNullable<TiledMapAssetEntry['tilesets']>,
  ) {
    const tilesetIndex = this.resolveTilesetIndex(gid, tilesets);
    if (tilesetIndex === -1) {
      return null;
    }

    const tileset = tilesets[tilesetIndex];
    const firstGid = tileset.firstGid ?? 0;
    const localTileId = gid - firstGid;
    return tileset.collisionTiles?.find((tile) => tile.tileId === localTileId) ?? null;
  }
}
