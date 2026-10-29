import type { Vector2 } from '@/shared/types/game';

type ResolvePosition = (position: Vector2, radius: number) => Vector2;

/** Static clearance graph, with one shared distance field towards the player's cell. */
export class NavigationGrid {
  private readonly size: number;
  private readonly clearance: number;
  private readonly columns: number;
  private readonly rows: number;
  private readonly points: Vector2[];
  private readonly edges: number[][];
  private readonly walkable: boolean[];
  private distances: number[];
  private targetCell = -1;
  private readonly resolve: ResolvePosition;

  constructor(params: { width: number; height: number; cellSize?: number; clearance?: number; resolvePosition: ResolvePosition }) {
    this.size = params.cellSize ?? 64;
    this.clearance = params.clearance ?? 38;
    this.columns = Math.ceil(params.width / this.size);
    this.rows = Math.ceil(params.height / this.size);
    this.resolve = params.resolvePosition;
    this.points = Array.from({ length: this.columns * this.rows }, (_, i) => ({
      x: (i % this.columns + .5) * this.size, y: (Math.floor(i / this.columns) + .5) * this.size,
    }));
    this.walkable = this.points.map((point) => this.isClear(point, this.clearance));
    this.edges = this.points.map(() => []);
    for (let i = 0; i < this.points.length; i++) {
      if (!this.walkable[i]) continue;
      for (const next of [i % this.columns < this.columns - 1 ? i + 1 : -1, i + this.columns]) {
        if (next < 0 || next >= this.points.length || !this.walkable[next]) continue;
        if (!this.segmentClear(this.points[i], this.points[next], this.clearance)) continue;
        this.edges[i].push(next);
        this.edges[next].push(i);
      }
    }
    this.distances = this.points.map(() => Infinity);
  }

  hasLineOfSight = (from: Vector2, to: Vector2) => this.segmentClear(from, to, 1);

  getWaypoint(position: Vector2, target: Vector2, radius = this.clearance): Vector2 | null {
    if (this.segmentClear(position, target, radius)) return { ...target };
    const targetCell = this.nearestCell(target, false, 1);
    if (targetCell !== this.targetCell) this.rebuild(targetCell);
    const current = this.nearestCell(position, true, radius);
    if (current < 0 || !Number.isFinite(this.distances[current])) return null;
    const next = this.edges[current].filter((id) => this.distances[id] < this.distances[current])
      .sort((a, b) => this.distances[a] - this.distances[b])
      .find((id) => this.segmentClear(position, this.points[id], radius));
    if (next !== undefined) return { ...this.points[next] };
    if (Math.hypot(position.x - this.points[current].x, position.y - this.points[current].y) > 2) return { ...this.points[current] };
    return null;
  }

  private nearestCell(position: Vector2, reachable = false, radius = this.clearance) {
    const col = Math.max(0, Math.min(this.columns - 1, Math.floor(position.x / this.size)));
    const row = Math.max(0, Math.min(this.rows - 1, Math.floor(position.y / this.size)));
    const cell = row * this.columns + col;
    if (this.walkable[cell] && (!reachable || Number.isFinite(this.distances[cell]))
      && this.segmentClear(position, this.points[cell], radius)) return cell;
    let nearest = -1, distance = Infinity;
    for (let i = 0; i < this.points.length; i++) {
      if (!this.walkable[i] || (reachable && !Number.isFinite(this.distances[i]))) continue;
      const point = this.points[i];
      const candidate = Math.hypot(position.x - point.x, position.y - point.y);
      if (candidate >= distance || !this.segmentClear(position, point, radius)) continue;
      nearest = i; distance = candidate;
    }
    return nearest;
  }

  private rebuild(target: number) {
    this.targetCell = target;
    this.distances.fill(Infinity);
    if (target < 0) return;
    const queue = [target];
    this.distances[target] = 0;
    for (let head = 0; head < queue.length; head++) {
      const current = queue[head];
      for (const next of this.edges[current]) {
        if (Number.isFinite(this.distances[next])) continue;
        this.distances[next] = this.distances[current] + 1;
        queue.push(next);
      }
    }
  }

  private segmentClear(from: Vector2, to: Vector2, radius: number) {
    const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 16));
    for (let step = 0; step <= steps; step++) {
      const t = step / steps;
      if (!this.isClear({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }, radius)) return false;
    }
    return true;
  }

  private isClear(position: Vector2, radius: number) {
    const resolved = this.resolve(position, radius);
    return Math.hypot(position.x - resolved.x, position.y - resolved.y) < .01;
  }
}
