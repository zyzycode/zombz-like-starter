import { useRef, useState } from 'react';
import { SKILLS } from '@/game/core/progression/skills';
import { META_UPGRADES } from '@/game/core/meta/MetaProgression';
import type { EquipmentPreview, Item, ItemSlot, Stats } from '@/game/core/progression/types';
import type { RunActions, RunSnapshot } from '@/game/session/RunState';

export const SLOT_LABELS: Record<ItemSlot, string> = { weapon: 'Оружие', armor: 'Доспех', charm: 'Талисман' };
export const RARITY_LABELS = { common: 'Обычное', rare: 'Редкое', epic: 'Эпическое' };
const STAT_LABELS: Record<keyof Stats, string> = {
  maxHp: 'здоровье', damage: 'урон', moveSpeed: 'скорость', maxMana: 'мана',
  manaRegen: 'мана/сек', spellPower: 'сила магии', armor: 'броня',
};

export function ItemBonuses({ item }: { item: Item }) {
  return <ul className="item-bonuses">{Object.entries(item.bonuses).filter(([, value]) => value !== 0).map(([key, value]) => (
    <li key={key}><b>+{key === 'spellPower' ? `${Math.round(value * 100)}%` : Math.round(value)}</b> {STAT_LABELS[key as keyof Stats]}</li>
  ))}</ul>;
}

type PanelProps = { snapshot: RunSnapshot; actions: RunActions | null };

function formatStat(key: keyof Stats, value: number) {
  return key === 'spellPower' ? `${Math.round(value * 100)}%` : `${Math.round(value * 10) / 10}`;
}

function EquipmentComparison({ current, preview, removing }: { current: Stats; preview: EquipmentPreview; removing: boolean }) {
  const changes = (Object.keys(STAT_LABELS) as (keyof Stats)[]).filter((key) => Math.abs(preview.delta[key]) > 0.00001);
  return <div className="equipment-comparison">
    <h4>{removing ? 'После снятия' : 'После замены'}</h4>
    {changes.length === 0 ? <p className="muted small">Характеристики не изменятся.</p> : <table>
      <caption className="sr-only">Изменение итоговых характеристик персонажа</caption>
      <thead><tr><th scope="col">Параметр</th><th scope="col">Сейчас</th><th scope="col">Будет</th></tr></thead>
      <tbody>{changes.map((key) => <tr key={key}>
        <th scope="row">{key === 'maxHp' ? 'макс. здоровье' : key === 'maxMana' ? 'макс. мана' : STAT_LABELS[key]}</th><td>{formatStat(key, current[key])}</td>
        <td><strong>{formatStat(key, preview.stats[key])}</strong><small className={preview.delta[key] > 0 ? 'stat-gain' : 'stat-loss'}>
          {preview.delta[key] > 0 ? '+' : '−'}{key === 'spellPower' ? `${Math.round(Math.abs(preview.delta[key]) * 100)} п.п.` : formatStat(key, Math.abs(preview.delta[key]))}
        </small></td>
      </tr>)}</tbody>
    </table>}
  </div>;
}

function focusInventorySection(section: HTMLElement | null) {
  if (!section) return;
  section.focus({ preventScroll: true });
  const panel = section.closest('.hud-tab-content');
  if (panel instanceof HTMLElement) {
    panel.scrollTo({ top: panel.scrollTop + section.getBoundingClientRect().top - panel.getBoundingClientRect().top });
  }
}

export function InventoryPanel({ snapshot, actions }: PanelProps) {
  const { build, phase } = snapshot;
  const [filter, setFilter] = useState<ItemSlot | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detailRef = useRef<HTMLElement>(null);
  const bagRef = useRef<HTMLElement>(null);
  const showDetails = (id: string) => {
    setSelectedId(id);
    requestAnimationFrame(() => {
      focusInventorySection(detailRef.current);
    });
  };
  const canEdit = phase === 'reward' || phase === 'paused';
  const filteredItems = build.inventory.filter((item) => filter === 'all' || item.slot === filter);
  const selected = filteredItems.find((item) => item.id === selectedId) ?? filteredItems[0];
  const equipped = selected ? build.equipment[selected.slot] === selected.id : false;
  const preview = selected ? (equipped ? build.equipmentPreviews.unequip[selected.slot] : build.equipmentPreviews.equip[selected.id]) : undefined;
  const replaced = selected ? build.inventory.find((item) => item.id === build.equipment[selected.slot]) : undefined;
  const inspect = (item: Item) => { setFilter('all'); showDetails(item.id); };
  return <div className="panel-stack inventory-panel">
    <p className="muted small">Снаряжение действует до конца забега. {canEdit ? 'Выбери вещь, чтобы сравнить и сменить её.' : phase === 'playing' ? 'Для смены снаряжения поставь игру на паузу.' : 'Смена снаряжения доступна на паузе и после зачистки.'}</p>
    <section className="inventory-equipment" aria-label="Надетое снаряжение">
      <h3>Надето</h3>
      {(Object.keys(SLOT_LABELS) as ItemSlot[]).map((slot) => {
        const item = build.inventory.find((candidate) => candidate.id === build.equipment[slot]);
        return <div className="equipment-row" key={slot}><span>{SLOT_LABELS[slot]}</span>
          {item ? <button type="button" className={`equipment-name rarity-${item.rarity}`} onClick={() => inspect(item)} aria-label={`Осмотреть: ${item.name}`}>{item.name}</button> : <span className="muted">Базовое</span>}
        </div>;
      })}
    </section>
    <section ref={bagRef} tabIndex={-1} className="inventory-bag" aria-label="Вещи в забеге">
      <div className="section-caption"><h3>Все вещи</h3><span className="muted">{build.inventory.length}</span></div>
      {build.inventory.length === 0 ? <p className="empty-hint">Первая экипировка ждёт после зачистки уровня.</p> : <>
        <div className="inventory-filters" role="group" aria-label="Фильтр вещей">
          <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>Все</button>
          {(Object.keys(SLOT_LABELS) as ItemSlot[]).map((slot) => <button type="button" key={slot} aria-pressed={filter === slot} onClick={() => setFilter(slot)}>{SLOT_LABELS[slot]}</button>)}
        </div>
        <div className="inventory-list">{filteredItems.map((item) => <button type="button" key={item.id} className="inventory-item" aria-pressed={selected?.id === item.id} onClick={() => showDetails(item.id)}>
          <span className={`rarity-${item.rarity}`}>{item.name}</span><small>{build.equipment[item.slot] === item.id ? 'Надето' : 'В рюкзаке'} · {RARITY_LABELS[item.rarity]}</small>
        </button>)}</div>
        {filteredItems.length === 0 && <p className="empty-hint">Вещей этого типа пока нет.</p>}
      </>}
    </section>
    {selected && <section ref={detailRef} tabIndex={-1} className="inventory-detail" aria-label={`Выбранная вещь: ${selected.name}`}>
      <h3 className={`rarity-${selected.rarity}`}>{selected.name}</h3>
      <p className="muted small">{SLOT_LABELS[selected.slot]} · {RARITY_LABELS[selected.rarity]}</p>
      <ItemBonuses item={selected} />
      {!equipped && <p className="replacement-caption">Заменит: {replaced?.name ?? 'базовое снаряжение'}</p>}
      {preview && <EquipmentComparison current={build.stats} preview={preview} removing={equipped} />}
      <button type="button" className="button secondary compact" disabled={!actions || !canEdit || !preview} onClick={() => equipped ? actions?.unequip(selected.slot) : actions?.equip(selected.id)}>
        {equipped ? 'Снять в рюкзак' : 'Надеть'}
      </button>
      <button type="button" className="button text-button compact" onClick={() => focusInventorySection(bagRef.current)}>К списку вещей</button>
      <p className="muted small">Снятые вещи остаются в рюкзаке. Смена экипировки не восстанавливает здоровье и ману. При снижении максимума текущий запас ограничивается им.</p>
    </section>}
  </div>;
}

export function SkillsPanel({ snapshot, actions }: PanelProps) {
  const { build, phase } = snapshot;
  const canEdit = ['menu', 'reward', 'paused'].includes(phase);
  const branches = [{ prefix: 'warrior', name: 'Воин', symbol: 'Ⅰ' }, { prefix: 'mage', name: 'Маг', symbol: 'Ⅱ' }, { prefix: 'survivor', name: 'Выживание', symbol: 'Ⅲ' }];
  return <div className="panel-stack">
    <div className="section-caption"><span>Очки навыков</span><b className="accent">{build.skillPoints}</b></div>
    {!canEdit && <p className="muted small">Пауза останавливает бой и позволяет распределить очки.</p>}
    {branches.map((branch) => <section className="skill-branch" key={branch.prefix}>
      <h3><span>{branch.symbol}</span> {branch.name}</h3>
      {SKILLS.filter((skill) => skill.id.startsWith(branch.prefix)).map((skill) => {
        const rank = build.skills[skill.id];
        const locked = skill.prerequisite !== null && build.skills[skill.prerequisite] === 0;
        const previous = SKILLS.find((entry) => entry.id === skill.prerequisite);
        return <div className={`skill-node ${locked ? 'locked' : ''}`} key={skill.id}>
          <div className="section-caption"><strong>{skill.name}</strong><span>{rank}/{skill.maxRank}</span></div>
          <p>{skill.description}</p>
          {locked && <small>Сначала: {previous?.name}</small>}
          <button className="button secondary compact" disabled={!actions || !canEdit || locked || rank >= skill.maxRank || build.skillPoints === 0} onClick={() => actions?.learn(skill.id)}>{rank >= skill.maxRank ? 'Освоено' : 'Изучить · 1 очко'}</button>
        </div>;
      })}
    </section>)}
  </div>;
}

export function MetaPanel({ snapshot, actions }: PanelProps) {
  const canBuy = ['menu', 'won', 'lost'].includes(snapshot.phase);
  return <div className="panel-stack">
    <div className="section-caption"><span>Осколки наследия</span><b className="gold">✦ {snapshot.meta.shards}</b></div>
    <p className="muted small">Постоянные улучшения для следующих забегов. Осколки начисляются после победы или смерти за пройденные уровни.</p>
    {META_UPGRADES.map((upgrade) => {
      const rank = snapshot.meta.ranks[upgrade.id];
      const cost = upgrade.baseCost * (rank + 1);
      return <article className="meta-upgrade" key={upgrade.id}>
        <div className="section-caption"><strong>{upgrade.name}</strong><span>{rank}/{upgrade.maxRank}</span></div>
        <p>{upgrade.description}</p>
        <button className="button secondary compact" disabled={!actions || !canBuy || rank >= upgrade.maxRank || snapshot.meta.shards < cost} onClick={() => actions?.buyMetaUpgrade(upgrade.id)}>{rank >= upgrade.maxRank ? 'Максимум' : `Улучшить · ${cost} ✦`}</button>
      </article>;
    })}
    {!canBuy && <p className="muted small">Покупки доступны между забегами.</p>}
    {snapshot.metaError && <p className="notice error" role="status">{snapshot.metaError}</p>}
  </div>;
}

export function ControlsPanel() {
  const rows = [['W A S D', 'Движение · 8 направлений'], ['Мышь', 'Направление атаки'], ['ЛКМ / Space', 'Атака · можно удерживать'], ['Q', 'Огненный болт'], ['R', 'Кольцо пламени'], ['F', 'Удар щитом · оглушение'], ['Shift', 'Рывок и уклонение'], ['E', 'Использовать источник рядом'], ['Esc', 'Пауза / продолжить']];
  return <div className="panel-stack controls"><h3>Управление</h3>{rows.map(([key, label]) => <div key={key}><kbd>{key}</kbd><span>{label}</span></div>)}<p className="muted small">Удар направляй мышью: после начала замаха направление фиксируется. Рывок прерывает замах и помогает выйти из-под удара. Трать ману на скопления противников. F бьёт в секторе перед героем и прерывает замах врага: 25 маны, перезарядка 6 с, стан 1,4 с (босс: 0,35 с). Направляй щит мышью.</p><p className="muted small">Со второго уровня встречаются руны: жёлтый контур предупреждает об ударе. Выйди за круг или уклонись. Руны ранят и врагов — заманивай их в ловушку.</p><p className="muted small">Временный билд сбрасывается после забега. Наследие хранится в этом браузере.</p></div>;
}
