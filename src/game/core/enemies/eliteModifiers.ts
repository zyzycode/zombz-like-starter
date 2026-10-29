import type { EliteModifierId } from '@/shared/types/game';

export const ELITE_BONUS_XP = 30;

export const ELITE_MODIFIERS = {
  armored: {
    name: 'Бронированный', description: 'Получает 65% физического урона; магия действует полностью.',
    hpMultiplier: 1.75, damageMultiplier: 1.2, speedMultiplier: 0.9, physicalDamageMultiplier: 0.65,
  },
  swift: {
    name: 'Стремительный', description: 'Движется на 30% быстрее; длительность замаха не меняется.',
    hpMultiplier: 1.4, damageMultiplier: 1.1, speedMultiplier: 1.3, physicalDamageMultiplier: 1,
  },
} satisfies Record<EliteModifierId, {
  name: string; description: string; hpMultiplier: number; damageMultiplier: number;
  speedMultiplier: number; physicalDamageMultiplier: number;
}>;
