import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createGameConfig } from '@/game/config/createGameConfig';
import { Hud } from '@/ui/hud/Hud';
import { RunOverlay } from '@/ui/hud/RunOverlay';
import { useHudStore } from '@/ui/hud/useHudStore';
import { ManagementWindow } from '@/ui/hud/ManagementWindow';
import { useManagementWindow } from './useManagementWindow';

/** React owns the canvas lifetime; the controller owns the run and its transitions. */
export function GameShell() {
  const management = useManagementWindow();
  const snapshot = useHudStore((state) => state.snapshot);
  const actions = useHudStore((state) => state.actions);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const setReady = useHudStore((state) => state.setReady);

  useEffect(() => {
    if (!containerRef.current) return;
    const game = new Phaser.Game(createGameConfig(containerRef.current, { initialLevelId: 'campaign' }));
    setReady(true);
    return () => {
      game.destroy(true);
      setReady(false);
      useHudStore.getState().setActions(null);
      useHudStore.getState().setRun(null);
    };
  }, [setReady]);

  return (
    <main className="game-shell">
      <section className="game-pane" aria-label="Игровое поле">
        <div className="game-canvas" ref={containerRef} />
        <RunOverlay />
      </section>
      <aside className="game-sidebar" aria-label="Персонаж и прогресс">
        <Hud onOpen={management.open} />
      </aside>
      <ManagementWindow tab={management.tab} snapshot={snapshot} actions={actions} onTab={management.open} onClose={management.close} />
    </main>
  );
}
