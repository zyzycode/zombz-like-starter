import type { RunResultGateway } from '@/game/core/extraction/RunResultGateway';
import type { RunResult } from '@/game/core/extraction/RunResult';

/**
 * Локальная заглушка будущего gateway: сохраняет отправленные результаты в памяти
 * и имитирует успешный submit без сетевого слоя.
 */
export class LocalRunResultGateway implements RunResultGateway {
  private readonly submittedResults: RunResult[] = [];

  async submitRunResult(result: RunResult): Promise<void> {
    this.submittedResults.push(structuredClone(result));
    console.info('[LocalRunResultGateway] submitted run result', result);
  }

  getSubmittedResults(): RunResult[] {
    return structuredClone(this.submittedResults);
  }
}
