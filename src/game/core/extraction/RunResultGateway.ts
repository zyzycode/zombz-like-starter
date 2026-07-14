import type { RunResult } from '@/game/core/extraction/RunResult';

export interface RunResultGateway {
  submitRunResult(result: RunResult): Promise<void>;
}
