import { createFlareAppearance } from '@/game/config/flareAnimations';
import type { FlareAppearance } from '@/game/config/flareAnimations';
import type { EnemyArchetypeId } from '@/game/config/enemies/enemyArchetypes';

export const enemyAppearances: Record<EnemyArchetypeId, FlareAppearance> = {
  grunt: createFlareAppearance('grunt', 68),
  runner: createFlareAppearance('runner', 55),
  ranged: createFlareAppearance('ranged', 65),
  brute: createFlareAppearance('brute', 98),
  boss: createFlareAppearance('boss', 115),
};

export function getEnemyAppearance(id?: string): FlareAppearance {
  switch (id) {
    case 'runner': case 'ranged': case 'brute': case 'boss': return enemyAppearances[id];
    default: return enemyAppearances.grunt;
  }
}
