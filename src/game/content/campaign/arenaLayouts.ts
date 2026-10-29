import type { Vector2 } from '@/shared/types/game';

type Trail = { points: Vector2[]; width: number };
export type ArenaLayout = {
  story: 'camp' | 'burial' | 'courtyard' | 'library' | 'threshold' | 'sanctuary';
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
    story: 'camp',
    trails: [trail(3.8, [0, 13], [8, 12], [15, 11], [22, 8], [30, 6]), trail(2.8, [8, 12], [10, 17], [20, 19], [30, 17])],
    clearings: [{ x: 15, y: 11, radius: 3.8 }, { x: 8, y: 12, radius: 3 }, { x: 5, y: 11, radius: 2.5 }],
    islands: sites([280, 220], [700, 224], [300, 504], [704, 520], [320, 352]),
    restoration: { x: 160, y: 352 },
  },
  'grove-2': {
    story: 'burial',
    trails: [trail(3.8, [0, 17], [8, 15], [15, 11], [23, 6], [30, 5]), trail(3, [15, 11], [23, 16], [30, 17]),
      trail(3, [15, 11], [25, 11]), trail(2.5, [8, 15], [6, 10], [9, 6])],
    clearings: [{ x: 15, y: 11, radius: 3.4 }, { x: 25, y: 11, radius: 2.8 }, { x: 7, y: 12, radius: 3.1 }],
    islands: sites([288, 240], [544, 176], [288, 540], [624, 520], [224, 400]),
    restoration: { x: 800, y: 352 },
  },
  'grove-alt': {
    story: 'burial',
    trails: [trail(4.2, [0, 11], [30, 11]), trail(3.2, [15, 11], [15, 17], [5, 17]),
      trail(3.2, [9, 11], [9, 5], [24, 5], [24, 11]), trail(3.2, [15, 17], [25, 17], [25, 11])],
    clearings: [{ x: 15, y: 11, radius: 4 }, { x: 25, y: 11, radius: 2.8 }, { x: 5, y: 17, radius: 2.8 }],
    islands: sites([352, 224], [672, 224], [352, 480], [672, 480], [480, 176]),
    restoration: { x: 160, y: 544 },
  },
  'ruins-1': {
    story: 'courtyard',
    trails: [trail(4.5, [0, 11], [30, 11]), trail(4.5, [15, 0], [15, 22]), trail(3, [8, 6], [22, 6], [22, 16], [8, 16], [8, 6])],
    clearings: [{ x: 15, y: 11, radius: 5.5 }, { x: 5, y: 11, radius: 2.6 }],
    islands: sites([288, 208], [672, 208], [288, 512], [672, 512]),
    restoration: { x: 160, y: 352 },
  },
  'ruins-2': {
    story: 'library',
    trails: [trail(4, [0, 7], [30, 7]), trail(4, [0, 15], [30, 15]), trail(4, [15, 0], [15, 22]), trail(3, [25, 7], [25, 15])],
    clearings: [{ x: 15, y: 11, radius: 3.5 }, { x: 25, y: 11, radius: 2 }],
    islands: sites([256, 352], [672, 352], [352, 120], [608, 584], [232, 224], [720, 512]),
    restoration: { x: 800, y: 352 },
  },
  'ruins-alt': {
    story: 'courtyard',
    trails: [trail(4.5, [0, 11], [30, 11]), trail(4, [15, 0], [15, 22]),
      trail(3.5, [5, 11], [9, 6], [21, 6], [25, 11]), trail(3.5, [15, 11], [19, 17], [25, 17], [30, 19])],
    clearings: [{ x: 15, y: 11, radius: 4.4 }, { x: 15, y: 6, radius: 2.8 }, { x: 25, y: 17.5, radius: 2.8 }],
    islands: sites([288, 208], [672, 176], [320, 480], [624, 512]),
    restoration: { x: 160, y: 352 },
  },
  'frost-1': {
    story: 'threshold',
    trails: [trail(4, [0, 11], [9, 11], [9, 6], [20, 6], [20, 16], [30, 16]), trail(3.2, [9, 11], [30, 11])],
    clearings: [{ x: 15, y: 11, radius: 3.4 }],
    islands: sites([240, 176], [496, 192], [272, 520], [720, 520]),
    restoration: { x: 160, y: 352 },
  },
  'frost-2': {
    story: 'sanctuary',
    trails: [trail(4.5, [0, 11], [30, 11]), trail(4.5, [15, 0], [15, 22]),
      trail(3.2, [8, 6], [22, 6], [22, 16], [8, 16], [8, 6])],
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
