import manifest from '../../../public/assets/flare/characters/manifest.json' with { type: 'json' };
import type { AnimationLibraryConfig } from '@/game/animation/createAnimatorFromConfig';
import type { SpriteSheetConfig } from '@/game/animation/SpriteSheet';
import { DIRECTIONS } from '@/game/core/math/directions';
import type { CharacterRuntime, CharacterState, Direction } from '@/shared/types/game';

type FlareRole = keyof typeof manifest.characters;
export type FlareAppearance = {
  role: FlareRole;
  library: AnimationLibraryConfig;
  initialTexture: string;
  feetOrigin: { x: number; y: number };
  height: number;
};

// Flare's logical SW..S rows become W..SW after its isometric projection.
// Our simulation already uses screen XY, so apply that rotation only here.
const rows: Record<Direction, number> = {
  left: 0, 'up-left': 1, up: 2, 'up-right': 3,
  right: 4, 'down-right': 5, down: 6, 'down-left': 7,
};
const states: CharacterState[] = ['idle', 'walk', 'attack', 'cast', 'hurt', 'death'];

export function createFlareAppearance(role: FlareRole, height: number): FlareAppearance {
  const character = manifest.characters[role];
  const sheets: Record<string, SpriteSheetConfig> = Object.fromEntries(states.map((state) => [state, {
    key: `flare-${role}-${state}`, path: `/assets/flare/characters/${role}-${state}.png`,
    frameWidth: character.cell, frameHeight: character.cell,
  }]));
  const library: AnimationLibraryConfig = {
    sheets,
    clips: DIRECTIONS.flatMap((direction) => states.map((state) => {
      const { count, fps } = character.states[state];
      const columns = Array.from({ length: count }, (_, index) => index);
      if (state === 'idle') columns.push(...columns.slice(1, -1).reverse());
      return {
        name: `${state}_${direction}`, sheetId: state, fps,
        loop: state === 'idle' || state === 'walk',
        frames: columns.map((column) => ({ row: rows[direction], column })),
      };
    })),
  };
  return { role, library, initialTexture: sheets.idle.key, feetOrigin: character.origin, height };
}

/** Align the authored swing with the simulation's locked direction and contact window. */
export function flareAttackFrame(appearance: FlareAppearance, attack: CharacterRuntime['attack']) {
  const { config, runtime } = attack;
  const count = manifest.characters[appearance.role].states.attack.count;
  const contact = Math.floor(count / 2);
  const progress = runtime.phase === 'windup'
    ? runtime.elapsedMs / Math.max(1, config.windupMs)
    : (runtime.elapsedMs - config.windupMs) / Math.max(1, config.activeMs);
  const column = runtime.phase === 'windup' ? Math.min(contact - 1, Math.floor(progress * contact))
    : runtime.phase === 'active' ? Math.min(count - 1, contact + Math.floor(Math.max(0, progress) * 2)) : count - 1;
  return { textureKey: appearance.library.sheets.attack.key, frameIndex: rows[runtime.direction] * count + Math.max(0, column) };
}
