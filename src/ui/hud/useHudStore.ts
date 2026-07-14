import { create } from 'zustand';

/** Показатели, которые выводятся в HUD. */
type HudStats = {
  hp: number;
  maxHp: number;
  attackReady: boolean;
  scrap: number;
  ore: number;
  essence: number;
  totalResources: number;
  currentWave: number;
  maxWaves: number;
  nextWaveLabel: string;
  threatLevel: number;
  activeEnemies: number;
  resourceNodes: number;
  droppedResources: number;
  extractionZones: number;
  extractionProgressLabel: string;
  extractionStatus: string;
  x: number;
  y: number;
  fps: number;
  enemyState: string;
  enemyDirection: string;
  enemyHp: string;
  enemyAttackActive: string;
};

/** Zustand-хранилище для HUD-состояния. */
type HudStore = {
  ready: boolean;
  errorMessage: string | null;
  stats: HudStats;
  setReady: (ready: boolean) => void;
  setErrorMessage: (message: string | null) => void;
  setStats: (stats: HudStats) => void;
};

/** Глобальный стор HUD для React-слоя. */
export const useHudStore = create<HudStore>((set) => ({
  ready: false,
  errorMessage: null,
  stats: {
    hp: 100,
    maxHp: 100,
    attackReady: true,
    scrap: 0,
    ore: 0,
    essence: 0,
    totalResources: 0,
    currentWave: 0,
    maxWaves: 3,
    nextWaveLabel: '-',
    threatLevel: 0,
    activeEnemies: 0,
    resourceNodes: 0,
    droppedResources: 0,
    extractionZones: 0,
    extractionProgressLabel: '0.0/4.0s',
    extractionStatus: 'inactive',
    x: 0,
    y: 0,
    fps: 0,
    enemyState: '-',
    enemyDirection: '-',
    enemyHp: '-',
    enemyAttackActive: '-',
  },
  setReady: (ready) => set({ ready }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  setStats: (stats) => set({ stats }),
}));
