import { InMemoryLevelRepository } from '@/game/content/levels/InMemoryLevelRepository';

export function createLevelRepository() {
  return new InMemoryLevelRepository();
}
