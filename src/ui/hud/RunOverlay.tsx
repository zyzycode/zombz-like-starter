import { useHudStore } from './useHudStore';
import { ItemBonuses, RARITY_LABELS, SLOT_LABELS } from './BuildPanels';

export function RunOverlay() {
  const snapshot = useHudStore((state) => state.snapshot);
  const actions = useHudStore((state) => state.actions);
  const errorMessage = useHudStore((state) => state.errorMessage);
  if (!snapshot) return <div className="run-overlay"><div className="overlay-panel"><span className="eyebrow">Пепельный путь</span><h1>{errorMessage ? 'Не удалось загрузить игру' : 'Пробуждение…'}</h1><p>{errorMessage ?? 'Готовим мир и снаряжение.'}</p>{errorMessage && <button className="button primary" onClick={() => window.location.reload()}>Повторить загрузку</button>}</div></div>;
  const { phase } = snapshot;
  if (phase === 'playing') return <div className="field-hud"><div className="stage-chip"><span className="status-dot" style={{ background: snapshot.stage.color }} /><div><span className="eyebrow">Этап {snapshot.depth} / {snapshot.totalLevels}</span><strong>{snapshot.stage.name}</strong></div></div><div className="field-hint">{snapshot.world?.hazards?.length ? 'Жёлтая руна — уходи из круга. Ловушки ранят и врагов.' : 'Зачисти все волны'} · <kbd>E</kbd> источник · <kbd>Esc</kbd> пауза</div></div>;
  if (phase === 'menu') return <div className="run-overlay menu-overlay"><div className="overlay-panel menu-panel">
    <div className="title-mark" aria-hidden="true">✦</div><span className="eyebrow">Одиночный roguelike · alpha</span>
    <h1>Пепельный<br /><em>путь</em></h1><p className="intro">Шесть испытаний. Три биома. Один шанс добраться до хранителя пепла.</p>
    <div className="journey-line"><span>Сражайся</span><i>→</i><span>Выбирай награды</span><i>→</i><span>Создавай билд</span></div>
    <button className="button primary large" disabled={!actions} onClick={() => actions?.startRun()}>Начать забег <span>→</span></button>
    <div className="menu-controls"><span><kbd>WASD</kbd> движение</span><span><kbd>ЛКМ</kbd> удар</span><span><kbd>Q / R</kbd> магия</span><span><kbd>F</kbd> стан</span><span><kbd>Shift</kbd> рывок</span></div>
    <div className="menu-records"><span>Лучший путь <b>{snapshot.meta.bestDepth}/{snapshot.totalLevels}</b></span><span>Забегов <b>{snapshot.meta.runs}</b></span><span>Наследие <b className="gold">{snapshot.meta.shards} ✦</b></span></div>
    <p className="muted small">Постоянные улучшения — во вкладке «Наследие». Временная экипировка и навыки начинают путь заново.</p>
    {snapshot.metaError && <p className="notice error">{snapshot.metaError}</p>}
  </div></div>;
  if (phase === 'reward') return <div className="run-overlay"><div className="overlay-panel reward-panel">
    <span className="eyebrow accent">Уровень зачищен</span><h1>Твоя награда</h1><p>Возьми один предмет. Остальное останется в пепле.</p>
    <div className="reward-grid">{snapshot.rewards.map((item) => <article className={`reward-card border-${item.rarity}`} key={item.id}>
      <span className={`eyebrow rarity-${item.rarity}`}>{RARITY_LABELS[item.rarity]}</span><div className={`reward-symbol rarity-${item.rarity}`} aria-hidden="true">{item.slot === 'weapon' ? '⚔' : item.slot === 'armor' ? '◇' : '✦'}</div><span className="muted small">{SLOT_LABELS[item.slot]}</span><h2>{item.name}</h2><ItemBonuses item={item} />
      <button className="button primary" disabled={!actions} onClick={() => actions?.chooseReward(item.id)}>Выбрать</button>
    </article>)}</div>
    <p className="muted small">Перед выбором можно распределить очки навыков и сменить экипировку справа. Выбор продолжит путь.</p>
  </div></div>;
  if (phase === 'paused') return <div className="run-overlay pause-overlay"><div className="overlay-panel pause-panel"><span className="eyebrow">Время остановлено</span><h1>Передышка</h1><p>Смени экипировку или изучи навыки в панели справа.</p><button className="button primary" onClick={() => actions?.togglePause()}>Продолжить <kbd>Esc</kbd></button><button className="button text-button" onClick={() => actions?.returnToMenu()}>Завершить забег и вернуться в меню</button></div></div>;
  if (phase === 'won' || phase === 'lost') return <div className={`run-overlay ${phase === 'won' ? 'victory-overlay' : ''}`}><div className="overlay-panel result-panel"><span className={`eyebrow ${phase === 'won' ? 'gold' : 'muted'}`}>{phase === 'won' ? 'Все испытания пройдены' : 'Путь оборвался'}</span><h1>{phase === 'won' ? 'Пепел отступает' : 'Искра ещё жива'}</h1><p>{phase === 'won' ? 'Хранитель повержен. Наследие сделает следующий путь сильнее.' : 'Экипировка и навыки остались в этом забеге. Наследие сохраняется.'}</p><div className="result-stats"><div><strong>{snapshot.clearedLevels}/{snapshot.totalLevels}</strong><span>уровней</span></div><div><strong>{snapshot.world?.runSession.killedEnemies ?? 0}</strong><span>врагов</span></div><div><strong>{snapshot.build.level}</strong><span>ранг героя</span></div><div><strong className="gold">+{snapshot.earnedShards} ✦</strong><span>наследие</span></div></div><div className="button-row"><button className="button primary" onClick={() => actions?.startRun()}>Новый забег</button><button className="button secondary" onClick={() => actions?.returnToMenu()}>В меню</button></div>{snapshot.metaError && <p className="notice error">{snapshot.metaError}</p>}</div></div>;
  return <div className="run-overlay"><div className="overlay-panel"><span className="eyebrow">{phase === 'error' ? 'Загрузка прервана' : snapshot.stage.biome}</span><h1>{phase === 'error' ? 'Не удалось продолжить' : snapshot.stage.name}</h1><p>{snapshot.error ?? errorMessage ?? 'Переход на следующий уровень…'}</p>{phase === 'error' && <button className="button primary" onClick={() => actions?.returnToMenu()}>В меню</button>}</div></div>;
}
