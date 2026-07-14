import type { AnimationClipConfig } from '@/game/animation/AnimationClip';
import type { AnimationLibraryConfig } from '@/game/animation/createAnimatorFromConfig';

function frameRange(row: number, from: number, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    row,
    column: from + index,
  }));
}

const heroWalkSheet = {
  key: 'hero_walk_sheet',
  path: '/assets/walk1.png',
  frameWidth: 64,
  frameHeight: 64,
} as const;

const heroIdleSheet = {
  key: 'hero_idle_sheet',
  path: '/assets/idle.png',
  frameWidth: 64,
  frameHeight: 64,
} as const;

const heroSlashSheet = {
  key: 'hero_slash_sheet',
  path: '/assets/1h_slash.png',
  frameWidth: 64,
  frameHeight: 64,
} as const;

const enemyIdleSheet = {
  key: 'enemy_idle_sheet',
  path: '/assets/enemy_idle.png',
  frameWidth: 64,
  frameHeight: 64,
} as const;

const enemyWalkSheet = {
  key: 'enemy_walk_sheet',
  path: '/assets/enemy_walk.png',
  frameWidth: 64,
  frameHeight: 64,
} as const;

const enemyHurtSheet = {
  key: 'enemy_hurt_sheet',
  path: '/assets/enemy_hurt.png',
  frameWidth: 64,
  frameHeight: 64,
} as const;

const enemySlashSheet = {
  key: 'enemy_slash_sheet',
  path: '/assets/enemy_1h_slash.png',
  frameWidth: 64,
  frameHeight: 64,
} as const;

const playerClips: AnimationClipConfig[] = [
  {
    name: 'idle_down',
    sheetId: 'heroIdle',
    fps: 2,
    loop: true,
    frames: frameRange(2, 0, 2),
  },
  {
    name: 'idle_left',
    sheetId: 'heroIdle',
    fps: 2,
    loop: true,
    frames: frameRange(1, 0, 2),
  },
  {
    name: 'idle_right',
    sheetId: 'heroIdle',
    fps: 2,
    loop: true,
    frames: frameRange(3, 0, 2),
  },
  {
    name: 'idle_up',
    sheetId: 'heroIdle',
    fps: 2,
    loop: true,
    frames: frameRange(0, 0, 2),
  },
  {
    name: 'walk_down',
    sheetId: 'heroWalk',
    fps: 10,
    loop: true,
    frames: frameRange(2, 0, 9),
  },
  {
    name: 'walk_left',
    sheetId: 'heroWalk',
    fps: 10,
    loop: true,
    frames: frameRange(1, 0, 9),
  },
  {
    name: 'walk_right',
    sheetId: 'heroWalk',
    fps: 10,
    loop: true,
    frames: frameRange(3, 0, 9),
  },
  {
    name: 'walk_up',
    sheetId: 'heroWalk',
    fps: 10,
    loop: true,
    frames: frameRange(0, 0, 9),
  },
  {
    name: 'attack_down',
    sheetId: 'heroSlash',
    fps: 29,
    loop: false,
    frames: frameRange(2, 0, 13),
  },
  {
    name: 'attack_left',
    sheetId: 'heroSlash',
    fps: 29,
    loop: false,
    frames: frameRange(1, 0, 13),
  },
  {
    name: 'attack_right',
    sheetId: 'heroSlash',
    fps: 29,
    loop: false,
    frames: frameRange(3, 0, 13),
  },
  {
    name: 'attack_up',
    sheetId: 'heroSlash',
    fps: 29,
    loop: false,
    frames: frameRange(0, 0, 13),
  },
];

const enemyClips: AnimationClipConfig[] = [
  {
    name: 'idle_down',
    sheetId: 'enemyIdle',
    fps: 2,
    loop: true,
    frames: frameRange(2, 0, 2),
  },
  {
    name: 'idle_left',
    sheetId: 'enemyIdle',
    fps: 2,
    loop: true,
    frames: frameRange(1, 0, 2),
  },
  {
    name: 'idle_right',
    sheetId: 'enemyIdle',
    fps: 2,
    loop: true,
    frames: frameRange(3, 0, 2),
  },
  {
    name: 'idle_up',
    sheetId: 'enemyIdle',
    fps: 2,
    loop: true,
    frames: frameRange(0, 0, 2),
  },
  {
    name: 'walk_down',
    sheetId: 'enemyWalk',
    fps: 10,
    loop: true,
    frames: frameRange(2, 0, 9),
  },
  {
    name: 'walk_left',
    sheetId: 'enemyWalk',
    fps: 10,
    loop: true,
    frames: frameRange(1, 0, 9),
  },
  {
    name: 'walk_right',
    sheetId: 'enemyWalk',
    fps: 10,
    loop: true,
    frames: frameRange(3, 0, 9),
  },
  {
    name: 'walk_up',
    sheetId: 'enemyWalk',
    fps: 10,
    loop: true,
    frames: frameRange(0, 0, 9),
  },
  {
    name: 'hurt_down',
    sheetId: 'enemyHurt',
    fps: 18,
    loop: false,
    frames: frameRange(0, 0, 6),
  },
  {
    name: 'hurt_left',
    sheetId: 'enemyHurt',
    fps: 18,
    loop: false,
    frames: frameRange(0, 0, 6),
  },
  {
    name: 'hurt_right',
    sheetId: 'enemyHurt',
    fps: 18,
    loop: false,
    frames: frameRange(0, 0, 6),
  },
  {
    name: 'hurt_up',
    sheetId: 'enemyHurt',
    fps: 18,
    loop: false,
    frames: frameRange(0, 0, 6),
  },
  {
    name: 'attack_down',
    sheetId: 'enemySlash',
    fps: 29,
    loop: false,
    frames: frameRange(2, 0, 13),
  },
  {
    name: 'attack_left',
    sheetId: 'enemySlash',
    fps: 29,
    loop: false,
    frames: frameRange(1, 0, 13),
  },
  {
    name: 'attack_right',
    sheetId: 'enemySlash',
    fps: 29,
    loop: false,
    frames: frameRange(3, 0, 13),
  },
  {
    name: 'attack_up',
    sheetId: 'enemySlash',
    fps: 29,
    loop: false,
    frames: frameRange(0, 0, 13),
  },
];

export const characterAnimationLibrary: AnimationLibraryConfig = {
  sheets: {
    heroWalk: heroWalkSheet,
    heroIdle: heroIdleSheet,
    heroSlash: heroSlashSheet,
  },
  clips: playerClips,
};

export const enemyAnimationLibrary: AnimationLibraryConfig = {
  sheets: {
    enemyIdle: enemyIdleSheet,
    enemyWalk: enemyWalkSheet,
    enemyHurt: enemyHurtSheet,
    enemySlash: enemySlashSheet,
  },
  clips: enemyClips,
};

/**
 * Альтернативный способ задавать кадры без row + frameCount:
 * например для attack/hurt, если кадры идут не подряд.
 */
export const explicitFrameExamples = {
  walk_down_custom: {
    name: 'walk_down',
    sheetId: 'heroWalk',
    fps: 10,
    loop: true,
    frames: [
      { row: 0, column: 0 },
      { row: 0, column: 1 },
      { row: 0, column: 2 },
      { row: 0, column: 3 },
    ],
  },
};
