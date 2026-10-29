import type { Vector2 } from '@/shared/types/game';

type Trail = { points: Vector2[]; width: number };
export type ArenaLayout = {
  trails: Trail[];
  clearings: { x: number; y: number; radius: number }[];
  islands: Vector2[];
  restoration: Vector2;
};
const trail = (width: number, ...pairs: [number, number][]): Trail => ({
  width, points: pairs.map(([x, y]) => ({ x, y })),
});
const sites = (...pairs: [number, number][]) => pairs.map(([x, y]) => ({ x, y }));

/** Tile-space trails and world-space cover are authored together, leaving broad escape routes. */
export const ARENA_LAYOUTS: Record<string, ArenaLayout> = {
  'grove-1': {
    trails: [trail(2.6, [0, 11], [8, 11], [15, 10], [22, 12], [30, 12]), trail(1.8, [15, 0], [15, 22])],
    clearings: [{ x: 15, y: 11, radius: 3.4 }],
    islands: sites([280, 220], [700, 224], [300, 504], [704, 520]),
    restoration: { x: 160, y: 352 },
  },
  'grove-2': {
    trails: [trail(2.8, [0, 17], [8, 15], [15, 11], [23, 6], [30, 5]), trail(2, [15, 11], [23, 16], [30, 17])],
    clearings: [{ x: 15, y: 11, radius: 3 }, { x: 25, y: 11, radius: 2.3 }],
    islands: sites([288, 240], [544, 176], [288, 540], [624, 520]),
    restoration: { x: 800, y: 352 },
  },
  'ruins-1': {
    trails: [trail(3, [0, 11], [30, 11]), trail(3, [15, 0], [15, 22])],
    clearings: [{ x: 15, y: 11, radius: 5 }, { x: 5, y: 11, radius: 2.1 }],
    islands: sites([288, 208], [672, 208], [288, 512], [672, 512]),
    restoration: { x: 160, y: 352 },
  },
  'ruins-2': {
    trails: [trail(3, [0, 7], [30, 7]), trail(3, [0, 15], [30, 15]), trail(3, [15, 0], [15, 22]), trail(2, [25, 7], [25, 15])],
    clearings: [{ x: 15, y: 11, radius: 3.5 }, { x: 25, y: 11, radius: 2 }],
    islands: sites([256, 352], [672, 352], [352, 120], [608, 584]),
    restoration: { x: 800, y: 352 },
  },
  'frost-1': {
    trails: [trail(3.2, [0, 11], [9, 11], [9, 6], [20, 6], [20, 16], [30, 16]), trail(2.2, [15, 11], [30, 11])],
    clearings: [{ x: 15, y: 11, radius: 3.4 }],
    islands: sites([240, 176], [496, 192], [272, 520], [752, 520]),
    restoration: { x: 160, y: 352 },
  },
  'frost-2': {
    trails: [trail(3, [0, 11], [30, 11]), trail(3, [15, 0], [15, 22]),
      trail(2.4, [8, 6], [22, 6], [22, 16], [8, 16], [8, 6])],
    clearings: [{ x: 15, y: 11, radius: 5.1 }, { x: 25, y: 11, radius: 2 }],
    islands: sites([256, 192], [704, 192], [256, 512], [704, 512]),
    restoration: { x: 800, y: 352 },
  },
};

export function onTrail(x: number, y: number, layout: ArenaLayout) {
  if (layout.clearings.some((area) => Math.hypot(x - area.x, y - area.y) < area.radius)) return true;
  return layout.trails.some(({ points, width }) => points.slice(1).some((end, index) => {
    const start = points[index];
    const dx = end.x - start.x, dy = end.y - start.y;
    const t = Math.max(0, Math.min(1, ((x - start.x) * dx + (y - start.y) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(x - start.x - dx * t, y - start.y - dy * t) <= width / 2;
  }));
}
