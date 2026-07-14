import type { AnimationName, CharacterState, Direction } from '@/shared/types/game';

export function buildAnimationName(state: CharacterState, direction: Direction): AnimationName {
  return `${state}_${direction}`;
}

