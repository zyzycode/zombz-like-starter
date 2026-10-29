import type { Vector2 } from '@/shared/types/game';

export const MAZE_WIDTH = 3456;
export const MAZE_HEIGHT = 2592;
export const MAZE_CELL = 96;
export const MAZE_COLUMNS = MAZE_WIDTH / MAZE_CELL;
export const MAZE_ROWS = MAZE_HEIGHT / MAZE_CELL;

type Link = readonly [number, number];
export type MazeLayout = {
  playerRoom?: number;
  links: readonly Link[];
  spawnRooms: readonly number[];
  cacheRooms: readonly number[];
  obeliskRooms: readonly number[];
  springRoom: number;
  hazardRooms: readonly number[];
};

/** Twenty 480px rooms connected by 288px-wide passages. */
export const MAZE_LAYOUTS: Readonly<Record<string, MazeLayout>> = {
  'grove-maze': {
    links: [[0,1],[1,2],[2,3],[3,4],[2,7],[5,6],[6,7],[7,8],[8,9],
      [7,12],[10,11],[11,12],[12,13],[9,14],[14,19],[12,17],[15,16],[16,17],[17,18],[18,19]],
    spawnRooms: [3,8,13,18], cacheRooms: [10,15], obeliskRooms: [4,19], springRoom: 6, hazardRooms: [9,16],
  },
  'ruins-maze': {
    links: [[0,1],[1,2],[2,3],[3,4],[4,9],[9,8],[8,7],[7,6],[6,5],
      [5,10],[10,11],[11,12],[12,13],[13,14],[14,19],[19,18],[18,17],[17,16],[16,15],[0,5],[7,12]],
    spawnRooms: [4,8,13,17], cacheRooms: [3,15], obeliskRooms: [9,19], springRoom: 6, hazardRooms: [11,18],
  },
  'frost-maze': {
    links: [[0,5],[5,10],[10,15],[15,16],[16,17],[17,18],[18,19],[19,14],[14,9],
      [9,4],[4,3],[3,2],[2,1],[2,7],[7,12],[7,6],[12,13],[9,8],[10,11],[12,17]],
    spawnRooms: [5,8,13,18], cacheRooms: [1,11], obeliskRooms: [4,19], springRoom: 6, hazardRooms: [3,16],
  },
};

/** Earlier stages reuse biome layouts with distinct orientation and their original objective counts. */
export function campaignMazeLayout(stageId: string, biomeId: string): MazeLayout {
  if (MAZE_LAYOUTS[stageId]) return MAZE_LAYOUTS[stageId];
  const base = MAZE_LAYOUTS[`${biomeId}-maze`];
  if (!base) throw new Error(`Missing maze biome: ${biomeId}`);
  const horizontal = stageId.endsWith('-2');
  const vertical = stageId.endsWith('-alt');
  const room = (id: number) => (vertical ? 3 - Math.floor(id / 5) : Math.floor(id / 5)) * 5
    + (horizontal ? 4 - id % 5 : id % 5);
  const objectiveCount = stageId === 'ruins-1' || stageId === 'ruins-alt' ? 1
    : stageId === 'ruins-2' || stageId === 'frost-1' ? 2 : 0;
  const hazardCount = stageId === 'grove-1' || stageId === 'grove-alt' ? 0
    : stageId === 'grove-2' || stageId === 'ruins-alt' ? 1 : stageId === 'frost-2' ? 3 : 2;
  return {
    playerRoom: room(0), links: base.links.map(([a, b]) => [room(a), room(b)]),
    spawnRooms: base.spawnRooms.map(room), cacheRooms: base.cacheRooms.map(room),
    obeliskRooms: base.obeliskRooms.slice(0, objectiveCount).map(room),
    springRoom: room(base.springRoom), hazardRooms: [...base.hazardRooms, 12].slice(0, hazardCount).map(room),
  };
}

export function mazeRoomPosition(index: number): Vector2 {
  return { x: (2 + index % 5 * 7 + 2.5) * MAZE_CELL, y: (2 + Math.floor(index / 5) * 6 + 2.5) * MAZE_CELL };
}

/** Carve authored rooms and links into a regular mask, later converted to ordinary map rectangles. */
export function createMazeFloor(layout: MazeLayout): boolean[][] {
  const floor = Array.from({ length: MAZE_ROWS }, () => Array<boolean>(MAZE_COLUMNS).fill(false));
  const carve = (x: number, y: number, width: number, height: number) => {
    for (let row = y; row < y + height; row++) for (let col = x; col < x + width; col++) floor[row][col] = true;
  };
  for (let room = 0; room < 20; room++) carve(2 + room % 5 * 7, 2 + Math.floor(room / 5) * 6, 5, 5);
  for (const [from, to] of layout.links) {
    const ax = 2 + from % 5 * 7, ay = 2 + Math.floor(from / 5) * 6;
    const bx = 2 + to % 5 * 7, by = 2 + Math.floor(to / 5) * 6;
    if (ay === by && Math.abs(from - to) === 1) carve(Math.min(ax,bx) + 5, ay + 1, 2, 3);
    else if (ax === bx && Math.abs(from - to) === 5) carve(ax + 1, Math.min(ay,by) + 5, 3, 1);
    else throw new Error(`Invalid maze room link: ${from} → ${to}`);
  }
  return floor;
}
