import type { MapDefinition, MapPropDefinition } from '@/game/content/maps/types';
import type { CampaignStage } from '@/game/content/campaign/campaign';
import { ARENA_LAYOUTS, onTrail } from '@/game/content/campaign/arenaLayouts';

const COLUMNS = 30, ROWS = 22, TILE = 32;
const TOWN_GID = 1, DUNGEON_GID = 1001;

/** Six authored arenas share a CC0 art family and open, readable combat lanes. */
export function createArenaMap(stage: CampaignStage, depth: number): MapDefinition {
  const layout = ARENA_LAYOUTS[stage.id];
  if (!layout) throw new Error(`Missing arena layout: ${stage.id}`);
  const grove = stage.biomeId === 'grove', frost = stage.biomeId === 'frost';
  const townKey = frost ? 'kenney-town-frost' : 'kenney-town';
  const dungeonKey = frost ? 'kenney-dungeon-frost' : 'kenney-dungeon';
  const mask = Array.from({ length: COLUMNS * ROWS }, (_, i) => onTrail(i % COLUMNS + .5, Math.floor(i / COLUMNS) + .5, layout));
  const isPath = (x: number, y: number) => x < 0 || y < 0 || x >= COLUMNS || y >= ROWS || mask[y * COLUMNS + x];
  const floor = mask.map((path, i) => {
    const x = i % COLUMNS, y = Math.floor(i / COLUMNS);
    const noise = (x * 17 + y * 31 + depth * 13) % 29;
    if (!path) return TOWN_GID + (grove || frost ? noise < 3 ? 1 : 0 : 25);
    if (!grove) {
      // Flagstone plazas sit within snow or sandy rubble, with occasional intact paving.
      return DUNGEON_GID + (noise === 0 ? 43 : noise < 3 ? 50 : 49);
    }
    const top = !isPath(x, y - 1), bottom = !isPath(x, y + 1);
    const left = !isPath(x - 1, y), right = !isPath(x + 1, y);
    const frame = top ? left ? 12 : right ? 14 : 13 : bottom ? left ? 36 : right ? 38 : 37 : left ? 24 : right ? 26 : 25;
    return TOWN_GID + frame;
  });
  const props: MapPropDefinition[] = [];
  const addProp = (id: string, x: number, y: number, kind: MapPropDefinition['kind'], key: string, frame: number, scale = 1, ground = false) => {
    props.push({ id, kind, position: { x, y }, radius: 24, width: TILE * scale, height: TILE * scale,
      visual: { textureKey: key, frame, scale, ground } });
  };
  for (const [i, center] of layout.islands.entries()) {
    if (grove || frost) {
      addProp(`cover-${i}`, center.x, center.y, 'tree', townKey, i % 2 ? 4 : 5, 2.5);
      addProp(`sapling-${i}`, center.x + 34, center.y + 8, 'foliage', townKey, 28, 1.2, true);
      addProp(`fern-${i}`, center.x - 30, center.y + 12, 'foliage', townKey, 17, 1, true);
      addProp(`mushrooms-${i}`, center.x - 18, center.y - 30, 'foliage', townKey, 29, .8, true);
    } else {
      addProp(`cover-${i}`, center.x, center.y, 'ruin', dungeonKey, i % 2 ? 41 : 31, 2);
      addProp(`rubble-${i}`, center.x + 32, center.y + 6, 'foliage', dungeonKey, 24, 1, true);
      addProp(`urn-${i}`, center.x - 32, center.y + 8, 'foliage', dungeonKey, 74, 1.1, true);
    }
  }
  // Edge planting and ruins frame the play space; they never form hidden collision walls.
  for (let i = 0; i < 14; i++) {
    const x = 32 + i * 68;
    for (const [j, y] of [28, 700].entries()) {
      addProp(`border-${i}-${j}`, x, y, grove || frost ? 'tree' : 'ruin', grove || frost ? townKey : dungeonKey,
        grove || frost ? i % 3 ? 4 : 5 : i % 3 ? 64 : 31, grove || frost ? 1.6 : 1.25);
    }
  }
  for (const [i, point] of [{ x: 48, y: 250 }, { x: 912, y: 440 }, { x: 48, y: 500 }, { x: 912, y: 200 }].entries()) {
    addProp(`edge-${i}`, point.x, point.y, grove || frost ? 'tree' : 'ruin', grove || frost ? townKey : dungeonKey, grove || frost ? 5 : 65, 1.8);
  }
  const asset = (name: string, key: string, firstGid: number, frozen = false) => ({
    id: key, name: key, firstGid, source: `tiny-${name}${frozen ? '-frost' : ''}-32.png`, imageKey: key,
    imagePath: `/assets/kenney/tiny-${name}${frozen ? '-frost' : ''}-32.png`,
  });
  const tilesets = [asset('town', townKey, TOWN_GID, frost), asset('dungeon', dungeonKey, DUNGEON_GID, frost)];
  if (frost) tilesets.push(asset('dungeon', 'kenney-dungeon', 2001));
  return {
    id: stage.id, version: 2, width: COLUMNS * TILE, height: ROWS * TILE,
    palette: { tint: 0xffffff, background: grove ? 0x386b39 : frost ? 0x768fa1 : 0x7a5c4b,
      obstacle: 0x686b78, accent: grove ? 0xa0c87d : frost ? 0xb4edff : 0xe0bc80 },
    originOffset: { x: 0, y: 0 }, renderMode: 'tiled', tileSize: { width: TILE, height: TILE },
    arena: { x: TILE, y: TILE, width: 896, height: 640 }, tilesets,
    tileLayers: [{ id: 'terrain', name: 'terrain', kind: 'tile', width: COLUMNS, height: ROWS, opacity: 1, visible: true,
      chunks: [{ x: 0, y: 0, width: COLUMNS, height: ROWS, data: floor }] }],
    markers: [
      { id: 'player', kind: 'player_spawn', position: { x: 480, y: 352 } },
      ...[{ x: 100, y: 100 }, { x: 860, y: 100 }, { x: 860, y: 604 }, { x: 100, y: 604 }].map((position, i) => ({
        id: `spawn-${i}`, kind: 'enemy_spawn' as const, position,
      })),
    ],
    props,
    collision: layout.islands.map((position, i) => ({ id: `cover-${i}`, kind: 'circle', position: { ...position, y: position.y - 6 }, radius: 26 })),
    restorationSites: [{ id: `${stage.id}-spring`, position: layout.restoration, radius: 64, healthFraction: .35, manaFraction: .6 }],
  };
}
