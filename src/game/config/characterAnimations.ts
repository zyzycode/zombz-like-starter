import { createFlareAppearance, flareAttackFrame } from '@/game/config/flareAnimations';

export const heroAppearance = createFlareAppearance('hero', 65);
export const characterAnimationLibrary = heroAppearance.library;
export { flareAttackFrame };
