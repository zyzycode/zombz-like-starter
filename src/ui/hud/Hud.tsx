import { ELITE_BONUS_XP } from '@/game/core/enemies/eliteModifiers';
import { ACTIVE_ABILITIES } from '@/game/core/combat/activeAbilities';
import { useHudStore } from './useHudStore';
import { MANAGEMENT_TABS, type ManagementTab } from './ManagementWindow';

function Meter({ label, value, max, kind }: { label: string; value: number; max: number; kind: string }) {
  return <div className={`meter ${kind}`}>
    <div className="section-caption"><span>{label}</span><b>{Math.ceil(value)} <span>/ {Math.ceil(max)}</span></b></div>
    <div className="meter-track" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.max(0, value)}><i style={{ width: `${Math.max(0, Math.min(100, value / Math.max(1, max) * 100))}%` }} /></div>
  </div>;
}

function Ability({ hotkey, name, cooldown, description, mana = Infinity, cost = 0, locked = false, fullHealth = false, fullMana = false, empty = false }: {
  hotkey: string; name: string; cooldown: number; description?: string; mana?: number; cost?: number; locked?: boolean; fullHealth?: boolean; fullMana?: boolean; empty?: boolean;
}) {
  const status = empty ? 'Свободно' : locked ? 'Не изучено' : cooldown > 0 ? `${(cooldown / 1000).toFixed(1)} с` : mana < cost ? 'Нет маны' : fullHealth ? 'HP полные' : fullMana ? 'Мана полная' : cost > 0 ? `${cost} маны` : 'Готово';
  return <div title={description} className={`ability ${cooldown > 0 ? 'cooling' : ''} ${locked || empty ? 'locked' : ''}`}>
    <kbd>{hotkey}</kbd><span>{name}</span><small>{status}</small>
  </div>;
}

export function Hud({ onOpen }: { onOpen: (tab: ManagementTab) => void }) {
  const snapshot = useHudStore((state) => state.snapshot);
  const actions = useHudStore((state) => state.actions);
  if (!snapshot) return <div className="sidebar-loading"><span className="eyebrow">Пепельный путь</span><p>Подготовка мира…</p></div>;
  const { world, build, phase } = snapshot;
  const abilities = world?.player.abilities;
  const mana = abilities?.mana ?? build.stats.maxMana;
  const caches = world?.caches ?? [];
  const openedCaches = caches.filter((cache) => cache.opened).length;
  const eliteObjective = world?.eliteObjective;
  const obelisks = world?.obelisks ?? [];
  const activatedObelisks = obelisks.filter((obelisk) => obelisk.activated).length;
  const playing = phase === 'playing';
  const seconds = (ms: number) => `${(ms / 1000).toLocaleString('ru-RU', { maximumFractionDigits: 3 })} с`;
  const cooldown = (baseMs: number) => seconds(Math.round(baseMs * (1 - build.stats.cooldownReduction)));
  const stun = (baseMs: number) => {
    const duration = Math.round(baseMs * (1 + build.stats.stunDurationBonus));
    return `стан ${seconds(duration)} (босс: ${seconds(duration * .25)})`;
  };
  const activeDescriptions = {
    whirlwind: 'Изучи в ветке Воина · круговой удар',
    frostWave: `Изучи в ветке Мага · ледяной сектор · ${stun(800)}`,
    mend: 'Изучи в ветке Выживания · восстановление 35% здоровья',
    cleave: 'Изучи в ветке Воина · 220% урона оружия · сектор 60°',
    iceRing: `Изучи в ветке Мага · кольцо без урона · ${stun(1800)}`,
    secondWind: 'Изучи в ветке Выживания · восстановление 40% максимума маны · без затрат маны',
  };
  return <>
    <header className="sidebar-header"><span className="eyebrow">Пепельный путь <b>α</b></span><h2>{phase === 'menu' ? 'Странник' : snapshot.stage.biome}</h2><div className="section-caption muted small"><span>{phase === 'menu' ? 'Готов к новому пути' : `Уровень ${snapshot.depth} / ${snapshot.totalLevels}`}</span><span className="gold">✦ {snapshot.meta.shards}</span></div></header>
    <section className="vitals">
      <Meter label="Здоровье" value={world?.player.hp ?? build.stats.maxHp} max={world?.player.maxHp ?? build.stats.maxHp} kind="health" />
      <Meter label="Мана" value={abilities?.mana ?? build.stats.maxMana} max={abilities?.maxMana ?? build.stats.maxMana} kind="mana" />
      <Meter label={`Опыт · ранг ${build.level}`} value={build.xp} max={build.xpToNext} kind="experience" />
      <div className="combat-stats"><span>Урон <b>{Math.round(build.stats.damage)}</b></span><span>Броня <b>{Math.round(build.stats.armor)}</b></span><span>Магия <b>{Math.round(build.stats.spellPower * 100)}%</b></span></div>
      {(build.stats.cooldownReduction > 0 || build.stats.stunDurationBonus > 0) && <div className="combat-stats">
        {build.stats.cooldownReduction > 0 && <span title="Сокращает перезарядку новых применений Q/R/F/Z/X/C, максимум 40%. Рывок и уже запущенные таймеры не меняются.">Перезарядка <b>−{Math.round(build.stats.cooldownReduction * 1000) / 10}%</b></span>}
        {build.stats.stunDurationBonus > 0 && <span title="Увеличивает длительность стана «Удара щитом», «Ледяной волны» и «Ледяного кольца», максимум 50%. Босс получает 25% итоговой длительности.">Стан <b>+{Math.round(build.stats.stunDurationBonus * 1000) / 10}%</b></span>}
      </div>}
    </section>
    <section className="abilities" aria-label="Способности">
      <Ability hotkey="Q" name="Болт" cooldown={abilities?.fireboltCooldownMs ?? 0} cost={20} mana={mana} description={`20 маны · перезарядка нового применения ${cooldown(550)}`} />
      <Ability hotkey="R" name="Кольцо" cooldown={abilities?.novaCooldownMs ?? 0} cost={40} mana={mana} description={`40 маны · перезарядка нового применения ${cooldown(4500)}`} />
      <Ability hotkey="F" name="Удар щитом" cooldown={abilities?.shieldBashCooldownMs ?? 0} cost={25} mana={mana} description={`25 маны · перезарядка нового применения ${cooldown(6000)} · ${stun(1400)}`} />
      <Ability hotkey="⇧" name="Рывок" cooldown={abilities?.dodgeCooldownMs ?? 0} />
      {(['z', 'x', 'c'] as const).map((slot) => {
        const id = build.abilityLoadout[slot];
        if (!id) return <Ability key={slot} hotkey={slot.toUpperCase()} name="Не назначено" cooldown={0} empty description="Назначь изученную способность во вкладке «Навыки» на паузе или после зачистки." />;
        const ability = ACTIVE_ABILITIES[id];
        return <Ability key={slot} hotkey={slot.toUpperCase()} name={ability.name} cooldown={abilities?.[ability.cooldownKey] ?? 0} cost={ability.manaCost} mana={mana} locked={!build.unlockedAbilities.includes(id)} fullHealth={id === 'mend' && (!world || world.player.hp >= world.player.maxHp)} fullMana={id === 'secondWind' && mana >= (abilities?.maxMana ?? build.stats.maxMana)} description={`${activeDescriptions[id]} · перезарядка нового применения ${cooldown(ability.cooldownMs)}`} />;
      })}
    </section>
    {world && <div className="wave-line"><span>Волна {world.wave.currentWaveIndex}/{world.wave.maxWaves}</span><span>{world.wave.activeEnemies > 0 ? `Врагов: ${world.wave.activeEnemies}` : world.wave.nextWaveInMs > 0 ? `Через ${(world.wave.nextWaveInMs / 1000).toFixed(1)}с` : 'Зачищено'}</span></div>}
    {eliteObjective && eliteObjective.total > 0 && <div className="elite-objective" title="Броня снижает физический урон; магия действует полностью. Стремительная элита быстрее движется, но не ускоряет замах.">
      <span>{eliteObjective.defeated >= eliteObjective.total ? 'Элита повержена' : 'Победи элиту'} <b>{eliteObjective.defeated}/{eliteObjective.total}</b></span><span>+{ELITE_BONUS_XP} опыта за врага</span>
    </div>}
    {obelisks.length > 0 && <div className={`obelisk-objective ${activatedObelisks === obelisks.length ? 'complete' : ''}`} role="status">
      <span>Обелиски <b>{activatedObelisks}/{obelisks.length}</b></span><span>{activatedObelisks === obelisks.length ? 'Активированы' : 'Для награды · E'}</span>
    </div>}
    {caches.length > 0 && <div className="cache-progress"><span>Тайники {openedCaches}/{caches.length}</span><span>{openedCaches < caches.length ? 'Найди · открой на E' : 'Всё найдено'}</span></div>}
    {snapshot.lastCacheItem && <p className="cache-find" role="status">В рюкзаке: <strong className={`rarity-${snapshot.lastCacheItem.rarity}`}>{snapshot.lastCacheItem.name}</strong></p>}
    {phase === 'exploring' && <button className="button primary pause-button" onClick={() => actions?.finishExploration()}>К наградам <kbd>Esc</kbd></button>}
    {(playing || phase === 'paused') && <button className="button secondary pause-button" onClick={() => actions?.togglePause()}>{playing ? 'Пауза и развитие' : world?.status === 'securing' ? 'Продолжить путь' : 'Продолжить бой'} <kbd>Esc</kbd></button>}
    {build.skillPoints > 0 && <button className="skill-points-banner" onClick={() => onOpen('skills')}>Развить навыки · {build.skillPoints} очков</button>}
    <nav className="management-launchers" aria-label="Управление персонажем">{MANAGEMENT_TABS.map((entry) => <button key={entry.id} className="button secondary" disabled={!actions || phase === 'loading' || phase === 'error'} onClick={() => onOpen(entry.id)}>{entry.label}</button>)}</nav>
    <footer className="sidebar-footer">Одиночный забег · прогресс хранится локально<br />Графика: <a href="https://flarerpg.org/" target="_blank" rel="noreferrer">Flare</a> · <a href="/assets/flare/README.md" target="_blank" rel="noreferrer">авторы и лицензия</a></footer>
  </>;
}
