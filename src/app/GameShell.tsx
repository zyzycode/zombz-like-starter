import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { createGameConfig } from '@/game/config/createGameConfig';
import { levelCatalog } from '@/game/content/levels/levelCatalog';
import { Hud } from '@/ui/hud/Hud';
import { useHudStore } from '@/ui/hud/useHudStore';

const shellStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) 360px',
  width: '100vw',
  height: '100vh',
  background: '#0f172a',
  color: '#e2e8f0',
};

const gamePaneStyle: React.CSSProperties = {
  minWidth: 0,
  minHeight: 0,
  padding: 12,
};

const gameFrameStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  borderRadius: 18,
  overflow: 'hidden',
  border: '1px solid rgba(148, 163, 184, 0.18)',
  boxShadow: 'inset 0 0 0 1px rgba(15, 23, 42, 0.35)',
};

const sidebarStyle: React.CSSProperties = {
  borderLeft: '1px solid rgba(148, 163, 184, 0.14)',
  background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(2, 6, 23, 0.98))',
  padding: 16,
  overflowY: 'auto',
};

/** Контейнер, который монтирует Phaser-игру и HUD поверх неё. */
export function GameShell() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const setReady = useHudStore((state) => state.setReady);
  const [selectedLevelId, setSelectedLevelId] = useState(levelCatalog[0]?.id ?? 'my-first-map');

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    // Создаём экземпляр Phaser после появления DOM-контейнера.
    const game = new Phaser.Game(createGameConfig(containerRef.current, { initialLevelId: selectedLevelId }));
    setReady(true);

    return () => {
      setReady(false);
      // Корректно освобождаем ресурсы при размонтировании React-компонента.
      game.destroy(true);
    };
  }, [selectedLevelId, setReady]);

  return (
    <div style={shellStyle}>
      <div style={gamePaneStyle}>
        <div ref={containerRef} style={gameFrameStyle} />
      </div>
      <aside style={sidebarStyle}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Уровень</div>
          <select
            value={selectedLevelId}
            onChange={(event) => setSelectedLevelId(event.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid rgba(148, 163, 184, 0.25)',
              background: 'rgba(15, 23, 42, 0.88)',
              color: '#e2e8f0',
            }}
          >
            {levelCatalog.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
            {levelCatalog.find((entry) => entry.id === selectedLevelId)?.description}
          </div>
        </div>
        <Hud />
      </aside>
    </div>
  );
}
