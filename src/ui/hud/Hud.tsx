import { useState } from 'react';
import { useHudStore } from './useHudStore';
import { ControlsPanel, InventoryPanel, MetaPanel, SkillsPanel } from './BuildPanels';

type Tab = 'inventory' | 'skills' | 'meta' | 'controls';
const TABS: { id: Tab; label: string }[] = [
  { id: 'inventory', label: 'Вещи' }, { id: 'skills', label: 'Навыки' },
  { id: 'meta', label: 'Наследие' }, { id: 'controls', label: 'Клавиши' },
];

function Meter({ label, value, max, kind }: { label: string; value: number; max: number; kind: string }) {
  return <div className={`meter ${kind}`}>
    <div className="section-caption"><span>{label}</span><b>{Math.ceil(value)} <span>/ {Math.ceil(max)}</span></b></div>
    <div className="meter-track" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.max(0, value)}><i style={{ width: `${Math.max(0, Math.min(100, value / Math.max(1, max) * 100))}%` }} /></div>
  </div>;
}

function Ability({ hotkey, name, cooldown }: { hotkey: string; name: string; cooldown: number }) {
  return <div className={`ability ${cooldown > 0 ? 'cooling' : ''}`}><kbd>{hotkey}</kbd><span>{name}</span><small>{cooldown > 0 ? `${(cooldown / 1000).toFixed(1)}с` : 'Готово'}</small></div>;
}

export function Hud() {
  const snapshot = useHudStore((state) => state.snapshot);
  const actions = useHudStore((state) => state.actions);
  const [tab, setTab] = useState<Tab>('inventory');
  if (!snapshot) return <div className="sidebar-loading"><span className="eyebrow">Пепельный путь</span><p>Подготовка мира…</p></div>;
  const { world, build, phase } = snapshot;
  const abilities = world?.player.abilities;
  const playing = phase === 'playing';
  return <>
    <header className="sidebar-header"><span className="eyebrow">Пепельный путь <b>α</b></span><h2>{phase === 'menu' ? 'Странник' : snapshot.stage.biome}</h2><div className="section-caption muted small"><span>{phase === 'menu' ? 'Готов к новому пути' : `Уровень ${snapshot.depth} / ${snapshot.totalLevels}`}</span><span className="gold">✦ {snapshot.meta.shards}</span></div></header>
    <section className="vitals">
      <Meter label="Здоровье" value={world?.player.hp ?? build.stats.maxHp} max={world?.player.maxHp ?? build.stats.maxHp} kind="health" />
      <Meter label="Мана" value={abilities?.mana ?? build.stats.maxMana} max={abilities?.maxMana ?? build.stats.maxMana} kind="mana" />
      <Meter label={`Опыт · ранг ${build.level}`} value={build.xp} max={build.xpToNext} kind="experience" />
      <div className="combat-stats"><span>Урон <b>{Math.round(build.stats.damage)}</b></span><span>Броня <b>{Math.round(build.stats.armor)}</b></span><span>Магия <b>{Math.round(build.stats.spellPower * 100)}%</b></span></div>
    </section>
    <section className="abilities" aria-label="Способности">
      <Ability hotkey="Q" name="Болт" cooldown={abilities?.fireboltCooldownMs ?? 0} />
      <Ability hotkey="R" name="Кольцо" cooldown={abilities?.novaCooldownMs ?? 0} />
      <Ability hotkey="⇧" name="Рывок" cooldown={abilities?.dodgeCooldownMs ?? 0} />
    </section>
    {world && <div className="wave-line"><span>Волна {world.wave.currentWaveIndex}/{world.wave.maxWaves}</span><span>{world.wave.activeEnemies > 0 ? `Врагов: ${world.wave.activeEnemies}` : world.wave.nextWaveInMs > 0 ? `Через ${(world.wave.nextWaveInMs / 1000).toFixed(1)}с` : 'Зачищено'}</span></div>}
    {(playing || phase === 'paused') && <button className="button secondary pause-button" onClick={() => actions?.togglePause()}>{playing ? 'Пауза и развитие' : 'Продолжить бой'} <kbd>Esc</kbd></button>}
    {build.skillPoints > 0 && <button className="skill-points-banner" onClick={() => { if (playing) actions?.togglePause(); setTab('skills'); }}>Доступно очков навыков: {build.skillPoints} <span>→</span></button>}
    <nav className="hud-tabs" aria-label="Панели персонажа">{TABS.map((entry) => <button key={entry.id} className={tab === entry.id ? 'active' : ''} aria-pressed={tab === entry.id} onClick={() => setTab(entry.id)}>{entry.label}</button>)}</nav>
    <div className="hud-tab-content">
      {tab === 'inventory' && <InventoryPanel snapshot={snapshot} actions={actions} />}
      {tab === 'skills' && <SkillsPanel snapshot={snapshot} actions={actions} />}
      {tab === 'meta' && <MetaPanel snapshot={snapshot} actions={actions} />}
      {tab === 'controls' && <ControlsPanel />}
    </div>
    <footer className="sidebar-footer">Одиночный забег · прогресс хранится локально<br />Графика: <a href="https://flarerpg.org/" target="_blank" rel="noreferrer">Flare</a> · <a href="/assets/flare/README.md" target="_blank" rel="noreferrer">авторы и лицензия</a></footer>
  </>;
}
