import type { AnimationClipConfig } from '@/game/animation/AnimationClip';
import type { AnimationLibraryConfig } from '@/game/animation/createAnimatorFromConfig';
import type { SpriteSheetConfig } from '@/game/animation/SpriteSheet';
import type { EnemyArchetypeId } from '@/game/config/enemies/enemyArchetypes';
import type { Direction } from '@/shared/types/game';

export type EnemyAppearance = {
  library: AnimationLibraryConfig;
  initialTexture: string;
  scale: number;
  feetOrigin: { x: number; y: number };
  height: number;
  bossAttack?: { charge: Record<Direction, string>; swing: Record<Direction, string> };
};

const directions: Direction[] = ['down', 'left', 'right', 'up'];
const basePath = '/assets/enemies/ninja-adventure';
const monsterColumns = { down: 0, up: 1, left: 2, right: 3 };

function monster(name: string, scale: number, columns = monsterColumns): EnemyAppearance {
  const sheet: SpriteSheetConfig = {
    key: `ninja-${name}`, path: `${basePath}/${name}.png`, frameWidth: 16, frameHeight: 16,
  };
  const clips: AnimationClipConfig[] = directions.flatMap((direction) =>
    (['idle', 'walk', 'attack'] as const).map((state) => ({
      name: `${state}_${direction}`, sheetId: name,
      fps: state === 'idle' ? 5 : name === 'bat' ? 14 : 10,
      loop: true,
      frames: Array.from({ length: 4 }, (_, row) => ({ row, column: columns[direction] })),
    })));
  return {
    library: { sheets: { [name]: sheet }, clips }, initialTexture: sheet.key, scale,
    feetOrigin: { x: .5, y: .94 }, height: 16 * scale,
  };
}

function bossAppearance(): EnemyAppearance {
  const names = ['idle', 'walk', 'hit', 'chargeleft', 'chargeright', 'attackleft', 'attackright'];
  const sheets: Record<string, SpriteSheetConfig> = Object.fromEntries(names.map((name) => [name, {
    key: `ninja-boss-${name}`, path: `${basePath}/boss-${name}.png`, frameWidth: 96, frameHeight: 96,
  }]));
  const clips: AnimationClipConfig[] = directions.flatMap((direction) =>
    (['idle', 'walk', 'hurt', 'attack'] as const).map((state) => {
      const sheetId = state === 'hurt' ? 'hit' : state === 'attack'
        ? direction === 'left' ? 'attackleft' : 'attackright' : state;
      return {
        name: `${state}_${direction}`, sheetId, fps: state === 'idle' ? 6 : 10,
        loop: state === 'idle' || state === 'walk',
        frames: Array.from({ length: state === 'idle' || state === 'walk' ? 6 : 4 }, (_, column) => ({ row: 0, column })),
      };
    }));
  return {
    library: { sheets, clips }, initialTexture: sheets.idle.key,
    scale: 1.7, feetOrigin: { x: .5, y: 68 / 96 }, height: 40 * 1.7,
    bossAttack: {
      charge: { down: sheets.chargeright.key, up: sheets.chargeright.key, left: sheets.chargeleft.key, right: sheets.chargeright.key },
      swing: { down: sheets.attackright.key, up: sheets.attackright.key, left: sheets.attackleft.key, right: sheets.attackright.key },
    },
  };
}

/** Art identity is presentation content; combat sizes and rules stay in enemyArchetypes. */
export const enemyAppearances: Record<EnemyArchetypeId, EnemyAppearance> = {
  grunt: monster('mushroom', 2.5),
  runner: monster('bat', 2.25),
  ranged: monster('lantern', 2.5),
  brute: monster('bear', 3.2, { down: 0, left: 1, up: 2, right: 3 }),
  boss: bossAppearance(),
};

export function getEnemyAppearance(id?: string): EnemyAppearance {
  switch (id) {
    case 'runner': case 'ranged': case 'brute': case 'boss': return enemyAppearances[id];
    default: return enemyAppearances.grunt;
  }
}
