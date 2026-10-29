import type { AnimationClipConfig } from '@/game/animation/AnimationClip';
import type { AnimationLibraryConfig } from '@/game/animation/createAnimatorFromConfig';
import type { CharacterState, Direction } from '@/shared/types/game';

const directions: Direction[] = ['down', 'left', 'right', 'up'];

function frames(row: number, count: number) {
  return Array.from({ length: count }, (_, column) => ({ row, column }));
}

const heroRows = {
  down: { idle: 1, walk: 3, attack: 7, cast: 19, death: 24 },
  left: { idle: 27, walk: 29, attack: 33, cast: 45, death: 50 },
  right: { idle: 27, walk: 29, attack: 33, cast: 45, death: 50 },
  up: { idle: 52, walk: 54, attack: 58, cast: 70, death: 75 },
} satisfies Record<Direction, Record<'idle' | 'walk' | 'attack' | 'cast' | 'death', number>>;

export const HERO_SHEET_COLUMNS = 21;
export const heroSheet = {
  key: 'hero_legend_sheet',
  path: '/assets/hero-legend/green.png',
  frameWidth: 64,
  frameHeight: 64,
};

/** Side-facing source frames point right; PlayerView mirrors them when facing left. */
export function heroAttackFrame(direction: Direction, column: number) {
  return heroRows[direction].attack * HERO_SHEET_COLUMNS + column;
}

function heroClip(direction: Direction, state: CharacterState): AnimationClipConfig {
  const rows = heroRows[direction];
  const row = state === 'hurt' ? rows.death : rows[state];
  const count = state === 'walk' ? 8 : state === 'hurt' ? 3
    : state === 'death' ? direction === 'down' ? 21 : direction === 'up' ? 19 : 12 : 4;
  return {
    name: `${state}_${direction}`,
    sheetId: 'hero',
    fps: state === 'idle' ? 5 : state === 'walk' ? 12 : state === 'hurt' ? 25 : 12,
    loop: state === 'idle' || state === 'walk',
    frames: frames(row, count),
  };
}

const heroStates: CharacterState[] = ['idle', 'walk', 'attack', 'cast', 'hurt', 'death'];
export const characterAnimationLibrary: AnimationLibraryConfig = {
  sheets: { hero: heroSheet },
  clips: directions.flatMap((direction) => heroStates.map((state) => heroClip(direction, state))),
};

// Preserve the existing enemy artwork and playback timings.
function enemySheet(key: string, path: string) {
  return { key, path, frameWidth: 64, frameHeight: 64 };
}

const enemyRows = { down: 2, left: 1, right: 3, up: 0 };
function enemyClip(direction: Direction, state: 'idle' | 'walk' | 'attack' | 'hurt'): AnimationClipConfig {
  const sheetId = { idle: 'enemyIdle', walk: 'enemyWalk', attack: 'enemySlash', hurt: 'enemyHurt' }[state];
  const count = { idle: 2, walk: 9, attack: 13, hurt: 6 }[state];
  const fps = { idle: 2, walk: 10, attack: 29, hurt: 18 }[state];
  return {
    name: `${state}_${direction}`, sheetId, fps,
    loop: state === 'idle' || state === 'walk',
    frames: frames(state === 'hurt' ? 0 : enemyRows[direction], count),
  };
}

export const enemyAnimationLibrary: AnimationLibraryConfig = {
  sheets: {
    enemyIdle: enemySheet('enemy_idle_sheet', '/assets/enemy_idle.png'),
    enemyWalk: enemySheet('enemy_walk_sheet', '/assets/enemy_walk.png'),
    enemyHurt: enemySheet('enemy_hurt_sheet', '/assets/enemy_hurt.png'),
    enemySlash: enemySheet('enemy_slash_sheet', '/assets/enemy_1h_slash.png'),
  },
  clips: directions.flatMap((direction) =>
    (['idle', 'walk', 'hurt', 'attack'] as const).map((state) => enemyClip(direction, state))),
};
