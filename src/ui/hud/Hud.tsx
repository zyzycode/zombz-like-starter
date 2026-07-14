import { useHudStore } from './useHudStore';

const rootStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const panelStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 12,
  background: 'rgba(15, 23, 42, 0.88)',
  border: '1px solid rgba(148, 163, 184, 0.25)',
  backdropFilter: 'blur(8px)',
  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.18)',
};

const panelSectionStyle: React.CSSProperties = {
  marginTop: 8,
  paddingTop: 8,
  borderTop: '1px solid rgba(148, 163, 184, 0.2)',
};

const miniPanelStyle: React.CSSProperties = {
  ...panelStyle,
};

const hintStyle: React.CSSProperties = {
  ...panelStyle,
  fontSize: 14,
  lineHeight: 1.5,
};

/** Простая HUD-панель с параметрами игрока и подсказками по управлению. */
export function Hud() {
  const { ready, errorMessage, stats } = useHudStore();

  return (
    <div style={rootStyle}>
      {errorMessage ? (
        <div style={{ ...panelStyle, border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fecaca' }}>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>Ошибка Загрузки</div>
          <div>{errorMessage}</div>
        </div>
      ) : null}

      <div style={panelStyle}>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>Статус Игры</div>
        <div>Игра: {ready ? 'запущена' : 'загрузка'}</div>
        <div>
          HP: {stats.hp}/{stats.maxHp}
        </div>
        <div>Атака: {stats.attackReady ? 'готова' : 'перезарядка'}</div>
        <div style={panelSectionStyle}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Ресурсы</div>
          <div>Scrap: {stats.scrap}</div>
          <div>Ore: {stats.ore}</div>
          <div>Essence: {stats.essence}</div>
          <div>Total: {stats.totalResources}</div>
        </div>
        <div>
          Позиция: {stats.x}, {stats.y}
        </div>
        <div>FPS: {stats.fps}</div>
      </div>

      <div style={miniPanelStyle}>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>Волны И Мир</div>
        <div>
          Wave: {stats.currentWave}/{stats.maxWaves}
        </div>
        <div>Next wave in: {stats.nextWaveLabel}</div>
        <div>Threat: {stats.threatLevel}</div>
        <div>Active enemies: {stats.activeEnemies}</div>
        <div style={panelSectionStyle}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Объекты</div>
          <div>Resource nodes: {stats.resourceNodes}</div>
          <div>Dropped resources: {stats.droppedResources}</div>
          <div>Extraction zones: {stats.extractionZones}</div>
        </div>
        <div style={panelSectionStyle}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Extraction</div>
          <div>Status: {stats.extractionStatus}</div>
          <div>Progress: {stats.extractionProgressLabel}</div>
        </div>
        <div style={panelSectionStyle}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Enemy Debug</div>
          <div>State: {stats.enemyState}</div>
          <div>Direction: {stats.enemyDirection}</div>
          <div>HP: {stats.enemyHp}</div>
          <div>Attack Active: {stats.enemyAttackActive}</div>
        </div>
      </div>

      <div style={hintStyle}>
        <div><strong>Управление</strong></div>
        <div>WASD - движение по 4 направлениям</div>
        <div>Пробел / ЛКМ - атака</div>
        <div>E - взаимодействие / extraction</div>
      </div>
    </div>
  );
}
