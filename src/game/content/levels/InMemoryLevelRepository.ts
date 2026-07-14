import type { LevelRepository } from '@/game/content/levels/LevelRepository';
import { levelRegistry } from '@/game/content/levels/levelRegistry';
import type { LevelDefinition } from '@/game/content/levels/types';

const levels: Record<string, LevelDefinition> = Object.fromEntries(
  levelRegistry.map((entry) => [entry.id, entry.definition]),
);

export class InMemoryLevelRepository implements LevelRepository {
  async getById(levelId: string): Promise<LevelDefinition> {
    const level = levels[levelId];
    if (!level) {
      throw new Error(`Level not found: ${levelId}`);
    }

    return structuredClone(level);
  }
}
