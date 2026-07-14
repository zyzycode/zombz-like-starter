import type { MapRepository } from '@/game/content/maps/MapRepository';
import { TiledMapAdapter } from '@/game/content/maps/tiled/TiledMapAdapter';
import type {
  TiledMapJson,
  TiledTilesetTileCollision,
} from '@/game/content/maps/tiled/types';
import type { MapDefinition } from '@/game/content/maps/types';

export type TiledMapTilesetOverride = {
  source?: string;
  firstGid?: number;
  name?: string;
  imageKey?: string;
  imagePath?: string;
  collisionTiles?: TiledTilesetTileCollision[];
};

export type TiledMapAssetEntry = {
  tilemapUrl: string;
  tilesets?: TiledMapTilesetOverride[];
};

export class HttpTiledMapRepository implements MapRepository {
  constructor(
    private readonly manifest: Record<string, TiledMapAssetEntry>,
    private readonly adapter = new TiledMapAdapter(),
  ) {}

  async getById(mapId: string): Promise<MapDefinition> {
    const entry = this.manifest[mapId];
    if (!entry) {
      throw new Error(`Tiled map URL not found for mapId: ${mapId}`);
    }

    const response = await fetch(entry.tilemapUrl);
    if (!response.ok) {
      throw new Error(`Failed to load Tiled map ${mapId} from ${entry.tilemapUrl}`);
    }

    const tiled = (await response.json()) as TiledMapJson;
    const resolvedEntry: TiledMapAssetEntry = {
      ...entry,
      tilesets: await this.resolveTilesets(entry.tilemapUrl, tiled, entry.tilesets ?? []),
    };

    return this.adapter.toMapDefinition({
      mapId,
      tiled,
      assetEntry: resolvedEntry,
    });
  }

  private async resolveTilesets(
    tilemapUrl: string,
    tiled: TiledMapJson,
    overrides: TiledMapTilesetOverride[],
  ) {
    const resolved = [];

    for (const tilesetRef of tiled.tilesets) {
      const override =
        overrides.find((item) => item.source === tilesetRef.source)
        ?? overrides.find((item) => item.name === this.basenameWithoutExtension(tilesetRef.source));
      const tsxUrl = await this.resolveExistingUrl(tilemapUrl, tilesetRef.source);
      const tsxText = await this.fetchText(tsxUrl);
      const name = override?.name ?? this.readTsxAttribute(tsxText, 'name') ?? this.basenameWithoutExtension(tilesetRef.source);
      const imageSource = this.readTsxImageSource(tsxText);
      const imageUrl = override?.imagePath
        ?? (imageSource ? await this.resolveExistingUrl(tsxUrl, imageSource) : undefined);
      const collisionTiles = override?.collisionTiles ?? this.readTsxTileCollisions(tsxText);

      resolved.push({
        source: tilesetRef.source,
        firstGid: tilesetRef.firstgid,
        name,
        imageKey: override?.imageKey ?? `${this.sanitizeKey(tilemapUrl)}-${this.sanitizeKey(name)}`,
        imagePath: imageUrl,
        collisionTiles,
      });
    }

    return resolved;
  }

  private async resolveExistingUrl(baseUrl: string, relativePath: string) {
    const absoluteBaseUrl = this.toAbsoluteUrl(baseUrl);
    const candidates = [
      new URL(relativePath, absoluteBaseUrl).toString(),
      new URL(this.basename(relativePath), absoluteBaseUrl).toString(),
    ];

    for (const candidate of candidates) {
      const response = await fetch(candidate);
      if (response.ok) {
        return candidate;
      }
    }

    return candidates[0];
  }

  private toAbsoluteUrl(url: string) {
    if (/^https?:\/\//.test(url)) {
      return url;
    }

    const base =
      typeof document !== 'undefined'
        ? document.baseURI
        : typeof window !== 'undefined'
          ? window.location.origin
          : 'http://localhost/';

    return new URL(url, base).toString();
  }

  private async fetchText(url: string) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load asset metadata from ${url}`);
    }

    return response.text();
  }

  private readTsxAttribute(tsx: string, attribute: string) {
    const match = tsx.match(new RegExp(`${attribute}="([^"]+)"`));
    return match?.[1];
  }

  private readTsxImageSource(tsx: string) {
    const match = tsx.match(/<image[^>]*source="([^"]+)"/);
    return match?.[1];
  }

  private readTsxTileCollisions(tsx: string): TiledTilesetTileCollision[] {
    if (typeof DOMParser === 'undefined') {
      return [];
    }

    const doc = new DOMParser().parseFromString(tsx, 'application/xml');
    const tiles = [...doc.querySelectorAll('tile')];

    return tiles.flatMap((tile) => {
      const tileId = Number(tile.getAttribute('id'));
      const objectNodes = [...tile.querySelectorAll('objectgroup > object')];
      if (!Number.isFinite(tileId) || objectNodes.length === 0) {
        return [];
      }

      return [{
        tileId,
        objects: objectNodes.map((objectNode) => this.parseTsxObject(objectNode)),
      }];
    });
  }

  private parseTsxObject(objectNode: Element) {
    return {
      id: Number(objectNode.getAttribute('id') ?? 0),
      name: objectNode.getAttribute('name') ?? '',
      type: objectNode.getAttribute('type') ?? '',
      x: Number(objectNode.getAttribute('x') ?? 0),
      y: Number(objectNode.getAttribute('y') ?? 0),
      width: Number(objectNode.getAttribute('width') ?? 0),
      height: Number(objectNode.getAttribute('height') ?? 0),
      visible: objectNode.getAttribute('visible') !== '0',
      ellipse: objectNode.querySelector('ellipse') !== null,
      point: objectNode.querySelector('point') !== null,
      polygon: [...objectNode.querySelectorAll('polygon')].flatMap((polygonNode) => {
        const points = polygonNode.getAttribute('points');
        if (!points) {
          return [];
        }

        return [[...points.split(' ')].map((entry) => {
          const [x, y] = entry.split(',');
          return {
            x: Number(x),
            y: Number(y),
          };
        })];
      })[0],
    };
  }

  private basename(path: string) {
    const segments = path.split('/');
    return segments[segments.length - 1] ?? path;
  }

  private basenameWithoutExtension(path: string) {
    return this.basename(path).replace(/\.[^.]+$/, '');
  }

  private sanitizeKey(value: string) {
    return value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/-+/g, '-');
  }
}
