import type { Vector2 } from '@/shared/types/game';

export type SpatialGridRecord = {
  id: string;
  kind: 'player' | 'enemy' | 'resource' | 'drop' | 'destructible' | 'zone';
  position: Vector2;
  radius: number;
};

export class SpatialGrid {
  private readonly buckets = new Map<string, SpatialGridRecord[]>();
  private records: SpatialGridRecord[] = [];

  constructor(readonly cellSize: number) {}

  rebuild(records: SpatialGridRecord[]) {
    this.records = records.map((record) => ({
      ...record,
      position: { ...record.position },
    }));
    this.buckets.clear();

    for (const record of this.records) {
      for (const key of this.getKeysForCircle(record.position, record.radius)) {
        const bucket = this.buckets.get(key);
        if (bucket) {
          bucket.push(record);
          continue;
        }

        this.buckets.set(key, [record]);
      }
    }
  }

  queryCircle(center: Vector2, radius: number) {
    const result = new Map<string, SpatialGridRecord>();

    for (const key of this.getKeysForCircle(center, radius)) {
      const bucket = this.buckets.get(key);
      if (!bucket) {
        continue;
      }

      for (const record of bucket) {
        const distance = Math.hypot(record.position.x - center.x, record.position.y - center.y);
        if (distance <= radius + record.radius) {
          result.set(record.id, record);
        }
      }
    }

    return [...result.values()];
  }

  getAll() {
    return this.records;
  }

  private getKeysForCircle(center: Vector2, radius: number) {
    const minCellX = Math.floor((center.x - radius) / this.cellSize);
    const maxCellX = Math.floor((center.x + radius) / this.cellSize);
    const minCellY = Math.floor((center.y - radius) / this.cellSize);
    const maxCellY = Math.floor((center.y + radius) / this.cellSize);
    const keys: string[] = [];

    for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
      for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
        keys.push(`${cellX}:${cellY}`);
      }
    }

    return keys;
  }
}
