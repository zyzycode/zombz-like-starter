import { createMetaProfile, isMetaProfile, type MetaProfile, type MetaProfileRepository } from '@/game/core/meta/MetaProfile';

type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
export const META_STORAGE_KEY = 'zombs-alpha-profile-v1';

/** Browser boundary. Storage denial or corruption must never prevent a new run. */
export class LocalMetaProfileRepository implements MetaProfileRepository {
  errorMessage: string | null = null;
  private readonly storage: StoragePort | null;

  constructor(storage?: StoragePort | null) {
    if (storage !== undefined) {
      this.storage = storage;
      return;
    }
    try {
      this.storage = globalThis.localStorage ?? null;
    } catch {
      this.storage = null;
    }
  }

  load(): MetaProfile {
    if (!this.storage) {
      this.errorMessage = 'Сохранение недоступно. Прогресс останется только до закрытия игры.';
      return createMetaProfile();
    }
    try {
      const text = this.storage.getItem(META_STORAGE_KEY);
      if (!text) return createMetaProfile();
      const parsed: unknown = JSON.parse(text);
      if (!isMetaProfile(parsed)) throw new Error('Invalid profile');
      this.errorMessage = null;
      return structuredClone(parsed);
    } catch {
      this.errorMessage = 'Профиль не удалось прочитать. Создан новый локальный профиль.';
      return createMetaProfile();
    }
  }

  save(profile: MetaProfile): boolean {
    if (!isMetaProfile(profile)) {
      this.errorMessage = 'Прогресс не сохранён: некорректный профиль.';
      return false;
    }
    try {
      if (!this.storage) throw new Error('Storage unavailable');
      this.storage.setItem(META_STORAGE_KEY, JSON.stringify(profile));
      this.errorMessage = null;
      return true;
    } catch {
      this.errorMessage = 'Не удалось сохранить прогресс. Он останется только до закрытия игры.';
      return false;
    }
  }
}
