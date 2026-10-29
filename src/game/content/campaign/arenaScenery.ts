import type { CollisionShapeDefinition, MapPropDefinition } from '@/game/content/maps/types';
import type { CampaignStage } from '@/game/content/campaign/campaign';
import type { ArenaLayout } from '@/game/content/campaign/arenaLayouts';
import { PROP_FRAMES, type EnvironmentTheme } from '@/game/content/campaign/flareEnvironmentArt';

/** Small authored places, backed by the same foot positions as collision cover. */
export function createArenaScenery(stage: CampaignStage, layout: ArenaLayout, theme: EnvironmentTheme) {
  const props: MapPropDefinition[] = [];
  const collision: CollisionShapeDefinition[] = [];
  let sequence = 0;
  const prop = (tile: number, x: number, y: number, ground = false, scale = 1, id?: string) => {
    const frame = PROP_FRAMES[theme][tile];
    if (frame === undefined) throw new Error(`Missing Flare prop: ${theme}/${tile}`);
    props.push({ id: id ?? `scenery-${sequence++}`, kind: ground ? 'foliage' : theme === 'dungeon' ? 'ruin' : 'scrap_heap',
      position: { x, y }, radius: 26, width: 72 * scale, height: 120 * scale,
      visual: { textureKey: `flare-${theme}-props`, frame, scale, ground, origin: { x: .5, y: .875 } } });
  };
  const tree = (frame: number, x: number, y: number, scale = 1, id?: string) => {
    props.push({ id: id ?? `tree-${sequence++}`, kind: 'tree', position: { x, y }, radius: 26, width: 90 * scale, height: 180 * scale,
      visual: { textureKey: `flare-${theme}-trees`, frame, scale, origin: { x: .5, y: .875 } } });
  };
  const solid = (tile: number, x: number, y: number, scale = 1) => {
    prop(tile, x, y, false, scale);
    collision.push({ id: `solid-${sequence++}`, kind: 'circle', position: { x, y }, radius: 20 });
  };
  for (const [index, center] of layout.islands.entries()) {
    const id = `cover-${index}`;
    if (theme === 'grassland') {
      if (index === 4) prop(layout.story === 'camp' ? 102 : 142, center.x, center.y, false, 1, id);
      else tree((layout.story === 'camp' ? [12, 1, 8, 14] : [4, 7, 10, 6])[index % 4], center.x, center.y, 1.05, id);
      prop(128 + index % 4, center.x + 31, center.y + 8, true, .7);
      prop(112 + index % 6, center.x - 29, center.y + 12, true, .8);
    } else if (theme === 'dungeon') {
      prop(([128, 129, 130, 131, 146, 147])[index % 6], center.x, center.y, false, index < 4 ? 1.2 : 1.35, id);
      prop(118 + index % 4, center.x + 30, center.y + 8, true, .72);
      prop(176 + index % 4, center.x - 27, center.y + 16, true, .8);
    } else {
      if (layout.story === 'sanctuary') prop(132 + index % 4, center.x, center.y, false, .9, id);
      else if (index % 2 === 0) tree(4 + index % 4, center.x, center.y, .9, id);
      else prop(128 + index % 4, center.x, center.y, false, 1.3, id);
      prop(128 + index % 4, center.x + 29, center.y + 10, true, .7);
      prop(124 + index % 4, center.x - 26, center.y + 12, true, .8);
    }
  }
  if (layout.story === 'camp') {
    solid(72, 230, 270, .85); solid(75, 330, 165, .6);
    solid(76, 235, 425); solid(98, 272, 430); prop(100, 351, 405, true);
    prop(101, 340, 442, true); prop(103, 361, 372, true, .8);
    solid(136, 748, 450); prop(96, 764, 469, true);
  } else if (layout.story === 'burial') {
    for (const [x, y] of [[192, 290], [246, 300], [185, 450], [252, 465]]) {
      solid(140 + sequence % 2, x, y, .9);
      prop(122 + sequence % 2, x + 18, y + 12, true, .75);
    }
    solid(142, 391, 574); solid(143, 432, 594); prop(136, 690, 128, true);
  } else if (layout.story === 'courtyard') {
    solid(128, 404, 94); solid(129, 558, 96); prop(264, 480, 352, true, 1.5);
    solid(144, 737, 380); solid(146, 778, 395); solid(147, 727, 416);
    prop(118, 180, 192, true); prop(120, 778, 540, true);
  } else if (layout.story === 'library') {
    for (const [x, y] of [[176, 270], [175, 445], [716, 180], [760, 460]]) {
      solid(148 + sequence % 2, x, y, 1.1);
      prop(165, x + 18, y + 16, true, .8);
    }
    solid(135, 337, 422); solid(144, 303, 400); solid(149, 389, 410, .8);
    prop(164, 349, 447, true); prop(165, 379, 450, true);
    solid(132, 463, 101); solid(131, 516, 104);
  } else if (layout.story === 'threshold') {
    solid(244, 737, 205, .9); solid(245, 224, 606, .7);
    solid(136, 234, 270); prop(100, 203, 304, true); prop(102, 227, 312, true);
    solid(142, 722, 377); solid(143, 765, 402);
  } else {
    prop(244, 76, 405, false, .8); prop(245, 908, 410, false, .8);
    solid(142, 403, 110); solid(143, 560, 110); prop(264, 480, 352, true, 1.8);
    for (const [x, y] of [[361, 614], [420, 628], [550, 627], [608, 612]]) prop(128 + sequence % 4, x, y, true);
  }
  // Dense silhouettes are kept beyond the playable edge rather than disguising walkable walls.
  if (theme !== 'dungeon') {
    const frames = theme === 'grassland' ? [8, 11, 12, 15, 0, 2] : [0, 1, 2, 3, 4, 5];
    for (const [index, x] of [24, 190, 365, 560, 745, 935].entries()) {
      tree(frames[index], x, 20, 1.15);
      tree(frames[(index + 2) % frames.length], x, 789, 1.1);
    }
    for (const [index, y] of [250, 445, 615].entries()) {
      tree(frames[index], -24, y, 1.18); tree(frames[index + 2], 988, y + 25, 1.1);
    }
  } else {
    for (const [index, x] of [40, 220, 395, 575, 750, 930].entries()) {
      prop(index % 2 ? 128 : 129, x, 21, false, .9);
      prop(118 + index % 8, x, 718, false, .9);
    }
    for (const y of [258, 456]) { prop(118, 8, y, false, .9); prop(119, 952, y, false, .9); }
  }
  // Low plant/rubble patches make routes legible without introducing hidden collisions.
  for (let i = 0; i < 24; i++) {
    const x = 120 + (i * 137 + stage.id.length * 31) % 720;
    const y = 160 + (i * 83) % 410;
    const blocked = layout.islands.some((point) => Math.hypot(point.x - x, point.y - y) < 70)
      || Math.hypot(x - 480, y - 352) < 105 || Math.hypot(x - layout.restoration.x, y - layout.restoration.y) < 90;
    if (blocked) continue;
    prop(theme === 'dungeon' ? 176 + i % 8 : 112 + i % 16, x, y, true, .6 + i % 3 * .1);
  }
  return { props, collision };
}
