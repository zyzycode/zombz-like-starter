import type { LevelDefinition } from '@/game/content/levels/types';

export interface LevelRepository {
  getById(levelId: string): Promise<LevelDefinition>;
}
