import type { Vector2 } from '@/shared/types/game';

export type RestorationSiteDefinition = {
  id: string;
  position: Vector2;
  radius: number;
  healthFraction: number;
  manaFraction: number;
};

export type RestorationSiteState = RestorationSiteDefinition & { used: boolean };
