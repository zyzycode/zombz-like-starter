import type { MapDefinition } from '@/game/content/maps/types';
import type { CampaignStage } from '@/game/content/campaign/campaign';

/** Connected arenas reuse the original tiles; obstacles leave wide combat lanes. */
export function createArenaMap(stage: CampaignStage, depth: number): MapDefinition {
  const columns = 30;
  const rows = 22;
  const width = columns * 32;
  const height = rows * 32;
  const stone = stage.biomeId !== 'grove';
  const positions = stage.biomeId === 'grove'
    ? [{ x: 260, y: 240 }, { x: 700, y: 460 }]
    : stage.biomeId === 'ruins'
      ? [{ x: 280, y: 240 }, { x: 680, y: 240 }, { x: 280, y: 464 }, { x: 680, y: 464 }]
      : [{ x: 320, y: 210 }, { x: 640, y: 494 }, { x: 320, y: 494 }, { x: 640, y: 210 }];
  const image = stone ? 'TX Tileset Stone Ground.png' : 'TX Tileset Grass.png';
  return {
    palette: stage.biomeId === 'grove'
      ? { tint: 0xb3cfa3, background: 0x26372e, obstacle: 0x536b54, accent: 0x97c885 }
      : stage.biomeId === 'ruins'
        ? { tint: 0xd5b58a, background: 0x362e29, obstacle: 0x766354, accent: 0xd3a56c }
        : { tint: 0x96cdeb, background: 0x263442, obstacle: 0x628096, accent: 0xa4daf2 },
    id: stage.id, version: 1, width, height, originOffset: { x: 0, y: 0 }, renderMode: 'tiled', tileSize: { width: 32, height: 32 },
    arena: { x: 32, y: 32, width: width - 64, height: height - 64 },
    tilesets: [{ id: 'floor', name: 'floor', firstGid: 1, source: image, imageKey: stone ? 'arena-stone' : 'arena-grass', imagePath: `/assets/maps/my_first_map/${image}` }],
    tileLayers: [{ id: 'floor', name: 'floor', kind: 'tile', width: columns, height: rows, opacity: 1, visible: true,
      chunks: [{ x: 0, y: 0, width: columns, height: rows, data: Array.from({ length: columns * rows }, (_, i) => 1 + ((i * 7 + depth) % 3)) }] }],
    markers: [
      { id: 'player', kind: 'player_spawn', position: { x: width / 2, y: height / 2 } },
      ...[{ x: 100, y: 100 }, { x: width - 100, y: 100 }, { x: width - 100, y: height - 100 }, { x: 100, y: height - 100 }].map((position, i) => ({ id: `spawn-${i}`, kind: 'enemy_spawn' as const, position })),
    ],
    props: positions.map((position, i) => ({ id: `pillar-${i}`, kind: 'pillar', position, radius: 30, width: 60, height: 60 })),
    collision: positions.map((position, i) => ({ id: `pillar-${i}`, kind: 'circle', position, radius: 30 })),
  };
}
