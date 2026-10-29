import type { CollisionShapeDefinition, GroundStampDefinition, MapDefinition, MapPropDefinition } from '@/game/content/maps/types';
import type { CampaignStage } from '@/game/content/campaign/campaign';
import { environmentAssets, PROP_FRAMES, type EnvironmentTheme } from '@/game/content/campaign/flareEnvironmentArt';
import { createMazeFloor, MAZE_CELL, MAZE_COLUMNS, MAZE_HEIGHT, MAZE_LAYOUTS, MAZE_ROWS, MAZE_WIDTH, mazeRoomPosition } from '@/game/content/campaign/mazeLayouts';

export function isMazeStage(stageId: string): boolean { return Object.prototype.hasOwnProperty.call(MAZE_LAYOUTS, stageId); }

/** Labyrinth content stays an ordinary map: the same collision rectangles drive navigation and walls. */
export function createMazeMap(stage: CampaignStage, depth: number): MapDefinition {
  const layout = MAZE_LAYOUTS[stage.id];
  if (!layout) throw new Error(`Missing maze layout: ${stage.id}`);
  const floor = createMazeFloor(layout);
  const theme: EnvironmentTheme = stage.biomeId === 'grove' ? 'grassland' : stage.biomeId === 'frost' ? 'snowplains' : 'dungeon';
  const collision: CollisionShapeDefinition[] = [];
  const props: MapPropDefinition[] = [];
  // Merge each solid row into long rects: no 1px edges and no invisible passages between wall sprites.
  for (let row = 0; row < MAZE_ROWS; row++) {
    for (let column = 0; column < MAZE_COLUMNS;) {
      if (floor[row][column]) { column++; continue; }
      const start = column;
      while (column < MAZE_COLUMNS && !floor[row][column]) column++;
      collision.push({ id: `wall-${row}-${start}`, kind: 'rect',
        position: { x: (start + column) * MAZE_CELL / 2, y: (row + .5) * MAZE_CELL },
        width: (column - start) * MAZE_CELL, height: MAZE_CELL });
      for (let tile = start; tile < column; tile++) {
        const x = (tile + .5) * MAZE_CELL, y = (row + .5) * MAZE_CELL;
        const trees = theme === 'grassland';
        const frame = trees ? [12,1,8,14][(row + tile) % 4]
          : PROP_FRAMES[theme][theme === 'dungeon' ? (tile % 2 ? 64 : 65) : 128 + (row + tile) % 4];
        props.push({ id: `wall-art-${row}-${tile}`, kind: trees ? 'tree' : 'ruin',
          position: { x, y: y + 16 }, radius: 32, width: 96, height: trees ? 180 : 140,
          visual: { textureKey: `flare-${theme}-${trees ? 'trees' : 'props'}`, frame,
            scale: theme === 'snowplains' ? 1.6 : 1.1, origin: { x: .5, y: .875 } } });
      }
    }
  }
  const groundStamps: GroundStampDefinition[] = [];
  for (let row = -1; row <= MAZE_HEIGHT / 16 + 1; row++) for (let column = -1; column <= MAZE_WIDTH / 64; column++) {
    const x = column * 64 + (row % 2 ? 32 : 0), y = row * 16;
    const walkable = floor[Math.floor(y / MAZE_CELL)]?.[Math.floor(x / MAZE_CELL)] ?? false;
    const noise = Math.abs(column * 17 + row * 31 + depth * 13) % 12;
    const frame = theme === 'dungeon' ? (walkable ? 16 + noise % 4 : noise % 4) : walkable ? 16 + noise : noise;
    groundStamps.push({ textureKey: `flare-${theme}-floor`, frame, position: { x, y }, scale: 1.025 });
  }
  return {
    id: stage.id, version: 1, width: MAZE_WIDTH, height: MAZE_HEIGHT,
    palette: { tint: 0xffffff, background: theme === 'grassland' ? 0x333529 : theme === 'snowplains' ? 0x899499 : 0x292723, obstacle: 0x686b78, accent: 0xb3a17e },
    originOffset: { x: 0, y: 0 }, renderMode: 'tiled', tileSize: { width: 32, height: 32 },
    arena: { x: 64, y: 64, width: MAZE_WIDTH - 128, height: MAZE_HEIGHT - 128 },
    tilesets: [...environmentAssets(theme), ...(theme === 'dungeon' ? [] : environmentAssets('dungeon')
      .filter(asset => asset.id === 'flare-dungeon-props').map(asset => ({ ...asset, firstGid: 3001 })))],
    tileLayers: [], groundStamps, collision, props,
    markers: [{ id: 'player', kind: 'player_spawn', position: mazeRoomPosition(0) },
      ...layout.spawnRooms.map((room,index) => ({ id: `spawn-${index}`, kind: 'enemy_spawn' as const, position: mazeRoomPosition(room) }))],
    caches: layout.cacheRooms.map((room,index) => ({ id: `${stage.id}-cache-${index}`, position: mazeRoomPosition(room), radius: 44 })),
    obelisks: layout.obeliskRooms.map((room,index) => ({ id: `${stage.id}-obelisk-${index}`, position: mazeRoomPosition(room), radius: 44 })),
    restorationSites: [{ id: `${stage.id}-spring`, position: mazeRoomPosition(layout.springRoom), radius: 64, healthFraction: .35, manaFraction: .6 }],
    hazards: layout.hazardRooms.map((room,index) => ({ id: `${stage.id}-rune-${index}`, position: mazeRoomPosition(room),
      radius: 48, damage: stage.biomeId === 'frost' ? 32 : 28, damageType: 'magic', theme: stage.biomeId === 'frost' ? 'frost' : 'fire',
      cooldownMs: 4200, warningMs: 1400, activeMs: 320, initialDelayMs: 3000 + index * 1800 })),
  };
}
