import type { GroundStampDefinition, MapDefinition } from '@/game/content/maps/types';
import type { CampaignStage } from '@/game/content/campaign/campaign';
import { ARENA_LAYOUTS, onTrail } from '@/game/content/campaign/arenaLayouts';
import { createArenaObelisks } from '@/game/content/campaign/arenaObjectives';
import { createArenaCaches } from '@/game/content/campaign/arenaCaches';
import { createArenaHazards } from '@/game/content/campaign/arenaHazards';
import { createArenaScenery } from '@/game/content/campaign/arenaScenery';
import { environmentAssets, type EnvironmentTheme } from '@/game/content/campaign/flareEnvironmentArt';

/** Authored combat routes use Flare's real diamond floors in the existing world XY plane. */
export function createArenaMap(stage: CampaignStage, depth: number): MapDefinition {
  const layout = ARENA_LAYOUTS[stage.id];
  if (!layout) throw new Error(`Missing arena layout: ${stage.id}`);
  const theme: EnvironmentTheme = stage.biomeId === 'grove' ? 'grassland' : stage.biomeId === 'frost' ? 'snowplains' : 'dungeon';
  const scenery = createArenaScenery(stage, layout, theme);
  const groundStamps: GroundStampDefinition[] = [];
  // Offset rows tessellate 64x32 diamonds. A slight overlap prevents alpha seams.
  for (let row = -1; row <= 45; row++) {
    for (let column = -1; column <= 15; column++) {
      const x = column * 64 + (row % 2 ? 32 : 0), y = row * 16;
      const route = onTrail(x / 32, y / 32, layout);
      const edge = route && [[1, 0], [-1, 0], [0, .5], [0, -.5]].some(([dx, dy]) => !onTrail(x / 32 + dx, y / 32 + dy, layout));
      const noise = (column * 17 + row * 31 + depth * 13 + 1500) % 16;
      const frame = theme === 'dungeon'
        ? route ? [16, 17, 18, 19][noise % 4] : [0, 1, 2, 3, 20, 21, 22, 23][noise % 8]
        : route ? edge ? 28 + noise % 4 : 16 + noise % 12 : noise;
      groundStamps.push({ textureKey: `flare-${theme}-floor`, frame, position: { x, y }, scale: 1.025 });
    }
  }
  return {
    id: stage.id, version: 3, width: 960, height: 704,
    palette: { tint: 0xffffff, background: theme === 'grassland' ? 0x333529 : theme === 'snowplains' ? 0x899499 : 0x292723,
      obstacle: 0x686b78, accent: theme === 'grassland' ? 0x8c9270 : theme === 'snowplains' ? 0xb4ced8 : 0xb3a17e },
    originOffset: { x: 0, y: 0 }, renderMode: 'tiled', tileSize: { width: 32, height: 32 },
    arena: { x: 32, y: 32, width: 896, height: 640 },
    tilesets: [...environmentAssets(theme), ...(theme === 'dungeon' ? [] : environmentAssets('dungeon')
      .filter((asset) => asset.id === 'flare-dungeon-props').map((asset) => ({ ...asset, firstGid: 3001 })))],
    tileLayers: [], groundStamps,
    markers: [
      { id: 'player', kind: 'player_spawn', position: { x: 480, y: 352 } },
      ...[{ x: 100, y: 100 }, { x: 860, y: 100 }, { x: 860, y: 604 }, { x: 100, y: 604 }].map((position, index) => ({
        id: `spawn-${index}`, kind: 'enemy_spawn' as const, position,
      })),
    ],
    props: scenery.props, hazards: createArenaHazards(stage), caches: createArenaCaches(stage), obelisks: createArenaObelisks(stage),
    collision: [...layout.islands.map((position, index) => ({ id: `cover-${index}`, kind: 'circle' as const, position: { ...position }, radius: 26 })), ...scenery.collision],
    restorationSites: [{ id: `${stage.id}-spring`, position: layout.restoration, radius: 64, healthFraction: .35, manaFraction: .6 }],
  };
}
