import { useCallback, useEffect, useRef, useState } from 'react';
import { useHudStore } from '@/ui/hud/useHudStore';
import type { ManagementTab } from '@/ui/hud/ManagementWindow';

/** Presentation owns window visibility; the controller still owns pause and build rules. */
export function useManagementWindow() {
  const [tab, setTab] = useState<ManagementTab | null>(null);
  const openRef = useRef(false);
  const contextRef = useRef({ phase: '', runId: '', levelId: '', ownsPause: false });
  const snapshot = useHudStore((state) => state.snapshot);
  const close = useCallback((resume = true) => {
    const store = useHudStore.getState();
    const current = store.snapshot;
    const context = contextRef.current;
    const mayResume = resume && context.ownsPause && current?.phase === 'paused'
      && current.world?.runSession.runId === context.runId && current.world?.refs.levelId === context.levelId;
    openRef.current = false;
    context.ownsPause = false;
    store.setManagementOpen(false);
    setTab(null);
    if (mayResume) store.actions?.togglePause();
  }, []);
  const open = useCallback((nextTab: ManagementTab) => {
    const store = useHudStore.getState();
    const current = store.snapshot;
    if (!current || !store.actions || current.phase === 'loading' || current.phase === 'error') return;
    if (!openRef.current) {
      const ownsPause = current.phase === 'playing';
      contextRef.current = { phase: current.phase, runId: current.world?.runSession.runId ?? '', levelId: current.world?.refs.levelId ?? '', ownsPause };
      openRef.current = true;
      store.setManagementOpen(true);
      if (ownsPause) store.actions.togglePause();
      else if (current.phase === 'exploring') store.actions.finishExploration();
    }
    setTab(nextTab);
  }, []);
  useEffect(() => {
    if (!openRef.current) return;
    const context = contextRef.current;
    if (!snapshot || snapshot.phase === 'loading' || snapshot.phase === 'error' || snapshot.phase === 'playing'
      || (['menu', 'won', 'lost'].includes(snapshot.phase) && context.phase !== snapshot.phase)
      || (snapshot.world?.runSession.runId ?? '') !== context.runId
      || (snapshot.world?.refs.levelId ?? '') !== context.levelId) close(false);
  }, [snapshot, close]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.repeat) return;
        if (openRef.current) close();
        else useHudStore.getState().actions?.togglePause();
      } else if (openRef.current) {
        // Preserve native field/button behavior, without sending gameplay hotkeys to Phaser.
        event.stopPropagation();
      }
    };
    document.addEventListener('keydown', keydown, true);
    return () => {
      document.removeEventListener('keydown', keydown, true);
      useHudStore.getState().setManagementOpen(false);
    };
  }, [close]);
  return { tab, open, close: () => close() };
}
